#!/usr/bin/env npx tsx
/**
 * ElevenLabs Tools Sync Script
 *
 * Creates/updates tools via API and links them to the agent.
 * This is the single source of truth for tool definitions.
 *
 * Usage:
 *   npx tsx scripts/sync-eleven-labs-tools.ts           # Sync tools to ElevenLabs
 *   npx tsx scripts/sync-eleven-labs-tools.ts --clean   # Delete existing tools first
 *   npx tsx scripts/sync-eleven-labs-tools.ts --dry-run # Preview without making changes
 */

import 'dotenv/config';
import * as https from 'https';

const AGENT_ID = process.env.NEXT_PUBLIC_ELEVEN_AGENT_ID;
const API_KEY = process.env.ELEVEN_API_KEY;

if (!AGENT_ID || !API_KEY) {
    console.error('Missing required environment variables:');
    if (!AGENT_ID) console.error('  - NEXT_PUBLIC_ELEVEN_AGENT_ID');
    if (!API_KEY) console.error('  - ELEVEN_API_KEY');
    process.exit(1);
}

// =============================================================================
// Tool Definitions - Single Source of Truth
// =============================================================================

interface ToolParameter {
    type: string;
    description: string;
    enum?: string[];
}

interface ToolDefinition {
    name: string;
    description: string;
    parameters?: {
        type: 'object';
        properties: Record<string, ToolParameter>;
        required: string[];
    };
}

const TOOL_DEFINITIONS: ToolDefinition[] = [
    // Screenshot Tools
    {
        name: 'screenshot_list_views',
        description: 'List all available screenshot views that can be displayed to the user. Call this first to see what screens are available.',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'screenshot_set_view',
        description: 'Display a specific screenshot to the user. Use this to show different screens, pages, or UI states.',
        parameters: {
            type: 'object',
            properties: {
                name: {
                    type: 'string',
                    description: 'The filename or partial name of the screenshot to display (e.g., "contacts", "deals", "dashboard")',
                },
            },
            required: ['name'],
        },
    },
    // Mode Switching
    {
        name: 'switch_demo_mode',
        description: 'Switch between screenshot mode and live browser mode. Use screenshot mode for explanations, live mode for interactive demos.',
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
    // Browser Tools (Live Mode)
    {
        name: 'browser_session_status',
        description: 'Check whether there is an active live browser session.',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'browser_start_session',
        description: 'Start a live browser session if one is not already running.',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'browser_navigate',
        description: 'Navigate the browser to a URL. Only works in live mode.',
        parameters: {
            type: 'object',
            properties: {
                url: {
                    type: 'string',
                    description: 'The full URL to navigate to',
                },
            },
            required: ['url'],
        },
    },
    {
        name: 'browser_click',
        description: 'Click an element by CSS selector. Use selectors from browser_get_state(). Only works in live mode.',
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
        description: 'Click on a button, link, or element by its visible text. Only works in live mode.',
        parameters: {
            type: 'object',
            properties: {
                text: {
                    type: 'string',
                    description: 'The visible text of the element to click',
                },
                tag: {
                    type: 'string',
                    description: 'Optional HTML tag to narrow search (button, a, span, div)',
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
        description: 'Type text into an input field. Only works in live mode.',
        parameters: {
            type: 'object',
            properties: {
                selector: {
                    type: 'string',
                    description: 'CSS selector for the input (e.g., "#search", "input[name=email]")',
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
        description: 'Press a keyboard key (e.g., Enter, Escape, Tab). Only works in live mode.',
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
        description: 'Scroll the page up or down. Only works in live mode.',
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
        description: 'Get current page state including visible buttons, links, inputs, and text. Use to understand what actions are available. Only works in live mode.',
        parameters: {
            type: 'object',
            properties: {},
            required: [],
        },
    },
    {
        name: 'browser_screenshot',
        description: 'Take a screenshot of the current page. Only works in live mode.',
        parameters: {
            type: 'object',
            properties: {
                fullPage: {
                    type: 'boolean',
                    description: 'Whether to capture the full page (default: false)',
                },
            },
            required: [],
        },
    },
    {
        name: 'browser_wait',
        description: 'Wait for a specified amount of time. Only works in live mode.',
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
    {
        name: 'browser_check_ready',
        description: 'Check whether the live website is ready enough for interaction (URL loaded + visible elements). Optionally waits up to timeoutMs.',
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
            required: [],
        },
    },
];

// =============================================================================
// API Helpers
// =============================================================================

function makeRequest(method: string, path: string, body?: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const postData = body ? JSON.stringify(body) : '';

        const options: https.RequestOptions = {
            hostname: 'api.elevenlabs.io',
            path: path,
            method: method,
            headers: {
                'xi-api-key': API_KEY!,
                'Content-Type': 'application/json',
                ...(postData && { 'Content-Length': Buffer.byteLength(postData) }),
            },
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = data ? JSON.parse(data) : {};
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`API ${res.statusCode}: ${JSON.stringify(json)}`));
                    } else {
                        resolve(json);
                    }
                } catch (e) {
                    if (res.statusCode && res.statusCode >= 400) {
                        reject(new Error(`API ${res.statusCode}: ${data}`));
                    } else {
                        resolve(data || {});
                    }
                }
            });
        });

        req.on('error', reject);
        if (postData) req.write(postData);
        req.end();
    });
}

// =============================================================================
// Tool Management Functions
// =============================================================================

async function listExistingTools(): Promise<any[]> {
    const response = await makeRequest('GET', '/v1/convai/tools');
    return response.tools || [];
}

