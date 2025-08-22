"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, Code, Save, RotateCcw, Copy, CheckCircle, AlertCircle, FileText, Upload } from "lucide-react";

interface MarkdownEditorProps {
    value: string;
    onChange: (value: string) => void;
    onSave: () => void;
    onCancel?: () => void;
    placeholder?: string;
    title?: string;
    description?: string;
    isLoading?: boolean;
    isDirty?: boolean;
    wordCount?: boolean;
    characterCount?: boolean;
}

export function MarkdownEditor({
    value,
    onChange,
    onSave,
    onCancel,
    placeholder = "Enter your markdown content here...",
    title = "Content Editor",
    description,
    isLoading = false,
    isDirty = false,
    wordCount = true,
    characterCount = true,
}: MarkdownEditorProps) {
    const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit");
    const [copied, setCopied] = useState(false);

    const wordCountValue = value
        .trim()
        .split(/\s+/)
        .filter((word) => word.length > 0).length;
    const characterCountValue = value.length;
    const lineCountValue = value.split("\n").length;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    const renderMarkdownPreview = (markdown: string): string => {
        // Simple markdown preview renderer
        return (
            markdown
                // Headers
                .replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mb-2 mt-4">$1</h3>')
                .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-3 mt-5">$1</h2>')
                .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-4 mt-6">$1</h1>')
                // Bold and Italic
                .replace(/\*\*(.*)\*\*/gim, '<strong class="font-bold">$1</strong>')
                .replace(/\*(.*)\*/gim, '<em class="italic">$1</em>')
                // Lists
                .replace(/^\- (.*$)/gim, '<li class="ml-4">• $1</li>')
                .replace(/^\d+\. (.*$)/gim, '<li class="ml-4">$1</li>')
                // Code blocks
                .replace(
                    /```([\s\S]*?)```/g,
                    '<pre class="bg-gray-100 p-3 rounded-md overflow-x-auto text-sm font-mono my-3"><code>$1</code></pre>'
                )
                .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 py-0.5 rounded text-sm font-mono">$1</code>')
                // Links
                .replace(
                    /\[([^\]]+)\]\(([^)]+)\)/g,
                    '<a href="$2" class="text-blue-600 hover:text-blue-800 underline" target="_blank" rel="noopener noreferrer">$1</a>'
                )
                // Line breaks
                .replace(/\n/g, "<br />")
        );
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center">
                            <FileText className="h-5 w-5 mr-2" />
                            {title}
                        </CardTitle>
                        {description && <p className="text-sm text-gray-600 mt-1">{description}</p>}
                    </div>
                    <div className="flex items-center space-x-2">
                        {isDirty && (
                            <Badge variant="secondary" className="text-xs">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Unsaved changes
                            </Badge>
                        )}
                        <Button onClick={copyToClipboard} variant="outline" size="sm">
                            <Copy className="h-4 w-4 mr-2" />
                            {copied ? "Copied!" : "Copy"}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "preview")}>
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="edit" className="flex items-center">
                            <Code className="h-4 w-4 mr-2" />
                            Edit
                        </TabsTrigger>
                        <TabsTrigger value="preview" className="flex items-center">
                            <Eye className="h-4 w-4 mr-2" />
                            Preview
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="edit" className="space-y-4">
                        <div className="relative">
                            <Textarea
                                value={value}
                                onChange={(e) => onChange(e.target.value)}
                                placeholder={placeholder}
                                className="min-h-64 font-mono text-sm resize-none"
                                style={{ fontFamily: 'Monaco, Consolas, "Liberation Mono", "Courier New", monospace' }}
                            />
                        </div>

                        {/* Editor Toolbar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-gray-50 rounded-md">
                            <div className="flex space-x-4 text-xs text-gray-600">
                                {wordCount && <span>Words: {wordCountValue}</span>}
                                {characterCount && <span>Characters: {characterCountValue.toLocaleString()}</span>}
                                <span>Lines: {lineCountValue}</span>
                            </div>
                            <div className="flex space-x-2">
                                <Button
                                    onClick={() => {
                                        const commonMarkdown = `# Header\n\n**Bold text** and *italic text*\n\n- List item 1\n- List item 2\n\n[Link](https://example.com)\n\n\`\`\`\ncode block\n\`\`\``;
                                        onChange(value + commonMarkdown);
                                    }}
                                    variant="outline"
                                    size="sm"
                                >
                                    Insert Template
                                </Button>
                                <Button onClick={() => onChange("")} variant="outline" size="sm" disabled={!value}>
                                    <RotateCcw className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="preview" className="space-y-4">
                        <Card className="border-2">
                            <CardHeader>
                                <CardTitle className="text-lg">Preview</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="prose prose-sm max-w-none"
                                    dangerouslySetInnerHTML={{
                                        __html: value
                                            ? renderMarkdownPreview(value)
                                            : '<p class="text-gray-500 italic">No content to preview</p>',
                                    }}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-4 border-t">
                    <div className="flex items-center space-x-2">
                        {isDirty && (
                            <div className="flex items-center text-sm text-orange-600">
                                <AlertCircle className="h-4 w-4 mr-1" />
                                You have unsaved changes
                            </div>
                        )}
                    </div>
                    <div className="flex space-x-2">
                        {onCancel && (
                            <Button onClick={onCancel} variant="outline" disabled={isLoading}>
                                Cancel
                            </Button>
                        )}
                        <Button onClick={onSave} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                            {isLoading ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
