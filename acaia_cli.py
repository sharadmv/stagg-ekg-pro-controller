import asyncio
import logging
from aioacaia import AcaiaScale
from bleak import BleakScanner

# Set logging to see aioacaia debug info if needed
# logging.basicConfig(level=logging.DEBUG)

async def main():
    print("Scanning for Acaia scales (via Bleak)...")
    devices = await BleakScanner.discover()
    
    target_device = None
    for d in devices:
        name = d.name or ""
        if any(x in name.upper() for x in ["ACAIA", "PEARL", "LUNAR", "PYXIS"]):
            print(f"Found: {name} ({d.address})")
            target_device = d
            break 
            
    if not target_device:
        print("No Acaia scale found.")
        return

    print(f"Connecting to {target_device.name} using aioacaia...")
    
    # Initialize AcaiaScale
    # Signature: (self, address_or_ble_device: 'str | BLEDevice', name: 'str | None' = None, ...)
    scale = AcaiaScale(address_or_ble_device=target_device.address)
    
    try:
        await scale.connect()
        print("Connected.")
        
        print("\nControls:\n  [t] Tare\n  [s] Start/Stop Timer\n  [r] Reset Timer\n  [q] Quit")
        
        loop = asyncio.get_running_loop()
        while True:
            # Print status
            w = scale.weight if scale.weight is not None else 0.0
            # units attribute is missing in this version
            u = "" 
            t_val = scale.timer if scale.timer is not None else 0.0 # 'timer' property confirmed in inspection
            
            print(f"\rWeight: {w} {u} | Time: {t_val}      ", end="", flush=True)
            
            cmd = await loop.run_in_executor(None, input)
            cmd = cmd.strip().lower()
            
            if cmd == 'q':
                break
            
            if cmd == 't':
                await scale.tare()
                print("\nSent Tare")
            elif cmd == 's':
                await scale.start_stop_timer()
                print("\nSent Start/Stop")
            elif cmd == 'r':
                await scale.reset_timer()
                print("\nSent Reset")
                
    except Exception as e:
        print(f"Error: {e}")
    finally:
        # Cleanup if needed
        # aioacaia might not have explicit disconnect?
        pass

if __name__ == "__main__":
    asyncio.run(main())
