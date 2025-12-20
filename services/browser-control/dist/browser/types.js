import { z } from 'zod';
// ============================================================================
// Browser Actions - Zod Schemas
// ============================================================================
export const ClickAction = z.object({
    type: z.literal('click'),
    x: z.number(),
    y: z.number(),
});
export const ClickElementAction = z.object({
    type: z.literal('click_element'),
    selector: z.string(),
});
export const TypeAction = z.object({
    type: z.literal('type'),
    text: z.string(),
});
export const TypeElementAction = z.object({
    type: z.literal('type_element'),
    selector: z.string(),
    text: z.string(),
});
export const KeyAction = z.object({
    type: z.literal('key'),
    key: z.string(),
});
export const ScrollAction = z.object({
    type: z.literal('scroll'),
    direction: z.enum(['up', 'down', 'left', 'right']),
    amount: z.number().optional().nullable(),
});
export const ScrollToAction = z.object({
    type: z.literal('scroll_to'),
    selector: z.string(),
});
export const NavigateAction = z.object({
    type: z.literal('navigate'),
    url: z.string(),
});
export const SimpleAction = z.object({
    type: z.enum(['back', 'forward', 'refresh', 'get_state', 'get_state_compact', 'screenshot']),
});
export const HoverAction = z.object({
    type: z.literal('hover'),
    x: z.number(),
    y: z.number(),
});
export const HoverElementAction = z.object({
    type: z.literal('hover_element'),
    selector: z.string(),
});
export const BrowserAction = z.discriminatedUnion('type', [
    ClickAction,
    ClickElementAction,
    TypeAction,
    TypeElementAction,
    KeyAction,
    ScrollAction,
    ScrollToAction,
    NavigateAction,
    SimpleAction,
    HoverAction,
    HoverElementAction,
]);
//# sourceMappingURL=types.js.map