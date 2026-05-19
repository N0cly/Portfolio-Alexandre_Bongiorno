"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";

const createSchema = z.object({
  label: z.string().min(1).max(60),
  url: z.string().url().max(500),
  icon: z.string().max(40).optional().nullable(),
  visible: z.boolean().optional(),
});

const updateSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(60).optional(),
  url: z.string().url().max(500).optional(),
  icon: z.string().max(40).optional().nullable(),
  visible: z.boolean().optional(),
});

async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    throw new Error("Unauthorized");
  }
}

function bump() {
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  revalidatePath("/contact");
}

export async function createLink(
  input: z.infer<typeof createSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAuth();
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid input" };

    const [{ maxOrder }] = await db
      .select({
        maxOrder: sql<number>`coalesce(max(${links.order}), -1)::int`,
      })
      .from(links);

    await db.insert(links).values({
      label: parsed.data.label,
      url: parsed.data.url,
      icon: parsed.data.icon ?? null,
      visible: parsed.data.visible ?? true,
      order: maxOrder + 1,
    });

    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function updateLink(
  input: z.infer<typeof updateSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAuth();
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: "Invalid input" };

    const { id, ...fields } = parsed.data;
    if (Object.keys(fields).length === 0) {
      return { ok: false, error: "No changes" };
    }

    await db.update(links).set(fields).where(eq(links.id, id));
    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function deleteLink(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAuth();
    if (!id) return { ok: false, error: "Missing id" };
    await db.delete(links).where(eq(links.id, id));
    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function reorderLinks(
  orderedIds: string[],
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAuth();
    if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
      return { ok: false, error: "Empty order" };
    }

    const cases = orderedIds
      .map((_, i) => sql`when ${links.id} = ${orderedIds[i]} then ${i}`)
      .reduce((acc, cur) => sql`${acc} ${cur}`, sql``);

    await db
      .update(links)
      .set({ order: sql`case ${cases} else ${links.order} end` })
      .where(
        sql`${links.id} in (${sql.join(
          orderedIds.map((id) => sql`${id}`),
          sql`, `,
        )})`,
      );

    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
