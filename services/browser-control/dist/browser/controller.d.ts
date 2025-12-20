import { Page } from 'playwright';
import type { Cookie, BrowserControllerOptions, PageState, PageStateLite, PageStateCompact, PageStateOptions } from './types.js';
/**
 * BrowserController - Core browser automation class
 *
 * Manages a Playwright browser instance with support for:
 * - Local browser (headed/headless)
 * - Browserbase cloud browser (optional)
 * - Cookie management
 * - Navigation and interactions
 * - DOM state extraction
 * - Screenshot capture
 */
export interface ClickEvent {
    x: number;
    y: number;
    timestamp: number;
    type: 'click' | 'click_element';
    selector?: string;
}
export declare class BrowserController {
    private browser;
    private context;
    private page;
    private browserbaseSessionId;
    private clickEvents;
    private maxClickEvents;
    private tabId;
    private options;
    constructor(options?: BrowserControllerOptions);
    /**
     * Set the unique tab ID for session isolation
     */
    setTabId(tabId: string): void;
    /**
     * Get the current tab ID
     */
    getTabId(): string | null;
    /**
     * Find an existing running Browserbase session to reuse
     */
    private findExistingBrowserbaseSession;
    /**
     * Create a Browserbase cloud browser session with keepAlive enabled
     */
    private createBrowserbaseSession;
    /**
     * Connect to a Browserbase session over CDP
     */
    private connectToBrowserbaseOverCdp;
    /**
     * Reconnect to an existing Browserbase session
     */
    reconnectToBrowserbaseSession(sessionId: string): Promise<boolean>;
    /**
     * Launch the browser
     */
    launch(): Promise<void>;
    /**
     * Get the Browserbase session ID
     */
    getBrowserbaseSessionId(): string | null;
    /**
     * Get the Browserbase live view URL for debugging
     */
    getBrowserbaseLiveViewUrl(): Promise<string | null>;
    /**
     * Set cookies in the browser context
     */
    setCookies(cookies: Cookie[]): Promise<void>;
    /**
     * Get cookies from the browser context
     */
    getCookies(urls?: string[]): Promise<Cookie[]>;
    /**
     * Close the browser
     */
    close(): Promise<void>;
    /**
     * Get the current page (throws if not launched)
     */
    private getPage;
    /**
     * Navigate to a URL
     */
    navigate(url: string, options?: {
        waitForNetworkIdle?: boolean;
        skipState?: boolean;
    }): Promise<PageState | PageStateLite>;
    /**
     * Go back in history
     */
    back(): Promise<PageStateLite>;
    /**
     * Go forward in history
     */
    forward(): Promise<PageStateLite>;
    /**
     * Refresh the page
     */
    refresh(): Promise<PageStateLite>;
    /**
     * Click at coordinates
     */
    click(x: number, y: number): Promise<void>;
    /**
     * Get a locator that handles iframe selectors
     */
    private getLocator;
    /**
     * Click an element by selector
     */
    clickElement(selector: string): Promise<void>;
    /**
     * Add a click event to the tracking list
     */
    private addClickEvent;
    /**
     * Get recent click events
     */
    getClickEvents(since?: number): ClickEvent[];
    /**
     * Clear click events
     */
    clearClickEvents(): void;
    /**
     * Type text (keyboard input)
     */
    type(text: string): Promise<void>;
    /**
     * Type text into an element
     */
    typeElement(selector: string, text: string): Promise<void>;
    /**
     * Press a key
     */
    pressKey(key: string): Promise<void>;
    /**
     * Scroll the page
     */
    scroll(direction: 'up' | 'down' | 'left' | 'right', amount?: number): Promise<void>;
    /**
     * Scroll to an element
     */
    scrollToElement(selector: string): Promise<void>;
    /**
     * Hover at coordinates
     */
    hover(x: number, y: number): Promise<void>;
    /**
     * Hover over an element
     */
    hoverElement(selector: string): Promise<void>;
    /**
     * Get full page state
     */
    getState(options?: PageStateOptions): Promise<PageState>;
    /**
     * Get lite page state (quick check)
     */
    getStateLite(): Promise<PageStateLite>;
    /**
     * Get compact page state (AI-optimized)
     */
    getStateCompact(options?: PageStateOptions): Promise<PageStateCompact>;
    /**
     * Take a screenshot
     */
    screenshot(): Promise<Buffer>;
    /**
     * Get the raw Playwright page for advanced operations
     */
    getRawPage(): Page;
    /**
     * Check if browser is launched
     */
    isLaunched(): boolean;
    /**
     * Get current URL
     */
    getCurrentUrl(): string;
}
//# sourceMappingURL=controller.d.ts.map