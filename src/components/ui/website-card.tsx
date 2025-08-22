"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { Settings, Eye } from "lucide-react";

interface WebsiteCardProps {
    name: string;
    description: string;
    slug: string;
    screenshotCount: number;
    promptCount: number;
    status: "active" | "inactive";
    lastUpdated?: string;
    className?: string;
}

export function WebsiteCard({ name, description, slug, screenshotCount, promptCount, status, lastUpdated, className }: WebsiteCardProps) {
    return (
        <Card className={`hover:shadow-lg transition-shadow ${className}`}>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-950">{name}</h3>
                    <Badge variant={status === "active" ? "default" : "secondary"}>{status}</Badge>
                </div>
                <p className="text-sm text-gray-700">{description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                        <span className="text-gray-600">Screenshots:</span>
                        <p className="font-medium text-gray-950">{screenshotCount}</p>
                    </div>
                    <div>
                        <span className="text-gray-600">Prompts:</span>
                        <p className="font-medium text-gray-950">{promptCount}</p>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-xs text-gray-500">
                        {lastUpdated ? (
                            `Updated ${new Date(lastUpdated).toLocaleDateString()}`
                        ) : (
                            <span className="text-sm font-mono text-gray-600">/{slug}</span>
                        )}
                    </div>
                    <div className="flex space-x-2">
                        <Link href={`/dashboard/websites/${slug}`}>
                            <Button variant="outline" size="sm">
                                <Settings className="h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href={`/agent-demo?website=${slug}`}>
                            <Button size="sm" className="bg-green-600 hover:bg-green-700">
                                <Eye className="h-4 w-4" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
