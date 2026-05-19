import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { clientGalleries, clientGalleryPhotos } from "@/lib/db/schema";
import { ClientGalleryCreateForm } from "@/components/admin/ClientGalleryCreateForm";

export const dynamic = "force-dynamic";

async function getGalleries() {
  try {
    return await db
      .select({
        id: clientGalleries.id,
        name: clientGalleries.name,
        slug: clientGalleries.slug,
        description: clientGalleries.description,
        expiresAt: clientGalleries.expiresAt,
        viewCount: clientGalleries.viewCount,
        lastViewedAt: clientGalleries.lastViewedAt,
        createdAt: clientGalleries.createdAt,
        photoCount: sql<number>`(
          select count(*)::int from ${clientGalleryPhotos}
          where ${clientGalleryPhotos.galleryId} = ${clientGalleries.id}
        )`,
      })
      .from(clientGalleries)
      .orderBy(desc(clientGalleries.createdAt));
  } catch {
    return [];
  }
}

function formatDate(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default async function ClientGalleriesPage() {
  const galleries = await getGalleries();
  const now = new Date();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-light">Galeries clients</h1>
        <p className="text-sm text-neutral-500">
          Crée des galeries privées protégées par mot de passe pour livrer un
          shooting à un client.
        </p>
      </header>

      <ClientGalleryCreateForm />

      {galleries.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center text-sm text-neutral-500">
          Aucune galerie cliente pour l'instant.
        </p>
      ) : (
        <div className="space-y-3">
          {galleries.map((g) => {
            const expired = g.expiresAt && new Date(g.expiresAt) < now;
            return (
              <Link
                key={g.id}
                href={`/admin/client-galleries/${g.id}`}
                className="block rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-900"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-medium text-neutral-900">
                        {g.name}
                      </h2>
                      {expired && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">
                          Expirée
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate font-mono text-xs text-neutral-500">
                      /client/{g.slug}
                    </p>
                    {g.description && (
                      <p className="mt-2 truncate text-sm text-neutral-600">
                        {g.description}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                      {g.photoCount} photo{g.photoCount > 1 ? "s" : ""}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {g.viewCount} vue{g.viewCount > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-4 border-t border-neutral-100 pt-3 text-xs text-neutral-500">
                  <span>Créée : {formatDate(g.createdAt)}</span>
                  <span>Expire : {formatDate(g.expiresAt)}</span>
                  <span>Dernière vue : {formatDate(g.lastViewedAt)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
