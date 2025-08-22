import { tool } from '@openai/agents/realtime';
import { z } from 'zod';
import { playwrightClient } from './playwright-client';

const playwrightTools = [
    // Browser tools
    tool({
        name: 'browser_close',
        description: 'Closes the browser.',
        parameters: z.object({}),
        execute: async () => {
            console.debug('[tool] browser_close');
            const res = await playwrightClient.browser.close();
            console.debug('[tool] browser_close ←', res);
            return res;
        },
    }),
    tool({
        name: 'browser_resize',
        description: 'Resizes the browser window.',
        parameters: z.object({
            width: z.number().describe('The new width of the browser window.'),
            height: z.number().describe('The new height of the browser window.'),
        }),
        execute: async (args) => {
            console.debug('[tool] browser_resize →', args);
            const res = await playwrightClient.browser.resize(args);
            console.debug('[tool] browser_resize ←', res);
            return res;
        },
    }),
    tool({
        name: 'browser_get_console_messages',
        description: 'Retrieves console messages from the browser.',
        parameters: z.object({}),
        execute: async () => {
            console.debug('[tool] browser_get_console_messages');
            const res = await playwrightClient.browser.getConsoleMessages();
            console.debug('[tool] browser_get_console_messages ←', res);
            return res;
        },
    }),
    tool({
        name: 'browser_handle_dialog',
        description: 'Handles dialogs like alerts, confirms, or prompts.',
        parameters: z.object({
            accept: z.boolean().describe('Whether to accept or dismiss the dialog.'),
            promptText: z.string().optional().nullable().describe('Text to enter into a prompt dialog.'),
        }),
        execute: async (args) => {
            const payload = { accept: args.accept, promptText: args.promptText ?? undefined };
            console.debug('[tool] browser_handle_dialog →', payload);
            const res = await playwrightClient.browser.handleDialog(payload);
            console.debug('[tool] browser_handle_dialog ←', res);
            return res;
        },
    }),
    tool({
        name: 'browser_evaluate',
        description: 'Executes a JavaScript function on the page.',
        parameters: z.object({
            ref: z.string().optional().nullable().describe('Reference to an element to pass to the function.'),
            function: z.string().describe('The JavaScript function to evaluate.'),
        }),
        execute: async (args) => {
            const payload = { function: args.function, ref: args.ref ?? undefined };
            console.debug('[tool] browser_evaluate →', payload);
            const res = await playwrightClient.browser.evaluate(payload);
            console.debug('[tool] browser_evaluate ←', res);
            return res;
        },
    }),
    tool({
        name: 'browser_get_cookies',
        description: 'Retrieves all browser cookies for the current context.',
        parameters: z.object({}),
        execute: async () => {
            console.debug('[tool] browser_get_cookies');
            const res = await playwrightClient.browser.getCookies();
            console.debug('[tool] browser_get_cookies ←', res);
            return res;
        },
    }),
    // Prefer candidates over legacy snapshot
    tool({
        name: 'elements_candidates',
        description: 'Returns ranked actionable element candidates with selector-based refs. Use this to choose an element before clicking or typing.',
        parameters: z.object({}),
        execute: async () => {
            console.debug('[tool] elements_candidates');
            const res = await playwrightClient.elements.candidates();
            console.debug('[tool] elements_candidates ←', res);
            return res;
        },
    }),

    // Page tools
    tool({
        name: 'page_navigate',
        description: 'Navigates the current page to a new URL.',
        parameters: z.object({
            url: z.string().describe('The URL to navigate to.'),
        }),
        execute: async (args) => {
            console.debug('[tool] page_navigate →', args);
            const res = await playwrightClient.page.navigate(args);
            console.debug('[tool] page_navigate ←', res);
            return res;
        },
    }),
    tool({
        name: 'page_navigate_back',
        description: 'Navigates to the previous page in history.',
        parameters: z.object({}),
        execute: async () => {
            console.debug('[tool] page_navigate_back');
            const res = await playwrightClient.page.navigateBack();
            console.debug('[tool] page_navigate_back ←', res);
            return res;
        },
    }),
    tool({
        name: 'page_navigate_forward',
        description: 'Navigates to the next page in history.',
        parameters: z.object({}),
        execute: async () => {
            console.debug('[tool] page_navigate_forward');
            const res = await playwrightClient.page.navigateForward();
            console.debug('[tool] page_navigate_forward ←', res);
            return res;
        },
    }),
    tool({
        name: 'page_press_key',
        description: 'Presses a key on the keyboard.',
        parameters: z.object({
            key: z.string().describe('The key to press.'),
        }),
        execute: async (args) => {
            console.debug('[tool] page_press_key →', args);
            const res = await playwrightClient.page.pressKey(args);
            console.debug('[tool] page_press_key ←', res);
            return res;
        },
    }),
    tool({
        name: 'elements_click',
        description: 'Clicks an element by selector-based ref from elements_candidates with hardened interaction.',
        parameters: z.object({
            ref: z.string().describe('The ref from elements_candidates.'),
            timeoutMs: z.number().optional().nullable().describe('Timeout in ms.'),
        }),
        execute: async (args) => {
            console.debug('[tool] elements_click →', args);
            const res = await playwrightClient.elements.click(args as any);
            console.debug('[tool] elements_click ←', res);
            return res;
        },
    }),
    tool({
        name: 'elements_type',
        description: 'Types into an element by selector-based ref from elements_candidates with hardened interaction.',
        parameters: z.object({
            ref: z.string().describe('The ref from elements_candidates.'),
            text: z.string().describe('The text to type.'),
            submit: z.boolean().optional().nullable().describe('Whether to press Enter after typing.'),
            timeoutMs: z.number().optional().nullable().describe('Timeout in ms.'),
        }),
        execute: async (args) => {
            console.debug('[tool] elements_type →', args);
            const res = await playwrightClient.elements.type(args as any);
            console.debug('[tool] elements_type ←', res);
            return res;
        },
    }),
    tool({
        name: 'page_hover',
        description: 'Hovers over an element identified by its ref.',
        parameters: z.object({
            ref: z.string().describe('The ref of the element to hover over.'),
        }),
        execute: async (args) => {
            console.debug('[tool] page_hover →', args);
            const res = await playwrightClient.page.hover(args);
            console.debug('[tool] page_hover ←', res);
            return res;
        },
    }),
    tool({
        name: 'page_select_option',
        description: 'Selects options in a <select> element identified by its ref.',
        parameters: z.object({
            ref: z.string().describe('The ref of the select element.'),
            values: z.array(z.string()).describe('The values of the options to select.'),
        }),
        execute: async (args) => {
            console.debug('[tool] page_select_option →', args);
            const res = await playwrightClient.page.selectOption(args);
            console.debug('[tool] page_select_option ←', res);
            return res;
        },
    }),
    tool({
        name: 'page_drag',
        description: 'Performs a drag-and-drop operation between two elements.',
        parameters: z.object({
            startRef: z.string().describe('The ref of the element to drag.'),
            endRef: z.string().describe('The ref of the drop target.'),
        }),
        execute: async (args) => {
            console.debug('[tool] page_drag →', args);
            const res = await playwrightClient.page.drag(args);
            console.debug('[tool] page_drag ←', res);
            return res;
        },
    }),
    tool({
        name: 'page_file_upload',
        description: 'Uploads files to a file input element.',
        parameters: z.object({
            ref: z.string().describe('The ref of the file input element.'),
            paths: z.array(z.string()).describe('An array of file paths to upload.'),
        }),
        execute: async (args) => {
            console.debug('[tool] page_file_upload →', args);
            const res = await playwrightClient.page.uploadFile(args);
            console.debug('[tool] page_file_upload ←', res);
            return res;
        },
    }),
    tool({
        name: 'page_take_screenshot',
        description: 'Takes a screenshot of the page or a specific element.',
        parameters: z.object({
            ref: z.string().optional().nullable().describe('The ref of an element to screenshot.'),
            filename: z.string().optional().nullable().describe('The filename to save the screenshot as.'),
            fullPage: z.boolean().optional().nullable().describe('Whether to take a full page screenshot.'),
            raw: z.boolean().optional().nullable().describe('Whether to return the raw image buffer.'),
        }),
        execute: async (args) => {
            const payload = {
                ref: args.ref ?? undefined,
                filename: args.filename ?? undefined,
                fullPage: args.fullPage ?? undefined,
                raw: args.raw ?? undefined,
            };
            console.debug('[tool] page_take_screenshot →', payload);
            const res = await playwrightClient.page.takeScreenshot(payload);
            console.debug('[tool] page_take_screenshot ←', res);
            return res;
        },
    }),
    tool({
        name: 'page_wait_for',
        description: 'Waits for a specific condition to be met.',
        parameters: z.object({
            text: z.string().optional().nullable().describe('Text to wait for.'),
            textGone: z.string().optional().nullable().describe('Text to wait to disappear.'),
            time: z.number().optional().nullable().describe('Time to wait in seconds.'),
        }),
        execute: async (args) => {
            const payload = {
                text: args.text ?? undefined,
                textGone: args.textGone ?? undefined,
                time: args.time ?? undefined,
            };
            console.debug('[tool] page_wait_for →', payload);
            const res = await playwrightClient.page.waitFor(payload);
            console.debug('[tool] page_wait_for ←', res);
            return res;
        },
    }),

    // Tabs tools
    tool({
        name: 'tabs_list',
        description: 'Lists all open tabs.',
        parameters: z.object({}),
        execute: async () => {
            console.debug('[tool] tabs_list');
            const res = await playwrightClient.tabs.list();
            console.debug('[tool] tabs_list ←', res);
            return res;
        },
    }),
    tool({
        name: 'tabs_new',
        description: 'Opens a new tab and switches focus to it.',
        parameters: z.object({
            url: z.string().optional().nullable().describe('The URL to open in the new tab.'),
        }),
        execute: async (args) => {
            const payload = { url: args.url ?? undefined };
            console.debug('[tool] tabs_new →', payload);
            const res = await playwrightClient.tabs.new(payload);
            console.debug('[tool] tabs_new ←', res);
            return res;
        },
    }),
    tool({
        name: 'tabs_select',
        description: 'Switches to a different tab by its index.',
        parameters: z.object({
            index: z.number().describe('The index of the tab to switch to.'),
        }),
        execute: async (args) => {
            console.debug('[tool] tabs_select →', args);
            const res = await playwrightClient.tabs.select(args);
            console.debug('[tool] tabs_select ←', res);
            return res;
        },
    }),
    tool({
        name: 'tabs_close',
        description: 'Closes a tab. Closes the current tab if no index is provided.',
        parameters: z.object({
            index: z.number().optional().nullable().describe('The index of the tab to close.'),
        }),
        execute: async (args) => {
            const payload = { index: args.index ?? undefined };
            console.debug('[tool] tabs_close →', payload);
            const res = await playwrightClient.tabs.close(payload);
            console.debug('[tool] tabs_close ←', res);
            return res;
        },
    }),
];

export default playwrightTools;
