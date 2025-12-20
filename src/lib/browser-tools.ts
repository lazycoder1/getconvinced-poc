/**
 * Live Browser Tools for Voice Agent
 * 
 * OpenAI Realtime Agent tools for controlling the browser during live demos.
 * These tools integrate with the BrowserController via Next.js API routes.
 * 
 * Supports both static HubSpot tools and dynamic tools generated from database config.
 */

import { tool } from '@openai/agents/realtime';
import { z } from 'zod';
import { HUBSPOT_ROUTES, HubSpotRouteKey, HUBSPOT_ROUTE_KEYS, getHubSpotUrl } from './browser/hubspot-config';
import { ParsedRoute, generateRouteDescriptions, getRouteUrl } from './navigation-parser';

// Base URL for API calls (uses relative paths in browser)
const getApiBase = () => {
  if (typeof window !== 'undefined') {
    return '';  // Use relative paths in browser
  }
  return process.env.NEXT_PUBLIC_API_URL || '';
};

// Debug logger - logs to console with structured data
function debugLog(action: string, data: Record<string, unknown>) {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 12);
  console.log(`[${timestamp}] 🔧 ${action}:`, JSON.stringify(data, null, 2));
}

/**
 * Get cached session info from sessionStorage (client-side)
 * Required for Railway routing - all API calls need tabId
 */
function getCachedSessionInfo(): { tabId?: string; browserbaseSessionId?: string } {
  if (typeof window === 'undefined') return {};
  try {
    const tabId = sessionStorage.getItem('browserTabId');
    const browserbaseSessionId = sessionStorage.getItem('browserbaseSessionId');
    return {
      tabId: tabId || undefined,
      browserbaseSessionId: browserbaseSessionId || undefined
    };
  } catch {
    return {};
  }
}

// Helper to make API calls with detailed error handling
// Includes tabId for Railway routing
async function browserApiCall(endpoint: string, body?: Record<string, unknown>) {
  // Include session info in all API calls for Railway routing
  const cached = getCachedSessionInfo();
  const enrichedBody = body ? {
    ...body,
    tabId: cached.tabId,
    browserbaseSessionId: cached.browserbaseSessionId,
  } : undefined;

  const url = `${getApiBase()}/api/browser/${endpoint}`;
  const startTime = Date.now();
  
  debugLog('API_CALL_START', { endpoint, url, body: enrichedBody });
  
  try {
    const res = await fetch(url, {
      method: enrichedBody ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json' },
      body: enrichedBody ? JSON.stringify(enrichedBody) : undefined,
    });
    
    const duration = Date.now() - startTime;
    
    if (!res.ok) {
      const errorBody = await res.text();
      let errorJson: Record<string, unknown> = { error: res.statusText };
      try {
        errorJson = JSON.parse(errorBody);
      } catch {}
      
      debugLog('API_CALL_ERROR', { 
        endpoint, 
        status: res.status, 
        statusText: res.statusText,
        error: errorJson,
        duration 
      });
      
      throw new Error(errorJson.error as string || `API error: ${res.status} ${res.statusText}`);
    }
    
    const result = await res.json();
    
    debugLog('API_CALL_SUCCESS', { 
      endpoint, 
      duration,
      success: result.success,
      hasState: !!result.state,
      url: result.state?.url || result.url || 'N/A'
    });
    
    return result;
  } catch (err) {
    const duration = Date.now() - startTime;
    debugLog('API_CALL_EXCEPTION', { 
      endpoint, 
      duration,
      error: err instanceof Error ? err.message : String(err)
    });
    throw err;
  }
}

