#!/usr/bin/env python3
"""
Fellow Stagg EKG Pro - Complete Control Class
Reverse-engineered BLE protocol for the configuration options of
Fellow Stagg EKG Pro kettle
"""

import asyncio
from bleak import BleakClient, BleakError
from enum import Enum
from typing import Optional, Callable
import logging

MAIN_CONFIG_UUID = '2291c4b5-5d7f-4477-a88b-b266edb97142'

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class _Payload:
    """Byte offsets for the 17-byte payload."""
    STATUS_FLAGS = 0
    CONTROL_FLAGS = 1
    ALTITUDE_LOW = 2
    ALTITUDE_HIGH = 3
    TARGET_TEMP = 4
    SCHEDULE_TEMP = 6
    SCHEDULE_MINUTES = 8
    SCHEDULE_HOURS = 9
    CLOCK_MINUTES = 10
    CLOCK_HOURS = 11
    CLOCK_MODE = 12
    HOLD_TIME = 13
    CHIME_VOLUME = 14
    LANGUAGE = 15
    COUNTER = 16

class _ControlFlags:
    """Bitmasks for the control flags byte."""
    UNITS = 0x02
    PRE_BOIL = 0x08

class _StatusFlags:
    """Bitmasks for the status flags byte."""
    SCHEDULE_ENABLED = 0x08

class _CounterFlags:
    """Bitmasks for the counter byte."""
    SCHEDULE_MODE = 0x08


class ClockMode(Enum):
    """Clock display modes"""
    OFF = 0
    DIGITAL = 1
    ANALOG = 2

class Units(Enum):
    """Temperature units"""
    CELSIUS = 1
    FAHRENHEIT = 0

class ScheduleMode(Enum):
    """Schedule modes"""
    OFF = 0
    ONCE = 1
    DAILY = 2

class Language(Enum):
    """Menu languages"""
    ENGLISH = 0x00
    FRENCH = 0x01
    SPANISH = 0x02
    SIMPLIFIED_CHINESE = 0x03
    TRADITIONAL_CHINESE = 0x04

