
const BASE_URL = "http://localhost:3000";

async function testEndpoint(name, url, body) {
    console.log(`\n🔄 Testing ${name}...`);
    try {
        const start = Date.now();
        const res = await fetch(`${BASE_URL}${url}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        const duration = Date.now() - start;

        if (res.ok) {
            const data = await res.json();
            console.log(`✅ ${name} Success (${duration}ms)`);
            // Show snippet of response
            const snippet = JSON.stringify(data).slice(0, 100);
            console.log(`   Response: ${snippet}...`);
            return true;
        } else {
            console.error(`❌ ${name} Failed: ${res.status} ${res.statusText}`);
            const text = await res.text();
            console.error(`   Error: ${text}`);
            return false;
        }
    } catch (err) {
        console.error(`❌ ${name} Network Error:`, err.message);
        return false;
    }
}

async function runTests() {
    console.log("🚀 Starting Advanced Bedrock Suite Verification");
    console.log("---------------------------------------------");

    // 1. Test Threat Hunter Chat
    await testEndpoint(
        "Threat Hunter Chat",
        "/api/agent-chat",
        {
            messages: [{ role: "user", content: "Is the network safe?" }],
            context: { status: "Critical", devices: [] }
        }
    );

    // 2. Test Generative Patching
    await testEndpoint(
        "Generative Patching",
        "/api/generate-patch",
        {
            deviceId: "TEST-001",
            vulnerability: "Weak Telnet Password",
            deviceType: "IP Camera"
        }
    );

    // 3. Test Executive Report
    await testEndpoint(
        "Executive Report",
        "/api/generate-report",
        {
            context: {
                criticalDevices: 5,
                vulnerabilities: { weakAuth: 2, publicExposure: 3 }
            }
        }
    );

    console.log("\n---------------------------------------------");
    console.log("🏁 Verification Complete. If all consist of ✅, you are ready to demo.");
}

runTests();
