/**
 * Navigation YAML Parser
 * 
 * Parses YAML-formatted navigation configuration into structured routes.
 * Supports hierarchical categories, {{VARIABLE}} substitution, and validation.
 * 
 * This is a GENERIC parser - works with any website, not just HubSpot.
 * Use the `variables` section to define any dynamic substitutions needed.
 */

import yaml from 'js-yaml';

// Parsed route structure
export interface ParsedRoute {
    key: string;
    path: string;
    label: string;
    description?: string;
    category?: string;
    sortOrder: number;
}

// Website configuration (generic)
export interface WebsiteConfig {
    baseUrl: string;
    defaultUrl?: string;      // Start page after auth
    authDomain?: string;      // Cookie domain filter
    variables: Record<string, string>;  // Any substitution variables
}

// Parse result
export interface ParseResult {
    success: boolean;
    routes: ParsedRoute[];
    config: WebsiteConfig;
    errors: string[];
    // Legacy aliases for backward compatibility
    baseUrl?: string;
    portalId?: string;
}

// Reserved keys that are not route definitions
const RESERVED_KEYS = ['base_url', 'default_url', 'auth_domain', 'variables', 'portal_id'];

/**
 * Parse a route value string in format: /path | Label | Description
 */
function parseRouteValue(value: string): { path: string; label: string; description?: string } | null {
    if (typeof value !== 'string') return null;

    const parts = value.split('|').map(p => p.trim());
    if (parts.length < 2) return null;

    return {
        path: parts[0],
        label: parts[1],
        description: parts[2] || undefined,
    };
}

/**
 * Substitute all {{VARIABLE}} patterns in a string
 */
function substituteVariables(text: string, variables: Record<string, string>): string {
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
        const pattern = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
        result = result.replace(pattern, value);
    }
    return result;
}

/**
 * Recursively extract routes from a YAML object
 */
function extractRoutes(
    obj: Record<string, unknown>,
    category: string | undefined,
    variables: Record<string, string>,
    sortOrder: { current: number }
): { routes: ParsedRoute[]; errors: string[] } {
    const routes: ParsedRoute[] = [];
    const errors: string[] = [];

    for (const [key, value] of Object.entries(obj)) {
        // Skip reserved keys
        if (RESERVED_KEYS.includes(key)) continue;

        if (typeof value === 'string') {
            // This is a route definition
            const parsed = parseRouteValue(value);
            if (parsed) {
                // Substitute all {{VARIABLE}} patterns
                const path = substituteVariables(parsed.path, variables);

                routes.push({
                    key,
                    path,
                    label: parsed.label,
                    description: parsed.description,
                    category,
                    sortOrder: sortOrder.current++,
                });
            } else {
                errors.push(`Invalid route format for "${key}": expected "/path | Label | Description"`);
            }
        } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            // This is a category - recurse
            const nested = extractRoutes(value as Record<string, unknown>, key, variables, sortOrder);
            routes.push(...nested.routes);
            errors.push(...nested.errors);
        } else {
            errors.push(`Invalid value type for "${key}": expected string or object`);
        }
    }

    return { routes, errors };
}

/**
 * Parse navigation YAML text into structured routes
 */
