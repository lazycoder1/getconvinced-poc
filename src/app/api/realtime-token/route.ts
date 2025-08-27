import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'nodejs';
import { buildCombinedPrompt } from '@/lib/prompt-builder';

async function createEphemeralToken(options?: { website?: string; voice?: string; model?: string }) {
    const website = options?.website || 'hubspot';
    const voice = options?.voice || 'alloy';
    const model = options?.model || 'gpt-4o-realtime-preview-2025-06-03';

    // Build server-side instructions. Never expose them to the client.
    let instructions = process.env.REALTIME_SYSTEM_PROMPT_DEFAULT || '# Default Agent Instructions\n\nYou are an AI assistant.';
    try {
        instructions = await buildCombinedPrompt(website);
    } catch (e) {
        console.warn('Falling back to default instructions for website:', website, e);
    }
    try {
        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model,
                voice,
                instructions,
                modalities: ['text', 'audio'],
                turn_detection: {
                    type: 'server_vad',
                    threshold: 0.5,
                    prefix_padding_ms: 300,
                    silence_duration_ms: 600
                },
                input_audio_format: 'pcm16',
                output_audio_format: 'pcm16'
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Failed to create session: ${response.status} ${response.statusText}`, errorBody);
            throw new Error(`Failed to create session: ${response.statusText}`);
        }

        const sessionData = await response.json();
        return sessionData.client_secret;

    } catch (error: any) {
        console.error('Error creating ephemeral token:', error);
        throw error;
    }
}

export async function GET(request: NextRequest) {
    try {
        const website = request.nextUrl.searchParams.get('website') || undefined;
        const client_secret = await createEphemeralToken({ website });
        return NextResponse.json({ client_secret });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create ephemeral token' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        let website: string | undefined = undefined;
        try {
            const body = await request.json();
            website = body?.website || undefined;
        } catch { }
        const client_secret = await createEphemeralToken({ website });
        return NextResponse.json({ client_secret });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create ephemeral token' },
            { status: 500 }
        );
    }
}