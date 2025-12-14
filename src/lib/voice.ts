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
* Starts recording audio from the user's microphone
*/
export async function startRecording(): Promise<{
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

    mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
            audioChunks.push(event.data);
        }
    };

    mediaRecorder.start();

    return {
        mediaRecorder,
        stop: async (): Promise<string | null> => {
            return new Promise((resolve) => {
                mediaRecorder.onstop = async () => {
                    stream.getTracks().forEach(track => track.stop());

                    const mimeType = mediaRecorder.mimeType || 'audio/webm';
                    console.log("Recording stopped. MIME type:", mimeType);

                    const audioBlob = new Blob(audioChunks, { type: mimeType });
                    const transcript = await transcribeAudio(audioBlob);
                    resolve(transcript);
                };

                mediaRecorder.stop();
            });
        }
    };
}

/**
* Transcribes audio blob to text using AWS Transcribe
*/
async function transcribeAudio(audioBlob: Blob): Promise<string | null> {
    let audioContext: AudioContext | null = null;
    try {
        const arrayBuffer = await audioBlob.arrayBuffer();
        audioContext = new AudioContext({ sampleRate: 16000 });
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const pcmData = audioBuffer.getChannelData(0);
        const pcmBuffer = new Int16Array(pcmData.length);
        for (let i = 0; i < pcmData.length; i++) {
            pcmBuffer[i] = Math.max(-32768, Math.min(32767, pcmData[i] * 32768));
        }

        const response = await fetch('/api/transcribe', {
            method: 'POST',
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

