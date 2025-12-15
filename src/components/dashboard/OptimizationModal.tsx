"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ArrowRight, ShieldCheck, Activity, TrendingDown } from "lucide-react";
import { RiskAnalysis, VASRecommendation } from "@/lib/riskEngine";
import { Button } from "@/components/ui/button";

interface OptimizationModalProps {
    isOpen: boolean;
    onClose: () => void;
    analysis: RiskAnalysis;
}

export function OptimizationModal({ isOpen, onClose, analysis }: OptimizationModalProps) {
    const [selectedRecs, setSelectedRecs] = useState<Set<string>>(new Set());
    const [simulatedScore, setSimulatedScore] = useState(analysis.score);

    // Auto-select all initially to show maximum potential? Or none?
    // Let's select none so they can "build" their safety.
    // Actually, user wants to see "Optimize To 19", so let's select ALL by default to match that number.
    useEffect(() => {
        if (isOpen) {
            const allIds = new Set(analysis.recommendations.map(r => r.id));
            setSelectedRecs(allIds);
        }
    }, [isOpen, analysis]);

    useEffect(() => {
        // Calculate dynamic score based on selection
        const totalReduction = analysis.recommendations
            .filter(r => selectedRecs.has(r.id))
            .reduce((sum, r) => sum + r.riskReduction, 0);

        // Simple subtraction (Floor at 10 for realism - never 0 risk)
        setSimulatedScore(Math.max(10, Math.round(analysis.score - totalReduction)));
    }, [selectedRecs, analysis]);

    const toggleRec = (id: string) => {
        const next = new Set(selectedRecs);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedRecs(next);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 md:inset-auto md:top-[10%] md:left-1/2 md:-translate-x-1/2 md:w-[800px] md:h-auto h-full bg-[#0a0f1c] border border-white/10 md:rounded-3xl shadow-2xl z-50 overflow-hidden flex flex-col"
                    >
                        {/* Header */}
                        <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-start bg-gradient-to-r from-slate-900 to-slate-900/50">
                            <div>
                                <h2 className="text-2xl font-light text-white flex items-center gap-3">
                                    <ShieldCheck className="w-6 h-6 text-emerald-400" />
                                    Risk Mitigation Simulator
                                </h2>
                                <p className="text-slate-400 text-sm mt-1">Select actions to simulate their impact on your risk profile.</p>
                            </div>
                            <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Content Grid */}
                        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">

                            {/* Left: Action List */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-slate-700">
                                {analysis.recommendations.map((rec) => {
                                    const isSelected = selectedRecs.has(rec.id);
                                    return (
                                        <div
                                            key={rec.id}
                                            onClick={() => toggleRec(rec.id)}
                                            className={`group p-4 rounded-xl border cursor-pointer transition-all duration-300 relative overflow-hidden ${isSelected
                                                ? "bg-emerald-500/10 border-emerald-500/50"
                                                : "bg-white/5 border-white/5 hover:border-white/20"
                                                }`}
                                        >
                                            <div className="flex justify-between items-start relative z-10">
                                                <div className="flex gap-4">
                                                    {/* Checkbox UI */}
                                                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${isSelected ? "bg-emerald-500 border-emerald-500" : "border-slate-500 group-hover:border-slate-300"
                                                        }`}>
                                                        {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-black" />}
                                                    </div>

                                                    <div>
                                                        <h4 className={`font-medium text-sm ${isSelected ? "text-white" : "text-slate-300"}`}>{rec.title}</h4>
                                                        <p className="text-xs text-slate-400 mt-1 mb-2 leading-relaxed">{rec.description}</p>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold bg-white/5 px-2 py-0.5 rounded">{rec.impact}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="text-right">
                                                    <span className={`text-xs font-mono font-bold ${isSelected ? "text-emerald-400" : "text-slate-600"}`}>
                                                        -{rec.riskReduction} pts
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Subtle bg progress bar effect for impact */}
                                            {isSelected && (
                                                <motion.div
                                                    layoutId={`bg-${rec.id}`}
                                                    className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none"
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Right: Score Visualizer */}
                            <div className="md:w-72 bg-slate-950/50 border-l border-white/5 p-8 flex flex-col items-center justify-center relative">
                                {/* Current Score Ghost */}
                                <div className="absolute top-8 right-8 text-right opacity-40">
                                    <div className="text-xs text-slate-400 uppercase tracking-widest mb-1">Current</div>
                                    <div className="text-2xl font-light text-white">{analysis.score}</div>
                                </div>

                                {/* Simulated Score */}
                                <div className="text-center relative">
                                    <motion.div
                                        key={simulatedScore}
                                        initial={{ scale: 0.8, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        className="relative"
                                    >
                                        <div className="text-[10px] text-emerald-400 font-mono tracking-[0.3em] uppercase mb-2">Projected Risk</div>
                                        <div className="text-8xl font-thin text-white tracking-tighter tabular-nums text-transparent bg-clip-text bg-gradient-to-b from-white to-emerald-400/50">
                                            {simulatedScore}
                                        </div>
                                    </motion.div>

                                    <div className="mt-4 flex items-center justify-center gap-2 text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                                        <TrendingDown className="w-4 h-4" />
                                        <span className="text-sm font-bold">-{analysis.score - simulatedScore} pts</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
