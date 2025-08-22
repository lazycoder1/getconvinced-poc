import { tool } from '@openai/agents/realtime';
import { z } from 'zod';
import { SCREENSHOT_VIEWS, SCREENSHOT_VIEW_MAP } from './screenshot-views';

const screenshotTools = [
    tool({
        name: 'screenshot_list_views',
        description: 'Lists available HubSpot screenshot views you can switch to in this demo.',
        parameters: z.object({}),
        execute: async () => {
            return SCREENSHOT_VIEWS.map((v) => ({
                name: v.name,
                title: v.title,
                description: v.description,
                filename: v.filename,
                url: `/screenshots/${v.filename}`,
            }));
        },
    }),
    tool({
        name: 'screenshot_set_view',
        description:
            'Switches the UI to a specific screenshot view by name. Use screenshot_list_views to discover valid names.',
        parameters: z.object({
            name: z.string().describe('The canonical view name (e.g., contacts, deals, tickets).'),
        }),
        execute: async (args) => {
            const view = SCREENSHOT_VIEW_MAP[args.name];
            if (!view) {
                throw new Error(
                    `Unknown screenshot view: ${args.name}. Call screenshot_list_views to see valid options.`
                );
            }
            const detail = {
                name: view.name,
                title: view.title,
                description: view.description,
                filename: view.filename,
                url: `/screenshots/${view.filename}`,
            };
            try {
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('screenshot:set_view', { detail }));
                    const setFn = (window as any).screenshotSetView;
                    if (typeof setFn === 'function') {
                        setFn(detail);
                    }
                }
            } catch {/* no-op */ }
            return { ok: true, ...detail };
        },
    }),
];

export default screenshotTools;


