import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;

        if (!websiteSlug) {
            return NextResponse.json(
                { error: 'Website slug is required' },
                { status: 400 }
            );
        }

        const website = await prisma.website.findUnique({
            where: { slug: websiteSlug },
        });

        if (!website) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        // Counts with filtering
        const [screenshotCount, promptCount] = await Promise.all([
            prisma.screenshot.count({ where: { website_id: website.id, is_active: true } }),
            prisma.systemPrompt.count({ where: { website_id: website.id, is_active: true } }),
        ]);

        const transformedWebsite = {
            id: website.id,
            name: website.name,
            slug: website.slug,
            description: website.description,
            screenshotCount,
            promptCount,
            lastUpdated: website.updated_at.toISOString(),
            status: website.is_active ? 'active' : 'inactive',
            created_at: website.created_at.toISOString()
        };

        return NextResponse.json(transformedWebsite);
    } catch (error) {
        console.error('Error fetching website:', error);
        return NextResponse.json(
            { error: 'Failed to fetch website' },
            { status: 500 }
        );
    }
}

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;
        const body = await request.json();
        const { name, description, is_active } = body;

        const website = await prisma.website.update({
            where: { slug: websiteSlug },
            data: {
                name,
                description,
                is_active,
                updated_at: new Date()
            },
            include: {
                _count: {
                    select: {
                        screenshots: true,
                        system_prompts: true
                    }
                }
            }
        });

        const transformedWebsite = {
            id: website.id,
            name: website.name,
            slug: website.slug,
            description: website.description,
            screenshotCount: website._count.screenshots,
            promptCount: website._count.system_prompts,
            lastUpdated: website.updated_at.toISOString(),
            status: website.is_active ? 'active' : 'inactive',
            created_at: website.created_at.toISOString()
        };

        return NextResponse.json(transformedWebsite);
    } catch (error) {
        console.error('Error updating website:', error);
        return NextResponse.json(
            { error: 'Failed to update website' },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ slug: string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams.slug;

        await prisma.website.delete({
            where: { slug: websiteSlug }
        });

        return NextResponse.json({ message: 'Website deleted successfully' });
    } catch (error) {
        console.error('Error deleting website:', error);
        return NextResponse.json(
            { error: 'Failed to delete website' },
            { status: 500 }
        );
    }
}
