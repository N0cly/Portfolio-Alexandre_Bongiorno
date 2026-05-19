import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { eq, and, desc, asc, count, inArray, ne } from "drizzle-orm";
import { getSiteContent } from "@/lib/site-content";

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  const description = content.intro.text;
  return {
    description,
    openGraph: {
      title: content.studioName,
      description,
    },
  };
}

async function getHomepageData() {
  try {
    // Hero : la photo la plus récente avec placement='hero'
    const heroRows = await db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.visible, true),
          eq(photos.clientOnly, false),
          eq(photos.placement, "hero"),
        ),
      )
      .orderBy(asc(photos.featuredOrder), desc(photos.createdAt))
      .limit(1);

    const hero = heroRows[0];

    // Featured : photos avec placement IN ('hero', 'featured'), sauf la hero
    // Ordonnées par leur featuredOrder (indépendant de l'ordre galerie)
    const featuredRows = await db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.visible, true),
          eq(photos.clientOnly, false),
          inArray(photos.placement, ["hero", "featured"]),
          hero ? ne(photos.id, hero.id) : undefined,
        ),
      )
      .orderBy(asc(photos.featuredOrder), desc(photos.createdAt))
      .limit(6);

    // Fallback : si pas de hero explicite, prendre la première visible
    let finalHero = hero;
    if (!finalHero) {
      const fallback = await db
        .select()
        .from(photos)
        .where(and(eq(photos.visible, true), eq(photos.clientOnly, false)))
        .orderBy(asc(photos.order), desc(photos.createdAt))
        .limit(1);
      finalHero = fallback[0];
    }

    const [{ total }] = await db
      .select({ total: count() })
      .from(photos)
      .where(and(eq(photos.visible, true), eq(photos.clientOnly, false)));

    return { hero: finalHero, featured: featuredRows, total };
  } catch {
    return { hero: undefined, featured: [], total: 0 };
  }
}

const offsets = [false, true, false, false, true, false];

export default async function HomePage() {
  const [{ hero, featured, total }, content] = await Promise.all([
    getHomepageData(),
    getSiteContent(),
  ]);

  const personJsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: content.studioName,
    description: content.intro.text,
    jobTitle: "Photographe",
    email: content.contact.email,
  };

  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(personJsonLd) }}
      />
      {/* HERO — full screen cinematic */}
      <section className="relative h-screen w-full overflow-hidden">
        {hero ? (
          <>
            <Image
              src={hero.url}
              alt={hero.alt ?? hero.title ?? "Photo en vedette"}
              fill
              priority
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/10 via-transparent to-black/50" />

            <div className="absolute inset-x-8 bottom-12 flex items-end justify-between text-white md:inset-x-16">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">
                  {content.hero.eyebrow}
                </p>
                <h1
                  className="mt-4 text-6xl font-light leading-[0.95] tracking-tight md:text-8xl"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {content.hero.titleLine1}
                  <br />
                  <em className="italic">{content.hero.titleLine2}</em>
                </h1>
              </div>

              <div className="hidden flex-col items-end gap-2 text-xs uppercase tracking-[0.3em] text-white/70 md:flex">
                <span>01 / {String(total).padStart(2, "0")}</span>
                <span className="text-[10px]">↓ scroll</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-neutral-200 px-6 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              {content.studioName}
            </p>
            <h1
              className="mt-4 text-6xl font-light tracking-tight md:text-8xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              En préparation
            </h1>
            <p className="mt-6 max-w-md text-sm text-neutral-600">
              Ajoute des photos depuis l'espace admin pour voir le site prendre
              forme.
            </p>
            <Link
              href="/admin"
              className="mt-8 border border-neutral-900 px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-neutral-900 hover:text-white transition"
            >
              Espace admin
            </Link>
          </div>
        )}
      </section>

      {/* INTRO — editorial */}
      <section className="mx-auto max-w-6xl px-8 pt-32 pb-24">
        <div className="grid items-end gap-12 md:grid-cols-12">
          <div className="md:col-span-7">
            <p className="mb-6 text-xs uppercase tracking-[0.3em] text-neutral-500">
              {content.intro.label}
            </p>
            <p
              className="text-3xl font-light leading-snug md:text-4xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {content.intro.text}
            </p>
          </div>
          <div className="md:col-span-4 md:col-start-9">
            <Link
              href="/about"
              className="inline-block text-xs uppercase tracking-[0.2em] text-neutral-600 hover:text-neutral-900 transition"
            >
              En savoir plus →
            </Link>
          </div>
        </div>
      </section>

      {/* SELECTION — editorial grid with offsets */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-8 pb-32">
          <div className="mb-16 flex items-end justify-between border-t border-neutral-300 pt-6">
            <h2
              className="text-3xl font-light"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {content.selection.title}
            </h2>
            <Link
              href="/gallery"
              className="text-xs uppercase tracking-[0.2em] text-neutral-500 transition hover:text-neutral-900"
            >
              {content.selection.cta}
            </Link>
          </div>

          <div className="grid grid-cols-1 gap-x-8 gap-y-16 md:grid-cols-3">
            {featured.map((photo, i) => (
              <Link
                key={photo.id}
                href="/gallery"
                className={`group block ${offsets[i] ? "md:mt-16" : ""}`}
              >
                <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
                  <Image
                    src={photo.url}
                    alt={photo.alt ?? photo.title ?? ""}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                {(photo.title || photo.alt) && (
                  <p
                    className="mt-4 text-sm italic text-neutral-500"
                    style={{ fontFamily: "var(--font-serif)" }}
                  >
                    {photo.title ?? photo.alt}
                  </p>
                )}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* CITATION */}
      <section className="border-t border-neutral-300 bg-white">
        <div className="mx-auto max-w-3xl px-8 py-32 text-center">
          <p
            className="text-3xl font-light leading-tight text-neutral-700 md:text-4xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            « {content.quote.text} »
          </p>
          <p className="mt-8 text-xs uppercase tracking-[0.3em] text-neutral-400">
            — {content.quote.author}
          </p>
        </div>
      </section>
    </main>
  );
}
