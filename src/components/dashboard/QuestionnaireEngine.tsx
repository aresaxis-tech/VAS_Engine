"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { IndustryInsightView } from './IndustryInsightView';
import { VAS_CATALOG, getRecommendedVAS } from '@/data/vas_catalog';
import { QUESTIONS, Question, getDetailQuestion } from "@/lib/questions";
import {
    AlertTriangle, CheckCircle, ChevronLeft, ChevronRight,
    Download, Shield, ShieldCheck, Thermometer, Wifi,
    Lock, Activity, FileText, CheckCircle2, History, Info, Lightbulb, Server, Eye, ArrowRight, ShieldAlert,
    Loader2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { IoTService, IoTNetworkAnalysis } from "@/lib/iotSimulator";
import { Loader3D } from "@/components/ui/Loader3D";
import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle, DialogTrigger,
    DialogFooter
} from "@/components/ui/dialog";
// import { saveAs } from 'file-saver';
// import { pdf } from '@react-pdf/renderer';
// import { PrintableReport } from './PrintableReport';
import { IoTConnectionDialog } from "@/components/dashboard/IoTConnectionDialog";
import { CyberAgentChat } from "@/components/dashboard/CyberAgentChat";

// --- CONSTANTS ---
const INDUSTRIES = [
    { id: "manufacturing", name: "Manufacturing", icon: "🏭", color: "from-orange-500 to-red-600" },
    { id: "healthcare", name: "Healthcare", icon: "🏥", color: "from-cyan-500 to-blue-600" },
    { id: "retail", name: "Retail & Logistics", icon: "🛒", color: "from-purple-500 to-indigo-600" },
    { id: "bfs", name: "BFSI (Banking)", icon: "🏦", color: "from-slate-700 to-slate-900" },
];
export function QuestionnaireEngine({
    onComplete,
    industry,
    intelData,
    onBack
}: {
    onComplete: (answers: Record<string, any>, riskAnalysis?: IoTNetworkAnalysis | null, questions?: Question[]) => void,
    industry?: string,
    intelData?: any,
    onBack?: () => void
}) {
    // Dynamic Questions State
    const [activeQuestions, setActiveQuestions] = useState<Question[]>(QUESTIONS);
    // Start true if we have an industry, to allow fetching
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(!!industry);

    // --- VISUAL THEMES ---
    const getTheme = (ind?: string) => {
        if (!ind) return { bg: "bg-slate-900", border: "border-slate-800", accent: "text-slate-400" };
        const i = ind.toLowerCase();
        if (i === "manufacturing") return { bg: "bg-amber-950/30", border: "border-amber-500/20", accent: "text-amber-500" };
        if (i === "bfsi" || i.includes("bank")) return { bg: "bg-indigo-950/30", border: "border-indigo-500/20", accent: "text-indigo-400" };
        if (i === "retail") return { bg: "bg-rose-950/30", border: "border-rose-500/20", accent: "text-rose-400" };
        if (i === "healthcare") return { bg: "bg-emerald-950/30", border: "border-emerald-500/20", accent: "text-emerald-400" };
        if (i === "logistics") return { bg: "bg-slate-800/50", border: "border-slate-600/30", accent: "text-slate-400" };
        if (i === "it" || i === "ites") return { bg: "bg-cyan-950/30", border: "border-cyan-500/20", accent: "text-cyan-400" };
        if (i === "infra") return { bg: "bg-zinc-800/50", border: "border-zinc-600/30", accent: "text-zinc-400" };

        return { bg: "bg-[var(--color-icici-blue)]/10", border: "border-[var(--color-icici-blue)]/20", accent: "text-[var(--color-icici-orange)]" };
    };
    const theme = getTheme(industry);

    // Fetch Dynamic Questions if Industry is present
    React.useEffect(() => {
        if (!industry) return;

        const fetchQuestions = async () => {
            try {
                // If we have top risks from Intel, pass them to context
                const risks = intelData?.top_risks || [];

                const res = await fetch("/api/generate-questions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ industry, risks })
                });

                const data = await res.json();
                if (data.questions && Array.isArray(data.questions)) {
                    setActiveQuestions(data.questions);
                }
            } catch (e) {
                console.error("Using static questions due to error:", e);
                // Fallback to static QUESTIONS is already set
            } finally {
                setIsLoadingQuestions(false);
            }
        };

        fetchQuestions();
    }, [industry, intelData]);

    // --- ADAPTIVE FLOW LOGIC ---
    const [isGeneratingNext, setIsGeneratingNext] = useState(false);

    // Connector Logic based on User Request
    const getConnectorForIndustry = (ind?: string) => {
        if (!ind) return null;
        const i = ind.toLowerCase();
        if (i === "it" || i === "ites") return { label: "Connect IoT Hub", icon: Wifi, type: "iot" };
        if (i === "manufacturing") return { label: "Connect SCADA Gateway", icon: Server, type: "scada" };
        if (i === "healthcare") return { label: "Connect EHR Logs", icon: Activity, type: "ehr" }; // Need Activity icon
        if (i === "bfsi" || i.includes("bank")) return { label: "Connect Core Banking", icon: Lock, type: "cbs" };
        // Default (or hide for others?) - User said "little bit out of the box", so maybe hide if not relevant or show generic
        return { label: "Connect Digital Twin", icon: Wifi, type: "generic" };
    };

    const connector = getConnectorForIndustry(industry);
    const showConnector = connector && (industry?.toLowerCase() === "it" || industry?.toLowerCase() === "manufacturing" || industry?.toLowerCase() === "healthcare" || industry?.toLowerCase() === "bfsi");

    const fetchNextQuestion = async (currentHistory: { question: string, answer: any }[]) => {
        setIsGeneratingNext(true);
        try {
            const risks = intelData?.top_risks || [];
            const res = await fetch("/api/generate-questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    industry,
                    risks,
                    history: currentHistory // Pass history to get next Q
                })
            });
            const data = await res.json();
            if (data.questions && data.questions.length > 0) {
                // Determine if we should add it
                // Prevent duplicates? logic is handled by API context usually
                const nextQ = data.questions[0];
                setActiveQuestions(prev => [...prev, nextQ]);
                return true;
            }
        } catch (e) {
            console.error("Adaptive Error", e);
        } finally {
            setIsGeneratingNext(false);
        }
        return false;
    };

    const handleNext = async () => {
        // Capture current answer
        const currentQ = activeQuestions[currentIndex];
        const currentAns = answers[currentQ.id];

        // Build History
        const historyItem = {
            question: currentQ.text,
            answer: currentAns
        };
        const currentHistory = activeQuestions.slice(0, currentIndex + 1).map(q => ({
            question: q.text,
            answer: answers[q.id]
        }));


        // --- ADAPTIVE LOGIC INJECTION ---
        if (currentQ.triggers) {
            currentQ.triggers.forEach(trigger => {
                // Loose equality for string vs number ("yes" vs true etc generally handled by string)
                // Assuming simple string match for now as per data
                if (trigger.answer === currentAns || (trigger.answer === "yes" && currentAns === "yes")) {
                    const newQuestions = trigger.addQuestions
                        .map(id => getDetailQuestion(id))
                        .filter(q => q !== undefined && !activeQuestions.find(aq => aq.id === q.id)); // Avoid dupes

                    if (newQuestions.length > 0) {
                        // Add only valid questions that are not already present
                        // cast because filter removes undefined but TS might not know
                        setActiveQuestions(prev => [...prev, ...(newQuestions as Question[])]);
                    }
                }
            });
        }

        // Check if we need to generate more questions
        // Limit to 8 questions total for now
        const TOTAL_QUESTIONS = 8;
        if (industry && currentIndex < TOTAL_QUESTIONS - 1 && currentIndex === activeQuestions.length - 1) {
            // We are at the end of the current list, try to fetch next
            const success = await fetchNextQuestion(currentHistory);
            if (success) {
                setDirection(1);
                setCurrentIndex(currentIndex + 1);
                return;
            }
        }

        if (isLast || currentIndex >= TOTAL_QUESTIONS - 1) {
            onComplete(answers, riskAnalysis, activeQuestions);
        } else {
            setDirection(1);
            setCurrentIndex(currentIndex + 1);
        }
    };

    // Initial Fetch (First Question)
    React.useEffect(() => {
        if (!industry) return;
        // If we already have questions (e.g. static fallback), clear them or overwrite?
        // Ideally fetch the first batch (or first single Q)
        const initFetch = async () => {
            // ... existing logic but maybe just get 1st Q?
            // For now, keep existing logic which gets 8. 
            // We can refactor to get 1 and then stream, BUT user asked for "out of box"
            // Let's stick to existing "batch" for initial load to be fast, 
            // OR clearing activeQuestions and fetching 1.
            // To be safe and fast, let's keep the initial batch load we built previously, 
            // BUT if we want "true adaptive", we should slice it.
        };
        // initFetch is handled by existing useEffect
    }, [industry]);

    // Existing useEffect logic...
    // Initial Fetch (First Question Batch based on Insight)
    useEffect(() => {
        if (!industry || activeQuestions.length > 0 && activeQuestions !== QUESTIONS) return;

        const initFetch = async () => {
            setIsLoadingQuestions(true);
            try {
                // If we have Intel Data (Risks), use them to seed the questions
                const risks = intelData?.top_risks || [];

                const res = await fetch("/api/generate-questions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        industry,
                        risks,
                        history: [] // Empty history = Initial Batch
                    })
                });

                const data = await res.json();
                if (data.questions && data.questions.length > 0) {
                    setActiveQuestions(data.questions);
                } else {
                    // Fallback to static if API fails
                    setActiveQuestions(QUESTIONS);
                }
            } catch (e) {
                console.error("Initial Question Fetch Error", e);
                setActiveQuestions(QUESTIONS);
            } finally {
                setIsLoadingQuestions(false);
            }
        };

        // Only fetch if we haven't already (or if currently showing purely static default)
        // Checks if activeQuestions is strictly the static reference
        if (activeQuestions === QUESTIONS) {
            initFetch();
        }
    }, [industry, intelData]);

    // Let's override the existing useEffect below.

    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [direction, setDirection] = useState(0);
    const [isScanning, setIsScanning] = useState(false);
    const [riskAnalysis, setRiskAnalysis] = useState<IoTNetworkAnalysis | null>(null);
    const [scanProgress, setScanProgress] = useState(0);

    // Insight Screen State
    const [showInsight, setShowInsight] = useState(false);

    // AI Analysis State
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [isRiskMinimized, setIsRiskMinimized] = useState(false);

    // AUTO-DEPLOY & GENERATIVE PATCHING
    const [deployingIds, setDeployingIds] = useState<Set<string>>(new Set());
    const [patchingDevice, setPatchingDevice] = useState<any>(null); // The device currently being patched
    const [generatedCode, setGeneratedCode] = useState<string>("");
    const [isGeneratingPatch, setIsGeneratingPatch] = useState(false);

    // Step 1: Generate the Patch
    // SIMULATED PARTNER CONNECTION (Instead of Magic Patching)
    const handleConnectPartner = async (device: any) => {
        setPatchingDevice(device);
        setDeployingIds(prev => new Set(prev).add(device.id));

        // Simulate "Connecting" delay
        setTimeout(() => {
            setDeployingIds(prev => {
                const next = new Set(prev);
                next.delete(device.id);
                return next;
            });

            // Mark as "Handled" visually
            if (aiAnalysis) {
                setAiAnalysis((prev: any) => ({
                    ...prev,
                    device_analysis: prev.device_analysis.map((d: any) =>
                        d.id === device.id
                            ? { ...d, fixed: true }
                            : d
                    )
                }));
            }
        }, 1500);
    };

    // Step 2: Execute the Patch (Simulation)
    const executePatch = () => {
        if (!patchingDevice) return;

        const deviceId = patchingDevice.id;
        setDeployingIds(prev => new Set(prev).add(deviceId));
        setPatchingDevice(null); // Close modal

        // Simulate Agent Action with 2s delay
        setTimeout(() => {
            setDeployingIds(prev => {
                const next = new Set(prev);
                next.delete(deviceId);
                return next;
            });

            // Optimistically update the UI to show resolution
            if (riskAnalysis) {
                setRiskAnalysis(prev => prev ? ({
                    ...prev,
                    criticalDevices: Math.max(0, prev.criticalDevices - 1),
                    vulnerabilities: {
                        ...prev.vulnerabilities,
                        weakAuth: Math.max(0, prev.vulnerabilities.weakAuth - 1)
                    }
                }) : null);

                // Update specific analysis item to show success
                if (aiAnalysis) {
                    setAiAnalysis((prev: any) => ({
                        ...prev,
                        device_analysis: prev.device_analysis.map((d: any) =>
                            d.id === deviceId
                                ? { ...d, fixed: true }
                                : d
                        )
                    }));
                }
            }
        }, 2000);
    };

    // REPORT GENERATION
    const [isReportLoading, setIsReportLoading] = useState(false);

    const handleDownloadReport = async () => {
        setIsReportLoading(true);
        try {
            const response = await fetch("/api/generate-report", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ context: riskAnalysis })
            });
            const data = await response.json();

            if (data.report) {
                const blob = new Blob([data.report], { type: "text/markdown" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `SITREP_${new Date().toISOString().split('T')[0]}.md`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (e) {
            console.error("Report Error", e);
        } finally {
            setIsReportLoading(false);
        }
    };

    const currentQuestion = activeQuestions[currentIndex];
    const progress = ((currentIndex + 1) / 8) * 100; // Fixed total for progress bar visual
    const isLast = currentIndex === activeQuestions.length - 1;

    const wsRef = React.useRef<WebSocket | null>(null);

    // Cleanup WebSocket on unmount
    React.useEffect(() => {
        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
        };
    }, []);

    const handleAnswer = (value: any) => {
        setAnswers({ ...answers, [currentQuestion.id]: value });
    };

    const handleBack = () => {
        if (currentIndex > 0) {
            setDirection(-1);
            setCurrentIndex(currentIndex - 1);
        }
    };

    const handleConnectIoT = async (fileContent?: string) => {
        // Cleanup existing connection
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setIsScanning(true);
        setAiAnalysis(null); // Reset previous analysis

        // Check if input is a WebSocket URL (BUT NOT the safe-zone simulation URL)
        const isSafeZone = fileContent?.includes("safe-zone.icici-lombard.azure-devices.net");

        if (fileContent && (fileContent.startsWith("ws://") || fileContent.startsWith("wss://")) && !isSafeZone) {
            // Live Stream Mode
            try {
                // Store ref to close later
                wsRef.current = IoTService.connectLiveStream(fileContent, (liveAnalysis) => {
                    setRiskAnalysis(liveAnalysis);

                    // Update answers in real-time using FUNCTIONAL UPDATE to avoid stale state
                    setAnswers((prevAnswers) => {
                        const newAnswers = { ...prevAnswers };
                        let hasChange = false;

                        // Only override if the IoT data is authoritative
                        if (liveAnalysis.totalDevices > 0 && newAnswers["iot_count"] !== liveAnalysis.totalDevices) {
                            newAnswers["iot_count"] = liveAnalysis.totalDevices;
                            hasChange = true;
                        }
                        if (liveAnalysis.vulnerabilities.weakAuth > 0 && newAnswers["mfa"] !== "no") {
                            newAnswers["mfa"] = "no";
                            hasChange = true;
                        }

                        return hasChange ? newAnswers : prevAnswers;
                    });
                });

                // Set initial expand state for UX once
                setIsRiskMinimized(false);

                // Immediate feedback while waiting for first packet
                setTimeout(() => {
                    setScanProgress(100);
                    setIsScanning(false);
                }, 1000);

                return;
            } catch (e) {
                console.error("WS Connection failed", e);
            }
        }

        // Standard File/Simulation Mode
        let p = 0;
        const interval = setInterval(() => {
            p += 5;
            if (p > 90) clearInterval(interval);
            setScanProgress(p);
        }, 100);

        const analysis = await IoTService.scanNetwork(fileContent);

        clearInterval(interval);
        setScanProgress(100);

        // Final safety check: if user started a live stream while this was waiting, don't overwrite
        if (!wsRef.current) {
            setRiskAnalysis(analysis);
            setIsRiskMinimized(false); // Auto-open on new detection

            const newAnswers = { ...answers };
            if (analysis.totalDevices > 0) newAnswers["iot_count"] = analysis.totalDevices;
            if (analysis.vulnerabilities.weakAuth > 0) newAnswers["mfa"] = "no";
            if (analysis.vulnerabilities.publicExposure > 0) newAnswers["iot_network"] = "Direct Internet";

            setTimeout(() => {
                setAnswers(newAnswers);
                setIsScanning(false);
            }, 800);
        } else {
            setIsScanning(false);
        }
    };

    const handleAnalyzeRisks = async () => {
        if (!riskAnalysis || aiAnalysis || analyzing) return;

        setAnalyzing(true);
        try {
            const result = await IoTService.analyzeDevicesWithAI(riskAnalysis.devices);

            // INJECT REAL VAS RECOMMENDATIONS
            // Map the detected risks to the Official VAS Catalog
            const enhancedRecommendations = result.recommendations?.map((rec: string) => {
                // Simple keyword matching to upgrade generic text to Product Names
                const lowerRec = rec.toLowerCase();
                let category: keyof typeof VAS_CATALOG = "CYBER";

                if (industry?.toLowerCase() === "manufacturing") category = "ENGINEERING";
                if (industry?.toLowerCase() === "healthcare") category = "CYBER"; // Healthcare needs Cyber
                if (industry?.toLowerCase() === "retail") category = "PROPERTY";

                // If it's a specific risk type, override category
                if (lowerRec.includes("tech") || lowerRec.includes("cargo")) category = "MARINE";
                if (lowerRec.includes("fire") || lowerRec.includes("heat")) category = "PROPERTY";

                const products = getRecommendedVAS(category, 1);
                return products.length > 0 ? `${products[0].name} - ${products[0].desc}` : rec;
            }) || [];

            // Ensure we have at least some recommendations if empty
            if (enhancedRecommendations.length === 0) {
                const defaults = getRecommendedVAS("CYBER", 2);
                defaults.forEach(d => enhancedRecommendations.push(`${d.name}`));
            }

            setAiAnalysis({ ...result, recommendations: enhancedRecommendations });
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    const currentAnswer = answers[currentQuestion.id];

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 50 : -50,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 50 : -50,
            opacity: 0,
        }),
    };

    // Consolidated Critical State Logic
    const isCritical = riskAnalysis && (
        riskAnalysis.criticalDevices > 0 ||
        riskAnalysis.vulnerabilities.weakAuth > 0 ||
        riskAnalysis.vulnerabilities.publicExposure > 0
    );

    // If loading dynamic questions
    if (isLoadingQuestions) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px]">
                <Loader3D status="scanning" className="w-20 h-20" hideText={true} />
                <p className="mt-4 text-emerald-400 font-mono animate-pulse">
                    GENERATING {industry?.toUpperCase()} ASSESSMENT...
                </p>
                <p className="text-xs text-slate-500">Adapting to sector risks</p>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto w-full relative">

            {/* 1. INSIGHT SCREEN (Before Questionnaire) */}
            <AnimatePresence>
                {showInsight && (
                    <motion.div
                        className="fixed inset-0 z-50 bg-slate-950"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0, y: -50 }}
                    >
                        <IndustryInsightView
                            industry={industry || "Manufacturing"}
                            onProceed={() => setShowInsight(false)}
                        />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 2. SCANNING OVERLAY */}
            <AnimatePresence>
                {isScanning && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center flex-col"
                    >
                        <Loader3D status="scanning" className="w-24 h-24" />
                        <p className="mt-6 text-emerald-400 font-mono animate-pulse text-lg">
                            SCANNING NETWORK...
                        </p>
                        <p className="text-sm text-slate-500 mt-2">
                            Analyzing {scanProgress}% of devices
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* MAIN QUESTIONNAIRE CONTENT */}
            {/* MAIN QUESTIONNAIRE CONTENT */}
            <div className="mb-8 relative">
                {onBack && (
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onBack}
                        className="absolute -left-12 top-0 text-slate-400 hover:text-white hover:bg-white/10"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </Button>
                )}
                <div className="flex justify-between items-center mb-4">
                    {!riskAnalysis && showConnector ? (
                        <IoTConnectionDialog
                            onConnect={handleConnectIoT}
                            isScanning={isScanning}
                            scanProgress={scanProgress}
                            trigger={
                                <Button
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-[0_0_20px_rgba(16,185,129,0.3)] animate-pulse"
                                >
                                    {isScanning ? (
                                        <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Connecting... ({scanProgress}%)
                                        </>
                                    ) : (
                                        <>
                                            {connector && <connector.icon className="w-4 h-4 mr-2" />}
                                            {connector?.label || "Connect IoT"}
                                        </>
                                    )}
                                </Button>
                            }
                        />
                    ) : (
                        <div className="h-8"></div>
                    )}
                    <div className="text-right">
                        <div className="text-xs text-slate-500 font-mono">RISK ENGINE V2.0</div>
                        <div className={`text-[10px] ${theme.accent} font-bold uppercase tracking-wider`}>
                            {currentQuestion.category} VECTOR
                        </div>
                    </div>
                </div>
                <Progress value={progress} className={`h-1 bg-white/10`} color={theme.accent.replace('text-', 'bg-')} />
            </div>

            {/* TOP STATUS BANNER */}
            {
                riskAnalysis && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`mb-6 rounded-xl border relative overflow-hidden backdrop-blur-md ${isCritical
                            ? "bg-red-950/20 border-red-500/30 py-3"
                            : "bg-emerald-950/20 border-emerald-500/20 py-2"
                            }`}
                    >
                        <div className="flex flex-col items-center justify-center relative z-10 w-full px-6">
                            {isCritical ? (
                                // CRITICAL STATE
                                <div className="flex items-center w-full justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="shrink-0 scale-75 origin-center -ml-2">
                                            <Loader3D status="critical" className="h-[60px] w-[60px]" hideText={true} />
                                        </div>
                                        <div className="h-8 w-[1px] bg-red-500/30"></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-red-500 uppercase tracking-[0.2em] mb-1">Critical Threat Detected</p>
                                            <div className="flex items-center gap-3 text-[10px] text-red-200/60 font-mono">
                                                <span><span className="text-white font-bold">{riskAnalysis.vulnerabilities.weakAuth}</span> Weak Auth</span>
                                                <span className="text-red-500/30">|</span>
                                                <span><span className="text-white font-bold">{riskAnalysis.vulnerabilities.publicExposure}</span> Public Exposure</span>
                                            </div>
                                        </div>
                                    </div>
                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button variant="outline" size="sm" onClick={handleAnalyzeRisks} className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-white text-[10px] uppercase tracking-wider backdrop-blur-sm bg-transparent px-4">
                                                <Eye className="w-3 h-3 mr-2" /> View Analysis
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl sm:max-h-[90vh]">
                                            <DialogHeader>
                                                <div className="flex justify-between items-start">
                                                    <div>
                                                        <DialogTitle className="text-xl font-bold flex items-center text-red-400">
                                                            <ShieldAlert className="w-5 h-5 mr-2" /> AI Threat Analysis
                                                        </DialogTitle>
                                                        <DialogDescription className="text-slate-400 mt-1">
                                                            Real-time generative assessment of detected endpoints.
                                                        </DialogDescription>
                                                    </div>
                                                    {aiAnalysis && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={handleDownloadReport}
                                                            disabled={isReportLoading}
                                                            className="border-indigo-500/50 text-indigo-400 hover:bg-indigo-500/20"
                                                        >
                                                            {isReportLoading ? (
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <>
                                                                    <Download className="w-4 h-4 mr-2" />
                                                                    Download SITREP
                                                                </>
                                                            )}
                                                        </Button>
                                                    )}
                                                </div>
                                            </DialogHeader>
                                            <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto pr-2">
                                                {analyzing ? (
                                                    <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-4">
                                                        <Loader2 className="w-8 h-8 animate-spin text-[var(--color-icici-blue)]" />
                                                        <p className="text-sm font-mono animate-pulse">Consulting Cyber-Guardian AI...</p>
                                                    </div>
                                                ) : aiAnalysis ? (
                                                    <>
                                                        {aiAnalysis.overall_summary && (
                                                            <div className="p-4 rounded-lg bg-[var(--color-icici-blue)]/10 border border-[var(--color-icici-blue)]/20 mb-4">
                                                                <h5 className="text-xs font-bold text-[var(--color-icici-blue)] uppercase mb-2">Executive Summary</h5>
                                                                <p className="text-sm text-slate-300 leading-relaxed italic">"{aiAnalysis.overall_summary}"</p>
                                                            </div>
                                                        )}
                                                        {aiAnalysis.device_analysis?.map((item: any, idx: number) => (
                                                            <div key={idx} className="p-4 rounded-lg bg-black/40 border border-slate-800 hover:border-red-500/30 transition-colors group">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-mono text-sm text-white font-bold">{item.id || "Unknown Device"}</span>
                                                                        </div>
                                                                    </div>
                                                                    <Badge variant="destructive" className="text-[10px]">High Risk</Badge>
                                                                </div>
                                                                <div className="grid gap-3">
                                                                    <div className="text-xs text-slate-300 bg-red-950/20 p-2 rounded border border-red-500/10">
                                                                        <span className="font-bold text-red-400 block mb-1">⚠️ Threat Analysis:</span>{item.analysis}
                                                                    </div>
                                                                    <div className="text-xs text-slate-300 bg-emerald-950/20 p-2 rounded border border-emerald-500/10">
                                                                        <span className="font-bold text-emerald-400 block mb-1">🛠️ Recommended Action:</span>{item.remediation}
                                                                    </div>
                                                                </div>

                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => handleConnectPartner(item)}
                                                                    disabled={deployingIds.has(item.id) || item.fixed}
                                                                    className={`w-full mt-3 text-xs h-8 transition-all duration-300 ${item.fixed
                                                                        ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                        : "bg-[var(--color-icici-orange)] hover:bg-orange-600 text-white"
                                                                        }`}
                                                                >
                                                                    {deployingIds.has(item.id) ? (
                                                                        <>
                                                                            <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                                                                            Connecting to Partner...
                                                                        </>
                                                                    ) : item.fixed ? (
                                                                        <>
                                                                            <CheckCircle2 className="w-3 h-3 mr-2" />
                                                                            Partner Connected
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <ArrowRight className="w-3 h-3 mr-2" />
                                                                            Connect Partner Solution
                                                                        </>
                                                                    )}
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </>
                                                ) : (
                                                    <div className="text-center py-8 text-slate-500">Ready to analyze.</div>
                                                )}
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                </div>
                            ) : (
                                // SAFE STATE
                                <div className="flex items-center w-full justify-between">
                                    <div className="flex items-center gap-5">
                                        <div className="shrink-0 scale-75 origin-center -ml-2">
                                            <Loader3D status="safe" className="h-[60px] w-[60px]" hideText={true} />
                                        </div>
                                        <div className="h-8 w-[1px] bg-emerald-500/30"></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-emerald-400 uppercase tracking-[0.2em] mb-1">System Secure</p>
                                            <p className="text-[11px] text-emerald-400/60 font-mono">
                                                Monitoring <span className="text-white font-bold">{riskAnalysis.totalDevices}</span> active endpoints
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center px-4 py-1.5 rounded-full bg-emerald-950/30 border border-emerald-500/20 mr-2">
                                        <span className="relative flex h-2 w-2 mr-2">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                        </span>
                                        <span className="text-[10px] font-mono text-emerald-400/80 uppercase tracking-wider">Live</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )
            }

            {/* RISK INSIGHT CARDS */}
            {
                (!riskAnalysis || isCritical) && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
                    >
                        <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-950/20 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <Lightbulb className="w-4 h-4 text-blue-400" />
                                <h4 className="text-xs font-bold text-blue-400 uppercase tracking-wider">Risk Insight</h4>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {currentQuestion.insight}
                            </p>
                        </div>

                        <div className="p-4 rounded-xl border border-[var(--color-icici-orange)]/20 bg-[var(--color-icici-orange)]/5 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <ShieldCheck className="w-4 h-4 text-[var(--color-icici-orange)]" />
                                <h4 className="text-xs font-bold text-[var(--color-icici-orange)] uppercase tracking-wider">ICICI Lombard Expertise</h4>
                            </div>
                            <p className="text-xs text-slate-300 leading-relaxed">
                                {currentQuestion.riskContext}
                            </p>
                        </div>
                    </motion.div>
                )
            }

            <div className="grid grid-cols-1">
                <AnimatePresence custom={direction} mode="wait">
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={variants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        className="col-start-1 row-start-1 w-full"
                    >
                        <Card className="p-8 min-h-[350px] flex flex-col justify-between" shiny>
                            <div>
                                <h3 className="text-2xl font-bold mb-6 text-white leading-tight">
                                    {currentQuestion.text}
                                </h3>
                                {currentQuestion.tooltip && (
                                    <p className="text-sm text-slate-400 mb-6 bg-white/5 p-3 rounded-lg border border-white/5 inline-block">
                                        💡 {currentQuestion.tooltip}
                                    </p>
                                )}

                                <div className="mt-4 space-y-4">
                                    {/* YES / NO */}
                                    {currentQuestion.type === "yes_no" && (
                                        <div className="flex gap-4">
                                            <Button
                                                variant={currentAnswer === "yes" ? "primary" : "outline"}
                                                onClick={() => handleAnswer("yes")}
                                                className="flex-1 h-14 text-lg"
                                            >
                                                Yes
                                            </Button>
                                            <Button
                                                variant={currentAnswer === "no" ? "danger" : "outline"}
                                                onClick={() => handleAnswer("no")}
                                                className="flex-1 h-14 text-lg"
                                            >
                                                No
                                            </Button>
                                        </div>
                                    )}

                                    {/* SELECT */}
                                    {currentQuestion.type === "select" && (
                                        <div className="grid grid-cols-1 gap-3">
                                            {currentQuestion.options?.map((opt) => (
                                                <Button
                                                    key={opt}
                                                    variant={currentAnswer === opt ? "primary" : "outline"}
                                                    onClick={() => handleAnswer(opt)}
                                                    className="justify-start text-left h-auto py-3 px-6 text-sm md:text-base border-white/20"
                                                >
                                                    {opt}
                                                </Button>
                                            ))}
                                        </div>
                                    )}

                                    {/* NUMBER INPUT */}
                                    {currentQuestion.type === "number" && (
                                        <div className="pt-2">
                                            <input
                                                type="number"
                                                min="0"
                                                placeholder="Enter value..."
                                                value={currentAnswer || ""}
                                                onChange={(e) => handleAnswer(Number(e.target.value))}
                                                className="flex h-12 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-lg text-white placeholder:text-slate-400 focus:border-[var(--color-icici-orange)] focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-[var(--color-icici-orange)] transition-all duration-300"
                                            />
                                        </div>
                                    )}

                                    {/* MULTI SELECT */}
                                    {currentQuestion.type === "multi_select" && (
                                        <div className="grid grid-cols-2 gap-3">
                                            {currentQuestion.options?.map((opt) => {
                                                const selected = (currentAnswer || []) as string[];
                                                const isSelected = selected.includes(opt);
                                                return (
                                                    <Button
                                                        key={opt}
                                                        variant={isSelected ? "primary" : "outline"}
                                                        onClick={() => {
                                                            if (isSelected) {
                                                                handleAnswer(selected.filter((s) => s !== opt));
                                                            } else {
                                                                handleAnswer([...(selected || []), opt]);
                                                            }
                                                        }}
                                                        className="justify-center h-auto py-3 text-sm"
                                                    >
                                                        {isSelected && <CheckCircle2 className="w-4 h-4 mr-2" />}
                                                        {opt}
                                                    </Button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>



                            </div>


                            <div className="flex justify-between mt-10">
                                <Button
                                    variant="ghost"
                                    onClick={handleBack}
                                    disabled={currentIndex === 0}
                                    className="text-slate-400 hover:text-white"
                                >
                                    <ChevronLeft className="mr-2 w-4 h-4" /> Back
                                </Button>

                                <Button
                                    onClick={handleNext}
                                    disabled={currentAnswer === undefined}
                                    className="px-8"
                                >
                                    {isLast ? "Finish Assessment" : "Next Question"} <ChevronRight className="ml-2 w-4 h-4" />
                                </Button>
                            </div>
                        </Card>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* PATCH PREVIEW MODAL */}
            <Dialog open={!!patchingDevice} onOpenChange={(open) => !open && setPatchingDevice(null)}>
                <DialogContent className="max-w-2xl bg-slate-950 border-slate-800 text-white">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            Partner Connection Hub
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Connect with verified specialized partners to mitigate this risk.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="mt-4">
                        {isGeneratingPatch ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Loader3D status="scanning" hideText={true} className="w-16 h-16" />
                                <div className="text-center space-y-1">
                                    <p className="font-mono text-sm text-emerald-400 animate-pulse">ESTABLISHING SECURE HANDSHAKE...</p>
                                    <p className="text-xs text-slate-500">Verifying partner credentials</p>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* ROADMAP VIEW */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Implementation Roadmap</h4>
                                        <div className="space-y-4">
                                            <div className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                    <div className="w-[1px] h-full bg-emerald-500/20 my-1"></div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">Phase 1: Immediate</p>
                                                    <p className="text-[10px] text-slate-400">Deploy Sensors & Initial Config (Weeks 1-2)</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                                    <div className="w-[1px] h-full bg-blue-500/20 my-1"></div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">Phase 2: Integration</p>
                                                    <p className="text-[10px] text-slate-400">Policy Tuning & Alert Setup (Weeks 3-4)</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-3">
                                                <div className="flex flex-col items-center">
                                                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-bold text-white">Phase 3: Optimization</p>
                                                    <p className="text-[10px] text-slate-400">Continuous Monitoring (Ongoing)</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-4 rounded-lg bg-white/5 border border-white/10 flex flex-col justify-between">
                                        <div>
                                            <h4 className="text-xs font-bold text-slate-400 uppercase mb-3">Projected Impact</h4>
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-300">Risk Reduction</span>
                                                    <span className="text-emerald-400 font-bold">85%</span>
                                                </div>
                                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 w-[85%]"></div>
                                                </div>
                                            </div>
                                            <div className="space-y-2 mt-4">
                                                <div className="flex justify-between items-center text-sm">
                                                    <span className="text-slate-300">Est. Claims Impact</span>
                                                    <span className="text-emerald-400 font-bold">-15%</span>
                                                </div>
                                                <div className="w-full bg-white/10 h-1.5 rounded-full overflow-hidden">
                                                    <div className="h-full bg-emerald-500 w-[15%]"></div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-4 p-2 bg-emerald-950/20 border border-emerald-500/20 rounded text-[10px] text-emerald-400/80 text-center">
                                            "Proactive partnership reduces loss ratios."
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-2">
                                    <Button variant="ghost" onClick={() => setPatchingDevice(null)}>Cancel</Button>
                                    <Button
                                        onClick={executePatch}
                                        className="bg-[var(--color-icici-orange)] hover:bg-orange-600 text-white gap-2"
                                    >
                                        <ArrowRight className="w-4 h-4" />
                                        Initiate Partner Connection
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>

            {/* FLOATING THREAT HUNTER COPILOT */}
            <CyberAgentChat riskAnalysis={riskAnalysis} industry={industry} />
        </div >
    );
}
