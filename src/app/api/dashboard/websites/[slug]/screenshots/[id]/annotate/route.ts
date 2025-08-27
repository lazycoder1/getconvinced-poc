import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getSignedS3Url } from '@/lib/s3';
import OpenAI from 'openai';

const DEFAULT_PROMPT =
    "These screenshots will be used for demo'ing the hubspot website by a pre-sales agent. Describe the page in a fashion that the agent can understand and use it appropriately, also mention at what stage of the sales process/feature is the page is relevant. Please stick to 3 lines max.";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;
        const screenshotId = resolvedParams.id;

        const body = await request.json().catch(() => ({}));
        const userPrompt: string | undefined = body?.prompt;

        if (!process.env.OPENAI_API_KEY) {
            return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
        }

        // Validate website and screenshot
        const website = await prisma.website.findUnique({ where: { slug: websiteSlug } });
        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }

        const screenshot = await prisma.screenshot.findFirst({
            where: { id: screenshotId, website_id: website.id, is_active: true },
        });
        if (!screenshot) {
            return NextResponse.json({ error: 'Screenshot not found' }, { status: 404 });
        }

        // Get a signed URL for the image from the correct bucket
        const imageUrl = await getSignedS3Url(screenshot.s3_key, 900, screenshot.s3_bucket);

        const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        // Use a low-cost multimodal model
        const model = 'gpt-4o-mini';

        // Call Chat Completions with image input
        const completion = await openai.chat.completions.create({
            model,
            messages: [
                { role: 'system', content: 'You are a concise UI explainer. Always answer in at most 3 short lines.' },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: userPrompt || DEFAULT_PROMPT } as any,
                        { type: 'image_url', image_url: { url: imageUrl } } as any,
                    ] as any,
                },
            ],
            temperature: 0.4,
            max_tokens: 160,
        } as any);

        const annotation = (completion.choices?.[0]?.message?.content || '').toString().trim();
        const trimmed = annotation
            .split('\n')
            .map((l) => l.trim())
            .filter(Boolean)
            .slice(0, 3)
            .join('\n');

        // Persist annotation
        const updated = await prisma.screenshot.update({
            where: { id: screenshot.id },
            data: { annotation: trimmed, updated_at: new Date() },
            select: { id: true, annotation: true },
        });

        return NextResponse.json({ id: updated.id, annotation: updated.annotation });
    } catch (error) {
        console.error('Error auto-annotating screenshot:', error);
        return NextResponse.json({ error: 'Failed to annotate screenshot' }, { status: 500 });
    }
}


