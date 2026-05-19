import { notFound } from "next/navigation";
import Image from "next/image";
import { eq, asc } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { clientGalleries, clientGalleryPhotos, photos } from "@/lib/db/schema";
import { hasClientGalleryAccess } from "@/lib/client-gallery-auth";
import { ClientGalleryLogin } from "@/components/client/ClientGalleryLogin";

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

  if (!hasAccess) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-[#fafaf8] px-6 py-12 text-neutral-900">
        <div className="w-full max-w-sm">
          <header className="mb-8 text-center">
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              Galerie privée
            </p>
            <h1
              className="mt-3 text-4xl font-light tracking-tight"
              style={{
                fontFamily:
                  "ui-serif, 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
              }}
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
        </div>
      </main>
    );
  }

  const galleryPhotos = await getGalleryPhotos(gallery.id);

  return (
    <main className="min-h-screen bg-[#fafaf8] text-neutral-900">
      <header className="border-b border-neutral-200 bg-[#fafaf8]/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-6">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
              Galerie privée
            </p>
            <h1
              className="mt-1 text-2xl font-light tracking-tight"
              style={{
                fontFamily:
                  "ui-serif, 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
              }}
            >
              {gallery.name}
            </h1>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
            {galleryPhotos.length} photo{galleryPhotos.length > 1 ? "s" : ""}
          </p>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-8 py-12">
        {gallery.description && (
          <p
            className="mb-12 max-w-2xl text-lg italic text-neutral-600"
            style={{
              fontFamily:
                "ui-serif, 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
            }}
          >
            {gallery.description}
          </p>
        )}

        {galleryPhotos.length === 0 ? (
          <p className="py-24 text-center text-sm text-neutral-500">
            Aucune photo dans cette galerie pour l'instant.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {galleryPhotos.map((photo) => (
              <figure
                key={photo.id}
                className="group relative overflow-hidden bg-neutral-100"
              >
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src={photo.url}
                    alt={photo.alt ?? ""}
                    fill
                    sizes="(max-width: 768px) 100vw, 33vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                </div>
                <a
                  href={photo.url}
                  download
                  target="_blank"
                  rel="noopener noreferrer"
                  className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 hover:bg-white transition"
                >
                  ↓ Télécharger
                </a>
                {photo.title && (
                  <figcaption
                    className="mt-3 text-sm italic text-neutral-500"
                    style={{
                      fontFamily:
                        "ui-serif, 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
                    }}
                  >
                    {photo.title}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
