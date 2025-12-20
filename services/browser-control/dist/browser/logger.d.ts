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
export declare class BrowserLogger {
    private entries;
    private sessionId?;
    private maxEntries;
    private onLogCallback?;
    constructor(options?: {
        maxEntries?: number;
        onLog?: (entry: LogEntry) => void;
    });
    /**
     * Set the current session ID
     */
    setSessionId(sessionId: string): void;
    /**
     * Clear the session ID
     */
    clearSessionId(): void;
    /**
     * Log an entry
     */
    log(type: LogEntry['type'], action: string | undefined, data: unknown, duration?: number): LogEntry;
    /**
     * Log an action
     */
    logAction(action: string, data: unknown): LogEntry;
    /**
     * Log a response
     */
    logResponse(action: string, data: unknown, duration: number): LogEntry;
    /**
     * Log an error
     */
    logError(action: string, error: unknown): LogEntry;
    /**
     * Log an agent event
     */
    logAgent(action: string, data: unknown, duration?: number): LogEntry;
    /**
     * Log a browser event
     */
    logBrowser(action: string, data: unknown, duration?: number): LogEntry;
    /**
     * Log page state
     */
    logState(data: unknown): LogEntry;
    /**
     * Get all entries
     */
    getEntries(): LogEntry[];
    /**
     * Get entries by type
     */
    getEntriesByType(type: LogEntry['type']): LogEntry[];
    /**
     * Get recent entries
     */
    getRecentEntries(count?: number): LogEntry[];
    /**
     * Clear all entries
     */
    clear(): void;
}
export declare function getBrowserLogger(): BrowserLogger;
//# sourceMappingURL=logger.d.ts.map