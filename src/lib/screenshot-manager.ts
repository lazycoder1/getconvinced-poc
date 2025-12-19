/**
 * Screenshot Manager
 *
 * Manages the currently active screenshot with event-based synchronization
 * between voice agent tools and UI components.
 */

export interface Screenshot {
    id?: number | string;
    filename: string;
    s3_key?: string;
    s3_url: string;
    description?: string | null;
    annotation?: string | null;
    sort_order?: number;
}

type ScreenshotChangeListener = (screenshot: Screenshot | null, previousScreenshot: Screenshot | null) => void;

/**
 * ScreenshotManager - Centralized state for active screenshot
 *
 * Provides:
 * - Current active screenshot state
 * - Event subscription for screenshot changes
 * - Bidirectional sync between UI and voice agent
 */
class ScreenshotManager {
    private activeScreenshot: Screenshot | null = null;
    private availableScreenshots: Screenshot[] = [];
    private listeners: Set<ScreenshotChangeListener> = new Set();

    /**
     * Get currently active screenshot
     */
    getActive(): Screenshot | null {
        return this.activeScreenshot;
    }

    /**
     * Get all available screenshots
     */
    getAvailable(): Screenshot[] {
        return [...this.availableScreenshots];
    }

    /**
     * Set available screenshots (called during initialization)
     */
    setAvailable(screenshots: Screenshot[]): void {
        this.availableScreenshots = screenshots;
        console.log(`[ScreenshotManager] Loaded ${screenshots.length} screenshots`);
    }

    /**
     * Set active screenshot by filename
     * Returns the screenshot if found, null otherwise
     */
    setActiveByFilename(filename: string): Screenshot | null {
        const screenshot = this.availableScreenshots.find(
            s => s.filename.toLowerCase() === filename.toLowerCase()
        );

        if (screenshot) {
            this.setActive(screenshot);
            return screenshot;
        }

        console.warn(`[ScreenshotManager] Screenshot not found: ${filename}`);
        return null;
    }

    /**
     * Set active screenshot
     * Notifies all listeners of the change
     */
    setActive(screenshot: Screenshot | null): void {
        const previousScreenshot = this.activeScreenshot;

        // Skip if same screenshot
        if (screenshot?.filename === previousScreenshot?.filename) return;

        this.activeScreenshot = screenshot;
        console.log(`[ScreenshotManager] Changed to: ${screenshot?.filename || 'none'}`);

        // Notify all listeners
        this.listeners.forEach(listener => {
            try {
                listener(screenshot, previousScreenshot);
            } catch (error) {
                console.error('[ScreenshotManager] Listener error:', error);
            }
        });

        // Emit custom event for components that prefer DOM events
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('screenshot:change', {
                detail: { screenshot, previousScreenshot }
            }));
        }
    }

    /**
     * Clear active screenshot
     */
    clear(): void {
        this.setActive(null);
    }

    /**
     * Subscribe to screenshot changes
     * Returns unsubscribe function
     */
    subscribe(listener: ScreenshotChangeListener): () => void {
        this.listeners.add(listener);
        return () => {
            this.listeners.delete(listener);
        };
    }

    /**
     * Find screenshot by partial match (filename, description, or annotation)
     */
    findByMatch(query: string): Screenshot | null {
        const lowerQuery = query.toLowerCase();
        return this.availableScreenshots.find(s =>
            s.filename.toLowerCase().includes(lowerQuery) ||
            s.description?.toLowerCase().includes(lowerQuery) ||
            s.annotation?.toLowerCase().includes(lowerQuery)
        ) || null;
    }
}

// ============================================================================
// Global Singleton
// ============================================================================

let instance: ScreenshotManager | null = null;

/**
 * Get the global screenshot manager
 */
export function getScreenshotManager(): ScreenshotManager {
    if (!instance) {
        instance = new ScreenshotManager();
    }
    return instance;
}

/**
 * Reset the screenshot manager (for testing)
 */
export function resetScreenshotManager(): void {
    if (instance) {
        instance.clear();
    }
    instance = null;
}

// Export the class for typing
export { ScreenshotManager };

// Export types
export type { ScreenshotChangeListener };
