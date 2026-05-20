import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc, desc, notInArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectPhotos, photos } from "@/lib/db/schema";
import { ProjectEditor } from "@/components/admin/ProjectEditor";

export const dynamic = "force-dynamic";

async function getProject(id: string) {
  try {
    const [row] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);
    return row ?? null;
  } catch {
    return null;
  }
}

async function getProjectPhotos(projectId: string) {
  try {
    return await db
      .select({
        id: photos.id,
        url: photos.url,
        title: photos.title,
        alt: photos.alt,
        order: projectPhotos.order,
      })
      .from(projectPhotos)
      .innerJoin(photos, eq(photos.id, projectPhotos.photoId))
      .where(eq(projectPhotos.projectId, projectId))
      .orderBy(asc(projectPhotos.order));
  } catch {
    return [];
  }
}

async function getAvailablePhotos(projectId: string) {
  try {
    const inProject = await db
      .select({ photoId: projectPhotos.photoId })
      .from(projectPhotos)
      .where(eq(projectPhotos.projectId, projectId));
    const excludeIds = inProject.map((r) => r.photoId);

    const query = db
      .select({
        id: photos.id,
        url: photos.url,
        title: photos.title,
        alt: photos.alt,
      })
      .from(photos)
      .where(eq(photos.clientOnly, false))
      .orderBy(desc(photos.createdAt))
      .limit(200);

    if (excludeIds.length > 0) {
      return await db
        .select({
          id: photos.id,
          url: photos.url,
          title: photos.title,
          alt: photos.alt,
        })
        .from(photos)
        .where(eq(photos.clientOnly, false))
        .orderBy(desc(photos.createdAt))
        .limit(200)
        .then((rows) => rows.filter((r) => !excludeIds.includes(r.id)));
    }
    return await query;
  } catch {
    return [];
  }
  void notInArray;
}

export default async function ProjectEditPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = await getProject(id);
  if (!project) notFound();

  const [selected, available] = await Promise.all([
    getProjectPhotos(project.id),
    getAvailablePhotos(project.id),
  ]);

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <Link
          href="/admin/projects"
          className="text-xs uppercase tracking-[0.2em] text-neutral-500 hover:text-neutral-900 transition"
        >
          ← Tous les projets
        </Link>
        <h1 className="text-3xl font-light">{project.name}</h1>
        <p className="font-mono text-xs text-neutral-500">
          /projets/{project.slug}
        </p>
      </header>

      <ProjectEditor
        project={{
          id: project.id,
          slug: project.slug,
          name: project.name,
          description: project.description,
          coverPhotoId: project.coverPhotoId,
          visible: project.visible,
        }}
        selectedPhotos={selected}
        availablePhotos={available}
      />
    </div>
  );
}
