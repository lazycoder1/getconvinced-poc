import "./globals.css";

export const metadata = {
    title: "HubSpot Playwright MCP",
    description: "HubSpot automation with Playwright and voice control",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">{children}</body>
        </html>
    );
}
