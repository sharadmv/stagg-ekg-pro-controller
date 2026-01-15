import asyncio
import logging
from contextlib import asynccontextmanager
from typing import Optional

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from bleak import BleakScanner

from stagg_ekg_pro import StaggEKGPro, ScheduleMode

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("kettle-server")

# Global State
current_device_name: Optional[str] = None

app = FastAPI()

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
async def get_kettle_client(name_prefix: str):
    """
    Finds, connects, and returns a kettle client. 
    The caller is responsible for disconnecting.
    """
    logger.info(f"Scanning for device with name containing '{name_prefix}'...")
    devices = await BleakScanner.discover(return_adv=True, timeout=5.0)
    target_device = None
    
    for d, a in devices.values():
        d_name = d.name or ""
        if name_prefix.lower() in d_name.lower():
            target_device = d
            break
            
    if not target_device:
        raise HTTPException(status_code=404, detail=f"Device matching '{name_prefix}' not found.")
        
    logger.info(f"Found {target_device.name} ({target_device.address}), connecting...")
    k = StaggEKGPro(target_device.address)
    connected = await k.connect()
    
    if not connected:
        raise HTTPException(status_code=500, detail="Failed to connect to kettle.")
    
    return k

# Routes

@app.get("/api/state")
async def get_state(device_name: str):
    """
    Connects to the kettle, gets state, and disconnects.
    """
    k = await get_kettle_client(device_name)
    try:
        await k.refresh_state()
        state = k.get_all_states()
        state["connected"] = True
        state["device_name"] = device_name
        return state
    finally:
        await k.disconnect()

@app.post("/api/temperature")
async def set_temperature(device_name: str, req: TargetTempRequest):
    """Connects, sets target temperature, and disconnects."""
    k = await get_kettle_client(device_name)
    try:
        await k.set_target_temperature(req.temperature)
        return {"status": "ok", "target": req.temperature}
    finally:
        await k.disconnect()

@app.post("/api/hold")
async def set_hold(device_name: str, req: HoldRequest):
    """Connects, sets hold time, and disconnects."""
    k = await get_kettle_client(device_name)
    try:
        await k.set_hold_time(req.minutes)
        return {"status": "ok", "hold_minutes": req.minutes}
    finally:
        await k.disconnect()

@app.post("/api/schedule")
async def set_schedule(device_name: str, req: ScheduleRequest):
    """Connects, sets schedule, and disconnects."""
    k = await get_kettle_client(device_name)
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
