import { NextRequest, NextResponse } from "next/server";
import { invokeClaude, parseAIResponse } from "@/lib/bedrock";

export async function POST(req: NextRequest) {
    let prompt = "";
    try {
        const body = await req.json();
        prompt = body.prompt;

        if (!prompt) {
            return NextResponse.json({ error: "Missing 'prompt' in request body" }, { status: 400 });
        }

        const ROLE_DEFINITION = `You are an expert Cyber Risk Analyst for ICICI Lombard.
        Analyze the provided risk context and output a JSON object with the following structure:`;

        const JSON_STRUCTURE = `{
            "headline": "A short, punchy 3-5 word headline about the risk status",
            "executiveSummary": "A 2-3 sentence high-level summary of the risk posture and key concerns. Use **bold** for emphasis.",
            "remediationSteps": ["Actionable step 1", "Actionable step 2", "Actionable step 3", "Actionable step 4"],
            "signals": ["Log style 1 (e.g. Correlating industry breach data...)", "Log style 2 (e.g. Analyzing 24 IoT endpoints...)", "Log style 3"]
        }`;

        const INSTRUCTIONS = `Ensure the tone is professional, insightful, and insurance-focused.
        "signals" should be short, present-tense, technical log messages resembling a real-time system analysis.
        
        **CRITICAL INSTRUCTIONS:**
        1. Output **ONLY** valid JSON.
        2. Do **NOT** include any "Here is the JSON" or "Analysis:" prefixes.
        3. Do **NOT** output <reasoning>, <thought>, or <thinking> tags.
        4. Do **NOT** use markdown code fences.
        5. Start immediately with \`{\` and end with \`}\`.`;

        const systemPrompt = `${ROLE_DEFINITION}
        ${JSON_STRUCTURE}
        ${INSTRUCTIONS}`;


        let response = await invokeClaude(systemPrompt, prompt, 1000);

        const data = parseAIResponse(response);

        return NextResponse.json(data);
    } catch (error: any) {
        console.error("Risk Analysis Error:", error);

        try {
            const fs = require('fs');
            fs.appendFileSync('debug_error.log', `[${new Date().toISOString()}] Risk Analysis Error: ${error.message} \nStack: ${error.stack} \n-- -\n`);
        } catch (e) { /* ignore fs error */ }

        // Smart Fallback based on prompt context if possible
        const isMfg = prompt.toLowerCase().includes("manufacturing") || prompt.toLowerCase().includes("factory");

        return NextResponse.json({
            headline: "Risk Analysis (Simulated)",
            executiveSummary: `We could not parse the real - time AI response, but based on your inputs: ** ${String(prompt).substring(0, 50)}...**, here is a projected risk assessment.`,
            remediationSteps: ["Enable Multi-Factor Authentication (MFA)", "Patch Critical Vulnerabilities", "Segregate IoT Network", "Regular Penetration Testing"],
            signals: isMfg ? [
                "Connecting to SCADA gateway...",
                "Analyzing thermal sensor telemetry...",
                "Correlating historical fire claims..."
            ] : [
                "Handshaking with local server...",
                "Analyzing network traffic patterns...",
                "Querying Global Threat Intelligence..."
            ]
        }, { status: 200 });
    }
}
