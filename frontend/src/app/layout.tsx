import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/components/AuthProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://infinwork.app"),
  title: {
    default: "Infinwork — AI Workspace for Builders",
    template: "%s | Infinwork"
  },
  description:
    "Infinwork is an AI workspace where work becomes measurable. Set targets, build chains, track time, and analyze your performance using human stock-style productivity charts.",
  keywords: [
    "AI workspace",
    "productivity platform",
    "task tracking",
    "discipline system",
    "workflow management",
    "performance tracking",
    "goal tracking",
    "time management",
    "accountability system",
    "team productivity"
  ],
  authors: [
    { name: "Infinwork Team" }
  ],
  creator: "Infinwork",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png"
  },
  openGraph: {
    title: "Infinwork — AI Workspace for Builders",
    description:
      "Turn your work into measurable progress using targets, chains, and performance analytics.",
    url: "https://infinwork.app",
    siteName: "Infinwork",
    type: "website"
  },
  twitter: {
    card: "summary_large_image",
    title: "Infinwork — AI Workspace",
    description:
      "Measure your work. Build discipline. Stay consistent."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
        <Script
          id="structured-data"
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Infinwork",
              applicationCategory: "ProductivityApplication",
              operatingSystem: "Web",
              url: "https://infinwork.app",
              description: "An AI workspace that helps users set targets, build chains, track time, and measure performance."
            })
          }}
        />
      </body>
    </html>
  );
}
