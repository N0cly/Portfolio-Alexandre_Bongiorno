import Link from "next/link";
import type { Metadata } from "next";
import { getSiteContent } from "@/lib/site-content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: content.about.title,
    description: content.about.bio.slice(0, 160),
  };
}

export default async function AboutPage() {
  const content = await getSiteContent();
  const bioParagraphs = content.about.bio
    .split(/\n\s*\n/)
    .filter((p) => p.trim().length > 0);

  const sections = (content.about.sections ?? [])
    .map((s) => ({
      title: s.title.trim(),
      items: s.items
        .split("\n")
        .map((item) => item.trim())
        .filter((item) => item.length > 0),
    }))
    .filter((s) => s.title.length > 0);

  // Si une seule section, on l'affiche en pleine largeur
  // Si 2+, on les met en grille (2 colonnes max sur desktop)
  const gridCols =
    sections.length === 1
      ? "grid-cols-1"
      : sections.length === 2
        ? "md:grid-cols-2"
        : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <main className="mx-auto max-w-3xl px-8 py-24">
      <header className="mb-16 border-b border-neutral-300 pb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
          {content.about.eyebrow}
        </p>
        <h1
          className="text-5xl font-light tracking-tight md:text-6xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {content.about.title}
        </h1>
      </header>

      <article
        className="space-y-6 text-lg leading-relaxed text-neutral-700"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {bioParagraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </article>

      {sections.length > 0 && (
        <section
          className={`mt-16 grid gap-12 border-t border-neutral-300 pt-12 ${gridCols}`}
        >
          {sections.map((s, i) => (
            <div key={i}>
              <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
                {s.title}
              </p>
              {s.items.length > 0 ? (
                <ul
                  className="space-y-1 text-base text-neutral-700"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {s.items.map((item, j) => (
                    <li key={j}>{item}</li>
                  ))}
                </ul>
              ) : (
                <p
                  className="text-base italic text-neutral-400"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  Aucun élément
                </p>
              )}
            </div>
          ))}
        </section>
      )}

      <div className="mt-16 border-t border-neutral-300 pt-8">
        <Link
          href="/contact"
          className="inline-block text-xs uppercase tracking-[0.2em] text-neutral-600 hover:text-neutral-900 transition"
        >
          Me contacter →
        </Link>
      </div>
    </main>
  );
}
