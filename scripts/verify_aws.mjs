import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import fs from 'fs';
import path from 'path';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// Manual env loader since we are running standalone
try {
    const envPath = path.resolve(process.cwd(), '.env.local');
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) {
            process.env[key.trim()] = value.trim();
        }
    });
    console.log("✅ Loaded .env.local");
} catch (e) {
    console.error("❌ Could not load .env.local", e.message);
}

const client = new BedrockRuntimeClient({
    region: process.env.AWS_REGION || "ap-southeast-2",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const run = async () => {
    console.log("🔄 Testing Amazon Bedrock Connection (ap-southeast-2)...");

    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 100,
        messages: [
            { role: "user", content: "Hello, are you operational?" }
        ]
    };

    const command = new InvokeModelCommand({
        modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify(payload)
    });

    try {
        const response = await client.send(command);
        const responseBody = new TextDecoder().decode(response.body);
        const result = JSON.parse(responseBody);
        console.log("✅ Success! Response from Claude:");
        console.log(result.content[0].text);
    } catch (err) {
        console.error("❌ Failed:", err.name, err.message);
        if (err.name === 'UnrecognizedClientException') {
            console.error("-> Hints: Check if Keys are active and Region is correct.");
        }
    }
};

run();
