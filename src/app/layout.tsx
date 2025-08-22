import "./globals.css";

export const metadata = {
    title: "HubSpot Playwright MCP",
    description: "HubSpot automation with Playwright and voice control",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
