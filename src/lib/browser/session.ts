import { BrowserController } from './controller';
import type { BrowserControllerOptions, SessionInfo } from './types';

/**
 * SessionManager - Manages browser session lifecycle
 * 
 * Handles:
 * - Session creation and destruction
 * - Session info tracking
 * - Single session per manager (can create multiple managers for concurrent sessions)
 */
export class SessionManager {
  private session: { 
    id: string; 
    controller: BrowserController; 
    createdAt: Date; 
    browserbaseSessionId?: string;
  } | null = null;

  /**
   * Create a new browser session
   */
  async createSession(options?: BrowserControllerOptions): Promise<SessionInfo> {
    if (this.session) {
      throw new Error('Session already exists. Close it first.');
    }

    // Check for Browserbase environment variables
    const useBrowserbase = process.env.USE_BROWSERBASE === 'true';
    const browserbaseApiKey = process.env.BROWSERBASE_API_KEY;
    const browserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;

    // Merge Browserbase config with provided options
    const mergedOptions: BrowserControllerOptions = {
      ...options,
      useBrowserbase: options?.useBrowserbase ?? useBrowserbase,
      browserbaseConfig: options?.browserbaseConfig ?? (browserbaseApiKey && browserbaseProjectId ? {
        apiKey: browserbaseApiKey,
        projectId: browserbaseProjectId,
      } : undefined),
    };

    const id = crypto.randomUUID();
    const controller = new BrowserController(mergedOptions);
    await controller.launch();

    this.session = {
      id,
      controller,
      createdAt: new Date(),
      browserbaseSessionId: controller.getBrowserbaseSessionId() || undefined,
    };

    return {
      id,
      createdAt: this.session.createdAt,
      browserbaseSessionId: this.session.browserbaseSessionId,
    };
  }

  /**
   * Close the current session
   */
  async closeSession(): Promise<void> {
    if (!this.session) {
      throw new Error('No active session');
    }

    await this.session.controller.close();
    this.session = null;
  }

  /**
   * Get the current session (or null if none)
   */
  getSession(): { id: string; controller: BrowserController; createdAt: Date } | null {
    return this.session;
  }

  /**
   * Get the browser controller (throws if no session)
   */
  getController(): BrowserController {
    if (!this.session) {
      throw new Error('No active session');
    }
    return this.session.controller;
  }

  /**
   * Get session info (or null if no session)
   */
  getSessionInfo(): SessionInfo | null {
    if (!this.session) return null;

    return {
      id: this.session.id,
      createdAt: this.session.createdAt,
      browserbaseSessionId: this.session.browserbaseSessionId,
    };
  }

  /**
   * Check if a session exists
   */
  hasSession(): boolean {
    return this.session !== null;
  }
}

// ============================================================================
// Global Session Manager Singleton
// ============================================================================

let globalSessionManager: SessionManager | null = null;

/**
 * Get the global session manager singleton
 */
export function getGlobalSessionManager(): SessionManager {
  if (!globalSessionManager) {
    globalSessionManager = new SessionManager();
  }
  return globalSessionManager;
}

/**
 * Reset the global session manager (useful for testing)
 */
export async function resetGlobalSessionManager(): Promise<void> {
  if (globalSessionManager && globalSessionManager.hasSession()) {
    await globalSessionManager.closeSession();
  }
  globalSessionManager = null;
}

