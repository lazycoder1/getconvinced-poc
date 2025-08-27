import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { DEFAULT_S3_BUCKET } from '@/lib/s3';

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
                website_id: website.id
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
                        console.log(`Content fetched from S3 for prompt ${prompt.id}: ${content.length} characters`);
                    } else {
                        console.error(`Failed to fetch content from S3 for prompt ${prompt.id}: ${response.status}`);
                    }
                } catch (error) {
                    console.error(`Error fetching prompt content from S3 for prompt ${prompt.id}:`, error);
                }

                return {
                    id: prompt.id,
                    name: prompt.name,
                    description: prompt.description,
                    content: content || `# ${prompt.name}\n\nDefault content for ${prompt.name}. Please edit this prompt to customize it for your needs.`,
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

        // Upload content to S3
        const s3Key = `agent-configs/${websiteSlug}/prompts/${Date.now()}-${name.toLowerCase().replace(/\s+/g, '-')}.md`;
        const s3Bucket = DEFAULT_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || 'hubspot-voice-agent-bucket';

        // Upload content to S3
        console.log('Uploading to S3:', { s3Bucket, s3Key, contentLength: content.length });

        const uploadCommand = new PutObjectCommand({
            Bucket: s3Bucket,
            Key: s3Key,
            Body: content,
            ContentType: 'text/markdown',
        });

        try {
            await s3Client.send(uploadCommand);
            console.log('S3 upload successful');
        } catch (s3Error) {
            console.error('S3 upload failed:', s3Error);
            throw s3Error;
        }

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

        return NextResponse.json(prompt, { status: 201 });
    } catch (error) {
        console.error('Error creating prompt:', error);
        return NextResponse.json(
            { error: 'Failed to create prompt' },
            { status: 500 }
        );
    }
}
