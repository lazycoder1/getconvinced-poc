/**
 * Demo Mode Manager
 * 
 * Manages the current demo mode (screenshot vs live browser) with event-based
 * synchronization between UI components and voice agent tools.
 */

import type { DemoMode, DemoConfig, BrowserControllerOptions } from './browser/types';

type ModeChangeListener = (mode: DemoMode, previousMode: DemoMode) => void;

/**
 * DemoModeManager - Centralized state for demo mode
 * 
 * Provides:
 * - Current mode state
 * - Event subscription for mode changes
 * - Bidirectional sync between UI and voice agent
 */
class DemoModeManager {
  private currentMode: DemoMode = 'screenshot';
  private listeners: Set<ModeChangeListener> = new Set();
  private config: DemoConfig = {
    mode: 'screenshot',
    fallbackToScreenshots: true,
  };

  /**
   * Get current demo mode
   */
  getMode(): DemoMode {
    return this.currentMode;
  }

  /**
   * Get full configuration
   */
  getConfig(): DemoConfig {
    return { ...this.config };
  }

  /**
   * Set demo mode
   * Notifies all listeners of the change
   */
  setMode(mode: DemoMode): void {
    const previousMode = this.currentMode;
    if (mode === previousMode) return;

    this.currentMode = mode;
    this.config.mode = mode;

    console.log(`[DemoMode] Switched from ${previousMode} to ${mode}`);

    // Notify all listeners
    this.listeners.forEach(listener => {
      try {
        listener(mode, previousMode);
      } catch (error) {
        console.error('[DemoMode] Listener error:', error);
      }
    });

    // Emit custom event for components that prefer DOM events
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('demo:mode_change', {
        detail: { mode, previousMode }
      }));
    }
  }

  /**
   * Toggle between screenshot and live modes
   */
  toggle(): DemoMode {
    const newMode = this.currentMode === 'screenshot' ? 'live' : 'screenshot';
    this.setMode(newMode);
    return newMode;
  }

  /**
   * Subscribe to mode changes
   * Returns unsubscribe function
   */
  subscribe(listener: ModeChangeListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Configure the demo mode manager
   */
  configure(options: Partial<DemoConfig>): void {
    if (options.mode !== undefined) {
      this.setMode(options.mode);
    }
    if (options.fallbackToScreenshots !== undefined) {
      this.config.fallbackToScreenshots = options.fallbackToScreenshots;
    }
    if (options.browserConfig !== undefined) {
      this.config.browserConfig = options.browserConfig;
    }
  }

  /**
   * Check if should fallback to screenshots on browser error
   */
  shouldFallback(): boolean {
    return this.config.fallbackToScreenshots;
  }

  /**
   * Get browser configuration
   */
  getBrowserConfig(): BrowserControllerOptions | undefined {
    return this.config.browserConfig;
  }

  /**
   * Check if in live mode
   */
  isLiveMode(): boolean {
    return this.currentMode === 'live';
  }

  /**
   * Check if in screenshot mode
   */
  isScreenshotMode(): boolean {
    return this.currentMode === 'screenshot';
  }

  /**
   * Check if in hybrid mode
   */
  isHybridMode(): boolean {
    return this.currentMode === 'hybrid';
  }
}

// ============================================================================
// Global Singleton
// ============================================================================

let instance: DemoModeManager | null = null;

/**
 * Get the global demo mode manager
 */
export function getDemoModeManager(): DemoModeManager {
  if (!instance) {
    instance = new DemoModeManager();
  }
  return instance;
}

/**
 * Reset the demo mode manager (for testing)
 */
export function resetDemoModeManager(): void {
  if (instance) {
    instance.setMode('screenshot');
  }
  instance = null;
}

// Export the class for typing
export { DemoModeManager };

// Export types
export type { DemoMode, DemoConfig, ModeChangeListener };

