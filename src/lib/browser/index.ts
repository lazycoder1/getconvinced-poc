/**
 * Browser Automation Module
 * 
 * Modular browser automation library built on Playwright.
 * Supports local browsers and cloud browsers (Browserbase).
 * 
 * @example
 * ```typescript
 * import { BrowserController, SessionManager } from '@/lib/browser';
 * 
 * // Direct controller usage
 * const controller = new BrowserController({ headless: false });
 * await controller.launch();
 * await controller.navigate('https://example.com');
 * const state = await controller.getStateCompact();
 * await controller.close();
 * 
 * // Session-based usage
 * const manager = new SessionManager();
 * const session = await manager.createSession();
 * const controller = manager.getController();
 * await controller.navigate('https://example.com');
 * await manager.closeSession();
 * ```
 */

// Core classes
export { BrowserController } from './controller';
export { SessionManager, getGlobalSessionManager, resetGlobalSessionManager } from './session';
export { BrowserLogger, getBrowserLogger, resetBrowserLogger } from './logger';

// HubSpot configuration
export {
  HUBSPOT_CONFIG,
  HUBSPOT_ROUTES,
  HUBSPOT_ROUTE_KEYS,
  getHubSpotUrl,
  PAIN_POINT_ROUTES,
  SCREENSHOT_ROUTE_MAP,
} from './hubspot-config';
export type { HubSpotRouteKey } from './hubspot-config';

// DOM extraction utilities
export { 
  extractPageState, 
  extractPageStateLite, 
  extractPageStateCompact,
  DEFAULT_STATE_OPTIONS 
} from './dom-extractor';

// Types
export type {
  // Actions
  BrowserAction,
  
  // Cookie types
  Cookie,
  
  // Controller options
  BrowserControllerOptions,
  BrowserbaseConfig,
  
  // Element types
  InteractiveElement,
  CompactElement,
  
  // Page state types
  PageState,
  PageStateLite,
  PageStateCompact,
  PageStateOptions,
  
  // Table types
  TableSummary,
  TableRow,
  
  // Session types
  SessionInfo,
  
  // Event types
  ServerEvent,
  
  // Demo mode types
  DemoMode,
  DemoConfig,
} from './types';

// Zod schemas for validation
export {
  ClickAction,
  ClickElementAction,
  TypeAction,
  TypeElementAction,
  KeyAction,
  ScrollAction,
  ScrollToAction,
  NavigateAction,
  SimpleAction,
  HoverAction,
  HoverElementAction,
  SetCaptionAction,
  BrowserAction as BrowserActionSchema,
} from './types';

