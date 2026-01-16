import asyncio
import logging
import sqlite3
import secrets
import time
from contextlib import asynccontextmanager
from typing import Optional
from fastapi import FastAPI, HTTPException, Request, Form, Depends
from fastapi.responses import JSONResponse, HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from fastapi.security import OAuth2PasswordBearer
from pydantic import BaseModel
from bleak import BleakScanner

from stagg_ekg_pro import StaggEKGPro, ScheduleMode

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kettle-server")

# Configuration
DEFAULT_KETTLE_NAME = "EKG-a8-41-f0" # Default name for Smart Home connection
DB_PATH = "kettle_oauth.db"

class DatabaseManager:
    def __init__(self, db_path):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS tokens (
                    access_token TEXT PRIMARY KEY,
                    refresh_token TEXT,
                    user_id TEXT,
                    expires_at INTEGER
                )
            """)
            conn.execute("""
                CREATE TABLE IF NOT EXISTS auth_codes (
                    code TEXT PRIMARY KEY,
                    user_id TEXT,
                    expires_at INTEGER
                )
            """)
            conn.commit()

    def store_auth_code(self, code, user_id, expires_in=300):
        expires_at = int(time.time()) + expires_in
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("INSERT INTO auth_codes (code, user_id, expires_at) VALUES (?, ?, ?)",
                         (code, user_id, expires_at))
            conn.commit()

    def validate_auth_code(self, code):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT user_id, expires_at FROM auth_codes WHERE code = ?", (code,))
            row = cursor.fetchone()
            if row:
                user_id, expires_at = row
                # Delete code after use
                conn.execute("DELETE FROM auth_codes WHERE code = ?", (code,))
                conn.commit()
                if expires_at > time.time():
                    return user_id
            return None

    def store_tokens(self, access_token, refresh_token, user_id, expires_in=3600):
        expires_at = int(time.time()) + expires_in
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("INSERT OR REPLACE INTO tokens (access_token, refresh_token, user_id, expires_at) VALUES (?, ?, ?, ?)",
                         (access_token, refresh_token, user_id, expires_at))
            conn.commit()

    def get_token(self, access_token):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT user_id, expires_at FROM tokens WHERE access_token = ?", (access_token,))
            row = cursor.fetchone()
            if row:
                user_id, expires_at = row
                if expires_at > time.time():
                    return user_id
            return None

    def validate_refresh_token(self, refresh_token):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.execute("SELECT user_id FROM tokens WHERE refresh_token = ?", (refresh_token,))
            row = cursor.fetchone()
            return row[0] if row else None

db = DatabaseManager(DB_PATH)

app = FastAPI()
templates = Jinja2Templates(directory="templates")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def verify_token(token: str = Depends(oauth2_scheme)):
    user_id = db.get_token(token)
    if not user_id:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user_id

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
async def authorize_submit(redirect_uri: str = Form(...), state: str = Form(...), username: str = Form(...)):
    """
    Handle authorization form submission.
    Redirects back to Google with a temporary auth code.
    """
    code = secrets.token_urlsafe(16)
    db.store_auth_code(code, username)
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
        user_id = db.validate_auth_code(code)
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid or expired authorization code")
        logger.info(f"Exchanging code for tokens for user {user_id}")
    elif grant_type == "refresh_token":
        user_id = db.validate_refresh_token(refresh_token)
        if not user_id:
            raise HTTPException(status_code=400, detail="Invalid refresh token")
        logger.info(f"Refreshing access token for user {user_id}")
    else:
        raise HTTPException(status_code=400, detail="Invalid grant_type")

    access_token = secrets.token_urlsafe(32)
    refresh_token = secrets.token_urlsafe(32)
    expires_in = 3600
    db.store_tokens(access_token, refresh_token, user_id, expires_in)

    # Return tokens in the format Google expects
    return {
        "token_type": "bearer",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "expires_in": expires_in
    }

# --- Smart Home Fulfillment ---
@app.post("/smarthome")
async def smarthome(request: Request, user_id: str = Depends(verify_token)):
    data = await request.json()
    logger.debug(f"Smart Home Request: {data}")
    request_id = data.get("requestId")
    inputs = data.get("inputs", [])
    
    if not inputs:
        return {}
    
    intent = inputs[0].get("intent")
    payload = {}
    
    if intent == "action.devices.SYNC":
        payload = {
            "agentUserId": user_id,
            "devices": [{
                "id": "stagg_kettle_1",
                "type": "action.devices.types.KETTLE",
                "traits": [
                    "action.devices.traits.OnOff",
                    "action.devices.traits.TemperatureControl",
                ],
                "name": {
                    "name": "Fellow Stagg EKG Pro",
                    "nicknames": ["My Kettle", "Coffee Kettle"]
                },
                "willReportState": False,
                "attributes": {
                    "temperatureRange": {
                        "minThresholdCelsius": 40,
                        "maxThresholdCelsius": 100
                    },
                    "temperatureUnitForUX": "C",
                    "commandOnlyTemperatureSetting": False,
                    "queryOnlyTemperatureSetting": False
                }
            }]
        }
        
    elif intent == "action.devices.QUERY":
        devices = {}
        try:
            async with kettle_manager.get_kettle() as k:
                await k.refresh_state()
                all_state = k.get_all_states()
                
                target_temp = all_state.get("target_temperature", 85)
                # We report target as ambient since we don't have ambient reading easily accessible as a property yet
                # ideally we should read current temp if available
                ambient_temp = target_temp 
                
                # Check schedule/heating status for 'on' state
                schedule = all_state.get("schedule", {})
                is_on = schedule.get("mode", "off") != "off"
                
                devices["stagg_kettle_1"] = {
                    "online": True,
                    "on": is_on,
                    "temperatureSetpointCelsius": target_temp,
                    "temperatureAmbientCelsius": ambient_temp,
                }
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
                        async with kettle_manager.get_kettle() as k:
                            await k.refresh_state()
                            current_state = k.get_all_states()
                            current_schedule = current_state.get("schedule", {})
                            
                            # Track updates to apply at once if they affect the schedule
                            sched_mode = current_schedule.get("mode", "off")
                            sched_hour = current_schedule.get("hour", 0)
                            sched_min = current_schedule.get("minute", 0)
                            sched_temp = current_schedule.get("temperature_celsius", 85)
                            sched_updated = False

                            for exec_cmd in execution:
                                cmd_name = exec_cmd.get("command")
                                params = exec_cmd.get("params", {})
                                
                                if cmd_name == "action.devices.commands.SetTemperature":
                                    temp = params.get("temperature")
                                    await k.set_target_temperature(temp)
                                    states["temperatureSetpointCelsius"] = temp
                                    sched_temp = temp
                                elif cmd_name == "action.devices.commands.OnOff":
                                    on_val = params.get("on", True)
                                    states["on"] = on_val
                                    if on_val:
                                        # Turn On
                                        if sched_mode == "off":
                                            # Use actual target temp if we are just "turning on"
                                            # without a specific temperature command in this request
                                            if not any(c.get("command") == "action.devices.commands.SetTemperature" for c in execution):
                                                sched_temp = current_state.get("target_temperature", sched_temp)

                                            h = current_state.get("clock_hours", 0)
                                            m = current_state.get("clock_minutes", 0) + 1
                                            if m >= 60:
                                                m = 0
                                                h = (h + 1) % 24
                                            sched_mode = "once"
                                            sched_hour = h
                                            sched_min = m
                                            sched_updated = True
                                    else:
                                        # Turn Off
                                        sched_mode = "off"
                                        sched_updated = True

                            if sched_updated or (sched_mode != "off" and any(c.get("command") == "action.devices.commands.SetTemperature" for c in execution)):
                                mode_enum = ScheduleMode.OFF
                                if sched_mode == "daily": mode_enum = ScheduleMode.DAILY
                                elif sched_mode == "once": mode_enum = ScheduleMode.ONCE
                                
                                await k.set_schedule(mode=mode_enum, hour=sched_hour, minute=sched_min, temp_celsius=sched_temp)

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
class KettleManager:
    """
    Manages a persistent connection to the kettle and serializes access.
    Automatically disconnects after an idle period.
    """
    def __init__(self, name_prefix: str = DEFAULT_KETTLE_NAME, idle_timeout: float = 60.0):
        self.name_prefix = name_prefix
        self.idle_timeout = idle_timeout
        self.address: Optional[str] = None
        self.kettle: Optional[StaggEKGPro] = None
        self.lock = asyncio.Lock()
        self._disconnect_task: Optional[asyncio.Task] = None

    async def _discover_address(self):
        logger.info(f"Connecting to device with name '{self.name_prefix}'...")
        device = await BleakScanner.find_device_by_name(self.name_prefix, timeout=10.0)
        return device.address

    async def _auto_disconnect(self):
        """Task that waits for idle timeout and then disconnects."""
        await asyncio.sleep(self.idle_timeout)
        async with self.lock:
            if self.kettle and self.kettle.client and self.kettle.client.is_connected:
                logger.info(f"Idle timeout reached ({self.idle_timeout}s). Disconnecting...")
                await self.kettle.disconnect()
            self.kettle = None

    def _reset_disconnect_timer(self):
        """Cancels any existing disconnect task and starts a new one."""
        if self._disconnect_task:
            self._disconnect_task.cancel()
        self._disconnect_task = asyncio.create_task(self._auto_disconnect())

    @asynccontextmanager
    async def get_kettle(self):
        """
        Context manager to safely acquire and use the kettle client.
        Ensures only one request interacts with the kettle at a time and
        manages the auto-disconnect timer.
        """
        async with self.lock:
            # Cancel disconnect timer while kettle is in use
            if self._disconnect_task:
                self._disconnect_task.cancel()
                self._disconnect_task = None

            if self.address is None:
                self.address = await self._discover_address()
                if not self.address:
                    raise HTTPException(status_code=404, detail="Kettle not found.")

            if self.kettle is None:
                self.kettle = StaggEKGPro(self.address)
            
            if not self.kettle.client or not self.kettle.client.is_connected:
                logger.info(f"Connecting to kettle at {self.address}...")
                connected = await self.kettle.connect()
                print("Connected!")
                if not connected:
                    # Clear address to force re-discovery next time
                    self.address = None
                    self.kettle = None
                    raise HTTPException(status_code=500, detail="Failed to connect to kettle.")
            
            try:
                yield self.kettle
            except Exception as e:
                logger.error(f"Kettle operation failed: {e}")
                # If a communication error occurs, we drop the connection
                if self.kettle:
                    await self.kettle.disconnect()
                self.kettle = None
                raise
            finally:
                # Start/Reset the disconnect timer after the operation is done
                self._reset_disconnect_timer()

kettle_manager = KettleManager()

# Routes

@app.get("/api/state")
async def get_state(device_name: Optional[str] = None, _token: str = Depends(verify_token)):
    """
    Connects to the kettle, gets state, and disconnects.
    """
    async with kettle_manager.get_kettle() as k:
        await k.refresh_state()
        state = k.get_all_states()
        state["connected"] = True
        state["device_name"] = k.address
        return state

@app.post("/api/temperature")
async def set_temperature(req: TargetTempRequest, device_name: Optional[str] = None, _token: str = Depends(verify_token)):
    """Connects, sets target temperature, and disconnects."""
    async with kettle_manager.get_kettle() as k:
        await k.set_target_temperature(req.temperature)
        return {"status": "ok", "target": req.temperature}

@app.post("/api/hold")
async def set_hold(req: HoldRequest, device_name: Optional[str] = None, _token: str = Depends(verify_token)):
    """Connects, sets hold time, and disconnects."""
    async with kettle_manager.get_kettle() as k:
        await k.set_hold_time(req.minutes)
        return {"status": "ok", "hold_minutes": req.minutes}

@app.post("/api/schedule")
async def set_schedule(req: ScheduleRequest, device_name: Optional[str] = None, _token: str = Depends(verify_token)):
    """Connects, sets schedule, and disconnects."""
    async with kettle_manager.get_kettle() as k:
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

if __name__ == "__main__":
    import uvicorn
    # Run the server
    uvicorn.run(app, host="0.0.0.0", port=8000)
