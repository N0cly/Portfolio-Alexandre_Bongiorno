import { NextResponse } from "next/server";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { photos, photoLikes } from "@/lib/db/schema";

const bodySchema = z.object({
  photoId: z.string().uuid(),
  sessionId: z.string().min(8).max(64),
  action: z.enum(["like", "unlike"]),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  try {
    if (parsed.data.action === "like") {
      // Insert si pas déjà liké
      const existing = await db
        .select({ id: photoLikes.id })
        .from(photoLikes)
        .where(
          and(
            eq(photoLikes.photoId, parsed.data.photoId),
            eq(photoLikes.sessionId, parsed.data.sessionId),
          ),
        )
        .limit(1);

      if (existing.length === 0) {
        await db.insert(photoLikes).values({
          photoId: parsed.data.photoId,
          sessionId: parsed.data.sessionId,
        });
        await db
          .update(photos)
          .set({ likesCount: sql`${photos.likesCount} + 1` })
          .where(eq(photos.id, parsed.data.photoId));
      }
    } else {
      const deleted = await db
        .delete(photoLikes)
        .where(
          and(
            eq(photoLikes.photoId, parsed.data.photoId),
            eq(photoLikes.sessionId, parsed.data.sessionId),
          ),
        )
        .returning({ id: photoLikes.id });
      if (deleted.length > 0) {
        await db
          .update(photos)
          .set({
            likesCount: sql`greatest(${photos.likesCount} - 1, 0)`,
          })
          .where(eq(photos.id, parsed.data.photoId));
      }
    }

    const [updated] = await db
      .select({ likesCount: photos.likesCount })
      .from(photos)
      .where(eq(photos.id, parsed.data.photoId));

    return NextResponse.json({ ok: true, likesCount: updated?.likesCount ?? 0 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "DB error" },
      { status: 500 },
    );
  }
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const photoId = url.searchParams.get("photoId");
  const sessionId = url.searchParams.get("sessionId");
  if (!photoId || !sessionId) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    const liked = await db
      .select({ id: photoLikes.id })
      .from(photoLikes)
      .where(and(eq(photoLikes.photoId, photoId), eq(photoLikes.sessionId, sessionId)))
      .limit(1);
    return NextResponse.json({ liked: liked.length > 0 });
  } catch {
    return NextResponse.json({ liked: false });
  }
}
