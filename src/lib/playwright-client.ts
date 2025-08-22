import { z } from 'zod';

const BASE_URL = 'http://localhost:8831';

async function makeApiCall(endpoint: string, method: 'GET' | 'POST', body?: any) {
    const url = `${BASE_URL}${endpoint}`;
    const options: RequestInit = {
        method,
        headers: {
            'Content-Type': 'application/json',
        },
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        console.debug(`[playwrightClient] → ${method} ${url}`, body ?? '');
        const response = await fetch(url, options);
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`API call to ${endpoint} failed with status ${response.status}: ${errorBody}`);
        }
        const json = await response.json();
        console.debug(`[playwrightClient] ← ${method} ${url}`, json?.data ?? json);
        return json.data;
    } catch (error) {
        console.error(`Error during API call to ${endpoint}:`, error);
        throw error;
    }
}

export const playwrightClient = {
    // Browser Routes
    browser: {
        close: () => makeApiCall('/browser/close', 'POST'),
        resize: (body: { width: number; height: number }) => makeApiCall('/browser/resize', 'POST', body),
        getConsoleMessages: () => makeApiCall('/browser/console_messages', 'GET'),
        getNetworkRequests: () => makeApiCall('/browser/network_requests', 'GET'),
        snapshot: () => makeApiCall('/browser/snapshot', 'GET'),
        install: () => makeApiCall('/browser/install', 'POST'),
        handleDialog: (body: { accept: boolean; promptText?: string }) => makeApiCall('/browser/handle_dialog', 'POST', body),
        evaluate: (body: { ref?: string; function: string }) => makeApiCall('/browser/evaluate', 'POST', body),
        getCookies: () => makeApiCall('/browser/cookies', 'GET'),
    },
    // Elements Routes (new, preferred)
    elements: {
        candidates: () => makeApiCall('/elements/candidates', 'GET'),
        click: (body: { ref: string; timeoutMs?: number }) => makeApiCall('/elements/click', 'POST', body),
        type: (body: { ref: string; text: string; submit?: boolean; timeoutMs?: number }) => makeApiCall('/elements/type', 'POST', body),
    },
    // Page Routes
    page: {
        navigate: (body: { url: string }) => makeApiCall('/page/navigate', 'POST', body),
        navigateBack: () => makeApiCall('/page/navigate_back', 'POST'),
        navigateForward: () => makeApiCall('/page/navigate_forward', 'POST'),
        pressKey: (body: { key: string }) => makeApiCall('/page/press_key', 'POST', body),
        click: (body: { ref: string; button?: 'left' | 'right' | 'middle'; doubleClick?: boolean }) => makeApiCall('/page/click', 'POST', body),
        type: (body: { ref: string; text: string; submit?: boolean }) => makeApiCall('/page/type', 'POST', body),
        hover: (body: { ref: string }) => makeApiCall('/page/hover', 'POST', body),
        selectOption: (body: { ref: string; values: string[] }) => makeApiCall('/page/select_option', 'POST', body),
        drag: (body: { startRef: string; endRef: string }) => makeApiCall('/page/drag', 'POST', body),
        uploadFile: (body: { ref: string; paths: string[] }) => makeApiCall('/page/file_upload', 'POST', body),
        takeScreenshot: (body: { ref?: string; filename?: string; fullPage?: boolean; raw?: boolean }) => makeApiCall('/page/take_screenshot', 'POST', body),
        waitFor: (body: { text?: string; textGone?: string; time?: number }) => makeApiCall('/page/wait_for', 'POST', body),
    },
    // Tab Routes
    tabs: {
        list: () => makeApiCall('/tabs/list', 'GET'),
        new: (body: { url?: string }) => makeApiCall('/tabs/new', 'POST', body),
        select: (body: { index: number }) => makeApiCall('/tabs/select', 'POST', body),
        close: (body: { index?: number }) => makeApiCall('/tabs/close', 'POST', body),
    },
};
