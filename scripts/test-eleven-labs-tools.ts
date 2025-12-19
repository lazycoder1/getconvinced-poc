#!/usr/bin/env npx tsx
/**
 * ElevenLabs Tools Test Script
 *
 * Tests and validates the client tools integration for ElevenLabs:
 * 1. Simulates how ElevenLabs calls tools (with parameters object)
 * 2. Tests each tool locally
 * 3. Generates tool definitions for the ElevenLabs dashboard
 * 4. Optionally tests with a real ElevenLabs conversation
 *
 * Usage:
 *   npx tsx scripts/test-eleven-labs-tools.ts
 *   npx tsx scripts/test-eleven-labs-tools.ts --generate-config
 *   npx tsx scripts/test-eleven-labs-tools.ts --live-test
 *
 * Make sure the dev server is running first:
 *   pnpm dev
 */

import 'dotenv/config';

const API_BASE = process.env.API_BASE || 'http://localhost:3001';

// ============================================================================
// Tool Definitions (matching what's in eleven-labs-tools.ts)
// ============================================================================

interface ToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, {
            type: string;
            description: string;
            enum?: string[];
        }>;
        required?: string[];
    };
}

// These are the tools that need to be configured in the ElevenLabs dashboard
const TOOL_DEFINITIONS: ToolDefinition[] = [
    // Screenshot Tools
    {
        name: 'screenshot_list_views',
        description: 'List all available screenshot views that can be displayed',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'screenshot_set_view',
        description: 'Display a specific screenshot view to the user',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'The filename of the screenshot to display',
                },
            },
            required: ['name'],
        },
    },
    {
        name: 'switch_demo_mode',
        description: 'Switch between screenshot mode and live browser mode',
        parameters: {
            type: 'object',
            properties: {
                mode: {
                    type: 'string',
                    description: 'The demo mode to switch to',
                    enum: ['screenshot', 'live'],
                },
            },
            required: ['mode'],
        },
    },
    // Browser Tools
    {
        name: 'browser_session_status',
        description: 'Check whether there is an active live browser session',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'browser_start_session',
        description: 'Start a live browser session if one is not already running',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'browser_navigate',
        description: 'Navigate the browser to a specific URL',
        parameters: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'The URL to navigate to',
                },
            },
            required: ['url'],
        },
    },
    {
        name: 'browser_click',
        description: 'Click on an element using a CSS selector',
        parameters: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector of the element to click',
                },
            },
            required: ['selector'],
        },
    },
    {
        name: 'browser_click_text',
        description: 'Click on an element by its visible text',
        parameters: {
            type: 'object',
            properties: {
                text: {
                    type: 'string',
                    description: 'The visible text of the element to click',
                },
                tag: {
                    type: 'string',
                    description: 'Optional HTML tag to narrow the search (e.g., "button", "a")',
                },
                withinSelector: {
                    type: 'string',
                    description: 'Optional CSS selector to scope the search within (e.g., a row container selector)',
                },
                index: {
                    type: 'number',
                    description: 'If multiple matches exist, click the Nth match (0-based).',
                },
            },
            required: ['text'],
        },
    },
    {
        name: 'browser_type',
        description: 'Type text into an input field',
        parameters: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector of the input element',
                },
                text: {
                    type: 'string',
                    description: 'The text to type',
                },
                clear: {
                    type: 'boolean',
                    description: 'Whether to clear the field before typing (default: true)',
                },
            },
            required: ['selector', 'text'],
        },
    },
    {
        name: 'browser_press_key',
        description: 'Press a keyboard key (e.g., Enter, Escape, Tab)',
        parameters: {
            type: 'object',
            properties: {
                key: {
                    type: 'string',
                    description: 'The key to press (e.g., "Enter", "Escape", "Tab")',
                },
            },
            required: ['key'],
        },
    },
    {
        name: 'browser_scroll',
        description: 'Scroll the page in a direction',
        parameters: {
            type: 'object',
            properties: {
                direction: {
                    type: 'string',
                    description: 'Direction to scroll',
                    enum: ['up', 'down', 'left', 'right'],
                },
                amount: {
                    type: 'number',
                    description: 'Amount to scroll in pixels (default: 300)',
                },
            },
            required: ['direction'],
        },
    },
    {
        name: 'browser_get_state',
        description: 'Get the current state of the page including visible elements, buttons, links, and tables',
        parameters: {
            type: 'object',
            properties: {},
        },
    },
    {
        name: 'browser_check_ready',
        description: 'Check whether the live website is ready enough for interaction (URL loaded + visible elements)',
        parameters: {
            type: 'object',
            properties: {
                timeoutMs: {
                    type: 'number',
                    description: 'Max time to wait for readiness in milliseconds (default: 8000)',
                },
                pollMs: {
                    type: 'number',
                    description: 'Polling interval in milliseconds (default: 300)',
                },
            },
        },
    },
    {
        name: 'browser_screenshot',
        description: 'Take a screenshot of the current page',
        parameters: {
            type: 'object',
            properties: {
                fullPage: {
                    type: 'boolean',
                    description: 'Whether to capture the full page (default: false)',
                },
            },
        },
    },
    {
        name: 'browser_wait',
        description: 'Wait for a specified amount of time',
        parameters: {
            type: 'object',
            properties: {
                ms: {
                    type: 'number',
                    description: 'Time to wait in milliseconds',
                },
            },
            required: ['ms'],
        },
    },
];

