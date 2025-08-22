"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { LucideIcon } from "lucide-react";

interface SectionCardProps {
    title: string;
    description: string;
    icon: LucideIcon;
    buttonText: string;
    href?: string;
    onClick?: () => void;
    variant?: "default" | "outline";
    className?: string;
}

export function SectionCard({
    title,
    description,
    icon: Icon,
    buttonText,
    href,
    onClick,
    variant = "default",
    className,
}: SectionCardProps) {
    const button = (
        <Button variant={variant} onClick={onClick}>
            <Icon className="mr-2 w-4 h-4" />
            {buttonText}
        </Button>
    );

    return (
        <Card className={className}>
            <CardHeader>
                <CardTitle className="text-gray-950">{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="py-8 text-center">
                    <Icon className="mx-auto mb-4 w-12 h-12 text-gray-400" />
                    <h3 className="mb-2 text-lg font-medium text-gray-900">{title}</h3>
                    <p className="mb-4 text-gray-700">{description}</p>
                    {href ? <Link href={href}>{button}</Link> : button}
                </div>
            </CardContent>
        </Card>
    );
}
