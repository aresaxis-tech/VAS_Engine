import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
    try {
        const { text, context } = await request.json();

        if (!text) {
            return NextResponse.json(
                { error: 'Text is required' },
                { status: 400 }
            );
        }

        const intent = detectIntent(text.toLowerCase(), context);

        return NextResponse.json({ intent });
    } catch (error) {
        console.error('Intent detection error:', error);
        return NextResponse.json(
            { error: 'Failed to detect intent' },
            { status: 500 }
        );
    }
}

function detectIntent(text: string, context: string) {
    console.log('Detecting intent for context:', context, 'text:', text);

    // Customer Type Detection - Only look for customer type keywords
    if (context === 'CUSTOMER_TYPE') {
        // Check for existing customer patterns first
        if (text.includes('existing') || text.includes('existing customer') || text.includes('old customer') || text.includes('current customer') ||
            text.includes('have policy') || text.includes('old') || text.includes('current')) {
            return { action: 'select', option: 'existing' };
        }
        // Check for new customer patterns
        if (text.includes('new customer') || text.includes('first time') || text.includes('never had') ||
            text.includes('no policy') || text.includes('new')) {
            return { action: 'select', option: 'new' };
        }
    }

    // Verification Method Detection
    if (context === 'VERIFICATION_METHOD') {
        // Check mobile patterns first (more specific)
        if (text.includes('mobile number') || text.includes('mobile') || text.includes('phone') || text.includes('sms') || text.includes('otp')) {
            return { action: 'select', option: 'mobile' };
        }
        // Check policy patterns (less specific)
        if (text.includes('policy number') || text.includes('policy') || text.includes('document')) {
            return { action: 'select', option: 'policy' };
        }
    }

    // Industry Detection - Only when context is INDUSTRY
    if (context === 'INDUSTRY') {
        const industries = {
            'retail': [
                'retail', 'manufacturing', 'retail and manufacturing', 'shop', 'store', 'ecommerce', 'e-commerce', 'online', 'selling',
                'shopping', 'commerce', 'marketplace', 'sales', 'merchant', 'vendor', 'trade', 'business'
            ],
            'healthcare': [
                'healthcare', 'hospital', 'medical', 'clinic', 'pharmacy', 'health',
                'pharma', 'parma', 'farma', 'pharmaceutical', 'medicine', 'doctor', 'patient', 'treatment'
            ],
            'manufacturing': [
                'manufacturing', 'factory', 'production', 'industrial', 'assembly', 'fabrication', 'processing'
            ],
            'it': [
                'it', 'information technology', 'software', 'tech', 'technology', 'computer', 'digital', 'programming'
            ]
        };

        // Find the best match based on keyword frequency
        let bestMatch = null;
        let maxMatches = 0;

        for (const [industry, keywords] of Object.entries(industries)) {
            const matches = keywords.filter(keyword => text.includes(keyword)).length;
            if (matches > maxMatches) {
                maxMatches = matches;
                bestMatch = industry;
            }
        }

        if (bestMatch && maxMatches > 0) {
            return { action: 'select', option: bestMatch };
        }
    }

    // General confirmation detection
    if (text.includes('yes') || text.includes('correct') || text.includes('right') || text.includes('confirm')) {
        return { action: 'confirm' };
    }

    if (text.includes('no') || text.includes('wrong') || text.includes('incorrect') || text.includes('back')) {
        return { action: 'back' };
    }

    // Check for navigation commands
    if (text.includes('back') || text.includes('previous') || text.includes('return')) {
        return { action: 'back' };
    }

    if (text.includes('next') || text.includes('continue') || text.includes('proceed')) {
        return { action: 'next' };
    }

    // Default - no clear intent detected
    console.log('No clear intent detected for context:', context, 'text:', text);
    return { action: 'unclear', text };
}