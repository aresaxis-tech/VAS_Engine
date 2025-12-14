const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Configuration
const PORT = 8080;
const DEVICE_COUNT = 50;
const PUSH_INTERVAL_MS = 2000;

// State
let currentMode = 'DANGER'; // 'DANGER' or 'SAFE'

// Setup Keyboard Input
const readline = require('readline');
readline.emitKeypressEvents(process.stdin);
if (process.stdin.isTTY) process.stdin.setRawMode(true);

process.stdin.on('keypress', (str, key) => {
    if (key.ctrl && key.name === 'c') {
        process.exit();
    }
    if (key.name === 's') {
        currentMode = 'SAFE';
        console.log('\n\n🟢 SWITCHING TO SAFE MODE... all systems generating normal telemetry.\n');
    }
    if (key.name === 'd') {
        currentMode = 'DANGER';
        console.log('\n\n🔴 SWITCHING TO DANGER MODE... injecting critical vulnerabilities.\n');
    }
});

console.clear();
console.log('\x1b[36m%s\x1b[0m', '🛡️  ICICI Lombard Cyber-Shield Agent v1.3.0 PRO');
console.log('\x1b[32m%s\x1b[0m', 'Initializing Interactive Edge Connection...');
console.log('--------------------------------------------------');
console.log('🎮  CONTROL CENTER:');
console.log('    Press [S] for SAFE MODE (Green)');
console.log('    Press [D] for DANGER MODE (Red)');
console.log('    Press [Ctrl+C] to Exit');
console.log('--------------------------------------------------');

// Create WebSocket Server
const wss = new WebSocket.Server({ port: PORT });

console.log(`\n✅ Agent Active on port ${PORT}`);
console.log(`Waiting for dashboard connection...`);

// Mock Device Database
const DEVICE_TYPES = ['Smart Thermostat', 'IPC Camera', 'Access Point', 'Industrial PLC', 'Badge Reader'];

function generateTelemetry() {
    const devices = [];
    for (let i = 0; i < DEVICE_COUNT; i++) {
        // Mode Check
        if (currentMode === 'SAFE') {
            // SAFE MODE: All devices are clean
            devices.push({
                DeviceID: `IOT-${1000 + i}`,
                DeviceType: DEVICE_TYPES[Math.floor(Math.random() * DEVICE_TYPES.length)],
                Status: "Online",
                Criticality: "Standard",
                RiskFactor: "None",
                AuthMethod: "WPA2-Enterprise",
                LastPatched: "2024-12-01",
                NetworkSegment: "Corporate-IoT-VLAN"
            });
            continue;
        }

        // DANGER MODE Logic
        // STABLE DEMO: Fixed 5 Critical Devices to prevent UI flickering
        const isTargetedRisk = i < 5;

        devices.push({
            DeviceID: `IOT-${1000 + i}`,
            DeviceType: isTargetedRisk ? "IPC Camera (Entrance)" : DEVICE_TYPES[Math.floor(Math.random() * DEVICE_TYPES.length)],
            Status: Math.random() > 0.1 ? "Online" : "Offline",
            Criticality: isTargetedRisk ? "Critical" : "Standard",
            // Targeted risks get specific vulnerabilities. Others are perfectly safe.
            RiskFactor: isTargetedRisk ? (i % 2 === 0 ? "AuthWeakness" : "VulnerableFirmware") : "None",
            AuthMethod: isTargetedRisk ? "DefaultPassword" : "WPA2-Enterprise",
            LastPatched: isTargetedRisk ? "2023-01-15" : "2024-12-01",
            NetworkSegment: "Corporate-IoT-VLAN"
        });
    }
    return devices;
}

wss.on('connection', function connection(ws) {
    console.log('\n🔗 Dashboard Connected!');
    console.log(`Stream Status: ACTIVE [Mode: ${currentMode}]`);

    // Send initial handshake
    ws.send(JSON.stringify({ type: 'HANDSHAKE', status: 'AUTHORIZED', agentId: 'EDGE-01' }));

    // Stream Loop
    const interval = setInterval(() => {
        const telemetry = generateTelemetry();
        const payload = {
            type: 'TELEMETRY_UPDATE',
            timestamp: new Date().toISOString(),
            deviceCount: DEVICE_COUNT,
            data: telemetry
        };

        ws.send(JSON.stringify(payload));
        process.stdout.write(`\r📡 Streaming | Mode: ${currentMode === 'DANGER' ? '🔴 DANGER' : '🟢 SAFE  '} | Packets: ${telemetry.length} `);
    }, PUSH_INTERVAL_MS);

    ws.on('close', () => {
        console.log('\n❌ Dashboard Disconnected');
        clearInterval(interval);
    });
});
