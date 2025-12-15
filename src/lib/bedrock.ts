import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import https from "https";

// export const CLAUDE_MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0";
export const CLAUDE_MODEL_ID = "openai.gpt-oss-safeguard-120b";

/**
 * Invokes AI Model (GPT OSS) via Bedrock.
 */
export async function invokeClaude(systemPrompt: string, userMessage: string, maxTokens: number = 4096) {
    // RAPID FIX: Nuclear option to bypass SSL verification in Hackathon env
    const requestHandler = new NodeHttpHandler({
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    // Configure Bedrock client with bearer token support
    // AWS SDK automatically detects AWS_BEARER_TOKEN_BEDROCK environment variable
    const clientConfig: any = {
        region: "ap-south-1", // User requested Mumbai for this model
        requestHandler: requestHandler, // Force the insecure handler
    };

    // Only add explicit credentials if bearer token is NOT provided
    // This allows SDK to auto-detect bearer token authentication
    if (!process.env.AWS_BEARER_TOKEN_BEDROCK) {
        clientConfig.credentials = {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
        };
    }

    const bedrockClient = new BedrockRuntimeClient(clientConfig);

    // Payload for GPT OSS Safeguard (OpenAI Compatible)
    const payload = {
        model: CLAUDE_MODEL_ID, // Some proxies require model inside body too
        max_tokens: maxTokens,
        messages: [
            { role: "system", content: systemPrompt }, // OpenAI puts system in messages
            { role: "user", content: userMessage }
        ]
    };

    const command = new InvokeModelCommand({
        modelId: CLAUDE_MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload)
    });

    // Debug Env
    const authMethod = process.env.AWS_BEARER_TOKEN_BEDROCK ? "Bearer Token" : "Standard IAM";
    console.log(`DEBUG: invokeClaude -> Region: ap-south-1, Auth: ${authMethod}`);

    try {
        console.log(`📡 Invoking Bedrock Model: ${CLAUDE_MODEL_ID}`);
        const response = await bedrockClient.send(command);
        const decodedBody = new TextDecoder().decode(response.body);
        const parsedResponse = JSON.parse(decodedBody);

        // Extract content from GPT OSS (OpenAI Compatible) response structure
        // Fallback to Claude structure if needed, but prioritize choices
        let content = "";
        if (parsedResponse.choices && parsedResponse.choices.length > 0) {
            content = parsedResponse.choices[0].message.content;
        } else if (parsedResponse.content && parsedResponse.content.length > 0) {
            content = parsedResponse.content[0].text; // Legacy Claude fallback
        } else {
            throw new Error("Unexpected response structure from Bedrock model");
        }


        // Clean internal reasoning traces (Model safeguards leak these sometimes)
        // Aggressive regex to catch <reasoning>...</reasoning>, <thought>...</thought>, <analysis>...</analysis>
        content = content.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
            .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
            .replace(/<analysis>[\s\S]*?<\/analysis>/gi, "")
            .trim();

        return content;
    } catch (error: any) {
        console.error("❌ Bedrock Invocation Failed:", error);
        throw error;
    }
}

/**
 * robustly parses JSON from AI response, handling markdown fences and reasoning traces.
 */
export function parseAIResponse(responseText: string): any {
    try {
        // 1. Strip Markdown Fences
        let clean = responseText.replace(/```json/g, "").replace(/```/g, "");

        // 2. Scan for outer-most JSON object or array
        const firstBrace = clean.indexOf('{');
        const firstBracket = clean.indexOf('[');

        let start = -1;
        let isArray = false;

        // Determine if object or array is the primary container
        if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
            start = firstBrace;
            isArray = false;
        } else if (firstBracket !== -1) {
            start = firstBracket;
            isArray = true;
        }

        if (start !== -1) {
            // Balanced Brace/Bracket Matching to correctly handle trailing text
            let open = isArray ? '[' : '{';
            let close = isArray ? ']' : '}';
            let depth = 0;
            let end = -1;
            let inString = false;
            let escape = false;

            // Start scanning from the found start index
            for (let i = start; i < clean.length; i++) {
                const char = clean[i];

                if (escape) {
                    escape = false;
                    continue;
                }

                if (char === '\\') {
                    escape = true;
                    continue;
                }

                if (char === '"') {
                    inString = !inString;
                    continue;
                }

                if (!inString) {
                    if (char === open) {
                        depth++;
                    } else if (char === close) {
                        depth--;
                        if (depth === 0) {
                            end = i;
                            break;
                        }
                    }
                }
            }

            if (end !== -1) {
                // We found a complete balanced structure
                clean = clean.substring(start, end + 1);
            } else {
                // Fallback: If no balanced end found (unlikely or malformed), try legacy substring
                // but this generally means invalid JSON anyway.
                // We'll stick to substring till the end or try finding last brace as backup
                // but strictly speaking, the loop only fails if JSON is cut off.
                const lastIdx = clean.lastIndexOf(close);
                if (lastIdx > start) {
                    clean = clean.substring(start, lastIdx + 1);
                }
            }
        }

        // 3. Attempt Parse
        return JSON.parse(clean);
    } catch (e: any) {
        console.error("❌ JSON PARSE FAILURE. Raw Content:", responseText);
        try {
            const fs = require('fs');
            // Append to log to preserve history
            fs.appendFileSync('debug_error.log', `[${new Date().toISOString()}] JSON PARSE ERROR in parseAIResponse:\n${e.message}\nRAW CONTENT:\n${responseText}\n---\n`);
        } catch (fsErr) { /* ignore */ }

        throw new Error("Failed to parse AI JSON: " + responseText.substring(0, 50) + "...");
    }
}
