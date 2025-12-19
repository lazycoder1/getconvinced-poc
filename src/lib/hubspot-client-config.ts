/**
 * HubSpot Client Configuration
 * 
 * Client-side safe configuration for HubSpot navigation.
 * This file can be imported in client components.
 */

// HubSpot Portal Configuration
export const HUBSPOT_CONFIG = {
  // Base URL - update per environment
  BASE_URL: 'https://app-na2.hubspot.com',
  
  // Portal ID - update per customer/demo account
  PORTAL_ID: '243381751',
  
  // Default starting URL for demos
  DEFAULT_URL: 'https://app-na2.hubspot.com',
};

// Quick navigation routes for the dashboard
export const HUBSPOT_QUICK_ROUTES = {
  home: {
    label: 'Home',
    url: `${HUBSPOT_CONFIG.BASE_URL}`,
  },
  contacts: {
    label: 'Contacts',
    url: `${HUBSPOT_CONFIG.BASE_URL}/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-1`,
  },
  companies: {
    label: 'Companies',
    url: `${HUBSPOT_CONFIG.BASE_URL}/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-2`,
  },
  deals: {
    label: 'Deals',
    url: `${HUBSPOT_CONFIG.BASE_URL}/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-3`,
  },
  tickets: {
    label: 'Tickets',
    url: `${HUBSPOT_CONFIG.BASE_URL}/contacts/${HUBSPOT_CONFIG.PORTAL_ID}/objects/0-5`,
  },
  tasks: {
    label: 'Tasks',
    url: `${HUBSPOT_CONFIG.BASE_URL}/tasks/${HUBSPOT_CONFIG.PORTAL_ID}/view/all`,
  },
  inbox: {
    label: 'Inbox',
    url: `${HUBSPOT_CONFIG.BASE_URL}/live-messages/${HUBSPOT_CONFIG.PORTAL_ID}/inbox`,
  },
} as const;

// Get all route keys
export const HUBSPOT_QUICK_ROUTE_KEYS = Object.keys(HUBSPOT_QUICK_ROUTES) as Array<keyof typeof HUBSPOT_QUICK_ROUTES>;

// Helper to get URL from route key
export function getHubSpotQuickUrl(route: keyof typeof HUBSPOT_QUICK_ROUTES): string {
  return HUBSPOT_QUICK_ROUTES[route].url;
}

