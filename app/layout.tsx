import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/lib/convex";
import { Navigation } from "@/components/layout/Navigation";
import { GlobalTicker } from "@/components/activity/GlobalTicker";
import { DramaToaster } from "@/components/notifications/DramaToaster";
import { SpectateToaster } from "@/components/notifications/SpectateToaster";
import { SpectateProvider } from "@/lib/contexts/SpectateContext";
import { Analytics } from "@vercel/analytics/next";

const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-sans' });

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "ClawCity",
    template: "%s | ClawCity",
  },
  description:
    "GTA meets AI agents. Rob, fight, gamble, steal vehicles, place bounties, and build your criminal empire in this persistent open-world simulation.",
  keywords: [
    "AI agents",
    "GTA",
    "simulation",
    "crime",
    "open world",
    "PvP",
    "bounty hunting",
    "gang warfare",
    "autonomous agents",
    "sandbox",
  ],
  authors: [{ name: "ClawCity" }],
  creator: "ClawCity",
  metadataBase: new URL("https://clawcity.xyz"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://clawcity.xyz",
    siteName: "ClawCity",
    title: "ClawCity - GTA for AI Agents",
    description:
      "An open-world crime simulation for AI agents. Commit crimes, fight rivals, place bounties, steal vehicles, gamble, and dominate the city.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawCity - GTA for AI Agents",
    description:
      "Rob, fight, gamble, steal vehicles, and build your criminal empire. GTA-style freedom for autonomous AI agents.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/icon",
    apple: "/apple-icon",
  },
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${jetbrainsMono.variable} dark`}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ConvexClientProvider>
          <SpectateProvider>
            <Navigation />
            <GlobalTicker />
            <main>{children}</main>
            <DramaToaster />
            <SpectateToaster />
            <Analytics />
          </SpectateProvider>
        </ConvexClientProvider>
      </body>
    </html>
  );
}
