import Papa from "papaparse";

export interface IoTDevice {
    DeviceID: string;
    DeviceType: string;
    Manufacturer: string;
    Model: string;
    FirmwareVersion: string;
    LastPatched: string;
    Location: string;
    NetworkSegment: string;
    AuthMethod: string;
    Encryption: string;
    OpenPorts: string;
    TrafficAnomaly: string;
    Criticality: string;
    Status: string;
    RiskFactor: "AuthWeakness" | "VulnerableFirmware" | "OutdatedPatch" | "None";
}

export interface IoTNetworkAnalysis {
    totalDevices: number;
    criticalDevices: number;
    vulnerabilities: {
        weakAuth: number;
        outdatedFirmware: number;
        publicExposure: number;
    };
    recommendedUnknowns: string[];
    devices: IoTDevice[];
}

export const IoTService = {
    async scanNetwork(fileContent?: string): Promise<IoTNetworkAnalysis> {
        // Simulate network latency for realism
        await new Promise(resolve => setTimeout(resolve, 1500));

        try {
            let csvText = fileContent;

            // Easter Egg / Demo Logic: Check for special URLs passed as "fileContent" content from the Cloud Tab
            if (fileContent?.includes("safe-zone.icici-lombard.azure-devices.net")) {
                const response = await fetch("/safe_devices.csv");
                csvText = await response.text();
            } else if (!csvText) {
                const response = await fetch("/dummy_iot_data.csv");
                csvText = await response.text();
            }

            return new Promise((resolve) => {
                Papa.parse(csvText!, {
                    header: true,
                    skipEmptyLines: true,
                    complete: (results) => {
                        const devices = results.data as IoTDevice[];

                        const analysis: IoTNetworkAnalysis = {
                            totalDevices: devices.length,
                            criticalDevices: devices.filter(d => d.Criticality === "High" || d.Criticality === "Critical").length,
                            vulnerabilities: {
                                weakAuth: devices.filter(d => d.AuthMethod === "DefaultPassword" || d.AuthMethod === "WeakPassword").length,
                                outdatedFirmware: devices.filter(d => d.RiskFactor === "VulnerableFirmware" || d.RiskFactor === "OutdatedPatch").length,
                                publicExposure: devices.filter(d => d.NetworkSegment === "Public-Wifi").length
                            },
                            recommendedUnknowns: [],
                            devices
                        };

                        resolve(analysis);
                    }
                });
            });
        } catch (error) {
            console.error("IoT Scan Failed", error);
            return {
                totalDevices: 0,
                criticalDevices: 0,
                vulnerabilities: { weakAuth: 0, outdatedFirmware: 0, publicExposure: 0 },
                recommendedUnknowns: [],
                devices: []
            };
        }
    },

    async analyzeDevicesWithAI(devices: IoTDevice[]): Promise<any> {
        // We pass the raw device list to the AI and let IT decide what is risky.
        // Slicing to 50 to respect token limits while providing ample context.
        const rawTelemetry = devices.slice(0, 50);

        try {
            if (rawTelemetry.length === 0) return null;

            const response = await fetch("/api/analyze-devices", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ devices: rawTelemetry })
            });

            if (!response.ok) throw new Error("AI Analysis Failed");
            return await response.json();
        } catch (error) {
            console.error("AI Service Error:", error);
            // Fallback content if AI fails
            const highRiskFallback = rawTelemetry.filter(d => d.RiskFactor !== "None");
            return {
                device_analysis: highRiskFallback.map(d => ({
                    id: d.DeviceID,
                    analysis: `Standard heuristic analysis detects ${d.RiskFactor} risk configuration.`,
                    remediation: "Apply standard vendor patches and rotate credentials."
                })),
                overall_summary: "Automated analysis detected multiple high-risk endpoints requiring immediate actionable intervention."
            };
        }
    },

    parseCSV(csvText: string): IoTDevice[] {
        let parsedData: IoTDevice[] = [];
        Papa.parse(csvText, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                parsedData = results.data as IoTDevice[];
            }
        });
        return parsedData;
    },

    connectLiveStream(url: string, onUpdate: (analysis: IoTNetworkAnalysis) => void): WebSocket {
        const ws = new WebSocket(url);

        ws.onopen = () => {
            console.log("Connected to Live Intelligence Stream");
        };

        ws.onmessage = (event) => {
            try {
                const payload = JSON.parse(event.data);
                if (payload.type === 'TELEMETRY_UPDATE' && payload.data) {
                    const devices = payload.data as IoTDevice[];

                    // Re-use logic to calculate risk analysis from raw stream
                    const analysis: IoTNetworkAnalysis = {
                        totalDevices: devices.length,
                        criticalDevices: devices.filter(d => d.Criticality === "High" || d.Criticality === "Critical").length,
                        vulnerabilities: {
                            weakAuth: devices.filter(d => d.AuthMethod === "DefaultPassword" || d.AuthMethod === "WeakPassword").length,
                            outdatedFirmware: devices.filter(d => d.RiskFactor === "VulnerableFirmware" || d.RiskFactor === "OutdatedPatch").length,
                            publicExposure: devices.filter(d => d.NetworkSegment === "Public-Wifi").length
                        },
                        recommendedUnknowns: [],
                        devices
                    };

                    onUpdate(analysis);
                }
            } catch (e) {
                console.error("Stream parse error", e);
            }
        };

        return ws;
    }
};
