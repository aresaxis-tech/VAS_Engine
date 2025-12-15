let currentAudio: HTMLAudioElement | null = null;

/**
* Synthesizes speech from text using AWS Polly via API route.
* More secure as credentials are kept server-side.
*/
export async function speakText(sample_text: string, onComplete?: () => void): Promise<HTMLAudioElement | undefined> {
    // Stop any currently playing audio
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }

    try {
        const response = await fetch('/api/polly', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: sample_text }),
        });

        if (!response.ok) {
            const errorDetails = await response.text();
            throw new Error(`Failed to synthesize speech: ${response.status} ${response.statusText} - ${errorDetails}`);
        }

        const audioBlob = await response.blob();
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);

        currentAudio = audio;

        await audio.play();

        // Clean up URL when audio ends
        audio.onended = () => {
            URL.revokeObjectURL(audioUrl);
            if (onComplete) onComplete();
        };

        return audio;
    } catch (error) {
        console.error("Error synthesizing speech:", error);
        // Fallback or silent fail so as not to block UI
        if (onComplete) onComplete(); // Ensure flow continues even on error
    }
}

/**
* Stops the currently playing audio
*/
export function stopSpeaking() {
    if (currentAudio) {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio = null;
    }
}

/**
* Starts recording audio from the user's microphone with auto-stop on silence
*/
export async function startRecording(onAutoStop?: (transcript?: string) => void): Promise<{
    stop: () => Promise<string | null>;
    mediaRecorder: MediaRecorder;
}> {
    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
        }
    });

    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks: Blob[] = [];
    let silenceTimer: NodeJS.Timeout | null = null;
    let isManualStop = false;

    // Audio analysis for silence detection
    const audioContext = new AudioContext({ sampleRate: 16000 });
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };

    mediaRecorder.start();

    // Silence detection loop
    const checkSilence = () => {
        if (mediaRecorder.state !== 'recording') return;

        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
        const threshold = 40;

        if (average > threshold) {
            // Voice detected - reset silence timer
            if (silenceTimer) {
                clearTimeout(silenceTimer);
                silenceTimer = null;
            }
        } else {
            // Silence detected - start timer if not already running
            if (!silenceTimer) {
                silenceTimer = setTimeout(() => {
                    if (mediaRecorder.state === 'recording' && !isManualStop) {
                        console.log('[Auto-Stop] 1 second silence detected, stopping recording...');

                        // Set up one-time stop handler for transcription
                        const handleStop = () => {
                            mediaRecorder.removeEventListener('stop', handleStop);
                            const audioBlob = new Blob(audioChunks, { type: mediaRecorder.mimeType || 'audio/webm' });
                            
                            // Non-blocking transcription
                            transcribeAudio(audioBlob).then(transcript => {
                                console.log('[Auto-Transcribe] Result:', transcript);
                                if (onAutoStop) onAutoStop(transcript || undefined);
                            }).catch(err => {
                                console.error('[Auto-Transcribe] Error:', err);
                                if (onAutoStop) onAutoStop(undefined);
                            });
                        };

                        mediaRecorder.addEventListener('stop', handleStop);
                        mediaRecorder.stop();
                    }
                }, 1000); // 1 second silence
            }
        }

        if (mediaRecorder.state === 'recording') {
            requestAnimationFrame(checkSilence);
        }
    };

    checkSilence();

    return {
        mediaRecorder,
        stop: async (): Promise<string | null> => {
            return new Promise((resolve) => {
                isManualStop = true;
                if (silenceTimer) clearTimeout(silenceTimer);

                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach(track => track.stop());
                    audioContext.close();

                    const mimeType = mediaRecorder.mimeType || 'audio/webm';
                    console.log("Recording stopped. MIME type:", mimeType);

                    const audioBlob = new Blob(audioChunks, { type: mimeType });
                    const transcript = await transcribeAudio(audioBlob);
                    resolve(transcript);
                };

                if (mediaRecorder.state === 'recording') {
                    mediaRecorder.stop();
                } else {
                    mediaRecorder.onstop?.(new Event('stop') as any);
                }
            });
        }
    };
}

