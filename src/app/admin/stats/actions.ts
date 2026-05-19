"use server";

import { revalidatePath } from "next/cache";
import { and, gte, lte, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { pageViews, interactions } from "@/lib/db/schema";

const presetSchema = z.enum(["today", "7d", "30d", "90d", "all"]);
const scopeSchema = z.enum(["all", "pageviews", "interactions"]);

const resetSchema = z
  .object({
    scope: scopeSchema,
    preset: presetSchema.optional(),
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .refine((d) => d.preset || (d.from && d.to), {
    message: "Specify a preset OR a custom from/to range",
  });

function rangeFromPreset(preset: z.infer<typeof presetSchema>): {
  from: Date | null;
  to: Date | null;
} {
  const now = new Date();
  if (preset === "all") {
    return { from: null, to: null };
  }
  if (preset === "today") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { from: start, to: now };
  }
  const days = preset === "7d" ? 7 : preset === "30d" ? 30 : 90;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { from, to: now };
}

export async function resetStats(
  input: z.infer<typeof resetSchema>,
): Promise<
  | { ok: true; deleted: { pageviews: number; interactions: number } }
  | { ok: false; error: string }
> {
  const session = await auth();
  if (!session?.user) return { ok: false, error: "Unauthorized" };

  const parsed = resetSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Invalid input" };
  }

  let from: Date | null = null;
  let to: Date | null = null;

  if (parsed.data.preset) {
    const r = rangeFromPreset(parsed.data.preset);
    from = r.from;
    to = r.to;
  } else if (parsed.data.from && parsed.data.to) {
    from = new Date(parsed.data.from);
    to = new Date(parsed.data.to);
    // Inclus toute la journée de fin
    to.setHours(23, 59, 59, 999);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      return { ok: false, error: "Dates invalides" };
    }
    if (from > to) {
      return { ok: false, error: "La date de début doit être avant la date de fin" };
    }
  }

  try {
    let deletedViews = 0;
    let deletedInteractions = 0;

    const buildWhere = (column: PgColumn): SQL | undefined => {
      if (from && to) return and(gte(column, from), lte(column, to));
      if (from) return gte(column, from);
      if (to) return lte(column, to);
      return undefined;
    };

    if (parsed.data.scope === "all" || parsed.data.scope === "pageviews") {
      const where = buildWhere(pageViews.createdAt);
      const result = where
        ? await db.delete(pageViews).where(where).returning({ id: pageViews.id })
        : await db.delete(pageViews).returning({ id: pageViews.id });
      deletedViews = result.length;
    }

    if (parsed.data.scope === "all" || parsed.data.scope === "interactions") {
      const where = buildWhere(interactions.createdAt);
      const result = where
        ? await db
            .delete(interactions)
            .where(where)
            .returning({ id: interactions.id })
        : await db.delete(interactions).returning({ id: interactions.id });
      deletedInteractions = result.length;
    }

    revalidatePath("/admin");
    revalidatePath("/admin/stats");

    return {
      ok: true,
      deleted: {
        pageviews: deletedViews,
        interactions: deletedInteractions,
      },
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "DB error",
    };
  }
}
