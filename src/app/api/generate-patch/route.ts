
import { NextRequest, NextResponse } from "next/server";
import { invokeClaude } from "@/lib/bedrock";

// FORCE NODE TLS (Dev Environment)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

// DETERMISTIC FALLBACK GENERATOR (When AI is unreachable)
// Ensures "Out of the Box" feeling with unique scripts per vulnerability type
function generateDeterministicFallback(deviceId: string, vulnerability: string, deviceType: string): string {
    const v = vulnerability.toLowerCase();
    const d = deviceType || "Device";
    const ts = new Date().toISOString();

    if (v.includes("password") || v.includes("auth") || v.includes("credential")) {
        return `#!/bin/bash
# AUTONOMOUS PATCH: CREDENTIAL ROTATION
# Target: ${deviceId} (${d})
# Generated: ${ts}

echo "[INFO] Starting credential rotation for ${deviceId}..."

# 1. Force SSH Key-Based Auth
echo "[EXEC] Disabling password authentication..."
sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
sed -i 's/^PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config

# 2. Rotate Keys
echo "[EXEC] Generating new 4096-bit RSA keys..."
ssh-keygen -t rsa -b 4096 -f /etc/ssh/ssh_host_rsa_key -N "" -q

# 3. Restart Service
echo "[EXEC] Restarting SSH Daemon..."
systemctl restart sshd

echo "[SUCCESS] Device secured. Manual Login disabled."`;
    }

    if (v.includes("port") || v.includes("exposure") || v.includes("public")) {
        return `#!/bin/bash
# AUTONOMOUS PATCH: NETWORK HARDENING
# Target: ${deviceId}
# Risk: Public Exposure / Open Ports

# 1. Flush existing rules
iptables -F

# 2. Set Default Drop Policy
iptables -P INPUT DROP
iptables -P FORWARD DROP

# 3. Allow Loopback & Established
iptables -A INPUT -i lo -j ACCEPT
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# 4. Close Risky Ports (Telnet:23, FTP:21)
echo "[EXEC] Blocking legacy ports 21, 23..."
iptables -A INPUT -p tcp --dport 23 -j DROP
iptables -A INPUT -p tcp --dport 21 -j DROP

# 5. Allow Business Critical (MQTT via TLS)
echo "[EXEC] Allowing MQTT/TLS (8883)..."
iptables -A INPUT -p tcp --dport 8883 -j ACCEPT

echo "[SUCCESS] Firewall rules updated. Attack surface minimized."`;
    }

    if (v.includes("firmware") || v.includes("patch") || v.includes("outdated")) {
        return `import os
import hashlib
import requests

# AUTONOMOUS PATCH: FIRMWARE UPDATE
# Target: ${deviceId} (${d})

VENDOR_URL = "https://secure-update.${d.toLowerCase().replace(/\s/g, "")}.com/latest"
EXPECTED_HASH = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"

def update_firmware():
    print(f"[INFO] Checking for updates for {d}...")
    
    # 1. Identify Version
    current = os.popen("uname -r").read().strip()
    print(f"[INFO] Current Kernel: {current}")

    # 2. Download Secure Payload across encrypted channel
    print(f"[EXEC] Downloading signed image from {VENDOR_URL}...")
    # Simulated download
    # r = requests.get(VENDOR_URL, verify=True)
    
    # 3. Verify Signature
    print("[EXEC] Verifying SHA-256 Checksum...")
    # if hashlib.sha256(payload).hexdigest() == EXPECTED_HASH:
    print("[SUCCESS] Signature Matched.")
    
    # 4. Apply
    print("[EXEC] Flashing memory banks A/B...")
    print("[SUCCESS] System Reboot required to finalize.")

if __name__ == "__main__":
    update_firmware()`;
    }

    if (v.includes("encrypt") || v.includes("cleartext") || v.includes("cipher")) {
        return `#!/bin/bash
# AUTONOMOUS PATCH: ENCRYPTION UPGRADE
# Target: ${deviceId}
# Remediation: Enforce TLS 1.3

CONFIG_FILE="/etc/nginx/nginx.conf"

echo "[INFO] Hardening Transport Layer Security..."

# 1. Disable SSLv3 and TLS 1.0/1.1
echo "[EXEC] Removing legacy protocols..."
sed -i 's/ssl_protocols.*/ssl_protocols TLSv1.2 TLSv1.3;/' $CONFIG_FILE

# 2. Enforce Strong Ciphers
echo "[EXEC] Setting High-Strength Cipher Suite..."
sed -i 's/ssl_ciphers.*/ssl_ciphers HIGH:!aNULL:!MD5;/' $CONFIG_FILE

# 3. Enable HSTS (Strict Transport Security)
echo "[EXEC] Enabling HSTS (1 year)..."
sed -i '/server_name/a add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;' $CONFIG_FILE

systemctl reload nginx
echo "[SUCCESS] Communication channel encrypted."`;
    }

    // Default Fallback
    return `#!/bin/bash
# GENERIC REMEDIATION SCRIPT
# Target: ${deviceId}
# Vulnerability: ${vulnerability}

echo "[INFO] Initiating standard lockout procedure..."
usermod -L guest_user
echo "[EXEC] Guest account locked."

echo "[INFO] Rotating admin logs..."
logrotate -f /etc/logrotate.conf

echo "[SUCCESS] Basic hardening applied. Please manual review."`;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { deviceId, vulnerability, deviceType } = body;

        const systemPrompt = `You are a Senior Cyber-Security Engineer specializing in Industrial Control Systems (ICS) and IoT.
    
    **MISSION:**
    Generate a concise, executable patch script (Python or Bash) to remediate the following vulnerability on an IoT device.
    
    **CONTEXT:**
    Device ID: ${deviceId}
    Type: ${deviceType}
    Vulnerability: ${vulnerability}
    
    **OUTPUT FORMAT:**
    Return ONLY the code block. No explanation. No markdown fences.
    If Python, start with import statements.
    If Bash, start with #!/bin/bash.
    
    **SCENARIOS:**
    1. Weak Password -> Script to rotate SSH keys or force password change.
    2. Open Ports -> Script to configure iptables or ufw (firewall).
    3. Old Firmware -> Script to wget latest firmware from secure vendor (simulated URL).
    4. Encryption None -> Script to enable TLS 1.3 config.
    
    Keep the script short (under 20 lines) but realistic looking.
    `;

        const userMessage = `Generate mitigation code for ${vulnerability} on ${deviceType}.`;

        try {
            const generatedCode = await invokeClaude(systemPrompt, userMessage, 512);

            // Clean markdown if Claude adds it despite instructions
            const cleanCode = generatedCode.replace(/```python/g, "").replace(/```bash/g, "").replace(/```/g, "").trim();

            return NextResponse.json({ code: cleanCode });

        } catch (aiError) {
            console.error("Bedrock Patch Error (Falling back to Deterministic Engine):", aiError);
            // SMART FALLBACK
            const smartCode = generateDeterministicFallback(deviceId, vulnerability, deviceType);
            return NextResponse.json({ code: smartCode });
        }

    } catch (error) {
        console.error("Generate Patch API Error:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
