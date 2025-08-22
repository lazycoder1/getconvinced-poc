"use client";

import Link from "next/link";
import { ArrowRight, Play, Zap, Users, BarChart3, Menu, X } from "lucide-react";
import { useState } from "react";

export default function WelcomePage() {
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header */}
            <header className="bg-white border-b border-gray-200 shadow-sm">
                <div className="px-4 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-2">
                            <div className="flex justify-center items-center w-8 h-8 bg-blue-600 rounded-lg">
                                <Zap className="w-5 h-5 text-white" />
                            </div>
                            <h1 className="text-xl font-bold text-gray-900">AI Agent Dashboard</h1>
                        </div>
                        <nav className="hidden space-x-8 md:flex">
                            <Link href="/dashboard" className="text-gray-600 transition-colors hover:text-gray-900">
                                Dashboard
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
                                    href="/dashboard"
                                    className="block px-3 py-2 text-base font-medium text-gray-600 rounded-md transition-colors hover:text-gray-900 hover:bg-gray-50"
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Dashboard
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

            {/* Hero Section */}
            <main className="px-4 py-20 mx-auto max-w-7xl sm:px-6 lg:px-8">
                <div className="text-center">
                    <h1 className="mb-6 text-4xl font-bold text-gray-900 md:text-6xl">
                        Welcome to
                        <span className="block text-blue-600">AI Agent Dashboard</span>
                    </h1>
                    <p className="mx-auto mb-8 max-w-3xl text-xl text-gray-600">
                        Experience the future of AI-powered assistance with our intelligent voice agents. See how AI can transform your
                        customer interactions and boost your team's productivity.
                    </p>

                    {/* CTA Button */}
                    <Link
                        href="/agent-demo?website=hubspot"
                        className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200"
                    >
                        <Play className="mr-2 w-5 h-5" />
                        Try Live HubSpot Demo
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </div>

                {/* Features Grid */}
                <div className="grid grid-cols-1 gap-8 mt-20 md:grid-cols-3">
                    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex justify-center items-center mb-4 w-12 h-12 bg-blue-100 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">Voice-Powered AI</h3>
                        <p className="text-gray-600">
                            Natural conversation with intelligent AI agents that understand context and provide helpful responses.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex justify-center items-center mb-4 w-12 h-12 bg-green-100 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">Visual Screenshots</h3>
                        <p className="text-gray-600">
                            AI agents can reference visual screenshots to provide more accurate and contextual assistance.
                        </p>
                    </div>

                    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex justify-center items-center mb-4 w-12 h-12 bg-purple-100 rounded-lg">
                            <Zap className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">Instant Setup</h3>
                        <p className="text-gray-600">Get started in minutes with our pre-configured templates and easy-to-use interface.</p>
                    </div>
                </div>

                {/* Demo Section */}
                <div className="p-8 mt-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <div className="mb-8 text-center">
                        <h2 className="mb-4 text-2xl font-bold text-gray-900">Try It Live</h2>
                        <p className="text-gray-600">Experience the power of AI voice agents in real-time with our HubSpot demo.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="p-6 bg-blue-50 rounded-lg">
                            <h3 className="mb-2 font-semibold text-blue-900">What You'll Experience</h3>
                            <ul className="space-y-1 text-sm text-blue-800">
                                <li>• Natural voice conversation</li>
                                <li>• Visual screenshot references</li>
                                <li>• Context-aware responses</li>
                                <li>• Real-time assistance</li>
                            </ul>
                        </div>

                        <div className="p-6 bg-green-50 rounded-lg">
                            <h3 className="mb-2 font-semibold text-green-900">Perfect For</h3>
                            <ul className="space-y-1 text-sm text-green-800">
                                <li>• Sales teams</li>
                                <li>• Customer support</li>
                                <li>• Product demos</li>
                                <li>• Training sessions</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="mt-20 bg-white border-t border-gray-200">
                <div className="px-4 py-8 mx-auto max-w-7xl sm:px-6 lg:px-8">
                    <div className="text-center text-gray-600">
                        <p>&copy; 2024 AI Agent Dashboard. Experience the future of AI assistance.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
