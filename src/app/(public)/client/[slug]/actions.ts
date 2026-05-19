"use server";

import { eq, sql } from "drizzle-orm";
import { compare } from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { clientGalleries } from "@/lib/db/schema";
import { grantClientGalleryAccess } from "@/lib/client-gallery-auth";

const authSchema = z.object({
  slug: z.string().min(1).max(120),
  password: z.string().min(1).max(200),
});

// Petite tempo pour ralentir le brute-force
async function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function authenticateClientGallery(
  input: z.infer<typeof authSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  await delay(400);

  const parsed = authSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Champs invalides" };
  }

  try {
    const [gallery] = await db
      .select()
      .from(clientGalleries)
      .where(eq(clientGalleries.slug, parsed.data.slug))
      .limit(1);

    if (!gallery) {
      return { ok: false, error: "Galerie introuvable ou mot de passe invalide" };
    }

    if (gallery.expiresAt && gallery.expiresAt < new Date()) {
      return { ok: false, error: "Cette galerie a expiré." };
    }

    const valid = await compare(parsed.data.password, gallery.passwordHash);
    if (!valid) {
      return { ok: false, error: "Galerie introuvable ou mot de passe invalide" };
    }

    await grantClientGalleryAccess(gallery.id, gallery.expiresAt);

    // Tracking de l'accès
    await db
      .update(clientGalleries)
      .set({
        viewCount: sql`${clientGalleries.viewCount} + 1`,
        lastViewedAt: new Date(),
      })
      .where(eq(clientGalleries.id, gallery.id));

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
