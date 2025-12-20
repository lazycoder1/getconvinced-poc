/**
 * Railway Browser Service Proxy Helper
 * 
 * Proxies browser control requests from Vercel to Railway service.
 * Railway maintains persistent CDP connections for fast actions.
 */

const RAILWAY_URL = process.env.RAILWAY_BROWSER_SERVICE_URL;

export interface ProxyOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  query?: Record<string, string | undefined>;
}

export interface ProxyResponse<T = unknown> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
}

/**
 * Check if Railway service is configured
 */
export function isRailwayConfigured(): boolean {
  return !!RAILWAY_URL;
}

/**
 * Get the Railway service URL
 */
export function getRailwayUrl(): string | undefined {
  return RAILWAY_URL;
}

/**
 * Proxy a request to the Railway browser control service
 */
export async function proxyToRailway<T = unknown>(
  path: string,
  options: ProxyOptions = {}
): Promise<ProxyResponse<T>> {
  if (!RAILWAY_URL) {
    return {
      ok: false,
      status: 503,
      error: 'Railway browser service not configured',
    };
  }

  const { method = 'GET', body, query } = options;

  // Build URL with query parameters
  let url = `${RAILWAY_URL}${path}`;
  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) {
        params.append(key, value);
      }
    }
    const queryString = params.toString();
    if (queryString) {
      url += `?${queryString}`;
    }
  }

  try {
    console.log(`[Railway Proxy] ${method} ${url}`);

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (body && method !== 'GET') {
      fetchOptions.body = JSON.stringify(body);
    }

    const response = await fetch(url, fetchOptions);
    
    let data: T | undefined;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json() as T;
    }

    if (!response.ok) {
      const errorData = data as { error?: string } | undefined;
      console.error(`[Railway Proxy] Error ${response.status}:`, errorData);
      return {
        ok: false,
        status: response.status,
        error: errorData?.error || `Railway service returned ${response.status}`,
        data,
      };
    }

    console.log(`[Railway Proxy] ✓ Success`);
    return {
      ok: true,
      status: response.status,
      data,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Railway Proxy] Fetch error:', message);
    return {
      ok: false,
      status: 503,
      error: `Failed to connect to Railway service: ${message}`,
    };
  }
}

/**
 * Proxy session creation to Railway
 */
export async function proxyCreateSession(params: {
  tabId: string;
  cookies?: unknown[];
  defaultUrl?: string;
  headless?: boolean;
}) {
  return proxyToRailway('/session', {
    method: 'POST',
    body: params,
  });
}

/**
 * Proxy session lookup to Railway
 */
export async function proxyGetSession(tabId: string) {
  return proxyToRailway('/session', {
    method: 'GET',
    query: { tabId },
  });
}

/**
 * Proxy session deletion to Railway
 */
export async function proxyDeleteSession(tabId: string) {
  return proxyToRailway('/session', {
    method: 'DELETE',
    query: { tabId },
  });
}

/**
 * Proxy action execution to Railway
 */
export async function proxyAction(params: {
  tabId: string;
  browserbaseSessionId?: string;
  type: string;
  [key: string]: unknown;
}) {
  return proxyToRailway('/action', {
    method: 'POST',
    body: params,
  });
}

/**
 * Proxy state retrieval to Railway
 */
export async function proxyGetState(params: {
  tabId: string;
  compact?: boolean;
  lite?: boolean;
  includeIframes?: boolean;
}) {
  const { tabId, compact, lite, includeIframes } = params;
  return proxyToRailway('/state', {
    method: 'GET',
    query: {
      tabId,
      compact: compact ? 'true' : undefined,
      lite: lite ? 'true' : undefined,
      includeIframes: includeIframes ? 'true' : undefined,
    },
  });
}

/**
 * Proxy live URL retrieval to Railway
 */
export async function proxyGetLiveUrl(tabId: string) {
  return proxyToRailway<{ liveUrl?: string; usingBrowserbase?: boolean }>('/live-url', {
    method: 'GET',
    query: { tabId },
  });
}

