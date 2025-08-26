import "./globals.css";
import Script from "next/script";

export const metadata = {
    title: "Convinced: A digital product expert on every call.",
    description: 'No more "let me get a sales engineer," just clear, confident explanations.',
    icons: {
        icon: "/logo.png",
        apple: "/logo.png",
        shortcut: "/logo.png",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
                {children}
                <Script id="factors-embed" strategy="afterInteractive">{`
window.faitracker=window.faitracker||function(){this.q=[];var t=new CustomEvent("FAITRACKER_QUEUED_EVENT");return this.init=function(t,e,a){this.TOKEN=t,this.INIT_PARAMS=e,this.INIT_CALLBACK=a,window.dispatchEvent(new CustomEvent("FAITRACKER_INIT_EVENT"))},this.call=function(){var e={k:"",a:[]};if(arguments&&arguments.length>=1){for(var a=1;a<arguments.length;a++)e.a.push(arguments[a]);e.k=arguments[0]}this.q.push(e),window.dispatchEvent(t)},this.message=function(){window.addEventListener("message",function(t){"faitracker"===t.data.origin&&this.call("message",t.data.type,t.data.message)})},this.message(),this.init("lf4khvr1zm0328nsf1ha4zs4h1v3r7v0",{host:"https://api.factors.ai"}),this}(),function(){var t=document.createElement("script");t.type="text/javascript",t.src="https://app.factors.ai/assets/factors.js",t.async=!0,(d=document.getElementsByTagName("script")[0]).parentNode.insertBefore(t,d)}();
`}</Script>
            </body>
        </html>
    );
}
