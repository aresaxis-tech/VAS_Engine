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

    if (!sample_text || sample_text.trim() === '') {
        if (onComplete) onComplete();
        return;
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
* Starts recording audio from the user's microphone
*/
export async function startRecording(onSilence?: (transcript: string | null) => void): Promise<{
    stop: () => Promise<string | null>;
    mediaRecorder: MediaRecorder;
}> {
    if (typeof window === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Browser API not supported');
    }

    // Voice Activity Detection (VAD) Constants
    const SILENCE_THRESHOLD = 0.1; // Aggressive threshold for noisy environments
    const SILENCE_DURATION_MS = 1000; // Faster auto-stop (1s)
    const MIN_RECORDING_MS = 500; // Reduced min time
    const MAX_RECORDING_MS = 10000; // Max duration safety valve (10s)

    const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
            sampleRate: 16000,
            channelCount: 1,
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true, // Help with varying mic levels
        }
    });

    const mimeTypes = [
        'audio/webm;codecs=opus',
        'audio/mp4',
        'audio/ogg;codecs=opus',
        ''
    ];

    let options: MediaRecorderOptions | undefined = undefined;
    for (const type of mimeTypes) {
        if (type === '' || MediaRecorder.isTypeSupported(type)) {
            if (type !== '') options = { mimeType: type };
            console.log(`[VoiceDebug] Using MIME type: ${type || 'default'}`);
            break;
        }
    }

    const mediaRecorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
    const audioChunks: Blob[] = [];

    // VAD Setup
    const audioContext = new AudioContext();
    const source = audioContext.createMediaStreamSource(stream);
    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);

    const dataArray = new Uint8Array(analyser.frequencyBinCount);
    let silenceStart = performance.now();
    let isSpeaking = false;
    let recordingStartTime = performance.now();
    let vadInterval: number | null = null;
    let isStopped = false; // Guard against double stops

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunks.push(event.data);
    };

    mediaRecorder.start();
    recordingStartTime = performance.now();

    // Stop function wrapper to handle both manual and auto stops
    const stopRecording = async (): Promise<string | null> => {
        if (isStopped) return null; // Already stopped
        isStopped = true;

        if (vadInterval) cancelAnimationFrame(vadInterval);

        return new Promise((resolve) => {
            mediaRecorder.onstop = async () => {
                // Cleanup Audio Context & Stream
                source.disconnect();
                analyser.disconnect();
                await audioContext.close();
                stream.getTracks().forEach(track => track.stop());

                const mimeType = mediaRecorder.mimeType || options?.mimeType || 'audio/webm';
                if (audioChunks.length === 0) {
                    console.warn("[VoiceDebug] No audio data captured");
                    resolve(null);
                    return;
                }

                const audioBlob = new Blob(audioChunks, { type: mimeType });
                console.log(`[VoiceDebug] Stopped. Size: ${audioBlob.size}, Chunks: ${audioChunks.length}`);

                const transcript = await transcribeAudio(audioBlob);
                resolve(transcript);
            };

            if (mediaRecorder.state !== "inactive") {
                mediaRecorder.stop();
            }
        });
    };

    // VAD Loop
    const checkSilence = () => {
        if (isStopped) return;

        analyser.getByteFrequencyData(dataArray);

        // Calculate RMS (Volume)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sum / dataArray.length) / 255; // Normalize to 0-1

        const now = performance.now();


        // Safety Valve: Force stop after MAX_RECORDING_MS
        if (now - recordingStartTime > MAX_RECORDING_MS) {
            console.log(`[VoiceDebug] Max duration exceeded (${MAX_RECORDING_MS}ms). Auto-stopping.`);
            stopRecording().then(transcript => {
                if (onSilence) onSilence(transcript);
            });
            return;
        }

        if (rms > SILENCE_THRESHOLD) {
            silenceStart = now;
            isSpeaking = true;
            console.log(`[VoiceDebug] Speaking (Vol: ${rms.toFixed(3)}) > ${SILENCE_THRESHOLD}`);
        } else {
            console.log(`[VoiceDebug] Silence (Vol: ${rms.toFixed(3)})`);
            if (isSpeaking && (now - silenceStart > SILENCE_DURATION_MS) && (now - recordingStartTime > MIN_RECORDING_MS)) {
                console.log(`[VoiceDebug] Silence detected (${SILENCE_DURATION_MS}ms). Auto-stopping.`);
                stopRecording().then(transcript => {
                    if (onSilence) {
                        console.log("[VoiceDebug] Triggering onSilence callback with:", transcript);
                        onSilence(transcript);
                    }
                });
                return;
            }
        }

        vadInterval = requestAnimationFrame(checkSilence);
    };

    vadInterval = requestAnimationFrame(checkSilence);

    return {
        mediaRecorder,
        stop: stopRecording
    };
}

/**
* Transcribes audio blob to text using AWS Transcribe
*/
async function transcribeAudio(audioBlob: Blob): Promise<string | null> {
    let audioContext: AudioContext | null = null;
    try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        console.log(`[VoiceDebug] AudioBlob ArrayBuffer size: ${arrayBuffer.byteLength}`);

        audioContext = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        console.log(`[VoiceDebug] Decoded AudioBuffer duration: ${audioBuffer.duration}s`);

        const pcmData = audioBuffer.getChannelData(0);
        const pcmBuffer = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            pcmBuffer[i] = Math.max(-32768, Math.min(32767, pcmData[i] * 32768));
        }
        console.log(`[VoiceDebug] PCM Buffer size: ${pcmBuffer.byteLength}`);

        const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/octet-stream',
                'x-sample-rate': '16000'
            },
            body: pcmBuffer.buffer,
        });

        if (!response.ok) {
            throw new Error(`Failed to transcribe audio: ${response.statusText}`);
        }

        const { transcript } = await response.json();
        console.log("Transcription result:", transcript);
        return transcript;
    } catch (error) {
        console.error('Error transcribing audio:', error);
        return null;
    } finally {
        if (audioContext) {
            await audioContext.close();
        }
    }
}

/**
 * Interprets voice input using LLM to translate/normalize to English.
 */
export async function interpretVoice(text: string, context: string = "General"): Promise<string> {
    if (!text || text.trim() === '') return '';

    try {
        console.log(`[Voice] Interpreting: "${text}" with context: "${context}"`);
        const response = await fetch('/api/interpret-intent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, context }),
        });

        if (!response.ok) {
            console.error("Interpretation failed");
            return text; // Fallback to original
        }

        const data = await response.json();
        console.log(`[Voice] Interpreted result: "${data.text}"`);
        return data.text || text;
    } catch (error) {
        console.error("Error interpreting voice:", error);
        return text; // Fallback
    }
}

