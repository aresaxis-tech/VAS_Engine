# 📘 Eureka/Hackathon Project - Technical Deep Dive & Documentation

**Version:** 1.0.0
**Date:** December 15, 2024
**Status:** Hackathon Prototype / MVP

---

## 1. 🏗️ High-Level Architecture Overview

This project is a hybrid web application designed for **Cyber Insurance Risk Assessment & Management**. It uses a modern Next.js frontend for the user interface and business logic, coupled with a lightweight Python backend for specialized agentic AI tasks (web search/news).

### System Components

1.  **Frontend / Application Layer**:
    *   **Framework**: Next.js 16 (React 19, TypeScript).
    *   **Styling**: Tailwind CSS 4, Shadcn/UI, Framer Motion.
    *   **Routing**: Next.js App Router (`src/app`).
    *   **Role**: Handles user interaction, risk questionnaires, dashboard visualization, and report generation.

2.  **Backend Services (Server-Side)**:
    *   **Next.js API Routes** (`src/app/api/*`): Acts as the primary backend. Handles requests for assessment scoring, AI generation (via AWS Bedrock), and 3rd-party integrations (WhatsApp).
    *   **Python Agent Server** (`src/python/server.py`): A Flask microservice running locally. It hosts a specialized AI agent for real-time web search and industry news summarization (using DuckDuckGo + OpenAI).

3.  **AI & Cloud Infrastructure**:
    *   **AWS Bedrock**: Primary GenAI provider. Used for generating risk narratives, chat responses, and security recommendations.
        *   *Models referenced*: `anthropic.claude-3-sonnet`, `openai.gpt-oss-safeguard-120b` (Custom/Proxy).
    *   **AWS Polly & Transcribe**: For Voice-to-Text and Text-to-Voice features in the "Cyber Agent" chat.
    *   **Yellow.ai**: WhatsApp Business API provider for sending PDF reports.

---

## 2. 📂 "Inch-by-Inch" Repository Structure

### Root Directory
*   `package.json`: Dependencies. Notable: `next@16`, `tailwindcss@4`, `@aws-sdk/*`, `flask` (in scripts).
*   `scripts/`: Contains Python installation/setup scripts.
*   `next.config.ts`: Next.js configuration.
*   `.env.local`: Environment variables (API keys for AWS, OpenAI, Yellow.ai).

### Source Code (`src/`)

#### 🐍 `src/python/` (The "Brain" Sidecar)
*   **`server.py`**: A standalone Flask app ($PORT 5000).
    *   **Endpoint `/chat`**: Accepts a natural language query. Uses `gpt-4o` (or fallback) + `duckduckgo-search` to find real-time industry news and risks.
    *   **Why separate?** Python has better libraries for agentic workflows (LangChain-style tools) and specific scraping tasks compared to Node.js environments.

#### 🌐 `src/app/` (Next.js Routing)
*   `page.tsx`: The Landing Page.
*   **`api/`**: The Internal API Gateway.
    *   `analyze-risk/`: Calls AWS Bedrock to generate text analysis of risk scores.
    *   `industry-intel/`: Fetches industry news (likely proxies to Python server).
    *   `send-whatsapp/`: Integration with Yellow.ai to dispatch reports.
    *   `transcribe/` & `polly/`: Audio processing endpoints.

#### 🧩 `src/components/` (UI Modules)
*   **`dashboard/`** (The Core Application Logic):
    *   **`ReportDashboard.tsx`**: **CRITICAL**. The main "Result View". Handles:
        *   Displaying the 5-pillar risk chart.
        *   Running the "SignalStream" (IoT simulation).
        *   triggering AI analysis (`fetchAI`).
        *   Generating PDFs (`html2canvas`).
        *   Sending WhatsApp messages.
    *   **`QuestionnaireEngine.tsx`**: Renders the dynamic risk assessment questions.
    *   **`AssessmentWizard.tsx`**: Wrapper for the multi-step form flow.
    *   **`CyberAgentChat.tsx`**: The floating AI assistant UI.
    *   **`IoTConnectionDialog.tsx`**: Simulates connecting to enterprise networks to "scan" devices.

#### 🧠 `src/lib/` (Business Logic & Utilities)
*   **`riskEngine.ts`**: **THE HEARTBEAT**.
    *   Contains the mathematical formulas for calculating risk.
    *   **Logic**: Calculates `E` (Exposure), `C` (Controls), `D` (Detection), `B` (Business), `I` (IoT).
    *   **VAS Catalog**: Maps rules (e.g., "Score < 60") to Products (e.g., "CrowdStrike MDR").
