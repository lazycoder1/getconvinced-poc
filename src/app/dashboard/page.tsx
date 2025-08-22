"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatsCard } from "@/components/ui/stats-card";
import { QuickActionCard } from "@/components/ui/quick-action-card";
import { WebsiteCard } from "@/components/ui/website-card";
import { Globe, Image, FileText, Eye, Plus, Settings, Mic } from "lucide-react";

interface WebsiteStats {
    id: string;
    name: string;
    slug: string;
    description?: string;
    screenshotCount: number;
    promptCount: number;
    lastUpdated: string;
    status: "active" | "inactive";
}

export default function DashboardPage() {
    const [stats, setStats] = useState<WebsiteStats[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardStats();
    }, []);

    const loadDashboardStats = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/dashboard/websites");

            if (!response.ok) {
                throw new Error("Failed to fetch websites");
            }

            const websites = await response.json();
            setStats(websites);
        } catch (error) {
            console.error("Error loading dashboard stats:", error);
            // Fallback to empty array if API fails
            setStats([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading dashboard...</p>
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
                        <h1 className="text-3xl font-bold text-gray-950">Dashboard</h1>
                        <p className="mt-2 text-gray-700">Manage your AI agents and website configurations</p>
                    </div>
                    <div className="flex space-x-3">
                        <Button variant="outline">
                            <Plus className="h-4 w-4 mr-2" />
                            Add Website
                        </Button>
                        {stats.length > 0 && (
                            <Link href={`/agent-demo?website=${stats[0].slug}`}>
                                <Button className="bg-green-600 hover:bg-green-700">
                                    <Eye className="h-4 w-4 mr-2" />
                                    Test Agent
                                </Button>
                            </Link>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <StatsCard title="Total Websites" value={stats.length} description="Active AI agents" icon={Globe} />
                <StatsCard
                    title="Total Screenshots"
                    value={stats.reduce((sum, site) => sum + site.screenshotCount, 0)}
                    description="Images in S3 storage"
                    icon={Image}
                />
                <StatsCard
                    title="System Prompts"
                    value={stats.reduce((sum, site) => sum + site.promptCount, 0)}
                    description="Active configurations"
                    icon={FileText}
                />
            </div>

            {/* Websites Section */}
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Websites</h2>
                    <Button variant="outline" size="sm">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Website
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {stats.map((website) => (
                        <WebsiteCard
                            key={website.id}
                            name={website.name}
                            description={website.description || ""}
                            slug={website.slug}
                            screenshotCount={website.screenshotCount}
                            promptCount={website.promptCount}
                            status={website.status}
                            lastUpdated={website.lastUpdated}
                        />
                    ))}
                </div>

                {/* Quick Actions */}
                <Card className="mt-8">
                    <CardHeader>
                        <CardTitle className="text-gray-950">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {stats.length > 0 ? (
                                <>
                                    <QuickActionCard
                                        title="Manage Screenshots"
                                        description="Upload and annotate images"
                                        icon={Image}
                                        iconColor="text-blue-600"
                                        href={`/dashboard/websites/${stats[0].slug}/screenshots`}
                                    />
                                    <QuickActionCard
                                        title="Edit Prompts"
                                        description="Customize system instructions"
                                        icon={FileText}
                                        iconColor="text-green-600"
                                        href={`/dashboard/websites/${stats[0].slug}/prompts`}
                                    />
                                    <QuickActionCard
                                        title="Verify Final Prompt"
                                        description="View complete agent prompt with all components"
                                        icon={Eye}
                                        iconColor="text-purple-600"
                                        href={`/dashboard/websites/${stats[0].slug}/verify`}
                                    />
                                    <QuickActionCard
                                        title="Test Agent Demo"
                                        description="Try the voice agent with your configuration"
                                        icon={Mic}
                                        iconColor="text-red-600"
                                        href={`/agent-demo?website=${stats[0].slug}`}
                                    />
                                </>
                            ) : (
                                <div className="col-span-3 text-center py-8">
                                    <p className="text-gray-600">No websites available. Add a website to access quick actions.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
