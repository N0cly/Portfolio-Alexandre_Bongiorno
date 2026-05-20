"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { extractExifFromUrl } from "@/lib/exif";
import { MAX_FEATURED, type FeaturedPhotoBrief } from "@/lib/photos-constants";

const infoFieldSchema = z.object({
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(500),
  url: z.string().url().max(500).optional().or(z.literal("")),
});

const updatePhotoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().max(120).optional(),
  alt: z.string().max(200).optional(),
  slug: z
    .string()
    .max(120)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug invalide (a-z, 0-9, -)")
    .optional(),
  category: z.string().max(60).nullable().optional(),
  tags: z.array(z.string().min(1).max(60)).max(20).optional(),
  takenAt: z.string().nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  infoFields: z.array(infoFieldSchema).max(20).optional(),
  placement: z.enum(["gallery", "hero", "featured"]).optional(),
  displayWidth: z.enum(["auto", "1", "2", "3", "4", "5"]).optional(),
  displayHeight: z
    .enum(["auto", "1:1", "3:4", "4:3", "16:9", "2:3"])
    .optional(),
  rotation: z.number().int().min(-15).max(15).optional(),
  objectFit: z.enum(["cover", "contain"]).optional(),
  visible: z.boolean().optional(),
  // ID d'une photo featured à rétrograder en gallery pour faire de la place
  demotePhotoId: z.string().uuid().optional(),
});


export async function updatePhoto(
  input: z.infer<typeof updatePhotoSchema>,
): Promise<
  | { ok: true }
  | { ok: false; error: string }
  | { ok: false; needsDemotion: true; current: FeaturedPhotoBrief[] }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = updatePhotoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const { id, demotePhotoId, ...fields } = parsed.data;
  if (Object.keys(fields).length === 0) {
    return { ok: false, error: "No changes" };
  }

  // Normalise les types avant insert
  const dbFields: Record<string, unknown> = { ...fields, updatedAt: new Date() };
  if ("takenAt" in fields) {
    dbFields.takenAt = fields.takenAt ? new Date(fields.takenAt) : null;
  }
  if ("infoFields" in fields && Array.isArray(fields.infoFields)) {
    dbFields.infoFields = fields.infoFields.map((f) => ({
      label: f.label,
      value: f.value,
      ...(f.url && f.url.length > 0 ? { url: f.url } : {}),
    }));
  }

  try {
    // Hero auto-démote : la photo précédente passe en gallery (ou en featured si demandé ?)
    // On la passe en gallery par défaut comme demandé : "la précédente est retirée du hero et mise dans galerie uniquement"
    if (parsed.data.placement === "hero") {
      await db
        .update(photos)
        .set({ placement: "gallery", updatedAt: new Date() })
        .where(and(eq(photos.placement, "hero"), sql`${photos.id} <> ${id}`));
    }

    // Cap de 6 photos dans la sélection (placement = "featured")
    if (parsed.data.placement === "featured") {
      const featuredOthers = await db
        .select({
          id: photos.id,
          url: photos.url,
          title: photos.title,
          alt: photos.alt,
        })
        .from(photos)
        .where(
          and(eq(photos.placement, "featured"), sql`${photos.id} <> ${id}`),
        );

      if (featuredOthers.length >= MAX_FEATURED) {
        if (!demotePhotoId) {
          // Pas de choix → renvoie la liste pour que l'admin choisisse
          return {
            ok: false,
            needsDemotion: true,
            current: featuredOthers,
          };
        }
        // Démote la photo choisie en gallery
        await db
          .update(photos)
          .set({ placement: "gallery", updatedAt: new Date() })
          .where(eq(photos.id, demotePhotoId));
      }
    }

    await db.update(photos).set(dbFields).where(eq(photos.id, id));

    revalidatePath("/admin/photos");
    revalidatePath("/gallery");
    revalidatePath("/");
    revalidatePath(`/photo/${id}`, "page");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "DB error",
    };
  }
}

