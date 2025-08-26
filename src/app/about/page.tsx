import Link from "next/link";
import { ArrowRight, Linkedin, Mail, CheckCircle2, Target } from "lucide-react";
import Header from "@/components/Header";

export const metadata = {
    title: "About – Get Convinced",
    description: "Meet the cofounders behind Get Convinced.",
};

export default function AboutPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            <Header />
            <main className="px-4 py-20 mx-auto max-w-7xl sm:px-6 lg:px-8">
                <div className="mx-auto max-w-3xl text-center">
                    <div className="mb-3 text-sm font-semibold tracking-wide text-blue-700 uppercase">About</div>
                    <h1 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl">Two founders on a simple mission</h1>
                    <p className="text-lg text-gray-600">
                        We’re building tools that help sales teams explain complex products with clarity and confidence any time, anywhere.
                    </p>
                </div>

                <section className="grid grid-cols-1 gap-8 mt-16 md:grid-cols-2">
                    {/* Cofounder 1 */}
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
                            <h4 className="mb-2 text-xs font-semibold tracking-wide text-gray-900 uppercase">Background</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex gap-2 items-start">
                                    <CheckCircle2 className="mt-0.5 w-4 h-4 text-blue-600" />{" "}
                                    <span>Ex-FAANG + Ex-Founder - Brings Engineering Acumen</span>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <CheckCircle2 className="mt-0.5 w-4 h-4 text-blue-600" />{" "}
                                    <span>
                                        Created a developer focussed web3 data product which was used by top tier talent in the space.
                                        Achieved consistent high usage metrics across the board. Won multiple equity free grants as a
                                        recognition to our contribution to the adoption of Account Abstraction Tech Stacks in Web3. Scaled
                                        the product to about ~$400k in revenues and grants.
                                    </span>
                                </li>
                            </ul>
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
                        </div>
                    </div>

                    {/* Cofounder 2 */}
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
                            <h4 className="mb-2 text-xs font-semibold tracking-wide text-gray-900 uppercase">Background</h4>
                            <ul className="space-y-2 text-sm text-gray-700">
                                <li className="flex gap-2 items-start">
                                    <CheckCircle2 className="mt-0.5 w-4 h-4 text-blue-600" />{" "}
                                    <span>Ex-Investment Banking - Brings Business Acumen</span>
                                </li>
                                <li className="flex gap-2 items-start">
                                    <CheckCircle2 className="mt-0.5 w-4 h-4 text-blue-600" />{" "}
                                    <span>
                                        Successfully raised $35mn from well known VCs across 8 transaction for 6 companies operating in the
                                        B2B SaaS, Edtech, AyurvedaTech & the Consumer spaces.
                                        <br />
                                        <br />
                                        <br />
                                    </span>
                                </li>
                            </ul>
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

                <div className="mt-16 text-center">
                    <Link
                        href="/agent-demo?website=hubspot"
                        className="inline-flex items-center px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow transition-colors hover:bg-blue-700"
                    >
                        Try the Demo <ArrowRight className="ml-2 w-5 h-5" />
                    </Link>
                </div>
            </main>
        </div>
    );
}
