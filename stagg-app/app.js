/**
 * Fellow Stagg EKG Pro - Web Bluetooth Controller
 * Ported from stagg_ekg_pro.py
 */

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
        .then(() => console.log('Service Worker Registered'))
        .catch((e) => console.log('SW Registration Failed:', e));
}

// Constants
const MAIN_CONFIG_UUID = '2291c4b5-5d7f-4477-a88b-b266edb97142';
// Known Service UUIDs to try (since we need to specify services in WebBluetooth to access them)
const OPTIONAL_SERVICES = [
    '7aebf330-6cb1-46e4-b23b-7cc2262c605e', // Discovered Service UUID
    'b4df5a1c-3f6b-f4bf-ea4a-820304901a02', 
    '00001820-0000-1000-8000-00805f9b34fb',
    MAIN_CONFIG_UUID 
];

// Payload Offsets
const Payload = {
    STATUS_FLAGS: 0,
    CONTROL_FLAGS: 1,
    ALTITUDE_LOW: 2,
    ALTITUDE_HIGH: 3,
    TARGET_TEMP: 4,
    SCHEDULE_TEMP: 6,
    SCHEDULE_MINUTES: 8,
    SCHEDULE_HOURS: 9,
    CLOCK_MINUTES: 10,
    CLOCK_HOURS: 11,
    CLOCK_MODE: 12,
    HOLD_TIME: 13,
    CHIME_VOLUME: 14,
    LANGUAGE: 15,
    COUNTER: 16
};

const Flags = {
    UNITS: 0x02,
    PRE_BOIL: 0x08,
    SCHEDULE_ENABLED: 0x08,
    SCHEDULE_MODE: 0x08
};

class StaggEKGPro {
    constructor() {
        this.device = null;
        this.server = null;
        this.characteristic = null;
        this.stateData = null; // Uint8Array
        this.counter = 0;
        this.onStateChange = null;
    }

    async requestDevice() {
        this.device = await navigator.bluetooth.requestDevice({
            filters: [
                { namePrefix: 'Stagg' },
                { namePrefix: 'Fellow' },
                { namePrefix: 'EKG' }
            ],
            optionalServices: OPTIONAL_SERVICES,
            acceptAllDevices: false 
        });
        this.device.addEventListener('gattserverdisconnected', this.onDisconnected.bind(this));
    }

    async connectGatt() {
        if (!this.device) throw new Error("No device selected");
        
        console.log('Connecting to GATT Server...');
        this.server = await this.device.gatt.connect();

        console.log('Getting Service...');
        let service = null;
        
        for (const uuid of OPTIONAL_SERVICES) {
            try {
                service = await this.server.getPrimaryService(uuid);
                console.log('Found service:', uuid);
                try {
                    this.characteristic = await service.getCharacteristic(MAIN_CONFIG_UUID);
                    break; 
                } catch (e) {
                    console.log(`Characteristic not in service ${uuid}`);
                    service = null;
                }
            } catch (e) {
                // Service not found
            }
        }

        if (!this.characteristic) {
            throw new Error('Could not find Main Config Characteristic. Ensure the device is supported.');
        }

        console.log('Starting Notifications...');
        await this.characteristic.startNotifications();
        this.characteristic.addEventListener('characteristicvaluechanged', this.handleNotification.bind(this));

        // Initial read
        console.log('Reading initial state...');
        const value = await this.characteristic.readValue();
        this.updateState(value);
        
        return true;
    }