export async function extractPhotoExif(
  photoId: string,
): Promise<
  | { ok: true; exif: Record<string, unknown> | null }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  try {
    const [photo] = await db
      .select({ url: photos.url })
      .from(photos)
      .where(eq(photos.id, photoId))
      .limit(1);
    if (!photo) return { ok: false, error: "Photo introuvable" };

    const exif = await extractExifFromUrl(photo.url);

    const updatePatch: Record<string, unknown> = {
      exif: exif ?? null,
      updatedAt: new Date(),
    };
    // Si EXIF a une date prise de vue et que la photo n'en a pas, on remplit
    if (exif?.takenAt) {
      const [existing] = await db
        .select({ takenAt: photos.takenAt })
        .from(photos)
        .where(eq(photos.id, photoId))
        .limit(1);
      if (existing && !existing.takenAt) {
        updatePatch.takenAt = new Date(exif.takenAt);
      }
    }

    await db.update(photos).set(updatePatch).where(eq(photos.id, photoId));

    revalidatePath("/admin/photos");
    revalidatePath(`/photo/${photoId}`, "page");
    return { ok: true, exif: exif as Record<string, unknown> | null };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

const EXIF_BATCH_SIZE = 5;

/**
 * Traite jusqu'à 5 photos sans EXIF par appel.
 * Le client appelle cette action en boucle jusqu'à `remaining === 0`.
 */
export async function extractMissingExifBatch(options?: {
  reExtract?: boolean;
}): Promise<
  | { ok: true; processed: number; remaining: number; total: number }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  try {
    const reExtract = options?.reExtract === true;

    // Compte le total à traiter (sans EXIF OU tous si reExtract)
    const totalQuery = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(photos)
      .where(reExtract ? sql`true` : sql`${photos.exif} IS NULL`);
    const total = totalQuery[0]?.count ?? 0;

    // Récupère les N prochaines photos
    const targets = await db
      .select({ id: photos.id, url: photos.url, takenAt: photos.takenAt })
      .from(photos)
      .where(reExtract ? sql`true` : sql`${photos.exif} IS NULL`)
      .limit(EXIF_BATCH_SIZE);

    if (targets.length === 0) {
      return { ok: true, processed: 0, remaining: 0, total };
    }

    // Traitement en parallèle
    await Promise.all(
      targets.map(async (p) => {
        try {
          const exif = await extractExifFromUrl(p.url);
          const patch: Record<string, unknown> = {
            // Stocke un objet vide si null pour marquer "traité"
            exif: exif ?? {},
            updatedAt: new Date(),
          };
          // Si EXIF contient une date de prise de vue et que la photo n'en a pas, on remplit
          if (exif?.takenAt && !p.takenAt) {
            patch.takenAt = new Date(exif.takenAt);
          }
          await db.update(photos).set(patch).where(eq(photos.id, p.id));
        } catch (err) {
          // Marque quand même comme traité pour ne pas boucler à l'infini
          console.error(`EXIF extraction failed for photo ${p.id}`, err);
          await db
            .update(photos)
            .set({ exif: {}, updatedAt: new Date() })
            .where(eq(photos.id, p.id));
        }
      }),
    );

    revalidatePath("/admin/photos");

    return {
      ok: true,
      processed: targets.length,
      remaining: Math.max(0, total - targets.length),
      total,
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "DB error",
    };
  }
}

export async function reorderPhotos(
  orderedIds: string[],
  context: "gallery" | "selection" = "gallery",
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
    return { ok: false, error: "Empty order" };
  }

  try {
    const targetColumn = context === "selection" ? photos.featuredOrder : photos.order;

    const cases = orderedIds
      .map((_, i) => sql`when ${photos.id} = ${orderedIds[i]} then ${i}`)
      .reduce((acc, cur) => sql`${acc} ${cur}`, sql``);

    const setValue =
      context === "selection"
        ? { featuredOrder: sql`case ${cases} else ${targetColumn} end` }
        : { order: sql`case ${cases} else ${targetColumn} end` };

    await db
      .update(photos)
      .set(setValue)
      .where(
        sql`${photos.id} in (${sql.join(
          orderedIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );

    revalidatePath("/admin/photos");
    revalidatePath("/gallery");
    revalidatePath("/");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "DB error",
    };
  }
}
