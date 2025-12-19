#!/usr/bin/env npx tsx
/**
 * Browser Integration Test Script
 * 
 * Tests the browser automation API by:
 * 1. Creating a session
 * 2. Navigating to pages
 * 3. Getting page state
 * 4. Interacting with elements
 * 5. Closing the session
 * 
 * Usage:
 *   npx tsx scripts/test-browser.ts
 *   
 * Make sure the dev server is running first:
 *   pnpm dev
 */

const API_BASE = 'http://localhost:3001/api/browser';

interface ApiResponse {
    success?: boolean;
    error?: string;
    [key: string]: unknown;
}

async function apiCall(endpoint: string, options?: RequestInit): Promise<ApiResponse> {
    const url = `${API_BASE}/${endpoint}`;
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    });
    return res.json();
}

async function createSession(loadHubspotCookies: boolean = true): Promise<string | null> {
    console.log('\n🚀 Creating browser session...');
    console.log(`   Browserbase: enabled (cloud browser)`);
    console.log(`   HubSpot cookies: ${loadHubspotCookies ? 'loading from file' : 'not loaded'}`);

    const result = await apiCall('session', {
        method: 'POST',
        body: JSON.stringify({ headless: false, loadHubspotCookies }),
    });

    if (result.error) {
        console.error('❌ Failed to create session:', result.error);
        return null;
    }

    console.log('✅ Session created:', result.id);
    if (result.browserbaseSessionId) {
        console.log('   Browserbase session:', result.browserbaseSessionId);
    }
    return result.id as string;
}

async function closeSession(): Promise<void> {
    console.log('\n🔚 Closing session...');
    const url = `${API_BASE}/session`;
    await fetch(url, { method: 'DELETE' });  // DELETE returns 204 No Content
    console.log('✅ Session closed');
}

async function navigate(url: string): Promise<ApiResponse> {
    console.log(`\n🌐 Navigating to: ${url}`);
    const result = await apiCall('action', {
        method: 'POST',
        body: JSON.stringify({ type: 'navigate', url }),
    });

    if (result.success) {
        const state = result.state as { title?: string; url?: string };
        console.log(`✅ Navigated to: ${state?.title || 'Unknown'}`);
    } else {
        console.error('❌ Navigation failed:', result.error);
    }

    return result;
}

interface TableRow {
    id?: string;
    cells: string[];
}

interface TableData {
    headers?: string[];
    rowCount?: number;
    rows?: TableRow[];
}

interface PageState {
    url?: string;
    title?: string;
    buttons?: unknown[];
    links?: unknown[];
    inputs?: unknown[];
    tables?: TableData[];
}

async function getPageState(): Promise<ApiResponse & { state?: PageState }> {
    console.log('\n📊 Getting page state...');
    const result = await apiCall('action', {
        method: 'POST',
        body: JSON.stringify({ type: 'get_state_compact' }),
    });

    if (result.success && result.state) {
        const state = result.state as PageState;
        console.log('✅ Page state:');
        console.log(`   URL: ${state.url}`);
        console.log(`   Title: ${state.title}`);
        console.log(`   Buttons: ${state.buttons?.length || 0}`);
        console.log(`   Links: ${state.links?.length || 0}`);
        console.log(`   Inputs: ${state.inputs?.length || 0}`);
        console.log(`   Tables: ${state.tables?.length || 0}`);
    }

    return result as ApiResponse & { state?: PageState };
}

async function click(selector: string): Promise<ApiResponse> {
    console.log(`\n👆 Clicking: ${selector}`);
    const result = await apiCall('action', {
        method: 'POST',
        body: JSON.stringify({ type: 'click_element', selector }),
    });

    if (result.success) {
        console.log('✅ Clicked successfully');
    } else {
        console.error('❌ Click failed:', result.error);
    }

    return result;
}

async function typeText(selector: string, text: string): Promise<ApiResponse> {
    console.log(`\n⌨️ Typing into ${selector}: "${text}"`);
    const result = await apiCall('action', {
        method: 'POST',
        body: JSON.stringify({ type: 'type_element', selector, text }),
    });

    if (result.success) {
        console.log('✅ Typed successfully');
    } else {
        console.error('❌ Type failed:', result.error);
    }

    return result;
}

