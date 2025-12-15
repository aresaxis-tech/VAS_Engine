"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SplashScreen } from "@/components/onboarding/SplashScreen";
import { IndustrySelection } from "@/components/onboarding/IndustrySelection";
import { IndustryInsightView } from "@/components/dashboard/IndustryInsightView";
import { QuestionnaireEngine } from "@/components/dashboard/QuestionnaireEngine";
import { ReportDashboard } from "@/components/dashboard/ReportDashboard";
import { ChatAssessmentEngine } from "@/components/dashboard/ChatAssessmentEngine";
import { AssessmentWizard } from "@/components/dashboard/AssessmentWizard";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { UI_TEXT } from "@/lib/constants";

type Step = "SPLASH" | "WIZARD" | "INDUSTRY" | "INSIGHT" | "ASSESSMENT" | "CHAT_ASSESSMENT" | "REPORT";

const AppContent = () => {
  const [step, setStep] = useState<Step>("SPLASH");
  const [industry, setIndustry] = useState<string | null>(null);
  const [subSector, setSubSector] = useState<string | undefined>(undefined);
  const [intelData, setIntelData] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [riskAnalysis, setRiskAnalysis] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [assessmentType, setAssessmentType] = useState<"standard" | "chat">("standard");
  const [prefetchedQuestions, setPrefetchedQuestions] = useState<any[] | null>(null);

  const isBackRef = React.useRef(false);

  // 1. Persistence & History Listener
  React.useEffect(() => {
    // Load from SessionStorage (Per Tab Session, allows fresh start in new tabs)
    const saved = sessionStorage.getItem("ICICI_VAS_STATE");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.step) setStep(p.step);
        if (p.industry) setIndustry(p.industry);
        if (p.subSector) setSubSector(p.subSector);
        if (p.intelData) setIntelData(p.intelData);
        if (p.answers) setAnswers(p.answers);
        if (p.riskAnalysis) setRiskAnalysis(p.riskAnalysis);
        if (p.questions) setQuestions(p.questions);
        if (p.assessmentType) setAssessmentType(p.assessmentType);
      } catch (e) {
        console.error("State load failed", e);
      }
    }

    // Handle Back Button
    const handlePop = (e: PopStateEvent) => {
      isBackRef.current = true;
      if (e.state && e.state.step) {
        setStep(e.state.step);
      } else {
        // Fallback for initial history entry
        setStep("SPLASH");
      }
    };

    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  // 2. Save to SessionStorage
  React.useEffect(() => {
    const s = { step, industry, subSector, intelData, answers, riskAnalysis, questions, assessmentType };
    sessionStorage.setItem("ICICI_VAS_STATE", JSON.stringify(s));
  }, [step, industry, subSector, intelData, answers, riskAnalysis, questions, assessmentType]);

  // 3. Push History State (Only on new navigation)
  React.useEffect(() => {
    if (isBackRef.current) {
      isBackRef.current = false;
      return;
    }
    window.history.pushState({ step }, "", window.location.pathname);
  }, [step]);

  const handleIndustrySelect = (ind: string) => {
    // Only clear cached intel if the industry has changed
    if (!intelData || (intelData.industry && intelData.industry !== ind)) {
      setIntelData(null);
    }
    setIndustry(ind);
    setStep("INSIGHT");
    handlePrefetchQuestions(ind);
  };

  const handleInsightProceed = (data: any) => {
    setIntelData(data);
    setAssessmentType("standard");
    setStep("ASSESSMENT");
  };

  const handleChatAssessmentStart = (data: any) => {
    setIntelData(data);
    setAssessmentType("chat");
    setStep("CHAT_ASSESSMENT");
  };

  const handlePrefetchQuestions = async (industryOverride?: string) => {
    const targetIndustry = industryOverride || industry;
    if (!targetIndustry || prefetchedQuestions) return;

    try {
      console.log("Pre-fetching questions for:", targetIndustry);
      // Note: We might not have intelData yet, so we fetch generic industry questions first
      // This trades specificity for speed, which matches the user's "instant" requirement.
      const risks = intelData?.top_risks || [];
      const res = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ industry: targetIndustry, risks })
      });
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        setPrefetchedQuestions(data.questions);
        console.log("Questions pre-fetched:", data.questions.length);
      }
    } catch (error) {
      console.error("Pre-fetch failed:", error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="absolute top-0 left-0 w-full p-6 flex justify-between items-start z-50 pointer-events-none">
        {/* Left Side */}
        <div className="flex flex-col items-start gap-1 pointer-events-auto">


          {step !== "SPLASH" && (
            <div className="text-xl font-bold tracking-widest text-[var(--color-icici-orange)] animate-in fade-in slide-in-from-top-4 duration-700">
              ICICI LOMBARD
            </div>
          )}
        </div>

        {/* Right Side */}
        <div className="flex flex-col items-end gap-1">
          <div className="text-[10px] font-mono text-slate-600">{UI_TEXT.versionBadge}</div>
        </div>
      </header>

      <main className="flex-1 flex flex-col relative w-full">
        <AnimatePresence mode="wait">
          {step === "SPLASH" && (
            <motion.div
              key="splash"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col items-center justify-center relative overflow-hidden"
            >
              <SplashScreen onStart={() => setStep("WIZARD")} />
            </motion.div>
          )}

          {step === "WIZARD" && (
            <motion.div
              key="wizard"
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex items-center justify-center p-4"
            >
              <AssessmentWizard
                onComplete={(data) => {
                  setIndustry(data.industry);
                  setSubSector(data.subDomain);
                  setAnswers((prev) => ({
                    ...prev,
                    companyName: data.companyName,
                    location: data.location,
                    policyNumber: data.policyNumber,
                    industry_selection: data.industry,
                    sub_sector: data.subDomain
                  }));
                  setStep("INSIGHT");
                }}
                onBack={() => setStep("SPLASH")}
              />
            </motion.div>
          )}

          {step === "INDUSTRY" && (
            <motion.div
              key="industry"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="flex-1 flex items-center"
            >
              <IndustrySelection onSelect={handleIndustrySelect} />
            </motion.div>
          )}

          {step === "INSIGHT" && industry && (
            <motion.div
              key="insight"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 w-full"
            >
              <IndustryInsightView
                industry={industry}
                subSector={subSector}
                onProceed={handleInsightProceed}
                onStartChatAssessment={handleChatAssessmentStart}
                onBack={() => setStep("WIZARD")}
                onPrefetchQuestions={handlePrefetchQuestions}
                onDataLoaded={setIntelData}
              />
            </motion.div>
          )}

          {step === "ASSESSMENT" && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-4 w-full"
            >
              <QuestionnaireEngine
                industry={industry || undefined}
                intelData={intelData}
                onComplete={(val, risk, qs) => {
                  setAnswers(val);
                  setRiskAnalysis(risk);
                  if (qs) setQuestions(qs);
                  setStep("REPORT");
                }}
                onBack={() => setStep("INSIGHT")}
              />
            </motion.div>
          )}

          {step === "CHAT_ASSESSMENT" && (
            <motion.div
              key="chat_assessment"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center p-4 w-full"
            >
              <ChatAssessmentEngine
                industry={industry || undefined}
                intelData={intelData}
                initialQuestions={prefetchedQuestions}
                onComplete={(val, risk, qs) => {
                  setAnswers(val);
                  setRiskAnalysis(risk);
                  if (qs) setQuestions(qs);
                  setStep("REPORT");
                }}
                onBack={() => setStep("INSIGHT")}
              />
            </motion.div>
          )}

          {step === "REPORT" && (
            <motion.div
              key="report"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex-1 w-full"
            >
              <ReportDashboard
                answers={answers}
                riskAnalysis={riskAnalysis}
                questions={questions}
                onRestart={() => setStep("SPLASH")}
                onBack={() => setStep(assessmentType === "chat" ? "CHAT_ASSESSMENT" : "ASSESSMENT")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default function Home() {
  return (
    <AppContent />
  );
}
