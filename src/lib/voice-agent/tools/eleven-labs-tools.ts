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
    const url = `${getApiBase()}/api/browser/${endpoint}`;

    try {
        const res = await fetch(url, {
            method: body ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
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
    const url = `${getApiBase()}/api/browser/state?compact=true`;

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

async function getSessionInfo(): Promise<{ success: boolean; hasSession: boolean; info?: any; error?: string }> {
    const url = `${getApiBase()}/api/browser/session`;
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

/**
 * Wait for a pre-warmed session to be ready (poll instead of creating new)
 * This prevents creating duplicate sessions when the page pre-warms on load
 */
async function waitForSession(maxWaitMs: number = 10000): Promise<{ success: boolean; info?: any; error?: string }> {
    const startTime = Date.now();
    const pollInterval = 500;

    while (Date.now() - startTime < maxWaitMs) {
        const session = await getSessionInfo();
        if (session.hasSession) {
            console.log(`[tools] Found pre-warmed session after ${Date.now() - startTime}ms`);
            return { success: true, info: session.info };
        }
        await sleep(pollInterval);
    }

    return { success: false, error: `No session found after ${maxWaitMs}ms` };
}

async function startBrowserSession(websiteSlug?: string): Promise<Record<string, unknown>> {
    const url = `${getApiBase()}/api/browser/session`;
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            headless: false,
            // Prefer DB cookies if available
            loadFromDb: !!websiteSlug,
            websiteSlug,
            // Keep legacy hubspot cookie loading as fallback (won't hurt if file doesn't exist)
            loadHubspotCookies: websiteSlug === "hubspot",
        }),
    });
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`Failed to start browser session: ${t}`);
    }
    return await res.json();
}

function sleep(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isPageReadyEnough(compactStateResult: any): { ready: boolean; reason: string } {
    // compact endpoint returns: { success: true, stateType, state }
    if (!compactStateResult || !compactStateResult.success) {
        return { ready: false, reason: "state_not_available" };
    }
    const state = compactStateResult.state || {};
    const url = state.url;
    const title = state.title;

    // We consider it "ready enough" if we have a URL + at least some visible UI primitives
    const buttons = Array.isArray(state.buttons) ? state.buttons.length : 0;
    const links = Array.isArray(state.links) ? state.links.length : 0;
    const inputs = Array.isArray(state.inputs) ? state.inputs.length : 0;
    const tables = Array.isArray(state.tables) ? state.tables.length : 0;

    if (!url) return { ready: false, reason: "missing_url" };
    if (!title && buttons + links + inputs + tables === 0) return { ready: false, reason: "no_visible_elements_yet" };

    // Avoid false-positive during browser "about:blank" transitions
    if (typeof url === "string" && (url === "about:blank" || url.startsWith("chrome://"))) {
        return { ready: false, reason: "browser_transition" };
    }

    return { ready: true, reason: "ok" };
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
    const websiteSlugSafe = websiteSlug;

    // Session status tool (lets agent know if live browser exists)
    tools.browser_session_status = async () => {
        const result = await getSessionInfo();
        return JSON.stringify(result);
    };

    // Start session tool (agent can bring up live browser without the UI button)
    tools.browser_start_session = async () => {
        try {
            const session = await startBrowserSession(websiteSlugSafe);
            return JSON.stringify({ success: true, session });
        } catch (error: any) {
            return JSON.stringify({ success: false, error: error?.message || String(error) });
        }
    };

    /**
     * Check if the website is "ready enough" for interactions:
     * - live browser session exists (or can be started)
     * - /api/browser/state?compact=true returns url/title and some visible elements
     *
     * This is intentionally heuristic (fast + practical).
     */
    tools.browser_check_ready = async ({ timeoutMs, pollMs }: { timeoutMs?: number; pollMs?: number } = {}) => {
        const timeout = Math.max(500, Math.min(60_000, timeoutMs ?? 8_000));
        const poll = Math.max(100, Math.min(2_000, pollMs ?? 300));
        const startedAt = Date.now();

        let mode: string | undefined;
        try {
            const { getDemoModeManager } = await import("@/lib/demo-mode");
            mode = getDemoModeManager().getMode();
        } catch { }

        // If in live mode, wait for pre-warmed session (don't create new one)
        if (mode === "live") {
            const session = await getSessionInfo();
            if (!session.hasSession) {
                // Wait for pre-warmed session instead of creating new
                const waitResult = await waitForSession(8000);
                if (!waitResult.success) {
                    return JSON.stringify({
                        ready: false,
                        mode,
                        reason: "no_session",
                        error: waitResult.error || "Session not ready",
                    });
                }
            }
        }

        let lastState: any = null;
        let lastReason = "initial";
        while (Date.now() - startedAt < timeout) {
            lastState = await getPageState();
            const verdict = isPageReadyEnough(lastState);
            lastReason = verdict.reason;
            if (verdict.ready) {
                return JSON.stringify({
                    ready: true,
                    mode,
                    reason: verdict.reason,
                    state: summarizeResult("browser_get_state", lastState),
                    waitedMs: Date.now() - startedAt,
                });
            }
            await sleep(poll);
        }

        return JSON.stringify({
            ready: false,
            mode,
            reason: lastReason,
            state: lastState ? summarizeResult("browser_get_state", lastState) : undefined,
            waitedMs: Date.now() - startedAt,
        });
    };

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

        // If user is in live mode but no session exists, wait for pre-warmed session
        // (mode is runtime string; keep comparison permissive)
        if (mode === "live" && !session.hasSession) {
            const waitResult = await waitForSession(8000);
            if (!waitResult.success) {
                return JSON.stringify({
                    success: false,
                    mode,
                    session,
                    error: `Live mode but no browser session. ${waitResult.error || "Session not ready"}`,
                });
            }
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

        // If switching to live, wait for pre-warmed session and return current page state
        if (mode === "live") {
            try {
                const session = await getSessionInfo();
                if (!session.hasSession) {
                    const waitResult = await waitForSession(8000);
                    if (!waitResult.success) {
                        return JSON.stringify({
                            success: false,
                            previousMode,
                            newMode: mode,
                            error: waitResult.error || "Session not ready",
                        });
                    }
                }
                const state = await getPageState();
                return JSON.stringify({
                    success: true,
                    previousMode,
                    currentMode: mode,
                    state: summarizeResult("browser_get_state", state),
                    message: `Switched to live mode. Live browser is ready.`,
                });
            } catch (e: any) {
                return JSON.stringify({
                    success: false,
                    previousMode,
                    currentMode: mode,
                    error: e?.message || String(e),
                    message: `Switched to live mode but could not start browser session.`,
                });
            }
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

