import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Building, MapPin, Loader2, ShieldCheck, ArrowRight, CheckCircle2, ArrowLeft } from "lucide-react";
import { speakText, startRecording } from "@/lib/voice";
import { IndustrySelection } from "@/components/onboarding/IndustrySelection";
import { PincodeData } from "@/lib/pincodeMaster";

interface AssessmentWizardProps {
    onComplete: (data: { industry: string; companyName: string; location: string; policyNumber?: string; subDomain?: string; intelData?: any }) => void;
    onBack: () => void;
}

export type WizardStep = "START" | "CUSTOMER_TYPE" | "VERIFICATION_METHOD" | "INDUSTRY" | "COMPANY" | "LOCATION" | "POLICY_INPUT" | "CONFIRMATION" | "SUB_DOMAIN" | "PROCESSING";

export const AssessmentWizard: React.FC<AssessmentWizardProps> = ({ onComplete, onBack }) => {
    const [step, setStep] = useState<WizardStep>("CUSTOMER_TYPE");
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voiceMode, setVoiceMode] = useState(false);

    // Voice Input State
    const [recordingField, setRecordingField] = useState<string | null>(null);
    const stopRecordingRef = useRef<(() => Promise<string | null>) | null>(null);

    // Form Data
    const [isExistingCustomer, setIsExistingCustomer] = useState<boolean | null>(null);
    const [verificationMethod, setVerificationMethod] = useState<"POLICY" | "MOBILE" | null>(null);
    const [policyNumber, setPolicyNumber] = useState("");
    const [industry, setIndustry] = useState("");
    const [companyName, setCompanyName] = useState("");
    const [location, setLocation] = useState("");
    const [subDomain, setSubDomain] = useState("");

    // Intel State
    const [intelData, setIntelData] = useState<any>(null);
    const [loadingIntel, setLoadingIntel] = useState(false);

    // Pincode Autocomplete
    const [pincodeSuggestions, setPincodeSuggestions] = useState<PincodeData[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const searchTimeout = React.useRef<NodeJS.Timeout | undefined>(undefined);

    // State for Errors
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const validateCustomerIdentifier = (value: string) => {
        if (!value) return "Required";

        if (verificationMethod === "MOBILE") {
            const mobileRegex = /^[6-9]\d{9}$/;
            if (!mobileRegex.test(value)) return "Invalid Mobile Number. Enter 10 digits.";
        } else {
            const policyRegex = /^\d{4}\/\d{5,}\/\d{2}\/\d{3}$/;
            if (!policyRegex.test(value)) return "Invalid Policy Number. Format: 4005/XXXXX/XX/XXX";
        }
        return "";
    };

    const validateRequired = (value: string, fieldName: string) => {
        if (!value || value.trim().length < 3) return `${fieldName} must be at least 3 characters.`;
        if (/^(.)\1+$/.test(value)) return `Please enter a valid ${fieldName}.`;
        if (!/^[a-zA-Z0-9\s,.-/()]+$/.test(value)) return `${fieldName} contains invalid characters.`;
        return "";
    };

    const fetchSubSectors = async () => {
        setLoadingIntel(true);
        try {
            const res = await fetch("/api/industry-intel", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ industry }),
            });
            const data = await res.json();
            setIntelData(data);
        } catch (error) {
            console.error("Failed to fetch sub-sectors", error);
        } finally {
            setLoadingIntel(false);
        }
    };

    const handleNextWithValidation = (field: string, value: string, nextStepName: WizardStep, speech: string) => {
        let error = "";
        if (field === "policyNumber") error = validateCustomerIdentifier(value);
        if (field === "companyName") error = validateRequired(value, "Company Name");
        if (field === "location") error = validateRequired(value, "Location");
        if (field === "subDomain") error = validateRequired(value, "Sub-domain");

        if (error) {
            setErrors(prev => ({ ...prev, [field]: error }));
            handleVoice(`Please check your input. ${error}`);
            return;
        }

        // Clear error and proceed
        setErrors(prev => ({ ...prev, [field]: "" }));

        // Trigger fetch if moving to SUB_DOMAIN
        if (nextStepName === "SUB_DOMAIN") {
            fetchSubSectors();
        }

        nextStep(nextStepName, speech);
    };

    // Simulate Voice Greeting on Mount
    useEffect(() => {
        // handleVoice("Welcome to ICICI Lombard. Let's secure your business. Are you an existing customer or a new customer?");
    }, []);

    // Helper to get field name from step
    const getFieldForStep = (currentStep: WizardStep): string | null => {
        switch (currentStep) {
            case "COMPANY": return "companyName";
            case "LOCATION": return "location";
            case "SUB_DOMAIN": return "subDomain";
            default: return null;
        }
    };

    const handleVoice = async (text: string) => {
        if (!voiceMode) return; // Voice Guard
        setIsSpeaking(true);
        // Clean text for speech
        const speechText = text.replace(/[*#]/g, '');

        await speakText(speechText, () => {
            // Auto-Listen after speech
            const field = getFieldForStep(step);
            if (field && voiceMode) {
                console.log(`[VoiceDebug] Auto-starting mic for ${field}`);
                startRecordingForField(field);
            }
        });
        setIsSpeaking(false);
    };

    const nextStep = (next: WizardStep, speech?: string) => {
        setStep(next);
        // We delay speech slightly to ensure render? usually fine.
        if (speech && voiceMode) handleVoice(speech);
    };

    // Toggle Voice Mode
    const toggleVoice = () => {
        const newMode = !voiceMode;
        setVoiceMode(newMode);
        if (newMode) {
            handleVoice("Voice guidance enabled.");
        } else {
            speakText(""); // Stop speech
        }
    };

    const startRecordingForField = async (field: string) => {
        setRecordingField(field);
        try {
            const { stop } = await startRecording();
            stopRecordingRef.current = stop;
        } catch (error) {
            console.error("[VoiceDebug] Failed to start recording:", error);
            setRecordingField(null);
        }
    };

    const toggleRecording = async (field: string, setter: (val: string) => void, onComplete?: (text: string) => void) => {
        console.log(`[VoiceDebug] Toggle clicked for ${field}. Current field: ${recordingField}`);

        if (recordingField === field) {
            console.log("[VoiceDebug] Stopping recording...");
            // Stop Recording
            if (stopRecordingRef.current) {
                const text = await stopRecordingRef.current();
                console.log("[VoiceDebug] Transcription received:", text);
                if (text) {
                    setter(text);
                    if (onComplete) {
                        setTimeout(() => onComplete(text), 100);
                    }
                }
                stopRecordingRef.current = null;
            }
            setRecordingField(null);
        } else {
            // Manual Start
            console.log("[VoiceDebug] Starting recording...");
            await startRecordingForField(field);
        }
    };

    const handleBack = () => {
        switch (step) {
            case "CUSTOMER_TYPE": return onBack();
            case "VERIFICATION_METHOD": return setStep("CUSTOMER_TYPE");
            case "INDUSTRY": return setStep("CUSTOMER_TYPE");
            case "POLICY_INPUT": return setStep("VERIFICATION_METHOD");
            case "CONFIRMATION": return setStep("POLICY_INPUT");
            case "COMPANY": return setStep("INDUSTRY");
            case "LOCATION": return setStep("COMPANY");
            case "SUB_DOMAIN": return setStep("LOCATION");
            default: return;
        }
    };

    const handleProcessing = async (overrides?: NodeJS.Dict<any>) => {
        setStep("PROCESSING");
        handleVoice("Scraping industry and location level claims. Analyzing your risk profile.");

        // Removed simulated delay for instant navigation
        // await new Promise(resolve => setTimeout(resolve, 4000));

        // Small buffer to allow the UI to render the processing state briefly if needed
        await new Promise(resolve => setTimeout(resolve, 500));

        onComplete({
            industry: industry || "Manufacturing", // Fallback
            companyName: companyName || "FabTex Industries", // Fallback
            location,
            policyNumber: isExistingCustomer ? policyNumber : undefined,
            subDomain,
            intelData,
            ...overrides
        });
    };

    return (
        <div className={`w-full mx-auto p-4 transition-all duration-500 relative ${step === "INDUSTRY" ? "max-w-5xl" : "max-w-3xl"}`}>

            {/* Ambient Background Glow for "Awesome" Factor */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-icici-orange/5 blur-[120px] rounded-full pointer-events-none" />

            <Card className="glass-panel-premium border-0 ring-1 ring-white/10 shadow-2xl shadow-black/50 relative overflow-hidden min-h-[550px] flex flex-col items-center justify-center text-center backdrop-blur-3xl p-[4vmin]">

                {/* Decorative Top Gradient Line */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-icici-orange to-transparent opacity-80" />
                <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-b from-icici-orange/10 to-transparent pointer-events-none" />

                {/* Back Button - Inner Placement */}
                {step !== "PROCESSING" && (
                    <button
                        onClick={handleBack}
                        className="absolute top-[1.5vmin] left-[1.5vmin] z-50 p-[1vmin] rounded-full bg-slate-800/50 border border-slate-700/50 text-slate-400 hover:text-white hover:bg-slate-800 transition-all backdrop-blur-md"
                    >
                        <ArrowLeft className="w-[2.5vmin] h-[2.5vmin]" />
                    </button>
                )}

                {/* Persistent Voice Toggle - Holographic Pill Design */}
                <div className="absolute top-[1.5vmin] right-[1.5vmin] z-50">
                    <button
                        onClick={toggleVoice}
                        className={`group relative flex items-center gap-[1vmin] px-[2vmin] py-[1vmin] rounded-full border transition-all duration-500 ${voiceMode
                            ? "bg-gradient-to-r from-orange-500/20 to-orange-600/20 border-orange-500/50 text-orange-400 shadow-[0_0_25px_rgba(249,115,22,0.4)]"
                            : "bg-slate-900/60 border-slate-700/50 text-slate-400 hover:border-slate-500 hover:text-white hover:bg-slate-800/80"
                            } backdrop-blur-md`}
                    >
                        {voiceMode && <span className="absolute inset-0 rounded-full border border-orange-500/50 animate-ping opacity-20"></span>}
                        <div className={`relative w-[1vmin] h-[1vmin] rounded-full ${voiceMode ? "bg-orange-500 animate-[pulse_1s_ease-in-out_infinite] shadow-[0_0_10px_orange]" : "bg-slate-500"}`} />
                        <Mic className={`w-[2vmin] h-[2vmin] ${voiceMode ? "text-orange-500" : "opacity-70"}`} />
                        <span className="text-[1.2vmin] uppercase font-bold tracking-widest">{voiceMode ? "Voice Active" : "Voice Off"}</span>
                    </button>
                </div>

                <AnimatePresence mode="wait">


                    {step === "CUSTOMER_TYPE" && (
                        <motion.div
                            key="customer"
                            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="space-y-8 w-full pt-20"
                        >
                            <h3 className="text-2xl font-semibold text-white">Select Customer Type</h3>
                            <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
                                <Button
                                    variant="outline"
                                    className="h-40 flex flex-col gap-4 bg-slate-900/40 border-slate-700/50 hover:bg-emerald-900/20 hover:border-emerald-500/50 text-slate-300 hover:text-emerald-400 transition-all duration-300 group backdrop-blur-sm"
                                    onClick={() => {
                                        setIsExistingCustomer(true);
                                        nextStep("VERIFICATION_METHOD", "How would you like to verify your account?");
                                    }}
                                >
                                    <div className="w-16 h-16 rounded-full bg-slate-800/50 group-hover:bg-emerald-500/20 flex items-center justify-center transition-colors">
                                        <ShieldCheck className="w-8 h-8 text-emerald-600 group-hover:text-emerald-400 transition-colors" />
                                    </div>
                                    <span className="text-lg font-medium tracking-wide">Existing Customer</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-40 flex flex-col gap-4 bg-slate-900/40 border-slate-700/50 hover:bg-orange-900/20 hover:border-orange-500/50 text-slate-300 hover:text-orange-400 transition-all duration-300 group backdrop-blur-sm"
                                    onClick={() => {
                                        setIsExistingCustomer(false);
                                        nextStep("INDUSTRY", "Please select your industry.");
                                    }}
                                >
                                    <div className="w-16 h-16 rounded-full bg-slate-800/50 group-hover:bg-orange-500/20 flex items-center justify-center transition-colors">
                                        <Building className="w-8 h-8 text-slate-500 group-hover:text-orange-400 transition-colors" />
                                    </div>
                                    <span className="text-lg font-medium tracking-wide">New Customer</span>
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === "VERIFICATION_METHOD" && (
                        <motion.div
                            key="verification_method"
                            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                            exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            className="space-y-8 w-full pt-20"
                        >
                            <h3 className="text-2xl font-semibold text-white">How do you want to verify?</h3>
                            <div className="grid grid-cols-2 gap-6 max-w-lg mx-auto">
                                <Button
                                    variant="outline"
                                    className="h-40 flex flex-col gap-4 bg-slate-900/40 border-slate-700/50 hover:bg-blue-900/20 hover:border-blue-500/50 text-slate-300 hover:text-blue-400 transition-all duration-300 group backdrop-blur-sm"
                                    onClick={() => {
                                        setVerificationMethod("POLICY");
                                        nextStep("POLICY_INPUT", "Please enter your policy number.");
                                    }}
                                >
                                    <div className="w-16 h-16 rounded-full bg-slate-800/50 group-hover:bg-blue-500/20 flex items-center justify-center transition-colors">
                                        <ShieldCheck className="w-8 h-8 text-blue-600 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                    <span className="text-lg font-medium tracking-wide">Policy Number</span>
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-40 flex flex-col gap-4 bg-slate-900/40 border-slate-700/50 hover:bg-purple-900/20 hover:border-purple-500/50 text-slate-300 hover:text-purple-400 transition-all duration-300 group backdrop-blur-sm"
                                    onClick={() => {
                                        setVerificationMethod("MOBILE");
                                        nextStep("POLICY_INPUT", "Please enter your mobile number.");
                                    }}
                                >
                                    <div className="w-16 h-16 rounded-full bg-slate-800/50 group-hover:bg-purple-500/20 flex items-center justify-center transition-colors">
                                        <div className="w-8 h-8 text-purple-600 group-hover:text-purple-400 transition-colors flex items-center justify-center font-bold text-2xl">#</div>
                                    </div>
                                    <span className="text-lg font-medium tracking-wide">Mobile Number</span>
                                </Button>
                            </div>
                        </motion.div>
                    )}

                    {step === "POLICY_INPUT" && (
                        <motion.div
                            key="policy_input"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-6 w-full max-w-md mx-auto pt-20"
                        >
                            <h3 className="text-xl font-semibold text-white">
                                {verificationMethod === "POLICY" ? "Enter Policy Number" : "Enter Mobile Number"}
                            </h3>
                            <div className="space-y-3">
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                                    <Input
                                        placeholder={verificationMethod === "POLICY" ? "e.g. 4005/12345/00/000" : "e.g. 9876543210"}
                                        className={`relative bg-slate-950/80 text-white text-xl p-8 transition-all border-slate-800 focus:border-orange-500 focus:ring-orange-500/20 placeholder:text-slate-600 ${errors.policyNumber ? "border-red-500/50 focus:border-red-500" : ""}`}
                                        value={policyNumber}
                                        maxLength={verificationMethod === "MOBILE" ? 10 : undefined}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (verificationMethod === "MOBILE" && val.length > 10) return;
                                            setPolicyNumber(val);
                                            if (errors.policyNumber) setErrors(prev => ({ ...prev, policyNumber: "" }));
                                        }}
                                    />
                                </div>
                                {errors.policyNumber && (
                                    <p className="text-red-400 text-sm flex items-center gap-2 animate-in slide-in-from-left-2 pl-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_red]" /> {errors.policyNumber}
                                    </p>
                                )}
                            </div>
                            <Button
                                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 py-8 text-xl font-semibold shadow-lg shadow-orange-900/20 transition-all border border-orange-500/20"
                                onClick={() => handleNextWithValidation("policyNumber", policyNumber, "CONFIRMATION", "We found these details. Please confirm if they are correct.")}
                            >
                                Verify & Proceed
                            </Button>
                        </motion.div>
                    )}

                    {step === "CONFIRMATION" && (
                        <motion.div
                            key="confirmation"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-6 w-full max-w-md mx-auto pt-20"
                        >
                            <h3 className="text-xl font-semibold text-white">Confirm Details</h3>
                            <div className="bg-slate-800/50 rounded-xl p-6 space-y-4 text-left border border-slate-700">
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Policy Holder</label>
                                    <p className="text-lg font-bold text-white">FabTex Industries Ltd.</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Registered Location</label>
                                    <p className="text-lg text-white">Andheri East, Mumbai</p>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-500 uppercase">Primary Industry</label>
                                    <p className="text-lg text-white">Retail & E-commerce</p>
                                </div>
                            </div>
                            <Button
                                className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 text-lg shadow-lg shadow-emerald-900/20"
                                onClick={() => {
                                    setCompanyName("FabTex Industries Ltd.");
                                    setLocation("Mumbai");
                                    setIndustry("retail");
                                    handleProcessing();
                                }}
                            >
                                <CheckCircle2 className="mr-2" /> Confirm & Analyze
                            </Button>
                        </motion.div>
                    )}


                    {step === "INDUSTRY" && (
                        <motion.div
                            key="industry"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 1.05 }}
                            className="w-full pt-20"
                        >
                            <IndustrySelection
                                onSelect={(ind) => {
                                    setIndustry(ind);
                                    nextStep("COMPANY", "Please enter your company name.");
                                }}
                            />
                        </motion.div>
                    )}

                    {step === "COMPANY" && (
                        <motion.div
                            key="company"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-6 w-full max-w-md mx-auto pt-20"
                        >
                            <h3 className="text-xl font-semibold text-white">What is your company name?</h3>
                            <div className="space-y-3">
                                <div className="relative group">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-500"></div>
                                    <Input
                                        placeholder="e.g. Acme Corp"
                                        className={`relative bg-slate-950/80 text-white text-xl p-8 pr-16 transition-all border-slate-800 focus:border-orange-500 focus:ring-orange-500/20 placeholder:text-slate-600 ${errors.companyName ? "border-red-500/50 focus:border-red-500" : ""}`}
                                        value={companyName}
                                        onChange={(e) => {
                                            setCompanyName(e.target.value);
                                            if (errors.companyName) setErrors(prev => ({ ...prev, companyName: "" }));
                                        }}
                                    />
                                    {/* Mic Button */}
                                    <button
                                        onClick={() => toggleRecording("companyName", setCompanyName)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-800 transition-colors z-10"
                                    >
                                        <Mic className={`w-5 h-5 ${recordingField === "companyName" ? "text-red-500 animate-pulse" : "text-slate-400"}`} />
                                    </button>
                                </div>
                                {errors.companyName && (
                                    <p className="text-red-400 text-sm flex items-center gap-2 animate-in slide-in-from-left-2 pl-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 shadow-[0_0_8px_red]" /> {errors.companyName}
                                    </p>
                                )}
                            </div>
                            <Button
                                className="w-full bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 py-8 text-xl font-semibold shadow-lg shadow-orange-900/20 transition-all border border-orange-500/20"
                                onClick={() => handleNextWithValidation("companyName", companyName, "LOCATION", "Where are your primary operations located?")}
                            >
                                Next Step
                            </Button>
                        </motion.div>
                    )}

                    {step === "LOCATION" && (
                        <motion.div
                            key="location"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-6 w-full max-w-md mx-auto pt-20"
                        >
                            <h3 className="text-xl font-semibold text-white">Primary Location</h3>
                            <div className="space-y-2 relative">
                                <div className="relative">
                                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
                                    <Input
                                        placeholder="City, State, or Pincode"
                                        className={`bg-slate-900/50 text-white pl-14 pr-16 py-6 text-lg transition-all ${errors.location ? "border-red-500 focus:ring-red-500" : "border-slate-700"}`}
                                        value={location}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setLocation(val);
                                            if (errors.location) setErrors(prev => ({ ...prev, location: "" }));

                                            if (searchTimeout.current) clearTimeout(searchTimeout.current);

                                            if (val.length > 2) {
                                                setIsSearching(true);
                                                searchTimeout.current = setTimeout(async () => {
                                                    try {
                                                        const res = await fetch(`/api/pincode-lookup?q=${encodeURIComponent(val)}`);
                                                        const data = await res.json();
                                                        if (data.results) {
                                                            setPincodeSuggestions(data.results);
                                                        }
                                                    } catch (err) {
                                                        console.error("Pincode search failed", err);
                                                    } finally {
                                                        setIsSearching(false);
                                                    }
                                                }, 400);
                                            } else {
                                                setPincodeSuggestions([]);
                                                setIsSearching(false);
                                            }
                                        }}
                                    />

                                    {/* Mic Button */}
                                    <button
                                        onClick={() => toggleRecording("location", setLocation, (txt) => handleProcessing({ location: txt }))}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-800 transition-colors z-10"
                                    >
                                        <Mic className={`w-5 h-5 ${recordingField === "location" ? "text-red-500 animate-pulse" : "text-slate-400"}`} />
                                    </button>
                                    {pincodeSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden max-h-[300px] overflow-y-auto">
                                            {pincodeSuggestions.map((item) => (
                                                <div
                                                    key={`${item.pincode}-${item.city}-${item.area}`}
                                                    className="p-3 hover:bg-slate-800 cursor-pointer flex justify-between items-center transition-colors border-b border-slate-800/50 last:border-0"
                                                    onClick={() => {
                                                        if (searchTimeout.current) clearTimeout(searchTimeout.current);
                                                        setLocation(`${item.area}, ${item.city}, ${item.state} (${item.pincode})`);
                                                        setPincodeSuggestions([]);
                                                        setIsSearching(false);
                                                    }}
                                                >
                                                    <div>
                                                        <div className="text-white font-medium">{item.area}, {item.city}</div>
                                                        <div className="text-xs text-slate-400">{item.state}</div>
                                                    </div>
                                                    <Badge variant="secondary" className="bg-slate-800 text-slate-300 font-mono text-xs">
                                                        {item.pincode}
                                                    </Badge>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                {errors.location && (
                                    <p className="text-red-400 text-sm flex items-center gap-2 animate-in slide-in-from-left-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-red-400" /> {errors.location}
                                    </p>
                                )}
                            </div>
                            <Button
                                className="w-full bg-icici-orange hover:bg-orange-600 py-6 text-lg"
                                onClick={() => {
                                    const error = validateRequired(location, "Location");
                                    if (error) {
                                        setErrors(prev => ({ ...prev, location: error }));
                                        return;
                                    }
                                    handleProcessing();
                                }}
                            >
                                <CheckCircle2 className="mr-2" /> Generate Risk Report
                            </Button>
                        </motion.div>
                    )}

                    {step === "SUB_DOMAIN" && (
                        <motion.div
                            key="sub_domain"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="space-y-6 w-full max-w-lg mx-auto pt-20"
                        >
                            <h3 className="text-xl font-semibold text-white">Operational Sub-domain</h3>
                            <p className="text-sm text-slate-400">Select your specific domain to unlock tailored recommendations.</p>

                            {loadingIntel ? (
                                <div className="flex justify-center py-10">
                                    <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
                                </div>
                            ) : intelData?.sub_sectors?.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {intelData.sub_sectors.map((sub: string) => (
                                        <Button
                                            key={sub}
                                            variant="outline"
                                            className={`h-auto py-4 text-left justify-start border-slate-700 bg-slate-900/50 hover:bg-orange-500/10 hover:border-orange-500/50 hover:text-orange-400 transition-all ${subDomain === sub ? "border-orange-500 bg-orange-500/10 text-orange-400" : "text-slate-300"}`}
                                            onClick={() => {
                                                setSubDomain(sub);
                                                handleProcessing();
                                            }}
                                        >
                                            <span className="truncate">{sub}</span>
                                            {subDomain === sub && <CheckCircle2 className="ml-auto w-4 h-4 text-orange-500" />}
                                        </Button>
                                    ))}
                                </div>
                            ) : (
                                <div className="space-y-2 relative">
                                    <Input
                                        placeholder="e.g. Dyeing Unit, Chemical Storage..."
                                        className={`bg-slate-900/50 text-white text-lg p-6 pr-16 transition-all ${errors.subDomain ? "border-red-500 focus:ring-red-500" : "border-slate-700"}`}
                                        value={subDomain}
                                        onChange={(e) => {
                                            setSubDomain(e.target.value);
                                            if (errors.subDomain) setErrors(prev => ({ ...prev, subDomain: "" }));
                                        }}
                                    />
                                    {/* Mic Button */}
                                    <button
                                        onClick={() => toggleRecording("subDomain", setSubDomain)}
                                        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-slate-800 transition-colors z-10"
                                    >
                                        <Mic className={`w-5 h-5 ${recordingField === "subDomain" ? "text-red-500 animate-pulse" : "text-slate-400"}`} />
                                    </button>

                                    {errors.subDomain && (
                                        <p className="text-red-400 text-sm flex items-center gap-2 animate-in slide-in-from-left-2">
                                            <div className="w-1.5 h-1.5 rounded-full bg-red-400" /> {errors.subDomain}
                                        </p>
                                    )}
                                </div>
                            )}

                            {(intelData?.sub_sectors?.length > 0) ? (
                                <Button
                                    disabled={!subDomain}
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 text-lg shadow-lg shadow-emerald-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleProcessing()}
                                >
                                    <CheckCircle2 className="mr-2" /> Generate Risk Report
                                </Button>
                            ) : (
                                <Button
                                    className="w-full bg-emerald-600 hover:bg-emerald-500 py-6 text-lg shadow-lg shadow-emerald-900/20"
                                    onClick={() => {
                                        const error = validateRequired(subDomain, "Sub-domain");
                                        if (error) {
                                            setErrors(prev => ({ ...prev, subDomain: error }));
                                            handleVoice(`Please check the sub-domain description. ${error}`);
                                            return;
                                        }
                                        handleProcessing();
                                    }}
                                >
                                    <CheckCircle2 className="mr-2" /> Generate Risk Report
                                </Button>
                            )}
                        </motion.div>
                    )}

                    {step === "PROCESSING" && (
                        <motion.div
                            key="processing"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center w-full h-full min-h-[400px] flex-1"
                        >
                            {/* NEURAL BRAIN LOADER */}
                            <div className="relative w-48 h-48 flex items-center justify-center mb-8">
                                {/* Brain Core */}
                                <motion.div
                                    animate={{ scale: [1, 1.1, 1], opacity: [0.8, 1, 0.8] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                    className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl"
                                />
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1], rotate: 180 }}
                                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                                    className="absolute w-32 h-32 bg-gradient-to-tr from-blue-400 to-indigo-600 rounded-full blur-md opacity-40"
                                />
                                <div className="relative z-10 w-24 h-24 bg-white/10 rounded-full backdrop-blur-md border border-white/20 shadow-[0_0_40px_rgba(59,130,246,0.3)] flex items-center justify-center">
                                    <div className="w-16 h-16 rounded-full bg-gradient-to-b from-blue-100 to-blue-400 opacity-90 animate-pulse shadow-inner" />
                                </div>

                                {/* Synaptic Ripples */}
                                <motion.div
                                    animate={{ scale: [1, 2], opacity: [0.5, 0] }}
                                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                                    className="absolute inset-0 border border-blue-400/30 rounded-full"
                                />
                                <motion.div
                                    animate={{ scale: [1, 2.5], opacity: [0.3, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: "easeOut", delay: 0.5 }}
                                    className="absolute inset-0 border border-indigo-400/20 rounded-full"
                                />
                            </div>

                            <div className="space-y-3 text-center z-10">
                                <h3 className="text-2xl font-light text-blue-100 tracking-[0.2em] uppercase">
                                    Leveraging 20 Years of Claims Data
                                </h3>
                                <div className="flex flex-col items-center gap-2">
                                    <p className="text-blue-400/60 font-mono text-xs uppercase tracking-widest flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                                        Tapping PRRS, RRIT & Billions of Data Points...
                                    </p>
                                    <p className="text-slate-500 text-[10px] uppercase tracking-widest">
                                        Target: {location} • Entity: {companyName || "FabTex Industries"}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Voice Status Indicator */}
                {isSpeaking && (
                    <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-slate-800 backdrop-blur-md">
                        <div className="flex gap-1 h-3 items-end">
                            <motion.div animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.5 }} className="w-1 bg-orange-500 rounded-full" />
                            <motion.div animate={{ height: [6, 16, 6] }} transition={{ repeat: Infinity, duration: 0.4, delay: 0.1 }} className="w-1 bg-orange-500 rounded-full" />
                            <motion.div animate={{ height: [4, 10, 4] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} className="w-1 bg-orange-500 rounded-full" />
                        </div>
                        <span className="text-[10px] uppercase font-bold text-orange-400 tracking-wider">Listening...</span>
                    </div>
                )}
            </Card>
        </div >
    );
};
