import asyncio
from bleak import BleakScanner, BleakClient

async def main():
    print("Scanning for BLE devices...")
    
    # 1. Discover devices
    # We increase the timeout slightly to ensure we catch advertising packets
    devices = await BleakScanner.discover(timeout=5.0)
    
    target_device = None
    
    # 2. Filter for device name containing "EKG"
    for device in devices:
        # device.name can be None, so we must check existence first
        if device.name and "EKG" in device.name:
            target_device = device
            break
    
    if target_device is None:
        print("No device found with name containing 'EKG'.")
        return

    print(f"Found target: {target_device.name} [{target_device.address}]")
    print("Connecting...")

    # 3. Connect and list services
    try:
        async with BleakClient(target_device.address) as client:
            print(f"Connected: {client.is_connected}")
            
            print("\n--- Discovered Services ---")
            for service in client.services:
                print(f"Service: {service.uuid}")
                print(f"Description: {service.description}")
                # Optional: List characteristics within the service for more detail
                for char in service.characteristics:
                    print(f"  - Char: {char.uuid} ({','.join(char.properties)})")
                    try:
                        desc = await client.read_gatt_char(char)
                        print("Read:", bytearray(desc))
                    except:
                        pass
                print("-" * 30)
                
    except Exception as e:
        print(f"Failed to connect or retrieve services: {e}")

if __name__ == "__main__":
    asyncio.run(main())
