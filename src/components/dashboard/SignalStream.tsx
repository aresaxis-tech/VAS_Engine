
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

import { Activity, Shield, Cpu, Users, Lock, ChevronRight, X } from "lucide-react";
import { QUESTIONS } from "@/lib/questions";
import { UI_TEXT } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

interface SignalStreamProps {
    isOpen: boolean;
    onClose: () => void;
    answers: Record<string, any>;
}

export const SignalStream = ({ isOpen, onClose, answers }: SignalStreamProps) => {
    // Flatten answers into a "Stream Dictionary"
    const signals = QUESTIONS.map(q => {
        const val = answers[q.id];
        let status: "scanned" | "alert" | "secured" = "scanned";
        let displayVal = val?.toString() || "N/A";

        // Heuristics for visual status
        if (displayVal === "No" || displayVal === "None" || displayVal === "0") status = "alert";
        if (displayVal === "Yes" || displayVal === "In-house") status = "secured";

        return {
            id: q.id,
            category: q.category,
            label: q.text,
            value: displayVal,
            status,
            icon: q.category === "IoT" ? Cpu : q.category === "People" ? Users : q.category === "Controls" ? Lock : Shield
        };
    });

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-10">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        className="relative w-full max-w-4xl max-h-[80vh] bg-black/90 border border-[var(--color-icici-orange)]/30 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(245,130,32,0.2)] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center p-6 border-b border-white/10 bg-white/5">
                            <h2 className="text-xl font-light text-white flex items-center gap-3">
                                <Activity className="w-5 h-5 text-[var(--color-icici-orange)]" />
                                <span className="tracking-wide">{UI_TEXT.signalStreamTitle}</span>
                                <Badge variant="icici" className="ml-2 text-[10px] tracking-wider uppercase">{UI_TEXT.signalLiveBadge}</Badge>
                            </h2>
                            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Stream Body */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-2 font-mono text-sm relative">
                            {/* Matrix Rain Background Effect */}
                            <div className="absolute inset-0 pointer-events-none opacity-5 bg-[url('https://upload.wikimedia.org/wikipedia/commons/thumb/1/17/Matrix_digital_rain.gif/1200px-Matrix_digital_rain.gif')] bg-cover bg-center mix-blend-screen" />

                            {signals.map((signal, i) => (
                                <motion.div
                                    key={signal.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: i * 0.05 }}
                                    className={`flex items-center justify-between p-3 rounded-lg border border-white/5 hover:border-[var(--color-icici-orange)]/20 hover:bg-white/5 transition-colors group relative z-10 ${signal.status === "alert" ? "bg-red-500/5 border-red-500/20" : ""}`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`p-2 rounded-md ${signal.status === "alert" ? "text-red-400 bg-red-500/10" : "text-[var(--color-icici-orange)] bg-[var(--color-icici-orange)]/10"}`}>
                                            <signal.icon className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <div className="text-slate-500 text-[10px] uppercase tracking-wider mb-0.5">{signal.category}</div>
                                            <div className="text-slate-200 group-hover:text-[var(--color-icici-orange)] transition-colors truncate max-w-md font-sans">{signal.label}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className={`text-xs px-2 py-1 rounded border ${signal.status === "alert" ? "border-red-500/30 text-red-300 bg-red-500/10" :
                                            signal.status === "secured" ? "border-emerald-500/30 text-emerald-300 bg-emerald-500/10" :
                                                "border-slate-700 text-slate-400"
                                            }`}>
                                            {signal.value}
                                        </div>
                                        <ChevronRight className="w-3 h-3 text-slate-600" />
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Footer */}
                        <div className="p-4 border-t border-white/10 bg-white/5 flex justify-between items-center text-[10px] text-slate-600 font-mono uppercase tracking-widest">
                            <span>Confidential Risk Data // For Authorized Use Only</span>
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                ICICI Lombard Intelligence
                            </span>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
