export interface RiskComponents {
    E: number; // Exposure
    C: number; // Controls
    D: number; // Detection
    B: number; // Business Impact
    I: number; // IoT Risk
}

export interface RiskAnalysis {
    score: number;
    category: "Low" | "Moderate" | "High" | "Severe";
    components: RiskComponents;
    benchmarks: RiskComponents; // New: Industry Standards
    recommendations: VASRecommendation[];
    projectedScore?: number; // New: ROI Simulation
}

export interface VASRecommendation {
    id: string;
    title: string;
    provider: string; // The "Partner"
    type: "ICICI Product" | "Partner Service";
    description: string;
    impact: string; // "Reduces loss ratio by..."
    cost: "Low" | "Medium" | "High";
    tags: string[];
    riskReduction: number; // For calculation
}

// INTELLIGENT VAS CATALOG (ICICI LOMBARD BRANDED)
// INTELLIGENT VAS CATALOG (MAPPED TO GLOSSARY)
const VAS_CATALOG: VASRecommendation[] = [
    // --- IOT / ENGINEERING ---
    { id: "fhiot", title: "Fire Hydrant IoT Monitor", provider: "ICICI", type: "ICICI Product", description: "Real-time pressure monitoring for fire hydrants.", impact: "Ensures availability during emergencies", cost: "Low", tags: ["IoT", "Safety"], riskReduction: 15 },
    { id: "fire_ball", title: "Fire Ball Suppression", provider: "ICICI", type: "ICICI Product", description: "Auto-activating fire extinguisher.", impact: "Instant suppression of electrical fires", cost: "Low", tags: ["Safety"], riskReduction: 10 },
    { id: "flood_protection", title: "Flood Protection Barriers", provider: "ICICI", type: "ICICI Product", description: "Reusable flood barriers for property.", impact: "Prevents water damage", cost: "Medium", tags: ["Safety", "Property"], riskReduction: 12 },
    { id: "cpm_fleet", title: "CPM Fleet & Fuel Mgmt", provider: "ICICI", type: "ICICI Product", description: "GPS tracking and fuel pilferage sensors.", impact: "Reduces fuel theft by 20%", cost: "Medium", tags: ["IoT", "Logistics"], riskReduction: 15 },
    { id: "era", title: "Electrical Risk Assessment", provider: "ICICI", type: "ICICI Product", description: "Thermography audits for panels.", impact: "Prevents short-circuit fires", cost: "Low", tags: ["Engineering", "Audit"], riskReduction: 20 },
    { id: "thiot", title: "Temp/Humidity IoT", provider: "ICICI", type: "ICICI Product", description: "24/7 Environmental monitoring.", impact: "Prevents spoilage of sensitive goods", cost: "Low", tags: ["IoT"], riskReduction: 10 },
    { id: "fmea", title: "Failure Mode Analysis (FMEA)", provider: "ICICI", type: "ICICI Product", description: "Design-stage failure prediction.", impact: "Eliminates design defects", cost: "High", tags: ["Consutling"], riskReduction: 15 },
    { id: "drone_solar", title: "Drone Thermography", provider: "ICICI", type: "ICICI Product", description: "Aerial thermal inspection of solar/wind assets.", impact: "Detects micro-cracks invisible to eye", cost: "Medium", tags: ["Drone"], riskReduction: 12 },
    { id: "gas_leak", title: "Ultrasound Leak Detection", provider: "ICICI", type: "ICICI Product", description: "Acoustic detection of gas leaks.", impact: "Prevents explosion risks", cost: "Medium", tags: ["Safety"], riskReduction: 18 },
    { id: "hazop", title: "HAZOP Study", provider: "ICICI", type: "ICICI Product", description: "Hazard and Operability study for processes.", impact: "Process safety compliance", cost: "High", tags: ["Consulting"], riskReduction: 15 },
    { id: "plpe", title: "Property Loss Prevention", provider: "ICICI", type: "ICICI Product", description: "Low Focus-High Loss area identification.", impact: "Reduces operational losses", cost: "Medium", tags: ["Consulting"], riskReduction: 10 },

    // --- MARINE / LOGISTICS ---
    { id: "lds_surface", title: "LDS Surface Telematics", provider: "ICICI", type: "ICICI Product", description: "Truck/Container tracking.", impact: "Supply chain visibility", cost: "Medium", tags: ["Logistics"], riskReduction: 10 },
    { id: "mlce", title: "Marine Loss Control Eng", provider: "ICICI", type: "ICICI Product", description: "Packing and loading supervision.", impact: "Reduces damaged cargo claims", cost: "Medium", tags: ["Marine"], riskReduction: 12 },
    { id: "marine_warranty", title: "Marine Warranty Survey", provider: "ICICI", type: "ICICI Product", description: "ODC Route survey and inspection.", impact: "Mandatory for Over-Dimensional Cargo", cost: "High", tags: ["Marine"], riskReduction: 20 },

    // --- CYBER ---
    { id: "vapt", title: "VAPT Services", provider: "Partner", type: "Partner Service", description: "Vulnerability Assessment & Penetration Testing.", impact: "Identifies exploitable flaws", cost: "Medium", tags: ["Cyber"], riskReduction: 25 },
    { id: "agentless_patch", title: "Agentless Patching", provider: "ICICI", type: "ICICI Product", description: "Automated patching without agents.", impact: " Closes vulnerabilities 50% faster", cost: "Medium", tags: ["Cyber"], riskReduction: 20 },
    { id: "dpdp_consult", title: "DPDP Consultancy", provider: "Deloitte", type: "Partner Service", description: "Privacy compliance advisory.", impact: "Avoids regulatory fines", cost: "High", tags: ["Compliance"], riskReduction: 10 },
    { id: "edr_mdr", title: "MDR Services", provider: "CrowdStrike", type: "ICICI Product", description: "Managed Detection and Response.", impact: "24/7 threat monitoring", cost: "High", tags: ["Cyber"], riskReduction: 25 },
    { id: "knowbe4_training", title: "Phishing Simulation", provider: "KnowBe4", type: "Partner Service", description: "Employee awareness training.", impact: "Reduces human error", cost: "Low", tags: ["Cyber"], riskReduction: 15 },

    // --- EXISTING / LEGACY ---
    { id: "armis_asset", title: "IL IoT Shield", provider: "Armis", type: "ICICI Product", description: "IoT Asset Visibility.", impact: "Shadow IT discovery", cost: "Medium", tags: ["IoT"], riskReduction: 15 },
    { id: "claroty_remote", title: "IL Industrial Sentry", provider: "Claroty", type: "ICICI Product", description: "OT Secure Access.", impact: "Secure remote maintenance", cost: "Medium", tags: ["OT"], riskReduction: 15 },
    { id: "siemens_predictive", title: "IL Machine Health", provider: "Siemens", type: "ICICI Product", description: "Predictive Maintenance.", impact: "Reduces downtime", cost: "High", tags: ["IoT"], riskReduction: 15 },
    { id: "zscaler_ztna", title: "Cloud-Secure Connect", provider: "Zscaler", type: "Partner Service", description: "Zero Trust Network Access.", impact: "Secure remote work", cost: "Medium", tags: ["Network"], riskReduction: 15 },
    { id: "cra_deloitte", title: "ICICI Cyber-Pulse Audit", provider: "Deloitte", type: "ICICI Product", description: "Maturity Assessment.", impact: "Strategic roadmap", cost: "High", tags: ["Consulting"], riskReduction: 10 }
];

