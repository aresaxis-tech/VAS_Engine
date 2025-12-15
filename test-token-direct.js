const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const https = require("https");

// Set the bearer token
process.env.AWS_BEARER_TOKEN_BEDROCK = "ABSKdXNlcjErMi1hdC0zNDg4MzE1ODYwNzU6bWx6Vk9telBacGxiNW9JdFFBUzRZZnR4N05SZHhlbWxJNlh0ckFOUEdKVmsxdUtXT1djMTAxWXplbFk9";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

async function testBearerToken() {
    console.log("🔍 Testing AWS Bedrock Bearer Token Authentication\n");
    console.log("Token (first 50 chars):", process.env.AWS_BEARER_TOKEN_BEDROCK.substring(0, 50) + "...\n");

    try {
        // Create client WITHOUT explicit credentials - let SDK use bearer token
        const client = new BedrockRuntimeClient({
            region: "ap-south-1",
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

        console.log("📡 Invoking Bedrock with bearer token authentication...\n");
        const response = await client.send(command);
        const decodedBody = new TextDecoder().decode(response.body);
        const parsedResponse = JSON.parse(decodedBody);

        console.log("✅ SUCCESS! Bearer token is working!\n");
        console.log("Response:", JSON.stringify(parsedResponse, null, 2));
        console.log("\n✨ The bearer token is VALID and has proper permissions!");
        return true;

    } catch (error) {
        console.error("❌ FAILED:", error.message);
        console.error("\nError details:");
        console.error("  Name:", error.name);
        console.error("  HTTP Status:", error.$metadata?.httpStatusCode);
        console.error("  Fault:", error.$fault);

        if (error.name === "AccessDeniedException") {
            console.error("\n⚠️  The bearer token does NOT have permission to invoke this model.");
            console.error("Possible issues:");
            console.error("  1. Token doesn't have bedrock:InvokeModel permission");
            console.error("  2. Token doesn't have access to model: openai.gpt-oss-safeguard-120b");
            console.error("  3. Token is expired or invalid");
        }

        return false;
    }
}

testBearerToken().then(success => {
    process.exit(success ? 0 : 1);
});
