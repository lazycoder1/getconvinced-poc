/**
 * HubSpot Configuration & Routes
 * 
 * Centralized configuration for HubSpot navigation and portal settings.
 * Used by both the voice agent and live browser tools.
 */

// HubSpot Portal Configuration
export const HUBSPOT_CONFIG = {
  // Base URL - update per environment
  BASE_URL: 'https://app-na2.hubspot.com',

  // Portal ID - update per customer/demo account
  PORTAL_ID: '243381751',

  // Default starting URL for demos
  DEFAULT_URL: 'https://app-na2.hubspot.com',

  // Get the full base URL with portal
  getPortalUrl: () => `${HUBSPOT_CONFIG.BASE_URL}/contacts/${HUBSPOT_CONFIG.PORTAL_ID}`,
};

// HubSpot Navigation Routes
// Maps friendly route names to URL paths for fast navigation
export const HUBSPOT_ROUTES = {
  // ============================================
  // CRM OBJECTS
  // ============================================
  
  // Contacts
  contacts: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-1`,
  contacts_all: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-1?view-tab=all`,
  contacts_newsletter: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-1?view-tab=340378228`,
  contacts_unsubscribed: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-1?view-tab=340378230`,
  contacts_customers: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-1?view-tab=340378232`,

  // Companies
  companies: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-2`,
  companies_all: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-2?view-tab=all`,
  companies_my: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-2?view-tab=my`,

  // Deals
  deals: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-3`,
  deals_all: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-3?view-tab=all`,
  deals_my: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-3?view-tab=my`,

  // Tickets
  tickets: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-5`,
  tickets_all: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-5?view-tab=all`,
  tickets_my: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-5?view-tab=my`,
  tickets_unassigned: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-5?view-tab=unassigned`,

  // Orders
  orders: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-123`,
  orders_all: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-123?view-tab=all`,

  // ============================================
  // LISTS & SEGMENTS
  // ============================================
  segments: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objectLists`,
  segments_all: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objectLists?view-tab=all`,
  segments_unused: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objectLists?view-tab=unused`,
  segments_deleted: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objectLists?view-tab=recently_deleted`,
  lists: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objectLists`,

  // ============================================
  // INBOX & CONVERSATIONS
  // ============================================
  inbox: `/live-messages/${HUBSPOT_CONFIG.PORTAL_ID}/inbox`,
  inbox_unassigned: `/live-messages/${HUBSPOT_CONFIG.PORTAL_ID}/inbox/unassigned`,
  inbox_mine: `/live-messages/${HUBSPOT_CONFIG.PORTAL_ID}/inbox/assigned-to-me`,
  inbox_open: `/live-messages/${HUBSPOT_CONFIG.PORTAL_ID}/inbox/all-open`,

  // ============================================
  // ACTIVITIES
  // ============================================
  calls: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-48`,
  calls_recorded: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-48?view-tab=recorded_calls`,
  calls_all: `/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-48?view-tab=all`,

  tasks: `/tasks/${HUBSPOT_CONFIG.PORTAL_ID}/view/all`,
  tasks_all: `/tasks/${HUBSPOT_CONFIG.PORTAL_ID}/view/all?view-tab=all`,
  tasks_today: `/tasks/${HUBSPOT_CONFIG.PORTAL_ID}/view/all?view-tab=due_today`,
  tasks_overdue: `/tasks/${HUBSPOT_CONFIG.PORTAL_ID}/view/all?view-tab=overdue`,
  tasks_upcoming: `/tasks/${HUBSPOT_CONFIG.PORTAL_ID}/view/all?view-tab=upcoming`,

  // ============================================
  // TOOLS
  // ============================================
  templates: `/templates/${HUBSPOT_CONFIG.PORTAL_ID}`,
  snippets: `/snippets/${HUBSPOT_CONFIG.PORTAL_ID}`,
} as const;

// Type for route keys
export type HubSpotRouteKey = keyof typeof HUBSPOT_ROUTES;

// Get all available route keys
export const HUBSPOT_ROUTE_KEYS = Object.keys(HUBSPOT_ROUTES) as HubSpotRouteKey[];

// Helper to get full URL from route
export function getHubSpotUrl(route: HubSpotRouteKey): string {
  return `${HUBSPOT_CONFIG.BASE_URL}${HUBSPOT_ROUTES[route]}`;
}

// Pain point to route mapping for intelligent navigation
export const PAIN_POINT_ROUTES: Record<string, { routes: HubSpotRouteKey[]; description: string }> = {
  'pipeline': {
    routes: ['deals', 'deals_all'],
    description: 'Board view, drag-and-drop stages, pipeline visibility',
  },
  'deals': {
    routes: ['deals', 'deals_all'],
    description: 'Deal tracking, forecasting, opportunity management',
  },
  'contacts': {
    routes: ['contacts', 'contacts_all'],
    description: 'Unified contact timeline, contact management',
  },
  'follow-ups': {
    routes: ['tasks', 'tasks_today'],
    description: 'Task automation, follow-up tracking',
  },
  'tasks': {
    routes: ['tasks', 'tasks_all'],
    description: 'Task queue, daily work management',
  },
  'tickets': {
    routes: ['tickets', 'tickets_all'],
    description: 'Support ticket pipeline, SLA tracking',
  },
  'support': {
    routes: ['tickets', 'inbox'],
    description: 'Customer support, ticket management',
  },
  'inbox': {
    routes: ['inbox', 'inbox_mine'],
    description: 'Shared inbox, conversation management',
  },
  'lists': {
    routes: ['lists', 'segments'],
    description: 'Audience segmentation, targeting',
  },
  'calls': {
    routes: ['calls', 'calls_recorded'],
    description: 'Call logs, coaching, activity tracking',
  },
};

// Screenshot to route mapping (for hybrid mode)
export const SCREENSHOT_ROUTE_MAP: Record<string, HubSpotRouteKey> = {
  'calls': 'calls',
  'companies': 'companies',
  'contacts_all': 'contacts_all',
  'contacts_unsubscribed': 'contacts_unsubscribed',
  'contacts_newsletters': 'contacts_newsletter',
  'contacts': 'contacts',
  'deals': 'deals',
  'inbox': 'inbox',
  'lists': 'lists',
  'my_companies': 'companies_my',
  'tasks': 'tasks',
  'tickets': 'tickets',
};