// Helper to get page state (uses GET endpoint)
// Includes tabId for Railway routing
async function getPageState(): Promise<Record<string, unknown>> {
  const cached = getCachedSessionInfo();
  const params = new URLSearchParams({ compact: 'true' });
  if (cached.tabId) params.set('tabId', cached.tabId);

  const url = `${getApiBase()}/api/browser/state?${params.toString()}`;
  const startTime = Date.now();
  
  debugLog('GET_STATE_START', { url });
  
  try {
    const res = await fetch(url);
    const duration = Date.now() - startTime;
    
    if (!res.ok) {
      const errorBody = await res.text();
      debugLog('GET_STATE_ERROR', { status: res.status, error: errorBody, duration });
      return { success: false, error: `Failed to get state: ${res.status}` };
    }
    
    const result = await res.json();
    debugLog('GET_STATE_SUCCESS', { 
      duration,
      url: result.state?.url,
      title: result.state?.title,
      buttons: result.state?.buttons?.length || 0,
      links: result.state?.links?.length || 0,
    });
    
    return result;
  } catch (err) {
    debugLog('GET_STATE_EXCEPTION', { error: String(err) });
    return { success: false, error: String(err) };
  }
}

// Summarize tool results for context efficiency (from test-app pattern)
// BUT keep error details for debugging
function summarizeResult(toolName: string, data: Record<string, unknown>): Record<string, unknown> {
  // Always preserve error info
  if (!data.success) {
    debugLog('TOOL_RESULT_ERROR', { toolName, error: data.error || data });
    return {
      success: false,
      error: data.error || 'Unknown error',
      details: data,
    };
  }

  // For navigation, return minimal info but include confirmation
  if (toolName.includes('navigate')) {
    const url = (data.state as Record<string, unknown>)?.url || data.url;
    const title = (data.state as Record<string, unknown>)?.title || '';
    debugLog('TOOL_RESULT_NAV', { toolName, url, title });
    return {
      success: true,
      url,
      title,
      message: `Navigated to: ${title || url}`,
    };
  }

  // For page state, return the entire filtered dump as requested
  if (toolName === 'browser_get_state' && data.state) {
    const state = data.state as Record<string, any>;
    const buttonCount = state.buttons?.length || 0;
    const linkCount = state.links?.length || 0;
    const inputCount = state.inputs?.length || 0;
    
    debugLog('TOOL_RESULT_STATE', { 
      toolName, 
      url: state.url, 
      title: state.title,
      buttons: buttonCount,
      links: linkCount,
      inputs: inputCount,
      tables: state.tables?.length || 0
    });
    
    return {
      success: true,
      url: state.url,
      title: state.title,
      summary: state.summary,
      buttons: state.buttons,
      links: state.links,
      inputs: state.inputs,
      tables: state.tables,
      other: state.other,
      stats: `Found ${buttonCount} buttons, ${linkCount} links, ${inputCount} inputs`,
    };
  }

  // For simple actions, confirm success with context
  if (['browser_click', 'browser_click_text', 'browser_type', 'browser_press_key', 'browser_scroll'].includes(toolName)) {
    debugLog('TOOL_RESULT_ACTION', { toolName, success: true });
    return { 
      success: true,
      action: toolName.replace('browser_', ''),
      message: 'Action completed successfully',
    };
  }

  // For screenshots, don't return base64 data
  if (toolName === 'browser_screenshot') {
    debugLog('TOOL_RESULT_SCREENSHOT', { toolName, success: true });
    return { success: true, note: 'Screenshot captured' };
  }

  return data;
}

/**
 * Create live browser tools for the voice agent
 */
