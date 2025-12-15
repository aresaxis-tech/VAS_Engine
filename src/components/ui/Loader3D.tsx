import React from 'react';
import { motion } from 'framer-motion';

interface Loader3DProps {
  status?: 'safe' | 'critical' | 'scanning';
  className?: string;
  hideText?: boolean;
}

export const Loader3D = ({ status = 'safe', className = "", hideText = false }: Loader3DProps) => {
  const isCritical = status === 'critical';
  const isScanning = status === 'scanning';

  // Color configurations
  const colors = isCritical ? {
    glow: "from-red-500 to-orange-600",
    border: "border-red-500/50",
    shadow: "shadow-[0_0_50px_rgba(239,68,68,0.4)]",
    bg: "bg-red-500/10",
    textGradient: "from-red-400 to-red-600",
    subText: "text-red-400/60"
  } : isScanning ? {
    glow: "from-blue-400 to-indigo-500",
    border: "border-blue-500/50",
    shadow: "shadow-[0_0_50px_rgba(59,130,246,0.4)]",
    bg: "bg-blue-500/10",
    textGradient: "from-blue-400 to-blue-600",
    subText: "text-blue-400/60"
  } : {
    glow: "from-emerald-400 to-cyan-500",
    border: "border-emerald-500/30",
    shadow: "shadow-[0_0_50px_rgba(16,185,129,0.3)]",
    bg: "bg-emerald-500/5",
    textGradient: "from-emerald-400 to-emerald-600",
    subText: "text-emerald-400/60"
  };

  return (
    <div className={`flex flex-col items-center justify-center gap-4 w-full ${className}`}>
      {/* The Breathing Orb */}
      <div className="relative w-full max-w-[8rem] aspect-square flex items-center justify-center [perspective:1000px]">
        {/* Core Nucleus - 30% */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
          className={`w-[30%] h-[30%] bg-white rounded-full blur-md z-20 absolute ${isCritical ? "shadow-[0_0_30px_rgba(255,0,0,0.8)]" : "shadow-[0_0_30px_rgba(255,255,255,0.6)]"}`}
        />

        {/* Inner Glow Layer - 60% */}
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.4, 0.7, 0.4], rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className={`absolute w-[60%] h-[60%] rounded-full bg-gradient-to-br ${colors.glow} blur-xl opacity-60 z-10`}
        />

        {/* 3D Orbital Rings - 75% & 85% */}
        <motion.div
          animate={{ rotateX: 360, rotateY: 360, rotateZ: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className={`absolute w-[75%] h-[75%] rounded-full border-[1px] ${colors.border} opacity-40`}
          style={{ transformStyle: "preserve-3d" }}
        />
        <motion.div
          animate={{ rotateX: -360, rotateY: 180, rotateZ: 90 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          className={`absolute w-[87%] h-[87%] rounded-full border-[1px] ${colors.border} opacity-30`}
          style={{ transformStyle: "preserve-3d" }}
        />

        {/* Outer Atmosphere - 100% */}
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.3, 0.1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className={`absolute w-full h-full rounded-full border ${colors.border} ${colors.shadow} ${colors.bg} backdrop-blur-sm z-0`}
        />
      </div>

      {/* Narrative Text */}
      {!hideText && (
        <div className="text-center space-y-1 relative z-30">
          <motion.h3
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`text-sm font-black tracking-[0.2em] uppercase text-transparent bg-clip-text bg-gradient-to-r ${colors.textGradient}`}
          >
            {isCritical ? "CRITICAL RISK" : isScanning ? "SYSTEM SCANNING" : "SYSTEM SECURE"}
          </motion.h3>
          <motion.p
            className={`text-[10px] ${colors.subText} font-mono uppercase tracking-wider`}
          >
            {isCritical ? "Active Threats Detected" : isScanning ? "Analyzing Environment" : "Monitoring Active"}
          </motion.p>
        </div>
      )}
    </div>
  );
};