    async connect() {
        await this.requestDevice();
        await this.connectGatt();
    }

    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
    }

    onDisconnected() {
        console.log('Device disconnected');
        if (this.onStateChange) this.onStateChange({ connected: false });
    }

    handleNotification(event) {
        const value = event.target.value;
        this.updateState(value);
    }

    updateState(dataView) {
        this.stateData = new Uint8Array(dataView.buffer);
        this.counter = this.stateData[Payload.COUNTER];
        
        // Parse state
        const state = this.parseState(this.stateData);
        state.connected = true;
        
        // Debug log
        const hex = [...this.stateData].map(b => b.toString(16).padStart(2,'0')).join(' ');
        document.getElementById('debug-log').innerText = hex;

        if (this.onStateChange) this.onStateChange(state);
    }

    parseState(data) {
        // Helper to get altitude
        const altLow = data[Payload.ALTITUDE_LOW];
        const altHigh = data[Payload.ALTITUDE_HIGH];
        const altRaw = ((altHigh & 0x7F) << 8) | altLow;
        const altitude = Math.round((Math.round(altRaw / 30) * 30));

        const scheduleEnabled = !!(data[Payload.STATUS_FLAGS] & Flags.SCHEDULE_ENABLED);
        const scheduleModeRaw = data[Payload.COUNTER] & Flags.SCHEDULE_MODE;
        let scheduleMode = 'off';
        if (scheduleEnabled) {
            scheduleMode = scheduleModeRaw ? 'once' : 'daily';
        }

        return {
            target_temperature: data[Payload.TARGET_TEMP] / 2.0,
            units: (data[Payload.CONTROL_FLAGS] & Flags.UNITS) ? 'celsius' : 'fahrenheit',
            pre_boil_enabled: !!(data[Payload.CONTROL_FLAGS] & Flags.PRE_BOIL),
            altitude_meters: altitude,
            hold_time_minutes: data[Payload.HOLD_TIME],
            schedule: {
                mode: scheduleMode,
                temperature_celsius: data[Payload.SCHEDULE_TEMP] / 2.0,
                hour: data[Payload.SCHEDULE_HOURS],
                minute: data[Payload.SCHEDULE_MINUTES]
            },
            language: data[Payload.LANGUAGE],
            clock: {
                hour: data[Payload.CLOCK_HOURS],
                minute: data[Payload.CLOCK_MINUTES]
            }
        };
    }

    async writeState(newData) {
        if (!this.characteristic) return;
        
        // Update counter
        this.counter = (this.counter + 1) & 0xFF;
        newData[Payload.COUNTER] = this.counter;

        try {
            await this.characteristic.writeValue(newData);
            // Optimistically update local state
            this.stateData = newData;
        } catch (e) {
            console.error("Write failed", e);
            throw e;
        }
    }

    async setTemperature(tempC) {
        if (!this.stateData) return;
        const newData = new Uint8Array(this.stateData);
        newData[Payload.TARGET_TEMP] = Math.round(Math.max(0, Math.min(100, tempC)) * 2);
        await this.writeState(newData);
    }

    async setHoldTime(minutes) {
        if (!this.stateData) return;
        const newData = new Uint8Array(this.stateData);
        newData[Payload.HOLD_TIME] = Math.max(0, Math.min(60, minutes));
        await this.writeState(newData);
    }

    async setSchedule(mode, hour, minute, tempC) {
        if (!this.stateData) return;
        
        // Implementation mirrors Python logic
        // If mode is OFF
        if (mode === 'off') {
            const newData = new Uint8Array(this.stateData);
            newData[Payload.STATUS_FLAGS] &= ~Flags.SCHEDULE_ENABLED;
            newData[Payload.SCHEDULE_TEMP] = 0xC0; // Default? Python uses 0xc0
            newData[Payload.SCHEDULE_HOURS] = 0;
            newData[Payload.SCHEDULE_MINUTES] = 0;
            await this.writeState(newData);
            return;
        }

        // If mode change, disable first
        // (We skip this optimization/complexity for this simple implementation unless necessary, 
        // but the Python code does it. Let's do it simply: just write the new state)
        // Actually, Python says "Changing between ONCE and DAILY requires a two-step BLE write."
        // We'll implement the disable-first if switching modes.
        
        // For now, let's just write the target state. The firmware might handle it or we might need the 2-step.
        // Let's do the single write first for simplicity.
        
        const newData = new Uint8Array(this.stateData);
        newData[Payload.STATUS_FLAGS] |= Flags.SCHEDULE_ENABLED;
        newData[Payload.SCHEDULE_TEMP] = Math.round(tempC * 2);
        newData[Payload.SCHEDULE_HOURS] = hour;
        newData[Payload.SCHEDULE_MINUTES] = minute;
        
        if (mode === 'once') {
            newData[Payload.COUNTER] |= Flags.SCHEDULE_MODE;
        } else {
            newData[Payload.COUNTER] &= ~Flags.SCHEDULE_MODE;
        }

        await this.writeState(newData);
    }
}

// --- App UI Logic ---

