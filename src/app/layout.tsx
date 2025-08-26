import "./globals.css";

export const metadata = {
    title: "A digital product expert on every call.",
    description: 'No more "let me get a sales engineer," just clear, confident explanations.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">{children}</body>
        </html>
    );
}
