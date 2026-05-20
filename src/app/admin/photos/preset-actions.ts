"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql, inArray, asc, desc } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { photos, selectionPresets, selectionPresetPhotos } from "@/lib/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

function bump() {
  revalidatePath("/admin/photos");
  revalidatePath("/");
}

/**
 * Sauvegarde la sélection actuelle (photos hero + featured) comme un preset.
 */
export async function saveCurrentAsPreset(
  name: string,
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const trimmed = name.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      return { ok: false, error: "Nom de preset invalide (1-80 caractères)" };
    }

    // Récupère les photos featured/hero dans l'ordre actuel
    const current = await db
      .select({
        id: photos.id,
        featuredOrder: photos.featuredOrder,
        createdAt: photos.createdAt,
        placement: photos.placement,
      })
      .from(photos)
      .where(inArray(photos.placement, ["hero", "featured"]))
      .orderBy(
        sql`case ${photos.placement} when 'hero' then 0 when 'featured' then 1 else 2 end asc`,
        asc(photos.featuredOrder),
        desc(photos.createdAt),
      );

    if (current.length === 0) {
      return { ok: false, error: "Aucune photo dans la sélection actuelle" };
    }

    const [inserted] = await db
      .insert(selectionPresets)
      .values({ name: trimmed })
      .returning({ id: selectionPresets.id });

    await db.insert(selectionPresetPhotos).values(
      current.map((p, i) => ({
        presetId: inserted.id,
        photoId: p.id,
        order: i,
      })),
    );

    bump();
    return { ok: true, id: inserted.id };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

/**
 * Applique un preset : passe TOUTES les photos featured actuelles en gallery,
 * puis met les photos du preset en featured (sauf la 1ère qui devient hero si demandé).
 */
export async function applyPreset(
  presetId: string,
  options?: { useFirstAsHero?: boolean },
): Promise<{ ok: true; applied: number } | { ok: false; error: string }> {
  try {
    await requireAdmin();

    // Récupère les photos du preset
    const rows = await db
      .select({ photoId: selectionPresetPhotos.photoId })
      .from(selectionPresetPhotos)
      .where(eq(selectionPresetPhotos.presetId, presetId))
      .orderBy(asc(selectionPresetPhotos.order));

    if (rows.length === 0) {
      return { ok: false, error: "Preset vide" };
    }

    const photoIds = rows.map((r) => r.photoId);

    // Démote toutes les photos actuellement hero/featured (pas dans le preset) en gallery
    await db
      .update(photos)
      .set({ placement: "gallery", updatedAt: new Date() })
      .where(
        and(
          inArray(photos.placement, ["hero", "featured"]),
          sql`${photos.id} NOT IN (${sql.join(
            photoIds.map((id) => sql`${id}`),
            sql`, `,
          )})`,
        ),
      );

    // Applique le preset : 1ère photo = hero (si demandé), les autres = featured
    // featuredOrder = ordre dans le preset
    for (let i = 0; i < photoIds.length; i++) {
      const isHero = options?.useFirstAsHero === true && i === 0;
      await db
        .update(photos)
        .set({
          placement: isHero ? "hero" : "featured",
          featuredOrder: i,
          updatedAt: new Date(),
        })
        .where(eq(photos.id, photoIds[i]));
    }

    bump();
    return { ok: true, applied: photoIds.length };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function deletePreset(
  presetId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await db.delete(selectionPresets).where(eq(selectionPresets.id, presetId));
    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

const renameSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
});

export async function renamePreset(
  input: z.infer<typeof renameSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const parsed = renameSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Nom invalide" };
    await db
      .update(selectionPresets)
      .set({ name: parsed.data.name.trim(), updatedAt: new Date() })
      .where(eq(selectionPresets.id, parsed.data.id));
    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

/**
 * Met à jour les photos d'un preset existant avec la sélection actuelle.
 */
export async function overwritePresetWithCurrent(
  presetId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();

    // Récupère les photos featured/hero actuelles
    const current = await db
      .select({
        id: photos.id,
        placement: photos.placement,
        featuredOrder: photos.featuredOrder,
      })
      .from(photos)
      .where(inArray(photos.placement, ["hero", "featured"]))
      .orderBy(
        sql`case ${photos.placement} when 'hero' then 0 when 'featured' then 1 else 2 end asc`,
        asc(photos.featuredOrder),
      );

    // Vide le preset
    await db
      .delete(selectionPresetPhotos)
      .where(eq(selectionPresetPhotos.presetId, presetId));

    if (current.length > 0) {
      await db.insert(selectionPresetPhotos).values(
        current.map((p, i) => ({
          presetId,
          photoId: p.id,
          order: i,
        })),
      );
    }

    await db
      .update(selectionPresets)
      .set({ updatedAt: new Date() })
      .where(eq(selectionPresets.id, presetId));

    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
