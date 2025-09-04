"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Image, Upload, Save, Edit, Trash2, Eye, Plus, Download, Star, Wand2 } from "lucide-react";

interface Screenshot {
    id: string;
    filename: string;
    s3_key: string;
    s3_url: string;
    description?: string;
    annotation?: string;
    sort_order: number;
    is_default: boolean;
    width?: number;
    height?: number;
    created_at: string;
}

export default function ScreenshotsPage() {
    const params = useParams();
    const websiteSlug = params.slug as string;

    const [screenshots, setScreenshots] = useState<Screenshot[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [uploadLoading, setUploadLoading] = useState(false);
    const [annotating, setAnnotating] = useState<Record<string, boolean>>({});
    const [reAnnotateAll, setReAnnotateAll] = useState(false);

    useEffect(() => {
        loadScreenshots();
    }, [websiteSlug]);

    const loadScreenshots = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/screenshots`);

            if (!response.ok) {
                throw new Error("Failed to fetch screenshots");
            }

            const screenshotsData = await response.json();
            setScreenshots(screenshotsData);
        } catch (error) {
            console.error("Error loading screenshots:", error);
            setScreenshots([]);
        } finally {
            setLoading(false);
        }
    };

    const handleAnnotationSave = async (id: string, annotation: string) => {
        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/screenshots/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ annotation }),
            });

            if (!response.ok) {
                throw new Error("Failed to update annotation");
            }

            // Update local state
            setScreenshots((prev) => prev.map((s) => (s.id === id ? { ...s, annotation } : s)));
            setEditingId(null);
        } catch (error) {
            console.error("Error saving annotation:", error);
            // You could add a toast notification here
        }
    };

    const handleSetDefault = async (id: string, isDefault: boolean) => {
        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/screenshots/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ is_default: isDefault }),
            });

            if (!response.ok) {
                throw new Error("Failed to update default screenshot");
            }

            const result = await response.json();

            // Update local state - also need to unset other defaults
            setScreenshots((prev) =>
                prev.map((s) => ({
                    ...s,
                    is_default: s.id === id ? isDefault : false,
                }))
            );
        } catch (error) {
            console.error("Error setting default screenshot:", error);
            // You could add a toast notification here
        }
    };

    const handleDeleteScreenshot = async (id: string, filename: string) => {
        if (!confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`)) {
            return;
        }

        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/screenshots/${id}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Failed to delete screenshot");
            }

            // Update local state to remove the deleted screenshot
            setScreenshots((prev) => prev.filter((s) => s.id !== id));

            // If the deleted screenshot was the default, we might want to set another one as default
            // But for now, just remove it from the list
        } catch (error) {
            console.error("Error deleting screenshot:", error);
            // You could add a toast notification here
        }
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        setUploadLoading(true);
        try {
            const formData = new FormData();
            for (const file of Array.from(files)) {
                formData.append("files", file);
            }

            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/screenshots`, {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Failed to upload screenshots");
            }

            const result = await response.json();
            console.log("Upload successful:", result);

            // Reload screenshots after upload
            await loadScreenshots();
        } catch (error) {
            console.error("Error uploading files:", error);
        } finally {
            setUploadLoading(false);
        }
    };

    const handleExportAll = async () => {
        try {
            // Get all screenshots data
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/screenshots`);
            if (!response.ok) {
                throw new Error("Failed to fetch screenshots for export");
            }

            const screenshots = await response.json();

            // Create a JSON blob with all screenshot data
            const exportData = {
                website: websiteSlug,
                exported_at: new Date().toISOString(),
                screenshots: screenshots.map((s: any) => ({
                    filename: s.filename,
                    description: s.description,
                    annotation: s.annotation,
                    sort_order: s.sort_order,
                    is_default: s.is_default,
                    s3_url: s.s3_url,
                })),
            };

            // Create and download the file
            const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `${websiteSlug}-screenshots-${new Date().toISOString().split("T")[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Error exporting screenshots:", error);
        }
    };

    const handleAutoAnnotate = async (id: string) => {
        const defaultPrompt =
            "These screenshots will be used for demo'ing the hubspot website by a pre-sales agent. Describe the page in a fashion that the agent can understand and use it appropriately. Please stick to 3 lines max.";

        setAnnotating((prev) => ({ ...prev, [id]: true }));
        try {
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/screenshots/${id}/annotate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ prompt: defaultPrompt }),
            });

            if (!response.ok) throw new Error("Failed to annotate screenshot");
            const result = await response.json();
            setScreenshots((prev) => prev.map((s) => (s.id === id ? { ...s, annotation: result.annotation } : s)));
        } catch (error) {
            console.error("Error auto-annotating screenshot:", error);
        } finally {
            setAnnotating((prev) => ({ ...prev, [id]: false }));
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading media...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Media</h1>
                        <p className="mt-2 text-gray-600">Manage images and GIFs with annotations for {websiteSlug}</p>
                    </div>
                    <div className="flex space-x-3 items-center">
                        <Button variant="outline" onClick={handleExportAll}>
                            <Download className="h-4 w-4 mr-2" />
                            Export All
                        </Button>
                        {/* Bulk annotate only missing annotations */}
                        <Button
                            onClick={async () => {
                                const toAnnotate = reAnnotateAll ? screenshots : screenshots.filter((s) => !s.annotation);
                                for (const s of toAnnotate) {
                                    await handleAutoAnnotate(s.id);
                                }
                            }}
                            disabled={(reAnnotateAll ? screenshots.length : screenshots.filter((s) => !s.annotation).length) === 0}
                        >
                            <Wand2 className="h-4 w-4 mr-2" />
                            {reAnnotateAll
                                ? `Annotate All (${screenshots.length})`
                                : `Annotate Missing (${screenshots.filter((s) => !s.annotation).length})`}
                        </Button>
                        <label className="flex items-center space-x-2 text-sm text-gray-700">
                            <input
                                type="checkbox"
                                className="h-4 w-4"
                                checked={reAnnotateAll}
                                onChange={(e) => setReAnnotateAll(e.target.checked)}
                            />
                            <span>Re-annotate existing</span>
                        </label>
                        <div className="relative">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={uploadLoading}
                            />
                            <Button variant="outline" disabled={uploadLoading}>
                                <Plus className="h-4 w-4 mr-2" />
                                {uploadLoading ? "Uploading..." : "Add Media"}
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Media</CardTitle>
                        <Image className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{screenshots.length}</div>
                        <p className="text-xs text-muted-foreground">Items in collection</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">With Annotations</CardTitle>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{screenshots.filter((s) => s.annotation).length}</div>
                        <p className="text-xs text-muted-foreground">Annotated screenshots</p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Storage Used</CardTitle>
                        <Upload className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">~2.5MB</div>
                        <p className="text-xs text-muted-foreground">S3 storage usage</p>
                    </CardContent>
                </Card>
            </div>

            {/* Screenshots Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {screenshots.map((screenshot, index) => (
                    <Card key={screenshot.id} className="overflow-hidden">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg flex items-center">
                                    <Image className="h-5 w-5 mr-2" />
                                    Media {index + 1}
                                    {screenshot.is_default && <Star className="h-4 w-4 ml-2 text-yellow-500 fill-current" />}
                                </CardTitle>
                                <div className="flex items-center space-x-2">
                                    {screenshot.is_default && (
                                        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                                            Default
                                        </Badge>
                                    )}
                                    {screenshot.filename && screenshot.filename.toLowerCase().endsWith(".gif") && (
                                        <Badge variant="secondary" className="bg-purple-100 text-purple-800">
                                            GIF
                                        </Badge>
                                    )}
                                    <Badge variant="outline">{screenshot.sort_order}</Badge>
                                    <Button variant="ghost" size="sm">
                                        <Eye className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                            <p className="text-sm text-gray-600 font-mono">{screenshot.filename}</p>
                        </CardHeader>

                        <CardContent className="space-y-4">
                            {/* Image Preview */}
                            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                <img
                                    src={screenshot.s3_url}
                                    alt={screenshot.filename}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                                {annotating[screenshot.id] && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-white/60 dark:bg-black/40">
                                        <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                                    </div>
                                )}
                            </div>

                            {/* Description */}
                            {screenshot.description && (
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-gray-700">Description</label>
                                    <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">{screenshot.description}</p>
                                </div>
                            )}

                            {/* Annotation */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <label className="text-sm font-medium text-gray-700">Annotation</label>
                                    <div className="flex items-center space-x-2">
                                        <span className="text-xs text-gray-500">
                                            {editingId === screenshot.id
                                                ? "Double-click outside or Shift+Enter to save"
                                                : "Double-click to edit"}
                                        </span>
                                        <div className="flex items-center space-x-1">
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleAutoAnnotate(screenshot.id)}
                                                disabled={!!annotating[screenshot.id]}
                                                title="Auto-annotate with AI"
                                            >
                                                {annotating[screenshot.id] ? (
                                                    <div className="w-3.5 h-3.5 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
                                                ) : (
                                                    <Wand2 className="h-4 w-4" />
                                                )}
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant={screenshot.is_default ? "default" : "outline"}
                                                onClick={() => handleSetDefault(screenshot.id, !screenshot.is_default)}
                                                className={screenshot.is_default ? "bg-yellow-500 hover:bg-yellow-600" : ""}
                                            >
                                                <Star className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleDeleteScreenshot(screenshot.id, screenshot.filename)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {editingId === screenshot.id ? (
                                    <Textarea
                                        value={screenshot.annotation || ""}
                                        onChange={(e) => {
                                            setScreenshots((prev) =>
                                                prev.map((s) => (s.id === screenshot.id ? { ...s, annotation: e.target.value } : s))
                                            );
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.shiftKey && e.key === "Enter") {
                                                e.preventDefault();
                                                handleAnnotationSave(screenshot.id, screenshot.annotation || "");
                                            }
                                        }}
                                        onBlur={() => {
                                            // Auto-save when clicking outside
                                            handleAnnotationSave(screenshot.id, screenshot.annotation || "");
                                        }}
                                        placeholder="Add detailed annotation for this screenshot..."
                                        className="min-h-24"
                                        autoFocus
                                    />
                                ) : (
                                    <div
                                        className="bg-gray-50 p-3 rounded-md min-h-24 cursor-pointer hover:bg-gray-100 transition-colors"
                                        onDoubleClick={() => setEditingId(screenshot.id)}
                                        title="Double-click to edit annotation"
                                    >
                                        {screenshot.annotation ? (
                                            <p className="text-sm text-gray-900 whitespace-pre-wrap">{screenshot.annotation}</p>
                                        ) : (
                                            <p className="text-sm text-gray-500 italic">No annotation yet. Double-click to add one.</p>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Metadata */}
                            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t">
                                <span>Created {new Date(screenshot.created_at).toLocaleDateString()}</span>
                                {screenshot.width && screenshot.height && (
                                    <span>
                                        {screenshot.width} × {screenshot.height}
                                    </span>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {screenshots.length === 0 && (
                <Card>
                    <CardContent className="p-12 text-center">
                        <Image className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">No media yet</h3>
                        <p className="text-gray-600 mb-6">Upload images or GIFs to help your AI agent understand this website.</p>

                        {/* Drag and Drop Area */}
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-4 hover:border-blue-400 transition-colors">
                            <div className="text-center">
                                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 mb-2">Drag and drop images or GIFs here, or click to browse</p>
                                <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                            </div>
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={uploadLoading}
                            />
                        </div>

                        <div className="relative inline-block">
                            <input
                                type="file"
                                multiple
                                accept="image/*"
                                onChange={handleFileUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={uploadLoading}
                            />
                            <Button disabled={uploadLoading}>
                                <Plus className="h-4 w-4 mr-2" />
                                {uploadLoading ? "Uploading..." : "Browse Files"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
