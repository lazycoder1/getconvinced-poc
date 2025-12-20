import { chromium } from 'playwright';
import { extractPageState, extractPageStateLite, extractPageStateCompact, DEFAULT_STATE_OPTIONS } from './dom-extractor.js';
export class BrowserController {
    browser = null;
    context = null;
    page = null;
    browserbaseSessionId = null;
    clickEvents = [];
    maxClickEvents = 50;
    tabId = null;
    options;
    constructor(options = {}) {
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
     */
    setTabId(tabId) {
        this.tabId = tabId;
        console.log(`[browserbase] Tab ID set: ${tabId}`);
    }
    /**
     * Get the current tab ID
     */
    getTabId() {
        return this.tabId;
    }
    /**
     * Find an existing running Browserbase session to reuse
     */
    async findExistingBrowserbaseSession() {
        const config = this.options.browserbaseConfig;
        if (!config)
            return null;
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
            const sessions = (Array.isArray(data) ? data : data.sessions) || [];
            const matchingSessions = Array.isArray(sessions)
                ? sessions.filter((s) => {
                    if (typeof s !== 'object' || s === null)
                        return false;
                    const session = s;
                    if (session.projectId !== config.projectId || session.status !== 'RUNNING') {
                        return false;
                    }
                    const userMetadata = session.userMetadata || {};
                    return userMetadata.tabId === this.tabId;
                })
                : [];
            if (matchingSessions.length > 0) {
                const session = matchingSessions[0];
                console.log(`[browserbase] Found existing session for tabId ${this.tabId}: ${session.id}`);
                return {
                    id: session.id,
                    connectUrl: session.connectUrl,
                };
            }
            console.log(`[browserbase] No existing session found for tabId: ${this.tabId}`);
            return null;
        }
        catch (error) {
            console.error('[browserbase] Error finding existing session:', error);
            return null;
        }
    }
    /**
     * Create a Browserbase cloud browser session with keepAlive enabled
     */
    async createBrowserbaseSession() {
        const config = this.options.browserbaseConfig;
        if (!config) {
            throw new Error('Browserbase config is required when useBrowserbase is true');
        }
        if (this.tabId) {
            const existingSession = await this.findExistingBrowserbaseSession();
            if (existingSession) {
                return existingSession;
            }
        }
        const body = {
            projectId: config.projectId,
            keepAlive: true,
        };
        if (config.region) {
            body.region = config.region;
        }
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
        return {
            id: data.id,
            connectUrl: data.connectUrl,
        };
    }
    /**
     * Connect to a Browserbase session over CDP
     */
    async connectToBrowserbaseOverCdp(connectUrl) {
        try {
            console.log(`[browserbase] connectOverCDP: ${connectUrl.replace(/apiKey=[^&]+/, 'apiKey=***')}`);
            return await chromium.connectOverCDP(connectUrl);
        }
        catch (e) {
            const msg = e instanceof Error ? e.message : String(e);
            throw new Error(`Failed to connect to Browserbase session over CDP: ${msg}`);
        }
    }
    /**
     * Reconnect to an existing Browserbase session
     */
    async reconnectToBrowserbaseSession(sessionId) {
        if (!this.options.useBrowserbase || !this.options.browserbaseConfig) {
            return false;
        }
        try {
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
            if (this.browser) {
                try {
                    await this.browser.close();
                }
                catch {
                    // Ignore errors when closing
                }
                this.browser = null;
                this.context = null;
                this.page = null;
            }
            this.browser = await this.connectToBrowserbaseOverCdp(sessionData.connectUrl);
            this.browserbaseSessionId = sessionId;
            const contexts = this.browser.contexts();
            if (contexts.length > 0) {
                this.context = contexts[0];
            }
            else {
                this.context = await this.browser.newContext({
                    viewport: this.options.viewport,
                });
            }
            const pages = this.context.pages();
            if (pages.length > 0) {
                this.page = pages[0];
            }
            else {
                this.page = await this.context.newPage();
            }
            await this.page.setViewportSize(this.options.viewport);
            console.log(`Reconnected to Browserbase session: ${sessionId}`);
            return true;
        }
        catch (error) {
            console.error(`Failed to reconnect to Browserbase session ${sessionId}:`, error);
            this.browser = null;
            this.context = null;
            this.page = null;
            return false;
        }
    }
    /**
     * Launch the browser
     */
    async launch() {
        if (this.browser) {
            throw new Error('Browser already launched');
        }
        if (this.options.useBrowserbase && this.options.browserbaseConfig) {
            const session = await this.createBrowserbaseSession();
            this.browserbaseSessionId = session.id;
            this.browser = await this.connectToBrowserbaseOverCdp(session.connectUrl);
            const contexts = this.browser.contexts();
            if (contexts.length > 0) {
                this.context = contexts[0];
            }
            else {
                this.context = await this.browser.newContext({
                    viewport: this.options.viewport,
                });
            }
            const pages = this.context.pages();
            if (pages.length > 0) {
                this.page = pages[0];
            }
            else {
                this.page = await this.context.newPage();
            }
            await this.page.setViewportSize(this.options.viewport);
            console.log(`Connected to Browserbase session: ${this.browserbaseSessionId}`);
        }
        else {
            this.browser = await chromium.launch({
                headless: this.options.headless,
            });
            this.context = await this.browser.newContext({
                viewport: this.options.viewport,
            });
            this.page = await this.context.newPage();
        }
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
            }
            catch (error) {
                console.error(`[BrowserController] Failed to set cookies:`, error);
                throw error;
            }
        }
        else {
            console.log(`[BrowserController] No cookies provided`);
        }
    }
    /**
     * Get the Browserbase session ID
     */
    getBrowserbaseSessionId() {
        return this.browserbaseSessionId;
    }
    /**
     * Get the Browserbase live view URL for debugging
     */
    async getBrowserbaseLiveViewUrl() {
        if (!this.browserbaseSessionId || !this.options.browserbaseConfig) {
            return null;
        }
        try {
            const response = await fetch(`https://www.browserbase.com/v1/sessions/${this.browserbaseSessionId}/debug`, {
                headers: {
                    'x-bb-api-key': this.options.browserbaseConfig.apiKey,
                },
            });
            if (!response.ok) {
                console.error(`Failed to get Browserbase debug URL: ${response.status}`);
                return null;
            }
            const data = await response.json();
            return data.debuggerFullscreenUrl || null;
        }
        catch (error) {
            console.error('Error getting Browserbase live view URL:', error);
            return null;
        }
    }
    /**
     * Set cookies in the browser context
     */
    async setCookies(cookies) {
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
    async getCookies(urls) {
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
            sameSite: c.sameSite,
        }));
    }
    /**
     * Close the browser
     */
    async close() {
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
    getPage() {
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
    async navigate(url, options) {
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
    async back() {
        const page = this.getPage();
        await page.goBack({ waitUntil: 'domcontentloaded' });
        return this.getStateLite();
    }
    /**
     * Go forward in history
     */
    async forward() {
        const page = this.getPage();
        await page.goForward({ waitUntil: 'domcontentloaded' });
        return this.getStateLite();
    }
    /**
     * Refresh the page
     */
    async refresh() {
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
    async click(x, y) {
        const page = this.getPage();
        await page.mouse.click(x, y);
        this.addClickEvent({ x, y, timestamp: Date.now(), type: 'click' });
    }
    /**
     * Get a locator that handles iframe selectors
     */
    getLocator(selector) {
        const page = this.getPage();
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
    async clickElement(selector) {
        const locator = this.getLocator(selector);
        try {
            const box = await locator.boundingBox();
            await locator.click();
            if (box) {
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
        }
        catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            if (msg.includes('strict mode violation')) {
                try {
                    const count = await locator.count();
                    throw new Error(`Click failed: selector matched ${count} elements (strict mode). ` +
                        `Refine your selector (use browser_get_state to find a unique selector) ` +
                        `or use browser_click_text with an index parameter.`);
                }
                catch {
                    // Fall through if count failed
                }
            }
            throw err;
        }
    }
    /**
     * Add a click event to the tracking list
     */
    addClickEvent(event) {
        this.clickEvents.push(event);
        if (this.clickEvents.length > this.maxClickEvents) {
            this.clickEvents = this.clickEvents.slice(-this.maxClickEvents);
        }
    }
    /**
     * Get recent click events
     */
    getClickEvents(since) {
        if (since) {
            return this.clickEvents.filter(e => e.timestamp >= since);
        }
        return [...this.clickEvents];
    }
    /**
     * Clear click events
     */
    clearClickEvents() {
        this.clickEvents = [];
    }
    /**
     * Type text (keyboard input)
     */
    async type(text) {
        const page = this.getPage();
        await page.keyboard.type(text);
    }
    /**
     * Type text into an element
     */
    async typeElement(selector, text) {
        await this.getLocator(selector).fill(text);
    }
    /**
     * Press a key
     */
    async pressKey(key) {
        const page = this.getPage();
        await page.keyboard.press(key);
    }
    /**
     * Scroll the page
     */
    async scroll(direction, amount = 300) {
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
    async scrollToElement(selector) {
        await this.getLocator(selector).scrollIntoViewIfNeeded();
    }
    /**
     * Hover at coordinates
     */
    async hover(x, y) {
        const page = this.getPage();
        await page.mouse.move(x, y);
    }
    /**
     * Hover over an element
     */
    async hoverElement(selector) {
        await this.getLocator(selector).hover();
    }
    // ============================================================================
    // State Extraction Methods
    // ============================================================================
    /**
     * Get full page state
     */
    async getState(options) {
        const page = this.getPage();
        const opts = { ...DEFAULT_STATE_OPTIONS, ...options };
        const mainState = await extractPageState(page, opts);
        if (opts.includeIframes) {
            for (const frame of page.frames()) {
                if (frame === page.mainFrame())
                    continue;
                try {
                    if (frame.isDetached())
                        continue;
                    const frameState = await extractPageState(frame, opts);
                    mainState.html += `\n<!-- IFRAME: ${frame.url()} -->\n${frameState.html}\n`;
                    mainState.textContent += ` [IFRAME: ${frameState.textContent}]`;
                    let frameSelector = '';
                    try {
                        const frameElement = await frame.frameElement();
                        if (frameElement) {
                            frameSelector = await frameElement.evaluate((el) => {
                                const iframe = el;
                                if (iframe.id)
                                    return `iframe[id="${iframe.id}"]`;
                                if (iframe.name)
                                    return `iframe[name="${iframe.name}"]`;
                                if (iframe.src)
                                    return `iframe[src="${iframe.getAttribute('src')}"]`;
                                return '';
                            });
                        }
                    }
                    catch { }
                    if (!frameSelector) {
                        frameSelector = `iframe[src="${frame.url()}"]`;
                    }
                    const frameElements = frameState.interactiveElements.map(el => ({
                        ...el,
                        selector: `${frameSelector} >> ${el.selector}`,
                        attributes: { ...el.attributes, frameUrl: frame.url() }
                    }));
                    mainState.interactiveElements.push(...frameElements);
                }
                catch (e) {
                    console.warn(`Failed to extract frame state: ${e}`);
                }
            }
        }
        return mainState;
    }
    /**
     * Get lite page state (quick check)
     */
    async getStateLite() {
        const page = this.getPage();
        return extractPageStateLite(page);
    }
    /**
     * Get compact page state (AI-optimized)
     */
    async getStateCompact(options) {
        const page = this.getPage();
        return extractPageStateCompact(page, options);
    }
    /**
     * Take a screenshot
     */
    async screenshot() {
        const page = this.getPage();
        return page.screenshot({ type: 'png' });
    }
    /**
     * Get the raw Playwright page for advanced operations
     */
    getRawPage() {
        return this.getPage();
    }
    /**
     * Check if browser is launched
     */
    isLaunched() {
        return this.browser !== null;
    }
    /**
     * Get current URL
     */
    getCurrentUrl() {
        if (!this.page)
            return '';
        return this.page.url();
    }
}
//# sourceMappingURL=controller.js.map