// ============================================================================
// Local Tool Simulation (mimics how ElevenLabs calls tools)
// ============================================================================

async function browserApiCall(endpoint: string, body?: Record<string, unknown>) {
    const url = `${API_BASE}/api/browser/${endpoint}`;

    try {
        const res = await fetch(url, {
            method: body ? 'POST' : 'GET',
            headers: { 'Content-Type': 'application/json' },
            body: body ? JSON.stringify(body) : undefined,
        });

        if (!res.ok) {
            const errorBody = await res.text();
            return { success: false, error: `API error: ${res.status} - ${errorBody}` };
        }

        return await res.json();
    } catch (err) {
        return { success: false, error: String(err) };
    }
}

// Simulated tools (same as in eleven-labs-tools.ts but for Node.js)
const simulatedTools: Record<string, (parameters: any) => Promise<string>> = {
    screenshot_list_views: async () => {
        // Simulated - in real app this comes from database
        const views = [
            { name: 'CRM-Contacts.png', description: 'Contacts list view' },
            { name: 'CRM-Deals.png', description: 'Deals pipeline view' },
            { name: 'CRM-Companies.png', description: 'Companies list' },
        ];
        return JSON.stringify({ views });
    },

    screenshot_set_view: async (params: { name: string }) => {
        console.log(`   → Setting view to: ${params.name}`);
        return JSON.stringify({
            success: true,
            screenshot: { filename: params.name },
            message: `Displaying screenshot: ${params.name}`,
        });
    },

    switch_demo_mode: async (params: { mode: 'screenshot' | 'live' }) => {
        console.log(`   → Switching to ${params.mode} mode`);
        return JSON.stringify({
            success: true,
            previousMode: 'screenshot',
            currentMode: params.mode,
            message: `Switched to ${params.mode} mode`,
        });
    },

    browser_session_status: async () => {
        const url = `${API_BASE}/api/browser/session`;
        try {
            const res = await fetch(url);
            if (!res.ok) {
                return JSON.stringify({ success: false, hasSession: false, error: `No active session (${res.status})` });
            }
            const info = await res.json();
            return JSON.stringify({ success: true, hasSession: true, info });
        } catch (e) {
            return JSON.stringify({ success: false, hasSession: false, error: String(e) });
        }
    },

    browser_start_session: async () => {
        const url = `${API_BASE}/api/browser/session`;
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ headless: false }),
            });
            if (!res.ok) {
                const t = await res.text();
                return JSON.stringify({ success: false, error: `Failed to start session: ${t}` });
            }
            const session = await res.json();
            return JSON.stringify({ success: true, session });
        } catch (e) {
            return JSON.stringify({ success: false, error: String(e) });
        }
    },

    browser_navigate: async (params: { url: string }) => {
        console.log(`   → Navigating to: ${params.url}`);
        const result = await browserApiCall('action', { type: 'navigate', url: params.url });
        return JSON.stringify(result);
    },

    browser_click: async (params: { selector: string }) => {
        console.log(`   → Clicking: ${params.selector}`);
        const result = await browserApiCall('action', { type: 'click_element', selector: params.selector });
        return JSON.stringify(result);
    },

    browser_click_text: async (params: { text: string; tag?: string }) => {
        const selector = params.tag ? `${params.tag}:text("${params.text}")` : `text="${params.text}"`;
        console.log(`   → Clicking text: "${params.text}"`);
        const result = await browserApiCall('action', { type: 'click_element', selector });
        return JSON.stringify(result);
    },

    browser_type: async (params: { selector: string; text: string; clear?: boolean }) => {
        console.log(`   → Typing "${params.text}" into ${params.selector}`);
        const result = await browserApiCall('action', {
            type: 'type_element',
            selector: params.selector,
            text: params.text,
            clear: params.clear ?? true,
        });
        return JSON.stringify(result);
    },

    browser_press_key: async (params: { key: string }) => {
        console.log(`   → Pressing key: ${params.key}`);
        const result = await browserApiCall('action', { type: 'key', key: params.key });
        return JSON.stringify(result);
    },

    browser_scroll: async (params: { direction: string; amount?: number }) => {
        console.log(`   → Scrolling ${params.direction} by ${params.amount || 300}px`);
        const result = await browserApiCall('action', {
            type: 'scroll',
            direction: params.direction,
            amount: params.amount ?? 300,
        });
        return JSON.stringify(result);
    },

    browser_get_state: async () => {
        console.log(`   → Getting page state`);
        const result = await browserApiCall('state?compact=true');
        return JSON.stringify(result);
    },

    browser_check_ready: async (params: { timeoutMs?: number; pollMs?: number } = {}) => {
        const timeout = Math.max(500, Math.min(60_000, params.timeoutMs ?? 8_000));
        const poll = Math.max(100, Math.min(2_000, params.pollMs ?? 300));
        const startedAt = Date.now();

        console.log(`   → Checking readiness (timeout=${timeout}ms, poll=${poll}ms)`);

        let last: any = null;
        let lastReason = 'initial';
        while (Date.now() - startedAt < timeout) {
            last = await browserApiCall('state?compact=true');
            if (!last?.success) {
                lastReason = 'state_not_available';
            } else {
                const state = last.state || {};
                const url = state?.url;
                const title = state?.title;
                const buttons = Array.isArray(state?.buttons) ? state.buttons.length : 0;
                const links = Array.isArray(state?.links) ? state.links.length : 0;
                const inputs = Array.isArray(state?.inputs) ? state.inputs.length : 0;

                if (!url) lastReason = 'missing_url';
                else if (url === 'about:blank' || String(url).startsWith('chrome://')) lastReason = 'browser_transition';
                else if (!title && buttons + links + inputs === 0) lastReason = 'no_visible_elements_yet';
                else {
                    return JSON.stringify({ ready: true, reason: 'ok', waitedMs: Date.now() - startedAt, state: last });
                }
            }

            await new Promise(r => setTimeout(r, poll));
        }

        return JSON.stringify({ ready: false, reason: lastReason, waitedMs: Date.now() - startedAt, state: last });
    },

    browser_screenshot: async (params: { fullPage?: boolean }) => {
        console.log(`   → Taking screenshot`);
        const result = await browserApiCall('screenshot', { fullPage: params.fullPage ?? false });
        // Don't include base64 in output - too large
        if (result.screenshot) {
            result.screenshot = '[base64 data omitted]';
        }
        return JSON.stringify(result);
    },

    browser_wait: async (params: { ms: number }) => {
        console.log(`   → Waiting ${params.ms}ms`);
        await new Promise(resolve => setTimeout(resolve, params.ms));
        return JSON.stringify({ success: true, waited: params.ms });
    },
};

