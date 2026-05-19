"use server";

import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { clientGalleries, clientGalleryPhotos } from "@/lib/db/schema";
import { slugify } from "@/lib/slug";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

function bump(slug?: string) {
  revalidatePath("/admin/client-galleries");
  if (slug) revalidatePath(`/client/${slug}`);
}

const createSchema = z.object({
  name: z.string().min(2).max(120),
  password: z.string().min(6).max(200),
  description: z.string().max(500).optional(),
  expiresAt: z.string().optional(), // ISO date
});

export async function createClientGallery(
  input: z.infer<typeof createSchema>,
): Promise<{ ok: true; id: string; slug: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Champs invalides" };

    // Génère un slug unique : nom + 4 chars random
    const baseSlug = slugify(parsed.data.name) || "client";
    const suffix = Math.random().toString(36).slice(2, 6);
    const slug = `${baseSlug}-${suffix}`;

    const passwordHash = await hash(parsed.data.password, 10);
    const expiresAt = parsed.data.expiresAt
      ? new Date(parsed.data.expiresAt)
      : null;

    const [inserted] = await db
      .insert(clientGalleries)
      .values({
        name: parsed.data.name,
        slug,
        passwordHash,
        description: parsed.data.description ?? null,
        expiresAt,
      })
      .returning({ id: clientGalleries.id, slug: clientGalleries.slug });

    bump();
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
  description: z.string().max(500).nullable().optional(),
  password: z.string().min(6).max(200).optional(),
  expiresAt: z.string().nullable().optional(),
});

export async function updateClientGallery(
  input: z.infer<typeof updateSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Champs invalides" };

    const { id, password, expiresAt, ...rest } = parsed.data;
    const patch: Record<string, unknown> = { ...rest, updatedAt: new Date() };

    if (password) {
      patch.passwordHash = await hash(password, 10);
    }
    if (expiresAt !== undefined) {
      patch.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }

    const [row] = await db
      .update(clientGalleries)
      .set(patch)
      .where(eq(clientGalleries.id, id))
      .returning({ slug: clientGalleries.slug });

    bump(row?.slug);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function deleteClientGallery(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const [row] = await db
      .delete(clientGalleries)
      .where(eq(clientGalleries.id, id))
      .returning({ slug: clientGalleries.slug });
    bump(row?.slug);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function addPhotosToGallery(
  galleryId: string,
  photoIds: string[],
): Promise<{ ok: true; added: number } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    if (photoIds.length === 0) return { ok: true, added: 0 };

    const [{ maxOrder }] = await db
      .select({
        maxOrder: sql<number>`coalesce(max(${clientGalleryPhotos.order}), -1)::int`,
      })
      .from(clientGalleryPhotos)
      .where(eq(clientGalleryPhotos.galleryId, galleryId));

    let nextOrder = maxOrder + 1;
    const values = photoIds.map((photoId) => ({
      galleryId,
      photoId,
      order: nextOrder++,
    }));

    const inserted = await db
      .insert(clientGalleryPhotos)
      .values(values)
      .onConflictDoNothing()
      .returning({ photoId: clientGalleryPhotos.photoId });

    revalidatePath(`/admin/client-galleries/${galleryId}`);
    return { ok: true, added: inserted.length };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function removePhotoFromGallery(
  galleryId: string,
  photoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await db
      .delete(clientGalleryPhotos)
      .where(
        and(
          eq(clientGalleryPhotos.galleryId, galleryId),
          eq(clientGalleryPhotos.photoId, photoId),
        ),
      );
    revalidatePath(`/admin/client-galleries/${galleryId}`);
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
