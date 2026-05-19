import Link from "next/link";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { eq, asc, desc } from "drizzle-orm";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { getAllTags } from "@/lib/tags";

export const metadata: Metadata = {
  title: "Galerie",
  description:
    "Archive complète des photographies. Toutes les sections du portfolio.",
};

async function getPhotos() {
  try {
    return await db
      .select()
      .from(photos)
      .where(eq(photos.visible, true))
      .orderBy(asc(photos.order), desc(photos.createdAt));
  } catch {
    return [];
  }
}

export default async function GalleryPage() {
  const [list, tags] = await Promise.all([getPhotos(), getAllTags()]);

  return (
    <main className="mx-auto max-w-6xl px-8 py-16">
      <header className="mb-12 border-b border-neutral-300 pb-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
              Archive
            </p>
            <h1
              className="text-5xl font-light tracking-tight md:text-6xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Galerie
            </h1>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            {list.length} {list.length > 1 ? "photos" : "photo"}
          </p>
        </div>

        {tags.length > 0 && (
          <nav className="mt-8 flex flex-wrap gap-2">
            <span className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white">
              Tout
            </span>
            {tags.map((t) => (
              <Link
                key={t.slug}
                href={`/gallery/${t.slug}`}
                className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition"
              >
                {t.name} · {t.count}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {list.length === 0 ? (
        <p className="py-24 text-center text-neutral-500">
          Aucune photo pour l'instant.
        </p>
      ) : (
        <GalleryGrid
          photos={list.map((p) => ({
            id: p.id,
            url: p.url,
            title: p.title,
            alt: p.alt,
            slug: p.slug,
            width: p.width,
            height: p.height,
            displayWidth: p.displayWidth,
            displayHeight: p.displayHeight,
            rotation: p.rotation,
            objectFit: p.objectFit,
          }))}
        />
      )}
    </main>
  );
}
