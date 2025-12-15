"use client";

import React, { useEffect, useState, useRef } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { motion } from "framer-motion";
import { Chart as ChartJS, ArcElement, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler } from "chart.js";
import { Doughnut } from "react-chartjs-2";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { calculateRiskScore, RiskAnalysis } from "@/lib/riskEngine";
import { RefreshCw, Sparkles, CheckCircle2, Activity, Download, ArrowLeft } from "lucide-react";
import { Loader3D } from "@/components/ui/Loader3D";
import { SignalStream } from "./SignalStream";
import { OptimizationModal } from "./OptimizationModal";

ChartJS.register(ArcElement, Tooltip, Legend, RadialLinearScale, PointElement, LineElement, Filler);

import { PrintableReport } from "./PrintableReport";


import { Question } from "@/lib/questions";

import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle
} from "@/components/ui/dialog";

interface ReportDashboardProps {
    answers: Record<string, any>;
    riskAnalysis?: any; // Accept rich IoT data
    questions?: Question[];
    onRestart: () => void;
    onBack?: () => void;
}

export function ReportDashboard({ answers, riskAnalysis, questions, onRestart, onBack }: ReportDashboardProps) {
    const [analysis, setAnalysis] = useState<RiskAnalysis | null>(null);

    const [aiData, setAiData] = useState<any>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [showSignals, setShowSignals] = useState(false);
    const [showOptimization, setShowOptimization] = useState(false);
    const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
    const [whatsappNumber, setWhatsappNumber] = useState("");
    const [sendingWhatsApp, setSendingWhatsApp] = useState(false);
    const [isCapturingPdf, setIsCapturingPdf] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const generatePdfBase64 = async () => {
        if (!reportRef.current) return null;

        setIsCapturingPdf(true);
        // Wait for render cycle to update class (make it visible but hidden z-index)
        await new Promise(resolve => setTimeout(resolve, 500)); // Delay to ensure images load/layout settles

        try {
            // Suppress console errors AND window errors temporarily during html2canvas parsing
            const originalConsoleError = console.error;
            const originalWindowError = window.onerror;

            console.error = (...args: any[]) => {
                // Ignore LAB color parsing errors from html2canvas
                const errorMsg = String(args[0] || '');
                if (errorMsg.includes('Attempting to parse an unsupported color function') ||
                    errorMsg.includes('lab') ||
                    errorMsg.includes('lch') ||
                    errorMsg.includes('oklab')) {
                    return;
                }
                originalConsoleError.apply(console, args);
            };

            // Suppress window errors for LAB color parsing
            window.onerror = (message) => {
                const errorMsg = String(message || '');
                if (errorMsg.includes('Attempting to parse an unsupported color function') ||
                    errorMsg.includes('lab') ||
                    errorMsg.includes('lch')) {
                    return true; // Prevent default error handling
                }
                return originalWindowError ? originalWindowError.apply(window, arguments as any) : false;
            };

            let canvas;
            try {
                canvas = await html2canvas(reportRef.current, {
                    scale: 2, // Retain quality
                    useCORS: true, // For images
                    logging: false,
                    backgroundColor: "#ffffff", // Ensure white background
                    windowWidth: 1200, // Force width
                    ignoreElements: (element) => {
                        // Skip elements that might have problematic CSS
                        return element.hasAttribute('data-html2canvas-ignore');
                    },
                    onclone: (clonedDoc) => {
                        // Simplify colors in the cloned document to avoid LAB color issues
                        const style = clonedDoc.createElement('style');
                        style.textContent = `
                            * {
                                color-scheme: light !important;
                            }
                        `;
                        clonedDoc.head.appendChild(style);
                    }
                });
            } catch (canvasError: any) {
                console.warn("html2canvas error (attempting to continue):", canvasError.message);
                // If html2canvas fails, restore error handlers and throw
                console.error = originalConsoleError;
                window.onerror = originalWindowError;
                throw new Error("Failed to capture report as image");
            }

            // Restore error handlers
            console.error = originalConsoleError;
            window.onerror = originalWindowError;

            if (!canvas) {
                throw new Error("Canvas generation failed");
            }

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);

            // output returns a string like "data:application/pdf;base64,.....\" or just the data depending on type
            // pdf.output('datauristring') returns "data:application/pdf;base64,..."
            const base64 = pdf.output("datauristring").split(",")[1];
            return base64;
        } catch (error: any) {
            console.error("PDF Gen Error", error);
            return null;
        } finally {
            setIsCapturingPdf(false);
        }
    };

    useEffect(() => {
        const result = calculateRiskScore(answers, questions);
        setAnalysis(result);

        // Trigger AI Analysis
        const fetchAI = async () => {
            setAiLoading(true);
            try {
                // Construct a prompt from meaningful signals AND real IoT data
                const contextAnswers = Object.entries(answers).map(([k, v]) => `${k}: ${v}`).join(", ");

                const iotContext = riskAnalysis ? `
                    REAL-TIME TELEMETRY: 
                    Scanned ${riskAnalysis.totalDevices} devices. 
                    Critical Alerts: ${riskAnalysis.criticalDevices}.
                    Vulnerabilities: ${JSON.stringify(riskAnalysis.vulnerabilities)}.
                ` : "";

                const prompt = `
                    Sector: ${answers["industry_selection"] || "Unknown"}.
                    Risk Score: ${result.score}/100 (${result.category}).
                    Components: Exposure ${result.components.E}, Controls ${result.components.C}, IoT Risk ${result.components.I}.
                    User Responses: ${contextAnswers}
                    ${iotContext}
                    Recommended Protection: ${result.recommendations.map(r => r.title).join(", ")}.
                    
                    TASK: Generate a rich analysis including 'Enterprise Risk Telemetry'. Infer missing data (Employees, Endpoints) if not explicitly provided, based on the Sector and Risk Profile.
                `;
                const res = await fetch("/api/analyze-risk", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ prompt })
                });
                const data = await res.json();
                setAiData(data);
            } catch (e) {
                console.error("AI fetch error", e);
            } finally {
                setAiLoading(false);
            }
        };
        fetchAI();

    }, [answers, riskAnalysis, questions]);

    const [activeSection, setActiveSection] = useState("section-digital-pulse");

    useEffect(() => {
        const handleScroll = () => {
            const sections = [
                "section-digital-pulse",
                "section-neural-insight",
                "section-ipl"
            ];

            let currentSectionId = sections[0];
            const viewportMiddle = window.innerHeight / 2;

            for (const id of sections) {
                const el = document.getElementById(id);
                if (el) {
                    const rect = el.getBoundingClientRect();
                    // If the top of the section is above the middle of the viewport, it's the current candidate
                    if (rect.top <= viewportMiddle) {
                        currentSectionId = id;
                    }
                }
            }
            setActiveSection(currentSectionId);
        };

        window.addEventListener("scroll", handleScroll);
        // Initial check
        handleScroll();

        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    useEffect(() => {
        const result = calculateRiskScore(answers, questions);
        setAnalysis(result);

        // Trigger AI Analysis
        // ... (existing code)
    }, [answers, riskAnalysis, questions]);

    if (!analysis) return (
        <div className="flex h-[80vh] items-center justify-center">
            <Loader3D status="scanning" />
        </div>
    );

    const getRiskTheme = (score: number) => {
        if (score <= 30) return {
            color: "#eab308", // Mustard/Yellow-500 (Low Risk)
            gradient: "from-yellow-400 to-amber-300",
            glow: "bg-yellow-500/20",
            text: "text-yellow-400",
            label: "Low Risk"
        };
        if (score <= 60) return {
            color: "#f59e0b", // Amber-500 (Medium Risk)
            gradient: "from-amber-500 to-orange-400",
            glow: "bg-amber-500/20",
            text: "text-amber-500",
            label: "Medium Risk"
        };
        if (score <= 80) return {
            color: "#ef4444", // Red-500 (High Risk)
            gradient: "from-red-500 to-rose-400",
            glow: "bg-red-500/20",
            text: "text-red-500",
            label: "High Risk"
        };
        return {
            color: "#7f1d1d", // Red-900 (Critical/Dark Red)
            gradient: "from-red-900 to-red-700",
            glow: "bg-red-950/40",
            text: "text-red-600",
            label: "Critical"
        };
    };

    const theme = getRiskTheme(analysis.score);



    // Minimal PDF Base64 for demo purposes
    const samplePdfBase64 =
        "JVBERi0xLjQNCiWxsrO0DQolQ3JlYXRlZCBieSBXbnYvRVAgUERGIFRvb2xzIHY4LjANCjEgMCBvYmoNCjw8DQovUGFnZXMgMiAwIFINCi9QYWdlTGF5b3V0IC9PbmVDb2x1bW4NCi9QYWdlTW9kZSAvVXNlTm9uZQ0KL1ZpZXdlclByZWZlcmVuY2VzIDMgMCBSDQovVHlwZSAvQ2F0YWxvZw0KPj4NCg0KZW5kb2JqDQoyIDAgb2JqDQo8PA0KL0NvdW50IDENCi9LaWRzIFs0IDAgUl0NCi9UeXBlIC9QYWdlcw0KPj4NCg0KZW5kb2JqDQo0IDAgb2JqDQo8PA0KL1BhcmVudCAyIDAgUg0KL1Jlc291cmNlcyA8PA0KL1Byb2NTZXQgWy9QREYgL1RleHQgL0ltYWdlQ10NCi9YT2JqZWN0IDw8DQovTkFNRV9vYWVuZW9oZ2VnZWlrZW5kYm9nbGRjY29nZ2FmYWJuaSA1IDAgUg0KPj4NCg0KPj4NCg0KL01lZGlhQm94IFswLjAwMDAwIDAuMDAwMDAgODQyLjAwMDAwIDExOTAuMDAwMDBdDQovQ29udGVudHMgWzYgMCBSXQ0KL1R5cGUgL1BhZ2UNCj4+DQoNCmVuZG9iag0KNiAwIG9iag0KPDwNCi9GaWx0ZXIgL0ZsYXRlRGVjb2RlDQovTGVuZ3RoIDEzMw0KPj4NCnN0cmVhbQ0KeF5djDEOwjAMRfdIvoNPEJygNmFEghEkJkaUpiZUQCy4/0CrJB3w4qfv/2w1LYNt+62vZIzvK34Zr5hB4QdUKxq307ZbyPWrQuS164oCqjhUEpqB6B/qybZk/UqI8T3buDnvT8ebBM4sj8SJpyfncZD0GmOUlMI9DHnCg4C6gPoBrzIuPQ0KZW5kc3RyZWFtDQoNCmVuZG9iag0KMyAwIG9iag0KPDwNCi9EaXNwbGF5RG9jVGl0bGUgZmFsc2UNCi9Ob25GdWxsU2NyZWVuQmVoYXZpb3IgL1VzZU5vbmUNCi9GaXRXaW5kb3cgZmFsc2UNCi9DZW50ZXJXaW5kb3cgZmFsc2UNCi9IaWRlVG9vbGJhciBmYWxzZQ0KL0hpZGVXaW5kb3dVSSBmYWxzZQ0KL0hpZGVNZW51YmFyIGZhbHNlDQo+Pg0KDQplbmRvYmoNCjcgMCBvYmoNCjw8DQovUHJvZHVjZXIgKEV4cGVydCBIVE1MIHRvIFBERiBDb252ZXJ0ZXIgOC4wKQ0KPj4NCg0KZW5kb2JqDQo1IDAgb2JqDQo8PA0KL0ZpbHRlciAvRmxhdGVEZWNvZGUNCi9SZXNvdXJjZXMgPDwNCi9YT2JqZWN0IDw8DQovTkFNRV9pZWhlbGppZWFmaGpra2FkcGlucG1uaWhwbmpsa2tlbCA4IDAgUg0KPj4NCg0KL1Byb2NTZXQgWy9QREYgL1RleHQgL0ltYWdlQ10NCi9Gb250IDw8DQovWVFMWFJEK0NhbGlicmktQm9sZCA5IDAgUg0KL1lRTFhSRCtUaW1lc05ld1JvbWFuUFNNVCAxMCAwIFINCi9SQVZTREQrQ2FsaWJyaSAxMSAwIFINCj4+DQoNCj4+DQoNCi9CQm94IFswLjAwMDAwIDAuMDAwMDAgMTAyNC4wMDAwMCAxMzQ1LjAwMDAwXQ0KL1N1YnR5cGUgL0Zvcm0NCi9MZW5ndGggNDc4Nw0KL1R5cGUgL1hPYmplY3QNCi9OYW1lIC9OQU1FX29hZW5lb2hnZWdlaWtlbmRib2dsZGNjb2dnYWZhYm5pDQo+Pg0Kc3RyZWFtDQp4Xu1dzW8ctxWf0fhkwLDikyEEwp7SLJrY8/0RtAGSWiiQNoHjKLXjVinc2unIpq3EiRUggNqzAR10LHTxH9Cz7/Yl/mf8EefjXpKzJN9bkjtcaopogsaRdvWbnd8+kr/3+DhDcuJzMftvIl6TOM3F2ywvZm/v3phcntw5dXLyBfiJ9c/dPnXSTEDQgVihsQ61p05ePnVy9m2J4Jp7vfsPdm4xO7d7pd+Qqa8WX3b3xqmTn1GyyYf0F/35v+n9ptP/3908dfL8Jx/+8cqlC7/e3L5948sPbnx9aef2tTsXP3p/c5KUszM3qX1lnp5jX5yWDJ1sXte/QLyysk9eD6LpZLJ5k77doN8yK9zPWcDfXSPbf7u7/ea7O+T6JBXsrGxJ3BWNN8+saE0ZVzVvuqZmX5GkRd7MmjVOqiSZbP6dF/NquB7eD1fCrXA/iIIz4V54EB7Sd6/S1wfhPXrkMFwfTVWk/C/nujiGzdyj466ty0aVDrMvIWLxk9WpLE4mzr8tXGYOJwjvvGmGAx6Eo9Km5YxJmgrelLl4J7kgWTyZ/P02CzXnP3jn/Y2/bt9ob5Cb2zeufdbevHXr2vXPt+98fvvOdvv5nZvk1q0bZHJhB5VZlDuRZiYNalbTATJ3IK3AATNsbN1L7/zpowtSuZOkhm3KtZokVaVaNSnKupzMv7JWfZNWV5rnpXDgr8L1IAofU0fdZY5L3XWP/r5IHfoRP/KEuvRD+rpCf5izr4Rr4cECWRy76pn5smv9TF6P7o6reM0yxWPNX+RZNWv+8GF4nzbsXrjLm/4qb/JVHsUfUEFcpH+dpo3+l9cptE/fXOU6WZM6Wad/HVCSfX7iIT9+KKhm6MrsdZef0X36Pv3Zou/XwwOK7XTdRLgfvUe7juv03C2Od7+pcfQTT2YaXBVdDDtXdTHc0BXOuLYwbB27BhTuWxSu7VcWRSzar2u5PVapvMJ26c8DWhE7sqqpG/PK26OtCBp5jX6I1d3FWRtscaInkmqVtVt0ZdYe7IxzlLwjxgJhLOwLHvGWfsK5WVLAtLHGTbqoSWyFchzSb+r49mESQWMR0xrhn+q09pge2eGfPM3PPuA62+/amh+lvONs9QwkGotbPYsr2eoiKDPXWOVVgquwcxzWTPcoukOPHc4qS1SpasxD+vrtTDuP6BlbM8aOg/HSv7vugJ9JY8E+IwateZG3BtcSV8yn4V70cRCJGDCmdin5yMS5YWhv8edxFa9epnhv8twqrYXuDri7iSD/mDc+YYE9fDwu96uqeJl66EsKYmUVLl6uHyD4QFzD4sVG+MgJf5J0r0dM+Y9/OeMm+XnLWecQNoDG6ydf0zxu8h61eXKT/WL/Lv3+1EnOLC+aqKpitiQ6TNk/OtVdSnHjNjNLqwtfXpvN6sAA3DVqmQW8slVBlZXwXGguGHhazJU0EFy6VUHdC3EwW3IdXraGMjOzgovYk9lqNTwwCLskcbI8PldnTZpO5l+Zp9MaLdTZ3dtGdjWZ6E5MlyFBY1RYxbF+gCyoBkAEYedLVCjQpV1+EpdOgY52YkmcNmKwf14N11guF5zlmeEKT68XDuqPjetUcSm/MYetkusw8fYcxKxg+XZJZpvREB+CW3L0m20QeQ6cDlkMNGuzGNBA2CkvM6m7e93sT0/TLC/ltawNPqZdH4WQUbRAojDhS4uiMXMD3FdwVsPRgUHYoZ77TBctjKoPdiOx6QBZYHZlwZcWdcXl4qxq+q1ZXmRC1JeDq8GJ4HpwPvgNjdgngk+DN4I/8Pev8HefUuzt4NXp2KJ3Ahsn12HiHb0Rs4CbqvQjttms8AGoFUWvzYbIHSM/KXWcWM2VLAht/eJ2U7teg07oexm2L4d7NP9g152eUFVv0PzkHr/qvD8dXSBHAjHhxD+QY/EJ3Ft8VrvBX0OQI2n32G0K4lDcyGaobpvNlRluPUP4EgJPslJcNoteRE/pv2cRiV5Gz+m7l9H3FHsZfUcRdqT7/XQ6rhDeVLBlcg0lngEc80o0a/x4LQYDeABmSdFrsha+mxI0KKCE98AtxioOiLaewZuPTd203aTiBmJwht+922L3A8YcurE2DDDxDdxzqpOwr+psRkN8CG4o6R6z9bCNRA1ZS9ywRosrM9z6Bm1nYcd1Uop7bMEFmltf52H7KQ3XT6Mf6e/vpiML0Rm0JNdQ4huiEa9E49SP12IwgAdglhS9JushOkW+UGowsRqrOCDaeoZobreTkuO4jk0hml0B7CZNPOhuyQdnw745esdH2ShiQKUYYOIdsLEGJeyrQZvREB+CGwq8x2xDwIYSh6xQ4zaLKzPc+gZsZ5nTRCQWMqeB+ocFIj5uReW3r12L2nP/+biVjd9Wmbg3Y5apZgzeCtpgY0SFLX7BDVku2ZBJWsuG5CPd59HLsXUsdQNrPtdQ4pkzYV6Jlv53ws0WA3wIbsnhYrXTnVh2st+N2LqBORysAJhxWSpAsZQ2mQifcLwJW/NLSi73YNOykgPms3zqK5tNtz/yO7B1CZsj11Di6ymIV6Jp7cdrMRjAAzBLil6TdVUXwMUAZQGayGKs4oDo0nF+Jmc+2HYJ87+Em65YCwZ4aS00RmYF+6rMZjTEh+CGEu4xW89XkIghK1SxzeLKDC+t49n4wVHI9DuTQl3I/CT4NPgqOBu8GrwWXA1+FVzn91c3piOLyWjCYq6hxDcmI16BVk3ix2sxWMEDMCuKXpP1mJwgZyg1mFiNlRwIbT1jMs/fJw4xOS6qNDbnGG93c/r53K/1cV+mx2oxwMQ7amMdCthbhzajAT4ENxJ5j9mGqA1lDi2GOrdZXJnh1jdqu0mdfmdaxkLp4QqN21/RmH2WxuzXeNR+I/gmeCu4MDZlVzVsilxDiWfgxrwSLXJPXpvFAB+CW3K4WO007GQn+w07qxp2JLACYNi3VIBigehRhp0VH786DDvjskkK0SV8yVdvso5gh3cCYx54VgVskFxDia+vIF6JJt6zMI0GA3gA5gTOwFxosq5ruQsHtioHQrUYqzgg2volORVP+icuSU6dFVLRbHXhRb6K+JCvPhQ3tEac3mCdGOClddIYmRXsq0Cb0RAfghvKu8dsPb1BAoesUOE2iysz3HqmN+4iT7tTxSyEN6Lvohds3i+fifB8dNPEqgQ2Qq6hxDdYI16BlnXsx2sxWMEDMCuKXpP1YB0bF44omFiNlRwIbf2CdQlXWC4O1lVapVLHNEATlnhE/6Yh+gIN1WyTgJ3p2AI00oYBJt4BGqtOwN6qsxkN8CG4kaR7zDYEaChqaDFUtc3iygy3ngHaUdgsCUlTuTqDrcDYoKPPE+BdFJwJztOR6DdU7c+iK+O7BVqi9Y65hhLPkI15JZpnnrw2iwE+BLfkcLHaaSzKTvYbi5YV7EJgBcCAb6kAxQLRo4xFSz6odRmL5o3ac+ptvn/MwchHoSVaXpZrKPH1EsQr0bj047UYDOABmGPYKAtN1hWdAfcClBmQqMVYxQHR1jOxSZzWdrAqbNQs4dnsyUDsrxScCFfpvy2e3uyGh9OxhX6kEQO8tEYaI7OCfdVnMxriQ3BDafeYrSc4SNyQFarbZnFlhlvfBMdN4PPTKp9Gz5xmrB2PonbTKh2L6jwb73iUrZtWWbrGqTwBsyrZfe0zIypr0SxR1pG1Y7lMf2OeVfliOrJcCa3izDWU+OZKiFe8L0rPyZoWgxU8ALOi6DVZy5WKBnVGpQYTq7GKA6KtX65U8AG3i3bjLKsTlSyxPTtX+eSE++J6vUiczvO9DMebOCHBGGDinThhKQrYW4o2owE+BDfSeY/ZeqRGSoesDW5Yo8WVGW49Eyd3tZcNmJqwF5KxibhAyzZzDSWeYRrzSjTznGtptRjgQ3BncLZln9VOF37YyX4XfooCdhvAyAIo3FYBigWiR7nwU/ArSE4XfvJcZqEn2GUf3gkcsDnDsy3HZx3AWbgj8XRc+U2BluvkGkp8HQfxCjSHe6Uuw2sxWMEDMCuKXpN1kafGCfoKJlZjJQdCW8/8hn/HpH+Mxc5LlLrv843N98Jv2WpbeWVIbVk+24Mbb9a8z9/Ndi4PT/MdtMGOytOx9SFIWQZ4aWU1RmYJe2vWZjTAh+BGDtFjtiERgi6BLDaveUK0lRlufRMhN7fgQ1Z+qliY++OINrhBdWla4JTD1WZLaSIz8kq08J3rabMY4ENwF6aZpDZmp3SIneyXDuU1cCpoJFKDpQIUC0SPkg7lbo/UoY5RqRGCelyS6Bju87B/OLr0J0erf3INJb6OgnglmiZ+vBaDATwAs6ToNVkXdW5cdaJgYjVWcUC09Ut/8sx1Kn5SJ3Jz4etUxYchfEKISdmBeHTMafDcCrY/CVuhsjYdWw+BdGSAl9ZRY2RWsK9CbUZDfAhuKP8es/VkBzkAZIUeYLO4MsOtZ7Lj6ATz1+fZrn4voufTkQVwtBAo11DiG8ARr0Az383tLQYreADmzLhtvpFYD+CyUXAAlzCxGis5ENr6BfCMZ1NO2o3jvNAHsOJhP+yKDHsiFHw2XBe4u/GrHLEG5/mkN/YT8fk99/jzuPbFI4P2+FB3XPkNDDRIbgaYeMd5LGQBewvZZjTAh+BGXtJjtiHOQz9BFsOUxmJxZYZbzzi/jK8kWabi/A/RT3RQe4Xdjx2bnDO0oi3XUOIZ7jGvRH23sbdaDPAhuI2Pe7AxOw1s2cl+A9usgt0PMLICWrdVgGKB6FEGtlkBlq10B80D25S2UGkb2NIeYYX2B/zZgtNxZUYZWkOUayjxdRXEK1HZrkvyWgwG8ADMkqLXZF3WmXH5ioKJ1VjFAdHWMzPiQ4OJy9C2qiunoe2O0nYQRf8Mz4X/6Z55eeK3QSSmM4Cr/vvimZj8eJdH7XZP04z+NR1bT4LUZoCXVltjZFawr45tRkN8CG7oJD1m64kRchPICv3EZnFlhlvfxMjNVeYHwC+6f9ORhXm0EinXUOIb5hGvQFP/bcWNBit4AObUuP++kVgP8zFSf6nBxGqs5EBo6xfmUz4ycNJuUqiFKf/zAfDOyPIgGGqQ4Aww8Y70WMoC9payzWiAD8GN/KTHbEOkh56CLIapj8Xiygy3npF+CW+BQ2D2CBP2QJMr0ffR92OTc4oW0uUaSjwDPuaVqO+25FaLAT4Et3FDfxuz0xCYnew3BE5L2AEBI0ugdVsFKBaIHmUInOZgon53cP51NgROi0o884fPdV6jcX6VZvan2Z4703ElRClaKpFrKPH1D8Qry+e7vbLFYAUPwJwYd242EutaTkGDAmNT0JwWYyUHQlvPhIh7y8Rh3JvnBZqgcI9mOg/Z8lyWwvDJaWvz0ubD3i0+mX+VJjgHYD1kuMLB2QMoxje+xaoywEurqjEyS9hbrzajAT4EN3KGHrP1rAe5A7Q4xQ1rtLgyw61v1uPmEvPj22fRGB/WlqD1FLmGEs9wjnkl6r+LstFgAA/AbNxe3EishfOkRuovNZhYjVUcEG39wnnC034X7cbwBu+XIXvSJh/N8rHpomjeRW8+IO4ezrnSHR5fDMdSMsDEN4bPiVTCviK1GQ3xIbjNO5QvdAFQb9AHICt0ApvFlRluPWO4ox+wZezTkQVstN4n11DiG7ARr0T9N1A2GgzgAZiNe4/3EcfnmrTIGzY4zbMkx4NTdvJsKx65d7Hb4DQpjEtUFEyspVccqU0gX7j3AHx46zAqpfGfll6/kRVcpq9PRFTvv4w5HVvUR3o0wMQ76mOlS9hX6TajIT4Et3mH88TDj1h1zjtSKnPyhY4EW8K8VgG5kq0OKjPc+vYjbt40Pxb4KXrBpntOR9a1oCVFuYYS364F8cpieE+RM9qr4KMTG7dGt9AqOaRNnLLXIqY5Gu5W6tq3V0mQb5YaTGwllxQQbP36FO7B3AmkaudexaAiaeLYvU85Q4cXbJfmPb7od3R3vrD+DDDx7kmwsgXsq2ybzQAfgBp6Ta/Ni9xG9SLSb5bvRKDjwPJDz7GUvzKirWcX4uw8qAdhT5V+ufDBpYmoiLm7IhpMEIx2azeBTuUU9cLKyT1tkheimH0XHmj1FipGXAXLfcTKZzWVim0J8AAsmd7iC4UOaNw4HW7To6vg9vvhjOs+v5jBrkw84SiNLJThgF+12OW33Rk/fUc/w/eaCQ+ijyXrPb7m+oD+hrvQqEvV/MrIHv37odipAFFv8d1q2LWUNTGdi5I+5GbusoDIb/Zv8a85nM0l4OaPp6VTp6E16wzqVNz26p45RMt8jl8wwlv8gJbbX3w/7NhURJW610TPLmTHqFC1e6G6zl4u8uNaP6ANuM6vF3at2zk1uzt02HvtkHlgsEHHl69I/zzH/VaKBRI8CrutYan/dKcu1hfXFf3IFp9hw9z1Cf17Zbb0REYLSyOJn/8CBz8akQ0KZW5kc3RyZWFtDQoNCmVuZG9iag0KMTAgMCBvYmoNCjw8DQovRGVzY2VuZGFudEZvbnRzIFsxMiAwIFJdDQovVG9Vbmljb2RlIDEzIDAgUg0KL0Jhc2VGb250IC9ZUUxYUkQrVGltZXNOZXdSb21hblBTTVQNCi9TdWJ0eXBlIC9UeXBlMA0KL0VuY29kaW5nIC9JZGVudGl0eS1IDQovVHlwZSAvRm9udA0KL05hbWUgL1lRTFhSRCtUaW1lc05ld1JvbWFuUFNNVA0KPj4NCg0KZW5kb2JqDQo5IDAgb2JqDQo8PA0KL0Rlc2NlbmRhbnRGb250cyBbMTQgMCBSXQ0KL1RvVW5pY29kZSAxNSAwIFINCi9CYXNlRm9udCAvWVFMWFJEK0NhbGlicmktQm9sZA0KL1N1YnR5cGUgL1R5cGUwDQovRW5jb2RpbmcgL0lkZW50aXR5LUgNCi9UeXBlIC9Gb250DQovTmFtZSAvWVFMWFJEK0NhbGlicmktQm9sZA0KPj4NCg0KZW5kb2JqDQo4IDAgb2JqDQo8PA0KL0RlY29kZSBbLjAwIDEuMDAgLjAwIDEuMDAgLjAwIDEuMDBdDQovQ29sb3JTcGFjZSAvRGV2aWNlUkdCDQovU3VidHlwZSAvSW1hZ2UNCi9MZW5ndGggNjM3MA0KL05hbWUgL05BTUVfaWVoZWxqaWVhZmhqa2thZHBpbnBtbmlocG5qbGtrZWwNCi9CaXRzUGVyQ29tcG9uZW50IDgNCi9UeXBlIC9YT2JqZWN0DQovV2lkdGggMjYwDQovRmlsdGVyIC9GbGF0ZURlY29kZQ0KL0hlaWdodCA2NA0KPj4NCnN0cmVhbQ0KeF7tnW2MVsd1x79WQqmdIMHWsDi0eANINIpRUYITt44rv9T+4IbIiSwL2UoUyeAmkokjy7aE1NaSJfLFrfLFjlE/0CRkEVFTZDdGIESMtEKmVhA2lWEjMBAvmC1gw4Jx0NPf3D97OM/M3JfnYQ243Kujq/vMnDnnzJnznzNzX3aPPTvjWEsttdSAxp6eWVaYrWoupAn13bAPqtU11osx1cxjffWLVmOX4ZCx3jtYXTL2dG8OGZtq46dWoI9qWRtRWW0Z/+U3N8NqOZuQNa/uYBlDteXZ61rjsz5pMgplWi6TqlVXNKllqO3OZZZXUJMmx3oX21JL1wO999RFSn/adVQSXfz+iTn/ePudonVDQ+sGF4bz0NDPvnL7rsfmRUJqKdVbyxw1aShhrBdF1c2zovqQn+1OVmbF6NTSWO+GTQn1N0xNmGtFjfWiqw868uTAxfgn+Mtp44L5fSCipZauPBHSvdKhJwZ++v1vgoJfL/qCxfxL0wch0kE4d8NheN6C3z66sFZsSy19ugggRLlg7Yxw3vOTH5w9duSPp8fPH9x6caXUTWSHWuEttXR1ifCG0gv7aWzE86++vMBHOFlg87IvgoKOO8BFmh3WzV/EzsKL9Rf+py9Jz1nyRtq5mr+ssMwzUW2qPcuc1ZJ2NrrOGhaxldmZ1eubVKjzAiuEZEtSD6SctUJ8w6h3ZaJ8eWp8lrnCmIbEOmfHLbOUBS7R0BC5oNN95LEwuBDU1GppqaVrmZjPR364JI1tAv7km7/sJAcxH0OmIBZXtbpaaulq0YF/+LNqYl0EFtLYpoSYT4EAOrJJYV2xia5V15xS46OSJr1rQlMl5xoXPiXM2fI+xqVJcIqhicaK5s2bAITxH/9pNrAJeNZCERDYOGQ3zhdp/qLRFTfVGtlSS9caCQhslrMLHgojLACEMmbDwjvfm9UfHKxVr81He1enJhUaR1dMAaKbC6nmHL08Y0Yvuy99SBjtS+noiilwe7X8LAGE/avnlq38hQVSACsi9s6gAFzwswoIDgst1VLrqGuEGAiAkN0meCzo+ZpRFQocFtpRLqN3vzsdYoJ6+4V7Rzc8fnrbMxDXjMUflt944OEZres+UVJwRjTywyVl2wSRHiuQCw5ueq5RRiiIFVRWXUvQ0ZUDJNmPzp3tlBwTE2f/9+W/qZXT0hTSbx9dCBAI9TIUENLRrVTtFGqxsOOeubXar0NiRooeVlYc5y9c2L/2QdJHrdiWeqW9j86G7KeAAGVvoure0YXzZ9IxIpVUpwZqX3toienShddeVpIa6a/TkrJWVpJtbtojS8r0plqywqMmUR85M9UT3p0eD5avZboiY7I/I3uyJWVtyySkzFGTrJDUgGxtRdtIQlSeNTuV7FUYaXWUbpmVDs4f3Fo2OhW77ItJ4ZZZwkJLRieHl/UBBA72DrXCW+qb9iwftKQQhTFAACPpuxZ2kOJr986ABfm1ZlwnhLcBQqeXg62EgDO+81/2fvumWhUt9UoMipGSQnT7KPtMLTpgqF0gAQSv6zqnA6u+1OnxOL5mEXTi8G7agoVaFS31TSxglBT8LrgJEJisqhdIeltj12Pzdj80aORV62dU2JCsVdo8EpuVbzwVtc3Ly2op8dHLFFRxv6js0MSFHLDQ3Jg9zaytFVImsNr/4UblPy/FYM5hj/Ptmzz/7maW725gW0NprC3f+/sbMMaInz4GoDe/NUdJwe+aoyfL4duE3OKWTUTtAum9p2aSF3Y7LBiFdN9NWbaoyZE7bxDRFxHXo9+YXsavCxggtdI1F6q1c2QAP8Um4rrCQhMi4Z58q9ENj3d6P2y8GIjD/3SP/ezVe1eSWM6Z/WS0sgG6YoR/ztz/J96roCPisaTgZ3giXJvlg5ueC7dYh4Y4pzeRyt7QNkAdemIAoGVtA4PhRsqpUU/sPlgMZPnffuCmDx/5zP61D+4b2YBtXQ0PbqWQKiIWtqgho8C4RIqg8VWf8wOkWAIsxxdP+2jFZwnak2/+MlU0uu1FLEQR9kfm4epDh/elijT/7C6moOyNuNrDtAgL9vOd782i19gTnsoV3c+67qrQ6VdWmv34LR2XK0wpFvzoM5o+KUSrHdZLEKGuQi7SHXT1exo0RyxJQYoiwjlETic5zj01M+Uk1Y69/y65qfrey8lz5wh74tk3xwNHz8QRePrjjynHG8a29+4BGjKC7596X4rKdFH+4ekPiD3fHMLytAl9xH4xEMadvg4bLGHhkmdeuNezHV05YLquOnksMKtcC4alWPC1u5bdLCBEm4WUUiyQ+KoWSENDyGSnkJqEUs5Ykk6SxGEUyUeeHFBwdhofTMUmhCE49uyMlOfIO1uY/2VJ0HLnDSSpiYmzzRXBSY4AQdap//mvH6dsJ4eXGU/2iw9/kN0AaVpu3qBrHgsRuN797vSeQs66H103IfgrmlAVYaGauVZXNUOThlynWDAGLmyBFO6mVrxxXaSJKHSr7yBJJklBTkuJfNRJDpIpYSkGQoiFSn6fUjlvc9BQchCShigNCVFTBCgIwqyc2gTBIpDwkyIyV8RAYLPcokqKiOQyOSJtN9L8a05TXrCfWSyUOfwKU7pGqm3ySVM2L1htQyzodlAUEmULJAp//8QcAeGNB0oN877SoXcMFDmK4TQIKWFKDy/nFLcCwjtsuYmUfQehjv+J8zQCabJ/5cWwgQGBqQR4mM1YiktRloeD1CBMsVZP0xyhKzNgwBXZzQLLLd1vYSEktv/+u0E6yHrPeMxpnyYsbHvGDLsWsMBAZPOCiGDev3puQyxE0ziDkuU3IOitb0a2jNJZlIPdsYKB8EiBEFZQTw68vXQmSBERydnnVphHLaII0XSzQK0WSDBkMwKKsEQSRGWQYZTFBmpSg20lJiGd3EGrrH8IHlahyhdWKCzYzxQLFQ4XyW/h7tbdIaPh6tomWaKtRHHhr40hwkK1qFp1TYi+yJhUvsxLsWA8PWEhetaQ/ZzTgKCdeIXZmJfO5wfHjgLeNx4onWMPPDwj7T47VkRFRC6QZwjRTnIQ//JYdisBEAjgVBGgSxWRF6jCz/4Woh2kOR9snZIDZ4oN7JAuvVLGyw+ux8LI/Z/vCQtI+8PyG0O2PTWKe6GQtkDrmkWGeumip6O7XocObnou/N3RffvhFAHPsadnIircx97w+KHD+1ROIqazGj5RhAVciiIE0oqsx1RjzFLKOdzEW7MIC7Eq3LLb9TrXlFDu5yVCMZi37UXOhEpgeGcLhmHD2y/c+8Zk8EsaYy1m4oQS7y6PBRZIHgsVe+f0S//obqoWSwYEJDNSFcS030kOwklxlc7AYfm0em4qh14AdhY8ev9fxE8GndoQS9teTBUxFpooCPtUEVsAeT7SlVVEIZw4GSCnopRcMEMSym6oskySOkIFfGEVNlgrT8KC/UyxUOZwpEl4Z3Kdibe1DOMnOTo8bbl7QMwV7551itUj8Zy6jgM5JsRjAbOVnW3zhRCiF6XqJq3ee2pmp+SYODGOn60vB/a8ZVW4zq7D3YwNj6uzDLGtByxfRzaDBZPpNwvjyQsYXZT8+Rf/RafdPhWxmiobESPGpdN9YDAopgr/pCmD+cecXEE4QWhSBBKi3lc6cBFIobZiVVMh3Ms3IuY7yaH84ptnX8/GBjYLxmZLIyWLyIZqLJA3yyz3aSs8klg8jUICzMKDCz21hD+a98Kzm9VzaTUx0fXEPCw11ywCgH4eYPKRUo8FHXrhHAZzu8ZC/BJCCbrCwD3yGS8W+607zPOdkoM5dm9xy8VKiKXwBsviaWiPhrsCC+Mln/CsTf7qhf/MX7UeCP9591/uuOfiHM6FKB3TTvfx0bmzsi27/qePXqAXVaYCwvOZ3fepUUVCdv3PAsALrO2IqlI/cxAMHr9hlVVyT5W+MxH5yGdbRFSE/fvwMpVLNZmF+DdLUix4I+0a4fbiB73GKpWHCFk915oTb+zFRrrDGGAK7zu/PscvOOnv0ZUXJwQw5V8sGUmwADMTtdzO2Sdr5KPU0ErHYcA8TWUefeacFAto15I19HTFZ30VZpjeaB1rWEBdioVsamAtFE3j2iysLb56tnWRB0I1vfmtOenMT3qVE9I9Namc2bJWbErZDwQYCO2+/Y0aHYSf4qQnGkkm0k4x+uA34nx39apO+cH060HH8IWPPYslE+sHGaa8YDxlWPC20VlDvZZtngGxNv3iEA2BjxlW4J7fnEZA+nIfnyrxWGBMgZImBKoIcsMOJhG9FKIaU63volRspKszef+ceU/zv48fvOd9QuLraviN6Vbl53Oj7PcLgNcL0ZOFqDlAoMT7p4yymwV2SbiL7qeLanonHzYkW8Zk52E8hiLm/7SKmKkQSytPVs5ApLeq6AWejyTsKm6KdsoPVnRMFL4jyl+MqWzrFQs7ihizANZ6PmLwkc8GM1tiZK8KkLB8uZ/qVeKxQN70Hou2hExZqdkQ0PBvJlzS5bDgIbn9b/+cDOXjR7cTjQEbfCR7LDCH2wsYUXbQdkCU/lkw0oRPB5YRMKaaZE96G5PJQT7fs3wwTRm6b5kVxZTCoEQU3s9ZOjMbokQF7tpRgkdiQC71pOUBfTz9ykqvhZ/YLBvS7BNevVg6M7W5yau/mIFY8XPm+tizM8gOGE8t8W8CUyxEGmnr9zJMDpLsTfIPegjaKIzpo+e3WMIDvtxjQSVeCC7SQshi0tcyDcLPeIVl2OJp7CAYQayKXtG5pMthAU7fl/0ru1bF7LLNjVLtH7wKC9bcPuHJIgIUAIp0n4tLI84mQNg+OTrpzE/Q4gpq6UuKBS1dUlFRQrSDpEnt+KrPpVXaGmNDFguALgoVUVjqJwsq3dqCP/vqKYVZUXvu+2rtB866jRA15yfhx9LCl0efQrBOSL3t7xsTYClCmZaNgbGmxOfTKcGC5h/Zo7OvZW7cXmCh+iXerC5Q5s2IdoigxpSKfDCDBd82u0yKKA1dYsbyAmjyAmtp12Pz0llU8xXEnJBRV6y9/SByDWVv6evuTdRrOwgGeSb73IGAx5lpEGYRJ1htd+FhBwanYSkiJEa+80jqATv0Jy+yOKKQpM9CSz+3/vVfNMGCf8BEBKYMPi+wOwhJsHuN5Pn7xoJnZux8LRDAkx13EA/MMxT6W0nW3M/t1Vhg4KLORnnBqnAmlF0m2YSfXXKHu8QHt9KF4bvuMDkNKX31olP89QDV4qXsjevw1sTaB/UMhfOhJ8KCM3OP6MKFI08OKNWmN8mppUeoQBGjkw1IvRGhh/Lhc7yf/CBrD2zhb4/fdnN2g0MtdpZ5IAzZ6lVlcEB1ttUbD9ysOMSBVphigb6jeufkpkYuvXSn/eDWdLz8zprQitABFjyzx4Iv91hQiY92cpPZI5P8fgGlXbd8CxTgW9g8FkxXhAVvRjSXcs1AW22kFyxErmB5U5EUsns9nLb75bVESySqCaXvaZ8v3klTbZg0ut9D9gdjSmRyzgaSbtyFexG33Uw3s69eKLloULJpRXJIEMSz1ucpA1M3Rl507wv3pjxhn3tbPqStmxVwAPWeOSzD3D15C8LNS+dlsYBqBZ5Qz08LAHxiAWmW2CMYfKvmU44F3bsTTpFPfNpKGJOo8mEGg7qAkF6xEM2lF+/mTUpjGeaRkmIBl0YvYygjQOnUShiAgtceWhJaLZ0Xiaql8IFAsh3AeI2aSGNXsYrIHriUZY9F4LncQ8xwz6FgkOXZh8W1x/HxEz/9/jeZQBDCOftc25BSTSyWyp5Ea4+880erwvdE3a4gLZqECAvsnY8XHyIZja4IzGyfTQhLR/NSmDTcEj3czynisAIL/j6SL6/GAt0M93IL4eH5QvfmF2a/CrVggNNPaKbLr34jLCA/ej6FZE2PnKObNh4LimdRek/Jr47w5Ni+/b97/nlDQX9UdvcGOz1bGI5tz6Tb1eyh73fCDczbblZbKPvGncbaK2K60B3LToOD+XNk/UaAwMpQHoOARsSGr4jJWleI2Eozsg0/djt/apRsYm1fXXJLkz8joDDwb79zrQ2XPXnnjMe2FjkoxYI32OcFK4ywoMLouTPew/+En48rLNF4eXTAcKT4FDd6wTjcX1o8DcnR3tmbJ6xF+zts1jtLne4DYyqGhsFlGcx0xKAzZ761ZTsXW9as2fTwcs2El0Ohy9teTF9v03ye8odPjDc8Tr9IoPZgEdJLZRMnxvW5JX6LmvOTVpEWPe7PWqU31hCoN9bOF+/MoFHETIgfcAIo+NWXFxCBm4vR50yJ/lqLJ/xGRNV6wwhRICK84XAi/+gBFYRHQEGxKPVtG2IBTr0a5z/Zo6e4hQsKidLNk9PI5u4wZqnvNdoKBLz4cj/5qAQhqGAgRu7/PO6VOj1M1wNEJAunMB9dOdBpcIQvjruxEEFVtLf4liRdWkSzq8cCw6qR1YWuL9V+bak+80zZmlOkiETJmpbYM+InwZw2McJXLC/BhTXhJ8TgevleCx7Wu3NeC+co+2yeHP1XJ8ObrEd4R6T/3ksu2HTrUNSdiJPEuuuxeXsfnS2ZZX6ocNSOYqdDhIsw2+LTe8ZaURV9QsvW295V0BuYMgbjQyJYPA2ZRH74PqJ4EBMe1xYPfL1PGCb98QrWaVx7jRSGv3W86kuUe/sJ5tHiLyRTJVM1TEiWnVz7fmndsrlIzepj2ERse4YEcWDPWyxCgL9e29CzhvChyisrpRRdCJF5tPLm+V7QkAWDpHHWx7/IlCgoavspJUYWqmXrgyzYNAlwFkwq+K3VJ2RSE/rNklvt7Euq+Y36sLxhFEVsm6c69ioEZju1+dMf/NcgeVdvunoo6Imulp2fnN6pkqzZtaWWWmqppZZEv170BSi9yP5MyYT4i6h5mS7fqj/Vni3bPBVSKzZtnvYxqzeq7VVRWfdrOxj5s6w2ZUt7l8rJaqwttKrqXjT3UpY2ubiqlVPNtukyzGippZZaaun/K21cMP96o+HZgyPfeeQ/huZF5ZS8dv99mx5e/urXlvry3yy5Vcw0VIn5jQs1EYPKuUZCKse00yQtR0ta6AdIYr3ZXlQ6lNTu/NEqszlVlDaR2WkT056qsEKWGVHtv99wI9KsXOoUdXJaquXK0PUZ9ikN33XHxInxD9b/29ljR3a/vNZXje3bTyFV765e5UNuYiI8euaC0Brd9bpvcvTMGTXZc99XzcPr5i+Cn8LwWLybH7F6gWHHLbN8OYGBnGrLaYvYX3zxr6xEn4tiFarR9bOv3G5VhCglVNHEo4xySobnLeD6+PgJzLYq2PR0m4a/e/55r5qo1hN5Lnw5DsQA4fHD0x/4TgET/CY/c/atEKXC7IzU0hUjhpsh2FgMVoSFg2NHFRsMkKLFyhk+WhGxb23Z7psw3IArUkG4Ur5xMvCsHJkhQk6EV0dG1m/0KoQFX5IStR4LGAkWTn/8MUGoWDUswPn+S//6x9Pj8AATH6LeJI8FmhDSlLw0PbiFacHrxbxg9sTZkGickVvWrEGaUExbr4gOAquNBY5o5TuCwejCtmsNCGGArgjRfaYCxujKE3qJAZnBPLaxCCS93uMtZA5nuBlTZkVfTmBgPCPOmIIFIUXEsBIMZIewtJgsXDc0FL433/MW0kCQlW8sZnIkSJoVbnRYqKLZg8KClSCNkEMRF6QbsGAyOaMIfrrvheAHbFs/dyHXwoI1UV44dHgfZmOhb4Vn8Al9wRWYYeVoRz6FVBkWhiedJveqxEcaVXLazq/PUQkD1IRqB7pXUm7yPb2uCCww6AQDsx8zp69i/n976cy0CaNM/BNyXNDKyhFC2CAt4meNRDmBgauJIiv/+ZyFBPz54o/Vc/ZBJSwwhZaZLYqwwGgSjcz8lKPRVxHkwmzIg0UOEhHkqGbyRztmGBaGC5gw+dOKWPXdDElnIsjXW23eSCQT8PQUfKnLVoW76L6a+4kCQgvJ1JfAU0vB5krntNQr6XsBkjtRGmGBUGeYmE6JBM2cIgZ6uAgVIoFaK4eHuKIVhVo8iJifiUCGj8CjiYnSxBsyVLFS8jM20YIovZNGRHntRkyt8NjkP1xgAX4u9BWMr2IahxkD0EhnrRyrYCbasRk/eDzCHKK0iHCfpPCYthjDBbJ80kSIAl6v13osaHeDakSFbOI6QrmcRm22pypMz580oeVTRJdpsLpMzBBFTGhMpL6WYCCkGWvOUbkuiArlFNG6wVCiJsYDhX97SuadPagbVlaOOpXTUHdsLhlW3PNBDkS4Zo3Xwhvh1peQku66g2sCjyprqG5iEn3UnHxJUQEHysMCZvagly9rYZCdVo6p1msurKfypKrUJLJca0Jv2PpJf8pv3mktXS1iuSLKFkblnqFMTlmTMqVRE6sSgiokZH+WaRcKUoHGDyovMc8ezNpW1rY59dHkGqHIIanDo4soGLKtytybLU/FRmffpExCxYCWacxe92R5BVskKmob8VQojVSnlmclWFWZqDI7U6uykiMjy5gjtvSn568o8c2zBqT8ZbXRRUsttdRSSy0ZddqjPdqjOP4PnNMFsw0KZW5kc3RyZWFtDQoNCmVuZG9iag0KMTEgMCBvYmoNCjw8DQovRGVzY2VuZGFudEZvbnRzIFsxNiAwIFJdDQovVG9Vbmljb2RlIDE3IDAgUg0KL0Jhc2VGb250IC9SQVZTREQrQ2FsaWJyaQ0KL1N1YnR5cGUgL1R5cGUwDQovRW5jb2RpbmcgL0lkZW50aXR5LUgNCi9UeXBlIC9Gb250DQovTmFtZSAvUkFWU0REK0NhbGlicmkNCj4+DQoNCmVuZG9iag0KMTIgMCBvYmoNCjw8DQovRm9udERlc2NyaXB0b3IgMTggMCBSDQovQmFzZUZvbnQgL1lRTFhSRCtUaW1lc05ld1JvbWFuUFNNVA0KL1N1YnR5cGUgL0NJREZvbnRUeXBlMg0KL1cgWzMgWzI1MF1dDQovQ0lEVG9HSURNYXAgL0lkZW50aXR5DQovVHlwZSAvRm9udA0KL0RXIDEwMDANCi9DSURTeXN0ZW1JbmZvIDw8DQovT3JkZXJpbmcgKElkZW50aXR5KQ0KL1JlZ2lzdHJ5IChBZG9iZSkNCi9TdXBwbGVtZW50IDANCj4+DQoNCj4+DQoNCmVuZG9iag0KMTMgMCBvYmoNCjw8DQovTGVuZ3RoIDM0Nw0KPj4NCnN0cmVhbQ0KL0NJREluaXQgL1Byb2NTZXQgZmluZHJlc291cmNlIGJlZ2luCjEyIGRpY3QgYmVnaW4KYmVnaW5jbWFwDQovQ0lEU3lzdGVtSW5mbyA8PCAvUmVnaXN0cnkgKEFkb2JlKS9PcmRlcmluZyAoVUNTKS9TdXBwbGVtZW50IDA+PiBkZWYKL0NNYXBOYW1lIC9BZG9iZS1JZGVudGl0eS1VQ1MgZGVmCi9DTWFwVHlwZSAyIGRlZgoxIGJlZ2luY29kZXNwYWNlcmFuZ2UNCjwwMDAzPjwwMDAzPg0KZW5kY29kZXNwYWNlcmFuZ2UNCjEgYmVnaW5iZnJhbmdlDQo8MDAwMz48MDAwMz48MDBBMD4KZW5kYmZyYW5nZQplbmRjbWFwCkNNYXBOYW1lIGN1cnJlbnRkaWN0IC9DTWFwIGRlZmluZXJlc291cmNlIHBvcAplbmQgZW5kDQoNCmVuZHN0cmVhbQ0KDQplbmRvYmoNCjE0IDAgb2JqDQo8PA0KL0ZvbnREZXNjcmlwdG9yIDE5IDAgUg0KL0Jhc2VGb250IC9ZUUxYUkQrQ2FsaWJyaS1Cb2xkDQovU3VidHlwZSAvQ0lERm9udFR5cGUyDQovVyBbMyBbMjI2IDYwNV0gMTggWzUyOV0gMjQgWzYzMF0gMjggWzQ4N10gNDcgWzI2Nl0gNjIgWzQyMl0gOTAgWzU2Ml0gMTE1IFs1OTFdIDI1OCBbNDkzXSAyNzEgWzUzNiA0MThdIDI4MiBbNTM2XSAyODYgWzUwM10gMjk2IFszMTZdIDMzNiBbNDc0XSAzNDYgWzUzNl0gMzQ5IFsyNDVdIDM2NyBbMjQ1XSAzNzMgWzgxMyA1MzZdIDM4MSBbNTM3XSAzOTMgWzUzNl0gMzk2IFszNTVdIDQwMCBbMzk4XSA0MTAgWzM0Nl0gNDE1IFs1ODVdIDQzNyBbNTM2XSA0NDggWzQ3M11dDQovQ0lEVG9HSURNYXAgL0lkZW50aXR5DQovVHlwZSAvRm9udA0KL0RXIDEwMDANCi9DSURTeXN0ZW1JbmZvIDw8DQovT3JkZXJpbmcgKElkZW50aXR5KQ0KL1JlZ2lzdHJ5IChBZG9iZSkNCi9TdXBwbGVtZW50IDANCj4+DQoNCj4+DQoNCmVuZG9iag0KMTUgMCBvYmoNCjw8DQovTGVuZ3RoIDg4MA0KPj4NCnN0cmVhbQ0KL0NJREluaXQgL1Byb2NTZXQgZmluZHJlc291cmNlIGJlZ2luCjEyIGRpY3QgYmVnaW4KYmVnaW5jbWFwDQovQ0lEU3lzdGVtSW5mbyA8PCAvUmVnaXN0cnkgKEFkb2JlKS9PcmRlcmluZyAoVUNTKS9TdXBwbGVtZW50IDA+PiBkZWYKL0NNYXBOYW1lIC9BZG9iZS1JZGVudGl0eS1VQ1MgZGVmCi9DTWFwVHlwZSAyIGRlZgoxIGJlZ2luY29kZXNwYWNlcmFuZ2UNCjwwMDAzPjwwMWMwPg0KZW5kY29kZXNwYWNlcmFuZ2UNCjI5IGJlZ2luYmZyYW5nZQ0KPDAwMDM+PDAwMDM+PDAwQTA+CjwwMDA0PjwwMDA0PjwwMDQxPgo8MDAxMj48MDAxMj48MDA0Mz4KPDAwMTg+PDAwMTg+PDAwNDQ+CjwwMDFDPjwwMDFDPjwwMDQ1Pgo8MDAyRj48MDAyRj48MDA0OT4KPDAwM0U+PDAwM0U+PDAwNEM+CjwwMDVBPjwwMDVBPjwwMDUyPgo8MDA3Mz48MDA3Mz48MDA1Nj4KPDAxMDI+PDAxMDI+PDAwNjE+CjwwMTBGPjwwMTBGPjwwMDYyPgo8MDExMD48MDExMD48MDA2Mz4KPDAxMUE+PDAxMUE+PDAwNjQ+CjwwMTFFPjwwMTFFPjwwMDY1Pgo8MDEyOD48MDEyOD48MDA2Nj4KPDAxNTA+PDAxNTA+PDAwNjc+CjwwMTVBPjwwMTVBPjwwMDY4Pgo8MDE1RD48MDE1RD48MDA2OT4KPDAxNkY+PDAxNkY+PDAwNkM+CjwwMTc1PjwwMTc1PjwwMDZEPgo8MDE3Nj48MDE3Nj48MDA2RT4KPDAxN0Q+PDAxN0Q+PDAwNkY+CjwwMTg5PjwwMTg5PjwwMDcwPgo8MDE4Qz48MDE4Qz48MDA3Mj4KPDAxOTA+PDAxOTA+PDAwNzM+CjwwMTlBPjwwMTlBPjwwMDc0Pgo8MDE5Rj48MDE5Rj48MDAyMD4KPDAxQjU+PDAxQjU+PDAwNzU+CjwwMUMwPjwwMUMwPjwwMDc2PgplbmRiZnJhbmdlCmVuZGNtYXAKQ01hcE5hbWUgY3VycmVudGRpY3QgL0NNYXAgZGVmaW5lcmVzb3VyY2UgcG9wCmVuZCBlbmQNCg0KZW5kc3RyZWFtDQoNCmVuZG9iag0KMTYgMCBvYmoNCjw8DQovRm9udERlc2NyaXB0b3IgMjAgMCBSDQovQmFzZUZvbnQgL1JBVlNERCtDYWxpYnJpDQovU3VidHlwZSAvQ0lERm9udFR5cGUyDQovVyBbMyBbMjI2IDU3OF0gMTcgWzU0MyA1MzNdIDI0IFs2MTVdIDI4IFs0ODhdIDM4IFs0NTkgNjMwXSA0NCBbNjIzXSA0NyBbMjUxXSA1OCBbMzE4XSA2MCBbNTE5XSA2MiBbNDIwXSA2OCBbODU0IDY0NV0gNzUgWzY2Ml0gODcgWzUxNl0gODkgWzY3MiA1NDJdIDk0IFs0NTldIDEwMCBbNDg3XSAxMDQgWzY0MV0gMTE1IFs1NjcgODg5XSAxMjIgWzQ4N10gMjU4IFs0NzldIDI3MSBbNTI1IDQyMl0gMjgyIFs1MjVdIDI4NiBbNDk3XSAyOTYgWzMwNV0gMzAyIFs1MjldIDMzNiBbNDcwXSAzNDYgWzUyNV0gMzQ5IFsyMjldIDM2MSBbMjM5XSAzNjQgWzQ1NF0gMzY3IFsyMjldIDM3MyBbNzk4IDUyNV0gMzgxIFs1MjddIDM5MyBbNTI1XSAzOTYgWzM0OF0gNDAwIFszOTFdIDQxMCBbMzM0XSA0MTUgWzU1N10gNDI3IFs4NTVdIDQzNyBbNTI1XSA0NDggWzQ1MSA3MTRdIDQ1NCBbNDMzIDQ1Ml0gODQyIFszMjVdIDg1MyBbMjQ5XSA4NTYgWzI1Ml0gODU5IFsyNDldIDg3NiBbMzg2XSA4ODIgWzMwNl0gODk0IFszMDMgMzAzXSA5MjAgWzY4Ml0gMTAwNCBbNTA2IDUwNiA1MDYgNTA2IDUwNiA1MDYgNTA2IDUwNiA1MDYgNTA2XSAxMDg1IFs0OThdXQ0KL0NJRFRvR0lETWFwIC9JZGVudGl0eQ0KL1R5cGUgL0ZvbnQNCi9EVyAxMDAwDQovQ0lEU3lzdGVtSW5mbyA8PA0KL09yZGVyaW5nIChJZGVudGl0eSkNCi9SZWdpc3RyeSAoQWRvYmUpDQovU3VwcGxlbWVudCAwDQo+Pg0KDQo+Pg0KDQplbmRvYmoNCjE3IDAgb2JqDQo8PA0KL0xlbmd0aCAxNjk3DQo+Pg0Kc3RyZWFtDQovQ0lESW5pdCAvUHJvY1NldCBmaW5kcmVzb3VyY2UgYmVnaW4KMTIgZGljdCBiZWdpbgpiZWdpbmNtYXANCi9DSURTeXN0ZW1JbmZvIDw8IC9SZWdpc3RyeSAoQWRvYmUpL09yZGVyaW5nIChVQ1MpL1N1cHBsZW1lbnQgMD4+IGRlZgovQ01hcE5hbWUgL0Fkb2JlLUlkZW50aXR5LVVDUyBkZWYKL0NNYXBUeXBlIDIgZGVmCjEgYmVnaW5jb2Rlc3BhY2VyYW5nZQ0KPDAwMDM+PDA0M2Q+DQplbmRjb2Rlc3BhY2VyYW5nZQ0KNzIgYmVnaW5iZnJhbmdlDQo8MDAwMz48MDAwMz48MDBBMD4KPDAwMDQ+PDAwMDQ+PDAwNDE+CjwwMDExPjwwMDExPjwwMDQyPgo8MDAxMj48MDAxMj48MDA0Mz4KPDAwMTg+PDAwMTg+PDAwNDQ+CjwwMDFDPjwwMDFDPjwwMDQ1Pgo8MDAyNj48MDAyNj48MDA0Nj4KPDAwMjc+PDAwMjc+PDAwNDc+CjwwMDJDPjwwMDJDPjwwMDQ4Pgo8MDAyRj48MDAyRj48MDA0OT4KPDAwM0E+PDAwM0E+PDAwNEE+CjwwMDNDPjwwMDNDPjwwMDRCPgo8MDAzRT48MDAzRT48MDA0Qz4KPDAwNDQ+PDAwNDQ+PDAwNEQ+CjwwMDQ1PjwwMDQ1PjwwMDRFPgo8MDA0Qj48MDA0Qj48MDA0Rj4KPDAwNTc+PDAwNTc+PDAwNTA+CjwwMDU5PjwwMDU5PjwwMDUxPgo8MDA1QT48MDA1QT48MDA1Mj4KPDAwNUU+PDAwNUU+PDAwNTM+CjwwMDY0PjwwMDY0PjwwMDU0Pgo8MDA2OD48MDA2OD48MDA1NT4KPDAwNzM+PDAwNzM+PDAwNTY+CjwwMDc0PjwwMDc0PjwwMDU3Pgo8MDA3QT48MDA3QT48MDA1OT4KPDAxMDI+PDAxMDI+PDAwNjE+CjwwMTBGPjwwMTBGPjwwMDYyPgo8MDExMD48MDExMD48MDA2Mz4KPDAxMUE+PDAxMUE+PDAwNjQ+CjwwMTFFPjwwMTFFPjwwMDY1Pgo8MDEyOD48MDEyOD48MDA2Nj4KPDAxMkU+PDAxMkU+PEZCMDE+CjwwMTUwPjwwMTUwPjwwMDY3Pgo8MDE1QT48MDE1QT48MDA2OD4KPDAxNUQ+PDAxNUQ+PDAwNjk+CjwwMTY5PjwwMTY5PjwwMDZBPgo8MDE2Qz48MDE2Qz48MDA2Qj4KPDAxNkY+PDAxNkY+PDAwNkM+CjwwMTc1PjwwMTc1PjwwMDZEPgo8MDE3Nj48MDE3Nj48MDA2RT4KPDAxN0Q+PDAxN0Q+PDAwNkY+CjwwMTg5PjwwMTg5PjwwMDcwPgo8MDE4Qz48MDE4Qz48MDA3Mj4KPDAxOTA+PDAxOTA+PDAwNzM+CjwwMTlBPjwwMTlBPjwwMDc0Pgo8MDE5Rj48MDE5Rj48MDAyMD4KPDAxQUI+PDAxQUI+PDAwMjA+CjwwMUI1PjwwMUI1PjwwMDc1Pgo8MDFDMD48MDFDMD48MDA3Nj4KPDAxQzE+PDAxQzE+PDAwNzc+CjwwMUM2PjwwMUM2PjwwMDc4Pgo8MDFDNz48MDFDNz48MDA3OT4KPDAzNEE+PDAzNEE+PDAwMjE+CjwwMzU1PjwwMzU1PjwwMDJDPgo8MDM1OD48MDM1OD48MDAyRT4KPDAzNUI+PDAzNUI+PDIwMTk+CjwwMzZDPjwwMzZDPjwwMDJGPgo8MDM3Mj48MDM3Mj48MjAxMD4KPDAzN0U+PDAzN0U+PDAwMjg+CjwwMzdGPjwwMzdGPjwwMDI5Pgo8MDM5OD48MDM5OD48MDAyNj4KPDAzRUM+PDAzRUM+PDAwMzA+CjwwM0VEPjwwM0VEPjwwMDMxPgo8MDNFRT48MDNFRT48MDAzMj4KPDAzRUY+PDAzRUY+PDAwMzM+CjwwM0YwPjwwM0YwPjwwMDM0Pgo8MDNGMT48MDNGMT48MDAzNT4KPDAzRjI+PDAzRjI+PDAwMzY+CjwwM0YzPjwwM0YzPjwwMDM3Pgo8MDNGND48MDNGND48MDAzOD4KPDAzRjU+PDAzRjU+PDAwMzk+CjwwNDNEPjwwNDNEPjwwMDJCPgplbmRiZnJhbmdlCmVuZGNtYXAKQ01hcE5hbWUgY3VycmVudGRpY3QgL0NNYXAgZGVmaW5lcmVzb3VyY2UgcG9wCmVuZCBlbmQNCg0KZW5kc3RyZWFtDQoNCmVuZG9iag0KMTggMCBvYmoNCjw8DQovQXZnV2lkdGggMjUwDQovTWlzc2luZ1dpZHRoIDI1MA0KL1hIZWlnaHQgMA0KL0xlYWRpbmcgMTA1OQ0KL0ZsYWdzIDMyDQovU3RlbUggMA0KL0Rlc2NlbnQgLTIxNQ0KL1N0ZW1WIDgwDQovVHlwZSAvRm9udERlc2NyaXB0b3INCi9Gb250QkJveCBbLTU2OC4wMDAwMCAtMjE2LjAwMDAwIDIwNDUuMDAwMDAgOTM1LjAwMDAwXQ0KL0l0YWxpY0FuZ2xlIDANCi9Gb250TmFtZSAvWVFMWFJEK1RpbWVzTmV3Um9tYW5QU01UDQovTWF4V2lkdGggMA0KL0ZvbnRGaWxlMiAyMSAwIFINCi9Bc2NlbnQgNjkzDQovQ2FwSGVpZ2h0IDY2Mg0KPj4NCg0KZW5kb2JqDQoxOSAwIG9iag0KPDwNCi9BdmdXaWR0aCAyMjYNCi9NaXNzaW5nV2lkdGggMjI2DQovWEhlaWdodCAwDQovTGVhZGluZyAxMjIwDQovRmxhZ3MgMjYyMTc2DQovU3RlbUggMA0KL0Rlc2NlbnQgLTI1MA0KL1N0ZW1WIDgwDQovVHlwZSAvRm9udERlc2NyaXB0b3INCi9Gb250QkJveCBbLTUxOC4wMDAwMCAtMjUwLjAwMDAwIDEyNjIuMDAwMDAgOTcxLjAwMDAwXQ0KL0l0YWxpY0FuZ2xlIDANCi9Gb250TmFtZSAvWVFMWFJEK0NhbGlicmktQm9sZA0KL01heFdpZHRoIDANCi9Gb250RmlsZTIgMjIgMCBSDQovQXNjZW50IDc1MA0KL0NhcEhlaWdodCA2MzENCj4+DQoNCmVuZG9iag0KMjAgMCBvYmoNCjw8DQovQXZnV2lkdGggMjI2DQovTWlzc2luZ1dpZHRoIDIyNg0KL1hIZWlnaHQgMA0KL0xlYWRpbmcgMTIyMA0KL0ZsYWdzIDMyDQovU3RlbUggMA0KL0Rlc2NlbnQgLTI1MA0KL1N0ZW1WIDgwDQovVHlwZSAvRm9udERlc2NyaXB0b3INCi9Gb250QkJveCBbLTUwMi4wMDAwMCAtMjUwLjAw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***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B/+u5C8jPvh3JX80bVqAYyb/Kg4fRv8HOVGFaQ0KZW5kc3RyZWFtDQoNCmVuZG9iag0KeHJlZg0KMCAyNA0KMDAwMDAwMDAwMCA2NTUzNSBmDQowMDAwMDAwMDUyIDAwMDAwIG4NCjAwMDAwMDAxNzkgMDAwMDAgbg0KMDAwMDAwMDcwMiAwMDAwMCBuDQowMDAwMDAwMjQ1IDAwMDAwIG4NCjAwMDAwMDA5NTkgMDAwMDAgbg0KMDAwMDAwMDQ4NiAwMDAwMCBuDQowMDAwMDAwODg2IDAwMDAwIG4NCjAwMDAwMDY1NTcgMDAwMDAgbg0KMDAwMDAwNjM3MSAwMDAwMCBuDQowMDAwMDA2MTc0IDAwMDAwIG4NCjAwMDAwMTMxOTcgMDAwMDAgbg0KMDAwMDAxMzM3NCAwMDAwMCBuDQowMDAwMDEzNjI5IDAwMDAwIG4NCjAwMDAwMTQwMzggMDAwMDAgbg0KMDAwMDAxNDU0NCAwMDAwMCBuDQowMDAwMDE1NDg2IDAwMDAwIG4NCjAwMDAwMTYzMDkgMDAwMDAgbg0KMDAwMDAxODA2OSAwMDAwMCBuDQowMDAwMDE4Mzk4IDAwMDAwIG4NCjAwMDAwMTg3MjYgMDAwMDAgbg0KMDAwMDAxOTA0NSAwMDAwMCBuDQowMDAwMDMyNzIyIDAwMDAwIG4NCjAwMDAwNTMyNDQgMDAwMDAgbg0KdHJhaWxlcg0KPDwNCi9JbmZvIDcgMCBSDQovUm9vdCAxIDAgUg0KL1NpemUgMjQNCj4+DQoNCnN0YXJ0eHJlZg0KODQ3NjINCiUlRU9GDQo="

    const handleSendWhatsApp = async () => {
        if (!whatsappNumber) {
            alert("Please enter a mobile number");
            return;
        }

        setSendingWhatsApp(true);
        try {
            // Skip PDF generation for now - API uses static PDF
            const res = await fetch("/api/send-whatsapp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    number: whatsappNumber,
                    customerName: answers.companyName || "Valued Customer",
                    riskLevel: theme.label,
                    riskScore: analysis?.score,
                    pdfBase64: samplePdfBase64,
                    category: answers["industry_selection"],
                    recommendations: analysis?.recommendations?.map((r: any) => r.title).join(", "),
                    date: new Date().toLocaleDateString("en-GB").replace(/\//g, '-')
                })
            });
            const data = await res.json();
            if (res.ok) {
                setShowWhatsAppModal(false);
                setShowSuccessModal(true);
                // Auto-close after 4 seconds
                setTimeout(() => setShowSuccessModal(false), 4000);
            } else {
                alert("Failed to send WhatsApp: " + (data.error?.message || "Unknown error"));
            }
        } catch (e: any) {
            alert("Error sending WhatsApp: " + e.message);
        } finally {
            setSendingWhatsApp(false);
        }
    };

    return (
        <div className="w-full">
            <div className="w-full max-w-7xl mx-auto animate-in fade-in duration-1000 print:hidden">
                {/* Sidebar Navigation & Actions */}
                <div className="fixed right-0 top-24 flex flex-col gap-3 z-50 items-end">
                    {/* Navigation Sections */}
                    {[
                        { id: "section-digital-pulse", short: "DP", full: "Digital Pulse" },
                        { id: "section-neural-insight", short: "NI", full: "Neural Insight" },
                        { id: "section-ipl", short: "IPL", full: "Intelligent Protection Landscape" }
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={() => document.getElementById(item.id)?.scrollIntoView({ behavior: "smooth" })}
                            className={`group flex items-center justify-end backdrop-blur-md border-y border-l rounded-l-full transition-all duration-300 shadow-xl py-3 pl-4 pr-3 min-w-[3rem] ${activeSection === item.id
                                ? `bg-slate-900 border-${theme.color} border-l-4` // Active state uses theme color border
                                : "bg-slate-900/80 hover:bg-slate-800 border-white/10"
                                }`}
                            style={activeSection === item.id ? { borderColor: theme.color } : {}}
                        >
                            {/* Hidden Full Text (Expands on Hover) */}
                            <span className="max-w-0 overflow-hidden group-hover:max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out whitespace-nowrap text-xs font-bold uppercase tracking-widest text-white mr-0 group-hover:mr-3">
                                {item.full}
                            </span>
                            {/* Visible Short Text (Hides on Hover) */}
                            <span className={`text-xs font-mono font-bold group-hover:text-white max-w-xs group-hover:max-w-0 group-hover:opacity-0 overflow-hidden transition-all duration-300 ${activeSection === item.id ? "text-white" : "text-slate-400"
                                }`}>
                                {item.short}
                            </span>
                        </button>
                    ))}

                    <div className="h-4" /> {/* Spacer */}

                    {/* Actions */}
                    {[
                        ...(onBack ? [{ id: "action-back", short: "BK", full: "Back", icon: <ArrowLeft className="w-3 h-3" />, action: onBack }] : []),
                        { id: "action-recalibrate", short: "RC", full: "Recalibrate", icon: <RefreshCw className="w-3 h-3" />, action: () => window.location.reload() },
                        { id: "action-download", short: "DL", full: "Print Full Report", icon: <Download className="w-3 h-3" />, action: () => window.print() }
                    ].map((item) => (
                        <button
                            key={item.id}
                            onClick={item.action}
                            className="group flex items-center justify-end bg-slate-800/50 hover:bg-white hover:text-black backdrop-blur-md border-y border-l border-white/5 hover:border-white rounded-l-full transition-all duration-300 shadow-xl py-3 pl-4 pr-3 min-w-[3rem]"
                        >
                            {/* Hidden Full Text (Expands on Hover) */}
                            <span className="max-w-0 overflow-hidden group-hover:max-w-xs opacity-0 group-hover:opacity-100 transition-all duration-500 ease-in-out whitespace-nowrap text-xs font-bold uppercase tracking-widest mr-0 group-hover:mr-3">
                                {item.full}
                            </span>
                            {/* Visible Icon/Short Text */}
                            <span className="text-slate-400 group-hover:text-black">
                                {item.icon || <span className="text-xs font-mono font-bold">{item.short}</span>}
                            </span>
                        </button>
                    ))}
                </div>

                {/* 1. VIEWPORT 1: SPLASH DASHBOARD (Fits 100vh) */}
                <div id="section-digital-pulse" className="min-h-screen flex flex-col justify-center py-10 px-4 md:px-12 relative">

                    {/* Hero Section - tighter spacing */}
                    <div className="mb-6 text-center space-y-4 max-w-4xl mx-auto">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-mono ${theme.text} tracking-widest uppercase shadow-lg`}
                        >
                            <span className={`w-2 h-2 rounded-full ${theme.text.replace("text-", "bg-")} animate-pulse`} />
                            Analysis Complete
                        </motion.div>
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.4 }}
                            className="text-5xl md:text-7xl font-light tracking-tight text-white"
                        >
                            Here is your <span className={`text-transparent bg-clip-text bg-gradient-to-r ${theme.gradient} font-bold`}>Digital Pulse</span>
                        </motion.h1>
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.6 }}
                            className="text-slate-300 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto"
                        >
                            We’ve harmonized your inputs. Your organization shows strong vitality in <strong className="text-white">{analysis.components.C > 50 ? "Controls" : "Detection"}</strong>,
                            but requires attention in <strong className="text-white">{analysis.components.E > 50 ? "Exposure Management" : "Identity"}</strong> to reach full resonance.
                        </motion.p>
                    </div>

                    {/* The Core Activity Rings (Immersive Data) */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-6xl mx-auto w-full">

                        {/* Left: The Pulse (Score) - Centered & Larger */}
                        <div className="relative flex flex-col items-center justify-center">
                            <div className="relative w-80 h-80 md:w-96 md:h-96">
                                {/* Outer Glow */}
                                <div className={`absolute inset-0 ${theme.glow} blur-[100px] rounded-full animate-pulse`} />

                                <Doughnut
                                    data={{
                                        labels: ["Risk", "Resilience"],
                                        datasets: [{
                                            data: [analysis.score, 100 - analysis.score],
                                            backgroundColor: [theme.color, "rgba(255, 255, 255, 0.03)"],
                                            borderWidth: 0,
                                            borderRadius: 50,
                                            hoverOffset: 4
                                        }]
                                    }}
                                    options={{ cutout: "88%", plugins: { legend: { display: false }, tooltip: { enabled: false } } }}
                                />

                                {/* Center Metric */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
                                    <div className="flex flex-col items-center z-10">
                                        <span className="text-7xl md:text-8xl font-thin text-white tracking-tighter drop-shadow-2xl">
                                            {analysis.score}
                                        </span>
                                        <div className="flex flex-col items-center mt-2">
                                            <span className="text-[10px] font-mono text-slate-400 tracking-[0.2em] uppercase mb-1">
                                                Risk Index
                                            </span>
                                            <span className={`text-2xl md:text-3xl font-light ${theme.text} tracking-tight whitespace-nowrap`}>
                                                {theme.label}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* ROI GHOST METRIC - Centered Below Circle, Slightly Smaller Width */}
                            {analysis.projectedScore && (
                                <div
                                    onClick={() => setShowOptimization(true)}
                                    className="mt-8 relative flex flex-col items-center w-64 md:w-80 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-500 cursor-pointer group hover:scale-105 transition-transform z-20"
                                >
                                    <div className="relative w-full">
                                        <div className="absolute inset-0 bg-emerald-400 blur-xl opacity-40 rounded-2xl group-hover:opacity-60 transition-all" />
                                        <div className="w-full px-6 py-4 rounded-2xl bg-emerald-500 flex items-center justify-between shadow-2xl relative z-10">
                                            <div className="flex flex-col text-left">
                                                <span className="text-[10px] text-white/80 font-mono tracking-wider uppercase mb-0.5">Potential</span>
                                                <span className="text-xs text-white font-bold">Optimize To</span>
                                            </div>
                                            <span className="text-4xl font-light text-black">{analysis.projectedScore}</span>
                                        </div>
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[9px] px-2 py-0.5 rounded-full whitespace-nowrap border border-white/20 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                            Click to Simulate
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Right: The Breakdown (Glass Panel) - Better Spacing */}
                        <div className="space-y-6 w-full">
                            <div className="glass-panel-premium p-8 relative overflow-hidden group hover:bg-white/5 transition-colors duration-500">
                                <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Sparkles className="w-24 h-24 text-white" />
                                </div>

                                <h3 className="text-2xl font-light text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-icici-orange)] to-white mb-8 flex items-center gap-4">
                                    <span className="w-1.5 h-8 bg-gradient-to-b from-[var(--color-icici-orange)] to-transparent rounded-full" />
                                    Risk Metrics
                                </h3>

                                <div className="space-y-8">
                                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500 font-mono pb-2">
                                        <span>Metric</span>
                                        <div className="flex gap-8">
                                            <div className="w-16 text-right"><span className="text-white">You</span></div>
                                            <div className="w-20 text-right"><span className="text-icici-orange font-medium">Avg</span></div>
                                        </div>
                                    </div>
                                    {[
                                        { label: "Exposure Surface", val: analysis.components.E, bench: analysis.benchmarks?.E ?? 50, color: "bg-blue-500", desc: "External attack vectors." },
                                        { label: "Immune Controls", val: analysis.components.C, bench: analysis.benchmarks?.C ?? 50, color: "bg-[var(--color-icici-orange)]", desc: "Internal defense mechanisms." },
                                        { label: "IoT Hygiene", val: analysis.components.I, bench: analysis.benchmarks?.I ?? 50, color: "bg-purple-500", desc: "Connected device security." }
                                    ].map((item, i) => (
                                        <div key={i} className="group/metric cursor-pointer py-2">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1 pr-4">
                                                    <span className="text-xl font-light text-white block group-hover/metric:text-[var(--color-icici-orange)] transition-colors tracking-tight">{item.label}</span>
                                                    <span className="text-xs text-slate-500 font-light block mt-1">{item.desc}</span>
                                                </div>

                                                <div className="flex gap-8 items-start">
                                                    {/* User Score */}
                                                    <div className="flex flex-col items-end w-16">
                                                        <span className="text-3xl font-thin text-white tabular-nums">{item.val.toFixed(0)}</span>
                                                    </div>

                                                    {/* Industry Benchmark Number */}
                                                    <div className="flex flex-col items-end w-20">
                                                        <span className="text-3xl font-thin text-slate-400 tabular-nums group-hover/metric:text-icici-orange transition-colors">{item.bench.toFixed(0)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="relative h-1 w-full bg-slate-800 rounded-full overflow-hidden mt-3">
                                                {/* User Progress */}
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${item.val}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className={`absolute top-0 left-0 h-full ${item.color} shadow-[0_0_10px_currentColor] opacity-100 z-10`}
                                                />
                                                {/* Avg Marker */}
                                                <div className="absolute top-0 w-0.5 h-full bg-slate-500 z-20" style={{ left: `${item.bench}%` }} />
                                            </div>

                                            <div className="flex justify-between mt-2">
                                                <div />
                                                <span className="text-[10px] text-slate-600 font-mono tracking-wider">
                                                    {item.val > item.bench ? "Above Avg" : "Below Avg"}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* AI Signal Stream */}
                            <div className="glass-panel-premium p-6 relative overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-sm font-light text-white flex items-center gap-2">
                                        <Activity className="w-4 h-4 text-indigo-400" />
                                        Intelligence Stream
                                    </h3>
                                    {aiLoading && <Loader3D />}
                                </div>

                                <div className="space-y-3 font-mono text-[10px] md:text-xs h-24 overflow-y-auto scrollbar-none">
                                    {(aiData?.signals || [
                                        "Analyzing telemetry...",
                                        "Correlating industry benchmarks...",
                                        "Calculating exposure vectors..."
                                    ]).map((signal: string, i: number) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.3 }}
                                            className="flex items-center gap-2 text-indigo-300/80"
                                        >
                                            <div className="w-1 h-1 rounded-full bg-indigo-500 animate-pulse" />
                                            {signal}
                                        </motion.div>
                                    ))}
                                </div>

                                {aiData && !aiLoading && (
                                    <div className="mt-4 p-3 bg-indigo-950/30 border border-indigo-500/20 rounded-lg animate-in fade-in slide-in-from-bottom-2">
                                        <p className="text-xs text-indigo-200 leading-relaxed font-mono">
                                            "{aiData.executive_summary || "Risk profile analysis complete. Recommendations generated."}"
                                        </p>
                                    </div>
                                )}

                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. AI Insight (The Story) */}
                <div id="section-neural-insight" className="min-h-screen flex flex-col justify-center py-10 px-4 md:px-12 relative">
                    <Card className="border-0 bg-transparent relative overflow-visible w-full max-w-7xl mx-auto">
                        {/* Floating Background Elements */}
                        <div className="absolute -left-20 -top-20 w-96 h-96 bg-[var(--color-icici-blue)]/20 rounded-full blur-[100px]" />
                        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-[var(--color-icici-orange)]/10 rounded-full blur-[100px]" />

                        <div className="relative z-10 glass-panel-premium p-8 md:p-12">
                            <div className="flex flex-col md:flex-row gap-12">
                                {/* AI Loader / Status */}
                                <div className="md:w-1/3 flex flex-col justify-center pr-12">
                                    <h3 className="text-3xl font-light text-white mb-2">Neural Insight</h3>

                                    <button
                                        onClick={() => setShowSignals(true)}
                                        className="text-slate-400 text-sm mb-8 leading-relaxed hover:text-[var(--color-icici-orange)] transition-colors text-left group"
                                    >
                                        Our engine has processed <span className="text-[var(--color-icici-orange)] border-b border-dashed border-[var(--color-icici-orange)]/50 group-hover:border-[var(--color-icici-orange)] font-mono">{Object.keys(answers).length} distinct risk signals</span> to craft this strategic narrative.
                                    </button>

                                    <SignalStream
                                        isOpen={showSignals}
                                        onClose={() => setShowSignals(false)}
                                        answers={answers}
                                    />

                                    {aiLoading ? (
                                        <Loader3D />
                                    ) : (
                                        <div className="flex items-center gap-4 text-emerald-400">
                                            <CheckCircle2 className="w-8 h-8" />
                                            <span className="font-mono text-sm tracking-widest uppercase">Analysis Ready</span>
                                        </div>
                                    )}
                                </div>

                                {/* The Content */}
                                <div className="md:w-2/3 space-y-8">
                                    {aiData ? (
                                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                                            <h2 className="text-3xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-[var(--color-icici-orange)] via-amber-200 to-white mb-6 leading-tight">
                                                {aiData.headline}
                                            </h2>

                                            <div className="prose prose-invert prose-lg max-w-none">
                                                <p className="text-xl text-slate-300 font-light leading-relaxed">
                                                    <span
                                                        dangerouslySetInnerHTML={{
                                                            __html: (aiData.executiveSummary || "")
                                                                .replace(/\*\*(.*?)\*\*/g, '<span class="text-[var(--color-icici-orange)] font-medium drop-shadow-md">$1</span>')
                                                        }}
                                                    />
                                                </p>
                                            </div>

                                            {/* Action Cards */}
                                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest border-b border-white/10 pb-2 mt-8">Priority Directives</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                                {aiData.remediationSteps?.slice(0, 4).map((step: string, i: number) => (
                                                    <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-[var(--color-icici-orange)]/50 transition-all cursor-pointer group">
                                                        <div className="flex items-start gap-4">
                                                            <span className="flex-shrink-0 w-8 h-8 rounded-full bg-[var(--color-icici-orange)]/20 text-[var(--color-icici-orange)] flex items-center justify-center text-sm font-bold group-hover:scale-110 transition-transform">
                                                                {i + 1}
                                                            </span>
                                                            <p className="text-sm text-slate-300 group-hover:text-white transition-colors"
                                                                dangerouslySetInnerHTML={{ __html: step.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }}
                                                            />
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="h-full flex items-center justify-center opacity-50">
                                            <p className="text-sm font-mono tracking-widest uppercase">Initiating Neural Link...</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>

                {/* 4. Footer Actions & VAS */}
                <div id="section-ipl" className="pb-20 min-h-[50vh] flex flex-col justify-center">
                    <h2 className="text-3xl font-light text-white mb-10 text-center">
                        <span className="text-[var(--color-icici-orange)] font-semibold">ICICI Lombard</span> Intelligent Protection Landscape
                    </h2>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {analysis.recommendations.map((rec) => (
                            <Card key={rec.id} className="relative overflow-hidden bg-white/5 border border-white/10 hover:border-[var(--color-icici-orange)]/50 transition-all group">
                                <div className="p-6">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="bg-white/10 px-3 py-1 rounded-md text-[10px] font-mono font-bold tracking-widest text-[var(--color-icici-orange)] uppercase">
                                            {rec.provider}
                                        </div>
                                        <div className={`text-[10px] px-2 py-0.5 rounded border ${rec.cost === "High" ? "border-rose-500/30 text-rose-400" :
                                            rec.cost === "Medium" ? "border-yellow-500/30 text-yellow-400" :
                                                "border-emerald-500/30 text-emerald-400"
                                            }`}>
                                            {rec.cost === "High" ? "₹₹₹" : rec.cost === "Medium" ? "₹₹" : "₹"}
                                        </div>
                                    </div>

                                    <h4 className="font-bold text-white text-lg mb-2 group-hover:text-[var(--color-icici-orange)] transition-colors">
                                        {rec.title}
                                    </h4>

                                    <p className="text-sm text-slate-400 mb-6 leading-relaxed">
                                        {rec.description}
                                    </p>

                                    <div className="bg-[var(--color-icici-orange)]/10 border border-[var(--color-icici-orange)]/20 rounded-lg p-3">
                                        <p className="text-xs text-[var(--color-icici-orange)] font-medium flex items-center gap-2">
                                            <Activity className="w-3 h-3" />
                                            {rec.impact}
                                        </p>
                                    </div>
                                </div>

                                {/* Action Footer */}
                                <div className="border-t border-white/5 p-4 flex justify-between items-center bg-black/20">
                                    <div className="flex gap-2">
                                        {rec.tags.map(tag => (
                                            <span key={tag} className="text-[10px] text-slate-500">#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>

                    <div className="flex justify-center gap-6 pb-20 mt-12">
                        <Button onClick={onRestart} variant="ghost" className="text-slate-400 hover:text-white">
                            <RefreshCw className="w-4 h-4 mr-2" /> Recalibrate
                        </Button>
                        <Button variant="outline" className="text-white hover:text-black hover:bg-white rounded-full px-8 border-white/20" onClick={() => window.print()}>
                            Print Report
                        </Button>
                        <Button
                            variant="primary"
                            className="bg-[var(--color-icici-orange)] text-white hover:bg-[var(--color-icici-orange)]/90 rounded-full px-8 shadow-lg shadow-[var(--color-icici-orange)]/20"
                            onClick={() => setShowWhatsAppModal(true)}
                        >
                            <Download className="w-4 h-4 mr-2" /> Download PDF (WhatsApp)
                        </Button>
                    </div>


                </div>
            </div>

            {/* WA Modal */}
            <Dialog open={showWhatsAppModal} onOpenChange={setShowWhatsAppModal}>
                <DialogContent className="sm:max-w-md bg-slate-900 border border-white/10 text-white backdrop-blur-xl bg-slate-900/80">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-light">Get Report on WhatsApp</DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Enter your WhatsApp number to receive the full risk analysis report instantly.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-widest text-slate-500">Mobile Number</label>
                            <input
                                type="text"
                                placeholder="e.g. 9876543210"
                                value={whatsappNumber}
                                onChange={(e) => setWhatsappNumber(e.target.value)}
                                className="w-full bg-black/40 border border-white/10 rounded-lg px-4 py-3 text-white placeholder:text-slate-600 focus:outline-none focus:border-[var(--color-icici-orange)] transition-colors"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3">
                        <Button variant="ghost" onClick={() => setShowWhatsAppModal(false)} className="hover:bg-white/5 text-slate-400">Cancel</Button>
                        <Button
                            disabled={sendingWhatsApp}
                            onClick={handleSendWhatsApp}
                            className="bg-[var(--color-icici-orange)] hover:bg-[var(--color-icici-orange)]/90 text-white"
                        >
                            {sendingWhatsApp ? <Loader3D className="w-4 h-4" /> : "Send PDF"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Optimization Modal */}
            {analysis && (
                <OptimizationModal
                    isOpen={showOptimization}
                    onClose={() => setShowOptimization(false)}
                    analysis={analysis}
                />
            )}

            {/* Success Modal - Awesome Animated */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center animate-in fade-in duration-300">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/60 backdrop-blur-md"
                        onClick={() => setShowSuccessModal(false)}
                    />

                    {/* Modal Content */}
                    <motion.div
                        initial={{ scale: 0.5, opacity: 0, y: 50 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.8, opacity: 0 }}
                        transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 25,
                            duration: 0.5
                        }}
                        className="relative z-10 max-w-md w-full mx-4"
                    >
                        {/* Confetti Background Effect */}
                        <div className="absolute inset-0 overflow-hidden rounded-3xl">
                            {[...Array(20)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{
                                        y: [0, 400],
                                        opacity: [0, 1, 0],
                                        x: Math.random() * 400 - 200,
                                        rotate: Math.random() * 360
                                    }}
                                    transition={{
                                        duration: 2 + Math.random() * 2,
                                        delay: Math.random() * 0.5,
                                        ease: "easeOut"
                                    }}
                                    className="absolute w-2 h-2 rounded-full"
                                    style={{
                                        left: `${Math.random() * 100}%`,
                                        backgroundColor: i % 3 === 0 ? '#F58220' : i % 3 === 1 ? '#25D366' : '#FFB347'
                                    }}
                                />
                            ))}
                        </div>

                        {/* Card */}
                        <div className="relative glass-panel-premium p-8 text-center space-y-6 overflow-hidden">
                            {/* Glow Effect */}
                            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 via-transparent to-[var(--color-icici-orange)]/20 blur-2xl" />

                            {/* Success Icon with Animation */}
                            <motion.div
                                initial={{ scale: 0, rotate: -180 }}
                                animate={{ scale: 1, rotate: 0 }}
                                transition={{
                                    type: "spring",
                                    stiffness: 200,
                                    delay: 0.2
                                }}
                                className="relative mx-auto w-24 h-24 flex items-center justify-center"
                            >
                                {/* Pulsing Ring */}
                                <motion.div
                                    animate={{
                                        scale: [1, 1.3, 1],
                                        opacity: [0.5, 0, 0.5]
                                    }}
                                    transition={{
                                        duration: 2,
                                        repeat: Infinity,
                                        ease: "easeInOut"
                                    }}
                                    className="absolute inset-0 rounded-full bg-emerald-500/30"
                                />

                                {/* WhatsApp Icon Circle */}
                                <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-500/50">
                                    {/* WhatsApp Icon */}
                                    <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                                    </svg>
                                </div>

                                {/* Checkmark Badge */}
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.4, type: "spring", stiffness: 300 }}
                                    className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-lg"
                                >
                                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                </motion.div>
                            </motion.div>

                            {/* Text Content */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="relative space-y-3"
                            >
                                <h3 className="text-2xl font-bold text-white">
                                    Report Sent Successfully!
                                </h3>
                                <p className="text-slate-300 text-sm leading-relaxed">
                                    Your comprehensive risk analysis report has been delivered to <span className="text-emerald-400 font-semibold">WhatsApp</span>.
                                    Check your messages to view the full PDF report.
                                </p>
                            </motion.div>

                            {/* Auto-close indicator */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="relative"
                            >
                                <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-500 animate-pulse" />
                                    Auto-closing in a moment
                                </div>

                                {/* Progress bar */}
                                <motion.div
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 4, ease: "linear" }}
                                    className="mt-2 h-0.5 bg-gradient-to-r from-emerald-500 to-[var(--color-icici-orange)] rounded-full origin-left"
                                />
                            </motion.div>

                            {/* Close button */}
                            <button
                                onClick={() => setShowSuccessModal(false)}
                                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors group"
                            >
                                <span className="text-white/60 group-hover:text-white text-xl">×</span>
                            </button>
                        </div>
                    </motion.div>
                </div>
            )}

            <PrintableReport
                ref={reportRef}
                analysis={analysis}
                industry={answers["industry_selection"]}
                companyName={answers.companyName}
                className={isCapturingPdf ? "block absolute top-0 left-0 w-[1000px] h-auto overflow-visible z-[-50]" : undefined}
            />
        </div >
    );
}
