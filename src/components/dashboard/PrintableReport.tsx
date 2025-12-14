import { RiskAnalysis } from "@/lib/riskEngine";
import React from "react";
import { Shield, ShieldAlert, Phone, Globe, Smartphone, Activity, CheckCircle2, Zap, Car, Wrench, FileText } from "lucide-react";

export function PrintableReport({ analysis, industry }: { analysis: RiskAnalysis; industry: string }) {
    const date = new Date().toLocaleDateString();

    return (
        <div className="hidden print:block fixed inset-0 bg-white text-black z-[9999] overflow-y-auto font-sans">
            {/* 1. Header Section - Image Banner */}
            <div className="mb-10 w-full print:w-full">
                <img
                    src="/icici-header.png"
                    alt="ICICI Lombard Header"
                    className="w-full h-auto object-cover rounded-b-3xl shadow-sm print:rounded-b-3xl"
                />
            </div>

            {/* Content Padding Wrapper */}
            <div className="px-10 max-w-5xl mx-auto">

                {/* 2. Salutation & Context */}
                <div className="mb-10">
                    <h2 className="text-xl font-bold mb-3 text-slate-900">Dear Customer,</h2>
                    <p className="text-slate-600 mb-2 leading-relaxed text-sm max-w-2xl">
                        Risk profiles in {industry} are dynamic. Based on our AI-driven assessment, we have identified key areas for resilience improvement.
                    </p>
                    <p className="text-xs text-slate-400 mt-4">
                        Ref: {industry.substring(0, 3).toUpperCase()}/2024/{Math.floor(Math.random() * 1000000)} • Generated on {date}
                    </p>
                </div>

                {/* 3. Risk / Coverage List (The "Icon + Text" Layout) */}
                <div className="space-y-8 mb-16 px-4">
                    {/* Dynamic Risk - High Score */}
                    <div className="flex gap-5 items-start bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="w-12 h-12 rounded-full bg-[#F58220]/10 flex items-center justify-center shrink-0 border border-[#F58220]/20">
                            <ShieldAlert className="w-6 h-6 text-[#F58220]" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm mb-1 uppercase tracking-wider">Current Risk Profile: {analysis.category}</h3>
                            <p className="text-sm text-slate-600 leading-relaxed max-w-xl">
                                Your calculated risk score is <strong>{analysis.score}/100</strong>. Key vulnerabilities detected in <strong>Exposure Surface</strong> requiring immediate mitigation strategies.
                            </p>
                        </div>
                    </div>

                    {/* Dynamic Recommendations mapped from analysis */}
                    {analysis.recommendations.map((rec, i) => (
                        <div key={rec.id} className="flex gap-5 items-start break-inside-avoid px-4">
                            <div className="w-12 h-12 rounded-full border-2 border-[#E0E0E0] flex items-center justify-center shrink-0 text-[#F58220] bg-white">
                                {i === 0 ? <Zap className="w-6 h-6" /> :
                                    i === 1 ? <Shield className="w-6 h-6" /> :
                                        <CheckCircle2 className="w-6 h-6" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-slate-800 text-sm mb-1">{rec.title}</h3>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                                    {rec.description}
                                </p>
                                <p className="text-[10px] uppercase font-bold text-[#F58220] mt-1 tracking-widest">
                                    Impact: {rec.impact}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* 5. Footer Layout */}
                <div className="flex justify-between items-center gap-4 text-[10px] text-[#F58220] border-t border-slate-100 pt-8 mt-auto">

                    <div className="border border-[#F58220]/50 rounded-full px-5 py-2 flex items-center gap-2 bg-white">
                        <Globe className="w-3 h-3" /> www.icicilombard.com
                    </div>
                    <div className="border border-[#F58220]/50 rounded-full px-5 py-2 flex items-center gap-2 bg-white">
                        <Smartphone className="w-3 h-3" /> IL TAKECORE INSURANCE APP
                    </div>
                </div>
            </div>
        </div>
    );
}
