/**
 * Browser Logger - Structured logging for browser automation
 */
export class BrowserLogger {
    entries = [];
    sessionId;
    maxEntries;
    onLogCallback;
    constructor(options = {}) {
        this.maxEntries = options.maxEntries ?? 1000;
        this.onLogCallback = options.onLog;
    }
    /**
     * Set the current session ID
     */
    setSessionId(sessionId) {
        this.sessionId = sessionId;
    }
    /**
     * Clear the session ID
     */
    clearSessionId() {
        this.sessionId = undefined;
    }
    /**
     * Log an entry
     */
    log(type, action, data, duration) {
        const entry = {
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
    logAction(action, data) {
        return this.log('action', action, data);
    }
    /**
     * Log a response
     */
    logResponse(action, data, duration) {
        return this.log('response', action, data, duration);
    }
    /**
     * Log an error
     */
    logError(action, error) {
        const errorData = error instanceof Error
            ? { message: error.message, stack: error.stack }
            : { message: String(error) };
        return this.log('error', action, errorData);
    }
    /**
     * Log an agent event
     */
    logAgent(action, data, duration) {
        return this.log('agent', action, data, duration);
    }
    /**
     * Log a browser event
     */
    logBrowser(action, data, duration) {
        return this.log('browser', action, data, duration);
    }
    /**
     * Log page state
     */
    logState(data) {
        return this.log('state', undefined, data);
    }
    /**
     * Get all entries
     */
    getEntries() {
        return [...this.entries];
    }
    /**
     * Get entries by type
     */
    getEntriesByType(type) {
        return this.entries.filter(e => e.type === type);
    }
    /**
     * Get recent entries
     */
    getRecentEntries(count = 10) {
        return this.entries.slice(-count);
    }
    /**
     * Clear all entries
     */
    clear() {
        this.entries = [];
    }
}
// Global logger instance for the service
let globalLogger = null;
export function getBrowserLogger() {
    if (!globalLogger) {
        globalLogger = new BrowserLogger();
    }
    return globalLogger;
}
//# sourceMappingURL=logger.js.map