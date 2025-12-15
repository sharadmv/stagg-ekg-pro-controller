// State
let currentAddress = null;

// --- Lifecycle ---

document.addEventListener('DOMContentLoaded', () => {
    // Restore Saved Device
    const saved = localStorage.getItem('savedDevice');
    if (saved) {
        try {
            const device = JSON.parse(saved);
            renderSavedDevice(device);
        } catch (e) {
            console.error("Error parsing saved device", e);
            localStorage.removeItem('savedDevice');
        }
    }

    // Attach Listeners to Elements
    const els = {
        connectBtn: document.getElementById('connect-btn'),
        disconnectBtn: document.getElementById('disconnect-btn'),
        refreshBtn: document.getElementById('refresh-btn'),
        tempSlider: document.getElementById('temp-slider'),
        saveSchedBtn: document.getElementById('save-schedule-btn'),
        setHoldBtn: document.getElementById('set-hold-btn'),
        schedTemp: document.getElementById('schedule-temp'),
        schedTempDisplay: document.getElementById('display-schedule-temp')
    };

    if (els.connectBtn) els.connectBtn.addEventListener('click', scanDevices);
    if (els.disconnectBtn) els.disconnectBtn.addEventListener('click', disconnect);
    if (els.refreshBtn) els.refreshBtn.addEventListener('click', fetchState);

    if (els.tempSlider) {
        els.tempSlider.addEventListener('input', (e) => updateTempDisplay(e.target.value));
        els.tempSlider.addEventListener('change', (e) => setTemperature(e.target.value));
    }
    
    if (els.schedTemp && els.schedTempDisplay) {
         els.schedTemp.addEventListener('input', (e) => els.schedTempDisplay.innerText = e.target.value);
    }

    if (els.saveSchedBtn) els.saveSchedBtn.addEventListener('click', saveSchedule);
    if (els.setHoldBtn) els.setHoldBtn.addEventListener('click', setHold);
});

function renderSavedDevice(device) {
    const results = document.getElementById('scan-results');
    // We append to results or clear it
    if (!results) return;
    
    results.innerHTML = '';
    
    const row = document.createElement('div');
    row.className = 'flex justify-between items-center bg-zinc-800 p-3 rounded-xl border border-zinc-700/50 mb-4';
    row.innerHTML = `
        <div class="flex items-center gap-3">
             <div class="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-xs">📌</div>
             <div>
                <div class="font-bold text-sm text-zinc-200">${device.name || 'Saved Device'}</div>
                <div class="text-[10px] text-zinc-500 font-mono">${device.address}</div>
             </div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="forgetDevice()" class="text-zinc-500 hover:text-red-400 text-xs px-2 py-1 transition-colors">
                Forget
            </button>
            <button onclick="connect('${device.address}', '${device.name || ''}')" class="bg-blue-600 text-white hover:bg-blue-500 px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-lg shadow-blue-500/20">
                Connect
            </button>
        </div>
    `;
    
    results.appendChild(row);
}

function forgetDevice() {
    localStorage.removeItem('savedDevice');
    const results = document.getElementById('scan-results');
    if (results) results.innerHTML = '';
}

// --- API Calls ---

async function scanDevices() {
    const list = document.getElementById('scan-results');
    const loader = document.getElementById('loading-scan');
    
    if (list) list.innerHTML = '';
    if (loader) loader.classList.remove('hidden');
    
    try {
        const res = await fetch('/api/scan');
        const devices = await res.json();
        
        if (loader) loader.classList.add('hidden');
        
        if (devices.length === 0) {
            if (list) list.innerHTML = '<div class="text-zinc-500 text-xs text-center py-2">No devices found.</div>';
            return;
        }

        devices.forEach(d => {
            const row = document.createElement('div');
            row.className = 'flex justify-between items-center bg-zinc-800/50 p-3 rounded-xl border border-zinc-700/50 hover:bg-zinc-800 transition mb-2';
            row.innerHTML = `
                <div>
                    <div class="font-bold text-sm text-zinc-200">${d.name || 'Unknown Device'}</div>
                    <div class="text-[10px] text-zinc-500 font-mono">${d.address}</div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-[10px] text-zinc-600 font-mono">RSSI: ${d.rssi}</span>
                    <button onclick="connect('${d.address}', '${d.name || ''}')" class="bg-zinc-100 text-black hover:bg-zinc-200 px-3 py-1.5 rounded-lg text-xs font-bold transition">
                        Connect
                    </button>
                </div>
            `;
            list.appendChild(row);
        });

    } catch (e) {
        if (loader) loader.classList.add('hidden');
        alert('Scan failed: ' + e.message);
    }
}