async function createTool(definition: ToolDefinition): Promise<string> {
    const toolConfig: any = {
        type: 'client',
        name: definition.name,
        description: definition.description,
        response_timeout_secs: 30,
        expects_response: true,
        execution_mode: 'immediate',
    };

    // Add parameters if defined
    if (definition.parameters && Object.keys(definition.parameters.properties).length > 0) {
        toolConfig.parameters = {
            type: 'object',
            required: definition.parameters.required,
            description: '',
            properties: Object.fromEntries(
                Object.entries(definition.parameters.properties).map(([key, val]) => [
                    key,
                    {
                        type: val.type,
                        description: val.description,
                        enum: val.enum || null,
                        is_system_provided: false,
                        dynamic_variable: '',
                        constant_value: '',
                    },
                ])
            ),
        };
    }

    const response = await makeRequest('POST', '/v1/convai/tools', { tool_config: toolConfig });
    return response.id;
}

async function deleteTool(toolId: string): Promise<void> {
    await makeRequest('DELETE', `/v1/convai/tools/${toolId}`);
}

async function updateAgentTools(toolIds: string[]): Promise<void> {
    await makeRequest('PATCH', `/v1/convai/agents/${AGENT_ID}`, {
        conversation_config: {
            agent: {
                prompt: {
                    tool_ids: toolIds,
                },
            },
        },
    });
}

async function getAgentToolIds(): Promise<string[]> {
    const response = await makeRequest('GET', `/v1/convai/agents/${AGENT_ID}`);
    return response.conversation_config?.agent?.prompt?.tool_ids || [];
}

// =============================================================================
// Main Sync Logic
// =============================================================================

async function syncTools(options: { clean: boolean; dryRun: boolean }) {
    console.log('═'.repeat(60));
    console.log('🔧 ElevenLabs Tools Sync');
    console.log('═'.repeat(60));
    console.log(`Agent ID: ${AGENT_ID}`);
    console.log(`Dry run: ${options.dryRun}`);
    console.log(`Clean: ${options.clean}`);
    console.log();

    // Get existing tools
    console.log('📥 Fetching existing tools...');
    const existingTools = await listExistingTools();

    // Find our tools (by name prefix)
    const ourToolNames = new Set(TOOL_DEFINITIONS.map(t => t.name));
    const ourExistingTools = existingTools.filter(t => ourToolNames.has(t.tool_config?.name));

    console.log(`   Found ${existingTools.length} total tools`);
    console.log(`   Found ${ourExistingTools.length} of our tools already created`);

    // Clean mode: delete existing tools first
    if (options.clean && ourExistingTools.length > 0) {
        console.log('\n🗑️  Cleaning existing tools...');
        for (const tool of ourExistingTools) {
            console.log(`   Deleting: ${tool.tool_config.name} (${tool.id})`);
            if (!options.dryRun) {
                await deleteTool(tool.id);
            }
        }
        ourExistingTools.length = 0; // Clear the array
    }

    // Create missing tools
    const existingNames = new Set(ourExistingTools.map(t => t.tool_config?.name));
    const toolsToCreate = TOOL_DEFINITIONS.filter(t => !existingNames.has(t.name));

    const toolIds: string[] = ourExistingTools.map(t => t.id);

    if (toolsToCreate.length > 0) {
        console.log(`\n📤 Creating ${toolsToCreate.length} tools...`);
        for (const def of toolsToCreate) {
            console.log(`   Creating: ${def.name}`);
            if (!options.dryRun) {
                const toolId = await createTool(def);
                toolIds.push(toolId);
                console.log(`   ✅ Created: ${toolId}`);
            } else {
                console.log(`   [DRY RUN] Would create tool`);
            }
        }
    } else {
        console.log('\n✅ All tools already exist');
    }

    // Link tools to agent
    console.log('\n🔗 Linking tools to agent...');
    const currentAgentToolIds = await getAgentToolIds();

    // Merge existing agent tools with our tools (avoid duplicates)
    const allToolIds = [...new Set([...currentAgentToolIds, ...toolIds])];

    if (!options.dryRun) {
        await updateAgentTools(allToolIds);
        console.log(`   ✅ Agent now has ${allToolIds.length} tools`);
    } else {
        console.log(`   [DRY RUN] Would link ${toolIds.length} tools`);
    }

    // Summary
    console.log('\n' + '═'.repeat(60));
    console.log('📋 Summary');
    console.log('═'.repeat(60));

    if (!options.dryRun) {
        const finalTools = await listExistingTools();
        const finalOurTools = finalTools.filter(t => ourToolNames.has(t.tool_config?.name));

        console.log('\nTools configured:');
        for (const tool of finalOurTools) {
            console.log(`   ✅ ${tool.tool_config.name} (${tool.id})`);
        }

        const finalAgentToolIds = await getAgentToolIds();
        console.log(`\nAgent has ${finalAgentToolIds.length} tools linked`);
    }

    console.log('\n✅ Sync complete!');
}

// =============================================================================
// CLI
// =============================================================================

async function main() {
    const args = process.argv.slice(2);

    const options = {
        clean: args.includes('--clean'),
        dryRun: args.includes('--dry-run'),
    };

    if (args.includes('--help') || args.includes('-h')) {
        console.log(`
ElevenLabs Tools Sync Script

Usage:
  npx tsx scripts/sync-eleven-labs-tools.ts [options]

Options:
  --clean      Delete existing tools before creating new ones
  --dry-run    Preview changes without making them
  --help, -h   Show this help message

This script:
1. Creates client tools in ElevenLabs if they don't exist
2. Links the tools to your agent
3. Is idempotent - safe to run multiple times
`);
        return;
    }

    await syncTools(options);
}

main().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
