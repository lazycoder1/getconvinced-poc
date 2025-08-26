"use client";

import Link from "next/link";
import {
    ArrowRight,
    Play,
    Zap,
    Users,
    BarChart3,
    Mic,
    Image,
    Brain,
    Clock,
    Languages,
    Palette,
    Shield,
    Headphones,
    PlayCircle,
    GraduationCap,
} from "lucide-react";
import Header from "@/components/Header";

export default function WelcomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <Header />

            {/* Hero Section */}
            <main className="px-4 py-20 mx-auto max-w-7xl sm:px-6 lg:px-8">
                <div className="text-center">
                    {/* <div className="mb-3 text-sm font-semibold tracking-wide text-blue-700 uppercase">Get Convinced</div> */}
                    <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-6xl">A digital product expert on every call.</h1>
                    <p className="mx-auto mb-8 max-w-3xl text-lg text-gray-600">
                        {/* <span className="block">Every rep sells like an expert.</span> */}
                        <span className="block italic">No more “let me get a sales engineer,” just clear, confident explanations.</span>
                    </p>

                    {/* CTA Button */}
                    <Link
                        href="/agent-demo?website=hubspot"
                        className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 duration-200"
                    >
                        <Play className="mr-2 w-5 h-5" />
                        Try the Demo
                        <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </div>

                {/* About removed per request */}

                {/* Value Props */}
                <div className="grid grid-cols-1 gap-8 mt-20 md:grid-cols-3">
                    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex justify-center items-center mb-4 w-12 h-12 bg-blue-100 rounded-lg">
                            <Users className="w-6 h-6 text-blue-600" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">On-demand product knowledge</h3>
                        <p className="text-gray-600">Give every AE the technical confidence of a Sales Engineer.</p>
                    </div>

                    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex justify-center items-center mb-4 w-12 h-12 bg-green-100 rounded-lg">
                            <BarChart3 className="w-6 h-6 text-green-600" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">Agent-powered instant demos</h3>
                        <p className="text-gray-600">Run credible product walkthroughs any time, anywhere.</p>
                    </div>

                    <div className="p-6 bg-white rounded-xl border border-gray-200 shadow-sm transition-shadow hover:shadow-md">
                        <div className="flex justify-center items-center mb-4 w-12 h-12 bg-purple-100 rounded-lg">
                            <Zap className="w-6 h-6 text-purple-600" />
                        </div>
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">Close deals faster</h3>
                        <p className="text-gray-600">Tell clearer stories, handle objections, and move to next steps confidently.</p>
                    </div>
                </div>

                {/* Product Promise */}
                <section className="p-8 mt-20 bg-blue-50 rounded-2xl border border-blue-100">
                    <div className="mx-auto max-w-4xl text-center">
                        <h2 className="mb-3 text-2xl font-bold text-blue-900">Why it matters</h2>
                        <p className="text-blue-900">
                            Our product makes sure that sales teams have all the technical and product knowledge on demand. Including demos
                            that they can give without notice through our agent.
                        </p>
                        <div className="mt-6">
                            <Link
                                href="/agent-demo?website=hubspot"
                                className="inline-flex items-center px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow transition-colors hover:bg-blue-700"
                            >
                                <Play className="mr-2 w-5 h-5" />
                                Try the Demo
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Link>
                        </div>
                    </div>
                </section>

                {/* Demo Section */}
                <div className="p-8 mt-20 bg-white rounded-2xl border border-gray-200 shadow-sm">
                    <div className="mb-8 text-center">
                        <h2 className="mb-4 text-2xl font-bold text-gray-900">Try the Demo</h2>
                        <p className="text-gray-600">Give a live product walkthrough powered by our agent with no prep required.</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <div className="p-6 bg-blue-50 rounded-lg">
                            <h3 className="mb-2 font-semibold text-blue-900">What You'll Experience</h3>
                            <ul className="space-y-3 text-sm text-blue-900">
                                <li className="flex gap-2 items-center">
                                    <Mic className="w-4 h-4" /> <span>Natural voice conversation</span>
                                </li>
                                <li className="flex gap-2 items-center">
                                    <Image className="w-4 h-4" /> <span>Visual screenshot references</span>
                                </li>
                                <li className="flex gap-2 items-center">
                                    <Brain className="w-4 h-4" /> <span>Context-aware responses</span>
                                </li>
                                <li className="flex gap-2 items-center">
                                    <Clock className="w-4 h-4" /> <span>Real-time assistance</span>
                                </li>
                                <li className="flex gap-2 items-center">
                                    <Languages className="w-4 h-4" /> <span>Multi-lingual</span>
                                </li>
                                <li className="flex gap-2 items-center">
                                    <Palette className="w-4 h-4" /> <span>Adherence to brand guidelines</span>
                                </li>
                                <li className="flex gap-2 items-center">
                                    <Shield className="w-4 h-4" /> <span>Ring fenced to products</span>
                                </li>
                            </ul>
                        </div>

                        <div className="p-6 bg-green-50 rounded-lg">
                            <h3 className="mb-2 font-semibold text-green-900">Perfect For</h3>
                            <ul className="space-y-3 text-sm text-green-900">
                                <li className="flex gap-2 items-center">
                                    <Users className="w-4 h-4" /> <span>Sales teams</span>
                                </li>
                                <li className="flex gap-2 items-center">
                                    <Headphones className="w-4 h-4" /> <span>Customer support</span>
                                </li>
                                <li className="flex gap-2 items-center">
                                    <PlayCircle className="w-4 h-4" /> <span>Product demos</span>
                                </li>
                                <li className="flex gap-2 items-center">
                                    <GraduationCap className="w-4 h-4" /> <span>Training sessions</span>
                                </li>
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
