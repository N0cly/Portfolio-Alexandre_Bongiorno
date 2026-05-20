import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { eq, and, asc, desc, sql, or } from "drizzle-orm";
import { getSiteContent } from "@/lib/site-content";
import { slugify } from "@/lib/slug";
import { MarkdownText } from "@/components/MarkdownText";
import { PhotoExif, PhotoMap } from "@/components/PhotoExif";
import { LikeButton } from "@/components/LikeButton";

async function getPhotoBySlug(slug: string) {
  try {
    const rows = await db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.visible, true),
          eq(photos.clientOnly, false),
          or(eq(photos.slug, slug), sql`${photos.id}::text = ${slug}`),
        ),
      )
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function getNeighbours(currentOrder: number, currentId: string) {
  try {
    const [next] = await db
      .select({ slug: photos.slug, id: photos.id, title: photos.title })
      .from(photos)
      .where(
        and(
          eq(photos.visible, true),
          eq(photos.clientOnly, false),
          sql`(${photos.order} > ${currentOrder} or (${photos.order} = ${currentOrder} and ${photos.id}::text > ${currentId}))`,
        ),
      )
      .orderBy(asc(photos.order), asc(photos.id))
      .limit(1);

    const [prev] = await db
      .select({ slug: photos.slug, id: photos.id, title: photos.title })
      .from(photos)
      .where(
        and(
          eq(photos.visible, true),
          eq(photos.clientOnly, false),
          sql`(${photos.order} < ${currentOrder} or (${photos.order} = ${currentOrder} and ${photos.id}::text < ${currentId}))`,
        ),
      )
      .orderBy(desc(photos.order), desc(photos.id))
      .limit(1);

    return { prev, next };
  } catch {
    return { prev: undefined, next: undefined };
  }
}

