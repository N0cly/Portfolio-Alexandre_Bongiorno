"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { projects, projectPhotos } from "@/lib/db/schema";
import { slugify } from "@/lib/slug";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

function bump(slug?: string) {
  revalidatePath("/admin/projects");
  revalidatePath("/projets");
  if (slug) revalidatePath(`/projets/${slug}`);
}

const createSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(2000).optional(),
});

export async function createProject(
  input: z.infer<typeof createSchema>,
): Promise<
  | { ok: true; id: string; slug: string }
  | { ok: false; error: string }
> {
  try {
    await requireAdmin();
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Champs invalides" };

    const baseSlug = slugify(parsed.data.name) || "projet";
    const suffix = Math.random().toString(36).slice(2, 6);
    const slug = `${baseSlug}-${suffix}`;

    const [inserted] = await db
      .insert(projects)
      .values({
        slug,
        name: parsed.data.name,
        description: parsed.data.description ?? null,
      })
      .returning({ id: projects.id, slug: projects.slug });

    bump(slug);
    return { ok: true, id: inserted.id, slug: inserted.slug };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(2).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  coverPhotoId: z.string().uuid().nullable().optional(),
  visible: z.boolean().optional(),
});

export async function updateProject(
  input: z.infer<typeof updateSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Champs invalides" };

    const { id, ...fields } = parsed.data;
    await db
      .update(projects)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(projects.id, id));

    const [row] = await db
      .select({ slug: projects.slug })
      .from(projects)
      .where(eq(projects.id, id));

    bump(row?.slug);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function deleteProject(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const [row] = await db
      .delete(projects)
      .where(eq(projects.id, id))
      .returning({ slug: projects.slug });
    bump(row?.slug);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function addPhotosToProject(
  projectId: string,
  photoIds: string[],
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    if (photoIds.length === 0) return { ok: true, added: 0 };

    const [{ maxOrder }] = await db
      .select({
        maxOrder: sql<number>`coalesce(max(${projectPhotos.order}), -1)::int`,
      })
      .from(projectPhotos)
      .where(eq(projectPhotos.projectId, projectId));

    let nextOrder = maxOrder + 1;
    const values = photoIds.map((photoId) => ({
      projectId,
      photoId,
      order: nextOrder++,
    }));

    const inserted = await db
      .insert(projectPhotos)
      .values(values)
      .onConflictDoNothing()
      .returning({ photoId: projectPhotos.photoId });

    revalidatePath(`/admin/projects/${projectId}`);
    return { ok: true, added: inserted.length };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function removePhotoFromProject(
  projectId: string,
  photoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await db
      .delete(projectPhotos)
      .where(
        and(
          eq(projectPhotos.projectId, projectId),
          eq(projectPhotos.photoId, photoId),
        ),
      );
    revalidatePath(`/admin/projects/${projectId}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
