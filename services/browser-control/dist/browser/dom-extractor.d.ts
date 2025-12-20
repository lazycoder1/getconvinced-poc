import type { Page, Frame } from 'playwright';
import type { PageState, PageStateOptions, PageStateLite, PageStateCompact } from './types.js';
export declare const DEFAULT_STATE_OPTIONS: Required<PageStateOptions>;
/**
 * Extract full page state including HTML, text content, and interactive elements
 */
export declare function extractPageState(page: Page | Frame, options?: PageStateOptions): Promise<PageState>;
/**
 * Quick lite state for post-action checks
 */
export declare function extractPageStateLite(page: Page | Frame): Promise<PageStateLite>;
/**
 * Compact state optimized for AI - groups elements by type, extracts table data
 */
export declare function extractPageStateCompact(page: Page | Frame, options?: PageStateOptions): Promise<PageStateCompact>;
//# sourceMappingURL=dom-extractor.d.ts.map