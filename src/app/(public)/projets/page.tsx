import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { eq, asc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectPhotos, photos } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projets",
  description: "Séries et projets photographiques.",
};

type ProjectCard = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  photoCount: number;
};

async function getProjects(): Promise<ProjectCard[]> {
  try {
    const rows = await db
      .select({
        id: projects.id,
        slug: projects.slug,
        name: projects.name,
        description: projects.description,
        coverPhotoId: projects.coverPhotoId,
        photoCount: sql<number>`(
          select count(*)::int from ${projectPhotos}
          where ${projectPhotos.projectId} = ${projects.id}
        )`,
      })
      .from(projects)
      .where(eq(projects.visible, true))
      .orderBy(asc(projects.order));

    // Pour chaque projet, on résout l'URL de couverture en JS (plus simple
    // et plus fiable qu'un coalesce SQL complexe avec sous-requête).
    return Promise.all(
      rows.map(async (p) => {
        let coverUrl: string | null = null;

        // 1) Couverture explicite
        if (p.coverPhotoId) {
          const [photo] = await db
            .select({ url: photos.url })
            .from(photos)
            .where(eq(photos.id, p.coverPhotoId))
            .limit(1);
          coverUrl = photo?.url ?? null;
        }

        // 2) Fallback : première photo du projet
        if (!coverUrl) {
          const [first] = await db
            .select({ url: photos.url })
            .from(projectPhotos)
            .innerJoin(photos, eq(photos.id, projectPhotos.photoId))
            .where(eq(projectPhotos.projectId, p.id))
            .orderBy(asc(projectPhotos.order))
            .limit(1);
          coverUrl = first?.url ?? null;
        }

        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          description: p.description,
          coverUrl,
          photoCount: p.photoCount,
        };
      }),
    );
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
