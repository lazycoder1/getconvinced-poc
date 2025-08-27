import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
});

export { s3Client };

// Unified default bucket fallback to avoid env name drift
export const DEFAULT_S3_BUCKET = process.env.AWS_S3_BUCKET || process.env.AWS_S3_BUCKET_NAME || '';

export async function uploadToS3(buffer: Buffer, key: string, contentType?: string, bucket?: string): Promise<string> {
    const command = new PutObjectCommand({
        Bucket: bucket || DEFAULT_S3_BUCKET!,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });

    await s3Client.send(command);
    return key;
}

export async function getSignedS3Url(key: string, expiresIn: number = 3600, bucket?: string): Promise<string> {
    const command = new GetObjectCommand({
        Bucket: bucket || DEFAULT_S3_BUCKET!,
        Key: key,
    });

    return await getSignedUrl(s3Client, command, { expiresIn });
}

export async function deleteFromS3(key: string, bucket?: string): Promise<void> {
    const command = new DeleteObjectCommand({
        Bucket: bucket || DEFAULT_S3_BUCKET!,
        Key: key,
    });

    await s3Client.send(command);
}

export function generateS3Key(websiteSlug: string, type: 'screenshot' | 'prompt', filename: string): string {
    return `agent-configs/${websiteSlug}/${type}s/${filename}`;
}
