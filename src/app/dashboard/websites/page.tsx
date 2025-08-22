"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Plus, Search, Globe, Eye, Settings, Image, FileText } from "lucide-react";

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

export default function WebsitesPage() {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        loadWebsites();
    }, []);

    const loadWebsites = async () => {
        try {
            setLoading(true);
            const response = await fetch("/api/dashboard/websites");

            if (!response.ok) {
                throw new Error("Failed to fetch websites");
            }

            const websitesData = await response.json();
            setWebsites(websitesData);
        } catch (error) {
            console.error("Error loading websites:", error);
            setWebsites([]);
        } finally {
            setLoading(false);
        }
    };

    const filteredWebsites = websites.filter(
        (website) =>
            website.name.toLowerCase().includes(searchQuery.toLowerCase()) || website.slug.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return (
            <div className="p-8">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Loading websites...</p>
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
                        <h1 className="text-3xl font-bold text-gray-900">Websites</h1>
                        <p className="mt-2 text-gray-600">Manage your AI agents for different websites and platforms</p>
                    </div>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Website
                    </Button>
                </div>
            </div>

            {/* Search and Filters */}
            <div className="mb-6">
                <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Search websites..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Websites Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredWebsites.map((website) => (
                    <Card key={website.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                        <Globe className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg">{website.name}</CardTitle>
                                        <p className="text-sm text-gray-500">/{website.slug}</p>
                                    </div>
                                </div>
                                <Badge variant={website.status === "active" ? "default" : "secondary"}>{website.status}</Badge>
                            </div>
                            {website.description && <p className="text-sm text-gray-600 mt-2">{website.description}</p>}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Stats */}
                            <div className="grid grid-cols-2 gap-4 text-sm">
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-center mb-1">
                                        <Image className="h-4 w-4 text-blue-600 mr-1" />
                                    </div>
                                    <div className="font-semibold">{website.screenshotCount}</div>
                                    <div className="text-gray-500">Screenshots</div>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                    <div className="flex items-center justify-center mb-1">
                                        <FileText className="h-4 w-4 text-green-600 mr-1" />
                                    </div>
                                    <div className="font-semibold">{website.promptCount}</div>
                                    <div className="text-gray-500">Prompts</div>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center justify-between pt-4 border-t">
                                <div className="text-xs text-gray-500">Created {new Date(website.created_at).toLocaleDateString()}</div>
                                <div className="flex space-x-2">
                                    <Link href={`/dashboard/websites/${website.slug}`}>
                                        <Button variant="outline" size="sm">
                                            <Settings className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Link href={`/dashboard/websites/${website.slug}/verify`}>
                                        <Button variant="outline" size="sm">
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Link href={`/agent-demo?website=${website.slug}`}>
                                        <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                            Test
                                        </Button>
                                    </Link>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Empty State */}
            {filteredWebsites.length === 0 && (
                <div className="text-center py-12">
                    <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No websites found</h3>
                    <p className="text-gray-600 mb-4">
                        {searchQuery ? "Try adjusting your search query." : "Get started by adding your first website."}
                    </p>
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Your First Website
                    </Button>
                </div>
            )}

            {/* Quick Stats */}
            {websites.length > 0 && (
                <div className="mt-8 bg-white rounded-lg border border-gray-200 p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Stats</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600">{websites.length}</div>
                            <div className="text-sm text-gray-600">Total Websites</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">{websites.filter((w) => w.status === "active").length}</div>
                            <div className="text-sm text-gray-600">Active Agents</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600">
                                {websites.reduce((sum, w) => sum + w.screenshotCount, 0)}
                            </div>
                            <div className="text-sm text-gray-600">Total Screenshots</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl font-bold text-orange-600">{websites.reduce((sum, w) => sum + w.promptCount, 0)}</div>
                            <div className="text-sm text-gray-600">System Prompts</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