async function connect(address, name) {
    try {
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.innerText = 'Connecting...';
            // Visuals handled by observer in HTML
        }
        
        await fetch('/api/connect', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({address})
        });
        
        currentAddress = address;
        
        localStorage.setItem('savedDevice', JSON.stringify({
            address: address,
            name: name || 'Saved Device'
        }));

        updateConnectionUI(true);
        fetchState();
        
    } catch (e) {
        alert('Connection failed: ' + e);
        updateConnectionUI(false);
        const saved = localStorage.getItem('savedDevice');
        if (saved) renderSavedDevice(JSON.parse(saved));
    }
}

async function disconnect() {
    try {
        await fetch('/api/disconnect', {method: 'POST'});
    } catch(e) { console.error(e); }
    
    updateConnectionUI(false);
    
    const saved = localStorage.getItem('savedDevice');
    if (saved) renderSavedDevice(JSON.parse(saved));
}

async function fetchState() {
    try {
        const res = await fetch('/api/state');
        const state = await res.json();
        
        if (!state.connected) {
            if (currentAddress) {
                console.warn("Lost connection");
                disconnect(); 
            }
            return;
        }
        
        renderState(state);
    } catch (e) {
        console.error("Error fetching state", e);
    }
}

async function setTemperature(val) {
    try {
        await fetch('/api/temperature', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({temperature: parseFloat(val)})
        });
        fetchState();
    } catch (e) { alert(e); }
}

async function setHold() {
    const val = document.getElementById('hold-time').value;
    try {
        await fetch('/api/hold', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({minutes: parseInt(val)})
        });
        fetchState();
    } catch (e) { alert(e); }
}

async function saveSchedule() {
    const mode = document.getElementById('schedule-mode');
    const time = document.getElementById('sched-time');
    const hInput = document.getElementById('sched-h'); // Legacy support
    const mInput = document.getElementById('sched-m'); // Legacy support
    const temp = document.getElementById('schedule-temp');
    
    let hour = 0, minute = 0;

    if (time) {
        const [h, m] = time.value.split(':').map(Number);
        hour = h || 0;
        minute = m || 0;
    } else if (hInput && mInput) {
        hour = parseInt(hInput.value, 10);
        minute = parseInt(mInput.value, 10);
    }

    try {
        await fetch('/api/schedule', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                mode: mode ? mode.value : 'off',
                hour: hour,
                minute: minute,
                temperature: temp ? parseFloat(temp.value) : 85
            })
        });
        
        const statusEl = document.getElementById('schedule-status');
        if (statusEl) {
            statusEl.classList.remove('opacity-0');
            setTimeout(() => {
                statusEl.classList.add('opacity-0');
            }, 2000);
        }
        
        fetchState();
    } catch (e) { alert(e); }
}

// --- UI Helpers ---

const els = {
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
        setTimeout(() => els.connectingContent.classList.remove('opacity-0'), 50);
        
        if (statusText && els.connectingStatus) els.connectingStatus.innerText = statusText;
    } else {
        els.connectingContent.classList.add('opacity-0');
        setTimeout(() => els.connectingContent.classList.add('hidden'), 300);
        
        els.scanContent.classList.remove('hidden');
        setTimeout(() => els.scanContent.classList.remove('opacity-0', 'pointer-events-none'), 50);
    }
}

