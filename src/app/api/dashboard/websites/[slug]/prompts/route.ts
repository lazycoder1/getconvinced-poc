import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;

        // First get the website
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug }
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        // Get prompts for this website
        const prompts = await prisma.systemPrompt.findMany({
            where: {
                website_id: website.id,
                is_active: true
            },
            orderBy: {
                created_at: 'desc'
            }
        });

        // Generate signed URLs for each prompt and get content
        const promptsWithContent = await Promise.all(
            prompts.map(async (prompt) => {
                let content = '';

                try {
                    // Get the content from S3
                    const command = new GetObjectCommand({
                        Bucket: prompt.s3_bucket,
                        Key: prompt.s3_key,
                    });

                    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 });

                    // Fetch the content
                    const response = await fetch(signedUrl);
                    if (response.ok) {
                        content = await response.text();
                    }
                } catch (error) {
                    console.error('Error fetching prompt content from S3:', error);
                }

                return {
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
                };
            })
        );

        return NextResponse.json(promptsWithContent);
    } catch (error) {
        console.error('Error fetching prompts:', error);
        return NextResponse.json(
            { error: 'Failed to fetch prompts' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;
        const body = await request.json();
        const { name, description, content } = body;

        // First get the website
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug }
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        // Upload content to S3 (for now, we'll store it in database, but in production should be S3)
        const s3Key = `agent-configs/${websiteSlug}/prompts/${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-')}.md`;
        const s3Bucket = process.env.AWS_S3_BUCKET_NAME || 'hubspot-voice-agent-bucket';

        // Create the prompt in database
        const prompt = await prisma.systemPrompt.create({
            data: {
                website_id: website.id,
                name,
                description,
                s3_key: s3Key,
                s3_bucket: s3Bucket,
                is_active: false, // New prompts start as inactive
            }
        });

        // In a real implementation, you'd upload the content to S3 here
        // For now, we'll just create the database record

        return NextResponse.json(prompt, { status: 201 });
    } catch (error) {
        console.error('Error creating prompt:', error);
        return NextResponse.json(
            { error: 'Failed to create prompt' },
            { status: 500 }
        );
    }
}