// ============================================================================
// Test Functions
// ============================================================================

async function testToolLocally(toolName: string, parameters: any): Promise<void> {
    console.log(`\n🔧 Testing tool: ${toolName}`);
    console.log(`   Parameters: ${JSON.stringify(parameters)}`);

    const tool = simulatedTools[toolName];
    if (!tool) {
        console.log(`   ❌ Tool not found: ${toolName}`);
        return;
    }

    try {
        const result = await tool(parameters);
        const parsed = JSON.parse(result);
        console.log(`   ✅ Result:`, JSON.stringify(parsed, null, 2).split('\n').map(l => '      ' + l).join('\n'));
    } catch (error) {
        console.log(`   ❌ Error: ${error}`);
    }
}

function generateDashboardConfig(): void {
    console.log('\n' + '═'.repeat(60));
    console.log('📋 ElevenLabs Dashboard Tool Configuration');
    console.log('═'.repeat(60));
    console.log('\nCopy these tool definitions to your ElevenLabs agent dashboard:');
    console.log('https://elevenlabs.io/app/agents → Your Agent → Tools\n');

    for (const tool of TOOL_DEFINITIONS) {
        console.log('─'.repeat(50));
        console.log(`\n📌 Tool: ${tool.name}`);
        console.log(`   Description: ${tool.description}`);
        console.log(`   Parameters:`);

        const props = tool.parameters.properties;
        const required = tool.parameters.required || [];

        if (Object.keys(props).length === 0) {
            console.log(`      (no parameters)`);
        } else {
            for (const [name, schema] of Object.entries(props)) {
                const req = required.includes(name) ? ' (required)' : ' (optional)';
                const enumStr = schema.enum ? ` [${schema.enum.join(', ')}]` : '';
                console.log(`      - ${name}: ${schema.type}${enumStr}${req}`);
                console.log(`        ${schema.description}`);
            }
        }
    }

    console.log('\n' + '─'.repeat(50));
    console.log('\n💡 JSON format for programmatic setup:\n');
    console.log(JSON.stringify(TOOL_DEFINITIONS, null, 2));
}

