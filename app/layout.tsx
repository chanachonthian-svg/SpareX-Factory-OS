import type { Metadata, Viewport } from "next";
import { Anuphan, JetBrains_Mono } from "next/font/google";
import { MotionConfig } from "framer-motion";
import "./globals.css";
import { brand } from "@/lib/site";
import { Copilot } from "@/components/os/Copilot";
import { LanguageProvider } from "@/lib/i18n";

const sans = Anuphan({ subsets: ["latin", "thai"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });
const appTitle = "SpareX Factory OS™ | Industrial AI OS";
export const metadata: Metadata = {
  metadataBase: new URL(`https://${brand.domain}`),
  title: {
    default: appTitle,
    template: appTitle,
  },
  description: brand.mission,
  keywords: [
    "industrial AI",
    "factory operating system",
    "digital twin",
    "predictive maintenance",
    "energy intelligence",
    "OEE",
    "ESG",
    "Industry 4.0",
    "smart factory",
  ],
  openGraph: {
    title: appTitle,
    description: brand.mission,
    url: `https://${brand.domain}`,
    siteName: brand.full,
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#05060a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-ink-950 font-sans text-white antialiased">
        {/* apply the saved theme before paint to avoid a dark flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{if(localStorage.getItem('factoryos:theme')==='light')document.documentElement.classList.add('light')}catch(e){}`,
          }}
        />
        <LanguageProvider>
          <MotionConfig reducedMotion="user">
            {children}
            <Copilot />
          </MotionConfig>
        </LanguageProvider>
      </body>
    </html>
  );
}
