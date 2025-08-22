"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Copy, CheckCircle, AlertCircle, FileText, Image as ImageIcon, Globe } from "lucide-react";

interface Website {
    id: string;
    name: string;
    slug: string;
    description?: string;
}

interface Screenshot {
    id: string;
    filename: string;
    s3_key: string;
    s3_url: string;
    description?: string;
    annotation?: string;
    sort_order: number;
}

interface SystemPrompt {
    id: string;
    name: string;
    description?: string;
    s3_key: string;
}

interface VerificationData {
    website: Website;
    screenshots: Screenshot[];
    system_prompt?: SystemPrompt;
    final_prompt: string;
}

export default function VerifyPage() {
    const params = useParams();
    const websiteSlug = params.slug as string;

    const [data, setData] = useState<VerificationData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        loadVerificationData();
    }, [websiteSlug]);

    const loadVerificationData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Get all verification data from the API endpoint
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}/verify`);
            if (!response.ok) {
                throw new Error("Failed to fetch verification data");
            }
            const verificationData = await response.json();

            setData({
                website: {
                    ...verificationData.website,
                    description: verificationData.website.description || undefined,
                },
                screenshots: verificationData.screenshots.map((screenshot: any) => ({
                    ...screenshot,
                    description: screenshot.description || undefined,
                    annotation: screenshot.annotation || undefined,
                })),
                system_prompt: verificationData.system_prompt
                    ? {
                          ...verificationData.system_prompt,
                          description: verificationData.system_prompt.description || undefined,
                      }
                    : undefined,
                final_prompt: verificationData.final_prompt || "No prompt available",
            });
        } catch (err) {
            console.error("Error loading verification data:", err);
            setError(err instanceof Error ? err.message : "Failed to load verification data");
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading verification data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <Card className="w-full max-w-2xl">
                    <CardContent className="p-6">
                        <div className="text-center">
                            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                            <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
                            <p className="text-gray-600 mb-4">{error}</p>
                            <Button onClick={loadVerificationData} variant="outline">
                                Try Again
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-600">No data available</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Verify Configuration</h1>
                            <p className="mt-2 text-gray-600">
                                Review the final prompt and screenshots for{" "}
                                <Badge variant="secondary" className="ml-1">
                                    {data.website.name}
                                </Badge>
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <Button
                                onClick={() => window.open(`/agent-demo?website=${websiteSlug}`, "_blank")}
                                className="bg-green-600 hover:bg-green-700"
                            >
                                <Eye className="h-4 w-4 mr-2" />
                                Test Agent
                            </Button>
                            <Button onClick={loadVerificationData} variant="outline">
                                Refresh
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <Tabs defaultValue="prompt" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="prompt">
                            <FileText className="h-4 w-4 mr-2" />
                            Final Prompt
                        </TabsTrigger>
                        <TabsTrigger value="components">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Prompt Components
                        </TabsTrigger>
                        <TabsTrigger value="screenshots">
                            <ImageIcon className="h-4 w-4 mr-2" />
                            Screenshots ({data.screenshots.length})
                        </TabsTrigger>
                        <TabsTrigger value="config">
                            <Globe className="h-4 w-4 mr-2" />
                            Configuration
                        </TabsTrigger>
                    </TabsList>

                    {/* Final Prompt Tab */}
                    <TabsContent value="prompt" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center">
                                        <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                        Combined System Prompt
                                    </CardTitle>
                                    <Button onClick={() => copyToClipboard(data.final_prompt)} variant="outline" size="sm">
                                        <Copy className="h-4 w-4 mr-2" />
                                        {copied ? "Copied!" : "Copy"}
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <ScrollArea className="h-96 w-full rounded-md border p-4">
                                    <pre className="whitespace-pre-wrap text-sm font-mono text-gray-900">{data.final_prompt}</pre>
                                </ScrollArea>
                                <div className="mt-4 flex items-center justify-between text-sm text-gray-500">
                                    <span>Length: {data.final_prompt.length.toLocaleString()} characters</span>
                                    <span>Lines: {data.final_prompt.split("\n").length}</span>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Prompt Components Tab */}
                    <TabsContent value="components" className="space-y-6">
                        <div className="grid gap-6">
                            {/* Website Description */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Globe className="h-5 w-5 mr-2" />
                                        Website Description
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {data.website.description ? (
                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <p className="text-sm text-gray-900">{data.website.description}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No website description provided</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* System Prompt Base */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <FileText className="h-5 w-5 mr-2" />
                                        Base System Prompt
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {data.system_prompt ? (
                                        <div className="space-y-4">
                                            <div className="grid grid-cols-2 gap-4 text-sm">
                                                <div>
                                                    <label className="font-medium text-gray-700">Name:</label>
                                                    <p className="text-gray-900">{data.system_prompt.name}</p>
                                                </div>
                                                <div>
                                                    <label className="font-medium text-gray-700">S3 Key:</label>
                                                    <p className="text-gray-900 font-mono text-xs break-all">{data.system_prompt.s3_key}</p>
                                                </div>
                                            </div>
                                            {data.system_prompt.description && (
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Description:</label>
                                                    <p className="text-sm text-gray-900 bg-gray-50 p-3 rounded-md">
                                                        {data.system_prompt.description}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No system prompt configured</p>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Screenshots with Keys and Annotations */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <ImageIcon className="h-5 w-5 mr-2" />
                                        Screenshot Components ({data.screenshots.length})
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        {data.screenshots.map((screenshot, index) => (
                                            <div key={screenshot.id} className="border border-gray-200 rounded-lg p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <h4 className="font-medium text-gray-900">
                                                        Screenshot {index + 1}: {screenshot.filename}
                                                    </h4>
                                                    <Badge variant="outline">Order: {screenshot.sort_order}</Badge>
                                                </div>

                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {/* S3 Key */}
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700">S3 Storage Key:</label>
                                                        <div className="bg-gray-100 p-3 rounded-md mt-1 border-l-4 border-blue-500">
                                                            <p className="text-xs font-mono text-gray-900 break-all">{screenshot.s3_key}</p>
                                                            <p className="text-xs text-gray-600 mt-1">
                                                                This is the key used to store and retrieve the screenshot from S3
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {/* Signed URL */}
                                                    <div>
                                                        <label className="text-sm font-medium text-gray-700">Signed Access URL:</label>
                                                        <div className="bg-green-50 p-3 rounded-md mt-1 border-l-4 border-green-500">
                                                            <p className="text-xs font-mono text-green-800 break-all">
                                                                {screenshot.s3_url}
                                                            </p>
                                                            <p className="text-xs text-green-700 mt-1">
                                                                Temporary signed URL (expires in 1 hour) - used by AI agent to access
                                                                screenshot
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Description */}
                                                {screenshot.description && (
                                                    <div className="mt-3">
                                                        <label className="text-sm font-medium text-gray-700">Description:</label>
                                                        <div className="bg-blue-50 p-3 rounded-md mt-1">
                                                            <p className="text-sm text-blue-900">{screenshot.description}</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Annotation */}
                                                {screenshot.annotation && (
                                                    <div className="mt-3">
                                                        <label className="text-sm font-medium text-gray-700">Annotation:</label>
                                                        <div className="bg-yellow-50 p-3 rounded-md mt-1">
                                                            <p className="text-sm text-yellow-900 whitespace-pre-wrap">
                                                                {screenshot.annotation}
                                                            </p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            {/* How Components are Combined */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        How Components are Combined
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-4">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <h4 className="font-medium text-gray-900 mb-2">Combination Process:</h4>
                                            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-700">
                                                <li>Start with base system prompt content</li>
                                                <li>Add website description if available</li>
                                                <li>Include screenshot details (S3 keys, descriptions, annotations)</li>
                                                <li>Combine all components into final prompt structure</li>
                                                <li>Generate signed URLs for secure S3 access</li>
                                            </ol>
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-lg">
                                            <h4 className="font-medium text-blue-900 mb-2">Key Information:</h4>
                                            <ul className="list-disc list-inside space-y-1 text-sm text-blue-800">
                                                <li>Each screenshot has a unique S3 key for secure access</li>
                                                <li>Signed URLs expire after 1 hour for security</li>
                                                <li>Annotations and descriptions provide context to the AI</li>
                                                <li>Screenshots are ordered by sort_order in the final prompt</li>
                                            </ul>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Screenshots Tab */}
                    <TabsContent value="screenshots" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {data.screenshots.map((screenshot, index) => (
                                <Card key={screenshot.id} className="overflow-hidden">
                                    <CardHeader className="pb-3">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm font-medium">Screenshot {index + 1}</CardTitle>
                                            <Badge variant="outline">{screenshot.sort_order}</Badge>
                                        </div>
                                        <p className="text-xs text-gray-600">{screenshot.filename}</p>
                                    </CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="aspect-video bg-gray-100 rounded-md overflow-hidden">
                                            <img
                                                src={screenshot.s3_url}
                                                alt={screenshot.filename}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        </div>
                                        {screenshot.annotation && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-gray-900">Annotation:</h4>
                                                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md">{screenshot.annotation}</p>
                                            </div>
                                        )}
                                        {screenshot.description && (
                                            <div className="space-y-2">
                                                <h4 className="text-sm font-medium text-gray-900">Description:</h4>
                                                <p className="text-sm text-gray-600 bg-blue-50 p-3 rounded-md">{screenshot.description}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </TabsContent>

                    {/* Configuration Tab */}
                    <TabsContent value="config" className="space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Website Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <Globe className="h-5 w-5 mr-2" />
                                        Website Information
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Name</label>
                                        <p className="text-sm text-gray-900">{data.website.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700">Slug</label>
                                        <p className="text-sm text-gray-900 font-mono">{data.website.slug}</p>
                                    </div>
                                    {data.website.description && (
                                        <div>
                                            <label className="text-sm font-medium text-gray-700">Description</label>
                                            <p className="text-sm text-gray-900">{data.website.description}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* System Prompt Info */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center">
                                        <FileText className="h-5 w-5 mr-2" />
                                        System Prompt
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    {data.system_prompt ? (
                                        <>
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">Name</label>
                                                <p className="text-sm text-gray-900">{data.system_prompt.name}</p>
                                            </div>
                                            {data.system_prompt.description && (
                                                <div>
                                                    <label className="text-sm font-medium text-gray-700">Description</label>
                                                    <p className="text-sm text-gray-900">{data.system_prompt.description}</p>
                                                </div>
                                            )}
                                            <div>
                                                <label className="text-sm font-medium text-gray-700">S3 Key</label>
                                                <p className="text-sm text-gray-900 font-mono break-all">{data.system_prompt.s3_key}</p>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-sm text-gray-500">No system prompt configured</p>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
