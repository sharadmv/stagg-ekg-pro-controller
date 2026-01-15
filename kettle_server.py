import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException, Request, Form
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from pydantic import BaseModel
from bleak import BleakScanner

from stagg_ekg_pro import StaggEKGPro, ScheduleMode

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kettle-server")

# Configuration
DEFAULT_KETTLE_NAME = "Stagg" # Default name for Smart Home connection

app = FastAPI()
templates = Jinja2Templates(directory="templates")

# --- OAuth2 (Simplified for Google Home) ---
@app.get("/authorize", response_class=HTMLResponse)
async def authorize_page(request: Request, redirect_uri: str, state: str, client_id: str = None, response_type: str = None):
    """
    Standard OAuth2 Authorization page. 
    Renders a login/consent form.
    """
    return templates.TemplateResponse("login.html", {
        "request": request, 
        "redirect_uri": redirect_uri, 
        "state": state,
        "client_id": client_id
    })

@app.post("/authorize")
async def authorize_submit(redirect_uri: str = Form(...), state: str = Form(...)):
    """
    Handle authorization form submission.
    Redirects back to Google with a temporary auth code.
    """
    # In a real app, you'd generate a random code and store it.
    code = "sample-auth-code-123"
    url = f"{redirect_uri}?code={code}&state={state}"
    return RedirectResponse(url=url, status_code=302)

@app.post("/token")
async def token(
    grant_type: str = Form(...),
    code: Optional[str] = Form(None),
    refresh_token: Optional[str] = Form(None),
    client_id: Optional[str] = Form(None),
    client_secret: Optional[str] = Form(None)
):
    """
    Standard OAuth2 Token endpoint.
    Google sends requests as application/x-www-form-urlencoded.
    """
    if grant_type == "authorization_code":
        # In a real app, verify 'code', 'client_id' and 'client_secret'
        logger.info(f"Exchanging code {code} for tokens")
    elif grant_type == "refresh_token":
        # In a real app, verify 'refresh_token'
        logger.info("Refreshing access token")
    else:
        raise HTTPException(status_code=400, detail="Invalid grant_type")

    # Return tokens in the format Google expects
    return {
        "token_type": "bearer",
        "access_token": "access-token-123",
        "refresh_token": "refresh-token-456",
        "expires_in": 3600
    }

# --- Smart Home Fulfillment ---
@app.post("/smarthome")
async def smarthome(request: Request):
    data = await request.json()
    request_id = data.get("requestId")
    inputs = data.get("inputs", [])
    
    if not inputs:
        return {}
    
    intent = inputs[0].get("intent")
    payload = {}
    
    if intent == "action.devices.SYNC":
        payload = {
            "agentUserId": "user123",
            "devices": [{
                "id": "stagg_kettle_1",
                "type": "action.devices.types.KETTLE",
                "traits": [
                    "action.devices.traits.TemperatureControl",
                    "action.devices.traits.Modes"
                ],
                "name": {
                    "name": "Stagg Kettle",
                    "nicknames": ["My Kettle", "Coffee Kettle"]
                },
                "willReportState": False,
                "attributes": {
                    "temperatureRange": {
                        "minThresholdCelsius": 40,
                        "maxThresholdCelsius": 100
                    },
                    "temperatureUnitForUX": "C",
                    "availableModes": [{
                        "name": "schedule_mode",
                        "name_values": [{
                            "name_synonym": ["Schedule Mode", "Mode"],
                            "lang": "en"
                        }],
                        "settings": [
                            {
                                "setting_name": "off",
                                "setting_values": [{"setting_synonym": ["Off"], "lang": "en"}]
                            },
                            {
                                "setting_name": "once",
                                "setting_values": [{"setting_synonym": ["Once"], "lang": "en"}]
                            },
                            {
                                "setting_name": "daily",
                                "setting_values": [{"setting_synonym": ["Daily"], "lang": "en"}]
                            }
                        ],
                        "ordered": True
                    }]
                }
            }]
        }
        
    elif intent == "action.devices.QUERY":
        devices = {}
        try:
            k = await get_kettle_client(DEFAULT_KETTLE_NAME)
            try:
                await k.refresh_state()
                state = k.get_all_states()
                
                # Note: This API only provides target temp, not ambient.
                # We map ambient to target just to satisfy the protocol.
                target_temp = state.get("target_temperature", 0)
                schedule_mode = state.get("schedule", {}).get("mode", "off")
                
                devices["stagg_kettle_1"] = {
                    "online": True,
                    "temperatureSetpointCelsius": target_temp,
                    "temperatureAmbientCelsius": target_temp, 
                    "currentModeSettings": {
                        "schedule_mode": schedule_mode
                    }
                }
            finally:
                await k.disconnect()
        except Exception as e:
            logger.error(f"Smarthome Query Error: {e}")
            devices["stagg_kettle_1"] = {"online": False, "errorCode": "deviceOffline"}
            
        payload = {"devices": devices}

    elif intent == "action.devices.EXECUTE":
        commands = inputs[0].get("payload", {}).get("commands", [])
        results = []
        
        for command in commands:
            devices_to_execute = command.get("devices", [])
            execution = command.get("execution", [])
            
            for d in devices_to_execute:
                if d["id"] == "stagg_kettle_1":
                    status = "SUCCESS"
                    states = {}
                    try:
                        k = await get_kettle_client(DEFAULT_KETTLE_NAME)
                        try:
                            # We might need current state for some operations
                            await k.refresh_state()
                            
                            for exec_cmd in execution:
                                cmd_name = exec_cmd.get("command")
                                params = exec_cmd.get("params", {})
                                
                                if cmd_name == "action.devices.commands.ThermostatTemperatureSetpoint":
                                    temp = params.get("thermostatTemperatureSetpoint")
                                    await k.set_target_temperature(temp)
                                    states["temperatureSetpointCelsius"] = temp
                                    
                                elif cmd_name == "action.devices.commands.SetModes":
                                    modes = params.get("updateModeSettings", {})
                                    if "schedule_mode" in modes:
                                        new_mode = modes["schedule_mode"]
                                        
                                        # Preserve existing schedule time/temp
                                        current_schedule = k.get_schedule()
                                        hour = current_schedule.get("hour", 8)
                                        minute = current_schedule.get("minute", 0)
                                        temp = current_schedule.get("temperature_celsius", 85)
                                        
                                        mode_enum = ScheduleMode.OFF
                                        if new_mode == "daily": mode_enum = ScheduleMode.DAILY
                                        if new_mode == "once": mode_enum = ScheduleMode.ONCE
                                        
                                        await k.set_schedule(mode=mode_enum, hour=hour, minute=minute, temp_celsius=temp)
                                        states["currentModeSettings"] = {"schedule_mode": new_mode}

                        finally:
                            await k.disconnect()
                    except Exception as e:
                        status = "ERROR"
                        logger.error(f"Execute Error: {e}")
                        
                    results.append({
                        "ids": [d["id"]],
                        "status": status,
                        "states": states
                    })

        payload = {"commands": results}

    return {
        "requestId": request_id,
        "payload": payload
    }

