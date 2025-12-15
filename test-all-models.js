const { BedrockRuntimeClient, InvokeModelCommand } = require("@aws-sdk/client-bedrock-runtime");
const https = require("https");

process.env.AWS_BEARER_TOKEN_BEDROCK = "ABSKdXNlcjErMi1hdC0zNDg4MzE1ODYwNzU6bWx6Vk9telBacGxiNW9JdFFBUzRZZnR4N05SZHhlbWxJNlh0ckFOUEdKVmsxdUtXT1djMTAxWXplbFk9";
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const MODELS_TO_TEST = [
    "anthropic.claude-3-sonnet-20240229-v1:0",
    "anthropic.claude-3-haiku-20240307-v1:0",
    "openai.gpt-oss-safeguard-120b",
    "meta.llama3-70b-instruct-v1:0"
];

async function testModel(modelId) {
    console.log(`\n${"=".repeat(60)}`);
    console.log(`Testing: ${modelId}`);
    console.log("=".repeat(60));

    try {
        const client = new BedrockRuntimeClient({
            region: "ap-south-1",
            requestHandler: new (require("@smithy/node-http-handler").NodeHttpHandler)({
                httpsAgent: new https.Agent({ rejectUnauthorized: false })
            })
        });

        // Different payload formats for different models
        let payload;
        if (modelId.includes("anthropic")) {
            payload = {
                anthropic_version: "bedrock-2023-05-31",
                max_tokens: 50,
                messages: [{ role: "user", content: "Say hello" }]
            };
        } else {
            payload = {
                model: modelId,
                max_tokens: 50,
                messages: [{ role: "user", content: "Say hello" }]
            };
        }

        const command = new InvokeModelCommand({
            modelId: modelId,
            contentType: "application/json",
            accept: "application/json",
            body: JSON.stringify(payload)
        });

        const response = await client.send(command);
        const decodedBody = new TextDecoder().decode(response.body);
        const parsedResponse = JSON.parse(decodedBody);

        console.log("✅ SUCCESS!");
        console.log("Response preview:", JSON.stringify(parsedResponse).substring(0, 200) + "...");
        return { model: modelId, success: true };

    } catch (error) {
        console.log("❌ FAILED:", error.name);
        console.log("   Message:", error.message.substring(0, 100));
        return { model: modelId, success: false, error: error.name };
    }
}

async function runTests() {
    console.log("🔍 Testing AWS Bedrock Bearer Token with Multiple Models");
    console.log("Token (first 50 chars):", process.env.AWS_BEARER_TOKEN_BEDROCK.substring(0, 50) + "...\n");

    const results = [];
    for (const model of MODELS_TO_TEST) {
        const result = await testModel(model);
        results.push(result);
    }

    console.log("\n" + "=".repeat(60));
    console.log("SUMMARY");
    console.log("=".repeat(60));

    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    if (successful.length > 0) {
        console.log("\n✅ Working models:");
        successful.forEach(r => console.log(`   - ${r.model}`));
    }

    if (failed.length > 0) {
        console.log("\n❌ Failed models:");
        failed.forEach(r => console.log(`   - ${r.model} (${r.error})`));
    }

    console.log(`\n📊 Success rate: ${successful.length}/${results.length}`);

    if (successful.length > 0) {
        console.log("\n✨ RECOMMENDATION: Use one of the working models in your app!");
        console.log(`   Update src/lib/bedrock.ts line 6 to:`);
        console.log(`   export const CLAUDE_MODEL_ID = "${successful[0].model}";`);
    } else {
        console.log("\n⚠️  CONCLUSION: Bearer token doesn't have access to any tested models.");
        console.log("   Contact your AWS administrator to grant permissions.");
    }
}

runTests();
