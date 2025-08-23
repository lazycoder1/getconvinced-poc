import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;
        const promptId = resolvedParams.id;

        // First verify the prompt belongs to the website
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug }
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        const prompt = await prisma.systemPrompt.findFirst({
            where: {
                id: promptId,
                website_id: website.id
            }
        });

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt not found' },
                { status: 404 }
            );
        }

        // Get content from S3
        let content = '';
        try {
            const command = new GetObjectCommand({
                Bucket: prompt.s3_bucket,
                Key: prompt.s3_key,
            });

            const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });
            const response = await fetch(signedUrl);

            if (response.ok) {
                content = await response.text();
            }
        } catch (error) {
            console.error('Error fetching prompt content from S3:', error);
        }

        return NextResponse.json({
            id: prompt.id,
            name: prompt.name,
            description: prompt.description,
            content,
            s3_key: prompt.s3_key,
            s3_bucket: prompt.s3_bucket,
            is_active: prompt.is_active,
            version: prompt.version,
            created_at: prompt.created_at.toISOString(),
            updated_at: prompt.updated_at.toISOString(),
        });
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
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;
        const promptId = resolvedParams.id;
        const body = await request.json();
        const { name, description, content, is_active } = body;

        // First verify the prompt belongs to the website
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug }
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        const prompt = await prisma.systemPrompt.findFirst({
            where: {
                id: promptId,
                website_id: website.id
            }
        });

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt not found' },
                { status: 404 }
            );
        }

        // If activating this prompt, deactivate all others for this website
        if (is_active) {
            await prisma.systemPrompt.updateMany({
                where: { website_id: website.id },
                data: { is_active: false }
            });
        }

        // Update the prompt metadata
        const updatedPrompt = await prisma.systemPrompt.update({
            where: { id: promptId },
            data: {
                name,
                description,
                is_active,
                updated_at: new Date()
            }
        });

        // Update content in S3 if provided
        if (content) {
            try {
                const command = new PutObjectCommand({
                    Bucket: prompt.s3_bucket,
                    Key: prompt.s3_key,
                    Body: content,
                    ContentType: 'text/markdown'
                });

                await s3Client.send(command);
            } catch (error) {
                console.error('Error updating prompt content in S3:', error);
                // Continue anyway - metadata was updated successfully
            }
        }

        // Get the updated content from S3 to return it
        let updatedContent = content;
        if (content) {
            try {
                const getCommand = new GetObjectCommand({
                    Bucket: updatedPrompt.s3_bucket,
                    Key: updatedPrompt.s3_key,
                });
                const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });
                const response = await fetch(signedUrl);
                if (response.ok) {
                    updatedContent = await response.text();
                }
            } catch (error) {
                console.error('Error fetching updated content from S3:', error);
            }
        }

        return NextResponse.json({
            prompt: {
                id: updatedPrompt.id,
                name: updatedPrompt.name,
                description: updatedPrompt.description,
                content: updatedContent,
                is_active: updatedPrompt.is_active,
                updated_at: updatedPrompt.updated_at.toISOString(),
                created_at: updatedPrompt.created_at.toISOString(),
                s3_key: updatedPrompt.s3_key,
                s3_bucket: updatedPrompt.s3_bucket,
                version: updatedPrompt.version,
            }
        });
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
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;
        const promptId = resolvedParams.id;

        // First verify the prompt belongs to the website
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug }
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        const prompt = await prisma.systemPrompt.findFirst({
            where: {
                id: promptId,
                website_id: website.id
            }
        });

        if (!prompt) {
            return NextResponse.json(
                { error: 'Prompt not found' },
                { status: 404 }
            );
        }

        // Soft delete by setting is_active to false
        await prisma.systemPrompt.update({
            where: { id: promptId },
            data: {
                is_active: false,
                updated_at: new Date()
            }
        });

        return NextResponse.json({ message: 'Prompt deleted successfully' });
    } catch (error) {
        console.error('Error deleting prompt:', error);
        return NextResponse.json(
            { error: 'Failed to delete prompt' },
            { status: 500 }
        );
    }
}
