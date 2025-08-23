import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/database';

export async function GET(request: NextRequest) {
    try {
        const websites = await prisma.website.findMany({
            orderBy: {
                created_at: 'desc'
            }
        });

        // Compute counts with proper filtering (only active records)
        const transformedWebsites = await Promise.all(
            websites.map(async (website) => {
                const [screenshotCount, promptCount] = await Promise.all([
                    prisma.screenshot.count({
                        where: { website_id: website.id, is_active: true },
                    }),
                    prisma.systemPrompt.count({
                        where: { website_id: website.id, is_active: true },
                    }),
                ]);

                return {
                    id: website.id,
                    name: website.name,
                    slug: website.slug,
                    description: website.description,
                    screenshotCount,
                    promptCount,
                    lastUpdated: website.updated_at.toISOString(),
                    status: website.is_active ? 'active' : 'inactive',
                    created_at: website.created_at.toISOString(),
                };
            })
        );

        return NextResponse.json(transformedWebsites);
    } catch (error) {
        console.error('Error fetching websites:', error);
        return NextResponse.json(
            { error: 'Failed to fetch websites' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { name, slug, description } = body;

        // Validate required fields
        if (!name || !slug) {
            return NextResponse.json(
                { error: 'Name and slug are required' },
                { status: 400 }
            );
        }

        // Check if slug already exists
        const existingWebsite = await prisma.website.findUnique({
            where: { slug }
        });

        if (existingWebsite) {
            return NextResponse.json(
                { error: 'Website with this slug already exists' },
                { status: 409 }
            );
        }

        const website = await prisma.website.create({
            data: {
                name,
                slug,
                description,
                is_active: true
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

        return NextResponse.json(transformedWebsite, { status: 201 });
    } catch (error) {
        console.error('Error creating website:', error);
        return NextResponse.json(
            { error: 'Failed to create website' },
            { status: 500 }
        );
    }
}
