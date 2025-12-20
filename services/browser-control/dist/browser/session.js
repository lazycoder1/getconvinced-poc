import { BrowserController } from './controller.js';
/**
 * SessionManager - Manages multiple browser sessions by tabId
 *
 * On Railway, sessions persist in memory across requests.
 * No database needed - sessions are keyed by tabId.
 */
export class SessionManager {
    sessions = new Map();
    /**
     * Create or get an existing session for a tabId
     */
    async createSession(tabId, options, cookies, defaultUrl) {
        // Check if we already have this session
        const existing = this.sessions.get(tabId);
        if (existing && existing.controller.isLaunched()) {
            console.log(`[SessionManager] Reusing existing session for tabId: ${tabId}`);
            // If cookies provided, update them
            if (cookies && cookies.length > 0) {
                try {
                    await existing.controller.setCookies(cookies);
                    console.log(`[SessionManager] Updated ${cookies.length} cookies`);
                }
                catch (e) {
                    console.error('[SessionManager] Failed to update cookies:', e);
                }
            }
            return {
                id: existing.tabId,
                createdAt: existing.createdAt,
                browserbaseSessionId: existing.browserbaseSessionId,
            };
        }
        // Close existing session if it's not launched (stale)
        if (existing) {
            try {
                await existing.controller.close();
            }
            catch {
                // Ignore
            }
            this.sessions.delete(tabId);
        }
        // Check for Browserbase environment variables
        const useBrowserbase = process.env.USE_BROWSERBASE === 'true';
        const browserbaseApiKey = process.env.BROWSERBASE_API_KEY;
        const browserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;
        const browserbaseRegion = process.env.BROWSERBASE_REGION || 'ap-southeast-1';
        // Merge Browserbase config with provided options
        const mergedOptions = {
            ...options,
            cookies,
            useBrowserbase: options?.useBrowserbase ?? useBrowserbase,
            browserbaseConfig: options?.browserbaseConfig ?? (browserbaseApiKey && browserbaseProjectId ? {
                apiKey: browserbaseApiKey,
                projectId: browserbaseProjectId,
                region: browserbaseRegion,
            } : undefined),
        };
        console.log(`[SessionManager] Creating new session for tabId: ${tabId}`);
        const controller = new BrowserController(mergedOptions);
        controller.setTabId(tabId);
        await controller.launch();
        // Navigate to default URL if provided
        if (defaultUrl) {
            console.log(`[SessionManager] Navigating to: ${defaultUrl}`);
            try {
                await controller.navigate(defaultUrl, { skipState: true });
            }
            catch (e) {
                console.error('[SessionManager] Navigation failed:', e);
            }
        }
        const entry = {
            tabId,
            controller,
            createdAt: new Date(),
            browserbaseSessionId: controller.getBrowserbaseSessionId() || undefined,
        };
        this.sessions.set(tabId, entry);
        console.log(`[SessionManager] Session created: ${entry.browserbaseSessionId || tabId}`);
        return {
            id: tabId,
            createdAt: entry.createdAt,
            browserbaseSessionId: entry.browserbaseSessionId,
        };
    }
    /**
     * Get session by tabId
     */
    getSession(tabId) {
        return this.sessions.get(tabId) || null;
    }
    /**
     * Get controller for a tabId
     */
    getController(tabId) {
        const entry = this.sessions.get(tabId);
        if (!entry)
            return null;
        return entry.controller;
    }
    /**
     * Get session info by tabId
     */
    getSessionInfo(tabId) {
        const entry = this.sessions.get(tabId);
        if (!entry)
            return null;
        return {
            id: entry.tabId,
            createdAt: entry.createdAt,
            browserbaseSessionId: entry.browserbaseSessionId,
        };
    }
    /**
     * Close session by tabId
     */
    async closeSession(tabId) {
        const entry = this.sessions.get(tabId);
        if (entry) {
            try {
                await entry.controller.close();
            }
            catch (e) {
                console.error(`[SessionManager] Error closing session ${tabId}:`, e);
            }
            this.sessions.delete(tabId);
            console.log(`[SessionManager] Session closed: ${tabId}`);
        }
    }
    /**
     * Check if session exists
     */
    hasSession(tabId) {
        const entry = this.sessions.get(tabId);
        return entry !== null && entry !== undefined && entry.controller.isLaunched();
    }
    /**
     * List all active sessions
     */
    listSessions() {
        const list = [];
        for (const entry of this.sessions.values()) {
            if (entry.controller.isLaunched()) {
                list.push({
                    id: entry.tabId,
                    createdAt: entry.createdAt,
                    browserbaseSessionId: entry.browserbaseSessionId,
                });
            }
        }
        return list;
    }
    /**
     * Close all sessions (for cleanup)
     */
    async closeAll() {
        const tabIds = Array.from(this.sessions.keys());
        for (const tabId of tabIds) {
            await this.closeSession(tabId);
        }
        console.log('[SessionManager] All sessions closed');
    }
}
// Global session manager singleton for Railway
let globalSessionManager = null;
export function getSessionManager() {
    if (!globalSessionManager) {
        globalSessionManager = new SessionManager();
    }
    return globalSessionManager;
}
//# sourceMappingURL=session.js.map