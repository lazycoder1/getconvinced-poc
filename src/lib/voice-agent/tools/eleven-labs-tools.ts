/**
 * Eleven Labs Tool Conversion Utilities
 * 
 * Converts browser tools and screenshot tools to Eleven Labs clientTools format.
 * Eleven Labs uses plain async functions instead of wrapped tool objects.
 */

import { createDynamicBrowserTools } from "@/lib/browser-tools";
import createDynamicScreenshotTools from "@/lib/dynamic-screenshot-tools";
import type { Screenshot, BrowserConfig } from "../types";

// Base URL for API calls (uses relative paths in browser)
const getApiBase = () => {
    if (typeof window !== 'undefined') {
        return '';  // Use relative paths in browser
    }
    return process.env.NEXT_PUBLIC_API_URL || '';
};

// Helper to make API calls with error handling
async function browserApiCall(endpoint: string, body?: Record<string, unknown>) {
    // Include session info in all API calls for reliable serverless reconnection
    const cached = getCachedSessionInfo();
    const enrichedBody = body ? {
        ...body,
        tabId: cached.tabId,
        browserbaseSessionId: cached.browserbaseSessionId,
    } : undefined;

    const url = `${getApiBase()}/api/browser/${endpoint}`;

    try {
        const res = await fetch(url, {
            method: enrichedBody ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: enrichedBody ? JSON.stringify(enrichedBody) : undefined,
        });

        if (!res.ok) {
            const errorBody = await res.text();
            let errorJson: Record<string, unknown> = { error: res.statusText };
            try {
                errorJson = JSON.parse(errorBody);
            } catch { }
            throw new Error(errorJson.error as string || `API error: ${res.status} ${res.statusText}`);
        }

        return await res.json();
    } catch (err) {
        throw err;
    }
}