export function createBrowserTools() {
  return [
    // ============================================
    // NAVIGATION TOOLS
    // ============================================
    
    tool({
      name: 'browser_navigate_hubspot',
      description: `Navigate directly to a HubSpot page using predefined routes. This is faster than clicking through menus.

Available routes: ${HUBSPOT_ROUTE_KEYS.join(', ')}

Common routes:
- deals, deals_all → Deal pipeline board
- contacts, contacts_all → Contact records
- tasks, tasks_today → Task queue
- tickets → Support tickets
- inbox → Shared inbox
- lists → Audience segments`,
      parameters: z.object({
        route: z.enum(HUBSPOT_ROUTE_KEYS as [string, ...string[]]).describe(
          'The HubSpot route name to navigate to'
        ),
      }),
      execute: async ({ route }) => {
        const url = getHubSpotUrl(route as HubSpotRouteKey);
        const result = await browserApiCall('action', { type: 'navigate', url });
        return summarizeResult('browser_navigate_hubspot', result);
      },
    }),

    tool({
      name: 'browser_navigate',
      description: 'Navigate the browser to any URL. For HubSpot pages, prefer browser_navigate_hubspot for faster navigation.',
      parameters: z.object({
        url: z.string().url().describe('The full URL to navigate to'),
      }),
      execute: async ({ url }) => {
        const result = await browserApiCall('action', { type: 'navigate', url });
        return summarizeResult('browser_navigate', result);
      },
    }),

    // ============================================
    // INTERACTION TOOLS
    // ============================================

    tool({
      name: 'browser_click',
      description: 'Click on an element by CSS selector. Use browser_get_state to find valid selectors.',
      parameters: z.object({
        selector: z.string().describe('CSS selector of the element to click (e.g., "button.submit", "#login-btn")'),
      }),
      execute: async ({ selector }) => {
        const result = await browserApiCall('action', { type: 'click_element', selector });
        return summarizeResult('browser_click', result);
      },
    }),

    tool({
      name: 'browser_click_text',
      description: 'Click on an element that contains specific visible text.',
      parameters: z.object({
        text: z.string().describe('The visible text of the element to click'),
        tag: z.string().optional().nullable().describe('Optional HTML tag to narrow down (e.g., "button", "a", "span")'),
      }),
      execute: async ({ text, tag }) => {
        const selector = tag ? `${tag}:text("${text}")` : `text="${text}"`;
        const result = await browserApiCall('action', { type: 'click_element', selector });
        return summarizeResult('browser_click_text', result);
      },
    }),

    tool({
      name: 'browser_type',
      description: 'Type text into an input element. First clicks the element, then types.',
      parameters: z.object({
        selector: z.string().describe('CSS selector of the input element'),
        text: z.string().describe('The text to type'),
        clear: z.boolean().optional().nullable().describe('Whether to clear existing text first (default: true)'),
      }),
      execute: async ({ selector, text, clear }) => {
        const result = await browserApiCall('action', { 
          type: 'type_element', 
          selector, 
          text,
          clear: clear ?? true 
        });
        return summarizeResult('browser_type', result);
      },
    }),

    tool({
      name: 'browser_press_key',
      description: 'Press a keyboard key. Useful for form submission or navigation.',
      parameters: z.object({
        key: z.string().describe('The key to press (e.g., "Enter", "Tab", "Escape", "ArrowDown")'),
      }),
      execute: async ({ key }) => {
        const result = await browserApiCall('action', { type: 'key', key });
        return summarizeResult('browser_press_key', result);
      },
    }),

    tool({
      name: 'browser_scroll',
      description: 'Scroll the page in a direction.',
      parameters: z.object({
        direction: z.enum(['up', 'down', 'left', 'right']).describe('Direction to scroll'),
        amount: z.number().optional().nullable().describe('Amount to scroll in pixels (default: 300)'),
      }),
      execute: async ({ direction, amount }) => {
        const result = await browserApiCall('action', { type: 'scroll', direction, amount: amount ?? 300 });
        return summarizeResult('browser_scroll', result);
      },
    }),

    // ============================================
    // PAGE STATE TOOLS
    // ============================================

    tool({
      name: 'browser_get_state',
      description: `Get the current page state optimized for understanding and interaction.

Returns:
- url, title: Current page location
- buttons: Clickable buttons with selectors
- links: Navigation links with selectors
- inputs: Form fields with selectors
- tables: Table data with headers and preview rows

Use this to understand what's on the page before taking action.`,
      parameters: z.object({}),
      execute: async () => {
        const result = await getPageState();
        return summarizeResult('browser_get_state', result);
      },
    }),

    tool({
      name: 'browser_screenshot',
      description: 'Take a screenshot of the current page. Useful for debugging or showing the user what you see.',
      parameters: z.object({
        fullPage: z.boolean().optional().nullable().describe('Whether to capture the full scrollable page (default: false)'),
      }),
      execute: async ({ fullPage }) => {
        const result = await browserApiCall('screenshot', { fullPage: fullPage ?? false });
        return summarizeResult('browser_screenshot', result);
      },
    }),

    // ============================================
    // UTILITY TOOLS
    // ============================================

    tool({
      name: 'browser_wait',
      description: 'Wait for a specified time. Useful after actions that trigger page loads.',
      parameters: z.object({
        ms: z.number().min(100).max(10000).describe('Time to wait in milliseconds (100-10000)'),
      }),
      execute: async ({ ms }) => {
        await new Promise(resolve => setTimeout(resolve, ms));
        return { success: true, waited: ms };
      },
    }),
  ];
}

