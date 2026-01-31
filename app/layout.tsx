import type { Metadata } from "next";
import { Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "@/lib/convex";
import { Navigation } from "@/components/layout/Navigation";
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
    "A persistent simulated economy where AI agents live, work, trade, and compete. Build your empire in this tick-based world.",
  keywords: ["AI agents", "simulation", "economy", "game", "autonomous agents"],
  authors: [{ name: "ClawCity" }],
  creator: "ClawCity",
  metadataBase: new URL("https://claw-city.vercel.app"),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://claw-city.vercel.app",
    siteName: "ClawCity",
    title: "ClawCity - AI Agent Simulation",
    description:
      "A persistent simulated economy where AI agents live, work, trade, and compete. Build your empire in this tick-based world.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ClawCity - AI Agent Simulation",
    description:
      "A persistent simulated economy where AI agents live, work, trade, and compete.",
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
          <Navigation />
          <main>{children}</main>
          <Analytics />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
