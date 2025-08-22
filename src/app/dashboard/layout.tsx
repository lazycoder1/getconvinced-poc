"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Home, Settings, Image, FileText, Globe, Eye, ChevronDown } from "lucide-react";

interface DashboardLayoutProps {
    children: React.ReactNode;
}

interface Website {
    id: string;
    name: string;
    slug: string;
    status: "active" | "inactive";
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
    const [websites, setWebsites] = useState<Website[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadWebsites();
    }, []);

    const loadWebsites = async () => {
        try {
            const response = await fetch("/api/dashboard/websites");
            if (response.ok) {
                const websitesData = await response.json();
                setWebsites(websitesData);
            }
        } catch (error) {
            console.error("Error loading websites for navigation:", error);
        } finally {
            setLoading(false);
        }
    };
    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <div className="w-64 bg-white shadow-sm border-r border-gray-200">
                <div className="p-6 border-b border-gray-200">
                    <h1 className="text-xl font-bold text-gray-900">Agent Dashboard</h1>
                    <p className="text-sm text-gray-600 mt-1">Manage AI agents for websites</p>
                </div>

                <nav className="p-4">
                    <ul className="space-y-2">
                        <li>
                            <Link
                                href="/dashboard"
                                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            >
                                <Home className="h-4 w-4 mr-3" />
                                Overview
                            </Link>
                        </li>
                        <li>
                            <Link
                                href="/dashboard/websites"
                                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
                            >
                                <Globe className="h-4 w-4 mr-3" />
                                Websites
                            </Link>
                        </li>
                        {websites.slice(0, 3).map((website) => (
                            <li key={website.id}>
                                <Link
                                    href={`/dashboard/websites/${website.slug}`}
                                    className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                        website.status === "active" ? "text-blue-600 bg-blue-50" : "text-gray-600 hover:bg-gray-100"
                                    }`}
                                >
                                    <Settings className="h-4 w-4 mr-3" />
                                    {website.name}
                                    {website.status === "inactive" && <span className="ml-2 text-xs text-gray-400">(inactive)</span>}
                                </Link>
                            </li>
                        ))}
                        {websites.length > 3 && <li className="px-3 py-2 text-sm text-gray-500">+{websites.length - 3} more websites</li>}
                    </ul>

                    <div className="mt-8">
                        <h3 className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Quick Actions</h3>
                        <ul className="mt-2 space-y-1">
                            {websites.length > 0 ? (
                                <>
                                    <li>
                                        <Link
                                            href={`/dashboard/websites/${websites[0].slug}/screenshots`}
                                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                        >
                                            <Image className="h-4 w-4 mr-3" />
                                            Screenshots
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href={`/dashboard/websites/${websites[0].slug}/prompts`}
                                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                        >
                                            <FileText className="h-4 w-4 mr-3" />
                                            Prompts
                                        </Link>
                                    </li>
                                    <li>
                                        <Link
                                            href={`/dashboard/websites/${websites[0].slug}/verify`}
                                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-100 hover:text-gray-900 transition-colors"
                                        >
                                            <Eye className="h-4 w-4 mr-3" />
                                            Verify Prompt
                                        </Link>
                                    </li>
                                </>
                            ) : (
                                <li className="px-3 py-2 text-sm text-gray-500">No websites available</li>
                            )}
                        </ul>
                    </div>
                </nav>
            </div>

            {/* Main Content */}
            <div className="flex-1">{children}</div>
        </div>
    );
}