async function runLocalTests(): Promise<void> {
    console.log('═'.repeat(60));
    console.log('🧪 ElevenLabs Tools Local Test');
    console.log('═'.repeat(60));
    console.log('\nThis simulates how ElevenLabs calls your client tools.\n');

    // Test screenshot tools (no browser needed)
    console.log('\n--- Screenshot Tools (No Browser) ---');
    await testToolLocally('screenshot_list_views', {});
    await testToolLocally('screenshot_set_view', { name: 'CRM-Contacts.png' });
    await testToolLocally('switch_demo_mode', { mode: 'live' });

    // Check if browser is available
    console.log('\n--- Browser Tools (Requires Browser Session) ---');
    console.log('\n⚠️  Browser tools require:');
    console.log('   1. Dev server running: pnpm dev');
    console.log('   2. Active browser session: POST /api/browser/session');

    // Try to check session status
    try {
        const sessionCheck = await fetch(`${API_BASE}/api/browser/state`);
        if (sessionCheck.ok) {
            console.log('\n✅ Browser session detected! Testing browser tools...\n');

            await testToolLocally('browser_get_state', {});
            await testToolLocally('browser_wait', { ms: 500 });
            await testToolLocally('browser_scroll', { direction: 'down', amount: 200 });
        } else {
            console.log('\n⚠️  No active browser session. Skipping browser tool tests.');
            console.log('   To test browser tools, first run:');
            console.log('   npx tsx scripts/test-browser.ts');
        }
    } catch (error) {
        console.log('\n⚠️  Could not connect to dev server. Is it running? (pnpm dev)');
    }

    console.log('\n' + '═'.repeat(60));
    console.log('✅ Local tests completed!');
    console.log('═'.repeat(60));
}

async function runLiveTest(): Promise<void> {
    console.log('═'.repeat(60));
    console.log('🎙️ ElevenLabs Live Test');
    console.log('═'.repeat(60));

    const agentId = process.env.NEXT_PUBLIC_ELEVEN_AGENT_ID;
    const apiKey = process.env.ELEVEN_API_KEY;

    if (!agentId) {
        console.log('\n❌ NEXT_PUBLIC_ELEVEN_AGENT_ID not set in .env');
        console.log('   Set this to your ElevenLabs agent ID to test live.');
        return;
    }

    if (!apiKey) {
        console.log('\n❌ ELEVEN_API_KEY not set in .env');
        return;
    }

    console.log(`\n✅ Agent ID: ${agentId}`);
    console.log('\n📌 To test live, the tools must be configured in the ElevenLabs dashboard.');
    console.log('   Run with --generate-config to see the tool definitions.\n');

    // Test API connection
    console.log('Testing ElevenLabs API connection...');
    try {
        const response = await fetch('https://api.elevenlabs.io/v1/user', {
            headers: { 'xi-api-key': apiKey },
        });

        if (response.ok) {
            const user = await response.json();
            console.log(`✅ Connected to ElevenLabs as: ${user.email || user.user_id}`);
        } else {
            console.log(`❌ API error: ${response.status}`);
        }
    } catch (error) {
        console.log(`❌ Connection error: ${error}`);
    }

    console.log('\n💡 Live voice testing should be done in the browser at:');
    console.log(`   ${API_BASE}/agent-demo`);
}

// ============================================================================
// Main
// ============================================================================

async function main() {
    const args = process.argv.slice(2);

    if (args.includes('--generate-config') || args.includes('-g')) {
        generateDashboardConfig();
    } else if (args.includes('--live-test') || args.includes('-l')) {
        await runLiveTest();
    } else if (args.includes('--help') || args.includes('-h')) {
        console.log(`
ElevenLabs Tools Test Script

Usage:
  npx tsx scripts/test-eleven-labs-tools.ts [options]

Options:
  --generate-config, -g    Generate tool definitions for ElevenLabs dashboard
  --live-test, -l          Test connection to ElevenLabs API
  --help, -h               Show this help message

Without options, runs local tool simulation tests.

Requirements:
  - Dev server running (pnpm dev) for browser tool tests
  - ELEVEN_API_KEY in .env for live tests
  - NEXT_PUBLIC_ELEVEN_AGENT_ID in .env for live tests
`);
    } else {
        await runLocalTests();
        console.log('\n💡 Run with --generate-config to see dashboard setup instructions.');
    }
}

main().catch(console.error);
