"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatsCard } from "@/components/ui/stats-card";
import { QuickActionButton } from "@/components/ui/quick-action-button";
import { SectionCard } from "@/components/ui/section-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Globe, Eye, Settings, Image, FileText, Copy, ExternalLink, Calendar, CheckCircle, Mic } from "lucide-react";

interface Website {
    id: string;
    name: string;
    slug: string;
    description?: string;
    screenshotCount: number;
    promptCount: number;
    lastUpdated: string;
    status: "active" | "inactive";
    created_at: string;
}

export default function WebsiteDetailPage() {
    const params = useParams();
    const websiteSlug = params.slug as string;

    const [website, setWebsite] = useState<Website | null>(null);
    const [loading, setLoading] = useState(true);
    const [agentUrl, setAgentUrl] = useState("");

    useEffect(() => {
        loadWebsite();
        setAgentUrl(`${window.location.origin}/agent-demo?website=${websiteSlug}`);
    }, [websiteSlug]);

    const loadWebsite = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/api/dashboard/websites/${websiteSlug}`);

            if (!response.ok) {
                if (response.status === 404) {
                    setWebsite(null);
                } else {
                    throw new Error("Failed to fetch website");
                }
                return;
            }

            const websiteData = await response.json();
            setWebsite(websiteData);
        } catch (error) {
            console.error("Error loading website:", error);
            setWebsite(null);
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            // You could add a toast notification here
        } catch (err) {
            console.error("Failed to copy:", err);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center">
                    <div className="mx-auto mb-4 w-12 h-12 rounded-full border-b-2 border-blue-600 animate-spin"></div>
                    <p className="text-gray-700">Loading website details...</p>
                </div>
            </div>
        );
    }

    if (!website) {
        return (
            <div className="p-8">
                <div className="text-center">
                    <Globe className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                    <h2 className="mb-2 text-xl font-semibold text-gray-900">Website Not Found</h2>
                    <p className="text-gray-700">The website "{websiteSlug}" could not be found.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-8">
            {/* Header */}
            <div className="mb-8">
                <div className="flex justify-between items-center">
                    <div className="flex items-center">
                        <div className="flex justify-center items-center mr-4 w-16 h-16 bg-blue-100 rounded-lg">
                            <Globe className="w-8 h-8 text-blue-600" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-950">{website.name}</h1>
                            <p className="text-gray-700">{website.description}</p>
                            <div className="flex items-center mt-2">
                                <Badge variant={website.status === "active" ? "default" : "secondary"} className="mr-2">
                                    {website.status}
                                </Badge>
                                <span className="text-sm text-gray-600">/{website.slug}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex space-x-3">
                        <Link href={`/agent-demo?website=${website.slug}`}>
                            <Button className="bg-green-600 hover:bg-green-700">
                                <Eye className="mr-2 w-4 h-4" />
                                Test Agent
                            </Button>
                        </Link>
                        <Button variant="outline">
                            <Settings className="mr-2 w-4 h-4" />
                            Settings
                        </Button>
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 gap-6 mb-8 md:grid-cols-4">
                <StatsCard title="Status" value="Active" description="Agent is ready" icon={CheckCircle} />
                <StatsCard title="Screenshots" value={website.screenshotCount} description="Uploaded to S3" icon={Image} />
                <StatsCard title="System Prompts" value={website.promptCount} description="Active configurations" icon={FileText} />
                <StatsCard
                    title="Last Updated"
                    value={new Date(website.lastUpdated).toLocaleDateString()}
                    description={new Date(website.lastUpdated).toLocaleTimeString()}
                    icon={Calendar}
                />
            </div>

            {/* Content Tabs */}
            <Tabs defaultValue="overview" className="space-y-6">
                <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
                    <TabsTrigger value="prompts">Prompts</TabsTrigger>
                    <TabsTrigger value="settings">Settings</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                        {/* Agent URL */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center text-gray-950">
                                    <ExternalLink className="mr-2 w-5 h-5" />
                                    Agent Demo URL
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="p-3 bg-gray-50 rounded-lg">
                                    <p className="font-mono text-sm break-all text-gray-950">{agentUrl}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <Button onClick={() => copyToClipboard(agentUrl)} variant="outline" size="sm">
                                        <Copy className="mr-2 w-4 h-4" />
                                        Copy URL
                                    </Button>
                                    <Link href={`/agent-demo?website=${website.slug}`}>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                            <Eye className="mr-2 w-4 h-4" />
                                            Open Demo
                                        </Button>
                                    </Link>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Quick Actions */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Quick Actions</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <QuickActionButton href={`/dashboard/websites/${website.slug}/verify`} icon={Eye}>
                                    Verify Final Prompt
                                </QuickActionButton>
                                <QuickActionButton href={`/dashboard/websites/${website.slug}/screenshots`} icon={Image}>
                                    Manage Screenshots
                                </QuickActionButton>
                                <QuickActionButton href={`/dashboard/websites/${website.slug}/prompts`} icon={FileText}>
                                    Edit System Prompts
                                </QuickActionButton>
                                <QuickActionButton href={`/agent-demo?website=${website.slug}`} icon={Mic}>
                                    Test Agent Demo
                                </QuickActionButton>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recent Activity */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Agent tested successfully</p>
                                        <p className="text-xs text-gray-500">2 hours ago</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">Screenshots uploaded to S3</p>
                                        <p className="text-xs text-gray-500">1 day ago</p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <div className="flex-1">
                                        <p className="text-sm font-medium">System prompt updated</p>
                                        <p className="text-xs text-gray-500">3 days ago</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Screenshots Tab */}
                <TabsContent value="screenshots" className="space-y-4">
                    <SectionCard
                        title="Manage Screenshots"
                        description="Upload, annotate, and organize screenshots for this website."
                        icon={Image}
                        buttonText="Go to Screenshots"
                        href={`/dashboard/websites/${website.slug}/screenshots`}
                    />
                </TabsContent>

                {/* Prompts Tab */}
                <TabsContent value="prompts" className="space-y-4">
                    <SectionCard
                        title="Manage System Prompts"
                        description="Create and edit system prompts for the AI agent."
                        icon={FileText}
                        buttonText="Go to Prompts"
                        href={`/dashboard/websites/${website.slug}/prompts`}
                    />
                </TabsContent>

                {/* Settings Tab */}
                <TabsContent value="settings" className="space-y-4">
                    <SectionCard
                        title="Website Configuration"
                        description="Configure website settings and preferences."
                        icon={Settings}
                        buttonText="Open Settings"
                        variant="outline"
                        onClick={() => {}}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
