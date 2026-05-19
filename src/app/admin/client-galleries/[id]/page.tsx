import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc, desc, sql, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { clientGalleries, clientGalleryPhotos, photos } from "@/lib/db/schema";
import { ClientGalleryEditor } from "@/components/admin/ClientGalleryEditor";

export const dynamic = "force-dynamic";

async function getGallery(id: string) {
  try {
    const rows = await db
      .select()
      .from(clientGalleries)
      .where(eq(clientGalleries.id, id))
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
        order: clientGalleryPhotos.order,
      })
      .from(clientGalleryPhotos)
      .innerJoin(photos, eq(photos.id, clientGalleryPhotos.photoId))
      .where(eq(clientGalleryPhotos.galleryId, galleryId))
      .orderBy(asc(clientGalleryPhotos.order));
  } catch {
    return [];
  }
}

async function getAvailablePhotos(galleryId: string) {
  try {
    const inGallery = await db
      .select({ photoId: clientGalleryPhotos.photoId })
      .from(clientGalleryPhotos)
      .where(eq(clientGalleryPhotos.galleryId, galleryId));
    const excludeIds = inGallery.map((r) => r.photoId);

    const query = db
      .select({
        id: photos.id,
        url: photos.url,
        title: photos.title,
        alt: photos.alt,
      })
      .from(photos)
      .orderBy(desc(photos.createdAt))
      .limit(200);

    if (excludeIds.length > 0) {
      return await query.where(notInArray(photos.id, excludeIds));
    }
    return await query;
  } catch {
    return [];
  }
}

export default async function ClientGalleryEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const gallery = await getGallery(id);
  if (!gallery) notFound();

  const [selected, available] = await Promise.all([
    getGalleryPhotos(gallery.id),
    getAvailablePhotos(gallery.id),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href="/admin/client-galleries"
          className="text-xs uppercase tracking-[0.2em] text-neutral-500 hover:text-neutral-900 transition"
        >
          ← Toutes les galeries
        </Link>
        <h1 className="text-3xl font-light">{gallery.name}</h1>
        <p className="font-mono text-xs text-neutral-500">
          /client/{gallery.slug}
        </p>
      </header>

      <ClientGalleryEditor
        gallery={{
          id: gallery.id,
          name: gallery.name,
          slug: gallery.slug,
          description: gallery.description,
          expiresAt: gallery.expiresAt
            ? new Date(gallery.expiresAt).toISOString().slice(0, 10)
            : null,
          viewCount: gallery.viewCount,
          lastViewedAt: gallery.lastViewedAt
            ? new Date(gallery.lastViewedAt).toISOString()
            : null,
        }}
        selectedPhotos={selected}
        availablePhotos={available}
      />
    </div>
  );
}

// dummy reference to keep import
void sql;
