import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { and, eq, desc } from "drizzle-orm";
import { getAllTags } from "@/lib/tags";

function getBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = getBaseUrl();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/gallery`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/mentions-legales`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/confidentialite`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/cookies`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
    { url: `${base}/cgu`, lastModified: now, changeFrequency: "yearly", priority: 0.2 },
  ];

  try {
    const tags = await getAllTags();
    const tagRoutes: MetadataRoute.Sitemap = tags.map((t) => ({
      url: `${base}/gallery/${t.slug}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const photoRows = await db
      .select({
        slug: photos.slug,
        id: photos.id,
        updatedAt: photos.updatedAt,
      })
      .from(photos)
      .where(and(eq(photos.visible, true), eq(photos.clientOnly, false)))
      .orderBy(desc(photos.updatedAt));

    const photoRoutes: MetadataRoute.Sitemap = photoRows.map((p) => ({
      url: `${base}/photo/${p.slug ?? p.id}`,
      lastModified: p.updatedAt ?? now,
      changeFrequency: "monthly",
      priority: 0.6,
    }));

    return [...staticRoutes, ...tagRoutes, ...photoRoutes];
  } catch {
    return staticRoutes;
  }
}
