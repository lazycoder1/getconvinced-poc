// Core classes
export { BrowserController, type ClickEvent } from './controller.js';
export { SessionManager, getSessionManager, type SessionEntry } from './session.js';
export { BrowserLogger, getBrowserLogger } from './logger.js';

// DOM extraction utilities
export {
  extractPageState,
  extractPageStateLite,
  extractPageStateCompact,
  DEFAULT_STATE_OPTIONS
} from './dom-extractor.js';

// Types
export type {
  BrowserAction,
  Cookie,
  BrowserControllerOptions,
  BrowserbaseConfig,
  InteractiveElement,
  CompactElement,
  PageState,
  PageStateLite,
  PageStateCompact,
  PageStateOptions,
  TableSummary,
  TableRow,
  SessionInfo,
} from './types.js';

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
  BrowserAction as BrowserActionSchema,
} from './types.js';

