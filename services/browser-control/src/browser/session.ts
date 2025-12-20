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
export class SessionManager {
  private sessions: Map<string, SessionEntry> = new Map();

  /**
   * Create or get an existing session for a tabId
   */
  async createSession(
    tabId: string,
    options?: BrowserControllerOptions,
    cookies?: Cookie[],
    defaultUrl?: string
  ): Promise<SessionInfo> {
    // Check if we already have this session
    const existing = this.sessions.get(tabId);
    if (existing && existing.controller.isLaunched()) {
      console.log(`[SessionManager] Reusing existing session for tabId: ${tabId}`);
      
      // If cookies provided, update them
      if (cookies && cookies.length > 0) {
        try {
          await existing.controller.setCookies(cookies);
          console.log(`[SessionManager] Updated ${cookies.length} cookies`);
        } catch (e) {
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
      } catch {
        // Ignore
      }
      this.sessions.delete(tabId);
    }

    // Check for Browserbase environment variables
    const useBrowserbase = process.env.USE_BROWSERBASE === 'true';
    const browserbaseApiKey = process.env.BROWSERBASE_API_KEY;
    const browserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;
    const browserbaseRegion = process.env.BROWSERBASE_REGION || 'ap-southeast-1';

    console.log('[SessionManager] Browserbase config:', {
      useBrowserbase,
      hasApiKey: !!browserbaseApiKey,
      hasProjectId: !!browserbaseProjectId,
      region: browserbaseRegion,
    });

    // Merge Browserbase config with provided options
    const mergedOptions: BrowserControllerOptions = {
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

    // Create session entry FIRST (before navigation) so GET requests can find it
    const entry: SessionEntry = {
      tabId,
      controller,
      createdAt: new Date(),
      browserbaseSessionId: controller.getBrowserbaseSessionId() || undefined,
    };

    this.sessions.set(tabId, entry);
    console.log(`[SessionManager] Session entry created: ${tabId}`);

    // Navigate to default URL if provided (after session is in map)
    if (defaultUrl) {
      console.log(`[SessionManager] Navigating to: ${defaultUrl}`);
      try {
        // Use goto directly instead of navigate to avoid state extraction issues
        const page = controller.getRawPage();
        await page.goto(defaultUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        console.log(`[SessionManager] Navigation completed`);
      } catch (e) {
        console.error('[SessionManager] Navigation failed:', e);
        // Don't fail session creation if navigation fails
      }
    }
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
  getSession(tabId: string): SessionEntry | null {
    return this.sessions.get(tabId) || null;
  }

  /**
   * Get controller for a tabId
   */
  getController(tabId: string): BrowserController | null {
    const entry = this.sessions.get(tabId);
    if (!entry) return null;
    return entry.controller;
  }

  /**
   * Get session info by tabId
   */
  getSessionInfo(tabId: string): SessionInfo | null {
    const entry = this.sessions.get(tabId);
    if (!entry) return null;
    
    return {
      id: entry.tabId,
      createdAt: entry.createdAt,
      browserbaseSessionId: entry.browserbaseSessionId,
    };
  }

  /**
   * Close session by tabId
   */
  async closeSession(tabId: string): Promise<void> {
    const entry = this.sessions.get(tabId);
    if (entry) {
      try {
        await entry.controller.close();
      } catch (e) {
        console.error(`[SessionManager] Error closing session ${tabId}:`, e);
      }
      this.sessions.delete(tabId);
      console.log(`[SessionManager] Session closed: ${tabId}`);
    }
  }

  /**
   * Check if session exists
   */
  hasSession(tabId: string): boolean {
    const entry = this.sessions.get(tabId);
    return entry !== null && entry !== undefined && entry.controller.isLaunched();
  }

  /**
   * List all active sessions
   */
  listSessions(): SessionInfo[] {
    const list: SessionInfo[] = [];
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
  async closeAll(): Promise<void> {
    const tabIds = Array.from(this.sessions.keys());
    for (const tabId of tabIds) {
      await this.closeSession(tabId);
    }
    console.log('[SessionManager] All sessions closed');
  }
}

// Global session manager singleton for Railway
let globalSessionManager: SessionManager | null = null;

export function getSessionManager(): SessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new SessionManager();
  }
  return globalSessionManager;
}

