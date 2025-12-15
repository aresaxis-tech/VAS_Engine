"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Activity } from "lucide-react";
import { UI_TEXT } from "@/lib/constants";

export function SplashScreen({ onStart }: { onStart: () => void }) {
    return (
        <div className="w-full flex flex-col items-center justify-center min-h-[80vh] text-center px-4 relative">
            {/* Decorative Glows */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[var(--color-icici-orange)]/20 rounded-full blur-[100px] -z-10 animate-pulse" />

            <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="mb-8 relative"
            >
                <div className="relative z-10 bg-white/10 p-6 rounded-full border border-white/10 backdrop-blur-xl shadow-[0_0_50px_rgba(0,51,161,0.5)]">
                    <ShieldCheck className="w-24 h-24 text-[var(--color-icici-orange)] drop-shadow-[0_0_15px_rgba(245,130,32,0.8)]" />
                </div>
                {/* Orbiting effect */}
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-0 -m-4 rounded-full border border-dashed border-white/20"
                />
            </motion.div>

            <motion.h1
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.6 }}
                className="text-5xl md:text-7xl font-bold mb-4 tracking-tight"
            >
                ICICI Lombard <br />
                <span className="text-gradient-icici">Intelligent VAS Engine</span>
            </motion.h1>

            <motion.p
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="text-xl text-slate-300 max-w-2xl mb-10"
            >
                Proactive Risk Detection. Smart Protection.
                <br />
                <span className="text-sm text-slate-400 mt-2 block">
                    AI-Powered Cyber & IoT Risk Assessment Advisor
                </span>
            </motion.p>

            {/* Screen-wide Heartbeat Pulse */}
            <motion.div
                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.3, 0.1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120vw] h-[120vw] bg-[radial-gradient(circle,_var(--color-icici-orange)_0%,_transparent_70%)] opacity-20 -z-50 pointer-events-none rounded-full blur-3xl"
            />

            <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                transition={{ delay: 0.7 }}
            >
                <Button
                    size="lg"
                    onClick={onStart}
                    className="bg-gradient-to-r from-[var(--color-icici-orange)] to-[var(--color-icici-orange)] text-white text-lg px-10 py-6 rounded-full shadow-[0_0_30px_rgba(245,130,32,0.4)] hover:shadow-[0_0_50px_rgba(245,130,32,0.6)] border border-[var(--color-icici-orange)]/20"
                >
                    {UI_TEXT.startAssessment}
                </Button>
            </motion.div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.2 }}
                className="absolute bottom-10 text-xs text-slate-500"
            >
                {UI_TEXT.poweredBy}
            </motion.div>
        </div>
    );
}
