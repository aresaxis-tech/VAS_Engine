
import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const REGIONS = ["ap-south-1"];
const MODELS = [
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-5-sonnet-20241022-v2:0",
    "anthropic.claude-instant-v1"
];

async function scan() {
    console.log("🔍 Scanning AWS Regions & Models for access...");

    // We rely on process.env matching the .env.local being loaded by the runner or npx
    // If npx tsx doesn't load it, we assume we need to read it or it's passed.
    // Given previous run had credentials (even if invalid), we assume they are present in env.

    // Check if creds exist
    if (!process.env.AWS_ACCESS_KEY_ID) {
        console.error("❌ NO CREDENTIALS FOUND IN ENV.");
        // Try to load from .env.local manually if needed (simple parse)
        const fs = require('fs');
        try {
            const env = fs.readFileSync('.env.local', 'utf8');
            env.split('\n').forEach((line: string) => {
                const [k, v] = line.split('=');
                if (k && v) process.env[k.trim()] = v.trim().replace(/"/g, '');
            });
            console.log("✅ Loaded credentials from .env.local");
        } catch (e) { console.log("⚠️ No .env.local found"); }
    }

    for (const region of REGIONS) {
        console.log(`\n--- Checking Region: ${region} ---`);
        const client = new BedrockRuntimeClient({
            region,
            credentials: {
                accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
                secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
            }
        });

        for (const modelId of MODELS) {
            try {
                // process.stdout.write(`   Testing ${modelId}... `);
                const command = new InvokeModelCommand({
                    modelId,
                    contentType: "application/json",
                    accept: "application/json",
                    body: JSON.stringify({
                        anthropic_version: "bedrock-2023-05-31",
                        max_tokens: 10,
                        messages: [{ role: "user", content: "Hi" }]
                    })
                });

                await client.send(command);
                console.log(`✅ SUCCESS! Working Config: Region=${region}, Model=${modelId}`);
                console.log(`!!! STOPPING SCAN - USE THIS CONFIG !!!`);
                return; // Found one!
            } catch (error: any) {
                // Short error message
                const msg = error.name || error.message;
                console.log(`   ❌ ${modelId}: ${msg}`);
            }
        }
    }
    console.log("\n❌ Scan Complete. No working configuration found.");
}

scan();