function updateConnectionUI(connected) {
    const statusEl = document.getElementById('connection-status');
    // ... existing ...
    const dashboard = document.getElementById('dashboard');
    const scanSection = document.getElementById('scan-section');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const refreshBtn = document.getElementById('refresh-btn');

    if (connected) {
        if (statusEl) statusEl.innerText = 'Connected';
        if (dashboard) dashboard.classList.remove('hidden');
        if (scanSection) scanSection.classList.add('hidden');
        if (disconnectBtn) disconnectBtn.classList.remove('hidden');
        if (refreshBtn) refreshBtn.classList.remove('hidden');
        
        const scanRes = document.getElementById('scan-results');
        if (scanRes) scanRes.innerHTML = ''; 
    } else {
        if (statusEl) statusEl.innerText = 'Disconnected';
        if (dashboard) dashboard.classList.add('hidden');
        if (scanSection) scanSection.classList.remove('hidden');
        if (disconnectBtn) disconnectBtn.classList.add('hidden');
        if (refreshBtn) refreshBtn.classList.add('hidden');
        currentAddress = null;
    }
}

// ...

async function connect(address, name) {
    try {
        updateUIConnecting(true, "Handshaking with Device...");
        
        const statusEl = document.getElementById('connection-status');
        if (statusEl) {
            statusEl.innerText = 'Connecting...';
        }
        
        await fetch('/api/connect', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({address})
        });
        
        currentAddress = address;
        
        localStorage.setItem('savedDevice', JSON.stringify({
            address: address,
            name: name || 'Saved Device'
        }));

        updateConnectionUI(true);
        updateUIConnecting(false);
        fetchState();
        
    } catch (e) {
        alert('Connection failed: ' + e);
        updateConnectionUI(false);
        updateUIConnecting(false);
        const saved = localStorage.getItem('savedDevice');
        if (saved) renderSavedDevice(JSON.parse(saved));
    }
}

function renderState(state) {
    // Target Temp
    const slider = document.getElementById('temp-slider');
    if (slider && document.activeElement.id !== 'temp-slider') {
        slider.value = state.target_temperature;
        updateTempDisplay(state.target_temperature);
    }

    // Schedule
    if (state.schedule) {
        const mode = document.getElementById('schedule-mode');
        const time = document.getElementById('sched-time');
        const hInput = document.getElementById('sched-h');
        const mInput = document.getElementById('sched-m');
        const temp = document.getElementById('schedule-temp');

        if (mode && document.activeElement.id !== 'schedule-mode') {
            mode.value = state.schedule.mode;
        }

        // Time (New)
        if (time && document.activeElement.id !== 'sched-time') {
            const h = String(state.schedule.hour).padStart(2, '0');
            const m = String(state.schedule.minute).padStart(2, '0');
            time.value = `${h}:${m}`;
        }
        
        // Time (Legacy Fallback)
        if (hInput && mInput && 
            document.activeElement.id !== 'sched-h' && 
            document.activeElement.id !== 'sched-m') {
            hInput.value = String(state.schedule.hour).padStart(2, '0');
            mInput.value = String(state.schedule.minute).padStart(2, '0');
        }

        // Temp
        if (temp && document.activeElement.id !== 'schedule-temp') {
            temp.value = state.schedule.temperature_celsius;
            const display = document.getElementById('display-schedule-temp');
            if (display) display.innerText = state.schedule.temperature_celsius;
        }
    }

    // Hold Time
    const hold = document.getElementById('hold-time');
    if (hold && document.activeElement.id !== 'hold-time') {
        hold.value = state.hold_time_minutes;
    }

    // Info
    const alt = document.getElementById('info-altitude');
    if (alt) alt.innerText = state.altitude_meters;
    
    const lang = document.getElementById('info-language');
    if (lang) lang.innerText = state.language;
    
    const clock = document.getElementById('info-clock');
    if (clock) clock.innerText = state.clock_time;
}