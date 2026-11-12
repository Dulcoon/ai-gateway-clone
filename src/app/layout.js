import { Inter } from "next/font/google";
import { GoogleAnalytics } from "@next/third-parties/google";
import "material-symbols/outlined.css";
import "./globals.css";
import { ThemeProvider } from "@/shared/components/ThemeProvider";
import "@/lib/network/initOutboundProxy"; // Auto-initialize outbound proxy env
import "@/shared/services/bootstrap"; // Auto-run initializeApp (watchdog, auto-resume tunnel)
import { initConsoleLogCapture } from "@/lib/consoleLogBuffer";
import { RuntimeI18nProvider } from "@/i18n/RuntimeI18nProvider";

// Hook console immediately at module load time (server-side only, runs once)
initConsoleLogCapture();

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata = {
  title: "Route Right - AI Routing & Proxy Management",
  description: "Route Right Gateway. One OpenAI-compatible endpoint for all AI providers with smart fallback, streaming, and usage tracking.",
  icons: {
    icon: "/favicon.svg",
  },
};

export const viewport = {
  themeColor: "#0a0a0a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Apply persisted theme before first paint so a reload does not flash the
            default (light) theme before the client store hydrates. Mirrors the
            zustand-persist "theme" key and the `dark` class applyTheme() sets. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('theme');var t=s?(JSON.parse(s).state||{}).theme:'system';t=t||'system';var m=window.matchMedia('(prefers-color-scheme: dark)').matches;if(t==='dark'||(t==='system'&&m)){document.documentElement.classList.add('dark')}}catch(e){}})();`,
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `var d=document,r=d.documentElement,f=function(){r.classList.add('fonts-loaded')};if(d.fonts&&d.fonts.load){d.fonts.load('24px "Material Symbols Outlined"').then(f).catch(f);setTimeout(f,3000)}else{f()}`,
          }}
        />
        {/* Prevent and clean up browser extension attribute injections (e.g. Urban VPN bis_skin_checked)
            which mutate DOM before hydration and trigger React 19 hydration mismatch warnings */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var o=Element.prototype.setAttribute;Element.prototype.setAttribute=function(n,v){if(n==='bis_skin_checked'||(n&&n.indexOf('bis_')===0))return;return o.apply(this,arguments)};if(window.MutationObserver){var obs=new MutationObserver(function(m){for(var i=0;i<m.length;i++){var t=m[i];if(t.type==='attributes'&&t.attributeName&&t.attributeName.indexOf('bis_')===0){t.target.removeAttribute(t.attributeName)}else if(t.type==='childList'){for(var j=0;j<t.addedNodes.length;j++){var node=t.addedNodes[j];if(node&&node.nodeType===1){if(node.hasAttribute('bis_skin_checked'))node.removeAttribute('bis_skin_checked');var els=node.querySelectorAll?node.querySelectorAll('[bis_skin_checked]'):[];for(var k=0;k<els.length;k++)els[k].removeAttribute('bis_skin_checked')}}}}});obs.observe(document.documentElement,{attributes:true,subtree:true,childList:true,attributeFilter:['bis_skin_checked']})}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider>
          <RuntimeI18nProvider>
            {children}
          </RuntimeI18nProvider>
        </ThemeProvider>
        <GoogleAnalytics gaId={"G-LC959F603F"} />
      </body>
    </html>
  );
}
