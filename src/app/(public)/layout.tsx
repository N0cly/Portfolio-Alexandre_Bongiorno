import { Cormorant_Garamond, Inter } from "next/font/google";
import { PublicHeader } from "@/components/PublicHeader";
import { PublicFooter } from "@/components/PublicFooter";
import { PageViewTracker } from "@/components/PageViewTracker";
import { CookieConsent } from "@/components/CookieConsent";

const serif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-serif",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-sans-public",
  display: "swap",
});

export const dynamic = "force-dynamic";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${serif.variable} ${sans.variable} flex min-h-screen flex-col bg-[#fafaf8] text-neutral-900`}
      style={{ fontFamily: "var(--font-sans-public)" }}
    >
      <PublicHeader />
      <PageViewTracker />
      <div className="flex-1">{children}</div>
      <PublicFooter />
      <CookieConsent />
    </div>
  );
}
