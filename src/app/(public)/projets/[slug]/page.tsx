import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { eq, and, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects, projectPhotos, photos } from "@/lib/db/schema";
import { GalleryGrid } from "@/components/gallery/GalleryGrid";

async function getProject(slug: string) {
  try {
    const [row] = await db
      .select()
      .from(projects)
      .where(and(eq(projects.slug, slug), eq(projects.visible, true)))
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
        slug: photos.slug,
        width: photos.width,
        height: photos.height,
        displayWidth: photos.displayWidth,
        displayHeight: photos.displayHeight,
        rotation: photos.rotation,
        objectFit: photos.objectFit,
      })
      .from(projectPhotos)
      .innerJoin(photos, eq(photos.id, projectPhotos.photoId))
      .where(eq(projectPhotos.projectId, projectId))
      .orderBy(asc(projectPhotos.order));
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) return { title: "Projet introuvable" };
  return {
    title: project.name,
    description: project.description ?? `Série photographique : ${project.name}`,
  };
}

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const project = await getProject(slug);
  if (!project) notFound();

  const list = await getProjectPhotos(project.id);

  return (
    <main className="mx-auto max-w-6xl px-8 py-16">
      <header className="mb-12 border-b border-neutral-300 pb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
          Projet
        </p>
        <h1
          className="text-5xl font-light tracking-tight md:text-6xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {project.name}
        </h1>
        {project.description && (
          <p
            className="mt-6 max-w-3xl text-lg leading-relaxed text-neutral-700"
            style={{ fontFamily: "var(--font-serif)" }}
          >
            {project.description}
          </p>
        )}
      </header>

      {list.length === 0 ? (
        <p className="py-24 text-center text-neutral-500">
          Aucune photo dans ce projet.
        </p>
      ) : (
        <GalleryGrid photos={list} />
      )}
    </main>
  );
}
