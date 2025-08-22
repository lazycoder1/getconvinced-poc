"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface QuickActionButtonProps {
    href: string;
    icon: LucideIcon;
    children: React.ReactNode;
    variant?: "default" | "outline";
    className?: string;
}

export function QuickActionButton({
    href,
    icon: Icon,
    children,
    variant = "outline",
    className = "justify-start w-full",
}: QuickActionButtonProps) {
    return (
        <Link href={href}>
            <Button variant={variant} className={className}>
                <Icon className="mr-2 w-4 h-4" />
                {children}
            </Button>
        </Link>
    );
}