*   **`bedrock.ts`**: AWS Bedrock Client wrapper.
    *   *Note*: Has code to **bypass SSL** (`rejectUnauthorized: false`) – strictly for Hackathon/Dev environments.
    *   Includes robust JSON parsing for cleaning up "Think" tags from AI responses.
*   **`questions.ts`**: Defines the static database of assessment questions.
*   **`pincodeMaster.ts`**: Indian pincode data database.

---

## 3. ⚙️ Core Business Logic Analyzed

### A. The Risk Scoring Engine (`riskEngine.ts`)
The application does not use a simple logic. It uses a **5-Pillar Weighted Model**:
1.  **Exposure (30%)**: Public IPs, IoT device count, external footprint.
2.  **Controls (30%)**: MFA, Patching, Encryption status.
3.  **Detection (15%)**: SOC presence, MTTD (Mean Time To Detect).
4.  **Business Impact (40% - High Weight)**: Revenue at risk, downtime criticality.
5.  **IoT Specific (20%)**: PLC security, camera networks, segmentation.

**Algorithm**:
```typescript
RiskScore = (Exposure * 0.3) + (Controls_Gap * 0.3) + (Business * 0.4) ...
```
*Note: The actual code mixes these weights dynamically based on "Industry". For Manufacturing, "IoT Risk" gains higher weight.*

### B. Intelligent VAS (Value Added Services)
The engine doesn't just score; it **sells**.
*   **Triggers**: If `Patching` score is low -> Recommends "Agentless Patching" (Product).
*   **Industry Logic**: If Industry = "Manufacturing" -> Recommends "Siemens Predictive Maintenance".
*   **Partners**: Catalog includes ICICI products and partners like CrowdStrike, Zscaler, Armis.
*   **ROI Simulator**: Calculates a `projectedScore` showing how much the risk *would* drop if these services are bought.

### C. The "Cyber Agent" (AI)
*   **Inputs**: User's questionnaire answers + simulated IoT "telemetry".
*   **Process**: Sends a structured prompt to AWS Bedrock (Claude/GPT).
*   **Output**: A narrative HTML/JSON report explaining *why* the score is high and generating a "remediation plan" (steps to fix issues).
*   **Voice**: Can speak responses back using AWS Polly.

### D. Reporting & WhatsApp
1.  **PDF**: The User clicks "Download Report".
    *   Current Implementation: `html2canvas` captures the DOM -> `jsPDF` creates a file.
2.  **WhatsApp**:
    *   User enters phone number.
    *   System calls `/api/send-whatsapp`.
    *   **Current State**: Uses a **hardcoded static PDF** base64 string for stability during demos. It sends a templated message via Yellow.ai.

---

## 4. ⚠️ Critical Implementation Notes (For ManCom)

When presenting, be aware of these "Under the Hood" details:

1.  **Hybrid Server Requirement**: The app requires **TWO** terminals to run.
    *   Terminal 1: `npm run dev` (Next.js)
    *   Terminal 2: `python src/python/server.py` (News Agent)
    *   *Without Python, the "Industry News" section will fail.*

2.  **Demo Data vs. Real Data**:
    *   **Real**: Risk math, Questionnaire logic, AI text generation, WhatsApp API call.
    *   **Simulated**: IoT Device Scanning (it "pretends" to scan network), "Live" Telemetry signals.

3.  **Security Bypasses**:
    *   The code explicitly disables SSL verification (`rejectUnauthorized: false`) for AWS and WhatsApp calls. This is efficient for Hackathon WiFi/Network restrictions but **Must be removed** for Production.

4.  **Hardcoded WhatsApp PDF**:
    *   The specific PDF sent to WhatsApp is currently a static placeholder, not the dynamic one generated on screen. This is a common hackathon stability trade-off.

---

## 5. 🚀 Run Instructions

To start the full stack:

1.  **Install Dependencies**:
    ```bash
    npm install
    pip install flask flask-cors openai duckduckgo-search python-dotenv
    ```

2.  **Start the Application** (Automatic):
    The `package.json` has a macro script:
    ```bash
    npm run dev
    ```
    *This runs `python src/python/server.py` in the background AND starts Next.js.*

3.  **Access**:
    *   Dashboard: `http://localhost:3000`
    *   Python Brain: `http://localhost:5000`

---

## 6. 🔮 Future Roadmap (From Analysis)

1.  **Dynamic PDF for WhatsApp**: Connect the `html2canvas` output to the API route to send the *actual* report.
2.  **Real IoT Integration**: Replace `iotSimulator.ts` with real MQTT/API calls to Armis/Claroty.
3.  **Production Security**: Enable proper SSL and move API keys to secure secret storage (AWS Secrets Manager).
4.  **Unified Backend**: rewrite the Python "News Agent" logic into Next.js/Node.js to remove the Python dependency for simpler deployment.
