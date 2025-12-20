// Core classes
export { BrowserController } from './controller.js';
export { SessionManager, getSessionManager } from './session.js';
export { BrowserLogger, getBrowserLogger } from './logger.js';
// DOM extraction utilities
export { extractPageState, extractPageStateLite, extractPageStateCompact, DEFAULT_STATE_OPTIONS } from './dom-extractor.js';
// Zod schemas for validation
export { ClickAction, ClickElementAction, TypeAction, TypeElementAction, KeyAction, ScrollAction, ScrollToAction, NavigateAction, SimpleAction, HoverAction, HoverElementAction, BrowserAction as BrowserActionSchema, } from './types.js';
//# sourceMappingURL=index.js.map