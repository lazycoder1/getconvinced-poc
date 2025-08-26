"use client";

import Link from "next/link";
import { Menu, X } from "lucide-react";
import { useState } from "react";

export default function Header() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
                    <nav className="hidden space-x-8 md:flex">
                        <Link href="/" className="text-gray-600 transition-colors hover:text-gray-900">
                            Home
                        </Link>
                        <Link href="/about" className="text-gray-600 transition-colors hover:text-gray-900">
                            About
                        </Link>
                        <Link href="/agent-demo?website=hubspot" className="text-gray-600 transition-colors hover:text-gray-900">
                            Live Demo
                        </Link>
                    </nav>

                    {/* Mobile menu button */}
                    <div className="md:hidden">
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="p-2 text-gray-600 rounded-md hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                        >
                            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>

                {/* Mobile menu */}
                {isMobileMenuOpen && (
                    <div className="md:hidden">
                        <div className="px-2 pt-2 pb-3 space-y-1 border-t border-gray-200 sm:px-3">
                            <Link
                                href="/"
                                className="block px-3 py-2 text-base font-medium text-gray-600 rounded-md transition-colors hover:text-gray-900 hover:bg-gray-50"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Home
                            </Link>
                            <Link
                                href="/about"
                                className="block px-3 py-2 text-base font-medium text-gray-600 rounded-md transition-colors hover:text-gray-900 hover:bg-gray-50"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                About
                            </Link>
                            <Link
                                href="/agent-demo?website=hubspot"
                                className="block px-3 py-2 text-base font-medium text-gray-600 rounded-md transition-colors hover:text-gray-900 hover:bg-gray-50"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Live Demo
                            </Link>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
}
