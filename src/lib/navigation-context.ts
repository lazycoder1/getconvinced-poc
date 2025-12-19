/**
 * Navigation Context Manager
 * 
 * Tracks navigation history and provides context for the agent.
 * Based on the context management patterns from gc-testing-chromium/test-app.
 * 
 * This helps the agent understand where the user has been during the demo,
 * even when older messages slide out of the conversation window.
 */

export interface NavigationEntry {
  url: string;
  title: string;
  timestamp: Date;
  shortPath: string;  // Last 2 segments of URL path
}

export interface NavigationContext {
  currentUrl: string | null;
  currentTitle: string | null;
  history: NavigationEntry[];
}

class NavigationContextManager {
  private currentUrl: string | null = null;
  private currentTitle: string | null = null;
  private history: NavigationEntry[] = [];
  private maxHistory = 10;
  private listeners: Set<(context: NavigationContext) => void> = new Set();

  /**
   * Track a new navigation
   */
  trackNavigation(url: string, title: string = ''): void {
    // Update current state
    this.currentUrl = url;
    this.currentTitle = title;

    // Create entry
    const entry: NavigationEntry = {
      url,
      title,
      timestamp: new Date(),
      shortPath: this.extractShortPath(url),
    };

    // Add to history (avoid duplicates of same URL in sequence)
    const lastEntry = this.history[this.history.length - 1];
    if (!lastEntry || lastEntry.url !== url) {
      this.history.push(entry);
      // Keep history bounded
      if (this.history.length > this.maxHistory) {
        this.history = this.history.slice(-this.maxHistory);
      }
    }

    // Notify listeners
    this.notifyListeners();
  }

  /**
   * Get the current navigation context
   */
  getContext(): NavigationContext {
    return {
      currentUrl: this.currentUrl,
      currentTitle: this.currentTitle,
      history: [...this.history],
    };
  }

  /**
   * Get a context prefix string for agent messages
   * This provides current location and navigation history
   */
  getContextPrefix(): string {
    const parts: string[] = [];

    // Current page
    if (this.currentUrl) {
      const display = this.currentTitle 
        ? `${this.currentTitle} (${this.extractShortPath(this.currentUrl)})`
        : this.currentUrl;
      parts.push(`Currently viewing: ${display}`);
    } else {
      parts.push('Browser ready - no page loaded yet');
    }

    // Navigation history (last 5 pages)
    if (this.history.length > 1) {
      const recentHistory = this.history.slice(-6, -1);  // Exclude current, get last 5
      const pathStrings = recentHistory.map(e => e.shortPath);
      parts.push(`Previous pages: ${pathStrings.join(' → ')}`);
    }

    return `[${parts.join(' | ')}]\n\n`;
  }

  /**
   * Subscribe to context changes
   */
  subscribe(listener: (context: NavigationContext) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Reset all context (e.g., when session ends)
   */
  reset(): void {
    this.currentUrl = null;
    this.currentTitle = null;
    this.history = [];
    this.notifyListeners();
  }

  /**
   * Get the last N navigation entries
   */
  getRecentHistory(count: number = 5): NavigationEntry[] {
    return this.history.slice(-count);
  }

  private extractShortPath(url: string): string {
    try {
      const urlObj = new URL(url);
      const segments = urlObj.pathname.split('/').filter(Boolean);
      return segments.slice(-2).join('/') || '/';
    } catch {
      return url;
    }
  }

  private notifyListeners(): void {
    const context = this.getContext();
    this.listeners.forEach(listener => {
      try {
        listener(context);
      } catch (error) {
        console.error('Navigation context listener error:', error);
      }
    });
  }
}

// Singleton instance
let globalNavigationContext: NavigationContextManager | null = null;

/**
 * Get the global navigation context manager
 */
export function getNavigationContext(): NavigationContextManager {
  if (!globalNavigationContext) {
    globalNavigationContext = new NavigationContextManager();
  }
  return globalNavigationContext;
}

/**
 * Reset the global navigation context
 */
export function resetNavigationContext(): void {
  if (globalNavigationContext) {
    globalNavigationContext.reset();
  }
  globalNavigationContext = null;
}

export default NavigationContextManager;

