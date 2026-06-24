import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { photos } from "@/lib/db/schema";
import { deleteStoredFile } from "@/lib/storage";

export const runtime = "nodejs";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [photo] = await db.select().from(photos).where(eq(photos.id, id));
  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Supprime le fichier du disque (sans effet si clé distante/ancienne).
  try {
    await deleteStoredFile(photo.storageKey);
  } catch (err) {
    console.error("Échec de suppression du fichier local", err);
  }

  await db.delete(photos).where(eq(photos.id, id));
  return NextResponse.json({ ok: true });
}
