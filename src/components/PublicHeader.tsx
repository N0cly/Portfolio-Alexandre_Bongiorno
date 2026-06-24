import Link from "next/link";
import { db } from "@/lib/db";
import { links, projects } from "@/lib/db/schema";
import { eq, asc, sql } from "drizzle-orm";
import { getSiteContent } from "@/lib/site-content";
import { MobileNav } from "./MobileNav";

async function getLinks() {
  try {
    return await db
      .select()
      .from(links)
      .where(eq(links.visible, true))
      .orderBy(asc(links.order));
  } catch {
    return [];
  }
}

async function hasVisibleProjects(): Promise<boolean> {
  try {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(projects)
      .where(eq(projects.visible, true));
    return (count ?? 0) > 0;
  } catch {
    return false;
  }
}

export async function PublicHeader() {
  const [externalLinks, content, showProjects] = await Promise.all([
    getLinks(),
    getSiteContent(),
    hasVisibleProjects(),
  ]);

  const allLinks = [
    { href: "/gallery", label: "Galerie" },
    ...(showProjects ? [{ href: "/projets", label: "Projets" }] : []),
    { href: "/contact", label: "Contact" },
    ...externalLinks.map((l) => ({
      href: l.url,
      label: l.label,
      external: true,
      id: l.id,
    })),
    { href: "/about", label: "À propos" }
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-40 border-b border-neutral-200 bg-[#fafaf8]/85 backdrop-blur">
      <div className="flex w-full items-center justify-between px-6 py-5 md:px-10 md:py-6">
        <Link
          href="/"
          className="text-xl tracking-tight transition hover:opacity-70 md:text-2xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {content.studioName}
        </Link>

        {/* Desktop nav — visible >= md, à droite via justify-between sur le parent */}
        <nav
          className="hidden items-center gap-8 text-xs uppercase text-neutral-600 md:flex"
          style={{ letterSpacing: "0.2em" }}
        >
          <Link href="/gallery" className="hover:text-neutral-900 transition">
            Galerie
          </Link>
          {showProjects && (
            <Link
              href="/projets"
              className="hover:text-neutral-900 transition"
            >
              Projets
            </Link>
          )}
          <Link href="/contact" className="hover:text-neutral-900 transition">
            Contact
          </Link>
          {externalLinks.map((link) => (
            <a
              key={link.id}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-neutral-900 transition"
              data-track-link={link.id}
            >
              {link.label}
            </a>
          ))}
          <Link href="/about" className="hover:text-neutral-900 transition">
            À propos
          </Link>
        </nav>

        {/* Mobile nav — visible < md uniquement */}
        <MobileNav links={allLinks} />
      </div>
    </header>
  );
}
