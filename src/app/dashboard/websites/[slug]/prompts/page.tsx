"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { MarkdownEditor } from "@/components/ui/markdown-editor";
import { FileUpload } from "@/components/ui/file-upload";
import { StatsCard } from "@/components/ui/stats-card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Edit, Save, Eye, Plus, Upload, History, Trash2 } from "lucide-react";

interface SystemPrompt {
    id: string;
    name: string;
    description?: string;
    content: string;
    s3_key: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export default function PromptsPage() {
    const params = useParams();
    const websiteSlug = params.slug as string;

    const [prompts, setPrompts] = useState<SystemPrompt[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showUploadDialog, setShowUploadDialog] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<File | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [savingId, setSavingId] = useState<string | null>(null);

    useEffect(() => {
        loadPrompts();
    }, [websiteSlug]);

    const loadPrompts = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/prompts`);

            if (!response.ok) {
                throw new Error("Failed to fetch prompts");
            }

            const data = await response.json();
            setPrompts(data || []);

            // If no prompts exist, create a default one
            if (!data || data.length === 0) {
                await createDefaultPrompt();
            }
        } catch (error) {
            console.error("Error loading prompts:", error);
            // Fallback to empty array if API fails
            setPrompts([]);
        } finally {
            setLoading(false);
        }
    };

    const createDefaultPrompt = async () => {
        try {
            const defaultPrompt = {
                website_slug: websiteSlug,
                name: "Default Agent Prompt",
                description: `Default system prompt for ${websiteSlug} AI agent`,
                content: `# ${websiteSlug} Agent Instructions

You are an AI assistant specialized in ${websiteSlug}. You help users navigate and understand the platform's features and capabilities.

## Your Role
- Guide users through the interface and features
- Explain how to perform common tasks
- Provide best practices for using ${websiteSlug} effectively
- Help users understand terminology and concepts

## Available Screenshots
You have access to various screenshots of the ${websiteSlug} interface that will be provided to you. Use these screenshots to guide users to specific features and show them what to look for.

## Interaction Style
- Be helpful and patient
- Explain things clearly and step by step
- Use the screenshots to provide visual guidance
- Ask clarifying questions when needed
- Provide multiple solutions when appropriate

Remember to reference the screenshots provided to help users visually navigate the ${websiteSlug} interface.`,
            };

            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/prompts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: defaultPrompt.name,
                    description: defaultPrompt.description,
                    content: defaultPrompt.content,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setPrompts([data]);
                // Reload prompts to get the full data
                await loadPrompts();
            }
        } catch (error) {
            console.error("Error creating default prompt:", error);
        }
    };

    const createMockPrompt = async () => {
        // Fallback mock data
        const mockPrompt: SystemPrompt = {
            id: "1",
            name: "HubSpot Agent Prompt",
            description: "Default system prompt for HubSpot AI agent",
            content: `# HubSpot Agent Instructions

You are an AI assistant specialized in HubSpot CRM. You help users navigate and understand HubSpot's features and capabilities.

## Your Role
- Guide users through HubSpot's interface and features
- Explain how to perform common tasks in HubSpot
- Provide best practices for using HubSpot effectively
- Help users understand HubSpot's terminology and concepts

## Available Screenshots
You have access to various screenshots of the HubSpot interface that will be provided to you. Use these screenshots to guide users to specific features and show them what to look for.

## Interaction Style
- Be helpful and patient
- Explain things clearly and step by step
- Use the screenshots to provide visual guidance
- Ask clarifying questions when needed
- Provide multiple solutions when appropriate

Remember to reference the screenshots provided to help users visually navigate HubSpot's interface.`,
            s3_key: "agent-configs/hubspot/prompts/default.md",
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        };
        setPrompts([mockPrompt]);
    };

    const handlePromptSave = async (id: string, content: string) => {
        setSavingId(id);
        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/prompts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    content,
                    name: prompts.find((p) => p && p.id === id)?.name,
                    description: prompts.find((p) => p && p.id === id)?.description,
                }),
            });

            if (response.ok) {
                // Try to get the updated prompt data
                let updatedPrompt = null;
                try {
                    const data = await response.json();
                    updatedPrompt = data.prompt;
                } catch (parseError) {
                    console.warn("Failed to parse save response, refetching prompt data");
                }

                // If we couldn't get the updated data from the response, refetch from API
                if (!updatedPrompt) {
                    try {
                        const fetchResponse = await fetch(`/api/dashboard/websites/${websiteSlug}/prompts/${id}`);
                        if (fetchResponse.ok) {
                            const fetchData = await fetchResponse.json();
                            updatedPrompt = fetchData;
                        }
                    } catch (fetchError) {
                        console.warn("Failed to refetch prompt data");
                    }
                }

                // Update the local state if we have the updated data
                if (updatedPrompt) {
                    setPrompts((prev) => prev.map((p) => (p && p.id === id ? updatedPrompt : p)));
                }

                // Show success message
                alert("✅ Prompt saved successfully!");
            } else {
                const errorText = await response.text();
                throw new Error(`Save failed: ${errorText}`);
            }

            setEditingId(null);
        } catch (error) {
            console.error("Error saving prompt:", error);
            alert(`❌ Failed to save prompt: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setSavingId(null);
        }
    };

    const handleFileUpload = (file: File) => {
        setUploadedFile(file);
    };

    const handleCreatePrompt = async () => {
        if (!uploadedFile) return;

        setIsCreating(true);
        try {
            // Read file content
            const content = await uploadedFile.text();
            const promptName = uploadedFile.name.replace(/\.[^/.]+$/, "");

            // Create prompt via API
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/prompts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: promptName,
                    description: `Uploaded from ${uploadedFile.name}`,
                    content: content,
                }),
            });

            if (response.ok) {
                const createdPrompt = await response.json();

                // Add the created prompt to the local state and refresh to load content
                setPrompts((prev) => [createdPrompt, ...prev]);
                await loadPrompts();
                setShowUploadDialog(false);
                setUploadedFile(null);
                alert("✅ Prompt created from file");
            } else {
                throw new Error("Failed to create prompt");
            }
        } catch (error) {
            console.error("Error creating prompt:", error);
            alert(`❌ Failed to create prompt: ${error instanceof Error ? error.message : "Unknown error"}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateEmptyPrompt = async () => {
        try {
            setIsCreating(true);
            const defaultName = `New Prompt ${new Date().toLocaleString()}`;
            const defaultContent = `# ${websiteSlug} Agent Instructions\n\nDescribe behavior here...`;

            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/prompts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: defaultName,
                    description: "Created from UI",
                    content: defaultContent,
                }),
            });

            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || "Failed to create prompt");
            }

            const created = await response.json();
            // Prepend and enter edit mode for the new prompt
            setPrompts((prev) => [created, ...prev]);
            await loadPrompts();
            if (created?.id) setEditingId(created.id);
            alert("✅ New prompt created");
        } catch (err) {
            console.error("Error creating empty prompt:", err);
            alert(`❌ Failed to create prompt: ${err instanceof Error ? err.message : "Unknown error"}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleDeletePrompt = async (id: string) => {
        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/prompts/${id}`, {
                method: "DELETE",
            });

            if (response.ok) {
                setPrompts((prev) => prev.filter((p) => p && p.id !== id));
            } else {
                throw new Error("Failed to delete prompt");
            }
        } catch (error) {
            console.error("Error deleting prompt:", error);
        }
    };

    const handleToggleActive = async (id: string) => {
        try {
            const prompt = prompts.find((p) => p && p.id === id);
            if (!prompt) return;

            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/prompts/${id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    is_active: !prompt.is_active,
                    name: prompt.name || "Untitled Prompt",
                    description: prompt.description || "",
                    content: prompt.content || "",
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setPrompts((prev) => prev.map((p) => (p && p.id === id ? data.prompt : p)));
            } else {
                throw new Error("Failed to update prompt status");
            }
        } catch (error) {
            console.error("Error updating prompt status:", error);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
                    <p className="text-gray-700">Loading system prompts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-950">System Prompts</h1>
                        <p className="mt-2 text-gray-700">Manage system prompts and instructions for {websiteSlug}</p>
                    </div>
                    <div className="flex space-x-3">
                        <Button variant="outline" onClick={loadPrompts} disabled={loading}>
                            <History className="mr-2 w-4 h-4" />
                            Refresh
                        </Button>
                        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                            <DialogTrigger asChild>
                                <Button variant="outline">
                                    <Upload className="mr-2 w-4 h-4" />
                                    Upload File
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                                <DialogHeader>
                                    <DialogTitle>Upload System Prompt</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                    <FileUpload
                                        onFileSelect={handleFileUpload}
                                        onFileRemove={() => setUploadedFile(null)}
                                        accept=".md,.markdown,.txt"
                                        placeholder="Choose a markdown file"
                                        description="Upload markdown files containing system prompts"
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <Button
                                            variant="outline"
                                            onClick={() => {
                                                setShowUploadDialog(false);
                                                setUploadedFile(null);
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                        <Button onClick={handleCreatePrompt} disabled={!uploadedFile || isCreating}>
                                            {isCreating ? "Creating..." : "Create Prompt"}
                                        </Button>
                                    </div>
                                </div>
                            </DialogContent>
                        </Dialog>
                        <Button onClick={handleCreateEmptyPrompt} disabled={isCreating}>
                            <Plus className="mr-2 w-4 h-4" />
                            New Prompt
                        </Button>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-3">
                <StatsCard title="Total Prompts" value={prompts.length} description="System prompt files" icon={FileText} />
                <StatsCard
                    title="Active Prompt"
                    value={prompts.filter((p) => p && p.is_active).length}
                    description="Currently in use"
                    icon={Eye}
                />
                <StatsCard title="Storage" value="~15KB" description="S3 storage usage" icon={FileText} />
            </div>

            {/* Prompts List */}
            <div className="space-y-6">
                {prompts
                    .filter((prompt) => prompt && prompt.id)
                    .map((prompt) => (
                        <Card key={prompt.id} className="overflow-hidden">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <div>
                                        <CardTitle className="flex items-center">
                                            <FileText className="mr-2 w-5 h-5" />
                                            {prompt.name || "Untitled Prompt"}
                                        </CardTitle>
                                        {prompt.description && <p className="mt-1 text-sm text-gray-600">{prompt.description}</p>}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Badge variant={prompt?.is_active ? "default" : "secondary"}>
                                            {prompt?.is_active ? "Active" : "Inactive"}
                                        </Badge>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    {editingId === prompt.id ? (
                                        <MarkdownEditor
                                            value={prompt.content || ""}
                                            onChange={(content) => {
                                                setPrompts((prev) => prev.map((p) => (p && p.id === prompt.id ? { ...p, content } : p)));
                                            }}
                                            onSave={() => handlePromptSave(prompt.id, prompt.content || "")}
                                            onCancel={() => setEditingId(null)}
                                            title="Edit System Prompt"
                                            description={`Editing: ${prompt.name}`}
                                            isDirty={
                                                (prompt.content || "") !== (prompts.find((p) => p && p.id === prompt.id)?.content || "")
                                            }
                                            isLoading={savingId === prompt.id}
                                        />
                                    ) : (
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="text-sm font-medium text-gray-900">Prompt Content</label>
                                                <div className="flex items-center space-x-2">
                                                    <Button variant="outline" size="sm" onClick={() => handleToggleActive(prompt.id)}>
                                                        {prompt?.is_active ? "Deactivate" : "Activate"}
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => setEditingId(prompt.id)}>
                                                        <Edit className="mr-2 w-4 h-4" />
                                                        Edit
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={() => handleDeletePrompt(prompt.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                            <div className="p-4 bg-gray-50 rounded-lg">
                                                <pre className="overflow-y-auto max-h-64 font-mono text-sm text-gray-900 whitespace-pre-wrap">
                                                    {prompt.content}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Metadata */}
                                <div className="flex justify-between items-center pt-2 text-xs text-gray-500 border-t">
                                    <div>
                                        <span>Created: {new Date(prompt.created_at).toLocaleDateString()}</span>
                                        <span className="mx-2">•</span>
                                        <span>Updated: {new Date(prompt.updated_at).toLocaleDateString()}</span>
                                    </div>
                                    <div>
                                        <span>Length: {prompt.content ? prompt.content.length.toLocaleString() : 0} characters</span>
                                        <span className="mx-2">•</span>
                                        <span>Lines: {prompt.content ? prompt.content.split("\n").length : 0}</span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
            </div>

            {/* Empty State */}
            {prompts.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <FileText className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                        <h3 className="mb-2 text-lg font-medium text-gray-900">No system prompts yet</h3>
                        <p className="mb-4 text-gray-600">Create a system prompt to define how your AI agent should behave.</p>
                        <Button>
                            <Plus className="mr-2 w-4 h-4" />
                            Create First Prompt
                        </Button>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
