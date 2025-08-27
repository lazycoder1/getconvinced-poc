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
    Linkedin,
    Mail,
    CheckCircle2,
    Target,
    Github,
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
                    <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-6xl">
                        Never join a sales call without <br /> an{" "}
                        <span className="whitespace-nowrap">
                            expert{" "}
                            <span className="italic" style={{ color: "#165DFC" }}>
                                agent
                            </span>
                        </span>{" "}
                        by your side
                    </h1>
                    <br />
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
                        <h3 className="mb-2 text-lg font-semibold text-gray-900">Build product confidence with prospects</h3>
                        <p className="text-gray-600">Don't let prospects walk out of a meeting with unanswered questions</p>
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

                {/* About summary (from About page) */}
                <div className="mx-auto mt-20 max-w-3xl text-center">
                    <div className="mb-3 text-sm font-semibold tracking-wide text-blue-700 uppercase">About</div>
                    <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">Two founders on a simple mission</h2>
                    <p className="text-lg text-gray-600">
                        We’re building tools that help sales teams explain complex products with clarity and confidence any time, anywhere.
                    </p>
                </div>

                {/* Founders Section (About) */}
                <section className="grid grid-cols-1 gap-8 mt-20 md:grid-cols-2">
                    {/* Founder 1 */}
                    <div className="flex flex-col p-6 h-full bg-white rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex gap-4 items-start">
                            <img
                                src="/profile/gautam.png"
                                alt="Gautam G Sabhahit"
                                className="object-cover w-14 h-14 rounded-full border border-gray-200"
                            />
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">Gautam G Sabhahit</h3>
                                <p className="text-gray-600">Co-founder</p>
                            </div>
                        </div>
                        {/* Background */}
                        <div className="mt-4">
                            <h4 className="mb-2 text-xs font-semibold tracking-wide text-gray-900 uppercase">
                                Background - Ex-FAANG + Ex-Founder - Brings Engineering Acumen
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex gap-2 items-start">
                                    <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-blue-600" />{" "}
                                    <span>
                                        Created a developer focussed web3 data product which was used by top tier talent in the space.
                                        Achieved consistent high usage metrics across the board. Scaled the product to about ~$400k in
                                        revenues and grants.
                                    </span>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <CheckCircle2 className="mt-0.5 w-4 h-4 text-blue-600" />{" "}
                                    <span>
                                        While part of Amazon Pay, I helped build the emi and buy now pay later product for the Indian
                                        custoemrs.
                                    </span>
                                </li>
                            </ul>
                        </div>
                        {/* Responsibilities */}
                        <div className="mt-4">
                            <h4 className="mb-2 text-xs font-semibold tracking-wide text-gray-900 uppercase">
                                Developed products loved by...
                            </h4>
                            <div className="flex flex-col gap-3 items-center sm:items-start">
                                <div className="flex gap-4 items-center">
                                    <img src="/logos/Ethereum.png" alt="Ethereum" className="w-auto h-8 opacity-80" />
                                    <img src="/logos/Arbitrium.png" alt="Arbitrum" className="w-auto h-8 opacity-80" />
                                    <img src="/logos/Polygon.png" alt="Polygon" className="w-auto h-8 opacity-80" />
                                </div>
                                <div className="flex gap-4 items-center">
                                    <img src="/logos/safe.png" alt="Safe" className="w-auto h-8 opacity-80" />
                                    <img src="/logos/bnb.png" alt="BNB Chain" className="w-auto h-8 opacity-80" />
                                    <img src="/logos/Optimism.png" alt="Optimism" className="w-auto h-8 opacity-80" />
                                </div>
                            </div>
                        </div>

                        {/* Responsibilities */}
                        <div className="mt-4">
                            <h4 className="mb-2 text-xs font-semibold tracking-wide text-gray-900 uppercase">Responsibilities</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex gap-2 items-start">
                                    <Target className="mt-0.5 w-4 h-4 text-purple-600" />{" "}
                                    <span>
                                        Focused on product architecture, AI agents, and fast, reliable demo experiences that work out of the
                                        box.
                                    </span>
                                </li>
                            </ul>
                        </div>
                        <div className="flex gap-4 items-center pt-4 mt-auto border-t border-gray-100">
                            <Link
                                href="https://linkedin.com/in/gautam-sabhahit-8a7835100/"
                                className="inline-flex gap-2 items-center text-blue-600 hover:underline"
                            >
                                <Linkedin className="w-4 h-4" /> LinkedIn
                            </Link>
                            <a href="mailto:ggs@getconvinced.ai" className="inline-flex gap-2 items-center text-blue-600 hover:underline">
                                <Mail className="w-4 h-4" /> Email
                            </a>
                            <Link
                                href="https://github.com/lazycoder1"
                                className="inline-flex gap-2 items-center text-gray-700 hover:underline"
                            >
                                <Github className="w-4 h-4" /> GitHub
                            </Link>
                        </div>
                    </div>

                    {/* Founder 2 */}
                    <div className="flex flex-col p-6 h-full bg-white rounded-2xl border border-gray-200 shadow-sm">
                        <div className="flex gap-4 items-start">
                            <img
                                src="/profile/vignesh.png"
                                alt="Vignesh G Sabhahit"
                                className="object-cover w-14 h-14 rounded-full border border-gray-200"
                            />
                            <div>
                                <h3 className="text-xl font-semibold text-gray-900">Vignesh G Sabhahit</h3>
                                <p className="text-gray-600">Co-founder</p>
                            </div>
                        </div>
                        {/* Background */}
                        <div className="mt-4">
                            <h4 className="mb-2 text-xs font-semibold tracking-wide text-gray-900 uppercase">
                                Background - Ex-Investment Banking - Brings Business Acumen
                            </h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex gap-2 items-start">
                                    <CheckCircle2 className="mt-0.5 w-4 h-4 shrink-0 text-blue-600" />{" "}
                                    <span>
                                        Successfully raised $35mn from well known VCs across 8 transaction for 6 companies operating in the
                                        B2B SaaS, Edtech, AyurvedaTech & the Consumer spaces.
                                    </span>
                                </li>
                            </ul>
                        </div>
                        <br />
                        <br />
                        {/* Led successful mandate closures for */}
                        <div className="mt-4">
                            <h4 className="mb-2 text-xs font-semibold tracking-wide text-gray-900 uppercase">
                                Led successful mandate closures for...
                            </h4>
                            <div className="flex flex-col gap-3 items-center sm:items-start">
                                <div className="flex gap-4 items-center">
                                    <img src="/logos/bizom.png" alt="Bizom" className="w-32 h-auto opacity-80" />
                                </div>
                                <div className="flex gap-4 items-center">
                                    <img src="/logos/enmovil.png" alt="Enmovil" className="w-32 h-auto opacity-80" />
                                </div>
                            </div>
                        </div>
                        {/* Responsibilities */}
                        <div className="mt-4">
                            <h4 className="mb-2 text-xs font-semibold tracking-wide text-gray-900 uppercase">Responsibilities</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex gap-2 items-start">
                                    <Target className="mt-0.5 w-4 h-4 text-purple-600" />{" "}
                                    <span>
                                        Focused on customer outcomes, sales workflows, and turning complex capability into clear, credible
                                        narratives.
                                    </span>
                                </li>
                            </ul>
                        </div>

                        <div className="flex gap-4 items-center pt-4 mt-auto border-t border-gray-100">
                            <Link
                                href="https://linkedin.com/in/vignesh-sabhahit-4a637452"
                                className="inline-flex gap-2 items-center text-blue-600 hover:underline"
                            >
                                <Linkedin className="w-4 h-4" /> LinkedIn
                            </Link>
                            <a href="mailto:vgs@getconvinced.ai" className="inline-flex gap-2 items-center text-blue-600 hover:underline">
                                <Mail className="w-4 h-4" /> Email
                            </a>
                        </div>
                    </div>
                </section>
            </main>

            {/* Footer */}
        </div>
    );
}
