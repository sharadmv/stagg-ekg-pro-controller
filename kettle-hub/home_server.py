from fastapi import FastAPI, Request
import subprocess

app = FastAPI()

@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/smarthome")
async def handle_smarthome(request: Request):
    payload = await request.json()
    intent = payload['inputs'][0]['intent']
    
    if intent == "action.devices.SYNC":
        return {
            "requestId": payload['requestId'],
            "payload": {
                "agentUserId": "user-123",
                "devices": [{
                    "id": "kettle-01",
                    "type": "action.devices.types.KETTLE",
                    "traits": ["action.devices.traits.OnOff"],
                    "name": {"name": "Kettle"},
                    "willReportState": True
                }]
            }
        }
    
    if intent == "action.devices.EXECUTE":
        # Here you call your existing BLE script
        subprocess.run(["uv", "run", "kettle_control.py", "--on"])
        return {
            "requestId": payload['requestId'],
            "payload": {
                "commands": [{
                    "ids": ["kettle-01"],
                    "status": "SUCCESS",
                    "states": {"on": True, "online": True}
                }]
            }
        }