// Helper to get page state
async function getPageState(): Promise<Record<string, unknown>> {
    const cached = getCachedSessionInfo();
    const params = new URLSearchParams({ compact: 'true' });
    if (cached.tabId) params.set('tabId', cached.tabId);
    const url = `${getApiBase()}/api/browser/state?${params.toString()}`;

    try {
        const res = await fetch(url);
        if (!res.ok) {
            return { success: false, error: `Failed to get state: ${res.status}` };
        }
        return await res.json();
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

/**
 * Get cached session info from sessionStorage (client-side)
 */
function getCachedSessionInfo(): { tabId?: string; browserbaseSessionId?: string } {
    if (typeof window === 'undefined') return {};
    try {
        let tabId = sessionStorage.getItem('browserTabId');
        if (!tabId) {
            tabId =
                typeof crypto !== 'undefined' && typeof (crypto as any).randomUUID === 'function'
                    ? (crypto as any).randomUUID()
                    : `${Date.now()}_${Math.random().toString(16).slice(2)}`;
            sessionStorage.setItem('browserTabId', tabId as string);
        }
        const browserbaseSessionId = sessionStorage.getItem('browserbaseSessionId');
        return {
            tabId: tabId || undefined,
            browserbaseSessionId: browserbaseSessionId || undefined
        };
    } catch {
        return {};
    }
}

async function getSessionInfo(): Promise<{ success: boolean; hasSession: boolean; info?: any; error?: string }> {
    // Pass tabId from sessionStorage so server can find the correct session
    const cached = getCachedSessionInfo();
    const params = new URLSearchParams();
    if (cached.tabId) params.set('tabId', cached.tabId);
    if (cached.browserbaseSessionId) params.set('sessionId', cached.browserbaseSessionId);

    const url = `${getApiBase()}/api/browser/session${params.toString() ? '?' + params.toString() : ''}`;
    try {
        const res = await fetch(url);
        if (!res.ok) {
            return { success: false, hasSession: false, error: `No active session (${res.status})` };
        }
        const info = await res.json();
        return { success: true, hasSession: true, info };
    } catch (err) {
        return { success: false, hasSession: false, error: String(err) };
    }
}

// Summarize tool results for context efficiency
function summarizeResult(toolName: string, data: Record<string, unknown>): Record<string, unknown> {
    if (!data.success) {
        return {
            success: false,
            error: data.error || 'Unknown error',
        };
    }

    if (toolName.includes('navigate')) {
        const url = (data.state as Record<string, unknown>)?.url || data.url;
        const title = (data.state as Record<string, unknown>)?.title || '';
        return {
            success: true,
            url,
            title,
            message: `Navigated to: ${title || url}`,
        };
    }

    if (toolName === 'browser_get_state' && data.state) {
        const state = data.state as Record<string, any>;
        return {
            success: true,
            url: state.url,
            title: state.title,
            summary: state.summary,
            buttons: state.buttons,
            links: state.links,
            inputs: state.inputs,
            tables: state.tables,
            other: state.other,
        };
    }

    if (['browser_click', 'browser_click_text', 'browser_type', 'browser_press_key', 'browser_scroll'].includes(toolName)) {
        return {
            success: true,
            message: 'Action completed successfully',
        };
    }

    if (toolName === 'browser_screenshot') {
        return { success: true, note: 'Screenshot captured' };
    }

    return data;
}

/**
 * Convert browser tools to Eleven Labs clientTools format
 */
export function convertBrowserToolsToElevenLabs(
    websiteSlug: string,
    websiteName: string,
    browserConfig?: BrowserConfig
): Record<string, (...args: any[]) => Promise<string>> {
    const tools: Record<string, (...args: any[]) => Promise<string>> = {};

    // Add dynamic navigation tool if routes are available
    if (browserConfig?.navigation_routes && browserConfig.navigation_routes.length > 0) {
        const routeKeys = browserConfig.navigation_routes.map((r: any) => r.key);
        const routeLookup = new Map(browserConfig.navigation_routes.map((r: any) => [r.key, r]));

        tools[`navigate_${websiteSlug.replace(/-/g, '_')}`] = async ({ route }: { route: string }) => {
            const routeConfig = routeLookup.get(route);
            if (!routeConfig) {
                return JSON.stringify({ success: false, error: `Unknown route: ${route}` });
            }
            const url = browserConfig.base_url + routeConfig.path;
            const result = await browserApiCall('action', { type: 'navigate', url });
            return JSON.stringify(summarizeResult(`navigate_${websiteSlug}`, result));
        };
    }

    // Generic navigation tool
    tools.browser_navigate = async ({ url }: { url: string }) => {
        const result = await browserApiCall('action', { type: 'navigate', url });
        return JSON.stringify(summarizeResult('browser_navigate', result));
    };

    // Click tools
    tools.browser_click = async ({ selector }: { selector: string }) => {
        const result = await browserApiCall('action', { type: 'click_element', selector });
        return JSON.stringify(summarizeResult('browser_click', result));
    };

    tools.browser_click_text = async ({
        text,
        tag,
        index,
        withinSelector,
    }: {
        text: string;
        tag?: string;
        index?: number;
        withinSelector?: string;
    }) => {
        let selector = tag ? `${tag}:text("${text}")` : `text="${text}"`;
        if (withinSelector) {
            selector = `${withinSelector} >> ${selector}`;
        }
        if (typeof index === "number" && Number.isFinite(index)) {
            selector = `${selector} >> nth=${Math.max(0, Math.floor(index))}`;
        }
        const result = await browserApiCall('action', { type: 'click_element', selector });
        return JSON.stringify(summarizeResult('browser_click_text', result));
    };

    // Type tool
    tools.browser_type = async ({ selector, text, clear }: { selector: string; text: string; clear?: boolean }) => {
        const result = await browserApiCall('action', {
            type: 'type_element',
            selector,
            text,
            clear: clear ?? true
        });
        return JSON.stringify(summarizeResult('browser_type', result));
    };

    // Press key tool
    tools.browser_press_key = async ({ key }: { key: string }) => {
        const result = await browserApiCall('action', { type: 'key', key });
        return JSON.stringify(summarizeResult('browser_press_key', result));
    };

    // Scroll tool
    tools.browser_scroll = async ({ direction, amount }: { direction: 'up' | 'down' | 'left' | 'right'; amount?: number }) => {
        const result = await browserApiCall('action', { type: 'scroll', direction, amount: amount ?? 300 });
        return JSON.stringify(summarizeResult('browser_scroll', result));
    };

    // Get state tool
    tools.browser_get_state = async () => {
        // Include mode + session info so the agent can reason about context
        let mode: string | undefined;
        try {
            const { getDemoModeManager } = await import("@/lib/demo-mode");
            mode = getDemoModeManager().getMode();
        } catch { }

        const session = await getSessionInfo();

        // If in live mode but no session exists, immediately return error (no waiting, no auto-start)
        if (mode === "live" && !session.hasSession) {
            return JSON.stringify({
                success: false,
                mode,
                session,
                error: "No active browser session. Please refresh the page to create a new session.",
                needsUserAction: true,
            });
        }

        const result = await getPageState();
        const summarized = summarizeResult("browser_get_state", result);
        return JSON.stringify({
            ...summarized,
            mode,
            session: await getSessionInfo(),
        });
    };

    // Screenshot tool
    tools.browser_screenshot = async ({ fullPage }: { fullPage?: boolean }) => {
        const result = await browserApiCall('screenshot', { fullPage: fullPage ?? false });
        return JSON.stringify(summarizeResult('browser_screenshot', result));
    };

    // Wait tool
    tools.browser_wait = async ({ ms }: { ms: number }) => {
        await new Promise(resolve => setTimeout(resolve, ms));
        return JSON.stringify({ success: true, waited: ms });
    };

    return tools;
}

/**
 * Convert screenshot tools to Eleven Labs clientTools format
 */
export function convertScreenshotToolsToElevenLabs(
    screenshots: Screenshot[] = [],
    websiteSlug?: string
): Record<string, (...args: any[]) => Promise<string>> {
    const tools: Record<string, (...args: any[]) => Promise<string>> = {};
    const screenshotMap = Object.fromEntries(screenshots.map(s => [s.filename, s]));

    tools.get_demo_mode = async () => {
        const { getDemoModeManager } = await import("@/lib/demo-mode");
        const manager = getDemoModeManager();
        const mode = manager.getMode();
        return JSON.stringify({
            success: true,
            mode,
            message: mode === "live" ? "Currently in live browser mode." : "Currently in screenshot mode.",
        });
    };

    // Switch demo mode tool
    tools.switch_demo_mode = async ({ mode }: { mode: 'screenshot' | 'live' }) => {
        // Import dynamically to avoid SSR issues
        const { getDemoModeManager } = await import('@/lib/demo-mode');
        const manager = getDemoModeManager();
        const previousMode = manager.getMode();
        manager.setMode(mode);
        const modeNote = mode === "live" ? "You can now control the browser." : "Showing screenshots.";

        // If switching to live, check if a session exists (no auto-start, no waiting)
        if (mode === "live") {
            const session = await getSessionInfo();
            if (!session.hasSession) {
                return JSON.stringify({
                    success: false,
                    previousMode,
                    newMode: mode,
                    needsUserAction: true,
                    error: "No active browser session. Please refresh the page to create a new session.",
                });
            }
            const state = await getPageState();
            return JSON.stringify({
                success: true,
                previousMode,
                currentMode: mode,
                state: summarizeResult("browser_get_state", state),
                message: `Switched to live mode. Live browser is ready.`,
            });
        }

        return JSON.stringify({
            success: true,
            previousMode,
            currentMode: mode,
            message: `Switched to ${mode} mode. ${modeNote}`,
        });
    };

    // List screenshot views
    tools.screenshot_list_views = async () => {
        if (screenshots.length === 0) {
            return JSON.stringify({ views: [], message: 'No screenshots available' });
        }
        const views = screenshots.map(s => ({
            name: s.filename,
            description: s.description || s.annotation || 'No description',
        }));
        return JSON.stringify({ views });
    };

    // Set screenshot view - triggers UI update via ScreenshotManager
    tools.screenshot_set_view = async (args: { name?: string; filename?: string }) => {
        const name = args.filename || args.name;
        if (!name) {
            return JSON.stringify({ success: false, error: `Missing required parameter: filename (or name)` });
        }
        const screenshot = screenshotMap[name];
        if (!screenshot) {
            // Try partial match
            const partialMatch = screenshots.find(s =>
                s.filename.toLowerCase().includes(name.toLowerCase()) ||
                s.description?.toLowerCase().includes(name.toLowerCase())
            );
            if (!partialMatch) {
                return JSON.stringify({
                    success: false,
                    error: `Screenshot "${name}" not found. Use screenshot_list_views() to see available views.`
                });
            }
            // Use the partial match
            const { getScreenshotManager } = await import('@/lib/screenshot-manager');
            const manager = getScreenshotManager();
            manager.setActive(partialMatch);

            return JSON.stringify({
                success: true,
                screenshot: {
                    filename: partialMatch.filename,
                    description: partialMatch.description || partialMatch.annotation,
                },
                message: `Now showing: ${partialMatch.filename}`,
            });
        }

        // Import and use ScreenshotManager to trigger UI update
        const { getScreenshotManager } = await import('@/lib/screenshot-manager');
        const manager = getScreenshotManager();
        manager.setActive(screenshot);

        return JSON.stringify({
            success: true,
            screenshot: {
                filename: screenshot.filename,
                description: screenshot.description || screenshot.annotation,
            },
            message: `Now showing: ${screenshot.filename}`,
        });
    };

    return tools;
}

/**
 * Combine all tools for Eleven Labs
 */
export function createElevenLabsClientTools(
    websiteSlug: string,
    websiteName: string,
    screenshots?: Screenshot[],
    browserConfig?: BrowserConfig
): Record<string, (...args: any[]) => Promise<string>> {
    const browserTools = convertBrowserToolsToElevenLabs(websiteSlug, websiteName, browserConfig);
    const screenshotTools = convertScreenshotToolsToElevenLabs(screenshots || [], websiteSlug);

    return {
        ...browserTools,
        ...screenshotTools,
    };
}

