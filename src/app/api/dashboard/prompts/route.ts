import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const websiteSlug = searchParams.get('website');

        if (!websiteSlug) {
            return NextResponse.json(
                { error: 'Website slug is required' },
                { status: 400 }
            );
        }

        // Get website
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug }
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        // Get all prompts for this website
        const prompts = await prisma.systemPrompt.findMany({
            where: { website_id: website.id },
            orderBy: [
                { is_active: 'desc' },
                { updated_at: 'desc' }
            ]
        });

        return NextResponse.json({ prompts });
    } catch (error) {
        console.error('Error fetching prompts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch prompts' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { website_slug, name, description, content } = body;

        if (!website_slug || !name || !content) {
            return NextResponse.json(
                { error: 'Website slug, name, and content are required' },
                { status: 400 }
            );
        }

        // Get website
        const website = await prisma.website.findUnique({
            where: { slug: website_slug }
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        // Create new prompt
        const prompt = await prisma.systemPrompt.create({
            data: {
                website_id: website.id,
                name,
                description,
                s3_key: `agent-configs/${website_slug}/prompts/${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-')}.md`,
                s3_bucket: process.env.AWS_S3_BUCKET_NAME || 'hubspot-voice-agent-bucket',
                is_active: false
            }
        });

        return NextResponse.json({ prompt }, { status: 201 });
    } catch (error) {
        console.error('Error creating prompt:', error);
        return NextResponse.json(
            { error: 'Failed to create prompt' },
            { status: 500 }
        );
    }
}
