import asyncio
import logging
import sys
import time
from bleak import BleakScanner, BleakError
from stagg_ekg_pro import StaggEKGPro

# Configure logging to show info but not be too noisy
logging.basicConfig(level=logging.WARNING)
logger = logging.getLogger("repl")
logger.setLevel(logging.INFO)

async def scan_for_devices():
    print("Scanning for Stagg EKG Pro devices (5 seconds)...")
    devices = await BleakScanner.discover(return_adv=True, timeout=5.0)
    
    candidates = []
    for d, a in devices.values():
        name = d.name or ""
        # Filter for likely candidates
        if "Stagg" in name or "Fellow" in name or "EKG" in name:
            candidates.append((d, a))
    
    # Sort by RSSI
    candidates.sort(key=lambda x: x[1].rssi, reverse=True)
    return candidates

async def async_input(prompt: str) -> str:
    """Async wrapper for input() to avoid blocking the loop."""
    return await asyncio.get_event_loop().run_in_executor(None, input, prompt)

async def repl_loop(kettle: StaggEKGPro):
    print("\n--- Interactive REPL ---")
    print("The 'kettle' object is available.")
    print("You can use 'await kettle.get_all_states()', etc.")
    print("Type 'help' for a reminder of methods, 'exit' to quit.")
    
    # Context for eval/exec
    ctx = {'kettle': kettle, 'asyncio': asyncio, 'print': print}
    
    while True:
        try:
            line = await async_input(">>> ")
            line = line.strip()
            if not line:
                continue
            
            if line == "exit":
                break
            
            if line == "help":
                print("Available methods on 'kettle':")
                print("  await kettle.get_all_states()")
                print("  await kettle.set_target_temperature(temp_celsius)")
                print("  await kettle.set_on(True/False)  # If implemented")
                print("  await kettle.set_hold_time(minutes)")
                print("  # ... check stagg_ekg_pro.py for more")
                continue

            # Try to eval as expression first
            try:
                # Compile as an expression
                code_obj = compile(line, "<repl>", "eval")
                result = eval(code_obj, globals(), ctx)
                
                # If it's a coroutine, await it
                if asyncio.iscoroutine(result):
                    result = await result
                
                if result is not None:
                    print(result)
                    
            except SyntaxError:
                # Maybe it's a statement? (e.g. assignment)
                try:
                    exec(line, globals(), ctx)
                except Exception as e:
                    print(f"Error: {e}")
            except Exception as e:
                print(f"Error: {e}")
                
        except EOFError:
            break
        except KeyboardInterrupt:
            # Handle Ctrl+C gracefully-ish
            print("\nType 'exit' to quit.")

async def main():
    # 1. Scan
    candidates = await scan_for_devices()
    
    if not candidates:
        print("No Stagg EKG Pro devices found.")
        # Optional: Ask to list all devices?
        choice = await async_input("Show all detected BLE devices? (y/n): ")
        if choice.lower().startswith('y'):
             devices = await BleakScanner.discover(return_adv=True, timeout=3.0)
             candidates = sorted([(d, a) for d, a in devices.values()], key=lambda x: x[1].rssi, reverse=True)
        else:
            return

    if not candidates:
         print("No devices found.")
         return

    print("\nFound devices:")
    for i, (d, a) in enumerate(candidates):
        name = d.name or "Unknown"
        print(f"{i}: {name} ({d.address}) RSSI: {a.rssi}")
    
    # 2. Select
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

    # 3. Connect
    print(f"\nConnecting to {selected_device.name} ({selected_device.address})...")
    kettle = StaggEKGPro(selected_device.address)
    
    try:
        connected = await kettle.connect()
        if not connected:
            print("Failed to connect.")
            return
        
        print("Connected successfully!")
        for _ in range(5):
            time.sleep(2)
            await kettle.refresh_state()
            print(kettle._state_data)
        
        # 4. Enter REPL
        # await repl_loop(kettle)
        
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
    finally:
        print("Disconnecting...")
        await kettle.disconnect()
        print("Goodbye.")

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProgram interrupted.")
