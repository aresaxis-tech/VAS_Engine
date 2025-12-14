"use client";

import React from "react";
import { motion } from "framer-motion";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface ProgressProps {
    value: number; // 0 to 100
    className?: string;
    color?: string; // Hex or Tailwind class
}

export function Progress({ value, className, color = "bg-[var(--color-icici-orange)]" }: ProgressProps) {
    return (
        <div className={cn("relative h-4 w-full overflow-hidden rounded-full bg-slate-800 border border-white/5", className)}>
            <motion.div
                className={cn("h-full rounded-full transition-all", color.startsWith("#") ? "" : color)}
                style={{
                    backgroundColor: color.startsWith("#") ? color : undefined,
                    width: 0
                }}
                animate={{ width: `${Math.min(Math.max(value, 0), 100)}%` }}
                transition={{ type: "spring", stiffness: 50, damping: 15 }}
            >
                {/* Animated Shine Effect */}
                <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
            </motion.div>
        </div>
    );
}