async function getSimilarPhotos(tags: string[], excludeId: string) {
  if (!tags || tags.length === 0) return [];
  try {
    return await db
      .select()
      .from(photos)
      .where(
        and(
          eq(photos.visible, true),
          eq(photos.clientOnly, false),
          sql`${photos.tags} && ${tags}::text[]`,
          sql`${photos.id}::text <> ${excludeId}`,
        ),
      )
      .orderBy(asc(photos.order), desc(photos.createdAt))
      .limit(3);
  } catch {
    return [];
  }
}

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000")
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const photo = await getPhotoBySlug(slug);
  if (!photo) return { title: "Photo introuvable" };

  const title = photo.title ?? photo.alt ?? "Photo";
  const description =
    photo.caption ?? photo.alt ?? `Photo de la collection.`;
  const base = getBaseUrl();
  const canonicalSlug = photo.slug ?? photo.id;

  return {
    title,
    description,
    alternates: {
      canonical: `${base}/photo/${canonicalSlug}`,
    },
    openGraph: {
      title,
      description,
      type: "article",
      url: `${base}/photo/${canonicalSlug}`,
      images: [
        {
          url: photo.url,
          alt: photo.alt ?? title,
          width: photo.width ?? 1600,
          height: photo.height ?? 1200,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [photo.url],
    },
  };
}

export default async function PhotoPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const photo = await getPhotoBySlug(slug);
  if (!photo) notFound();

  const photoTags = photo.tags ?? [];
  const [{ prev, next }, similar, content] = await Promise.all([
    getNeighbours(photo.order, photo.id),
    getSimilarPhotos(photoTags, photo.id),
    getSiteContent(),
  ]);

  const title = photo.title ?? photo.alt ?? "Sans titre";
  const base = getBaseUrl();
  const canonicalSlug = photo.slug ?? photo.id;

  const imageJsonLd = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    contentUrl: photo.url,
    url: `${base}/photo/${canonicalSlug}`,
    name: title,
    description: photo.alt ?? title,
    width: photo.width ?? undefined,
    height: photo.height ?? undefined,
    keywords: photoTags.length > 0 ? photoTags.join(", ") : undefined,
    creator: {
      "@type": "Person",
      name: content.studioName,
    },
    uploadDate: photo.createdAt.toISOString(),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Accueil",
        item: base,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Galerie",
        item: `${base}/gallery`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: title,
        item: `${base}/photo/${canonicalSlug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(imageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <main className="mx-auto max-w-6xl px-8 py-12">
        {/* Breadcrumb */}
        <nav
          className="mb-8 flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-neutral-500"
          aria-label="Breadcrumb"
        >
          <Link href="/gallery" className="hover:text-neutral-900 transition">
            Galerie
          </Link>
          <span className="text-neutral-300">/</span>
          <span className="text-neutral-700">{title}</span>
        </nav>

        {/* Photo */}
        <figure className="mb-12">
          <div
            className="relative w-full overflow-hidden bg-neutral-100"
            style={{
              aspectRatio:
                photo.width && photo.height
                  ? `${photo.width} / ${photo.height}`
                  : "4 / 3",
              transform: photo.rotation
                ? `rotate(${photo.rotation}deg)`
                : undefined,
            }}
          >
            <Image
              src={photo.url}
              alt={photo.alt ?? title}
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 1024px"
              style={{
                objectFit:
                  (photo.objectFit as "cover" | "contain") ?? "contain",
              }}
            />
          </div>
          <figcaption className="mt-6 space-y-3">
            <div className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
              <h1
                className="text-3xl font-light tracking-tight md:text-4xl"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {title}
              </h1>
            </div>
            {photoTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {photoTags.map((t) => (
                  <Link
                    key={t}
                    href={`/gallery/${slugify(t)}`}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-xs uppercase tracking-[0.2em] text-neutral-600 hover:border-neutral-900 hover:text-neutral-900 transition"
                  >
                    {t}
                  </Link>
                ))}
              </div>
            )}
            {photo.caption && (
              <p
                className="max-w-2xl text-base italic text-neutral-600"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {photo.caption}
              </p>
            )}
          </figcaption>
        </figure>

        {/* Bouton like */}
        <div className="mb-12 flex items-center justify-end">
          <LikeButton
            photoId={photo.id}
            initialCount={photo.likesCount ?? 0}
          />
        </div>

        {/* Description longue + métadonnées */}
        {(photo.description ||
          photo.takenAt ||
          (photo.infoFields && photo.infoFields.length > 0) ||
          photo.exif) && (
          <section className="mb-16 grid gap-12 border-t border-neutral-300 pt-12 md:grid-cols-3">
            {photo.description && (
              <div className="md:col-span-2">
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
                  À propos de cette photo
                </p>
                <div
                  className="space-y-4 text-base leading-relaxed text-neutral-700"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  <MarkdownText>{photo.description}</MarkdownText>
                </div>
              </div>
            )}

            {(photo.takenAt ||
              (photo.infoFields && photo.infoFields.length > 0) ||
              photo.exif) && (
              <aside className="space-y-5">
                {photo.takenAt && (
                  <div>
                    <p className="mb-1 text-xs uppercase tracking-[0.3em] text-neutral-500">
                      Date
                    </p>
                    <p
                      className="text-base text-neutral-700"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {new Date(photo.takenAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                )}
                {photo.infoFields &&
                  photo.infoFields.map((field, i) => (
                    <div key={i}>
                      <p className="mb-1 text-xs uppercase tracking-[0.3em] text-neutral-500">
                        {field.label}
                      </p>
                      {field.url ? (
                        <a
                          href={field.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-baseline gap-1 text-base text-neutral-900 underline-offset-4 transition hover:underline"
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          {field.value}
                          <span className="text-xs text-neutral-400">↗</span>
                        </a>
                      ) : (
                        <p
                          className="text-base text-neutral-700"
                          style={{ fontFamily: "var(--font-serif)" }}
                        >
                          {field.value}
                        </p>
                      )}
                    </div>
                  ))}
                <PhotoExif exif={photo.exif as never} />
                <PhotoMap gps={photo.exif?.gps ?? null} />
              </aside>
            )}
          </section>
        )}

        {/* Prev / Next */}
        {(prev || next) && (
          <nav className="mb-16 flex items-center justify-between border-t border-neutral-300 pt-6">
            {prev ? (
              <Link
                href={`/photo/${prev.slug ?? prev.id}`}
                className="group flex max-w-[45%] flex-col gap-1 text-left"
              >
                <span className="text-xs uppercase tracking-[0.2em] text-neutral-500 transition group-hover:text-neutral-900">
                  ← Précédente
                </span>
                <span className="truncate text-sm italic text-neutral-700">
                  {prev.title ?? "Photo précédente"}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next ? (
              <Link
                href={`/photo/${next.slug ?? next.id}`}
                className="group flex max-w-[45%] flex-col gap-1 text-right"
              >
                <span className="text-xs uppercase tracking-[0.2em] text-neutral-500 transition group-hover:text-neutral-900">
                  Suivante →
                </span>
                <span className="truncate text-sm italic text-neutral-700">
                  {next.title ?? "Photo suivante"}
                </span>
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}

        {/* Similaires */}
        {similar.length > 0 && (
          <section className="border-t border-neutral-300 pt-12">
            <h2
              className="mb-8 text-2xl font-light"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              Photos similaires
            </h2>
            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
              {similar.map((p) => (
                <Link
                  key={p.id}
                  href={`/photo/${p.slug ?? p.id}`}
                  className="group block"
                >
                  <div className="relative aspect-[4/5] w-full overflow-hidden bg-neutral-100">
                    <Image
                      src={p.url}
                      alt={p.alt ?? p.title ?? ""}
                      fill
                      sizes="(max-width: 768px) 100vw, 33vw"
                      className="object-cover transition duration-700 group-hover:scale-[1.03]"
                    />
                  </div>
                  {(p.title || p.alt) && (
                    <p
                      className="mt-3 text-sm italic text-neutral-500"
                      style={{ fontFamily: "var(--font-serif)" }}
                    >
                      {p.title ?? p.alt}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </>
  );
}
