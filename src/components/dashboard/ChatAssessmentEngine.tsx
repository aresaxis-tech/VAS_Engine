"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, User, ChevronRight, CheckCircle2, Bot, Loader2, Sparkles, ChevronLeft, Mic, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Question, QUESTIONS } from "@/lib/questions";
import { IoTNetworkAnalysis } from "@/lib/iotSimulator";
import { calculateRiskScore, RiskAnalysis } from "@/lib/riskEngine";
import { Shield, AlertTriangle, TrendingUp, Zap, Activity, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    Dialog, DialogContent, DialogDescription,
    DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { speakText, stopSpeaking, startRecording } from "@/lib/voice";

interface ChatAssessmentEngineProps {
    onComplete: (answers: Record<string, any>, riskAnalysis?: IoTNetworkAnalysis | null, questions?: Question[]) => void;
    industry?: string;
    intelData?: any;
    onBack?: () => void;
}

interface Message {
    id: string;
    role: "bot" | "user";
    text: string | React.ReactNode;
    type?: "text" | "question";
}

export const ChatAssessmentEngine: React.FC<ChatAssessmentEngineProps> = ({ onComplete, industry, intelData, onBack }) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [activeQuestions, setActiveQuestions] = useState<Question[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [isLoadingQuestions, setIsLoadingQuestions] = useState(true);
    const [isTyping, setIsTyping] = useState(false);

    // Voice State
    const [voiceMode, setVoiceMode] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const stopRecordingRef = useRef<(() => Promise<string | null>) | null>(null);
    const isRecordingRef = useRef(false);
    const voiceModeRef = useRef(voiceMode); // Ref to track voice mode for callbacks

    // Sync ref
    useEffect(() => {
        voiceModeRef.current = voiceMode;
    }, [voiceMode]);

    // Live Risk State
    const [currentRisk, setCurrentRisk] = useState<RiskAnalysis | null>(null);
    const [showOptimization, setShowOptimization] = useState(false);

    // Input State
    const [inputValue, setInputValue] = useState<string | string[]>("");
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isTyping]);

    // Update Risk on Answer Change
    useEffect(() => {
        if (Object.keys(answers).length > 0) {
            const risk = calculateRiskScore(answers, activeQuestions);
            setCurrentRisk(risk);
        }
    }, [answers, activeQuestions]);

    // Dedicated Start/Stop Listening
    const startListening = async () => {
        if (!voiceMode) return; // Don't start if voice mode is off
        if (isRecordingRef.current) {
            console.log("[Auto-Listen] Already recording, skipping...");
            return;
        }

        isRecordingRef.current = true;
        setIsRecording(true);
        console.log("[Auto-Listen] Starting microphone...");
        try {
            const { stop } = await startRecording((transcript) => {
                console.log("[Auto-Listen] Auto-stop triggered by silence detection");
                isRecordingRef.current = false;
                setIsRecording(false);
                if (transcript && transcript.trim().length > 0) {
                    setInputValue(transcript);
                    handleAnswer(transcript);
                    setInputValue("");
                }
                // Always restart listening
                if (voiceMode && activeQuestions[currentIndex]) {
                    console.log("[Auto-Listen] Auto-restarting from silence detection");
                    setTimeout(() => startListening(), 500);
                }
            });
            stopRecordingRef.current = stop;
            console.log("[Auto-Listen] Microphone active, waiting for speech...");
        } catch (e) {
            console.error("[Auto-Listen] Microphone failed:", e);
            setIsRecording(false);
        }
    };

    const stopListening = async () => {
        if (!isRecording) return;
        setIsRecording(false);
        console.log("[Auto-Listen] Stopping recording...");
        if (stopRecordingRef.current) {
            const text = await stopRecordingRef.current();
            console.log("[Auto-Listen] Transcription received:", text);
            stopRecordingRef.current = null;
            if (text && text.trim().length > 0) {
                setInputValue(text);
                handleAnswer(text);
                setInputValue("");
            } else {
                // If no text received and voice mode is still on, restart listening
                if (voiceMode && activeQuestions[currentIndex]) {
                    console.log("[Auto-Listen] No speech detected, restarting listening...");
                    setTimeout(() => startListening(), 500);
                }
            }
        }
    };

    // Auto-TTS for Bot Messages
    useEffect(() => {
        if (!voiceMode) {
            stopSpeaking();
            if (isRecording) stopListening(); // Stop mic if voice turned off
            return;
        }

        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.role === "bot") {
            // Stop any existing recording before bot speaks
            if (isRecording) {
                console.log("[Auto-Listen] Stopping recording before bot speaks");
                setIsRecording(false);
                if (stopRecordingRef.current) {
                    stopRecordingRef.current();
                    stopRecordingRef.current = null;
                }
            }

            const timer = setTimeout(() => {
                const textToSpeak = typeof lastMsg.text === 'string' ? lastMsg.text : "Please select an option.";
                setIsSpeaking(true);
                speakText(textToSpeak, () => {
                    setIsSpeaking(false);
                    // Auto-start listening after bot finishes speaking (only for new questions)
                    if (voiceModeRef.current && !isTyping && activeQuestions[currentIndex] && lastMsg.type === "question") {
                        console.log("[Auto-Listen] Starting automated listening after TTS for new question...");
                        setTimeout(() => {
                            console.log("[Auto-Listen] Attempting to start listening, isRecording:", isRecordingRef.current);
                            isRecordingRef.current = false;
                            setIsRecording(false);
                            startListening();
                        }, 500); // 500ms delay after Polly finishes
                    }
                });
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [messages, voiceMode, isTyping, currentIndex, activeQuestions]);

    // Handle Mic Logic (Toggle)
    const toggleRecording = async () => {
        if (isRecording) {
            await stopListening();
        } else {
            await startListening();
        }
    };


    // 1. Fetch Questions
    useEffect(() => {
        const fetchQuestions = async () => {
            if (!industry) {
                setActiveQuestions(QUESTIONS);
                setIsLoadingQuestions(false);
                return;
            }

            try {
                const risks = intelData?.top_risks || [];
                const res = await fetch("/api/generate-questions", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ industry, risks })
                });
                const data = await res.json();
                if (data.questions && Array.isArray(data.questions)) {
                    setActiveQuestions(data.questions);
                } else {
                    setActiveQuestions(QUESTIONS);
                }
            } catch (e) {
                console.error("Failed active questions fetch", e);
                setActiveQuestions(QUESTIONS);
            } finally {
                setIsLoadingQuestions(false);
            }
        };

        fetchQuestions();
    }, [industry, intelData]);

    // Prevent double-init
    const hasStartedChat = useRef(false);

    // 2. Start Conversation when questions appear
    // 2. Start Conversation ON MOUNT (Don't wait for questions)
    useEffect(() => {
        if (!hasStartedChat.current) {
            hasStartedChat.current = true;
            startIntro();
        }
    }, []);

    // 3. Watch for Questions Ready to start asking
    useEffect(() => {
        if (!isLoadingQuestions && activeQuestions.length > 0 && messages.some(m => m.id === "intro-1") && !messages.some(m => m.type === "question")) {
            // Intro is there, questions are ready, and we haven't asked yet.
            askQuestion(0);
        }
    }, [isLoadingQuestions, activeQuestions.length, messages.length]);

    const startIntro = async () => {
        setIsTyping(true);
        // Instant start perceived, small delay for "bot thinking" feel
        await new Promise(r => setTimeout(r, 600));
        addMessage({
            id: "intro-1",
            role: "bot",
            text: `Hello! I'm your ${industry || "Risk"} Assessment Assistant. I'll guide you through a quick checkup.`
        });
        setIsTyping(false);
    };

    const askQuestion = async (index: number) => {
        if (index >= activeQuestions.length) {
            finishAssessment();
            return;
        }

        const q = activeQuestions[index];

        // Check if this question is already asked
        const questionId = `q-${q.id}`;
        if (messages.some(m => m.id.startsWith(questionId))) {
            console.log('Question already asked, skipping:', q.text);
            return;
        }

        setIsTyping(true);
        await new Promise(r => setTimeout(r, 600)); // Natural Pauses

        addMessage({
            id: `${questionId}-${Date.now()}`,
            role: "bot",
            text: q.text,
            type: "question"
        });
        setIsTyping(false);
    };

    const addMessage = (msg: Message) => {
        setMessages(prev => [...prev, msg]);
    };

    const handleAnswer = async (value: any, label?: string) => {
        // Add User Response
        addMessage({
            id: `a-${Date.now()}`,
            role: "user",
            text: label || String(value)
        });

        // Save
        const q = activeQuestions[currentIndex];
        const newAnswers = { ...answers, [q.id]: value };
        setAnswers(newAnswers);

        // Advance
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);

        // Next Question
        await askQuestion(nextIndex);
    };

    const finishAssessment = async () => {
        setIsTyping(true);
        await new Promise(r => setTimeout(r, 1000));
        addMessage({
            id: "done",
            role: "bot",
            text: "Assessment Complete! Generating your risk profile now..."
        });
        setIsTyping(false);

        await new Promise(r => setTimeout(r, 1000));
        onComplete(answers, null, activeQuestions); // Re-use logic
    };

    const currentQ = activeQuestions[currentIndex];

    // Helper for input binding
    const getStringValue = () => {
        if (Array.isArray(inputValue)) return "";
        return inputValue;
    };

    return (
        <div className="w-full max-w-7xl mx-auto h-[700px] md:h-[800px] grid grid-cols-1 md:grid-cols-2 gap-6 p-4 relative">


            {/* LEFT COLUMN: CHAT INTERFACE */}
            <div className="flex flex-col bg-slate-950/50 backdrop-blur-md border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative h-full">
                {/* Header */}
                <div className="p-4 border-b border-white/5 flex items-center gap-3 bg-white/5 backdrop-blur-md relative">
                    {onBack && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onBack}
                            className="mr-1 text-slate-400 hover:text-white hover:bg-white/10"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </Button>
                    )}
                    <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shadow-[0_0_15px_rgba(249,115,22,0.1)]">
                        <Bot className="w-6 h-6 text-orange-500" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-bold text-white tracking-wide">Risk Architect AI</h3>
                        <p className="text-xs text-slate-400 font-light tracking-wider">Conversational Assessment Mode</p>
                    </div>

                    {/* Voice Toggle */}
                    {/* Voice Toggle */}
                    <div className="hidden md:block">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setVoiceMode(!voiceMode)}
                            className={`relative px-4 py-2 rounded-full border transition-all duration-300 font-medium tracking-wide text-[10px] uppercase shadow-[0_0_15px_rgba(0,0,0,0.2)] ${voiceMode
                                ? "bg-orange-950/40 border-orange-500/50 text-orange-400 hover:bg-orange-900/40 shadow-[0_0_15px_rgba(249,115,22,0.2)]"
                                : "bg-slate-900/40 border-slate-700 text-slate-500 hover:text-slate-300 hover:bg-slate-800/40"
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <div className={`w-1.5 h-1.5 rounded-full ${voiceMode && isRecording ? "bg-red-500 animate-[pulse_1s_infinite]" : voiceMode ? "bg-orange-500 animate-[pulse_2s_infinite]" : "bg-slate-600"}`} />
                                <Mic className={`w-3.5 h-3.5 ${voiceMode && isRecording ? "text-red-500" : voiceMode ? "text-orange-500" : "text-slate-600"}`} />
                                <span>
                                    {voiceMode && isRecording ? "Listening" : voiceMode ? "Voice Active" : "Voice Off"}
                                </span>
                            </div>

                            {/* Glow Effect */}
                            {voiceMode && (
                                <div className={`absolute inset-0 rounded-full blur-md -z-10 ${isRecording ? "bg-red-500/10" : "bg-orange-500/10"}`} />
                            )}
                        </Button>
                    </div>
                </div>

                {/* Chat Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-6 scrollbar-thin scrollbar-thumb-indigo-900/50 pb-32">
                    {messages.map((msg) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ duration: 0.3 }}
                            key={msg.id}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div className={`max-w-[85%] p-4 rounded-2xl shadow-lg backdrop-blur-sm ${msg.role === "user"
                                ? "bg-gradient-to-br from-orange-600 to-orange-500 text-white rounded-br-none shadow-orange-500/20 border border-orange-400/20"
                                : "bg-slate-900/80 border border-white/10 text-slate-200 rounded-bl-none shadow-black/40"
                                }`}>
                                {msg.text}
                            </div>
                        </motion.div>
                    ))}

                    {isTyping && (
                        <div className="flex justify-start">
                            <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl rounded-bl-none flex items-center gap-3 backdrop-blur-sm">
                                <div className="flex gap-1 h-3 items-center">
                                    <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-orange-500 rounded-full" />
                                    <motion.div animate={{ height: [6, 16, 6] }} transition={{ repeat: Infinity, duration: 0.4, delay: 0.1 }} className="w-1 bg-orange-500 rounded-full" />
                                    <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 bg-orange-500 rounded-full" />
                                </div>
                                <span className="text-xs text-slate-500 font-mono">AI Processing...</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Voice Status Indicator */}
                {voiceMode && (isSpeaking || isRecording) && (
                    <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50">
                        <div className="bg-slate-900/95 border border-slate-700 rounded-full px-4 py-2 flex items-center gap-3 backdrop-blur-md shadow-lg">
                            <div className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-blue-500 animate-pulse" : "bg-red-500 animate-pulse"}`} />
                            <span className="text-sm text-white font-medium">
                                {isSpeaking ? "Speaking..." : "Listening..."}
                            </span>
                        </div>
                    </div>
                )}

                {/* Sticky Input Area */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900/90 border-t border-slate-800 backdrop-blur-lg">
                    <div className="max-w-xl mx-auto">
                        {!isTyping && currentQ && (
                            <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                                {/* YES / NO */}
                                {currentQ.type === "yes_no" && (
                                    <div className="flex gap-3">
                                        <Button
                                            onClick={() => handleAnswer("yes", "Yes")}
                                            className="flex-1 h-14 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-lg font-semibold shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all hover:scale-[1.02] border border-orange-400/20"
                                        >
                                            Yes
                                        </Button>
                                        <Button
                                            onClick={() => handleAnswer("no", "No")}
                                            className="flex-1 h-14 bg-slate-800/50 hover:bg-slate-700/50 text-lg border border-white/10 backdrop-blur-md transition-all hover:scale-[1.02]"
                                        >
                                            No
                                        </Button>
                                    </div>
                                )}

                                {/* SELECT */}
                                {currentQ.type === "select" && (
                                    <div className="grid grid-cols-1 gap-2 max-h-[200px] overflow-y-auto">
                                        {currentQ.options?.map(opt => (
                                            <Button
                                                key={opt}
                                                variant="outline"
                                                onClick={() => handleAnswer(opt)}
                                                className="justify-start border-slate-700 text-slate-300 hover:text-white hover:bg-indigo-900/30"
                                            >
                                                {opt}
                                            </Button>
                                        ))}
                                    </div>
                                )}

                                {/* NUMBER / TEXT */}
                                {(currentQ.type === "number" || currentQ.type === "text") && (
                                    <form
                                        onSubmit={(e) => {
                                            e.preventDefault();
                                            const val = getStringValue();
                                            if (val && val.trim()) {
                                                handleAnswer(val);
                                                setInputValue("");
                                            }
                                        }}
                                        className="flex gap-2"
                                    >
                                        <div className="relative flex-1">
                                            <input
                                                type={currentQ.type === "number" ? "number" : "text"}
                                                value={getStringValue()}
                                                onChange={(e) => setInputValue(e.target.value)}
                                                placeholder="Type your answer..."
                                                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 pl-4 pr-12 text-white focus:outline-none focus:border-indigo-500 h-12"
                                                autoFocus
                                            />
                                            {/* Mic Button in Input */}
                                            <button
                                                type="button"
                                                onClick={toggleRecording}
                                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-colors ${isRecording ? "text-red-500 bg-red-500/10 animate-pulse" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
                                            >
                                                <Mic className="w-5 h-5" />
                                            </button>
                                        </div>
                                        {/* Distinct Speak Button - Only show when voice mode is on */}
                                        {voiceMode && (
                                            <Button
                                                type="button"
                                                onClick={toggleRecording}
                                                variant="secondary"
                                                className={`h-12 w-12 sm:w-auto transition-all ${isRecording ? "bg-red-500/10 text-red-500 border-red-500/50 hover:bg-red-500/20 animate-pulse" : "bg-slate-800 hover:bg-slate-700"}`}
                                            >
                                                <Mic className={`w-5 h-5 sm:mr-2 ${isRecording ? "animate-pulse" : ""}`} />
                                                <span className="hidden sm:inline">{isRecording ? "Listening..." : "Speak"}</span>
                                            </Button>
                                        )}
                                        <Button type="submit" size="icon" className="w-12 h-12 rounded-xl bg-orange-600 hover:bg-orange-500 shrink-0">
                                            <Send className="w-5 h-5" />
                                        </Button>
                                    </form>
                                )}

                                {/* MULTI SELECT */}
                                {currentQ.type === "multi_select" && (
                                    <div className="space-y-2">
                                        <div className="grid grid-cols-2 gap-2 max-h-[150px] overflow-y-auto">
                                            {currentQ.options?.map(opt => (
                                                <Button
                                                    key={opt}
                                                    variant={(Array.isArray(inputValue) && inputValue.includes(opt)) ? "secondary" : "outline"}
                                                    onClick={() => {
                                                        const current = Array.isArray(inputValue) ? inputValue : [];
                                                        const next = current.includes(opt)
                                                            ? current.filter((x: string) => x !== opt)
                                                            : [...current, opt];
                                                        setInputValue(next);
                                                    }}
                                                    className="justify-start text-xs h-auto py-2"
                                                >
                                                    {Array.isArray(inputValue) && inputValue.includes(opt) && <CheckCircle2 className="w-3 h-3 mr-1" />}
                                                    {opt}
                                                </Button>
                                            ))}
                                        </div>
                                        <Button
                                            onClick={() => {
                                                handleAnswer(inputValue, `Selected: ${Array.isArray(inputValue) ? inputValue.join(", ") : ""}`);
                                                setInputValue("");
                                            }}
                                            className="w-full bg-emerald-600 hover:bg-emerald-500 h-10"
                                        >
                                            Confirm <ChevronRight className="w-4 h-4 ml-2" />
                                        </Button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: DYNAMIC KNOWLEDGE GRAPH */}
            <div className="flex flex-col gap-6 h-full overflow-y-auto pr-2">
                <Card className="glass-panel-premium p-6 flex flex-col gap-6 sticky top-0 z-10 border-0 h-full relative overflow-hidden">
                    {/* Background Animation for Knowledge Mode */}
                    {currentQ && (
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/20 to-purple-900/20 pointer-events-none" />
                    )}

                    <div className="flex items-center justify-between border-b border-slate-700/50 pb-4 relative z-10">
                        <div className="flex items-center gap-3">
                            {currentQ ? (
                                <Activity className="w-6 h-6 text-indigo-400" />
                            ) : (
                                <Sparkles className="w-6 h-6 text-emerald-400" />
                            )}
                            <div>
                                <h3 className="font-bold text-lg text-white">
                                    {currentQ ? "Contextual Intelligence" : "Value Add Map"}
                                </h3>
                                <p className="text-xs text-slate-400">
                                    {currentQ ? "Real-time risk factors & benchmarks" : "Optimization opportunities"}
                                </p>
                            </div>
                        </div>
                        {currentRisk && !currentQ && (
                            <Badge variant="outline" className="border-slate-700 text-slate-400">
                                {currentRisk.recommendations.length} Detected
                            </Badge>
                        )}
                    </div>

                    {/* KNOWLEDGE PANEL (ACTIVE QUESTION) */}
                    <AnimatePresence mode="wait">
                        {currentQ ? (
                            <motion.div
                                key="context-panel"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex-1 space-y-6 relative z-10"
                            >
                                {/* 1. The Question Context */}
                                <div className="p-4 rounded-xl bg-slate-900/50 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]">
                                    <h4 className="text-xs uppercase tracking-widest text-indigo-400 font-bold mb-2 flex items-center gap-2">
                                        <Info className="w-3 h-3" /> Why we ask this
                                    </h4>
                                    <p className="text-sm text-slate-300 leading-relaxed">
                                        {currentQ.insight || "This factor significantly influences your localized risk score."}
                                    </p>
                                </div>

                                {/* 2. Industry Standard Badge */}
                                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-3 opacity-10">
                                        <TrendingUp className="w-12 h-12 text-white" />
                                    </div>
                                    <h4 className="text-xs uppercase tracking-widest text-sky-400 font-bold mb-2">
                                        Industry Standard
                                    </h4>
                                    <p className="text-lg font-medium text-white">
                                        {currentQ.industryStandard || "Gathering Sector Benchmark..."}
                                    </p>
                                    <p className="text-[10px] text-slate-500 mt-1">
                                        Based on {industry || "General"} Market Data
                                    </p>
                                </div>

                                {/* 3. Risk Context / Mitigation */}
                                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-900/20 to-slate-900/50 border border-emerald-500/20">
                                    <h4 className="text-xs uppercase tracking-widest text-emerald-500 font-bold mb-2 flex items-center gap-2">
                                        <Shield className="w-3 h-3" /> Mitigation
                                    </h4>
                                    <p className="text-sm text-slate-300 leading-relaxed italic">
                                        "{currentQ.riskContext || "Non-compliance in this area typically leads to claim rejection."}"
                                    </p>
                                </div>

                            </motion.div>
                        ) : (
                            /* EXISTING RECOMMENDATIONS LOGIC */
                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 relative z-10">
                                {currentRisk?.recommendations && currentRisk.recommendations.length > 0 ? (
                                    currentRisk.recommendations.map((rec, i) => (
                                        <motion.div
                                            initial={{ opacity: 0, x: 20 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            key={rec.id}
                                            className="bg-gradient-to-r from-slate-900/80 to-slate-900/40 border border-white/5 p-4 rounded-xl hover:border-orange-500/30 transition-all group cursor-pointer relative overflow-hidden"
                                            onClick={() => setShowOptimization(true)}
                                        >
                                            <div className="absolute top-0 left-0 w-0.5 h-full bg-gradient-to-b from-orange-500 to-orange-600 opacity-80" />
                                            <div className="absolute inset-0 bg-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                                            <div className="flex justify-between items-start mb-2 pl-2 relative z-10">
                                                <Badge variant="outline" className="border-orange-500/20 text-orange-400/80 text-[10px] tracking-wider bg-orange-500/5">
                                                    {rec.provider || 'STRATEGIC'}
                                                </Badge>
                                                <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-orange-400 transition-colors" />
                                            </div>

                                            <h5 className="font-bold text-white mb-1 pl-2 group-hover:text-orange-400 transition-colors text-sm relative z-10">{rec.title}</h5>
                                            <p className="text-xs text-slate-400 line-clamp-2 pl-2 mb-3 relative z-10 font-light">{rec.description}</p>

                                            <div className="pl-2 flex items-center gap-2 relative z-10">
                                                <div className="text-[10px] uppercase tracking-wider text-slate-500 font-bold">Value</div>
                                                <div className="h-1 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                                    <div className="h-full bg-gradient-to-r from-orange-500 to-yellow-500" style={{ width: `${rec.riskReduction * 4}%` }} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))
                                ) : (
                                    <div className="h-64 flex flex-col items-center justify-center text-center p-8 relative rounded-xl overflow-hidden border border-white/5 bg-slate-950/30">
                                        <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                                            <div className="w-64 h-64 border border-orange-500/30 rounded-full absolute animate-[ping_3s_linear_infinite]" />
                                            <div className="w-48 h-48 border border-orange-500/40 rounded-full absolute animate-[ping_3s_linear_infinite_1s]" />
                                            <div className="w-32 h-32 border border-orange-500/50 rounded-full absolute animate-[ping_3s_linear_infinite_2s]" />
                                            <div className="w-full h-1 bg-gradient-to-r from-transparent via-orange-500/50 to-transparent absolute animate-[spin_4s_linear_infinite]" />
                                        </div>

                                        <div className="relative z-10 flex flex-col items-center">
                                            <div className="w-12 h-12 rounded-full bg-slate-900 border border-white/10 flex items-center justify-center mb-4 shadow-[0_0_30px_rgba(249,115,22,0.1)]">
                                                <Activity className="w-6 h-6 text-orange-500 animate-pulse" />
                                            </div>
                                            <p className="text-sm font-medium text-white tracking-wide">Awaiting Data Signature...</p>
                                            <p className="text-xs text-slate-500 mt-2 font-mono">Real-time analysis active</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </AnimatePresence>
                </Card>
            </div>

            {/* OPTIMIZATION DIALOG */}
            <Dialog open={showOptimization} onOpenChange={setShowOptimization}>
                <DialogContent className="bg-[#0B1526] border-slate-700 max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-light text-white tracking-tight flex items-center gap-3">
                            <Sparkles className="w-6 h-6 text-emerald-400" />
                            Path to Resonance
                        </DialogTitle>
                        <DialogDescription className="text-slate-400">
                            Simulated impact of applied strategic controls based on your current inputs.
                        </DialogDescription>
                    </DialogHeader>

                    {currentRisk && (
                        <div className="mt-6 space-y-6">
                            {/* Score Comparison */}
                            <div className="flex items-center justify-center gap-12 py-6 border-b border-slate-800">
                                <div className="text-center">
                                    <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">Current</div>
                                    <div className="text-4xl font-thin text-white">{currentRisk.score}</div>
                                </div>
                                <div className="text-emerald-500 text-2xl">→</div>
                                <div className="text-center">
                                    <div className="text-[10px] uppercase tracking-widest text-emerald-500 mb-1">Projected</div>
                                    <div className="text-5xl font-bold text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]">
                                        {currentRisk.projectedScore || Math.max(10, currentRisk.score - 30)}
                                    </div>
                                </div>
                            </div>

                            {/* Action List */}
                            <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700 pr-2">
                                {currentRisk.recommendations.map((rec, i) => (
                                    <motion.div
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.05 }}
                                        key={rec.id}
                                        className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-start gap-4 hover:border-emerald-500/30 transition-colors"
                                    >
                                        <div className="mt-1 w-6 h-6 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shrink-0">
                                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h4 className="font-semibold text-white text-sm">{rec.title}</h4>
                                                <Badge variant="outline" className="bg-emerald-950/30 text-emerald-400 border-emerald-900 font-mono text-xs">
                                                    -{rec.riskReduction} pts
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                                                {rec.description}
                                            </p>
                                            <div className="flex gap-2 mt-2">
                                                <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-400">{rec.provider}</Badge>
                                                <Badge variant="secondary" className="text-[10px] bg-slate-800 text-slate-400">{rec.impact}</Badge>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};
