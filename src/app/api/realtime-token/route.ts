import { NextResponse } from 'next/server';

async function createEphemeralToken() {
    try {
        const response = await fetch('https://api.openai.com/v1/realtime/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4o-realtime-preview-2025-06-03',
                voice: 'alloy'
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

export async function GET() {
    try {
        const client_secret = await createEphemeralToken();
        return NextResponse.json({ client_secret });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create ephemeral token' },
            { status: 500 }
        );
    }
}

export async function POST() {
    try {
        const client_secret = await createEphemeralToken();
        return NextResponse.json({ client_secret });
    } catch (error) {
        return NextResponse.json(
            { error: 'Failed to create ephemeral token' },
            { status: 500 }
        );
    }
}