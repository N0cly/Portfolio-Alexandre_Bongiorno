import Link from "next/link";
import { getSiteContent } from "@/lib/site-content";

const LEGAL_LINKS = [
  { href: "/mentions-legales", label: "Mentions légales" },
  { href: "/confidentialite", label: "Confidentialité" },
  { href: "/cookies", label: "Cookies" },
  { href: "/cgu", label: "CGU" },
];

export async function PublicFooter() {
  const content = await getSiteContent();

  return (
    <footer className="mx-auto w-full max-w-6xl px-8 py-12">
      <div className="space-y-6 border-t border-neutral-300 pt-8">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <p className="text-lg" style={{ fontFamily: "var(--font-serif)" }}>
            {content.studioName}
          </p>

          <nav className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs uppercase tracking-[0.15em] text-neutral-500">
            {LEGAL_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="transition hover:text-neutral-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-col items-start justify-between gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500 md:flex-row md:items-center">
          <p>© {new Date().getFullYear()} — Tous droits réservés</p>
          <p>
            Conçu et développé par{" "}
            <a
              href="https://nocly.fr"
              target="_blank"
              rel="noopener noreferrer"
              className="underline-offset-4 transition hover:text-neutral-900 hover:underline"
            >
              Nocly
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
