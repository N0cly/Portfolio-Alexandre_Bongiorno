import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { getSiteContent } from "@/lib/site-content";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

export async function generateMetadata(): Promise<Metadata> {
  let studioName = "Portfolio";
  try {
    const content = await getSiteContent();
    studioName = content.studioName;
  } catch {
    /* fallback */
  }
  const base = getBaseUrl();
  return {
    metadataBase: new URL(base),
    title: {
      default: studioName,
      template: `%s · ${studioName}`,
    },
    description: `${studioName} — portfolio photographique.`,
    openGraph: {
      title: studioName,
      description: `${studioName} — portfolio photographique.`,
      siteName: studioName,
      type: "website",
      locale: "fr_FR",
    },
    twitter: {
      card: "summary_large_image",
      title: studioName,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-neutral-900">
        {children}
      </body>
    </html>
  );
}
