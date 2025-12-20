import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { 
  extractPageState, 
  extractPageStateLite, 
  extractPageStateCompact, 
  DEFAULT_STATE_OPTIONS 
} from './dom-extractor';
import type {
  Cookie,
  BrowserControllerOptions,
  PageState,
  PageStateLite,
  PageStateCompact,
  PageStateOptions
} from './types';

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

export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private browserbaseSessionId: string | null = null;
  private clickEvents: ClickEvent[] = [];
  private maxClickEvents = 50; // Keep last 50 clicks
  private tabId: string | null = null; // Unique identifier for this tab/session
  private options: BrowserControllerOptions & {
    headless: boolean;
    viewport: { width: number; height: number }
  };

  constructor(options: BrowserControllerOptions = {}) {
    this.options = {
      headless: options.headless ?? false,
      viewport: options.viewport ?? { width: 1280, height: 1032 },
      cookies: options.cookies,
      useBrowserbase: options.useBrowserbase,
      browserbaseConfig: options.browserbaseConfig,
    };
  }

  /**
   * Set the unique tab ID for session isolation
   * This ensures we only reuse sessions belonging to this specific tab
   */
  setTabId(tabId: string): void {
    this.tabId = tabId;
    console.log(`[browserbase] Tab ID set: ${tabId}`);
  }

  /**
   * Get the current tab ID
   */
  getTabId(): string | null {
    return this.tabId;
  }

  /**
   * Find an existing running Browserbase session to reuse
   * Only returns sessions that match our unique tabId to prevent session stealing
   * Returns the session info (id and connectUrl) if found, null otherwise
   */
  private async findExistingBrowserbaseSession(): Promise<{ id: string; connectUrl: string } | null> {
    const config = this.options.browserbaseConfig;
    if (!config) return null;

    // Without a tabId, we can't safely identify our own session
    if (!this.tabId) {
      console.log('[browserbase] No tabId set - cannot reuse sessions safely');
      return null;
    }

    try {
      const response = await fetch('https://www.browserbase.com/v1/sessions?status=RUNNING', {
        method: 'GET',
        headers: {
          'x-bb-api-key': config.apiKey,
        },
      });

      if (!response.ok) {
        console.log('[browserbase] Failed to list sessions:', response.status);
        return null;
      }

      const data = await response.json();
      const sessions = data.sessions || data || [];

      // Find a session in our project that matches our tabId
      const matchingSessions = Array.isArray(sessions)
        ? sessions.filter((s: any) => {
            // Must be in our project and running
            if (s.projectId !== config.projectId || s.status !== 'RUNNING') {
              return false;
            }
            // Must match our tabId in userMetadata
            const userMetadata = s.userMetadata || {};
            return userMetadata.tabId === this.tabId;
          })
        : [];

      if (matchingSessions.length > 0) {
        const session = matchingSessions[0];
        console.log(`[browserbase] Found existing session for tabId ${this.tabId}: ${session.id}`);
        // Return both id and connectUrl from the API response
        return {
          id: session.id,
          connectUrl: session.connectUrl,
        };
      }

      console.log(`[browserbase] No existing session found for tabId: ${this.tabId}`);
      return null;
    } catch (error) {
      console.error('[browserbase] Error finding existing session:', error);
      return null;
    }
  }

  /**
   * Create a Browserbase cloud browser session with keepAlive enabled
   * Sessions are tagged with the tabId for proper isolation
   * Returns both session ID and connectUrl from the API
   */
  private async createBrowserbaseSession(): Promise<{ id: string; connectUrl: string }> {
    const config = this.options.browserbaseConfig;
    if (!config) {
      throw new Error('Browserbase config is required when useBrowserbase is true');
    }

    // First, try to find an existing running session (only if we have a tabId)
    if (this.tabId) {
      const existingSession = await this.findExistingBrowserbaseSession();
      if (existingSession) {
        return existingSession;
      }
    }

    // Create new session with keepAlive enabled and tabId in metadata
    const body: Record<string, unknown> = {
      projectId: config.projectId,
      keepAlive: true, // Keep session alive even after disconnect
    };
    if (config.region) {
      body.region = config.region;
    }
    // Add tabId to userMetadata for session isolation
    if (this.tabId) {
      body.userMetadata = {
        tabId: this.tabId,
        createdAt: new Date().toISOString(),
      };
    }

    const response = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'x-bb-api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Browserbase session: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`[browserbase] Created new session with keepAlive (tabId: ${this.tabId || 'none'}): ${data.id}`);

    // Return both id and connectUrl from the API response
    return {
      id: data.id,
      connectUrl: data.connectUrl,
    };
  }

  /**
   * Connect to a Browserbase session over CDP using the connectUrl from the API
   */
  private async connectToBrowserbaseOverCdp(connectUrl: string): Promise<Browser> {
    try {
      console.log(`[browserbase] connectOverCDP: ${connectUrl.replace(/apiKey=[^&]+/, 'apiKey=***')}`);
      return await chromium.connectOverCDP(connectUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      throw new Error(`Failed to connect to Browserbase session over CDP: ${msg}`);
    }
  }

  /**
   * Reconnect to an existing Browserbase session
   */
  async reconnectToBrowserbaseSession(sessionId: string): Promise<boolean> {
    if (!this.options.useBrowserbase || !this.options.browserbaseConfig) {
      return false;
    }

    try {
      // Get session details to retrieve the connectUrl
      const config = this.options.browserbaseConfig;
      const response = await fetch(`https://www.browserbase.com/v1/sessions/${sessionId}`, {
        headers: { 'x-bb-api-key': config.apiKey },
      });

      if (!response.ok) {
        console.log(`[browserbase] Failed to get session details: ${response.status}`);
        return false;
      }

      const sessionData = await response.json();
      if (!sessionData.connectUrl) {
        console.log('[browserbase] Session does not have a connectUrl');
        return false;
      }

      // Close existing browser connection if any
      if (this.browser) {
        try {
          await this.browser.close();
        } catch (e) {
          // Ignore errors when closing
        }
        this.browser = null;
        this.context = null;
        this.page = null;
      }

      this.browser = await this.connectToBrowserbaseOverCdp(sessionData.connectUrl);
      this.browserbaseSessionId = sessionId;

      // Get the default context from the connected browser
      const contexts = this.browser.contexts();
      if (contexts.length > 0) {
        this.context = contexts[0];
      } else {
        this.context = await this.browser.newContext({
          viewport: this.options.viewport,
        });
      }

      // Get existing page or create new one
      const pages = this.context.pages();
      if (pages.length > 0) {
        this.page = pages[0];
      } else {
        this.page = await this.context.newPage();
      }

      // Set viewport on existing page
      await this.page.setViewportSize(this.options.viewport);

      console.log(`Reconnected to Browserbase session: ${sessionId}`);
      return true;
    } catch (error) {
      console.error(`Failed to reconnect to Browserbase session ${sessionId}:`, error);
      // Clean up on failure
      this.browser = null;
      this.context = null;
      this.page = null;
      return false;
    }
  }

  /**
   * Launch the browser
   */
  async launch(): Promise<void> {
    if (this.browser) {
      throw new Error('Browser already launched');
    }

    if (this.options.useBrowserbase && this.options.browserbaseConfig) {
      // Connect to Browserbase cloud browser
      const session = await this.createBrowserbaseSession();
      this.browserbaseSessionId = session.id;
      this.browser = await this.connectToBrowserbaseOverCdp(session.connectUrl);

      // Get the default context from the connected browser
      const contexts = this.browser.contexts();
      if (contexts.length > 0) {
        this.context = contexts[0];
      } else {
        this.context = await this.browser.newContext({
          viewport: this.options.viewport,
        });
      }

      // Get existing page or create new one
      const pages = this.context.pages();
      if (pages.length > 0) {
        this.page = pages[0];
      } else {
        this.page = await this.context.newPage();
      }

      // Set viewport on existing page
      await this.page.setViewportSize(this.options.viewport);

      console.log(`Connected to Browserbase session: ${this.browserbaseSessionId}`);
    } else {
      // Launch local Chromium browser
      this.browser = await chromium.launch({
        headless: this.options.headless,
      });

      this.context = await this.browser.newContext({
        viewport: this.options.viewport,
      });

      this.page = await this.context.newPage();
    }

    // Inject cookies if provided
    if (this.options.cookies && this.options.cookies.length > 0) {
      console.log(`[BrowserController] Setting ${this.options.cookies.length} cookies`);
      try {
        await this.context.addCookies(this.options.cookies.map(c => ({
          name: c.name,
          value: c.value,
          domain: c.domain,
          path: c.path || '/',
          expires: c.expires,
          httpOnly: c.httpOnly,
          secure: c.secure,
          sameSite: c.sameSite,
        })));
        console.log(`[BrowserController] Successfully set ${this.options.cookies.length} cookies`);
      } catch (error) {
        console.error(`[BrowserController] Failed to set cookies:`, error);
        throw error;
      }
    } else {
      console.log(`[BrowserController] No cookies provided`);
    }
  }

  /**
   * Get the Browserbase session ID (if using Browserbase)
   */
  getBrowserbaseSessionId(): string | null {
    return this.browserbaseSessionId;
  }

  /**
   * Get the Browserbase live view URL for debugging
   */
  async getBrowserbaseLiveViewUrl(): Promise<string | null> {
    if (!this.browserbaseSessionId || !this.options.browserbaseConfig) {
      return null;
    }

    try {
      const response = await fetch(
        `https://www.browserbase.com/v1/sessions/${this.browserbaseSessionId}/debug`,
        {
          headers: {
            'x-bb-api-key': this.options.browserbaseConfig.apiKey,
          },
        }
      );

      if (!response.ok) {
        console.error(`Failed to get Browserbase debug URL: ${response.status}`);
        return null;
      }

      const data = await response.json();
      return data.debuggerFullscreenUrl || null;
    } catch (error) {
      console.error('Error getting Browserbase live view URL:', error);
      return null;
    }
  }

  /**
   * Set cookies in the browser context
   */
  async setCookies(cookies: Cookie[]): Promise<void> {
    if (!this.context) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    await this.context.addCookies(cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path || '/',
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite,
    })));
  }

  /**
   * Get cookies from the browser context
   */
  async getCookies(urls?: string[]): Promise<Cookie[]> {
    if (!this.context) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    const cookies = await this.context.cookies(urls);
    return cookies.map(c => ({
      name: c.name,
      value: c.value,
      domain: c.domain,
      path: c.path,
      expires: c.expires,
      httpOnly: c.httpOnly,
      secure: c.secure,
      sameSite: c.sameSite as Cookie['sameSite'],
    }));
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
    }
  }

  /**
   * Get the current page (throws if not launched)
   */
  private getPage(): Page {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.page;
  }

  // ============================================================================
  // Navigation Methods
  // ============================================================================

  /**
   * Navigate to a URL
   */
  async navigate(url: string, options?: { 
    waitForNetworkIdle?: boolean; 
    skipState?: boolean 
  }): Promise<PageState | PageStateLite> {
    const page = this.getPage();
    const waitUntil = options?.waitForNetworkIdle ? 'networkidle' : 'domcontentloaded';
    await page.goto(url, { waitUntil, timeout: 30000 });

    if (options?.skipState) {
      return this.getStateLite();
    }
    return this.getState();
  }

  /**
   * Go back in history
   */
  async back(): Promise<PageStateLite> {
    const page = this.getPage();
    await page.goBack({ waitUntil: 'domcontentloaded' });
    return this.getStateLite();
  }

  /**
   * Go forward in history
   */
  async forward(): Promise<PageStateLite> {
    const page = this.getPage();
    await page.goForward({ waitUntil: 'domcontentloaded' });
    return this.getStateLite();
  }

  /**
   * Refresh the page
   */
  async refresh(): Promise<PageStateLite> {
    const page = this.getPage();
    await page.reload({ waitUntil: 'domcontentloaded' });
    return this.getStateLite();
  }

  // ============================================================================
  // Interaction Methods
  // ============================================================================

  /**
   * Click at coordinates
   */
  async click(x: number, y: number): Promise<void> {
    const page = this.getPage();
    await page.mouse.click(x, y);
    
    // Track click event
    this.addClickEvent({ x, y, timestamp: Date.now(), type: 'click' });
  }

  /**
   * Get a locator that handles iframe selectors
   */
  private getLocator(selector: string) {
    const page = this.getPage();
    // Check if it's an iframe selector (format: iframe[...] >> selector)
    if (selector.startsWith('iframe[')) {
      const parts = selector.split(' >> ');
      if (parts.length >= 2) {
        const frameSelector = parts[0];
        const elementSelector = parts.slice(1).join(' >> ');
        return page.frameLocator(frameSelector).locator(elementSelector);
      }
    }
    return page.locator(selector);
  }

  /**
   * Click an element by selector
   */
  async clickElement(selector: string): Promise<void> {
    const locator = this.getLocator(selector);
    try {
      // Get bounding box before clicking to track where the click happened
      const box = await locator.boundingBox();
      await locator.click();
      
      // Track click event with element position
      if (box) {
        // Center of the element
        const x = box.x + box.width / 2;
        const y = box.y + box.height / 2;
        this.addClickEvent({ 
          x, 
          y, 
          timestamp: Date.now(), 
          type: 'click_element',
          selector 
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Playwright "strict mode violation" means the selector matched multiple elements.
      if (msg.includes('strict mode violation')) {
        try {
          const count = await locator.count();
          throw new Error(
            `Click failed: selector matched ${count} elements (strict mode). ` +
              `Refine your selector (use browser_get_state to find a unique selector) ` +
              `or use browser_click_text with an index parameter.`
          );
        } catch {
          // Fall through if count failed
        }
      }
      throw err;
    }
  }
  
  /**
   * Add a click event to the tracking list
   */
  private addClickEvent(event: ClickEvent): void {
    this.clickEvents.push(event);
    // Keep only the last N events
    if (this.clickEvents.length > this.maxClickEvents) {
      this.clickEvents = this.clickEvents.slice(-this.maxClickEvents);
    }
  }
  
  /**
   * Get recent click events
   */
  getClickEvents(since?: number): ClickEvent[] {
    if (since) {
      return this.clickEvents.filter(e => e.timestamp >= since);
    }
    return [...this.clickEvents];
  }
  
  /**
   * Clear click events
   */
  clearClickEvents(): void {
    this.clickEvents = [];
  }

  /**
   * Type text (keyboard input)
   */
  async type(text: string): Promise<void> {
    const page = this.getPage();
    await page.keyboard.type(text);
  }

  /**
   * Type text into an element
   */
  async typeElement(selector: string, text: string): Promise<void> {
    await this.getLocator(selector).fill(text);
  }

  /**
   * Press a key
   */
  async pressKey(key: string): Promise<void> {
    const page = this.getPage();
    await page.keyboard.press(key);
  }

  /**
   * Scroll the page
   */
  async scroll(direction: 'up' | 'down' | 'left' | 'right', amount: number = 300): Promise<void> {
    const page = this.getPage();

    let deltaX = 0;
    let deltaY = 0;

    switch (direction) {
      case 'up':
        deltaY = -amount;
        break;
      case 'down':
        deltaY = amount;
        break;
      case 'left':
        deltaX = -amount;
        break;
      case 'right':
        deltaX = amount;
        break;
    }

    await page.mouse.wheel(deltaX, deltaY);
  }

  /**
   * Scroll to an element
   */
  async scrollToElement(selector: string): Promise<void> {
    await this.getLocator(selector).scrollIntoViewIfNeeded();
  }

  /**
   * Hover at coordinates
   */
  async hover(x: number, y: number): Promise<void> {
    const page = this.getPage();
    await page.mouse.move(x, y);
  }

  /**
   * Hover over an element
   */
  async hoverElement(selector: string): Promise<void> {
    await this.getLocator(selector).hover();
  }

  // ============================================================================
  // State Extraction Methods
  // ============================================================================

  /**
   * Get full page state
   */
  async getState(options?: PageStateOptions): Promise<PageState> {
    const page = this.getPage();
    const opts = { ...DEFAULT_STATE_OPTIONS, ...options };
    const mainState = await extractPageState(page, opts);

    // Optionally extract iframe content
    if (opts.includeIframes) {
      for (const frame of page.frames()) {
        if (frame === page.mainFrame()) continue;

        try {
          if (frame.isDetached()) continue;

          const frameState = await extractPageState(frame, opts);

          mainState.html += `\n<!-- IFRAME: ${frame.url()} -->\n${frameState.html}\n`;
          mainState.textContent += ` [IFRAME: ${frameState.textContent}]`;

          let frameSelector = '';
          try {
            const frameElement = await frame.frameElement();
            if (frameElement) {
              frameSelector = await frameElement.evaluate((el: Element) => {
                const iframe = el as HTMLIFrameElement;
                if (iframe.id) return `iframe[id="${iframe.id}"]`;
                if (iframe.name) return `iframe[name="${iframe.name}"]`;
                if (iframe.src) return `iframe[src="${iframe.getAttribute('src')}"]`;
                return '';
              });
            }
          } catch (e) { }

          if (!frameSelector) {
            frameSelector = `iframe[src="${frame.url()}"]`;
          }

          const frameElements = frameState.interactiveElements.map(el => ({
            ...el,
            selector: `${frameSelector} >> ${el.selector}`,
            attributes: { ...el.attributes, frameUrl: frame.url() }
          }));

          mainState.interactiveElements.push(...frameElements);
        } catch (e) {
          console.warn(`Failed to extract frame state: ${e}`);
        }
      }
    }

    return mainState;
  }

  /**
   * Get lite page state (quick check)
   */
  async getStateLite(): Promise<PageStateLite> {
    const page = this.getPage();
    return extractPageStateLite(page);
  }

  /**
   * Get compact page state (AI-optimized)
   */
  async getStateCompact(options?: PageStateOptions): Promise<PageStateCompact> {
    const page = this.getPage();
    return extractPageStateCompact(page, options);
  }

  /**
   * Take a screenshot
   */
  async screenshot(): Promise<Buffer> {
    const page = this.getPage();
    return page.screenshot({ type: 'png' });
  }


  /**
   * Get the raw Playwright page for advanced operations
   */
  getRawPage(): Page {
    return this.getPage();
  }

  /**
   * Check if browser is launched
   */
  isLaunched(): boolean {
    return this.browser !== null;
  }

  /**
   * Get current URL
   */
  getCurrentUrl(): string {
    if (!this.page) return '';
    return this.page.url();
  }
}

