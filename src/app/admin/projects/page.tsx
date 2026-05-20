import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectPhotos } from "@/lib/db/schema";
import { ProjectCreateForm } from "@/components/admin/ProjectCreateForm";

export const dynamic = "force-dynamic";

async function getProjects() {
  try {
    return await db
      .select({
        id: projects.id,
        name: projects.name,
        slug: projects.slug,
        description: projects.description,
        visible: projects.visible,
        createdAt: projects.createdAt,
        photoCount: sql<number>`(
          select count(*)::int from ${projectPhotos}
          where ${projectPhotos.projectId} = ${projects.id}
        )`,
      })
      .from(projects)
      .orderBy(desc(projects.createdAt));
  } catch {
    return [];
  }
}

export default async function ProjectsAdminPage() {
  const list = await getProjects();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-light">Projets / Séries</h1>
        <p className="text-sm text-neutral-500">
          Regroupe plusieurs photos sous un même projet (mariage, série
          documentaire, voyage…). Accessible publiquement sur /projets/[slug].
        </p>
      </header>

      <ProjectCreateForm />

      {list.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center text-sm text-neutral-500">
          Aucun projet pour l'instant.
        </p>
      ) : (
        <div className="space-y-3">
          {list.map((p) => (
            <Link
              key={p.id}
              href={`/admin/projects/${p.id}`}
              className="block rounded-2xl border border-neutral-200 bg-white p-5 transition hover:border-neutral-900"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-medium text-neutral-900">
                      {p.name}
                    </h2>
                    {!p.visible && (
                      <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">
                        Masqué
                      </span>
                    )}
                  </div>
                  <p className="mt-0.5 truncate font-mono text-xs text-neutral-500">
                    /projets/{p.slug}
                  </p>
                  {p.description && (
                    <p className="mt-2 truncate text-sm text-neutral-600">
                      {p.description}
                    </p>
                  )}
                </div>
                <p className="shrink-0 text-xs uppercase tracking-[0.2em] text-neutral-500">
                  {p.photoCount} photo{p.photoCount > 1 ? "s" : ""}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