async function pressKey(key: string): Promise<ApiResponse> {
    console.log(`\n⏎ Pressing key: ${key}`);
    const result = await apiCall('action', {
        method: 'POST',
        body: JSON.stringify({ type: 'key', key }),
    });

    if (result.success) {
        console.log('✅ Key pressed');
    } else {
        console.error('❌ Key press failed:', result.error);
    }

    return result;
}

async function takeScreenshot(): Promise<ApiResponse> {
    console.log('\n📸 Taking screenshot...');
    const result = await apiCall('action', {
        method: 'POST',
        body: JSON.stringify({ type: 'screenshot' }),
    });

    if (result.success) {
        console.log('✅ Screenshot captured (base64 data available)');
    } else {
        console.error('❌ Screenshot failed:', result.error);
    }

    return result;
}

async function sleep(ms: number): Promise<void> {
    console.log(`\n⏳ Waiting ${ms}ms...`);
    await new Promise(resolve => setTimeout(resolve, ms));
}

// HubSpot routes for testing
const HUBSPOT_ROUTES = {
    deals: 'https://app-na2.hubspot.com/contacts/243381751/objects/0-3',
    contacts: 'https://app-na2.hubspot.com/contacts/243381751/objects/0-1',
    tasks: 'https://app-na2.hubspot.com/tasks/243381751/view/all',
};

async function runTests() {
    console.log('═'.repeat(50));
    console.log('🧪 Browser Integration Test (Browserbase + HubSpot)');
    console.log('═'.repeat(50));

    // 1. Create session with HubSpot cookies
    const sessionId = await createSession(true);  // Load HubSpot cookies
    if (!sessionId) {
        console.error('Failed to start. Exiting.');
        process.exit(1);
    }

    await sleep(2000);

    try {
        // 2. Navigate to HubSpot Deals (authenticated)
        console.log('\n--- Test 1: HubSpot Deals (Authenticated) ---');
        await navigate(HUBSPOT_ROUTES.deals);
        await sleep(2000);
        const dealsState = await getPageState();

        // Show deals table if available
        if (dealsState.state?.tables?.[0]) {
            const table = dealsState.state.tables[0];
            console.log(`\n   📊 Found ${table.rowCount} deals:`);
            table.rows?.slice(0, 3).forEach((row: TableRow) => {
                console.log(`      - ${row.cells[0]} (${row.cells[4] || 'No amount'})`);
            });
        }

        // 3. Navigate to Contacts
        console.log('\n--- Test 2: HubSpot Contacts ---');
        await navigate(HUBSPOT_ROUTES.contacts);
        await sleep(2000);
        const contactsState = await getPageState();

        // Show contacts if available
        if (contactsState.state?.tables?.[0]) {
            const table = contactsState.state.tables[0];
            console.log(`\n   👥 Found ${table.rowCount} contacts:`);
            table.rows?.slice(0, 3).forEach((row: TableRow) => {
                console.log(`      - ${row.cells[0]} (${row.cells[1] || 'No email'})`);
            });
        }

        // 4. Navigate to Tasks
        console.log('\n--- Test 3: HubSpot Tasks ---');
        await navigate(HUBSPOT_ROUTES.tasks);
        await sleep(2000);
        await getPageState();

        // 5. Take screenshot
        console.log('\n--- Test 4: Screenshot ---');
        await takeScreenshot();

        console.log('\n═'.repeat(50));
        console.log('✅ All tests completed!');
        console.log('═'.repeat(50));

        // Keep browser open for inspection
        console.log('\n⚠️  Browser will stay open for 15 seconds for inspection...');
        console.log('   View live at: https://www.browserbase.com/sessions');
        console.log('   Press Ctrl+C to exit early.\n');
        await sleep(15000);

    } finally {
        // 6. Close session
        await closeSession();
    }
}

// Run tests
runTests().catch(console.error);

