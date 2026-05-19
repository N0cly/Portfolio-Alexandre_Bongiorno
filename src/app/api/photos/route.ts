import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { z } from "zod";
import { desc } from "drizzle-orm";

export async function GET() {
  try {
    const rows = await db.select().from(photos).orderBy(desc(photos.order));
    return NextResponse.json(rows);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Query failed" },
      { status: 500 },
    );
  }
}

const createSchema = z.object({
  storageKey: z.string().min(1),
  url: z.string().url(),
  alt: z.string().optional(),
  title: z.string().optional(),
  caption: z.string().optional(),
  width: z.number().int().optional(),
  height: z.number().int().optional(),
  fileSize: z.number().int().optional(),
  mimeType: z.string().optional(),
  sectionId: z.string().uuid().optional(),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid body", issues: parsed.error.issues },
      { status: 400 },
    );
  }

  const [inserted] = await db
    .insert(photos)
    .values(parsed.data)
    .returning();
  return NextResponse.json(inserted, { status: 201 });
}
