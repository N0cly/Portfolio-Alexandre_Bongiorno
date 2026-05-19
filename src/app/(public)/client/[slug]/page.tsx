import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { clientGalleries, clientGalleryPhotos, photos } from "@/lib/db/schema";
import { hasClientGalleryAccess } from "@/lib/client-gallery-auth";
import { ClientGalleryLogin } from "@/components/client/ClientGalleryLogin";
import { ClientGalleryGrid } from "@/components/client/ClientGalleryGrid";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

async function getGalleryBySlug(slug: string) {
  try {
    const rows = await db
      .select()
      .from(clientGalleries)
      .where(eq(clientGalleries.slug, slug))
      .limit(1);
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

async function getGalleryPhotos(galleryId: string) {
  try {
    return await db
      .select({
        id: photos.id,
        url: photos.url,
        title: photos.title,
        alt: photos.alt,
        width: photos.width,
        height: photos.height,
      })
      .from(clientGalleryPhotos)
      .innerJoin(photos, eq(photos.id, clientGalleryPhotos.photoId))
      .where(eq(clientGalleryPhotos.galleryId, galleryId))
      .orderBy(asc(clientGalleryPhotos.order));
  } catch {
    return [];
  }
}

export default async function ClientGalleryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) notFound();

  const expired = gallery.expiresAt && new Date(gallery.expiresAt) < new Date();
  const hasAccess = !expired && (await hasClientGalleryAccess(gallery.id));

  // ── État NON authentifié : écran de login ───────────────────────────
  if (!hasAccess) {
    return (
      <main className="mx-auto flex min-h-[80vh] max-w-sm flex-col items-center justify-center px-6 py-16">
        <header className="mb-8 text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
            Galerie privée
          </p>
          <h1
            className="mt-3 text-4xl font-light tracking-tight"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {gallery.name}
          </h1>
        </header>

        {expired ? (
          <p className="rounded-lg bg-red-50 px-4 py-3 text-center text-sm text-red-700">
            Cette galerie a expiré.
            <br />
            Contacte le photographe pour un nouveau lien.
          </p>
        ) : (
          <ClientGalleryLogin slug={slug} />
        )}
      </main>
    );
  }

  // ── État authentifié : galerie complète ─────────────────────────────
  const galleryPhotos = await getGalleryPhotos(gallery.id);

  return (
    <main className="mx-auto max-w-6xl px-8 py-16">
      <header className="mb-12 flex items-end justify-between border-b border-neutral-300 pb-8">
        <div>
          <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
            Galerie privée
          </p>
          <h1
            className="text-5xl font-light tracking-tight md:text-6xl"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {gallery.name}
          </h1>
        </div>
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          {galleryPhotos.length} {galleryPhotos.length > 1 ? "photos" : "photo"}
        </p>
      </header>

      {gallery.description && (
        <p
          className="mb-12 max-w-2xl text-lg italic text-neutral-600"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {gallery.description}
        </p>
      )}

      {galleryPhotos.length === 0 ? (
        <p className="py-24 text-center text-sm text-neutral-500">
          Aucune photo dans cette galerie pour l'instant.
        </p>
      ) : (
        <ClientGalleryGrid photos={galleryPhotos} />
      )}
    </main>
  );
}