export function parseNavigationYaml(yamlText: string): ParseResult {
    const errors: string[] = [];
    const routes: ParsedRoute[] = [];

    // Default config
    const config: WebsiteConfig = {
        baseUrl: '',
        variables: {},
    };

    if (!yamlText || !yamlText.trim()) {
        return {
            success: false,
            routes: [],
            config,
            errors: ['YAML content is empty'],
        };
    }

    let parsed: unknown;
    try {
        parsed = yaml.load(yamlText);
    } catch (e) {
        const message = e instanceof Error ? e.message : 'Unknown YAML parse error';
        return {
            success: false,
            routes: [],
            config,
            errors: [`YAML syntax error: ${message}`],
        };
    }

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return {
            success: false,
            routes: [],
            config,
            errors: ['YAML must be an object at the root level'],
        };
    }

    const obj = parsed as Record<string, unknown>;

    // Extract base configuration (generic)
    config.baseUrl = typeof obj.base_url === 'string' ? obj.base_url : '';
    config.defaultUrl = typeof obj.default_url === 'string' ? obj.default_url : undefined;
    config.authDomain = typeof obj.auth_domain === 'string' ? obj.auth_domain : undefined;

    // Extract variables for substitution
    if (typeof obj.variables === 'object' && obj.variables !== null && !Array.isArray(obj.variables)) {
        for (const [key, value] of Object.entries(obj.variables as Record<string, unknown>)) {
            if (typeof value === 'string' || typeof value === 'number') {
                config.variables[key] = String(value);
            }
        }
    }

    // Backward compatibility: support portal_id as a variable
    if (obj.portal_id !== undefined) {
        const portalId = typeof obj.portal_id === 'string'
            ? obj.portal_id
            : typeof obj.portal_id === 'number'
                ? String(obj.portal_id)
                : undefined;
        if (portalId) {
            config.variables['PORTAL_ID'] = portalId;
        }
    }

    // Extract routes using variables for substitution
    const sortOrder = { current: 0 };
    const extracted = extractRoutes(obj, undefined, config.variables, sortOrder);
    routes.push(...extracted.routes);
    errors.push(...extracted.errors);

    // Routes are now optional - a site might just need base_url + default_url
    // Only error if we have neither routes NOR a default_url
    if (routes.length === 0 && !config.defaultUrl && !config.baseUrl) {
        errors.push('Configuration must include at least base_url or default_url');
    }

    return {
        success: errors.length === 0 || (routes.length === 0 && !!config.baseUrl),
        routes,
        config,
        // Legacy aliases for backward compatibility
        baseUrl: config.baseUrl || undefined,
        portalId: config.variables['PORTAL_ID'],
        errors,
    };
}

/**
 * Generate route descriptions for tool injection
 */
export function generateRouteDescriptions(routes: ParsedRoute[]): string {
    // Group by category
    const grouped = new Map<string, ParsedRoute[]>();

    for (const route of routes) {
        const cat = route.category || 'General';
        if (!grouped.has(cat)) {
            grouped.set(cat, []);
        }
        grouped.get(cat)!.push(route);
    }

    const lines: string[] = [];
    for (const [category, categoryRoutes] of grouped) {
        lines.push(`**${category}:**`);
        for (const route of categoryRoutes) {
            const desc = route.description ? ` - ${route.description}` : '';
            lines.push(`  - ${route.key}: ${route.label}${desc}`);
        }
    }

    return lines.join('\n');
}

/**
 * Get full URL for a route
 */
export function getRouteUrl(routes: ParsedRoute[], baseUrl: string, key: string): string | null {
    const route = routes.find(r => r.key === key);
    if (!route) return null;
    return baseUrl + route.path;
}

/**
 * Generate example YAML for documentation
 */
export function getExampleYaml(): string {
    return `# Website Navigation Configuration
# 
# This is a GENERIC format - works with any website.
# 
# Format:
#   Category:
#     route_key: /path | Label | Description
#
# Use {{VARIABLE_NAME}} for dynamic substitution (define in variables section)

# Required: Base URL for the website
base_url: https://app.example.com

# Optional: Default page to load after authentication
default_url: /dashboard

# Optional: Cookie domain filter for authentication
auth_domain: "*.example.com"

# Optional: Variables for route path substitution
# Any {{VAR_NAME}} in routes will be replaced with the value here
variables:
  ACCOUNT_ID: "12345"
  WORKSPACE_ID: "ws-abc123"

# Optional: Navigation routes (organized by category)
# Leave empty if your site doesn't need predefined navigation
Dashboard:
  home: /dashboard | Home | Main dashboard
  analytics: /analytics/{{ACCOUNT_ID}} | Analytics | Usage analytics

Settings:
  settings_general: /settings/general | General Settings | Basic configuration
  settings_users: /settings/{{ACCOUNT_ID}}/users | User Management | Team members
  settings_billing: /settings/{{ACCOUNT_ID}}/billing | Billing | Subscription & payments`;
}

