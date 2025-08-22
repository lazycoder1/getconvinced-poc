import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string; id: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;
        const screenshotId = resolvedParams.id;
        const body = await request.json();
        const { annotation, is_default } = body;

        // First verify the screenshot belongs to the website
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug }
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        const screenshot = await prisma.screenshot.findFirst({
            where: {
                id: screenshotId,
                website_id: website.id
            }
        });

        if (!screenshot) {
            return NextResponse.json(
                { error: 'Screenshot not found' },
                { status: 404 }
            );
        }

        // Handle default screenshot logic
        let updateData: any = {
            updated_at: new Date()
        };

        // If annotation is provided, update it
        if (annotation !== undefined) {
            updateData.annotation = annotation;
        }

        // Handle setting/unsetting default screenshot
        if (is_default !== undefined) {
            if (is_default) {
                // Setting as default: first unset any existing default for this website
                await prisma.screenshot.updateMany({
                    where: {
                        website_id: website.id,
                        is_default: true
                    },
                    data: {
                        is_default: false,
                        updated_at: new Date()
                    }
                });
                updateData.is_default = true;
            } else {
                // Unsetting as default
                updateData.is_default = false;
            }
        }

        // Update the screenshot
        const updatedScreenshot = await prisma.screenshot.update({
            where: { id: screenshotId },
            data: updateData
        });

        return NextResponse.json({
            id: updatedScreenshot.id,
            annotation: updatedScreenshot.annotation,
            is_default: updatedScreenshot.is_default,
            updated_at: updatedScreenshot.updated_at.toISOString()
        });
    } catch (error) {
        console.error('Error updating screenshot:', error);
        return NextResponse.json(
            { error: 'Failed to update screenshot' },
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
        const screenshotId = resolvedParams.id;

        // First verify the screenshot belongs to the website
        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug }
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        const screenshot = await prisma.screenshot.findFirst({
            where: {
                id: screenshotId,
                website_id: website.id
            }
        });

        if (!screenshot) {
            return NextResponse.json(
                { error: 'Screenshot not found' },
                { status: 404 }
            );
        }

        // Soft delete by setting is_active to false
        await prisma.screenshot.update({
            where: { id: screenshotId },
            data: {
                is_active: false,
                updated_at: new Date()
            }
        });

        return NextResponse.json({ message: 'Screenshot deleted successfully' });
    } catch (error) {
        console.error('Error deleting screenshot:', error);
        return NextResponse.json(
            { error: 'Failed to delete screenshot' },
            { status: 500 }
        );
    }
}
