import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export const runtime = 'nodejs';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    },
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;

        // Validate website exists
        const website = await prisma.website.findUnique({ where: { slug: websiteSlug } });
        if (!website) {
            return NextResponse.json({ error: 'Website not found' }, { status: 404 });
        }

        const bucket = process.env.AWS_S3_BUCKET || 'get-convinced';
        const region = process.env.AWS_REGION || 'us-east-1';
        const hasCreds = !!(process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY);
        if (!bucket || !hasCreds) {
            return NextResponse.json({
                error: 'Missing AWS configuration',
                details: {
                    bucket: !!bucket,
                    region,
                    hasCreds
                }
            }, { status: 500 });
        }

        const body = await request.json();
        const files = Array.isArray(body?.files) ? body.files as Array<{ name: string; type: string }> : [];
        if (files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400 });
        }

        const sanitizeHeaderValue = (value: string, fallback: string = ""): string => {
            try {
                const str = (value ?? fallback).toString();
                return str.replace(/[^\x20-\x7E]/g, "").slice(0, 200);
            } catch {
                return fallback;
            }
        };

        const uploads = await Promise.all(files.map(async (f) => {
            const timestamp = Date.now();
            const randomId = Math.random().toString(36).substring(2, 8);
            const extension = (f.name?.split('.')?.pop() || 'png').toLowerCase();
            const filename = `${timestamp}_${randomId}.${extension}`;
            const key = `agent-configs/${websiteSlug}/screenshots/${filename}`;

            const command = new PutObjectCommand({
                Bucket: bucket,
                Key: key,
                ContentType: f.type || 'application/octet-stream',
                Metadata: {
                    originalName: sanitizeHeaderValue(f.name || filename, filename),
                    uploadedBy: 'dashboard-client'
                }
            });

            const url = await getSignedUrl(s3Client, command, { expiresIn: 600 });
            return { filename, key, url, contentType: f.type || 'application/octet-stream' };
        }));

        return NextResponse.json({ uploads, bucket, region });
    } catch (error: any) {
        console.error('Error creating presigned uploads:', error);
        return NextResponse.json({ error: 'Failed to create presigned uploads' }, { status: 500 });
    }
}


