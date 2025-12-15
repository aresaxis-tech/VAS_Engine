import { NextRequest, NextResponse } from 'next/server';
import {
    TranscribeStreamingClient,
    StartStreamTranscriptionCommand,
} from '@aws-sdk/client-transcribe-streaming';

// DISABLE SSL VERIFICATION (DEV ONLY)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const transcribeClient = new TranscribeStreamingClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIAVCN73S4N2BZGLKH2',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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',
    },
});

export async function POST(request: NextRequest) {
    try {
        const audioData = await request.arrayBuffer();
        console.log(`[TranscribeAPI] Received Audio Data size: ${audioData.byteLength}`);

        if (!audioData || audioData.byteLength === 0) {
            console.error('[TranscribeAPI] Error: Empty audio data received');
            return NextResponse.json(
                { error: 'No audio data provided' },
                { status: 400 }
            );
        }

        async function* audioStream() {
            const chunkSize = 1024 * 8;
            const buffer = Buffer.from(audioData);

            for (let i = 0; i < buffer.length; i += chunkSize) {
                const chunk = buffer.slice(i, Math.min(i + chunkSize, buffer.length));
                yield { AudioEvent: { AudioChunk: chunk } };
            }
        }

        const command = new StartStreamTranscriptionCommand({
            IdentifyLanguage: true,
            LanguageOptions: 'en-IN,hi-IN',
            MediaEncoding: 'pcm',
            MediaSampleRateHertz: 16000,
            AudioStream: audioStream(),
        });

        const response = await transcribeClient.send(command);

        let transcript = '';

        if (response.TranscriptResultStream) {
            for await (const event of response.TranscriptResultStream) {
                if (event.TranscriptEvent?.Transcript?.Results) {
                    for (const result of event.TranscriptEvent.Transcript.Results) {
                        if (result.Alternatives && result.Alternatives.length > 0) {
                            const alternative = result.Alternatives[0];
                            if (alternative.Transcript && !result.IsPartial) {
                                transcript += alternative.Transcript + ' ';
                            }
                        }
                    }
                }
            }
        }

        return NextResponse.json({
            transcript: transcript.trim()
        });

    } catch (error) {
        console.error('Transcribe error:', error);
        return NextResponse.json(
            { error: 'Failed to transcribe audio' },
            { status: 500 }
        );
    }
}

