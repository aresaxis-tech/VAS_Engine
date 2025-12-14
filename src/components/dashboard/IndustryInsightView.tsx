import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Loader3D } from "@/components/ui/Loader3D";
import { Shield, AlertTriangle, TrendingUp, CheckCircle2, EyeOff, Telescope, Lightbulb, Zap, Bot, ArrowLeft, Activity, ShieldAlert, Download, Loader2, ArrowRight, Eye, CheckCircle } from "lucide-react";
import { IoTConnectionDialog } from "./IoTConnectionDialog";
import { IoTService, IoTNetworkAnalysis } from "@/lib/iotSimulator";
import { VAS_CATALOG, getRecommendedVAS } from "@/data/vas_catalog";
import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle,
    DialogTrigger
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface IndustryInsightViewProps {
    industry: string;
    subSector?: string;
    initialIntelData?: any;
    onProceed: (intelData: any) => void;
    onStartChatAssessment?: (intelData: any) => void;
    onBack?: () => void;
}

export const IndustryInsightView: React.FC<IndustryInsightViewProps> = ({ industry, subSector, initialIntelData, onProceed, onStartChatAssessment, onBack }) => {
    const [intel, setIntel] = useState<any>(initialIntelData || null);
    const [loading, setLoading] = useState(!initialIntelData);

    // IoT & Analysis State
    const [isIoTScanning, setIsIoTScanning] = React.useState(false);
    const [iotScanProgress, setIoTScanProgress] = React.useState(0);
    const [riskAnalysis, setRiskAnalysis] = useState<IoTNetworkAnalysis | null>(null);
    const [aiAnalysis, setAiAnalysis] = useState<any>(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [showAnalysisDialog, setShowAnalysisDialog] = useState(false);
    const [isReportLoading, setIsReportLoading] = useState(false);

    // Auto-Analysis flow
    const handleAnalyzeRisks = async (analysisData: IoTNetworkAnalysis) => {
        setAnalyzing(true);
        try {
            const result = await IoTService.analyzeDevicesWithAI(analysisData.devices);

            // Enhance with VAS Recommendations
            const enhancedRecommendations = result.recommendations?.map((rec: string) => {
                const lowerRec = rec.toLowerCase();
                let category: keyof typeof VAS_CATALOG = "CYBER";
                if (industry?.toLowerCase() === "manufacturing") category = "ENGINEERING";
                if (industry?.toLowerCase() === "healthcare") category = "CYBER";

                if (lowerRec.includes("fire") || lowerRec.includes("heat")) category = "PROPERTY";

                const products = getRecommendedVAS(category, 1);
                return products.length > 0 ? `${products[0].name} - ${products[0].desc}` : rec;
            }) || [];

            setAiAnalysis({ ...result, recommendations: enhancedRecommendations });
        } catch (e) {
            console.error(e);
        } finally {
            setAnalyzing(false);
        }
    };

    const handleIoTConnect = async (source?: string) => {
        setIsIoTScanning(true);
        setIoTScanProgress(0);

        // Progress Simulation
        const interval = setInterval(() => {
            setIoTScanProgress(p => Math.min(p + 10, 90));
        }, 200);

        try {
            // Real Scan
            const analysis = await IoTService.scanNetwork(source); // source is file content or URL

            clearInterval(interval);
            setIoTScanProgress(100);
            await new Promise(r => setTimeout(r, 500)); // Brief pause at 100%

            setRiskAnalysis(analysis);
            setIsIoTScanning(false);

            // Auto open analysis dialog
            setShowAnalysisDialog(true);
            handleAnalyzeRisks(analysis);

        } catch (e) {
            console.error("Scan failed", e);
            setIsIoTScanning(false);
            clearInterval(interval);
        }
    };

    // Download Report Mock
    const handleDownloadReport = () => {
        setIsReportLoading(true);
        setTimeout(() => {
            alert("Downloading SITREP...");
            setIsReportLoading(false);
        }, 1500);
    };

    // --- COLOR THEME ENGINE ---
    const getTheme = (ind: string) => {
        const i = ind.toLowerCase();
        if (i === "manufacturing") return { accent: "text-amber-500", border: "border-amber-500/20", bg: "bg-amber-950/20", glow: "shadow-amber-500/20" };
        if (i === "bfsi" || i.includes("bank")) return { accent: "text-indigo-400", border: "border-indigo-500/20", bg: "bg-indigo-950/20", glow: "shadow-indigo-500/20" };
        if (i === "retail") return { accent: "text-rose-400", border: "border-rose-500/20", bg: "bg-rose-950/20", glow: "shadow-rose-500/20" };
        if (i === "healthcare") return { accent: "text-emerald-400", border: "border-emerald-500/20", bg: "bg-emerald-950/20", glow: "shadow-emerald-500/20" };
        if (i.includes("it")) return { accent: "text-cyan-400", border: "border-cyan-500/20", bg: "bg-cyan-950/20", glow: "shadow-cyan-500/20" };
        return { accent: "text-[var(--color-icici-orange)]", border: "border-[var(--color-icici-orange)]/20", bg: "bg-[var(--color-icici-blue)]/10", glow: "shadow-orange-500/20" };
    };
    const theme = getTheme(industry || "");

    const [selectedSubSector, setSelectedSubSector] = useState<string | null>(subSector || null);

    const fetchIntel = async (sub?: string) => {
        setLoading(true);
        try {
            const res = await fetch("/api/industry-intel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ industry, subSector: sub }),
            });
            const data = await res.json();
            setIntel(data);
            if (sub) setSelectedSubSector(sub);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (initialIntelData) {
            setIntel(initialIntelData);
            setLoading(false);
            if (subSector) setSelectedSubSector(subSector);
        } else if (industry) {
            // If subSector is provided but no data, fetch specific data
            fetchIntel(subSector);
        }
    }, [industry, initialIntelData, subSector]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[80vh] text-center space-y-6">
                <Loader3D status="scanning" className="w-24 h-24" hideText={true} />
                <div className="space-y-2">
                    <p className={`font-mono text-lg animate-pulse ${theme.accent}`}>
                        Leveraging Legacy Data...
                    </p>
                    <p className="text-xs text-slate-500 font-mono">
                        Tapping PRRS, RRIT & Billions of Data Points
                    </p>
                </div>
            </div>
        );
    }

    if (!intel) return <div>Failed to load intel.</div>;

    // DRILL DOWN MODE: If sub_sectors exist and none selected, ask user to refine.
    const showDrillDown = intel.sub_sectors && intel.sub_sectors.length > 0 && !selectedSubSector;

    return (
        <div className="min-h-screen bg-slate-950 px-4 pb-4 pt-24 md:px-8 md:pb-8 md:pt-32 font-sans text-slate-200 relative">

            {/* Header / Nav */}
            <div className="w-full max-w-6xl mx-auto pb-20 relative">

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                    className="grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                    {/* 1. HERO CARD (Col Span 3) - Emotional Hook */}
                    <div className={`md:col-span-3 rounded-2xl border ${theme.border} ${theme.bg} p-8 relative overflow-hidden backdrop-blur-sm group`}>
                        {onBack && (
                            <button
                                onClick={onBack}
                                className="absolute top-6 left-6 z-50 p-2 rounded-full bg-black/20 border border-white/10 text-slate-300 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                        )}
                        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                            <Shield className="w-64 h-64" />
                        </div>
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-4 pl-14">
                                <span className={`px-3 py-1 rounded-full text-[10px] uppercase font-bold tracking-widest border ${theme.border} bg-black/40 ${theme.accent}`}>
                                    {selectedSubSector ? "Niche Intelligence" : "Sector Briefing"}
                                </span>
                                <span className="text-xs text-slate-500 font-mono uppercase">
                                    {new Date().toLocaleDateString()}
                                </span>
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
                                {intel.headline}
                            </h1>
                            <p className="text-xl md:text-2xl text-slate-300 font-light italic border-l-4 border-white/20 pl-6 leading-relaxed">
                                "{intel.emotional_hook || intel.summary}"
                            </p>
                        </div>
                    </div>

                    {/* 2. BENCHMARK CARD (Col Span 1) */}
                    <div className={`md:col-span-1 rounded-2xl border ${theme.border} bg-black/40 p-6 flex flex-col justify-between relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/80 z-0"></div>
                        <div className="relative z-10">
                            <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 ${theme.accent}`}>
                                Industry Benchmark
                            </h3>
                            <div className="text-4xl font-black text-white mb-1 tracking-tighter">
                                {intel.benchmark?.value}
                            </div>
                            <p className="text-sm text-slate-400 mb-4 border-b border-white/10 pb-4">
                                {intel.benchmark?.metric}
                            </p>
                            <div className="flex items-center gap-2">
                                <TrendingUp className={`w-4 h-4 ${theme.accent}`} />
                                <span className="text-xs font-mono text-slate-500 uppercase">
                                    {intel.benchmark?.context}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* 3. TOP RISKS LIST (Col Span 2) */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                                <Zap className="w-4 h-4 text-yellow-400" /> Active Threat Vectors
                            </h3>
                        </div>
                        <div className="grid gap-3">
                            {intel.top_risks?.slice(0, 3).map((risk: any, i: number) => (
                                <div key={i} className="group p-4 rounded-xl bg-slate-900/50 border border-white/5 hover:border-white/20 transition-all flex items-start gap-4">
                                    <span className="text-2xl font-black text-slate-700 group-hover:text-white/20 transition-colors">0{i + 1}</span>
                                    <div>
                                        <div className="flex justify-between w-full mb-1">
                                            <h4 className="font-bold text-slate-200 group-hover:text-white">{risk.title}</h4>
                                            <span className={`text-[10px] px-2 py-0.5 rounded bg-white/5 ${theme.accent}`}>{risk.impact}</span>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed mb-2">{risk.desc}</p>
                                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                                            <Shield className="w-3 h-3" /> Strategy: <span className="text-slate-300">{risk.innovation_strategy}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 4. KNOWLEDGE CARDS (Vertical Stack in Col Span 1) */}
                    <div className="md:col-span-1 grid grid-rows-2 gap-4">
                        {/* BLIND SPOT */}
                        <div className="rounded-xl border border-red-500/20 bg-red-950/10 p-5 relative overflow-hidden group hover:bg-red-950/20 transition-colors">
                            <div className="absolute top-2 right-2 opacity-20"><EyeOff className="w-12 h-12 text-red-500" /></div>
                            <h4 className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-2">Blind Spot</h4>
                            <p className="text-sm font-bold text-red-200 leading-snug">
                                {intel.blind_spot || "Unmapped Supply Chain Dependencies"}
                            </p>
                        </div>

                        {/* FUTURE WATCH */}
                        <div className={`rounded-xl border ${theme.border} bg-slate-900/50 p-5 relative overflow-hidden group hover:bg-slate-900 transition-colors`}>
                            <div className="absolute top-2 right-2 opacity-20"><Telescope className={`w-12 h-12 ${theme.accent}`} /></div>
                            <h4 className={`text-[10px] font-black uppercase tracking-widest mb-2 ${theme.accent}`}>Future Watch (3-5Y)</h4>
                            <p className="text-sm font-medium text-slate-300 leading-snug">
                                {intel.future_watch || "AI-Driven Liability Models"}
                            </p>
                        </div>
                    </div>

                    {/* 5. RIGHT COLUMN (Stacked: Actions + Did You Know) */}
                    <div className="md:col-span-1 grid grid-rows-2 gap-4">

                        {/* BOX 1: ACTIONS */}
                        <div className={`rounded-xl border ${theme.border} bg-black/40 p-5 flex flex-col justify-center relative overflow-hidden shadow-2xl backdrop-blur-sm`}>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>

                            {showDrillDown ? (
                                <div className="flex flex-col gap-2 z-10 w-full h-full justify-center">
                                    <p className="text-xs text-slate-400 mb-2 font-mono uppercase text-center">Refine Intelligence:</p>
                                    <div className="flex flex-col gap-2 overflow-y-auto max-h-[150px] pr-1 scrollbar-thin scrollbar-thumb-slate-700">
                                        {intel.sub_sectors.map((sub: string) => (
                                            <Button
                                                key={sub}
                                                onClick={() => fetchIntel(sub)}
                                                variant="outline"
                                                className="w-full justify-start text-xs border-slate-700 hover:bg-white/10 text-slate-300 h-9 px-3 truncate"
                                            >
                                                {sub}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center w-full z-10 gap-3 py-2">
                                    <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 text-center w-full border-b border-white/10 pb-2 mb-1">
                                        EVALUATE YOUR INDUSTRY RISKS
                                    </h3>
                                    {/* BUTTON 1: Start Agent Chat (Primary) */}
                                    <Button
                                        onClick={() => onStartChatAssessment && onStartChatAssessment(intel)}
                                        className="h-11 w-full rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 whitespace-nowrap text-xs md:text-sm bg-[var(--color-icici-orange)] hover:brightness-110 shadow-orange-500/40 border border-white/10"
                                    >
                                        Assess Your Risk <Bot className="w-4 h-4 ml-2" />
                                    </Button>
                                    {/* BUTTON 2: Connect Logs (IoT Flow) */}
                                    <IoTConnectionDialog
                                        isScanning={isIoTScanning}
                                        scanProgress={iotScanProgress}
                                        onConnect={handleIoTConnect}
                                        trigger={
                                            <Button
                                                className="h-11 w-full rounded-xl font-bold text-white shadow-lg transition-all hover:scale-105 whitespace-nowrap text-xs md:text-sm bg-emerald-600 hover:bg-emerald-700"
                                            >
                                                <Activity className="w-4 h-4 mr-2" /> IOT Evaluation
                                            </Button>
                                        }
                                    />
                                </div>
                            )}
                        </div>

                        {/* BOX 2: DID YOU KNOW */}
                        <div className="rounded-xl bg-white/5 border border-white/10 p-5 flex flex-col justify-center text-center relative overflow-hidden group hover:bg-white/10 transition-colors">
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent"></div>
                            <Lightbulb className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
                            <p className="text-xs text-slate-400 uppercase tracking-widest mb-2 font-bold">Did You Know?</p>
                            <p className="text-sm font-medium text-slate-300 italic leading-relaxed">
                                "{intel.did_you_know || "Risk improves by 40% with IoT."}"
                            </p>
                        </div>
                    </div>
                </motion.div >
            </div >
        </div >
    );
};