/**
 * All browser tool definitions for export
 */
export const browserTools = createBrowserTools();

/**
 * Create dynamic browser tools from database-stored routes
 * 
 * @param websiteSlug - URL slug of the website (used in tool naming)
 * @param websiteName - Display name of the website (used in descriptions)
 * @param routes - Parsed routes from database
 * @param baseUrl - Base URL for navigation
 */
export function createDynamicBrowserTools(
  websiteSlug: string,
  websiteName: string,
  routes: ParsedRoute[],
  baseUrl: string
) {
  // Generate route keys for enum
  const routeKeys = routes.map(r => r.key);
  
  // Generate formatted route descriptions
  const routeDescriptions = generateRouteDescriptions(routes);

  // Create route lookup map
  const routeLookup = new Map(routes.map(r => [r.key, r]));

  return [
    // ============================================
    // DYNAMIC NAVIGATION TOOL (website-specific)
    // ============================================
    
    tool({
      name: `navigate_${websiteSlug.replace(/-/g, '_')}`,
      description: `Navigate directly to a ${websiteName} page using predefined routes. This is faster than clicking through menus.

Available routes:
${routeDescriptions}`,
      parameters: z.object({
        route: z.enum(routeKeys as [string, ...string[]]).describe(
          `The ${websiteName} route name to navigate to`
        ),
      }),
      execute: async ({ route }) => {
        const routeConfig = routeLookup.get(route);
        if (!routeConfig) {
          return { success: false, error: `Unknown route: ${route}` };
        }
        const url = baseUrl + routeConfig.path;
        const result = await browserApiCall('action', { type: 'navigate', url });
        return summarizeResult(`navigate_${websiteSlug}`, result);
      },
    }),

    // ============================================
    // GENERIC NAVIGATION TOOL
    // ============================================

    tool({
      name: 'browser_navigate',
      description: `Navigate the browser to any URL. For ${websiteName} pages, prefer navigate_${websiteSlug.replace(/-/g, '_')} for faster navigation.`,
      parameters: z.object({
        url: z.string().url().describe('The full URL to navigate to'),
      }),
      execute: async ({ url }) => {
        const result = await browserApiCall('action', { type: 'navigate', url });
        return summarizeResult('browser_navigate', result);
      },
    }),

    // ============================================
    // INTERACTION TOOLS
    // ============================================

    tool({
      name: 'browser_click',
      description: 'Click on an element by CSS selector. Use browser_get_state to find valid selectors.',
      parameters: z.object({
        selector: z.string().describe('CSS selector of the element to click (e.g., "button.submit", "#login-btn")'),
      }),
      execute: async ({ selector }) => {
        const result = await browserApiCall('action', { type: 'click_element', selector });
        return summarizeResult('browser_click', result);
      },
    }),

    tool({
      name: 'browser_click_text',
      description: 'Click on an element that contains specific visible text.',
      parameters: z.object({
        text: z.string().describe('The visible text of the element to click'),
        tag: z.string().optional().nullable().describe('Optional HTML tag to narrow down (e.g., "button", "a", "span")'),
      }),
      execute: async ({ text, tag }) => {
        const selector = tag ? `${tag}:text("${text}")` : `text="${text}"`;
        const result = await browserApiCall('action', { type: 'click_element', selector });
        return summarizeResult('browser_click_text', result);
      },
    }),

    tool({
      name: 'browser_type',
      description: 'Type text into an input element. First clicks the element, then types.',
      parameters: z.object({
        selector: z.string().describe('CSS selector of the input element'),
        text: z.string().describe('The text to type'),
        clear: z.boolean().optional().nullable().describe('Whether to clear existing text first (default: true)'),
      }),
      execute: async ({ selector, text, clear }) => {
        const result = await browserApiCall('action', { 
          type: 'type_element', 
          selector, 
          text,
          clear: clear ?? true 
        });
        return summarizeResult('browser_type', result);
      },
    }),

    tool({
      name: 'browser_press_key',
      description: 'Press a keyboard key. Useful for form submission or navigation.',
      parameters: z.object({
        key: z.string().describe('The key to press (e.g., "Enter", "Tab", "Escape", "ArrowDown")'),
      }),
      execute: async ({ key }) => {
        const result = await browserApiCall('action', { type: 'key', key });
        return summarizeResult('browser_press_key', result);
      },
    }),

    tool({
      name: 'browser_scroll',
      description: 'Scroll the page in a direction.',
      parameters: z.object({
        direction: z.enum(['up', 'down', 'left', 'right']).describe('Direction to scroll'),
        amount: z.number().optional().nullable().describe('Amount to scroll in pixels (default: 300)'),
      }),
      execute: async ({ direction, amount }) => {
        const result = await browserApiCall('action', { type: 'scroll', direction, amount: amount ?? 300 });
        return summarizeResult('browser_scroll', result);
      },
    }),

    // ============================================
    // PAGE STATE TOOLS
    // ============================================

    tool({
      name: 'browser_get_state',
      description: `Get the current page state optimized for understanding and interaction.

Returns:
- url, title: Current page location
- buttons: Clickable buttons with selectors
- links: Navigation links with selectors
- inputs: Form fields with selectors
- tables: Table data with headers and preview rows

Use this to understand what's on the page before taking action.`,
      parameters: z.object({}),
      execute: async () => {
        const result = await getPageState();
        return summarizeResult('browser_get_state', result);
      },
    }),

    tool({
      name: 'browser_screenshot',
      description: 'Take a screenshot of the current page. Useful for debugging or showing the user what you see.',
      parameters: z.object({
        fullPage: z.boolean().optional().nullable().describe('Whether to capture the full scrollable page (default: false)'),
      }),
      execute: async ({ fullPage }) => {
        const result = await browserApiCall('screenshot', { fullPage: fullPage ?? false });
        return summarizeResult('browser_screenshot', result);
      },
    }),

    // ============================================
    // UTILITY TOOLS
    // ============================================

    tool({
      name: 'browser_wait',
      description: 'Wait for a specified time. Useful after actions that trigger page loads.',
      parameters: z.object({
        ms: z.number().min(100).max(10000).describe('Time to wait in milliseconds (100-10000)'),
      }),
      execute: async ({ ms }) => {
        await new Promise(resolve => setTimeout(resolve, ms));
        return { success: true, waited: ms };
      },
    }),
  ];
}

/**
 * Get tool names array for dynamic tools
 */
export function getDynamicToolNames(websiteSlug: string): string[] {
  return [
    `navigate_${websiteSlug.replace(/-/g, '_')}`,
    'browser_navigate',
    'browser_click',
    'browser_click_text',
    'browser_type',
    'browser_press_key',
    'browser_scroll',
    'browser_get_state',
    'browser_screenshot',
    'browser_wait',
  ];
}

export default browserTools;

