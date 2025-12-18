import { tool } from '@openai/agents/realtime';
import { z } from 'zod';
import { getDemoModeManager } from './demo-mode';

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
        // Mode switching tool
        tool({
            name: 'switch_demo_mode',
            description: `Switch between demo display modes. Use this when the user asks to:
- "Switch to live mode" or "Show me the real browser" → mode: 'live'
- "Go back to screenshots" or "Use static images" → mode: 'screenshot'

Live mode shows a real browser you can control. Screenshot mode shows pre-captured images.`,
            parameters: z.object({
                mode: z.enum(['screenshot', 'live']).describe(
                    'The demo mode to switch to: "screenshot" for static images, "live" for real browser control'
                ),
            }),
            execute: async ({ mode }) => {
                const manager = getDemoModeManager();
                const previousMode = manager.getMode();
                
                manager.setMode(mode);
                
                const modeDescriptions = {
                    screenshot: 'showing pre-captured screenshots',
                    live: 'controlling a real browser in real-time',
                    hybrid: 'using live browser with screenshot fallback',
                };

                return {
                    success: true,
                    previousMode,
                    currentMode: mode,
                    message: `Switched to ${mode} mode. I'm now ${modeDescriptions[mode]}.`,
                };
            },
        }),

        // Get current mode tool
        tool({
            name: 'get_demo_mode',
            description: 'Get the current demo display mode (screenshot or live)',
            parameters: z.object({}),
            execute: async () => {
                const manager = getDemoModeManager();
                const mode = manager.getMode();

                return {
                    currentMode: mode,
                    description: mode === 'screenshot' 
                        ? 'Currently showing pre-captured screenshots'
                        : mode === 'live'
                        ? 'Currently controlling a real browser'
                        : 'Currently in hybrid mode',
                };
            },
        }),

        // Screenshot tools
        tool({
            name: 'screenshot_list_views',
            description: 'Lists available screenshot views you can switch to based on the current configuration. Only works in screenshot mode.',
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
            description: 'Switches the UI to a specific screenshot view by filename. Use screenshot_list_views to discover valid filenames. Only works in screenshot mode.',
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
