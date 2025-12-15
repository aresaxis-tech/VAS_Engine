import { NextResponse } from 'next/server';
import https from 'https';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { number, pdfBase64, customerName, riskLevel, date, riskScore, category, recommendations } = body;

        // Default static data if not provided
        const param1 = customerName || "Customer";
        const param2 = riskLevel || "Medium";
        const param3 = date || new Date().toISOString().split('T')[0];
        const param4 = riskScore ? String(riskScore) : "50";
        // Map recommendations (or category) to param 5
        const param5 = recommendations || category || "General";

        const apiKey = '0AOLjyt3yI_fqHvhG6nxLGGCk0jrFxfp3jz5Fm5w';
        const cookie = '_cfuvid=Aqkh61KLRgx0VqtOwkUPuCN_iszlsvq941Y0JmcgJtU-1765739741356-0.0.1.1-604800000';

        // Use static PDF for now (hardcoded)
        const staticPdfBase64 = "JVBERi0xLjQNCiWxsrO0DQMDAwMTQwMzggMDAwMDAgbg0KMDAwMDAxNDU0NCAwMDAwMCBuDQowMDAwMDE1NDg2IDAwMDAwIG4NCjAwMDAwMTYzMDkgMDAwMDAgbg0KMDAwMDAxODA2OSAwMDAwMCBuDQowMDAwMDE4Mzk4IDAwMDAwIG4NCjAwMDAwMTg3MjYgMDAwMDAgbg0KMDAwMDAxOTA0NSAwMDAwMCBuDQowMDAwMDMyNzIyIDAwMDAwIG4NCjAwMDAwNTMyNDQgMDAwMDAgbg0KdHJhaWxlcg0KPDwNCi9JbmZvIDcgMCBSDQovUm9vdCAxIDAgUg0KL1NpemUgMjQNCj4+DQoNCnN0YXJ0eHJlZg0KODQ3NjINCiUlRU9GDQo=";

        const payload = JSON.stringify({
            userDetails: {
                number: number
            },
            notification: {
                type: "whatsapp",
                sender: "917738282666",
                templateId: "eureka_hackathon_team5",
                params: {
                    "1": param1,
                    "2": param2,
                    "3": param3,
                    "4": param4,
                    "5": param5,
                    media: {
                        mediaBase64: staticPdfBase64,
                        mediaBase64Type: "application/pdf",
                        title: "INITIAL_ASSESEMENT_DONE"
                    }
                }
            }
        });

        // Use native HTTPS request to support SSL bypass reliably
        const options = {
            hostname: 'cloud.yellow.ai',
            path: '/api/engagements/notifications/v2/push?bot=x1725620362017',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'Cookie': cookie,
                'Content-Length': Buffer.byteLength(payload)
            },
            rejectUnauthorized: false // CRITICAL: Bypass SSL error
        };

        // Wrap https.request in a Promise
        const apiResponse = await new Promise((resolve, reject) => {
            const req = https.request(options, (res) => {
                let data = '';
                res.on('data', (chunk) => {
                    data += chunk;
                });
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        body: data
                    });
                });
            });

            req.on('error', (e) => {
                reject(e);
            });

            req.write(payload);
            req.end();
        });

        // @ts-ignore
        const { statusCode, body: resBody } = apiResponse;

        let parsedBody;
        try {
            parsedBody = JSON.parse(resBody);
        } catch (e) {
            parsedBody = resBody;
        }

        if (statusCode >= 200 && statusCode < 300) {
            return NextResponse.json(parsedBody);
        } else {
            console.error("WhatsApp API Error Response:", parsedBody);
            return NextResponse.json({ error: parsedBody, status: statusCode }, { status: statusCode });
        }

    } catch (error: any) {
        console.error("WhatsApp API Handler Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
