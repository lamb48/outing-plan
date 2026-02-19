import type { Metadata } from "next";
import { Suspense } from "react";
import { Geist, Geist_Mono } from "next/font/google";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";
import { PUBLIC_IMAGES } from "@/lib/supabase/storage";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://outing-plan.vercel.app";
const siteTitle = "OutingPlan - あなたにぴったりのおでかけプラン";
const siteDescription =
  "予算や時間に合わせた最適なおでかけプランを自動生成。観光スポットやグルメ、アクティビティまで、あなただけのプランを作成できます。";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteTitle,
    template: "%s | OutingPlan",
  },
  description: siteDescription,
  openGraph: {
    type: "website",
    locale: "ja_JP",
    url: siteUrl,
    siteName: "OutingPlan",
    title: siteTitle,
    description: siteDescription,
    images: [
      {
        url: PUBLIC_IMAGES.ogpImage,
        width: 1200,
        height: 630,
        alt: "OutingPlan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: siteDescription,
    images: [PUBLIC_IMAGES.ogpImage],
  },
  other: {
    "format-detection": "telephone=no, email=no, address=no",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <GoogleAnalytics />
        <Suspense fallback={null}>
          <PageViewTracker />
        </Suspense>
        {children}
      </body>
    </html>
  );
}
