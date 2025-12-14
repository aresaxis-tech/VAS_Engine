import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import https from "https";

// Credentials from User
const TOKEN = "ABSKdXNlcjErMS1hdC0zNDg4MzE1ODYwNzU6YTZmeXNhYWQ5bWdaMmhldDBOcUFzQlFQanFyNTdiMlJtRHQzU0J5NDZGcnFSM2s1a2prM2tnTzVHS2c9";
const API_KEY_NAME = "user1+1-at-348831586075";
const REGION = "ap-northeast-1";
const MODEL_ID = "openai.gpt-oss-safeguard-120b";

async function test() {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

    const requestHandler = new NodeHttpHandler({
        httpsAgent: new https.Agent({ rejectUnauthorized: false })
    });

    const client = new BedrockRuntimeClient({
        region: REGION,
        requestHandler,
        credentials: {
            accessKeyId: "dummy",
            secretAccessKey: "dummy"
        }
    });

    // Middleware
    client.middlewareStack.add(
        (next) => async (args) => {
            const request = args.request as any;
            if (request.headers) {
                console.log("Injecting Headers...");
                // Test Strategy 1: Both Headers
                request.headers["Authorization"] = `Bearer ${TOKEN}`;
                request.headers["x-api-key"] = API_KEY_NAME;

                // Logging for debug
                console.log("Auth:", request.headers["Authorization"]);
                console.log("x-api-key:", request.headers["x-api-key"]);
            }
            return next(args);
        },
        { step: "build", name: "authInjection" }
    );

    // Using a minimal payload that might be accepted by either Claude or GPT just to test Auth
    // If Auth works, we either get success or a clear 'ValidationException' (which means Auth passed!)
    const checkCommand = new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
            messages: [{ role: "user", content: "Hi" }],
            max_tokens: 10
        })
    });

    try {
        console.log(`invoking ${MODEL_ID} in ${REGION}...`);
        const response = await client.send(checkCommand);
        const body = new TextDecoder().decode(response.body);
        console.log("✅ SUCCESS! Auth Passed.");
        console.log("Response:", body);
    } catch (e: any) {
        console.log("--- RESULT ---");
        if (e.name === 'ValidationException' || e.message.includes("malformed")) {
            console.log("✅ SUCCESS! Auth Passed (Payload error is expected).");
            console.log("Error was:", e.message);
        } else {
            console.error("❌ FAILED:", e.message);
            // console.error("Stack:", e.stack);
        }
    }
}

test();
