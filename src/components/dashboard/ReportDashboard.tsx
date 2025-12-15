"use client";

import React, { useEffect, useState } from "react";
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
import { speakText } from "@/lib/voice";

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
                        { id: "action-download", short: "DL", full: "Download Full Report", icon: <Download className="w-3 h-3" />, action: () => window.print() }
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

                                <h3 className="text-2xl font-light text-white mb-8 flex items-center gap-4">
                                    <span className="w-1.5 h-8 bg-gradient-to-b from-[var(--color-icici-orange)] to-transparent rounded-full" />
                                    Vital Metrics
                                </h3>

                                <div className="space-y-8">
                                    <div className="flex justify-between text-[10px] uppercase tracking-widest text-slate-500 font-mono border-b border-white/10 pb-2">
                                        <span>Metric</span>
                                        <div className="flex gap-2">
                                            <div className="w-16 text-right"><span className="text-white">You</span></div>
                                            <div className="w-28 text-right"><span>Industry Avg</span></div>
                                        </div>
                                    </div>
                                    {[
                                        { label: "Exposure Surface", val: analysis.components.E, bench: analysis.benchmarks?.E ?? 50, color: "bg-blue-500", desc: "External attack vectors." },
                                        { label: "Immune Controls", val: analysis.components.C, bench: analysis.benchmarks?.C ?? 50, color: "bg-[var(--color-icici-orange)]", desc: "Internal defense mechanisms." },
                                        { label: "IoT Hygiene", val: analysis.components.I, bench: analysis.benchmarks?.I ?? 50, color: "bg-purple-500", desc: "Connected device security." }
                                    ].map((item, i) => (
                                        <div key={i} className="group/metric cursor-pointer">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="flex-1 pr-4">
                                                    <span className="text-lg text-white font-medium block group-hover/metric:text-[var(--color-icici-orange)] transition-colors tracking-wide">{item.label}</span>
                                                    <span className="text-xs text-slate-400 font-light tracking-wide block leading-tight mt-1">{item.desc}</span>
                                                </div>

                                                <div className="flex gap-2 items-end">
                                                    {/* User Score */}
                                                    <div className="flex flex-col items-end w-16">
                                                        <span className="text-2xl font-light text-white tabular-nums">{item.val.toFixed(0)}</span>
                                                    </div>

                                                    {/* Industry Benchmark */}
                                                    <div className="flex flex-col items-end w-28 opacity-50">
                                                        <span className="text-xl font-thin text-slate-300 tabular-nums">{item.bench.toFixed(0)}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Dual Progress Bars */}
                                            <div className="relative h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm mt-3">
                                                {/* Industry Marker (Subtle Background Bar) */}
                                                <div
                                                    className="absolute top-0 left-0 h-full bg-slate-600/30"
                                                    style={{ width: `${item.bench}%` }}
                                                />

                                                {/* User Progress */}
                                                <motion.div
                                                    initial={{ width: 0 }}
                                                    whileInView={{ width: `${item.val}%` }}
                                                    transition={{ duration: 1.5, ease: "easeOut" }}
                                                    className={`absolute top-0 left-0 h-full ${item.color} shadow-[0_0_10px_currentColor] opacity-100 z-10`}
                                                />

                                                {/* Industry Pip/Marker */}
                                                <div
                                                    className="absolute top-0 w-0.5 h-full bg-white/50 z-20"
                                                    style={{ left: `${item.bench}%` }}
                                                />
                                            </div>
                                            <div className="flex justify-end mt-1">
                                                <span className="text-[9px] text-slate-500 uppercase tracking-wider">
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
                                <div className="md:w-1/3 flex flex-col justify-center border-r border-white/5 pr-12">
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
                        <Button variant="primary" className="bg-white text-black hover:bg-[var(--color-icici-orange)]/20 rounded-full px-8" onClick={() => window.print()}>
                            Download Full Report
                        </Button>
                    </div>


                </div>
            </div>
            {/* Optimization Modal */}
            {analysis && (
                <OptimizationModal
                    isOpen={showOptimization}
                    onClose={() => setShowOptimization(false)}
                    analysis={analysis}
                />
            )}

            <PrintableReport analysis={analysis} industry={answers["industry_selection"] || "General"} />
        </div >
    );
}
