const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const https = require("https");

// Disable SSL verification for testing
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function testBedrockToken() {
    console.log("🔍 Testing AWS Bedrock Bearer Token Authentication...\n");

    // The bearer token provided by user
    const bearerToken = "ABSKdXNlcjErMi1hdC0zNDg4MzE1ODYwNzU6bWx6Vk9telBacGxiNW9JdFFBUzRZZnR4N05SZHhlbWxJNlh0ckFOUEdKVmsxdUtXT1djMTAxWXplbFk9";

    try {
        // Test 1: Using Bearer Token (if SDK supports it)
        console.log("📡 Test 1: Attempting with Bearer Token in custom auth...");

        const client = new BedrockRuntimeClient({
            region: "ap-south-1",
            // Try custom credentials provider
            credentials: async () => ({
                accessKeyId: "",
                secretAccessKey: "",
                sessionToken: bearerToken
            }),
            requestHandler: new (require("@smithy/node-http-handler").NodeHttpHandler)({
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            })
        });

        const payload = {
            model: "openai.gpt-oss-safeguard-120b",
            max_tokens: 50,
            messages: [
                { role: "user", content: "Say hello in one word" }
            ]
        };

        const command = new InvokeModelCommand({
            modelId: "openai.gpt-oss-safeguard-120b",
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload)
        });

        const response = await client.send(command);
        const decodedBody = new TextDecoder().decode(response.body);
        const parsedResponse = JSON.parse(decodedBody);

        console.log("✅ SUCCESS! Bearer token is working!");
        console.log("Response:", JSON.stringify(parsedResponse, null, 2));
        return true;

    } catch (error) {
        console.error("❌ Test 1 Failed:", error.message);
        console.error("Error details:", {
            name: error.name,
            code: error.$metadata?.httpStatusCode,
            fault: error.$fault
        });

        // Test 2: Try with environment variable approach
        console.log("\n📡 Test 2: Attempting with AWS_SESSION_TOKEN env variable...");

        try {
            const client2 = new BedrockRuntimeClient({
                region: "ap-south-1",
                credentials: {
                    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "dummy",
                    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "dummy",
                    sessionToken: bearerToken
                },
                requestHandler: new (require("@smithy/node-http-handler").NodeHttpHandler)({
                    httpsAgent: new https.Agent({ rejectUnauthorized: false })
                })
            });

            const command2 = new InvokeModelCommand({
                modelId: "openai.gpt-oss-safeguard-120b",
                contentType: "application/json",
                accept: "application/json",
                body: JSON.stringify(payload)
            });

            const response2 = await client2.send(command2);
            const decodedBody2 = new TextDecoder().decode(response2.body);
            const parsedResponse2 = JSON.parse(decodedBody2);

            console.log("✅ SUCCESS! Bearer token works with session token!");
            console.log("Response:", JSON.stringify(parsedResponse2, null, 2));
            return true;

        } catch (error2) {
            console.error("❌ Test 2 Failed:", error2.message);
            console.error("\n⚠️  CONCLUSION: Bearer token authentication failed.");
            console.error("This token format may not be compatible with AWS SDK.");
            console.error("\nPossible reasons:");
            console.error("1. Token format is for AWS CLI, not SDK");
            console.error("2. Token requires specific headers not supported by SDK");
            console.error("3. IAM permissions still deny access");
            console.error("4. Token is expired or invalid");
            return false;
        }
    }
}

testBedrockToken().then(success => {
    process.exit(success ? 0 : 1);
}).catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
