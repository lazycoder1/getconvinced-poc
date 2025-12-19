import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { 
  extractPageState, 
  extractPageStateLite, 
  extractPageStateCompact, 
  DEFAULT_STATE_OPTIONS 
} from './dom-extractor';
import type { 
  Cookie, 
  BrowserbaseConfig, 
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
 * - Visual overlays
 */
export class BrowserController {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private browserbaseSessionId: string | null = null;
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
   * Create a Browserbase cloud browser session
   */
  private async createBrowserbaseSession(): Promise<string> {
    const config = this.options.browserbaseConfig;
    if (!config) {
      throw new Error('Browserbase config is required when useBrowserbase is true');
    }

    const response = await fetch('https://www.browserbase.com/v1/sessions', {
      method: 'POST',
      headers: {
        'x-bb-api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        projectId: config.projectId,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to create Browserbase session: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    console.log(`Created Browserbase session: ${data.id}`);
    return data.id;
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
      this.browserbaseSessionId = await this.createBrowserbaseSession();
      const wsEndpoint = `wss://connect.browserbase.com?apiKey=${this.options.browserbaseConfig.apiKey}&sessionId=${this.browserbaseSessionId}`;

      this.browser = await chromium.connectOverCDP(wsEndpoint);

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
    await this.getLocator(selector).click();
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

  // ============================================================================
  // Visual Overlay Methods
  // ============================================================================

  /**
   * Set a caption overlay on the page
   */
  async setCaption(text: string): Promise<void> {
    const page = this.getPage();
    await page.evaluate((caption) => {
      let overlay = document.getElementById('__agent_overlay_caption');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.id = '__agent_overlay_caption';
        overlay.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.8);
          color: white;
          padding: 12px 24px;
          border-radius: 8px;
          font-family: system-ui, sans-serif;
          font-size: 14px;
          z-index: 999999;
          pointer-events: none;
          transition: opacity 0.2s;
        `;
        document.body.appendChild(overlay);
      }
      overlay.textContent = caption;
      overlay.style.opacity = caption ? '1' : '0';
    }, text);
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

