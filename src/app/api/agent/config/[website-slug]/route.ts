import { NextRequest, NextResponse } from 'next/server';
import { getWebsiteConfig, buildCombinedPrompt } from '@/lib/prompt-builder';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ 'website-slug': string }> }
) {
    try {
        const resolvedParams = await params;
        const websiteSlug = resolvedParams['website-slug'];

        if (!websiteSlug) {
            return NextResponse.json(
                { error: 'Website slug is required' },
                { status: 400 }
            );
        }

        // Get website configuration
        const config = await getWebsiteConfig(websiteSlug);

        if (!config) {
            return NextResponse.json(
                { error: 'Website not found' },
                { status: 404 }
            );
        }

        // Build the combined prompt with fallback
        let combinedPrompt = '# Default Agent Instructions\n\nYou are an AI assistant that helps users navigate and understand software applications. You have access to screenshots and specific instructions for each application you support.\n\n## General Guidelines\n- Always reference the screenshots provided to you when explaining features\n- Be patient and explain concepts clearly\n- Provide step-by-step guidance\n- Ask for clarification when needed\n- Use the application\'s terminology appropriately\n\n## Screenshot Usage\n- Screenshots are provided to help you understand the current interface\n- Reference specific elements in screenshots when guiding users\n- Use visual cues from screenshots to explain where to click or what to look for\n\n## Communication Style\n- Professional but friendly\n- Clear and concise\n- Visual when possible\n- Action-oriented guidance\n\nRemember to reference the screenshots provided to help users visually navigate the interface.';

        try {
            combinedPrompt = await buildCombinedPrompt(websiteSlug);
        } catch (error) {
            console.warn('Failed to build combined prompt, using fallback:', error);

            // Try to load the system prompt content directly from S3
            if (config.system_prompt?.s3_key) {
                try {
                    const { loadPromptFromS3 } = await import('@/lib/prompt-builder');
                    const directPrompt = await loadPromptFromS3(config.system_prompt.s3_key);
                    combinedPrompt = `${combinedPrompt}\n\n---\n\nWEBSITE-SPECIFIC CONFIGURATION:\n${directPrompt}`;
                } catch (s3Error) {
                    console.warn('Failed to load direct prompt from S3:', s3Error);
                    // Note: system_prompt doesn't have a content field - content is in S3
                    console.warn('No fallback content available - system prompt content is only in S3');
                }
            }
        }

        // Return the complete configuration
        const agentConfig = {
            website: config.website,
            system_prompt: combinedPrompt,
            screenshots: config.screenshots.sort((a, b) => {
                // Default screenshot comes first, then by sort_order, then by created_at
                if (a.is_default && !b.is_default) return -1;
                if (!a.is_default && b.is_default) return 1;
                if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            }),
            voice_config: {
                voice: 'alloy',
                model: 'gpt-4o-realtime-preview-2025-06-03'
            },
            timestamp: new Date().toISOString()
        };

        return NextResponse.json(agentConfig);

    } catch (error) {
        console.error('Error fetching agent config:', error);
        return NextResponse.json(
            { error: 'Failed to fetch agent configuration' },
            { status: 500 }
        );
    }
}
