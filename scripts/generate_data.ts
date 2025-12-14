
import fs from 'fs';
import path from 'path';

// --- DATA DEFINITIONS ---

const SECTORS: Record<string, { devices: string[], manufacturers: string[] }> = {
    manufacturing: {
        devices: ["CNC Machine", "PLC Controller", "Robotic Arm", "Industrial Gateway", "Conveyor Sensor", "HVAC Controller"],
        manufacturers: ["Siemens", "Rockwell", "Fanuc", "Schneider Electric"]
    },
    bfsi: {
        devices: ["ATM Controller", "Video Surveillance", "Biometric Scanner", "Cash Recycler", "Branch Router"],
        manufacturers: ["NCR", "Diebold", "Hikvision", "Cisco"]
    },
    retail: {
        devices: ["POS Terminal", "Self-Checkout Kiosk", "Digital Signage", "Inventory Scanner", "Smart Shelf"],
        manufacturers: ["Toshiba", "Zebra", "Samsung", "Verifone"]
    },
    healthcare: {
        devices: ["MRI Scanner", "Infusion Pump", "Patient Monitor", "X-Ray Machine", "Lab Analyzer"],
        manufacturers: ["GE Healthcare", "Philips", "Medtronic", "Drager"]
    },
    logistics: {
        devices: ["RFID Reader", "Automated Forklift", "Barcode Scanner", "Fleet Tracker", "Sorting Machine"],
        manufacturers: ["Honeywell", "Zebra", "Toyota", "Cognex"]
    },
    it: {
        devices: ["Server Rack", "Network Switch", "Wifi Access Point", "Smart UPS", "Conference Room Hub"],
        manufacturers: ["Dell", "Cisco", "Aruba", "APC"]
    },
    infra: {
        devices: ["Smart Meter", "Traffic Controller", "Water Pump SCADA", "Building Management System", "Elevator Control"],
        manufacturers: ["Honeywell", "Johnson Controls", "Siemens", "Otis"]
    },
    other: {
        devices: ["Smart Thermostat", "Security Camera", "Access Control", "Printer", "VoIP Phone"],
        manufacturers: ["Nest", "Ring", "HID", "HP", "Polycom"]
    }
};

const HEADERS = "DeviceID,DeviceType,Manufacturer,Model,FirmwareVersion,LastPatched,Location,NetworkSegment,AuthMethod,Encryption,OpenPorts,TrafficAnomaly,Criticality,Status,RiskFactor";

function generateCSV(industry: string, state: "critical" | "safe"): string {
    const config = SECTORS[industry] || SECTORS.other;
    const count = 50; // Lots of data
    let rows: string[] = [HEADERS];

    for (let i = 0; i < count; i++) {
        const id = `${industry.toUpperCase().slice(0, 3)}-${1000 + i}`;
        const type = config.devices[Math.floor(Math.random() * config.devices.length)];
        const manufacturer = config.manufacturers[Math.floor(Math.random() * config.manufacturers.length)];
        const model = `Model-${['X', 'Y', 'Z'][Math.floor(Math.random() * 3)]}${Math.floor(Math.random() * 100)}`;
        const firmware = `v${Math.floor(Math.random() * 5)}.${Math.floor(Math.random() * 10)}`;
        const location = `Zone-${Math.floor(i / 10) + 1}`;

        // Critical vs Safe Logic
        let lastPatched, network, auth, encryption, ports, anomaly, criticality, status, risk;

        if (state === "critical" && i < 15) { // 30% Critical Items
            lastPatched = "2021-01-01"; // Old
            network = i % 2 === 0 ? "Public-Wifi" : "Corporate-LAN";
            auth = "DefaultPassword";
            encryption = "None";
            ports = "23, 80, 445"; // Telnet open
            anomaly = "High Outbound";
            criticality = "Critical";
            status = "Compromised";
            risk = "AuthWeakness";
        } else if (state === "critical" && i < 25) { // Another 20% High Risk
            lastPatched = "2022-05-15";
            network = "VLAN-10";
            auth = "WeakPassword";
            encryption = "WEP";
            ports = "80";
            anomaly = "None";
            criticality = "High";
            status = "Warning";
            risk = "VulnerableFirmware";
        } else { // Safe Items
            lastPatched = new Date().toISOString().split('T')[0];
            network = "Secure-VLAN";
            auth = "MFA/Cert";
            encryption = "AES-256";
            ports = "443";
            anomaly = "None";
            criticality = "Low";
            status = "Active";
            risk = "None";
        }

        // CSV Escape
        const row = [
            id, type, manufacturer, model, firmware, lastPatched, location, network, auth, encryption, `"${ports}"`, anomaly, criticality, status, risk
        ].join(",");
        rows.push(row);
    }

    return rows.join("\n");
}

async function main() {
    const outputDir = path.join(process.cwd(), 'public', 'data');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    const industries = ["manufacturing", "bfsi", "retail", "healthcare", "logistics", "it", "infra", "other"];

    for (const ind of industries) {
        // Critical
        const critCsv = generateCSV(ind, "critical");
        fs.writeFileSync(path.join(outputDir, `${ind}_critical.csv`), critCsv);
        console.log(`Generated ${ind}_critical.csv`);

        // Safe
        const safeCsv = generateCSV(ind, "safe");
        fs.writeFileSync(path.join(outputDir, `${ind}_safe.csv`), safeCsv);
        console.log(`Generated ${ind}_safe.csv`);
    }
}

main();
