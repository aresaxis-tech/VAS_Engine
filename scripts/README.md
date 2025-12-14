# 📡 ICICI Cyber-Shield Live Connector

This script mimics a deployed "Edge Agent" running on a client's server. It connects to the Dashboard via a secure WebSocket and pushes real-time device telemetry.

## How to Run

1.  **Open a Terminal** (keep your main `npm run dev` terminal running).
2.  **Navigate to Project Root**:
    ```bash
    cd /Users/linesh/Documents/GitHub/hackathon
    ```
3.  **Run the Script**:
    ```bash
    node scripts/live_connector.js
    ```
4.  **Connect in Dashboard**:
    *   Go to **Cyber Risk Questionnaire**.
    *   Click **Connect IoT Hub**.
    *   Switch to **Cloud Connector** tab.
    *   Enter URL: `ws://localhost:8080`.
    *   Click **Connect**.

## What will happen?
*   The terminal will show "Dashboard Connected!".
*   The script will start streaming JSON telemetry packets every 2 seconds.
*   The Dashboard will receive these updates and run the Risk Engine in real-time.
