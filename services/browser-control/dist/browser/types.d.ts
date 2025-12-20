import { z } from 'zod';
export declare const ClickAction: z.ZodObject<{
    type: z.ZodLiteral<"click">;
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "click";
    x: number;
    y: number;
}, {
    type: "click";
    x: number;
    y: number;
}>;
export declare const ClickElementAction: z.ZodObject<{
    type: z.ZodLiteral<"click_element">;
    selector: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "click_element";
    selector: string;
}, {
    type: "click_element";
    selector: string;
}>;
export declare const TypeAction: z.ZodObject<{
    type: z.ZodLiteral<"type">;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "type";
    text: string;
}, {
    type: "type";
    text: string;
}>;
export declare const TypeElementAction: z.ZodObject<{
    type: z.ZodLiteral<"type_element">;
    selector: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "type_element";
    selector: string;
    text: string;
}, {
    type: "type_element";
    selector: string;
    text: string;
}>;
export declare const KeyAction: z.ZodObject<{
    type: z.ZodLiteral<"key">;
    key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "key";
    key: string;
}, {
    type: "key";
    key: string;
}>;
export declare const ScrollAction: z.ZodObject<{
    type: z.ZodLiteral<"scroll">;
    direction: z.ZodEnum<["up", "down", "left", "right"]>;
    amount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    type: "scroll";
    direction: "up" | "down" | "left" | "right";
    amount?: number | null | undefined;
}, {
    type: "scroll";
    direction: "up" | "down" | "left" | "right";
    amount?: number | null | undefined;
}>;
export declare const ScrollToAction: z.ZodObject<{
    type: z.ZodLiteral<"scroll_to">;
    selector: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "scroll_to";
    selector: string;
}, {
    type: "scroll_to";
    selector: string;
}>;
export declare const NavigateAction: z.ZodObject<{
    type: z.ZodLiteral<"navigate">;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "navigate";
    url: string;
}, {
    type: "navigate";
    url: string;
}>;
export declare const SimpleAction: z.ZodObject<{
    type: z.ZodEnum<["back", "forward", "refresh", "get_state", "get_state_compact", "screenshot"]>;
}, "strip", z.ZodTypeAny, {
    type: "back" | "forward" | "refresh" | "get_state" | "get_state_compact" | "screenshot";
}, {
    type: "back" | "forward" | "refresh" | "get_state" | "get_state_compact" | "screenshot";
}>;
export declare const HoverAction: z.ZodObject<{
    type: z.ZodLiteral<"hover">;
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "hover";
    x: number;
    y: number;
}, {
    type: "hover";
    x: number;
    y: number;
}>;
export declare const HoverElementAction: z.ZodObject<{
    type: z.ZodLiteral<"hover_element">;
    selector: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "hover_element";
    selector: string;
}, {
    type: "hover_element";
    selector: string;
}>;
export declare const BrowserAction: z.ZodDiscriminatedUnion<"type", [z.ZodObject<{
    type: z.ZodLiteral<"click">;
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "click";
    x: number;
    y: number;
}, {
    type: "click";
    x: number;
    y: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"click_element">;
    selector: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "click_element";
    selector: string;
}, {
    type: "click_element";
    selector: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"type">;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "type";
    text: string;
}, {
    type: "type";
    text: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"type_element">;
    selector: z.ZodString;
    text: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "type_element";
    selector: string;
    text: string;
}, {
    type: "type_element";
    selector: string;
    text: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"key">;
    key: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "key";
    key: string;
}, {
    type: "key";
    key: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"scroll">;
    direction: z.ZodEnum<["up", "down", "left", "right"]>;
    amount: z.ZodNullable<z.ZodOptional<z.ZodNumber>>;
}, "strip", z.ZodTypeAny, {
    type: "scroll";
    direction: "up" | "down" | "left" | "right";
    amount?: number | null | undefined;
}, {
    type: "scroll";
    direction: "up" | "down" | "left" | "right";
    amount?: number | null | undefined;
}>, z.ZodObject<{
    type: z.ZodLiteral<"scroll_to">;
    selector: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "scroll_to";
    selector: string;
}, {
    type: "scroll_to";
    selector: string;
}>, z.ZodObject<{
    type: z.ZodLiteral<"navigate">;
    url: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "navigate";
    url: string;
}, {
    type: "navigate";
    url: string;
}>, z.ZodObject<{
    type: z.ZodEnum<["back", "forward", "refresh", "get_state", "get_state_compact", "screenshot"]>;
}, "strip", z.ZodTypeAny, {
    type: "back" | "forward" | "refresh" | "get_state" | "get_state_compact" | "screenshot";
}, {
    type: "back" | "forward" | "refresh" | "get_state" | "get_state_compact" | "screenshot";
}>, z.ZodObject<{
    type: z.ZodLiteral<"hover">;
    x: z.ZodNumber;
    y: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    type: "hover";
    x: number;
    y: number;
}, {
    type: "hover";
    x: number;
    y: number;
}>, z.ZodObject<{
    type: z.ZodLiteral<"hover_element">;
    selector: z.ZodString;
}, "strip", z.ZodTypeAny, {
    type: "hover_element";
    selector: string;
}, {
    type: "hover_element";
    selector: string;
}>]>;
export type BrowserAction = z.infer<typeof BrowserAction>;
export interface Cookie {
    name: string;
    value: string;
    domain: string;
    path?: string;
    expires?: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
}
export interface BrowserbaseConfig {
    apiKey: string;
    projectId: string;
    /**
     * Optional region for Browserbase sessions, e.g. "ap-southeast-1"
     */
    region?: string;
}
export interface BrowserControllerOptions {
    headless?: boolean;
    viewport?: {
        width: number;
        height: number;
    };
    cookies?: Cookie[];
    useBrowserbase?: boolean;
    browserbaseConfig?: BrowserbaseConfig;
}
export interface InteractiveElement {
    index: number;
    tag: string;
    type?: string;
    text: string;
    selector: string;
    boundingBox: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    attributes: Record<string, string>;
    isVisible: boolean;
    isEnabled: boolean;
}
export interface CompactElement {
    s: string;
    t: string;
    k: string;
    d?: boolean;
}
export interface PageStateOptions {
    lite?: boolean;
    maxElements?: number;
    maxHtmlLength?: number;
    maxTextLength?: number;
    includeIframes?: boolean;
}
export interface PageState {
    url: string;
    title: string;
    html: string;
    textContent: string;
    interactiveElements: InteractiveElement[];
    viewport: {
        width: number;
        height: number;
    };
}
export interface PageStateLite {
    url: string;
    title: string;
    elementCount: number;
    viewport: {
        width: number;
        height: number;
    };
}
export interface TableSummary {
    headers: string[];
    rowCount: number;
    rows: TableRow[];
    patterns?: {
        select?: string;
        preview?: string;
        click?: string;
    };
}
export interface TableRow {
    id?: string;
    cells: string[];
}
export interface PageStateCompact {
    url: string;
    title: string;
    buttons: CompactElement[];
    links: CompactElement[];
    inputs: CompactElement[];
    other: CompactElement[];
    tables?: TableSummary[];
    lists?: string[];
    summary: string;
}
export interface SessionInfo {
    id: string;
    createdAt: Date;
    url?: string;
    browserbaseSessionId?: string;
}
//# sourceMappingURL=types.d.ts.map