class StaggEKGPro:
    """
    Fellow Stagg EKG Pro Controller
    This class handles the BLE communication and control of the kettle.
    """
    
    def __init__(self, address: str):
        """
        Initialize the Stagg EKG Pro controller.
        
        Args:
            address: BLE MAC address or UUID of the kettle.
        """
        self.address = address
        self.client: Optional[BleakClient] = None
        self._state_data: Optional[bytearray] = None
        self._notification_callback: Optional[Callable] = None
        self._counter: int = 0
        
    async def connect(self) -> bool:
        """
        Connect to the kettle.
        
        Returns:
            True if connected successfully, False otherwise.
        """
        try:
            self.client = BleakClient(self.address)
            await self.client.connect()
            
            if self.client.is_connected:
                logger.info(f"✅ Connected to Stagg EKG Pro at {self.address}")
                await self.client.start_notify(MAIN_CONFIG_UUID, self._handle_notification)
                await self.refresh_state()
                return True
            return False
        except BleakError as e:
            logger.error(f"❌ Connection failed: {e}")
            return False
    
    async def disconnect(self):
        """Disconnect from the kettle."""
        if self.client and self.client.is_connected:
            await self.client.disconnect()
            logger.info("🔌 Disconnected from kettle")
    
    def _handle_notification(self, sender, data: bytearray):
        """Handle incoming BLE notifications."""
        self._state_data = bytearray(data)
        self._counter = data[_Payload.COUNTER]
        logger.debug(f"📡 Notification received: {data.hex()}")
        if self._notification_callback:
            self._notification_callback(self.get_all_states())
    
    def set_notification_callback(self, callback: Callable):
        """Set a callback for settings updates."""
        self._notification_callback = callback
    
    async def refresh_state(self):
        """Read the current state from the kettle."""
        if not self.client or not self.client.is_connected:
            raise RuntimeError("Not connected to kettle")
        
        data = await self.client.read_gatt_char(MAIN_CONFIG_UUID)
        self._state_data = bytearray(data)
        self._counter = data[_Payload.COUNTER]
        logger.debug(f"📊 State refreshed: {data.hex()}")
    
    def get_all_states(self) -> dict:
        """
        Get a dictionary of all current kettle states.
        """
        if not self._state_data or len(self._state_data) < 17:
            return {}
        
        clock_hours, clock_minutes = self.get_clock_time() or (0,0)

        return {
            'target_temperature': self.get_target_temperature(),
            'units': self.get_units().name.lower() if self.get_units() else None,
            'pre_boil_enabled': self.get_pre_boil(),
            'altitude_meters': self.get_altitude(),
            'clock_mode': self.get_clock_mode().name.lower() if self.get_clock_mode() else None,
            'clock_hours': clock_hours,
            'clock_minutes': clock_minutes,
            'clock_time': f"{clock_hours:02d}:{clock_minutes:02d}",
            'hold_time_minutes': self.get_hold_time(),
            'hold_enabled': self.get_hold_time() > 0,
            'chime_volume': self.get_chime_volume(),
            'chime_enabled': self.get_chime_volume() > 0,
            'schedule': self.get_schedule(),
            'language': self.get_language().name.title() if self.get_language() else None,
            'raw_data': self._state_data.hex(),
            'counter': self._counter
        }

    async def _write_state(self, new_data: bytearray):
        """Internal method to write state to the kettle."""
        if not self.client or not self.client.is_connected:
            raise RuntimeError("Not connected to kettle")
        
        new_data[_Payload.COUNTER] = (self._counter + 1) & 0xFF
        
        await self.client.write_gatt_char(MAIN_CONFIG_UUID, bytes(new_data))
        logger.debug(f"✍️ Written: {new_data.hex()}")
        
        self._state_data = new_data
        self._counter = new_data[_Payload.COUNTER]
    
    # ========== Temperature Control ==========
    
    async def set_target_temperature(self, temp_celsius: float):
        """Set the target temperature in Celsius (0-100)."""
        if self._state_data is None: await self.refresh_state()
        
        temp_celsius = max(0, min(100, temp_celsius))
        
        new_data = bytearray(self._state_data)
        new_data[_Payload.TARGET_TEMP] = int(temp_celsius * 2)
        
        await self._write_state(new_data)
        logger.info(f"🎯 Target temperature set to {temp_celsius}°C")
    
    def get_target_temperature(self) -> Optional[float]:
        """Get the current target temperature in Celsius."""
        if self._state_data is None: return None
        return self._state_data[_Payload.TARGET_TEMP] / 2.0
    
    # ========== Units Control ==========
    
    async def set_units(self, units: Units):
        """Set temperature units."""
        if self._state_data is None: await self.refresh_state()
        
        new_data = bytearray(self._state_data)
        
        if units == Units.CELSIUS:
            new_data[_Payload.CONTROL_FLAGS] |= _ControlFlags.UNITS
        else:
            new_data[_Payload.CONTROL_FLAGS] &= ~_ControlFlags.UNITS
        
        await self._write_state(new_data)
        logger.info(f"🌐 Units set to {units.name}")
    
    def get_units(self) -> Optional[Units]:
        """Get the current temperature units."""
        if self._state_data is None: return None
        return Units.CELSIUS if self._state_data[_Payload.CONTROL_FLAGS] & _ControlFlags.UNITS else Units.FAHRENHEIT
    
    # ========== Clock Control ==========
    
    async def set_clock_mode(self, mode: ClockMode):
        """Set the clock display mode."""
        if self._state_data is None: await self.refresh_state()
        
        new_data = bytearray(self._state_data)
        new_data[_Payload.CLOCK_MODE] = mode.value
        
        await self._write_state(new_data)
        logger.info(f"🕐 Clock mode set to {mode.name}")
    
    async def set_clock_time(self, hours: int, minutes: int, mode: Optional[ClockMode] = None):
        """Set the clock time and optionally the display mode."""
        if self._state_data is None: await self.refresh_state()
        
        if not (0 <= hours <= 23 and 0 <= minutes <= 59):
            raise ValueError("Invalid time provided.")
        
        new_data = bytearray(self._state_data)
        new_data[_Payload.CLOCK_MINUTES] = minutes
        new_data[_Payload.CLOCK_HOURS] = hours
        
        if mode is not None:
            new_data[_Payload.CLOCK_MODE] = mode.value
        
        await self._write_state(new_data)
        logger.info(f"🕐 Clock set to {hours:02d}:{minutes:02d}" + (f" ({mode.name})" if mode else ""))
    
    def get_clock_time(self) -> Optional[tuple[int, int]]:
        """Get the current clock time as a (hours, minutes) tuple."""
        if self._state_data is None: return None
        return (self._state_data[_Payload.CLOCK_HOURS], self._state_data[_Payload.CLOCK_MINUTES])
    
    def get_clock_mode(self) -> Optional[ClockMode]:
        """Get the current clock mode."""
        if self._state_data is None: return None
        try:
            return ClockMode(self._state_data[_Payload.CLOCK_MODE])
        except ValueError:
            return None

    # ========== Chime Control ==========
    
    async def set_chime_volume(self, volume: int):
        """Set the chime volume (0-10)."""
        if self._state_data is None: await self.refresh_state()
        
        volume = max(0, min(10, volume))
        
        new_data = bytearray(self._state_data)
        new_data[_Payload.CHIME_VOLUME] = volume
        
        await self._write_state(new_data)
        logger.info(f"🔔 Chime volume set to {volume}" if volume > 0 else "🔔 Chime disabled")
    
    def get_chime_volume(self) -> Optional[int]:
        """Get the current chime volume (0 = OFF)."""
        if self._state_data is None: return None
        return self._state_data[_Payload.CHIME_VOLUME]
    
    # ========== Pre-boil Control ==========
    
    async def set_pre_boil(self, enabled: bool):
        """Enable or disable the pre-boil feature."""
        if self._state_data is None: await self.refresh_state()
        
        new_data = bytearray(self._state_data)
        
        if enabled:
            new_data[_Payload.CONTROL_FLAGS] |= _ControlFlags.PRE_BOIL
        else:
            new_data[_Payload.CONTROL_FLAGS] &= ~_ControlFlags.PRE_BOIL
        
        await self._write_state(new_data)
        logger.info(f"🔥 Pre-boil {'enabled' if enabled else 'disabled'}")
    
    def get_pre_boil(self) -> Optional[bool]:
        """Check if pre-boil is enabled."""
        if self._state_data is None: return None
        return bool(self._state_data[_Payload.CONTROL_FLAGS] & _ControlFlags.PRE_BOIL)
    
    # ========== Hold Time Control ==========
    
    async def set_hold_time(self, minutes: int):
        """Set hold temperature time in minutes (0=OFF, 15, 30, 45, 60)."""
        if self._state_data is None: await self.refresh_state()
        
        minutes = max(0, min(60, minutes))
        
        new_data = bytearray(self._state_data)
        new_data[_Payload.HOLD_TIME] = minutes
        
        await self._write_state(new_data)
        logger.info(f"⏱️ Hold time set to {minutes} minutes" if minutes > 0 else "⏱️ Hold mode disabled")
    
    def get_hold_time(self) -> Optional[int]:
        """Get the current hold time in minutes."""
        if self._state_data is None: return None
        return self._state_data[_Payload.HOLD_TIME]
    
    # ========== Altitude Control ==========
    
    async def set_altitude(self, altitude_meters: int):
        """Set altitude compensation in meters (0-3000)."""
        if self._state_data is None: await self.refresh_state()
        
        altitude_meters = max(0, min(3000, altitude_meters))
        quantized = round(altitude_meters / 30) * 30
        
        byte_low = quantized & 0xFF
        byte_high = 0x80 + ((quantized >> 8) & 0x7F)
        
        new_data = bytearray(self._state_data)
        new_data[_Payload.ALTITUDE_LOW] = byte_low
        new_data[_Payload.ALTITUDE_HIGH] = byte_high
        
        await self._write_state(new_data)
        logger.info(f"🏔️ Altitude set to {quantized}m")
    
    def get_altitude(self) -> Optional[int]:
        """Get the current altitude compensation in meters."""
        if self._state_data is None: return None
        
        byte_low = self._state_data[_Payload.ALTITUDE_LOW]
        byte_high = self._state_data[_Payload.ALTITUDE_HIGH]
        altitude = ((byte_high & 0x7F) << 8) | byte_low
        
        return round(altitude / 30) * 30

    # ========== Schedule Control ==========

    async def _disable_schedule(self, old_data: bytearray) -> bytearray:
        """Helper to create a schedule-disabled payload."""
        new_data = bytearray(old_data)
        new_data[_Payload.STATUS_FLAGS] &= ~_StatusFlags.SCHEDULE_ENABLED
        new_data[_Payload.SCHEDULE_TEMP] = 0xc0
        new_data[_Payload.SCHEDULE_HOURS] = 0
        new_data[_Payload.SCHEDULE_MINUTES] = 0
        return new_data

    async def set_schedule(self, mode: ScheduleMode, hour: int = 0, minute: int = 0, temp_celsius: float = 85):
        """
        Set the schedule mode, time, and temperature.
        Note: Changing between ONCE and DAILY requires a two-step BLE write.
        """
        if self._state_data is None: await self.refresh_state()

        if mode == ScheduleMode.OFF:
            new_data = await self._disable_schedule(self._state_data)
            await self._write_state(new_data)
            logger.info("📅 Schedule disabled")
            return

        if not (0 <= hour <= 23 and 0 <= minute <= 59):
            raise ValueError("Invalid time provided for schedule.")
        temp_celsius = max(0, min(100, temp_celsius))

        current_mode = self.get_schedule_mode()
        is_mode_change = current_mode not in (ScheduleMode.OFF, None) and current_mode != mode

        if is_mode_change:
            # Step 1: Disable schedule first
            disabled_data = await self._disable_schedule(self._state_data)
            await self._write_state(disabled_data)
            await asyncio.sleep(0.3)  # Allow kettle to process the change

        # Step 2: Set the new schedule
        new_data = bytearray(self._state_data)
        new_data[_Payload.STATUS_FLAGS] |= _StatusFlags.SCHEDULE_ENABLED
        new_data[_Payload.SCHEDULE_TEMP] = int(temp_celsius * 2)
        new_data[_Payload.SCHEDULE_HOURS] = hour
        new_data[_Payload.SCHEDULE_MINUTES] = minute

        # Set schedule mode bit
        if mode == ScheduleMode.ONCE:
            new_data[_Payload.COUNTER] |= _CounterFlags.SCHEDULE_MODE
        else: # DAILY
            new_data[_Payload.COUNTER] &= ~_CounterFlags.SCHEDULE_MODE

        await self._write_state(new_data)
        logger.info(f"📅 Schedule set to {mode.name} at {hour:02d}:{minute:02d}, {temp_celsius}°C")


    def get_schedule(self) -> dict:
        """Get the current schedule settings as a dictionary."""
        if self._state_data is None:
            return {}

        mode = self.get_schedule_mode()
        if mode in (ScheduleMode.OFF, None):
            return {'mode': 'off', 'enabled': False}
        
        temp = self._state_data[_Payload.SCHEDULE_TEMP] / 2.0
        hour = self._state_data[_Payload.SCHEDULE_HOURS]
        minute = self._state_data[_Payload.SCHEDULE_MINUTES]
        
        return {
            'mode': mode.name.lower(),
            'enabled': True,
            'temperature_celsius': temp,
            'hour': hour,
            'minute': minute,
            'time': f"{hour:02d}:{minute:02d}"
        }

    def get_schedule_mode(self) -> Optional[ScheduleMode]:
        """Get the current schedule mode."""
        if self._state_data is None: return None
        if not (self._state_data[_Payload.STATUS_FLAGS] & _StatusFlags.SCHEDULE_ENABLED):
            return ScheduleMode.OFF
        
        is_once = self._state_data[_Payload.COUNTER] & _CounterFlags.SCHEDULE_MODE
        return ScheduleMode.ONCE if is_once else ScheduleMode.DAILY

    # ========== Language Control ==========

    async def set_language(self, language: Language):
        """Set the kettle's language."""
        if self._state_data is None: await self.refresh_state()
        if not isinstance(language, Language):
            raise ValueError("Invalid language specified.")

        new_data = bytearray(self._state_data)
        new_data[_Payload.LANGUAGE] = language.value
        await self._write_state(new_data)
        logger.info(f"🌐 Language set to {language.name.title()}")

    def get_language(self) -> Optional[Language]:
        """Get the current language of the kettle."""
        if self._state_data is None: return None
        try:
            return Language(self._state_data[_Payload.LANGUAGE])
        except ValueError:
            return None
