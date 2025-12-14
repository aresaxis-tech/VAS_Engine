"use client";

import React from "react";
import { motion } from "framer-motion";
import { Factory, Landmark, ShoppingBag, Stethoscope, Truck, Monitor, Cpu, Building2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { UI_TEXT } from "@/lib/constants";

const industries = [
    { id: "retail", name: "Retail & E-commerce", icon: ShoppingBag, color: "text-[var(--color-icici-orange)]" },
    { id: "healthcare", name: "Pharma & Healthcare", icon: Stethoscope, color: "text-[var(--color-icici-orange)]" },
    { id: "manufacturing", name: "Manufacturing", icon: Factory, color: "text-[var(--color-icici-orange)]" },
    { id: "bfsi", name: "BFSI (Banking & Finance)", icon: Landmark, color: "text-[var(--color-icici-orange)]" },
    { id: "logistics", name: "Logistics", icon: Truck, color: "text-[var(--color-icici-orange)]" },
    { id: "it", name: "IT / ITeS", icon: Monitor, color: "text-[var(--color-icici-orange)]" },
    { id: "infra", name: "Infrastructure", icon: Building2, color: "text-[var(--color-icici-orange)]" },
    { id: "other", name: "Other", icon: Cpu, color: "text-[var(--color-icici-orange)]" },
];

export function IndustrySelection({ onSelect }: { onSelect: (industry: string) => void }) {
    return (
        <div className="w-full max-w-7xl mx-auto px-4 pt-16 pb-2 flex flex-col justify-start h-full">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center mb-10"
            >
                <h2 className="text-3xl md:text-5xl font-bold mb-3">{UI_TEXT.selectIndustryTitle}</h2>
                <p className="text-slate-400 text-base md:text-lg">{UI_TEXT.selectIndustrySubtitle}</p>
            </motion.div>

            <div className="w-full flex flex-col items-center gap-[3vmin]">
                {/* ENABLED INDUSTRIES */}
                <div className="flex flex-row justify-center gap-6">
                    {industries.slice(0, 2).map((ind, index) => (
                        <motion.div
                            key={ind.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card
                                shiny
                                className="cursor-pointer border-orange-500/50 border flex flex-col items-center justify-center gap-[1.5vmin] text-center p-[2vmin] transition-all duration-300 relative overflow-hidden shadow-[0_0_30px_rgba(249,115,22,0.2)] bg-slate-900/90 backdrop-blur-md group hover:scale-[1.02]"
                                style={{ width: "26vmin", height: "18vmin" }}
                                onClick={() => onSelect(ind.id)}
                            >
                                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/0 via-orange-500/0 to-orange-500/10 opacity-100" />
                                <div className="flex flex-col items-center justify-center gap-[1.5vmin] h-full w-full relative z-10">
                                    <div className="rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shadow-inner scale-110" style={{ width: "6vmin", height: "6vmin" }}>
                                        <ind.icon className="text-orange-500" style={{ width: "3vmin", height: "3vmin" }} />
                                    </div>
                                    <span className="font-medium tracking-wide text-white leading-tight whitespace-nowrap" style={{ fontSize: "2vmin" }}>
                                        {ind.name}
                                    </span>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* DIVIDER */}
                <div className="w-full py-[2vmin] flex items-center justify-center relative overflow-visible">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60vmin] h-[12vmin] bg-blue-600/30 blur-[60px] rounded-full pointer-events-none mix-blend-screen" />
                    <span className="relative z-10 text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-100 font-bold tracking-[0.3em] uppercase drop-shadow-[0_0_2vmin_rgba(59,130,246,0.8)]" style={{ fontSize: "2.5vmin" }}>
                        Coming Soon
                    </span>
                </div>

                {/* DISABLED INDUSTRIES */}
                <div className="flex flex-wrap justify-center gap-[1.5vmin] w-full max-w-5xl">
                    {industries.slice(2).map((ind, index) => (
                        <motion.div
                            key={ind.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 + (index * 0.1) }}
                            className="opacity-40 blur-[0.5px] pointer-events-none grayscale filter"
                        >
                            <Card
                                className="cursor-pointer border border-transparent flex flex-col items-center justify-center gap-[1vmin] text-center p-[1.5vmin] transition-all duration-300 relative overflow-hidden shadow-none bg-slate-950/20 rounded-xl"
                                style={{ width: "12vmin", height: "12vmin" }}
                            >
                                <div className="flex flex-col items-center justify-center gap-[1vmin] h-full w-full relative z-10">
                                    <div className="rounded-xl bg-slate-800/30 border border-white/5 transition-all duration-300 flex items-center justify-center shadow-inner" style={{ width: "5vmin", height: "5vmin" }}>
                                        <ind.icon className="transition-colors duration-300 text-slate-600" style={{ width: "2.5vmin", height: "2.5vmin" }} />
                                    </div>
                                    <span className="font-medium transition-colors tracking-wide text-slate-600 line-clamp-1" style={{ fontSize: "1.2vmin" }}>
                                        {ind.name}
                                    </span>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>
            </div>
        </div>
    );
}
