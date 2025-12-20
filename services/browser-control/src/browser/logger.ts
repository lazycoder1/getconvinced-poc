/**
 * Browser Logger - Structured logging for browser automation
 */

export interface LogEntry {
  timestamp: string;
  sessionId?: string;
  type: 'action' | 'response' | 'error' | 'state' | 'agent' | 'browser';
  action?: string;
  data: unknown;
  duration?: number;
}

export class BrowserLogger {
  private entries: LogEntry[] = [];
  private sessionId?: string;
  private maxEntries: number;
  private onLogCallback?: (entry: LogEntry) => void;

  constructor(options: { maxEntries?: number; onLog?: (entry: LogEntry) => void } = {}) {
    this.maxEntries = options.maxEntries ?? 1000;
    this.onLogCallback = options.onLog;
  }

  /**
   * Set the current session ID
   */
  setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
  }

  /**
   * Clear the session ID
   */
  clearSessionId(): void {
    this.sessionId = undefined;
  }

  /**
   * Log an entry
   */
  log(type: LogEntry['type'], action: string | undefined, data: unknown, duration?: number): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      sessionId: this.sessionId,
      type,
      action,
      data,
      duration,
    };

    this.entries.push(entry);

    // Trim entries if over limit
    if (this.entries.length > this.maxEntries) {
      this.entries = this.entries.slice(-this.maxEntries);
    }

    // Console output for debugging
    const durationStr = duration ? ` (${duration}ms)` : '';
    console.log(`[Browser:${type}]${action ? ` ${action}` : ''}${durationStr}`);

    // Callback for external handling
    if (this.onLogCallback) {
      this.onLogCallback(entry);
    }

    return entry;
  }

  /**
   * Log an action
   */
  logAction(action: string, data: unknown): LogEntry {
    return this.log('action', action, data);
  }

  /**
   * Log a response
   */
  logResponse(action: string, data: unknown, duration: number): LogEntry {
    return this.log('response', action, data, duration);
  }

  /**
   * Log an error
   */
  logError(action: string, error: unknown): LogEntry {
    const errorData = error instanceof Error
      ? { message: error.message, stack: error.stack }
      : { message: String(error) };
    return this.log('error', action, errorData);
  }

  /**
   * Log an agent event
   */
  logAgent(action: string, data: unknown, duration?: number): LogEntry {
    return this.log('agent', action, data, duration);
  }

  /**
   * Log a browser event
   */
  logBrowser(action: string, data: unknown, duration?: number): LogEntry {
    return this.log('browser', action, data, duration);
  }

  /**
   * Log page state
   */
  logState(data: unknown): LogEntry {
    return this.log('state', undefined, data);
  }

  /**
   * Get all entries
   */
  getEntries(): LogEntry[] {
    return [...this.entries];
  }

  /**
   * Get entries by type
   */
  getEntriesByType(type: LogEntry['type']): LogEntry[] {
    return this.entries.filter(e => e.type === type);
  }

  /**
   * Get recent entries
   */
  getRecentEntries(count: number = 10): LogEntry[] {
    return this.entries.slice(-count);
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
  }
}

// Global logger instance for the service
let globalLogger: BrowserLogger | null = null;

export function getBrowserLogger(): BrowserLogger {
  if (!globalLogger) {
    globalLogger = new BrowserLogger();
  }
  return globalLogger;
}