# Models
class TargetTempRequest(BaseModel):
    temperature: float

class HoldRequest(BaseModel):
    minutes: int

class ScheduleRequest(BaseModel):
    mode: str # "off", "once", "daily"
    hour: int = 0
    minute: int = 0
    temperature: float = 85

# Helpers
async def get_kettle_client(name_prefix: str = DEFAULT_KETTLE_NAME):
    """
    Finds, connects, and returns a kettle client. 
    The caller is responsible for disconnecting.
    """
    logger.info(f"Scanning for device with name containing '{name_prefix}'...")
    # Increased timeout for more reliable discovery on some systems
    devices = await BleakScanner.discover(return_adv=True, timeout=10.0)
    target_device = None
    
    # Pass 1: Look for exact prefix match
    for d, a in devices.values():
        d_name = d.name or ""
        if name_prefix.lower() in d_name.lower():
            target_device = d
            break
            
    # Pass 2: Fallback to any Stagg/Fellow device if prefix search fails
    if not target_device:
        logger.info("Specific name not found, looking for any Stagg/Fellow kettle...")
        for d, a in devices.values():
            d_name = d.name or ""
            if any(k in d_name for k in ["Stagg", "Fellow", "EKG"]):
                target_device = d
                break

    if not target_device:
        raise HTTPException(status_code=404, detail=f"Kettle not found. Scanned {len(devices)} devices.")
        
    logger.info(f"Found {target_device.name} ({target_device.address}), connecting...")
    k = StaggEKGPro(target_device.address)
    connected = await k.connect()
    
    if not connected:
        raise HTTPException(status_code=500, detail="Failed to connect to kettle.")
    
    return k

# Routes

@app.get("/api/state")
async def get_state(device_name: Optional[str] = None):
    """
    Connects to the kettle, gets state, and disconnects.
    """
    k = await get_kettle_client(device_name or DEFAULT_KETTLE_NAME)
    try:
        await k.refresh_state()
        state = k.get_all_states()
        state["connected"] = True
        state["device_name"] = k.address
        return state
    finally:
        await k.disconnect()

@app.post("/api/temperature")
async def set_temperature(req: TargetTempRequest, device_name: Optional[str] = None):
    """Connects, sets target temperature, and disconnects."""
    k = await get_kettle_client(device_name or DEFAULT_KETTLE_NAME)
    try:
        await k.set_target_temperature(req.temperature)
        return {"status": "ok", "target": req.temperature}
    finally:
        await k.disconnect()

@app.post("/api/hold")
async def set_hold(req: HoldRequest, device_name: Optional[str] = None):
    """Connects, sets hold time, and disconnects."""
    k = await get_kettle_client(device_name or DEFAULT_KETTLE_NAME)
    try:
        await k.set_hold_time(req.minutes)
        return {"status": "ok", "hold_minutes": req.minutes}
    finally:
        await k.disconnect()

@app.post("/api/schedule")
async def set_schedule(req: ScheduleRequest, device_name: Optional[str] = None):
    """Connects, sets schedule, and disconnects."""
    k = await get_kettle_client(device_name or DEFAULT_KETTLE_NAME)
    try:
        mode_map = {
            "off": ScheduleMode.OFF,
            "once": ScheduleMode.ONCE,
            "daily": ScheduleMode.DAILY
        }
        
        if req.mode not in mode_map:
            raise HTTPException(status_code=400, detail="Invalid schedule mode")
            
        await k.set_schedule(
            mode=mode_map[req.mode],
            hour=req.hour,
            minute=req.minute,
            temp_celsius=req.temperature
        )
        return {"status": "ok", "schedule": req.dict()}
    finally:
        await k.disconnect()

if __name__ == "__main__":
    import uvicorn
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=8000)
