import { BrowserController } from './controller.js';
import type { BrowserControllerOptions, SessionInfo, Cookie } from './types.js';
/**
 * Session entry stored in memory on Railway
 */
export interface SessionEntry {
    tabId: string;
    controller: BrowserController;
    createdAt: Date;
    browserbaseSessionId?: string;
}
/**
 * SessionManager - Manages multiple browser sessions by tabId
 *
 * On Railway, sessions persist in memory across requests.
 * No database needed - sessions are keyed by tabId.
 */
export declare class SessionManager {
    private sessions;
    /**
     * Create or get an existing session for a tabId
     */
    createSession(tabId: string, options?: BrowserControllerOptions, cookies?: Cookie[], defaultUrl?: string): Promise<SessionInfo>;
    /**
     * Get session by tabId
     */
    getSession(tabId: string): SessionEntry | null;
    /**
     * Get controller for a tabId
     */
    getController(tabId: string): BrowserController | null;
    /**
     * Get session info by tabId
     */
    getSessionInfo(tabId: string): SessionInfo | null;
    /**
     * Close session by tabId
     */
    closeSession(tabId: string): Promise<void>;
    /**
     * Check if session exists
     */
    hasSession(tabId: string): boolean;
    /**
     * List all active sessions
     */
    listSessions(): SessionInfo[];
    /**
     * Close all sessions (for cleanup)
     */
    closeAll(): Promise<void>;
}
export declare function getSessionManager(): SessionManager;
//# sourceMappingURL=session.d.ts.map