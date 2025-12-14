import React, { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Cloud, FileJson, Upload, Wifi, AlertCircle, Loader2 } from "lucide-react";

interface IoTConnectionDialogProps {
    onConnect: (fileContent?: string) => Promise<void>;
    isScanning: boolean;
    scanProgress: number;
    trigger?: React.ReactNode;
}

export function IoTConnectionDialog({ onConnect, isScanning, scanProgress, trigger }: IoTConnectionDialogProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("cloud");
    const [file, setFile] = useState<File | null>(null);
    const [dragActive, setDragActive] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file: File) => {
        if (file.type !== "text/csv" && !file.name.endsWith(".csv")) {
            setError("Please upload a valid CSV file.");
            return;
        }
        setError(null);
        setFile(file);
    };

    const handleConnect = async () => {
        try {
            if (activeTab === "file" && file) {
                const text = await file.text();
                await onConnect(text);
            } else {
                // Cloud connection: Pass the URL value to trigger simulation logic
                const hubUrl = (document.getElementById("hub-url") as HTMLInputElement)?.value;
                await onConnect(hubUrl);
            }
            setIsOpen(false);
        } catch (e) {
            console.error(e);
            setError("Connection failed. Please try again.");
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-[var(--color-icici-blue)]">
                        <Wifi className="w-4 h-4 mr-2" /> Connect IoT Hub
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="bg-slate-900 border-slate-800 text-white sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Wifi className="w-5 h-5 text-[var(--color-icici-orange)]" />
                        Connect IoT Infrastructure
                    </DialogTitle>
                    <DialogDescription className="text-slate-400">
                        Select a telemetry source to ingest device data for risk analysis.
                    </DialogDescription>
                </DialogHeader>

                <div className="w-full mt-4">
                    <div className="grid w-full grid-cols-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
                        <button
                            onClick={() => setActiveTab("cloud")}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${activeTab === "cloud"
                                ? "bg-slate-800 text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Cloud Connector
                        </button>
                        <button
                            onClick={() => setActiveTab("file")}
                            className={`py-2 text-sm font-medium rounded-md transition-all ${activeTab === "file"
                                ? "bg-slate-800 text-white shadow-sm"
                                : "text-slate-400 hover:text-white"
                                }`}
                        >
                            Upload Logs
                        </button>
                    </div>

                    <div className="mt-6 min-h-[200px]">
                        {activeTab === "cloud" && (
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <label htmlFor="hub-url" className="text-sm font-medium text-slate-200">IoT Hub / MQTT Broker URL</label>
                                    <Input id="hub-url" placeholder="wss://iot-hub.azure-devices.net" className="bg-slate-950 border-slate-800 text-white" />
                                </div>
                                <div className="grid gap-2">
                                    <label htmlFor="api-key" className="text-sm font-medium text-slate-200">Access Token / API Key</label>
                                    <Input id="api-key" type="password" placeholder="••••••••••••••••" className="bg-slate-950 border-slate-800 text-white" />
                                </div>
                                <div className="p-3 bg-blue-950/20 text-blue-300 text-xs rounded-lg border border-blue-500/20 flex items-start gap-2">
                                    <Cloud className="w-4 h-4 shrink-0 mt-0.5" />
                                    <span>
                                        Standard Demo Configuration pre-loaded. Click "Connect" to stream from the simulation sandbox.
                                    </span>
                                </div>
                            </div>
                        )}

                        {activeTab === "file" && (
                            <div>
                                <div
                                    className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer ${dragActive ? "border-[var(--color-icici-orange)] bg-[var(--color-icici-orange)]/10" : "border-slate-700 hover:border-slate-600 bg-slate-950/50"}`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        className="hidden"
                                        multiple={false}
                                        onChange={handleChange}
                                        accept=".csv"
                                    />

                                    {file ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                                                <FileJson className="w-6 h-6" />
                                            </div>
                                            <div className="text-sm font-medium text-white">{file.name}</div>
                                            <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</div>
                                            <Button
                                                variant="ghost"
                                                className="text-red-400 text-xs h-6 px-2 hover:bg-red-950/30 hover:underline"
                                                onClick={(e) => { e.stopPropagation(); setFile(null); }}
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="h-12 w-12 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-4">
                                                <Upload className="w-6 h-6" />
                                            </div>
                                            <p className="text-sm font-medium text-white mb-1">
                                                Click to upload or drag and drop
                                            </p>
                                            <p className="text-xs text-slate-500">
                                                Supported formats: .CSV (Standard IoT Log Schema)
                                            </p>
                                        </>
                                    )}
                                </div>
                                {error && (
                                    <div className="mt-2 text-xs text-red-400 flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {error}
                                    </div>
                                )}
                                <div className="mt-4 flex justify-between items-center text-xs text-slate-500">
                                    <a href="/dummy_iot_data.csv" download className="hover:text-[var(--color-icici-blue)] underline">
                                        Download Template CSV
                                    </a>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancel</Button>
                        <Button
                            onClick={handleConnect}
                            className="bg-[var(--color-icici-orange)] hover:bg-orange-600 text-white"
                            disabled={activeTab === 'file' && !file}
                        >
                            {isScanning ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Connecting...
                                </>
                            ) : (
                                <>
                                    {activeTab === 'file' ? 'Ingest Logs' : 'Connect Stream'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
