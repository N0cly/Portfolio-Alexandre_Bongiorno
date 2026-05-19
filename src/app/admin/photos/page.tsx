import Link from "next/link";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { PhotosManager } from "@/components/admin/PhotosManager";
import { getAllAdminTags } from "@/lib/tags";

type View = "all" | "selection";

async function getPhotos(view: View) {
  try {
    if (view === "selection") {
      const rows = await db
        .select()
        .from(photos)
        .where(
          and(
            eq(photos.clientOnly, false),
            inArray(photos.placement, ["hero", "featured"]),
          ),
        )
        .orderBy(
          // 1. Visibles d'abord
          sql`case when ${photos.visible} = true then 0 else 1 end asc`,
          // 2. Hero avant featured
          sql`case ${photos.placement}
                when 'hero' then 0
                when 'featured' then 1
                else 2
              end asc`,
          // 3. Ordre custom pour la sélection
          asc(photos.featuredOrder),
          desc(photos.createdAt),
        );
      return { rows, error: null };
    }

    const rows = await db
      .select()
      .from(photos)
      .where(eq(photos.clientOnly, false))
      .orderBy(
        sql`case when ${photos.visible} = true then 0 else 1 end asc`,
        sql`case ${photos.placement}
              when 'hero' then 0
              when 'featured' then 1
              when 'gallery' then 2
              else 3
            end asc`,
        asc(photos.order),
        desc(photos.createdAt),
      );
    return { rows, error: null };
  } catch (err) {
    return {
      rows: [],
      error: err instanceof Error ? err.message : "DB error",
    };
  }
}

async function getCounts() {
  try {
    const [total] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(photos)
      .where(eq(photos.clientOnly, false));
    const [selection] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(photos)
      .where(
        and(
          eq(photos.clientOnly, false),
          inArray(photos.placement, ["hero", "featured"]),
        ),
      );
    return {
      all: total?.count ?? 0,
      selection: selection?.count ?? 0,
    };
  } catch {
    return { all: 0, selection: 0 };
  }
}

export default async function PhotosAdmin({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view: viewParam } = await searchParams;
  const view: View = viewParam === "selection" ? "selection" : "all";

  const [{ rows, error }, existingTags, counts] = await Promise.all([
    getPhotos(view),
    getAllAdminTags(),
    getCounts(),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-4">
        <div className="flex items-end justify-between">
          <div>
            <h1 className="text-3xl font-light">Photos</h1>
            <p className="text-sm text-neutral-500">
              {view === "selection"
                ? "Ordre des photos de la homepage. Glisse-dépose pour réorganiser la sélection mise en avant."
                : "Toutes tes photos. Glisse-dépose pour réorganiser la galerie."}
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap gap-2">
          <Link
            href="/admin/photos"
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition ${
              view === "all"
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
            }`}
          >
            Galerie · {counts.all}
          </Link>
          <Link
            href="/admin/photos?view=selection"
            className={`rounded-full border px-4 py-1.5 text-xs uppercase tracking-[0.2em] transition ${
              view === "selection"
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
            }`}
          >
            Sélection homepage · {counts.selection}
          </Link>
        </nav>

        {view === "selection" && counts.selection === 0 && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Aucune photo dans la sélection. Va dans <b>Galerie</b>, édite une
            photo et choisis « Photo hero » ou « Sélection homepage » comme
            position.
          </p>
        )}
      </header>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          BDD non accessible : {error}
        </div>
      )}

      <PhotosManager
        existingTags={existingTags}
        context={view === "selection" ? "selection" : "gallery"}
        photos={rows.map((r) => ({
          id: r.id,
          url: r.url,
          title: r.title,
          alt: r.alt,
          slug: r.slug,
          category: r.category,
          tags: r.tags ?? [],
          placement: r.placement,
          displayWidth: r.displayWidth,
          displayHeight: r.displayHeight,
          rotation: r.rotation,
          objectFit: r.objectFit,
          visible: r.visible,
          fileSize: r.fileSize,
          createdAt: r.createdAt,
        }))}
      />
    </div>
  );
}

// Suppress unused import warning
void eq;
