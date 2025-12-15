import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });

export async function POST(request: NextRequest) {
    try {
        const { text, context } = await request.json();

        if (!text) {
            return NextResponse.json({ error: 'Text is required' }, { status: 400 });
        }

        const prompt = `
        You are a smart voice assistant for an insurance application in India.
        The user may speak in English, Hindi, or Hinglish.
        
        Your task:
        1. Access the user's raw input: "${text}"
        2. Context/Field expected: "${context || 'General'}"
        3. Translate the input to English if it is in Hindi/Hinglish.
        4. Normalize the output to match standard options if applicable.
        
        Examples:
        - Input: "Meri dukaan kapde ki hai" (Context: Industry) -> Output: "Retail" (or "Textile")
        - Input: "Haan confirm kar do" (Context: Confirmation) -> Output: "Confirm"
        - Input: "Nayi shop hai" (Context: Customer Type) -> Output: "New"
        - Input: "Existing" (Context: Customer Type) -> Output: "Existing"

        Return ONLY the raw translated/normalized text string. No JSON, no quotes.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const interpretedText = response.text().trim();

        console.log(`[Interpret] Input: "${text}" | Context: "${context}" | Output: "${interpretedText}"`);

        return NextResponse.json({ text: interpretedText });

    } catch (error) {
        console.error('Interpretation error:', error);
        return NextResponse.json({ error: 'Failed to interpret text' }, { status: 500 });
    }
}
