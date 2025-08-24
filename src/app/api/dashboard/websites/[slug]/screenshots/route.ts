import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';

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

        // Get screenshots for this website
        const screenshots = await prisma.screenshot.findMany({
            where: {
                website_id: website.id,
                is_active: true
            },
            orderBy: {
                sort_order: 'asc'
            }
        });

        // Generate signed URLs for each screenshot
        const screenshotsWithUrls = await Promise.all(
            screenshots.map(async (screenshot) => {
                let s3_url = screenshot.s3_key; // fallback to key

                try {
                    // Generate a signed URL for S3 access
                    const command = new GetObjectCommand({
                        Bucket: screenshot.s3_bucket,
                        Key: screenshot.s3_key,
                    });

                    s3_url = await getSignedUrl(s3Client, command, { expiresIn: 3600 }); // 1 hour expiry
                } catch (error) {
                    console.error('Error generating signed URL for screenshot:', error);
                }

                return {
                    id: screenshot.id,
                    filename: screenshot.filename,
                    s3_key: screenshot.s3_key,
                    s3_url,
                    description: screenshot.description,
                    annotation: screenshot.annotation,
                    sort_order: screenshot.sort_order,
                    is_default: screenshot.is_default,
                    width: screenshot.width,
                    height: screenshot.height,
                    created_at: screenshot.created_at.toISOString(),
                };
            })
        );

        return NextResponse.json(screenshotsWithUrls);
    } catch (error) {
        console.error('Error fetching screenshots:', error);
        return NextResponse.json(
            { error: 'Failed to fetch screenshots' },
            { status: 500 }
        );
    }
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        // Helper to sanitize metadata values to printable ASCII (HTTP header safe)
        const sanitizeHeaderValue = (value: string, fallback: string = ""): string => {
            try {
                const str = (value ?? fallback).toString();
                // Keep printable ASCII 0x20-0x7E; drop others and trim length
                return str.replace(/[^\x20-\x7E]/g, "").slice(0, 200);
            } catch {
                return fallback;
            }
        };
        // Early config validation for clearer errors
        const hasCreds = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
        const bucket = process.env.AWS_S3_BUCKET || 'get-convinced';
        if (!hasCreds || !bucket) {
            console.error('AWS configuration missing', {
                hasCreds,
                bucketPresent: !!bucket,
                region: process.env.AWS_REGION,
            });
            return NextResponse.json(
                { error: 'Server misconfigured for uploads', details: { hasCreds, bucket: !!bucket } },
                { status: 500 }
            );
        }
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;

        // Get the website
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug }
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        // Parse the multipart form data
        const formData = await request.formData();
        const files = formData.getAll('files') as File[];

        if (!files || files.length === 0) {
            return NextResponse.json(
                { error: 'No files provided' },
                { status: 400 }
            );
        }

        const uploadedScreenshots = [];

        for (const file of files) {
            if (!file.type.startsWith('image/')) {
                continue; // Skip non-image files
            }

            // Generate unique filename
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 8);
            const extension = file.name.split('.').pop() || 'png';
            const filename = `${timestamp}_${randomId}.${extension}`;
            const s3Key = `agent-configs/${websiteSlug}/screenshots/${filename}`;

            // Upload to S3
            const fileBuffer = Buffer.from(await file.arrayBuffer());
            const uploadCommand = new PutObjectCommand({
                Bucket: bucket,
                Key: s3Key,
                Body: fileBuffer,
                ContentType: file.type,
                Metadata: {
                    originalName: sanitizeHeaderValue(file.name, filename),
                    uploadedBy: 'dashboard'
                }
            });

            await s3Client.send(uploadCommand);

            // Get the next sort order
            const maxSortOrder = await prisma.screenshot.findFirst({
                where: { website_id: website.id },
                orderBy: { sort_order: 'desc' },
                select: { sort_order: true }
            });

            const nextSortOrder = (maxSortOrder?.sort_order || 0) + 1;

            // Save to database
            const screenshot = await prisma.screenshot.create({
                data: {
                    website_id: website.id,
                    filename: filename,
                    s3_key: s3Key,
                    s3_bucket: bucket,
                    file_size_bytes: file.size,
                    description: file.name,
                    sort_order: nextSortOrder
                }
            });

            uploadedScreenshots.push({
                id: screenshot.id,
                filename: screenshot.filename,
                description: screenshot.description
            });
        }

        return NextResponse.json({
            message: `Successfully uploaded ${uploadedScreenshots.length} screenshots`,
            screenshots: uploadedScreenshots
        });

    } catch (error) {
        console.error('Error uploading screenshots:', error);
        return NextResponse.json(
            { error: 'Failed to upload screenshots' },
            { status: 500 }
        );
    }
}
