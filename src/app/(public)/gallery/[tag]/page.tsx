import { notFound } from "next/navigation";
import Link from "next/link";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { and, eq, asc, desc, sql } from "drizzle-orm";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";
import { getAllTags, resolveTagBySlug } from "@/lib/tags";
import type { Metadata } from "next";

async function getPhotosForTag(tagName: string) {
  try {
    return await db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.visible, true),
          sql`${tagName} = any(${photos.tags})`,
        ),
      )
      .orderBy(asc(photos.order), desc(photos.createdAt));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tag: string }>;
}): Promise<Metadata> {
  const { tag: slug } = await params;
  const tag = await resolveTagBySlug(slug);
  if (!tag) return { title: "Section introuvable" };
  return {
    title: `${tag.name} · Galerie`,
    description: `${tag.count} photo${tag.count > 1 ? "s" : ""} dans la section ${tag.name}.`,
  };
}

export default async function TagGalleryPage({
  params,
}: {
  params: Promise<{ tag: string }>;
}) {
  const { tag: slug } = await params;
  const tag = await resolveTagBySlug(slug);
  if (!tag) notFound();

  const [list, allTags] = await Promise.all([
    getPhotosForTag(tag.name),
    getAllTags(),
  ]);

  return (
    <main className="mx-auto max-w-6xl px-8 py-16">
      <header className="mb-12 border-b border-neutral-300 pb-8">
        <div className="flex items-end justify-between">
          <div>
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
              Section
            </p>
            <h1
              className="text-5xl font-light tracking-tight md:text-6xl"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {tag.name}
            </h1>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            {list.length} {list.length > 1 ? "photos" : "photo"}
          </p>
        </div>

        <nav className="mt-8 flex flex-wrap gap-2">
          <Link
            href="/gallery"
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-neutral-700 hover:border-neutral-900 hover:text-neutral-900 transition"
          >
            Tout
          </Link>
          {allTags.map((t) => (
            <Link
              key={t.slug}
              href={`/gallery/${t.slug}`}
              className={`rounded-full px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition ${
                t.slug === slug
                  ? "bg-neutral-900 text-white"
                  : "border border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
              }`}
            >
              {t.name} · {t.count}
            </Link>
          ))}
        </nav>
      </header>

      {list.length === 0 ? (
        <p className="py-24 text-center text-neutral-500">
          Aucune photo dans cette section.
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

export async function generateStaticParams() {
  const tags = await getAllTags();
  return tags.map((t) => ({ tag: t.slug }));
}
