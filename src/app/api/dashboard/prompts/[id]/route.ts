import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const promptId = resolvedParams.id;

        const prompt = await prisma.systemPrompt.findUnique({
            where: { id: promptId },
            include: { website: true }
        });

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt not found' },
                { status: 404 }
            );
        }

        return NextResponse.json({ prompt });
    } catch (error) {
        console.error('Error fetching prompt:', error);
        return NextResponse.json(
            { error: 'Failed to fetch prompt' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const promptId = resolvedParams.id;
        const body = await request.json();
        const { name, description, content, is_active } = body;

        // If activating this prompt, deactivate all others for this website
        if (is_active) {
            const currentPrompt = await prisma.systemPrompt.findUnique({
                where: { id: promptId },
                include: { website: true }
            });

            if (currentPrompt) {
                await prisma.systemPrompt.updateMany({
                    where: { website_id: currentPrompt.website_id },
                    data: { is_active: false }
                });
            }
        }

        // For now, we'll update metadata only - content is stored in S3
        const updateData: any = {
            name,
            description,
            is_active,
            updated_at: new Date()
        };

        const prompt = await prisma.systemPrompt.update({
            where: { id: promptId },
            data: updateData,
            include: { website: true }
        });

        return NextResponse.json({ prompt });
    } catch (error) {
        console.error('Error updating prompt:', error);
        return NextResponse.json(
            { error: 'Failed to update prompt' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const resolvedParams = await params;
        const promptId = resolvedParams.id;

        await prisma.systemPrompt.delete({
            where: { id: promptId }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting prompt:', error);
        return NextResponse.json(
            { error: 'Failed to delete prompt' },
            { status: 500 }
        );
    }
}
