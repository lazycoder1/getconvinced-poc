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
   * If a session already exists, attempts to reuse it (for Browserbase) or closes and recreates
   */
  async createSession(options?: BrowserControllerOptions): Promise<SessionInfo> {
    // Check for Browserbase environment variables
    const useBrowserbase = process.env.USE_BROWSERBASE === 'true';
    const browserbaseApiKey = process.env.BROWSERBASE_API_KEY;
    const browserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;
    const browserbaseRegion = process.env.BROWSERBASE_REGION || 'ap-southeast-1';

    // Merge Browserbase config with provided options
    const mergedOptions: BrowserControllerOptions = {
      ...options,
      useBrowserbase: options?.useBrowserbase ?? useBrowserbase,
      browserbaseConfig: options?.browserbaseConfig ?? (browserbaseApiKey && browserbaseProjectId ? {
        apiKey: browserbaseApiKey,
        projectId: browserbaseProjectId,
        region: browserbaseRegion,
      } : undefined),
    };

    // If a session already exists, try to reuse it (for Browserbase) or close it
    if (this.session) {
      // If it's a Browserbase session, try to reconnect
      if (this.session.browserbaseSessionId && mergedOptions.useBrowserbase && mergedOptions.browserbaseConfig) {
        try {
          const reconnected = await this.session.controller.reconnectToBrowserbaseSession(this.session.browserbaseSessionId);
          if (reconnected) {
            console.log('Reusing existing Browserbase session');
            return {
              id: this.session.id,
              createdAt: this.session.createdAt,
              browserbaseSessionId: this.session.browserbaseSessionId,
            };
          }
        } catch (error) {
          console.log('Failed to reconnect to existing session, closing and creating new one:', error);
        }
      }
      
      // Close existing session if we can't reuse it
      try {
        await this.session.controller.close();
      } catch (error) {
        console.error('Error closing existing session:', error);
      }
      this.session = null;
    }

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

// Use globalThis to persist across Next.js hot reloads
declare global {
  // eslint-disable-next-line no-var
  var __browserSessionManager: SessionManager | undefined;
}

/**
 * Get the global session manager singleton
 * Uses globalThis to survive Next.js hot module replacement
 */
export function getGlobalSessionManager(): SessionManager {
  if (!globalThis.__browserSessionManager) {
    globalThis.__browserSessionManager = new SessionManager();
  }
  return globalThis.__browserSessionManager;
}

/**
 * Reset the global session manager (useful for testing)
 */
export async function resetGlobalSessionManager(): Promise<void> {
  if (globalThis.__browserSessionManager?.hasSession()) {
    await globalThis.__browserSessionManager.closeSession();
  }
  globalThis.__browserSessionManager = undefined;
}

