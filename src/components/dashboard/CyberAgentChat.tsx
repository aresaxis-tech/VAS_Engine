import React, { useState, useRef, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Bot, Send, X, Loader2, Sparkles, Shield, Activity, ChevronRight, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Question, QUESTIONS } from "@/lib/questions";
import { calculateRiskScore, RiskAnalysis } from "@/lib/riskEngine";
import { Badge } from "@/components/ui/badge";

interface Message {
    role: 'user' | 'assistant';
    content: string | React.ReactNode;
    type?: 'default' | 'question' | 'report';
}

interface CyberAgentChatProps {
    riskAnalysis: any;
    industry?: string;
}

export const CyberAgentChat = ({ riskAnalysis, industry }: CyberAgentChatProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mode, setMode] = useState<'chat' | 'assessment'>('chat');

    // Chat State
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: "CyberFennec Online. Monitoring active telemetry. How can I assist?" }
    ]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Assessment State
    const [assessmentIndex, setAssessmentIndex] = useState(0);
    const [answers, setAnswers] = useState<Record<string, any>>({});
    const [activeQuestions, setActiveQuestions] = useState<Question[]>(QUESTIONS); // Default set

    // Auto-scroll
    useEffect(() => {
        if (scrollRef.current) {
            setTimeout(() => {
                scrollRef.current!.scrollTop = scrollRef.current!.scrollHeight;
            }, 100);
        }
    }, [messages, isOpen, isLoading, mode]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        // Check for "Assessment" trigger command
        if (input.toLowerCase().includes("assess") || input.toLowerCase().includes("risk")) {
            startAssessment();
            setInput("");
            return;
        }

        const userMsg = input;
        setInput("");
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        try {
            const response = await fetch("/api/agent-chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: messages.map(m => ({ role: m.role, content: typeof m.content === 'string' ? m.content : '...' })),
                    userMessage: userMsg, // send latest specifically
                    context: riskAnalysis || { status: "No Data Available", msg: "Telemetry stream is currently idle." },
                    industry
                })
            });

            const data = await response.json();

            if (data.reply) {
                setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
            } else {
                setMessages(prev => [...prev, { role: 'assistant', content: "Connection interrupted. Try again." }]);
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: 'assistant', content: "Agent Offline." }]);
        } finally {
            setIsLoading(false);
        }
    };

    // --- ASSESSMENT LOGIC ---
    const startAssessment = () => {
        setMode('assessment');
        setMessages(prev => [
            ...prev,
            { role: 'user', content: 'Start Assessment' },
            { role: 'assistant', content: `Initiating ${industry || "Standard"} Risk Assessment Protocol. Let's calibrate your risk profile.` }
        ]);
        setAssessmentIndex(0);
        setAnswers({});
        // Trigger first question after a delay
        setTimeout(() => askQuestion(0), 1000);
    };

    const askQuestion = (index: number) => {
        if (index >= activeQuestions.length) {
            finishAssessment();
            return;
        }
        const q = activeQuestions[index];
        setIsLoading(true);
        setTimeout(() => {
            setIsLoading(false);
            setMessages(prev => [...prev, {
                role: 'assistant',
                type: 'question',
                content: (
                    <div className="flex flex-col gap-3">
                        <p className="font-medium text-white">{q.text}</p>
                        {q.type === 'yes_no' && (
                            <div className="flex gap-2">
                                <Button size="sm" onClick={() => handleAnswer(q.id, 'yes')} className="flex-1 bg-indigo-600 hover:bg-indigo-500">Yes</Button>
                                <Button size="sm" onClick={() => handleAnswer(q.id, 'no')} className="flex-1 bg-slate-700 hover:bg-slate-600">No</Button>
                            </div>
                        )}
                        {q.type === 'select' && (
                            <div className="flex flex-col gap-2">
                                {q.options?.map(opt => (
                                    <Button key={opt} size="sm" variant="outline" onClick={() => handleAnswer(q.id, opt)} className="justify-start border-slate-600 text-slate-300 hover:text-white hover:bg-indigo-900/40">
                                        {opt}
                                    </Button>
                                ))}
                            </div>
                        )}
                    </div>
                )
            }]);
        }, 600);
    };

    const handleAnswer = (qid: string, value: any) => {
        // Record Answer
        const newAnswers = { ...answers, [qid]: value };
        setAnswers(newAnswers);

        // Add User Confirmation Bubble
        setMessages(prev => [...prev, { role: 'user', content: String(value) }]);

        // Next
        const nextIdx = assessmentIndex + 1;
        setAssessmentIndex(nextIdx);
        askQuestion(nextIdx);
    };

    const finishAssessment = () => {
        const risk = calculateRiskScore(answers, activeQuestions);
        setMessages(prev => [...prev, {
            role: 'assistant',
            type: 'report',
            content: (
                <div className="flex flex-col gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-700">
                    <div className="flex items-center gap-3 border-b border-slate-700 pb-3">
                        <div className="relative w-12 h-12 flex items-center justify-center">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                                <circle cx="24" cy="24" r="20" stroke="currentColor" strokeWidth="4" fill="transparent"
                                    strokeDasharray={125}
                                    strokeDashoffset={125 - (125 * risk.score / 100)}
                                    className={`${risk.score > 75 ? 'text-red-500' : 'text-emerald-500'}`}
                                />
                            </svg>
                            <span className="absolute text-xs font-bold text-white">{risk.score}</span>
                        </div>
                        <div>
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Risk Level</div>
                            <div className={`font-bold ${risk.category === 'High' ? 'text-red-400' : 'text-emerald-400'}`}>{risk.category}</div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {risk.recommendations.slice(0, 2).map((rec, i) => (
                            <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                                <CheckCircle2 className="w-3 h-3 text-emerald-500 mt-0.5" />
                                <span>{rec.title}</span>
                            </div>
                        ))}
                    </div>
                    <Button size="sm" variant="ghost" className="text-xs w-full text-slate-400 hover:text-white" onClick={() => setMode('chat')}>
                        <RefreshCw className="w-3 h-3 mr-2" /> Back to Chat
                    </Button>
                </div>
            )
        }]);
        setMode('chat');
    };

    return (
        <>
            {/* FLOATING ACTION BUTTON */}
            <motion.div
                className="fixed bottom-6 right-6 z-50 print:hidden"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', delay: 1 }}
            >
                <Button
                    onClick={() => setIsOpen(!isOpen)}
                    className="h-14 w-14 rounded-full shadow-2xl bg-indigo-600 hover:bg-indigo-500 border-2 border-indigo-400/50"
                >
                    {isOpen ? <X /> : <Bot className="w-8 h-8" />}
                </Button>
            </motion.div>

            {/* CHAT WINDOW */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.95 }}
                        className="fixed bottom-24 right-6 z-50 w-[350px] md:w-[400px]"
                    >
                        <div className="h-[600px] flex flex-col bg-[#0B1526]/95 backdrop-blur-xl border border-indigo-500/30 shadow-2xl overflow-hidden rounded-2xl relative">

                            {/* HEADER */}
                            <div className="p-4 bg-indigo-600/10 border-b border-indigo-500/20 flex items-center justify-between shrink-0">
                                <div className="flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-indigo-400" />
                                    <div>
                                        <h3 className="font-bold text-white text-sm">Threat Hunter Copilot</h3>
                                        <div className="flex items-center gap-1.5">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <span className="text-[10px] text-emerald-400 font-mono">
                                                {mode === 'assessment' ? 'System Calibrating...' : 'CyberFennec Online'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                {mode === 'chat' && (
                                    <Button size="sm" variant="outline" className="h-7 text-xs border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20" onClick={startAssessment}>
                                        <Activity className="w-3 h-3 mr-1" /> Assess
                                    </Button>
                                )}
                            </div>

                            {/* MESSAGES */}
                            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-indigo-900" ref={scrollRef}>
                                {messages.map((msg, i) => (
                                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                        <div
                                            className={`max-w-[85%] rounded-2xl p-3 text-sm leading-relaxed ${msg.role === 'user'
                                                ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-900/20'
                                                : msg.type === 'report'
                                                    ? 'w-full max-w-full bg-transparent p-0'
                                                    : 'bg-slate-800/80 text-slate-200 border border-slate-700 rounded-tl-none shadow-sm'
                                                }`}
                                        >
                                            {typeof msg.content === 'string' ? (
                                                <span dangerouslySetInnerHTML={{
                                                    __html: msg.content
                                                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white font-bold">$1</strong>')
                                                        .replace(/\n/g, '<br />')
                                                }} />
                                            ) : (
                                                msg.content
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {isLoading && (
                                    <div className="flex justify-start">
                                        <div className="bg-slate-800 rounded-2xl p-3 rounded-tl-none flex gap-2 items-center">
                                            <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                                            <span className="text-xs text-slate-400">Processing...</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* INPUT (Hidden during assessment questions) */}
                            {mode === 'chat' && (
                                <div className="p-3 border-t border-slate-800 bg-black/20 shrink-0">
                                    <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
                                        <input
                                            value={input}
                                            onChange={(e) => setInput(e.target.value)}
                                            placeholder="Ask CyberFennec..."
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-600"
                                        />
                                        <Button type="submit" size="icon" className="bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-900/20" disabled={isLoading}>
                                            <Send className="w-4 h-4" />
                                        </Button>
                                    </form>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence >
        </>
    );
};
