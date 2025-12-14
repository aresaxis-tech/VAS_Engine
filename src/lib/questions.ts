export type QuestionType = "yes_no" | "slider" | "toggle" | "rating" | "select" | "multi_select" | "number" | "text";
export type Category = "Profile" | "Controls" | "Detection" | "IoT" | "Business" | "People" | "Specifics";

export interface Question {
    id: string;
    category: Category;
    text: string;
    type: QuestionType;
    options?: string[];
    tooltip?: string;
    insight?: string;
    industryStandard?: string; // e.g. "ISO 27001 requires..." or "Sector benchmark: 40%"
    riskContext?: string;
    scoring?: Record<string, number>; // Maps answer value to Risk Score (0-100)
    triggerVAS?: string; // ID of VAS to recommend if this question is answered "yes" or positively
    // Adaptive Logic
    triggers?: {
        answer: string | number | boolean;
        addQuestions: string[]; // IDs of questions to inject
    }[];
}

// 1. POOL OF ALL POSSIBLE DEEP DIVE QUESTIONS
export const DETAIL_QUESTIONS: Question[] = [
    // --- MANUFACTURING / ENERGY DEEP DIVES ---
    {
        id: "cpm_fleet",
        category: "IoT",
        text: "Do you require real-time tracking of fuel levels and driver behavior?",
        type: "yes_no",
        triggerVAS: "cpm_vas", // Custom field for RiskEngine to pick up logic later if needed
        insight: "Fuel pilferage and inefficient driving cost logistics fleets 15-20% annually.",
        riskContext: "Unmonitored fleets are a liability black hole."
    },
    {
        id: "electrical_audit",
        category: "Specifics",
        text: "Are your main electrical panels older than 5 years?",
        type: "yes_no",
        insight: "Aging panels are the #1 cause of industrial fires.",
        riskContext: "ICICI Lombard mandates ERA for older plants."
    },
    {
        id: "temp_humidity",
        category: "IoT",
        text: "Do you require 24/7 monitoring of temperature/humidity for sensitive assets?",
        type: "yes_no",
        insight: "Pharmaceuticals and server rooms require strict environmental control.",
        riskContext: "Spoilage claims can be rejected if no logs are valid."
    },
    {
        id: "drone_solar",
        category: "Specifics",
        text: "Do you need thermal inspection for solar panels or wind turbines?",
        type: "yes_no",
        insight: "Micro-cracks in solar panels reduce efficiency by 30% and are invisible to the naked eye.",
        riskContext: "Drone thermography is 10x faster than manual inspection."
    },
    {
        id: "gas_leak",
        category: "Specifics",
        text: "Do you have a complex piping network for hazardous gases?",
        type: "yes_no",
        insight: "Minor leaks cost millions in lost product and pose explosion risks.",
        riskContext: "Ultrasonic detection finds leaks that soap-tests miss."
    },

    // --- LOGISTICS / MARINE DEEP DIVES ---
    {
        id: "marine_tracking",
        category: "IoT",
        text: "Do you need live vessel tracking and route deviation alerts?",
        type: "yes_no",
        insight: "Knowing exactly where your ship is allows for JIT logistics planning.",
        riskContext: "Route deviation is a key indicator of piracy or theft."
    },
    {
        id: "odc_survey",
        category: "Specifics",
        text: "Is your cargo classified as Over Dimensional (ODC)?",
        type: "yes_no",
        insight: "ODC requires specialized lashing and route surveys to prevent toppling.",
        riskContext: "ODC claims are often disputed due to improper handling."
    },

    // --- CYBER / BFSI DEEP DIVES ---
    {
        id: "vapt_req",
        category: "Detection",
        text: "Do you need to scan your public applications for vulnerabilities?",
        type: "yes_no",
        insight: "New vulnerabilities are discovered daily. Manual testing is too slow.",
        riskContext: "VAPT is a compliance requirement for RBI/SEBI."
    },
    {
        id: "agentless_patch",
        category: "Controls",
        text: "Do you want to patch servers without installing agents?",
        type: "yes_no",
        insight: "Agents slow down servers. Agentless is the modern streamlined approach.",
        riskContext: "Unpatched servers are the lowest hanging fruit for hackers."
    },
    {
        id: "dpdp_consult",
        category: "Business",
        text: "Do you need assistance with DPDP Act compliance?",
        type: "yes_no",
        insight: "The new Data Protection Act imposes fines up to ₹250 Cr.",
        riskContext: "Compliance is cheaper than the fine."
    }
];

// 2. INITIAL PIVOT QUESTIONS (The "First 5")
export const QUESTIONS: Question[] = [
    // --- SECTOR SELECTOR (Hidden/ Implicit usually, but defined here for context) ---
    // manufacturing / energy
    {
        id: "pivot_fuel",
        category: "Profile",
        text: "Is your machinery or fleet heavily fuel-dependent?",
        type: "yes_no",
        insight: "Rising fuel costs and theft are major operational risks.",
        triggers: [
            { answer: "yes", addQuestions: ["cpm_fleet"] }
        ]
    },
    {
        id: "pivot_electrical",
        category: "Profile",
        text: "Do you operate heavy electrical machinery or older transformers?",
        type: "yes_no",
        insight: "Electrical fires account for 40% of industrial insurance claims.",
        triggers: [
            { answer: "yes", addQuestions: ["electrical_audit", "temp_humidity"] }
        ]
    },
    {
        id: "pivot_yards",
        category: "Profile",
        text: "Do you maintain large open yards, solar farms, or wind turbines?",
        type: "yes_no",
        insight: "Large areas are hard to inspect manually.",
        triggers: [
            { answer: "yes", addQuestions: ["drone_solar"] }
        ]
    },
    {
        id: "pivot_hazards",
        category: "Profile",
        text: "Do you handle hazardous chemicals or high-pressure gas?",
        type: "yes_no",
        insight: "Safety incidents here are catastrophic.",
        triggers: [
            { answer: "yes", addQuestions: ["gas_leak"] }
        ]
    },

    // --- CYBER / CORP PIVOTS ---
    {
        id: "pivot_hosting",
        category: "Profile",
        text: "Do you host your own servers and applications?",
        type: "yes_no",
        insight: "Self-hosting increases your responsibility for physical and digital security.",
        triggers: [
            { answer: "yes", addQuestions: ["vapt_req", "agentless_patch"] }
        ]
    },
    {
        id: "pivot_data",
        category: "Business",
        text: "Do you process sensitive customer data (PII/Financial)?",
        type: "yes_no",
        insight: "Data fiduciaries have high regulatory burden.",
        triggers: [
            { answer: "yes", addQuestions: ["dpdp_consult"] }
        ]
    },

    // --- MARINE PIVOTS ---
    {
        id: "pivot_logistics",
        category: "Profile",
        text: "Do you manage international cargo shipments?",
        type: "yes_no",
        insight: "Cross-border logistics have complex liability handovers.",
        triggers: [
            { answer: "yes", addQuestions: ["marine_tracking", "odc_survey"] }
        ]
    }
];

// Helper to look up details
export function getDetailQuestion(id: string): Question | undefined {
    return DETAIL_QUESTIONS.find(q => q.id === id);
}
