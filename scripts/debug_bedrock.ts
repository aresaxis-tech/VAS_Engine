import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";

// Force TLS fix
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const CLAUDE_MODEL_ID = "anthropic.claude-3-sonnet-20240229-v1:0";

async function test() {
    console.log("Testing Bedrock Connection (ap-south-1)...");


    const client = new BedrockRuntimeClient({
        region: "ap-south-1",
        credentials: {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ""
        }
    });

    const payload = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 100,
        messages: [{ role: "user", content: "Hello" }]
    };

    try {
        const command = new InvokeModelCommand({
            modelId: CLAUDE_MODEL_ID,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload)
        });

        const response = await client.send(command);
        console.log("SUCCESS checking   ab-south-1");
    } catch (error) {
        console.error("FAILURE in ap-south-1:", error);
    }
}

test();
