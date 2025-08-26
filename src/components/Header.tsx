"use client";

import Link from "next/link";

export default function Header() {
    return (
        <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                <div className="flex justify-between items-center py-4">
                    <div className="flex items-center space-x-3">
                        <Link href="/" className="flex items-center space-x-2">
                            <img src="/logo.png" alt="Get Convinced" className="w-8 h-8 rounded" />
                            <span className="text-xl font-bold text-gray-900 transition-colors hover:text-blue-600">Convinced</span>
                        </Link>
                    </div>
                    <div />
                </div>
            </div>
        </header>
    );
}
