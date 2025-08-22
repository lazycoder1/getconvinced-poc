import { tool } from '@openai/agents/realtime';
import { z } from 'zod';

export interface DynamicScreenshot {
    id: string;
    filename: string;
    s3_key: string;
    s3_url: string;
    description?: string;
    annotation?: string;
    sort_order: number;
}

// Create dynamic screenshot tools based on the screenshots passed
export function createDynamicScreenshotTools(screenshots: DynamicScreenshot[] = []) {
    const screenshotMap = Object.fromEntries(
        screenshots.map(s => [s.filename, s])
    );

    return [
        tool({
            name: 'screenshot_list_views',
            description: 'Lists available screenshot views you can switch to based on the current configuration.',
            parameters: z.object({}),
            execute: async () => {
                return screenshots.map((s) => ({
                    id: s.id,
                    filename: s.filename,
                    description: s.annotation || s.description || 'No description available',
                    s3_url: s.s3_url,
                    sort_order: s.sort_order,
                }));
            },
        }),
        tool({
            name: 'screenshot_set_view',
            description: 'Switches the UI to a specific screenshot view by filename. Use screenshot_list_views to discover valid filenames.',
            parameters: z.object({
                filename: z.string().describe('The screenshot filename to switch to.'),
            }),
            execute: async (args) => {
                const screenshot = screenshotMap[args.filename];
                if (!screenshot) {
                    throw new Error(
                        `Unknown screenshot: ${args.filename}. Call screenshot_list_views to see valid options.`
                    );
                }
                const detail = {
                    id: screenshot.id,
                    filename: screenshot.filename,
                    description: screenshot.annotation || screenshot.description || 'No description available',
                    s3_url: screenshot.s3_url,
                    sort_order: screenshot.sort_order,
                };

                try {
                    if (typeof window !== 'undefined') {
                        // Dispatch custom event for the UI to handle screenshot switching
                        window.dispatchEvent(new CustomEvent('dynamic_screenshot:set_view', { detail }));
                        const setFn = (window as any).dynamicScreenshotSetView;
                        if (typeof setFn === 'function') {
                            setFn(detail);
                        }
                    }
                } catch {/* no-op */ }

                return {
                    ok: true,
                    message: `Switched to screenshot: ${screenshot.filename}`,
                    ...detail
                };
            },
        }),
    ];
}

export default createDynamicScreenshotTools;
