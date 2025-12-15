// State
let currentAddress = null;

// --- Lifecycle ---

document.addEventListener('DOMContentLoaded', () => {
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
});

function renderSavedDevice(device) {
    const scanSection = document.getElementById('scan-section');
    const results = document.getElementById('scan-results');
    
    // Clear previous results or scan prompt
    results.innerHTML = ''; 
    
    const row = document.createElement('div');
    row.className = 'flex justify-between items-center bg-blue-50 p-3 rounded border border-blue-200 mb-4';
    row.innerHTML = `
        <div>
            <div class="font-bold text-blue-800">📌 Saved: ${device.name || 'Unknown Device'}</div>
            <div class="text-xs text-blue-600">${device.address}</div>
        </div>
        <div class="flex items-center gap-2">
            <button onclick="forgetDevice()" class="text-gray-500 hover:text-red-600 text-sm px-2">
                Forget
            </button>
            <button onclick="connect('${device.address}')" class="bg-blue-600 text-white hover:bg-blue-700 px-4 py-1.5 rounded text-sm font-semibold shadow-sm">
                Reconnect
            </button>
        </div>
    `;
    
    // Insert before the scan button or list
    // Actually, let's just put it in the results area
    results.appendChild(row);
}

function forgetDevice() {
    localStorage.removeItem('savedDevice');
    document.getElementById('scan-results').innerHTML = '';
}

// --- API Calls ---

async function fetchJson(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Request failed');
    }
    return res.json();
}

async function scanDevices() {
    const list = document.getElementById('scan-results');
    const loader = document.getElementById('loading-scan');
    
    // Don't clear if we have a saved device shown? 
    // Usually user wants to scan for *new* devices if they click scan.
    list.innerHTML = '';
    loader.classList.remove('hidden');
    
    try {
        const res = await fetch('/api/scan');
        const devices = await res.json();
        
        loader.classList.add('hidden');
        
        if (devices.length === 0) {
            list.innerHTML = '<div class="text-gray-500">No devices found.</div>';
            return;
        }

        devices.forEach(d => {
            const row = document.createElement('div');
            row.className = 'flex justify-between items-center bg-gray-50 p-3 rounded border hover:bg-gray-100 transition';
            row.innerHTML = `
                <div>
                    <div class="font-bold">${d.name || 'Unknown Device'}</div>
                    <div class="text-xs text-gray-500">${d.address}</div>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-xs text-gray-400">RSSI: ${d.rssi}</span>
                    <button onclick="connect('${d.address}', '${d.name || ''}')" class="bg-blue-100 text-blue-700 hover:bg-blue-200 px-3 py-1 rounded text-sm font-semibold">
                        Connect
                    </button>
                </div>
            `;
            list.appendChild(row);
        });

    } catch (e) {
        loader.classList.add('hidden');
        alert('Scan failed: ' + e.message);
    }
}

async function connect(address, name) {
    try {
        document.getElementById('connection-status').innerText = 'Connecting...';
        document.getElementById('connection-status').className = 'px-3 py-1 rounded-full text-sm font-semibold bg-yellow-100 text-yellow-800';
        
        await fetch('/api/connect', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({address})
        });
        
        currentAddress = address;
        
        // Save to local storage
        localStorage.setItem('savedDevice', JSON.stringify({
            address: address,
            name: name || 'Saved Device' // We might not have name if reconnecting blindly, that's ok
        }));

        updateConnectionUI(true);
        fetchState();
        
    } catch (e) {
        alert('Connection failed: ' + e);
        updateConnectionUI(false);
        
        // If failed, re-render saved device so user can try again
        const saved = localStorage.getItem('savedDevice');
        if (saved) renderSavedDevice(JSON.parse(saved));
    }
}

async function disconnect() {
    try {
        await fetch('/api/disconnect', {method: 'POST'});
    } catch(e) { console.error(e); }
    
    updateConnectionUI(false);
    
    // Show saved device option again
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
    const mode = document.getElementById('schedule-mode').value;
    const timeStr = document.getElementById('sched-time').value;
    const temp = document.getElementById('schedule-temp').value;
    
    const [hStr, mStr] = timeStr.split(':');
    const hour = parseInt(hStr || 0, 10);
    const minute = parseInt(mStr || 0, 10);

    try {
        await fetch('/api/schedule', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({
                mode: mode,
                hour: hour,
                minute: minute,
                temperature: parseFloat(temp)
            })
        });
        
        // Show success message
        const statusEl = document.getElementById('schedule-status');
        statusEl.classList.remove('opacity-0');
        setTimeout(() => {
            statusEl.classList.add('opacity-0');
        }, 2000);
        
        fetchState();
    } catch (e) { alert(e); }
}

// --- UI Helpers ---

function updateConnectionUI(connected) {
    const statusBadge = document.getElementById('connection-status');
    const dashboard = document.getElementById('dashboard');
    const scanSection = document.getElementById('scan-section');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const refreshBtn = document.getElementById('refresh-btn');

    if (connected) {
        statusBadge.innerText = 'Connected';
        statusBadge.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800';
        dashboard.classList.remove('hidden');
        scanSection.classList.add('hidden'); // Hide scan area to clean up UI
        disconnectBtn.classList.remove('hidden');
        refreshBtn.classList.remove('hidden');
        
        // Better: Show Disconnect button, hide Scan button?
        // For now, simple logic:
        document.getElementById('scan-results').innerHTML = ''; // Clear results
    } else {
        statusBadge.innerText = 'Disconnected';
        statusBadge.className = 'px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800';
        dashboard.classList.add('hidden');
        scanSection.classList.remove('hidden');
        disconnectBtn.classList.add('hidden');
        refreshBtn.classList.add('hidden');
        currentAddress = null;
    }
}

function updateTempDisplay(val) {
    document.getElementById('display-target-temp').innerText = val;
}

function renderState(state) {
    // Target Temp
    if (document.activeElement.id !== 'temp-slider') {
        document.getElementById('temp-slider').value = state.target_temperature;
        updateTempDisplay(state.target_temperature);
    }

    // Schedule
    if (state.schedule) {
        // simple logic to avoid overwriting user input while editing?
        // For now, just overwrite
        if (document.activeElement.id !== 'schedule-mode' && 
            document.activeElement.id !== 'sched-time' && 
            document.activeElement.id !== 'schedule-temp') {
                
            document.getElementById('schedule-mode').value = state.schedule.mode;
            
            const h = String(state.schedule.hour).padStart(2, '0');
            const m = String(state.schedule.minute).padStart(2, '0');
            document.getElementById('sched-time').value = `${h}:${m}`;
            
            document.getElementById('schedule-temp').value = state.schedule.temperature_celsius;
        }
    }

    // Hold Time
    if (document.activeElement.id !== 'hold-time') {
        document.getElementById('hold-time').value = state.hold_time_minutes;
    }

    // Info
    document.getElementById('info-altitude').innerText = state.altitude_meters;
    document.getElementById('info-language').innerText = state.language;
    document.getElementById('info-clock').innerText = state.clock_time;
}