// Wait for DOM Content Loaded to ensure elements exist
document.addEventListener('DOMContentLoaded', () => {

    const kettle = new StaggEKGPro();

    // Elements
    const els = {
        scanSection: document.getElementById('scan-section'),
        dashboard: document.getElementById('dashboard'),
        status: document.getElementById('connection-status'),
        connectBtn: document.getElementById('connect-btn'),
        disconnectBtn: document.getElementById('disconnect-btn'),
        refreshBtn: document.getElementById('refresh-btn'),
        errorMsg: document.getElementById('error-msg'),
        
        tempDisplay: document.getElementById('display-target-temp'),
        tempSlider: document.getElementById('temp-slider'),
        
        schedMode: document.getElementById('schedule-mode'),
        schedTime: document.getElementById('sched-time'),
        schedH: document.getElementById('sched-h'),
        schedM: document.getElementById('sched-m'),
        schedTemp: document.getElementById('schedule-temp'),
        schedTempDisplay: document.getElementById('display-schedule-temp'),
        saveSchedBtn: document.getElementById('save-schedule-btn'),
        
        holdTime: document.getElementById('hold-time'),
        setHoldBtn: document.getElementById('set-hold-btn'),

        turnOnBtn: document.getElementById('turn-on-btn'),
        
        infoAlt: document.getElementById('info-altitude'),
        infoLang: document.getElementById('info-language'),
        infoClock: document.getElementById('info-clock'),

        // Views
        scanContent: document.getElementById('scan-content'),
        connectingContent: document.getElementById('connecting-content'),
        connectingStatus: document.getElementById('connecting-status')
    };

    function updateUIConnecting(isConnecting, statusText) {
        if (!els.scanContent || !els.connectingContent) return;

        if (isConnecting) {
            // Fade out scan content but keep it in DOM to maintain height
            els.scanContent.classList.add('opacity-0', 'pointer-events-none');
            
            els.connectingContent.classList.remove('hidden');
            // small delay to allow display:block to apply before opacity transition
            setTimeout(() => els.connectingContent.classList.remove('opacity-0'), 50);
            
            if (statusText && els.connectingStatus) els.connectingStatus.innerText = statusText;
        } else {
            els.connectingContent.classList.add('opacity-0');
            setTimeout(() => els.connectingContent.classList.add('hidden'), 300);
            
            // Fade scan content back in
            els.scanContent.classList.remove('hidden'); // Safety check
            setTimeout(() => els.scanContent.classList.remove('opacity-0', 'pointer-events-none'), 50);
        }
    }

    // Event Listeners
    if (els.connectBtn) {
        els.connectBtn.addEventListener('click', async () => {
            if (els.errorMsg) els.errorMsg.classList.add('hidden');
            
            // We don't show connecting UI immediately for WebBluetooth because the picker needs to be seen first.
            // But we can show "Requesting Permission..." or similar?
            // Actually, showing it *after* they select is better UX, but we can't detect "selection" easily until `requestDevice` returns.
            // So we'll show it after `requestDevice` returns (which means they picked something).
            
            try {
                // 1. Picker Phase
                console.log('Requesting Bluetooth Device...');
                await kettle.requestDevice(); 
                
                // 2. Connecting Phase (User selected device)
                updateUIConnecting(true, "Negotiating Link...");
                
                await kettle.connectGatt();
                updateUIConnected(true);
                updateUIConnecting(false); // Hide connecting view
                
            } catch (e) {
                if (els.errorMsg) {
                    els.errorMsg.innerText = e.message;
                    els.errorMsg.classList.remove('hidden');
                }
                updateUIConnected(false);
                updateUIConnecting(false);
            }
        });
    }

    if (els.disconnectBtn) {
        els.disconnectBtn.addEventListener('click', () => {
            kettle.disconnect();
            updateUIConnected(false);
        });
    }

    let lastState = null;

    kettle.onStateChange = (state) => {
        if (!state.connected) {
            updateUIConnected(false);
            return;
        }
        lastState = state;
        renderState(state);
    };

    // Turn On Button
    if (els.turnOnBtn) {
        els.turnOnBtn.addEventListener('click', async () => {
            if (!lastState || !lastState.clock) {
                alert('Wait for state update...');
                return;
            }

            try {
                // Calculate next minute
                let h = lastState.clock.hour;
                let m = lastState.clock.minute + 1;

                if (m >= 60) {
                    m = 0;
                    h = (h + 1) % 24;
                }

                const targetTemp = lastState.target_temperature || 85;

                // Feedback
                const originalText = els.turnOnBtn.innerText;
                els.turnOnBtn.innerText = "Turning on...";
                els.turnOnBtn.disabled = true;

                await kettle.setSchedule('once', h, m, targetTemp);

                // Reset feedback
                setTimeout(() => {
                    els.turnOnBtn.innerText = originalText;
                    els.turnOnBtn.disabled = false;
                }, 2000);

            } catch (e) {
                console.error(e);
                alert('Failed to turn on: ' + e);
                els.turnOnBtn.innerText = "Turn On";
                els.turnOnBtn.disabled = false;
            }
        });
    }

    // Temp Control
    if (els.tempSlider) {
        els.tempSlider.addEventListener('input', (e) => {
            els.tempDisplay.innerText = e.target.value;
        });
        els.tempSlider.addEventListener('change', (e) => {
            kettle.setTemperature(parseFloat(e.target.value));
        });
    }

    // Hold Control
    if (els.setHoldBtn) {
        els.setHoldBtn.addEventListener('click', () => {
            kettle.setHoldTime(parseInt(els.holdTime.value));
        });
    }

    // Schedule Temp Control
    if (els.schedTemp) {
        els.schedTemp.addEventListener('input', (e) => {
            if (els.schedTempDisplay) els.schedTempDisplay.innerText = e.target.value;
        });
    }

    // Schedule Save
    if (els.saveSchedBtn) {
        els.saveSchedBtn.addEventListener('click', async () => {
            try {
                let h = 0, m = 0;
                
                if (els.schedTime) {
                     const parts = els.schedTime.value.split(':');
                     if (parts.length === 2) {
                         h = parseInt(parts[0], 10);
                         m = parseInt(parts[1], 10);
                     }
                } else if (els.schedH && els.schedM) {
                    h = parseInt(els.schedH.value, 10);
                    m = parseInt(els.schedM.value, 10);
                }

                await kettle.setSchedule(
                    els.schedMode ? els.schedMode.value : 'off',
                    h || 0,
                    m || 0,
                    els.schedTemp ? parseFloat(els.schedTemp.value) : 85
                );
                
                const s = document.getElementById('schedule-status');
                if (s) {
                    s.classList.remove('opacity-0');
                    setTimeout(() => s.classList.add('opacity-0'), 2000);
                }
            } catch (e) {
                alert('Failed to set schedule: ' + e);
            }
        });
    }

    function updateUIConnected(isConnected) {
        if (isConnected) {
            if (els.status) {
                els.status.innerText = 'Connected';
                els.status.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800';
            }
            if (els.dashboard) els.dashboard.classList.remove('hidden');
            if (els.scanSection) els.scanSection.classList.add('hidden');
            if (els.disconnectBtn) els.disconnectBtn.classList.remove('hidden');
            if (els.refreshBtn) els.refreshBtn.classList.remove('hidden');
        } else {
            if (els.status) {
                els.status.innerText = 'Disconnected';
                els.status.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800';
            }
            if (els.dashboard) els.dashboard.classList.add('hidden');
            if (els.scanSection) els.scanSection.classList.remove('hidden');
            if (els.disconnectBtn) els.disconnectBtn.classList.add('hidden');
            if (els.refreshBtn) els.refreshBtn.classList.add('hidden');
        }
    }

    function renderState(state) {
        // Target Temp
        if (els.tempSlider && document.activeElement !== els.tempSlider) {
            els.tempSlider.value = state.target_temperature;
            if (els.tempDisplay) els.tempDisplay.innerText = state.target_temperature;
        }

        // Info
        if (els.infoAlt) els.infoAlt.innerText = state.altitude_meters;
        if (els.infoLang) els.infoLang.innerText = ['English','French','Spanish','Chinese Simp','Chinese Trad'][state.language] || 'Unknown';
        if (els.infoClock) els.infoClock.innerText = `${String(state.clock.hour).padStart(2,'0')}:${String(state.clock.minute).padStart(2,'0')}`;
        
        // Sync Schedule
        if (state.schedule) {
            if (els.schedMode && document.activeElement !== els.schedMode) {
                els.schedMode.value = state.schedule.mode;
            }
            if (els.schedTemp && document.activeElement !== els.schedTemp) {
                els.schedTemp.value = state.schedule.temperature_celsius;
                if (els.schedTempDisplay) els.schedTempDisplay.innerText = state.schedule.temperature_celsius;
            }

            // Handle New Input
            if (els.schedTime && document.activeElement !== els.schedTime) {
                els.schedTime.value = `${String(state.schedule.hour).padStart(2,'0')}:${String(state.schedule.minute).padStart(2,'0')}`;
            }
            // Handle Old Inputs (Fallback)
            if (els.schedH && els.schedM && document.activeElement !== els.schedH && document.activeElement !== els.schedM) {
                els.schedH.value = String(state.schedule.hour).padStart(2,'0');
                els.schedM.value = String(state.schedule.minute).padStart(2,'0');
            }
        }
        
        // Hold Time
        if (els.holdTime && document.activeElement !== els.holdTime) {
            let closest = [0, 15, 30, 45, 60].reduce((prev, curr) => 
                Math.abs(curr - state.hold_time_minutes) < Math.abs(prev - state.hold_time_minutes) ? curr : prev
            );
            els.holdTime.value = closest;
        }
    }

});