/**
* Starts automatic listening with silence detection and intent processing
*/
export async function startAutoListening({
    context,
    onIntent,
    onTranscript,
    onTextInput,
    silenceTimeout = 60000 // 1 minute
}: {
    context: string | (() => string);
    onIntent?: (intent: any) => void;
    onTranscript?: (text: string) => void;
    onTextInput?: (text: string) => void;
    silenceTimeout?: number;
}): Promise<{
    stop: () => void;
    isListening: boolean;
}> {
    let isListening = true;
    let silenceTimer: NodeJS.Timeout | null = null;
    let mediaRecorder: MediaRecorder | null = null;
    let stream: MediaStream | null = null;

    try {
        stream = await navigator.mediaDevices.getUserMedia({
            audio: {
                sampleRate: 16000,
                channelCount: 1,
                echoCancellation: true,
                noiseSuppression: true,
            }
        });

        const audioContext = new AudioContext({ sampleRate: 16000 });
        const source = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        let audioChunks: Blob[] = [];

        mediaRecorder = new MediaRecorder(stream);

        mediaRecorder.ondataavailable = (event) => {
            if (event.data.size > 0) {
                audioChunks.push(event.data);
            }
        };

        mediaRecorder.onstop = async () => {
            if (audioChunks.length > 0) {
                const audioBlob = new Blob(audioChunks, { type: mediaRecorder?.mimeType || 'audio/webm' });
                const transcript = await transcribeAudio(audioBlob);

                if (transcript && onTranscript) {
                    onTranscript(transcript);
                }

                const currentContext = typeof context === 'function' ? context() : context;

                console.log('Processing transcript:', transcript, 'context:', currentContext);

                if (transcript && onTextInput && (currentContext === 'POLICY_INPUT' || currentContext === 'COMPANY' || currentContext === 'LOCATION')) {
                    // For text input fields, just return the transcript
                    onTextInput(transcript);
                } else if (transcript && onIntent) {
                    // For selection screens, do intent detection
                    const intent = await detectIntent(transcript, currentContext);
                    onIntent(intent);
                }
            }
            audioChunks = [];
        };

        // Voice activity detection
        const checkVoiceActivity = () => {
            if (!isListening) return;

            analyser.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
            const threshold = 30;

            if (average > threshold) {
                // Voice detected - reset silence timer
                if (silenceTimer) {
                    clearTimeout(silenceTimer);
                    silenceTimer = null;
                }

                // Start recording if not already
                if (mediaRecorder?.state === 'inactive') {
                    mediaRecorder.start();
                }
            } else {
                // Silence detected - trigger transcription after 1 second
                if (!silenceTimer && mediaRecorder?.state === 'recording') {
                    silenceTimer = setTimeout(() => {
                        if (mediaRecorder?.state === 'recording') {
                            mediaRecorder.stop();
                        }
                        silenceTimer = null;
                    }, 1000); // 1 second silence
                }
            }

            if (isListening) {
                requestAnimationFrame(checkVoiceActivity);
            }
        };

        checkVoiceActivity();

        return {
            stop: () => {
                isListening = false;
                if (silenceTimer) clearTimeout(silenceTimer);
                if (mediaRecorder?.state === 'recording') mediaRecorder.stop();
                if (stream) stream.getTracks().forEach(track => track.stop());
                if (audioContext.state !== 'closed') audioContext.close();
            },
            isListening
        };
    } catch (error) {
        console.error('Failed to start auto listening:', error);
        if (stream) stream.getTracks().forEach(track => track.stop());
        throw error;
    }
}

/**
* Detects intent from transcribed text
*/
export async function detectIntent(text: string, context: string): Promise<any> {
    try {
        const response = await fetch('/api/intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, context }),
        });

        if (!response.ok) {
            throw new Error(`Intent detection failed: ${response.statusText}`);
        }

        const { intent } = await response.json();
        return intent;
    } catch (error) {
        console.error('Error detecting intent:', error);
        return { action: 'unclear', text };
    }
}

// Debounce mechanism for transcription
let transcriptionInProgress = false;
let lastTranscriptionTime = 0;
const TRANSCRIPTION_DEBOUNCE_MS = 1000; // 1 second minimum between calls

/**
* Transcribes audio blob to text using AWS Transcribe
*/
async function transcribeAudio(audioBlob: Blob): Promise<string | null> {
    // Prevent rapid successive calls
    const now = Date.now();
    if (transcriptionInProgress || (now - lastTranscriptionTime) < TRANSCRIPTION_DEBOUNCE_MS) {
        console.log('Transcription debounced or in progress, skipping');
        return null;
    }

    transcriptionInProgress = true;
    lastTranscriptionTime = now;

    let audioContext: AudioContext | null = null;
    try {
        // Check minimum audio duration
        if (audioBlob.size < 500) { // Less than ~0.5KB, probably too short
            console.log('Audio too short, skipping transcription');
            return "";
        }

        const arrayBuffer = await audioBlob.arrayBuffer();
        audioContext = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        // Check audio duration
        if (audioBuffer.duration < 0.05) { // Less than 50ms
            console.log('Audio duration too short, skipping transcription');
            return "";
        }

        const pcmData = audioBuffer.getChannelData(0);
        const pcmBuffer = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            pcmBuffer[i] = Math.max(-32768, Math.min(32767, pcmData[i] * 32768));
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

        const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: pcmBuffer.buffer,
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Failed to transcribe audio: ${response.statusText}`);
        }

        const { transcript } = await response.json();
        console.log("Transcription result:", transcript);
        return transcript;
    } catch (error: any) {
        if (error.name === 'AbortError') {
            console.log('Transcription request timed out');
        } else {
            console.error('Error transcribing audio:', error);
        }
        return null;
    } finally {
        transcriptionInProgress = false;
        if (audioContext) {
            await audioContext.close();
        }
    }
}

