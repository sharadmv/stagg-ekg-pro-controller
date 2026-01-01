import asyncio
import logging
import sys
from bleak import BleakScanner
from pyacaia_async import AcaiaScale

# Configure logging to be minimal by default
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("acaia_cli")

async def scan_for_pearls():
    """Scan for BLE devices with 'PEARL' in their name."""
    print("Scanning for Acaia Pearl scales (5 seconds)...")
    devices = await BleakScanner.discover(return_adv=True, timeout=5.0)
    
    candidates = []
    for d, a in devices.values():
        name = d.name or ""
        if "PEARL" in name.upper():
            candidates.append((d, a))
    
    # Sort by RSSI (signal strength)
    candidates.sort(key=lambda x: x[1].rssi, reverse=True)
    return candidates

async def async_input(prompt: str) -> str:
    """Async wrapper for input() to avoid blocking the event loop."""
    return await asyncio.get_event_loop().run_in_executor(None, input, prompt)

async def repl_loop(scale: AcaiaScale):
    """Simple interactive REPL for controlling the scale."""
    print("\n--- Interactive Acaia REPL ---")
    print("The 'scale' object is available.")
    print("Methods: await scale.tare(), await scale.start_stop_timer(), await scale.reset_timer()")
    print("Properties: scale.weight, scale.timer, scale.device_state")
    print("Type 'exit' to quit.")
    
    # Context for eval/exec
    ctx = {'scale': scale, 'asyncio': asyncio, 'print': print}
    
    while True:
        try:
            line = await async_input(">>> ")
            line = line.strip()
            if not line:
                continue
            
            if line == "exit":
                break
            
            # Try to eval as expression first
            try:
                code_obj = compile(line, "<repl>", "eval")
                result = eval(code_obj, globals(), ctx)
                
                # If it's a coroutine, await it
                if asyncio.iscoroutine(result):
                    result = await result
                
                if result is not None:
                    print(result)
                    
            except SyntaxError:
                # If eval fails, try exec as a statement (e.g. assignment)
                try:
                    exec(line, globals(), ctx)
                except Exception as e:
                    print(f"Error: {e}")
            except Exception as e:
                print(f"Error: {e}")
                
        except EOFError:
            break
        except KeyboardInterrupt:
            print("\nType 'exit' to quit.")

async def main():
    # 1. Scan for devices
    candidates = await scan_for_pearls()
    
    if not candidates:
        print("No Acaia Pearl scales found.")
        choice = await async_input("Show all detected BLE devices? (y/n): ")
        if choice.lower().startswith('y'):
             devices = await BleakScanner.discover(return_adv=True, timeout=3.0)
             all_devices = sorted([(d, a) for d, a in devices.values()], key=lambda x: x[1].rssi, reverse=True)
             print("\nAll detected devices:")
             for i, (d, a) in enumerate(all_devices):
                 name = d.name or "Unknown"
                 print(f"{i}: {name} ({d.address}) RSSI: {a.rssi}")
        return

    # 2. Selection
    print("\nFound devices:")
    for i, (d, a) in enumerate(candidates):
        name = d.name or "Unknown"
        print(f"{i}: {name} ({d.address}) RSSI: {a.rssi}")
    
    selected_device = None
    if len(candidates) == 1:
        selected_device = candidates[0][0]
        print(f"\nAutomatically selecting only found device: {selected_device.name}")
    else:
        while True:
            choice = await async_input("\nSelect device index (or 'q' to quit): ")
            if choice.lower() == 'q':
                return
            try:
                idx = int(choice)
                if 0 <= idx < len(candidates):
                    selected_device = candidates[idx][0]
                    break
                else:
                    print("Invalid index.")
            except ValueError:
                print("Please enter a number.")

    # 3. Connection
    print(f"\nConnecting to {selected_device.name} ({selected_device.address})...")
    
    # Instantiate AcaiaScale. is_new_style_scale=True is usually correct for Pearl.
    scale = AcaiaScale(selected_device)
    
    try:
        await scale.connect()
        print("Connected successfully!")
        
        # 4. Enter REPL
        await repl_loop(scale)
        
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        print("\nDisconnecting...")
        try:
            await scale.disconnect()
        except Exception:
            pass
        print("Goodbye.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProgram interrupted.")