function mapOptionToScore(answer: any, mapping: Record<string, number>): number {
    if (typeof answer !== "string") return 0;
    return mapping[answer] ?? 0;
}

import { Question } from "./questions";

export function calculateRiskScore(answers: Record<string, any>, questions?: Question[]): RiskAnalysis {
    // Helper to safely get number or mapped score
    const get = (id: string, mapping?: Record<string, number>): number => {
        const val = answers[id];
        if (val === undefined) return 0;
        if (mapping) return mapOptionToScore(val, mapping);
        if (typeof val === "number") return val;
        return 0;
    };

    // --- DYNAMIC SCORING (AI ENGINE) ---
    if (questions && questions.length > 0) {
        // Initialize components
        let scoreE = 0, countE = 0; // Exposure (Property/IoT)
        let scoreC = 0, countC = 0; // Controls (Liability/Controls)
        let scoreB = 0, countB = 0; // Business (Business/People)
        let scoreI = 0, countI = 0; // IoT Specific

        questions.forEach(q => {
            const answer = answers[q.id];
            if (answer !== undefined && q.scoring) {
                // Get score from 'scoring' map (e.g. "yes": 0, "no": 100)
                // If answer is number, assume it's normalized or handle separately? 
                // For number, we might default to 50 if not mapped, but AI usually gives Select/YesNo
                let val = 0;
                if (typeof answer === "string") val = q.scoring[answer] ?? 50;
                else if (typeof answer === "number") val = 50; // Fallback for pure numbers without range logic

                const cat = q.category as string;

                // Map Category to Component
                if (cat === "Property") {
                    scoreE += val; countE++;
                } else if (cat === "Liability" || cat === "Controls" || cat === "Detection" || cat === "Cyber") { // Added Cyber
                    scoreC += val; countC++;
                } else if (cat === "Business" || cat === "People") {
                    scoreB += val; countB++;
                } else if (cat === "IoT") { // Dedicated IoT Logic
                    scoreI += val; countI++;
                }
            }
        });

        // Normalize (0-100)
        // If count is 0, default to 0 (Safe) or 50 (Unknown)? Default to 0 to avoid false alarm.
        // Hybrid Calculation (Questions + Signals)
        const iotCount = typeof answers["iot_count"] === 'number' ? answers["iot_count"] : 0;
        const publicEndpoints = typeof answers["public_endpoints"] === 'number' ? answers["public_endpoints"] : 0;
        const iotTypes = (answers["iot_types"] as string[]) || [];

        // Exposure: Combine Question Risk + External Footprint
        const E_Questions = countE > 0 ? (scoreE / countE) : 0;
        const E_Signals = Math.min(100, (publicEndpoints * 1.5) + (iotTypes.length * 5));
        const E = countE > 0 ? Math.max(E_Questions, E_Signals) : E_Signals;

        // Controls: Questions (100 - AvgRisk)
        // If no controls questions asked, assume baseline 60 unless signals say otherwise
        const C = countC > 0 ? (100 - (scoreC / countC)) : 60;

        // Business: Avg Business Risk
        const B = countB > 0 ? (scoreB / countB) : 30;

        // Detection: Baseline + Improvement based on answers
        let D = 50;
        if (answers["soc"] === "In-house" || answers["soc"] === "MSSP") D += 30;
        if (answers["mttd"] === "<1 hour") D += 20;

        // IoT Risk: Specific Logic
        // Calculate based on count, types, and specific answers if questions didn't cover it
        let scoreI_Signal = 0;
        if (iotCount > 10) scoreI_Signal += 20;
        if (iotCount > 100) scoreI_Signal += 30;
        if (iotTypes.includes("PLCs")) scoreI_Signal += 20;
        if (iotTypes.includes("Cameras")) scoreI_Signal += 10;
        if (answers["iot_network"] === "Direct Internet") scoreI_Signal += 40;

        const I = countI > 0 ? (scoreI / countI) : scoreI_Signal;

        // Formula
        const riskScore = Math.round(
            (E * 0.30) +
            ((100 - C) * 0.30) +
            (B * 0.40)
        );

        // --- CATEGORIZATION ---
        let category: RiskAnalysis["category"] = "Low";
        if (riskScore >= 75) category = "Severe";
        else if (riskScore >= 50) category = "High";
        else if (riskScore >= 25) category = "Moderate";

        // --- INTELLIGENT VAS RECOMMENDATION ENGINE ---
        const recs = new Set<VASRecommendation>();
        const industry = answers["industry_selection"];

        // Define helper variables early to avoid 'used before assigned' errors
        // (Moved to top of block)

        // 1. Direct Trigger from Questions (Adaptive Logic)
        questions.forEach(q => {
            const val = answers[q.id];
            // If question has a triggerVAS and the answer is "confirming" (yes/high/bad)
            // OR if answer is "yes" (Optimization opportunity)
            if (q.triggerVAS && (val === "yes" || val === true || val === "Critical" || val === "High")) {
                // Fix ID mismatch (e.g. cpm_vas vs cpm_fleet) by checking partial match or direct
                const match = VAS_CATALOG.find(v => v.id === q.triggerVAS || v.id === q.id);
                if (match) recs.add(match);
            }
        });

        // 2. Logic Triggers (Remediations for BAD scores)
        if (E > 60) recs.add(VAS_CATALOG.find(r => r.id === "armis_asset")!); // High Exposure
        if (C < 50) recs.add(VAS_CATALOG.find(r => r.id === "zscaler_ztna")!); // Low Controls
        if (B > 60) recs.add(VAS_CATALOG.find(r => r.id === "siemens_predictive")!); // High Business Impact
        if (riskScore > 70) recs.add(VAS_CATALOG.find(r => r.id === "cra_deloitte")!); // General High Risk
        if (get("training") < 100) recs.add(VAS_CATALOG.find(r => r.id === "knowbe4_training")!);
        if (get("edr") < 100) recs.add(VAS_CATALOG.find(r => r.id === "edr_mdr")!);

        // 3. OPTIMIZATIONS (Value Adds for GOOD scores/answers)
        // Even if you are safe, we show "Optimization" opportunities so list is never empty
        if (answers["mfa"] === "yes") {
            // If they have MFA, suggest Adaptive Auth (Optimization)
            const opt = VAS_CATALOG.find(r => r.id === "zscaler_ztna");
            if (opt) recs.add({ ...opt, title: "Zero Trust Optimization", description: "Enhance existing MFA with Identity Context.", impact: "Seamless user experience" });
        }
        if (answers["fire_detection"] === "yes" || answers["pivot_electrical"] === "yes") {
            // If they have detection, suggest AI Analytics
            const opt = VAS_CATALOG.find(r => r.id === "era");
            if (opt) recs.add({ ...opt, title: "AI Energy Analytics", description: "Optimize power usage while monitoring safety.", impact: "Cost & Risk reduction" });
        }
        if (answers["patching"] === "Within 7 days" || answers["agentless_patch"] === "yes") {
            const opt = VAS_CATALOG.find(r => r.id === "agentless_patch");
            if (opt) recs.add({ ...opt, title: "Patch Automation", description: "Auto-verify patch integrity.", impact: "Operational efficiency" });
        }

        // IoT/OT Logic
        const isOTHeavy = industry === "manufacturing" || industry === "logistics" || industry === "infra";
        const hasManyIoT = iotCount > 50 || iotTypes.includes("PLCs") || iotTypes.includes("Smart Meters");

        if (hasManyIoT) {
            recs.add(VAS_CATALOG.find(r => r.id === "armis_asset")!);
        }
        if (isOTHeavy && answers["iot_network"] !== "Isolated VLANs") {
            recs.add(VAS_CATALOG.find(r => r.id === "claroty_remote")!);
        }
        if (isOTHeavy && answers["uptime_criticality"] === "Critical") {
            recs.add(VAS_CATALOG.find(r => r.id === "siemens_predictive")!);
        }
        // Calculate sub-scores (0-100)
        // Ensure we don't divide by zero
        scoreE = countE > 0 ? (scoreE / countE) : 20; // Default low-ish risk if no data
        scoreC = countC > 0 ? (scoreC / countC) : 20;
        scoreI = countI > 0 ? (scoreI / countI) : 20;

        // Weighted Total (Example weights)
        // Exposure (30%), Controls (40%), Business (10%), IoT (20%)
        const totalScore = (scoreE * 0.3) + (scoreC * 0.4) + (20 * 0.1) + (scoreI * 0.2);

        // --- INDUSTRY BENCHMARKS ---
        // Mock benchmarks based on typical industry profiles
        // The 'industry' variable is already defined above in the 'INTELLIGENT VAS RECOMMENDATION ENGINE' section.
        let benchmarks: RiskComponents = { E: 45, C: 60, D: 50, B: 40, I: 40 }; // Default / General

        if (industry && industry.includes("Manufact")) { // Added null check for industry
            benchmarks = { E: 65, C: 45, D: 50, B: 70, I: 60 }; // High IoT risk, mod controls
        } else if (industry && industry.includes("Health")) {
            benchmarks = { E: 80, C: 75, D: 60, B: 90, I: 55 }; // High exposure (Privacy), high controls needed
        } else if (industry && industry.includes("Retail")) {
            benchmarks = { E: 50, C: 40, D: 40, B: 50, I: 30 }; // Moderate
        } else if (industry && industry.includes("Financ")) {
            benchmarks = { E: 90, C: 85, D: 90, B: 95, I: 20 }; // Very high standards
        }

        const calculatedRiskScore = Math.min(100, Math.max(0, Math.round(totalScore)));

        // The `getRecommendations` function is not defined in the provided context.
        // Assuming the user intends to use the existing `recs` set or define `getRecommendations` elsewhere.
        // For now, I will use the `recs` set that was built up.
        // Also, the `riskScore` variable was already defined earlier in this block.
        // I'll use `calculatedRiskScore` for the new score and keep the existing `riskScore` for recommendations if needed.

        return {
            score: calculatedRiskScore,
            category: calculatedRiskScore < 30 ? "Low" : calculatedRiskScore < 60 ? "Moderate" : calculatedRiskScore < 80 ? "High" : "Severe",
            components: { E: scoreE, C: scoreC, D: D, B: B, I: scoreI }, // Using existing D and B
            benchmarks,
            recommendations: Array.from(recs).filter(Boolean), // Using the existing recs set
            projectedScore: Math.max(15, Math.round(calculatedRiskScore * 0.4)) // Simulate ~60% reduction potential
        };
    }

    // --- FALLBACK TO HARDCODED SCORING (LEGACY) ---

    // 1. Controls (C)
    const cScores = [
        get("mfa", { "yes": 100, "no": 0 }),
        get("asset_inventory", { "Yes": 100, "Partial": 50, "No": 0 }),
        get("patching", { "Within 7 days": 100, "8-30 days": 70, "31-90 days": 40, ">90 days": 0 }),
        get("edr", { "Yes": 100, "Planned": 50, "No": 0 }),
        get("segmentation_corp", { "Yes": 100, "Partial": 50, "No": 0 }),
        get("encryption", { "Yes": 100, "Partial": 50, "No": 0 }),
        get("supplier_risk", { "Yes": 100, "Partial": 50, "No": 0 })
    ];
    const C = cScores.reduce((a, b) => a + b, 0) / cScores.length;

    // 2. Detection (D)
    const dScores = [
        get("soc", { "In-house": 100, "MSSP": 80, "None": 0 }),
        get("mttd", { "<1 hour": 100, "1-24 hrs": 80, "1-7 days": 40, ">7 days": 0 }),
        get("ir_plan", { "Yes": 100, "Partial": 50, "No": 0 }),
        get("drills", { "Quarterly": 100, "Annually": 60, "Never": 0 })
    ];
    const D = dScores.reduce((a, b) => a + b, 0) / dScores.length;

    // 3. IoT Risk (I)
    const iComponents = [
        mapOptionToScore(answers["firmware"], { "Automated": 0, "Manual": 40, "No policy": 100 }) * 0.4,
        mapOptionToScore(answers["iot_network"], { "Isolated VLANs": 0, "Shared with Corp": 60, "Direct Internet": 100 }) * 0.3,
        mapOptionToScore(answers["key_rotation"], { "Yes": 0, "Planned": 50, "No": 100 }) * 0.3
    ];
    const I = iComponents.reduce((a, b) => a + b, 0);

    // 4. Exposure (E)
    const publicEndpoints = get("public_endpoints");
    const iotCount = get("iot_count");
    const iotTypes = answers["iot_types"] as string[] || [];
    const E = Math.min(100, (publicEndpoints * 2) + (iotTypes.length * 8) + (iotCount / 10));

    // 5. Business Impact (B)
    const revenueScore = get("revenue_risk", { "<₹1M": 10, "₹1-10M": 40, "₹10-100M": 70, ">₹100M": 100 });
    const uptimeScore = get("uptime_criticality", { "Low": 10, "Medium": 40, "High": 70, "Critical": 100 });
    const sensitiveScore = answers["sensitive_data"] === "yes" ? 100 : 0;
    const B = (0.5 * revenueScore) + (0.3 * uptimeScore) + (0.2 * sensitiveScore);

    // --- FINAL FORMULA ---
    // RiskScore = round( E*0.25 + (100 - C)*0.25 + (100 - D)*0.15 + B*0.20 + I*0.15 )
    const riskScore = Math.round(
        (E * 0.25) +
        ((100 - C) * 0.25) +
        ((100 - D) * 0.15) +
        (B * 0.20) +
        (I * 0.15)
    );

    // --- CATEGORIZATION ---
    let category: RiskAnalysis["category"] = "Low";
    if (riskScore >= 75) category = "Severe";
    else if (riskScore >= 50) category = "High";
    else if (riskScore >= 25) category = "Moderate";

    // --- INTELLIGENT VAS RECOMMENDATION ENGINE ---
    const recs = new Set<VASRecommendation>();
    const industry = answers["industry_selection"];

    // Trigger Logic for ICICI Products
    if (get("training", { "Quarterly": 100, "Annually": 50, "No": 0 }) < 100) {
        recs.add(VAS_CATALOG.find(r => r.id === "knowbe4_training")!);
    }
    if (riskScore > 60 || get("edr", { "Yes": 100, "Planned": 50, "No": 0 }) < 100) {
        recs.add(VAS_CATALOG.find(r => r.id === "crowdstrike_mdr")!);
    }

    // IoT/OT Logic
    const isOTHeavy = industry === "manufacturing" || industry === "logistics" || industry === "infra";
    const hasManyIoT = iotCount > 50 || iotTypes.includes("PLCs") || iotTypes.includes("Smart Meters");

    if (hasManyIoT) {
        recs.add(VAS_CATALOG.find(r => r.id === "armis_asset")!);
    }
    if (isOTHeavy && answers["iot_network"] !== "Isolated VLANs") {
        recs.add(VAS_CATALOG.find(r => r.id === "claroty_remote")!);
    }
    if (isOTHeavy && answers["uptime_criticality"] === "Critical") {
        recs.add(VAS_CATALOG.find(r => r.id === "siemens_predictive")!);
    }

    // Compliance & Network
    if (category === "Severe" || category === "High") {
        recs.add(VAS_CATALOG.find(r => r.id === "cra_deloitte")!);
    }
    if (answers["public_endpoints"] > 20 || answers["mfa"] === "no") {
        recs.add(VAS_CATALOG.find(r => r.id === "zscaler_ztna")!);
    }

    // --- ROI SIMULATION ---
    // Calculate how much the score improves if user adopts recommended VAS
    const totalReduction = Array.from(recs).reduce((sum, r) => sum + (r ? r.riskReduction : 0), 0);
    // Be conservative: Max reduction capped at 50%
    const actualReduction = Math.min(totalReduction, riskScore * 0.5);
    const projectedScore = Math.max(0, Math.round(riskScore - actualReduction));

    return {
        score: riskScore,
        category,
        components: { E, C, D, B, I },
        benchmarks: { E: 45, C: 60, D: 50, B: 40, I: 40 }, // Default / General (using the default benchmarks defined earlier)
        recommendations: Array.from(recs).filter(Boolean),
        projectedScore
    };
}
