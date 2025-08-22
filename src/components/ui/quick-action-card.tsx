"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface QuickActionCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    iconColor: string;
    href: string;
    className?: string;
}

export function QuickActionCard({ title, description, icon: Icon, iconColor, href, className }: QuickActionCardProps) {
    return (
        <Link href={href}>
            <Card className={`p-4 hover:bg-gray-50 cursor-pointer transition-colors ${className}`}>
                <div className="flex items-center">
                    <Icon className={`h-8 w-8 mr-3 ${iconColor}`} />
                    <div>
                        <h3 className="font-medium text-gray-950">{title}</h3>
                        <p className="text-sm text-gray-700">{description}</p>
                    </div>
                </div>
            </Card>
        </Link>
    );
}
