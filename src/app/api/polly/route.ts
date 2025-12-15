import { NextRequest, NextResponse } from 'next/server';
import { PollyClient, SynthesizeSpeechCommand } from '@aws-sdk/client-polly';

// DISABLE SSL VERIFICATION (DEV ONLY)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const pollyClient = new PollyClient({
    region: process.env.AWS_REGION || 'ap-south-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'AKIAVCN73S4N2BZGLKH2',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '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',
    },
});

export async function POST(request: NextRequest) {
    try {
        const { text } = await request.json();

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        const command = new SynthesizeSpeechCommand({
            Text: text,
            OutputFormat: 'mp3',
            VoiceId: 'Kajal', // Indian English neural voice
            Engine: 'neural',
        });

        const response = await pollyClient.send(command);

        if (!response.AudioStream) {
            return NextResponse.json(
                { error: 'No audio stream received' },
                { status: 500 }
            );
        }

        // Use SDK utility to convert stream to byte array
        const byteArray = await response.AudioStream.transformToByteArray();
        const audioBuffer = Buffer.from(byteArray);

        return new NextResponse(audioBuffer, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
            },
        });
    } catch (error) {
        console.error('Polly error:', error);
        return NextResponse.json(
            { error: 'Failed to synthesize speech', details: (error as Error).message },
            { status: 500 }
        );
    }
}
