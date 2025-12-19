import { z } from 'zod';

// ============================================================================
// Browser Actions - Zod Schemas
// ============================================================================

export const ClickAction = z.object({
  type: z.literal('click'),
  x: z.number(),
  y: z.number(),
});

export const ClickElementAction = z.object({
  type: z.literal('click_element'),
  selector: z.string(),
});

export const TypeAction = z.object({
  type: z.literal('type'),
  text: z.string(),
});

export const TypeElementAction = z.object({
  type: z.literal('type_element'),
  selector: z.string(),
  text: z.string(),
});

export const KeyAction = z.object({
  type: z.literal('key'),
  key: z.string(),
});

export const ScrollAction = z.object({
  type: z.literal('scroll'),
  direction: z.enum(['up', 'down', 'left', 'right']),
  amount: z.number().optional().nullable(),
});

export const ScrollToAction = z.object({
  type: z.literal('scroll_to'),
  selector: z.string(),
});

export const NavigateAction = z.object({
  type: z.literal('navigate'),
  url: z.string(),
});

export const SimpleAction = z.object({
  type: z.enum(['back', 'forward', 'refresh', 'get_state', 'get_state_compact', 'screenshot']),
});

export const HoverAction = z.object({
  type: z.literal('hover'),
  x: z.number(),
  y: z.number(),
});

export const HoverElementAction = z.object({
  type: z.literal('hover_element'),
  selector: z.string(),
});

export const BrowserAction = z.discriminatedUnion('type', [
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
]);

export type BrowserAction = z.infer<typeof BrowserAction>;

// ============================================================================
// Cookie Types
// ============================================================================

export interface Cookie {
  name: string;
  value: string;
  domain: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

// ============================================================================
// Browser Controller Options
// ============================================================================

export interface BrowserbaseConfig {
  apiKey: string;
  projectId: string;
  /**
   * Optional region for Browserbase sessions, e.g. "ap-southeast-1"
   */
  region?: string;
}

export interface BrowserControllerOptions {
  headless?: boolean;
  viewport?: { width: number; height: number };
  cookies?: Cookie[];
  useBrowserbase?: boolean;
  browserbaseConfig?: BrowserbaseConfig;
}

// ============================================================================
// Interactive Element Types
// ============================================================================

export interface InteractiveElement {
  index: number;
  tag: string;
  type?: string;
  text: string;
  selector: string;
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  attributes: Record<string, string>;
  isVisible: boolean;
  isEnabled: boolean;
}

// Compact element for AI consumption - much smaller payload
export interface CompactElement {
  s: string;      // selector
  t: string;      // text/label
  k: string;      // kind: 'btn' | 'link' | 'input' | 'select' | 'checkbox' | 'tab' | 'other'
  d?: boolean;    // disabled (only if true)
}

// ============================================================================
// Page State Types
// ============================================================================

export interface PageStateOptions {
  lite?: boolean;           // If true, skip html/textContent for faster response
  maxElements?: number;     // Limit interactive elements (default: 75)
  maxHtmlLength?: number;   // Truncate HTML (default: 30000 chars)
  maxTextLength?: number;   // Truncate text content (default: 3000 chars)
  includeIframes?: boolean; // Include iframe content (default: false - reduces tokens)
}

// Full Page State
export interface PageState {
  url: string;
  title: string;
  html: string;
  textContent: string;
  interactiveElements: InteractiveElement[];
  viewport: {
    width: number;
    height: number;
  };
}

// Lite Page State (for quick checks after actions)
export interface PageStateLite {
  url: string;
  title: string;
  elementCount: number;
  viewport: {
    width: number;
    height: number;
  };
}

// Table summary for data display
export interface TableSummary {
  headers: string[];
  rowCount: number;
  rows: TableRow[];
  patterns?: {
    select?: string;
    preview?: string;
    click?: string;
  };
}

export interface TableRow {
  id?: string;
  cells: string[];
}

// Compact Page State - optimized for AI consumption
export interface PageStateCompact {
  url: string;
  title: string;
  buttons: CompactElement[];
  links: CompactElement[];
  inputs: CompactElement[];
  other: CompactElement[];
  tables?: TableSummary[];
  lists?: string[];
  summary: string;
}

// ============================================================================
// Session Types
// ============================================================================

export interface SessionInfo {
  id: string;
  createdAt: Date;
  url?: string;
  browserbaseSessionId?: string;
}

// ============================================================================
// Server Event Types
// ============================================================================

export type ServerEvent =
  | { type: 'connected'; sessionId: string }
  | { type: 'action_complete'; action: string; success: boolean; error?: string }
  | { type: 'state'; data: PageState }
  | { type: 'screenshot'; data: string }
  | { type: 'page_loaded'; url: string; state: PageState | PageStateLite }
  | { type: 'error'; message: string };

// ============================================================================
// Demo Mode Types
// ============================================================================

export type DemoMode = 'screenshot' | 'live' | 'hybrid';

export interface DemoConfig {
  mode: DemoMode;
  fallbackToScreenshots: boolean;
  browserConfig?: BrowserControllerOptions;
}

