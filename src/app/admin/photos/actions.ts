"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";

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
  placement: z.enum(["gallery", "hero", "featured"]).optional(),
  displayWidth: z.enum(["auto", "1", "2", "3", "4", "5"]).optional(),
  displayHeight: z
    .enum(["auto", "1:1", "3:4", "4:3", "16:9", "2:3"])
    .optional(),
  rotation: z.number().int().min(-15).max(15).optional(),
  objectFit: z.enum(["cover", "contain"]).optional(),
  visible: z.boolean().optional(),
});

export async function updatePhoto(
  input: z.infer<typeof updatePhotoSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = updatePhotoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  const { id, ...fields } = parsed.data;
  if (Object.keys(fields).length === 0) {
    return { ok: false, error: "No changes" };
  }

  try {
    await db
      .update(photos)
      .set({ ...fields, updatedAt: new Date() })
      .where(eq(photos.id, id));

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
