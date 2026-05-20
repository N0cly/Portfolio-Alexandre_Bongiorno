import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectPhotos, photos } from "@/lib/db/schema";

export const metadata: Metadata = {
  title: "Projets",
  description: "Séries et projets photographiques.",
};

async function getProjects() {
  try {
    return await db
      .select({
        id: projects.id,
        slug: projects.slug,
        name: projects.name,
        description: projects.description,
        coverPhotoId: projects.coverPhotoId,
        coverUrl: sql<string | null>`(
          select ${photos.url} from ${photos}
          where ${photos.id} = coalesce(
            ${projects.coverPhotoId},
            (select ${projectPhotos.photoId} from ${projectPhotos}
              where ${projectPhotos.projectId} = ${projects.id}
              order by ${projectPhotos.order} asc limit 1)
          )
          limit 1
        )`,
        photoCount: sql<number>`(
          select count(*)::int from ${projectPhotos}
          where ${projectPhotos.projectId} = ${projects.id}
        )`,
      })
      .from(projects)
      .where(eq(projects.visible, true))
      .orderBy(asc(projects.order));
  } catch {
    return [];
  }
}

export default async function ProjectsPage() {
  const list = await getProjects();

  return (
    <main className="mx-auto max-w-6xl px-8 py-16">
      <header className="mb-12 border-b border-neutral-300 pb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
          Travail au long cours
        </p>
        <h1
          className="text-5xl font-light tracking-tight md:text-6xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          Projets
        </h1>
      </header>

      {list.length === 0 ? (
        <p className="py-24 text-center text-neutral-500">
          Aucun projet publié pour l'instant.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2">
          {list.map((p) => (
            <Link
              key={p.id}
              href={`/projets/${p.slug}`}
              className="group block"
            >
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-neutral-100">
                {p.coverUrl ? (
                  <Image
                    src={p.coverUrl}
                    alt={p.name}
                    fill
                    sizes="(max-width: 768px) 100vw, 50vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-neutral-400">
                    Aucune photo
                  </div>
                )}
              </div>
              <div className="mt-6 flex items-baseline justify-between gap-4">
                <h2
                  className="text-2xl font-light"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {p.name}
                </h2>
                <span className="text-xs uppercase tracking-[0.2em] text-neutral-500">
                  {p.photoCount} {p.photoCount > 1 ? "photos" : "photo"}
                </span>
              </div>
              {p.description && (
                <p className="mt-2 text-sm text-neutral-600 line-clamp-2">
                  {p.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
