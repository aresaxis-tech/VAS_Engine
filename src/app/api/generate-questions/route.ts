import { NextRequest, NextResponse } from "next/server";
import { invokeClaude, parseAIResponse } from "@/lib/bedrock";

// RAPID FIX: Force Node to accept self-signed certs (Dev only)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

export async function POST(req: NextRequest) {
    let industry = "Unknown";
    try {
        const body = await req.json();
        const { industry: reqIndustry, risks, history } = body; // Renamed industry to reqIndustry to avoid conflict
        industry = reqIndustry || "Unknown"; // Use the renamed variable

        // ADAPTIVE MODE: If history exists, generate next single question
        const isSequential = history && Array.isArray(history) && history.length > 0;
        const previousContext = isSequential
            ? history.map((h: any) => `Q: ${h.question}\nA: ${h.answer}`).join("\n---\n")
            : "None (Start of Assessment)";

        const systemPrompt = `You are a Senior Risk Engineer for ICICI Lombard (India's leading General Insurance provider).
        
        **MISSION:**
        ${isSequential
                ? "Based on the User's previous answers, generate the SINGLE NEXT most critical question to deepen the risk analysis."
                : `Create the initial batch of questions for a "${industry}" client operating in India.`}
        
        **CRITICAL CONTEXT & RULES:**
        1. **GEOGRAPHY:** The client is in **INDIA**. 
           - **DO NOT** quote OSHA, NFPA (unless relevant), or FDA (US). 
           - **USE** "The Factories Act, 1948", "National Building Code (NBC-2016)", "FSSAI" (for food), "CDSCO" (pharma), "Shops & Establishments Act".
           - Currency: INR (₹). Logic: Lakhs/Crores.

        2. **INDUSTRY DEEP DIVE ("${industry}"):**
           - IF RETAIL: Focus on Inventory Shrinkage, POS Security, Cash Handling, Festive Season rush, Shop License.
           - IF MANUFACTURING: Focus on Machinery Breakdown (Boiler Act), Workmen Compensation, Fire Hydrants (NBC), Industrial All Risk (IAR).
           - IF IT/CYBER: Focus on DPDP Act 2023, CERT-In reporting, Ransomware, Hybrid working risks.
           - IF LOGISTICS: Focus on E-Way Bills, Transporter's Liability, Cold Chain reliability.

        3. **TONE:** Professional, Consultative, "Risk-Aware but not Alarmist".

        **CONTEXT:**
        Has Industry Risks: ${JSON.stringify(risks)}
        Previous Q&A History:
        ${previousContext}

        **OUTPUT FORMAT:**
        Return a JSON ARRAY.
        ${isSequential ? "Contains EXACTLY 1 object (The next question)." : "Contains 8 objects (The initial set)."}
        Structure per object:
        {
          "id": "unique_string_id",
          "category": "Property" | "Liability" | "Business" | "Cyber" | "People",
          "text": "The question string (Direct & relevant)",
          "type": "yes_no" | "select" | "number",
          "options": ["Opt1", "Opt2"] (only if type is select),
          "insight": "Why this matters in the Indian market context",
          "industryStandard": "e.g. 'Most MSMEs in this sector...'",
          "riskContext": "ICICI Lombard specific coverage detail (e.g. 'Standard Fire & Special Perils Policy covers this...')",
          "scoring": { "yes": 0, "no": 100 } (Logic: High Score = High Risk)
        }

        **STRATEGY:**
        1. Dig deeper into high-risk areas exposed by previous answers.
        2. If previous answer indicated 'No' to safety, ask about mitigation or insurance cover changes.
        3. Cover unaddressed categories (Property, Liability, Business, People).
        `;

        const userMessage = isSequential ? "Generate the next question." : "Generate initial questions.";

        let responseText = await invokeClaude(systemPrompt, userMessage, 3000);

        let questions;
        try {
            questions = parseAIResponse(responseText);
        } catch (e) {
            console.error("Failed to parse questions, using raw fallback if array-like");
            throw e;
        }

        return NextResponse.json({ questions });

    } catch (error: any) {
        console.error("Question Gen Error:", error);

        // FALLBACK LOGIC
        // If sequential, return a generic next question from backup bank
        // For now, reuse the static bank but slice it

        const fallbackQuestions = [

            {
                id: "fallback_1",
                category: "Property",
                text: `Does your ${industry} facility have an active Fire Detection & Sprinkler system?`,
                type: "yes_no",
                insight: `Fire is the leading cause of property loss in ${industry}.`,
                industryStandard: "Mandatory for facilities > 1000 sq ft.",
                riskContext: "Verified fire safety systems can reduce property premium rates.",
                scoring: { "yes": 0, "no": 100 }
            },
            {
                id: "fallback_2",
                category: "Business",
                text: "What is your estimated daily revenue loss during a total operational halt?",
                type: "number",
                insight: "Business Interruption claims often exceed physical damage costs.",
                industryStandard: "Avg loss is 3x hardware replacement cost.",
                riskContext: "We tailor 'Consequential Loss' limits based on this daily value.",
                scoring: { "default": 50 }
            },
            {
                id: "fallback_3",
                category: "Liability",
                text: "Do you have specific protocols for visitor/third-party safety on premises?",
                type: "yes_no",
                insight: "Slip-and-fall or onsite accidents remain a top litigation driver.",
                industryStandard: "ISO 45001 Safety Protocols.",
                riskContext: "Public Liability coverage defends against third-party injury claims.",
                scoring: { "yes": 0, "no": 80 }
            },
            {
                id: "fallback_4",
                category: "Property",
                text: "Are critical assets (servers/machinery) raised above floor level?",
                type: "yes_no",
                insight: "Water damage from flooding or leaks is a frequent, preventable claim.",
                industryStandard: "Raised flooring (min 12 inches).",
                riskContext: "Standard Fire & Perils policy includes flood coverage.",
                scoring: { "yes": 0, "no": 60 }
            },
            {
                id: "fallback_5",
                category: "Liability",
                text: "Do you maintain a log of employee safety training sessions?",
                type: "yes_no",
                insight: "Documented training is your first defense in Workmen Compensation suits.",
                industryStandard: "Quarterly safety drills required.",
                riskContext: "WC Policy rates improve with demonstrated safety compliance.",
                scoring: { "yes": 0, "no": 90 }
            },
            {
                id: "fallback_6",
                category: "Business",
                text: "Do you have a Business Continuity Plan (BCP) tested in the last 12 months?",
                type: "yes_no",
                insight: "Resilience planning minimizes downtime during unforeseen events.",
                industryStandard: "Annual BCP Audit.",
                riskContext: "BCP maturity significantly impacts Business Interruption underwriting.",
                scoring: { "yes": 0, "no": 100 }
            },
            {
                id: "fallback_7",
                category: "Property",
                text: "Is the facility located within 5km of a water body or coastal zone?",
                type: "yes_no",
                insight: "Proximity to water increases flood and cyclone risk.",
                industryStandard: "Zone-based risk mapping.",
                riskContext: "Location-based risk loading applies for STFI (Storm, Tempest, Flood, Inundation).",
                scoring: { "yes": 80, "no": 0 }
            },
            {
                id: "fallback_8",
                category: "Liability",
                text: "Do you export products to North America (USA/Canada)?",
                type: "yes_no",
                insight: "North American jurisdiction attracts significantly higher liability claims.",
                industryStandard: "Product Liability > $2M Coverage.",
                riskContext: "Export CGL policies require specific jurisdiction extensions.",
                scoring: { "yes": 100, "no": 0 }
            }
        ];

        return NextResponse.json({ questions: fallbackQuestions });
    }
}
