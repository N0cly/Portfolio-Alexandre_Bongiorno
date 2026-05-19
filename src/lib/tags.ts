import "server-only";
import { sql } from "drizzle-orm";
import { db } from "./db";
import { photos } from "./db/schema";
import { slugify } from "./slug";

export type TagInfo = {
  name: string;
  slug: string;
  count: number;
};

export async function getAllTags(): Promise<TagInfo[]> {
  try {
    const rows = await db.execute<{ tag: string; count: number }>(
      sql`
        select
          unnest(${photos.tags}) as tag,
          count(*)::int as count
        from ${photos}
        where ${photos.visible} = true
        group by tag
        order by count desc, tag asc
      `,
    );

    return rows.rows
      .filter((r): r is { tag: string; count: number } => Boolean(r.tag))
      .map((r) => ({
        name: r.tag,
        slug: slugify(r.tag),
        count: r.count,
      }));
  } catch {
    return [];
  }
}

export async function resolveTagBySlug(
  slug: string,
): Promise<TagInfo | null> {
  const all = await getAllTags();
  return all.find((t) => t.slug === slug) ?? null;
}

/**
 * Toutes les valeurs uniques (admin) — inclut les photos masquées.
 */
export async function getAllAdminTags(): Promise<string[]> {
  try {
    const rows = await db.execute<{ tag: string }>(
      sql`
        select distinct unnest(${photos.tags}) as tag
        from ${photos}
        where array_length(${photos.tags}, 1) > 0
        order by tag asc
      `,
    );
    return rows.rows.map((r) => r.tag).filter((t): t is string => Boolean(t));
  } catch {
    return [];
  }
}
