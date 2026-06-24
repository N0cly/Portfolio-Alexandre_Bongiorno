import { NextResponse, type NextRequest } from "next/server";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  photos,
  clientGalleries,
  clientGalleryPhotos,
} from "@/lib/db/schema";
import { buildSlug } from "@/lib/slug";
import {
  ALLOWED_IMAGE_MIME,
  extForMime,
  getStorageUsage,
  saveBuffer,
  deleteStoredFile,
  publicUrlFor,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Garde-fou serveur (le client compresse déjà à ~3 MB).
const MAX_FILE_SIZE_BYTES = 32 * 1024 * 1024;

type FileResult = {
  name: string;
  ok: boolean;
  id?: string;
  url?: string;
  error?: string;
  /** Vrai si l'échec est dû à la limite de stockage. */
  quota?: boolean;
};

function cleanFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Requête invalide" }, { status: 400 });
  }

  const galleryIdRaw = form.get("galleryId");
  const galleryId =
    typeof galleryIdRaw === "string" && galleryIdRaw.length > 0
      ? galleryIdRaw
      : null;

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Aucun fichier reçu" }, { status: 400 });
  }

  // Upload privé dans une galerie cliente : on valide la galerie.
  if (galleryId) {
    if (!z.string().uuid().safeParse(galleryId).success) {
      return NextResponse.json(
        { error: "Identifiant de galerie invalide" },
        { status: 400 },
      );
    }
    const exists = await db
      .select({ id: clientGalleries.id })
      .from(clientGalleries)
      .where(eq(clientGalleries.id, galleryId))
      .limit(1);
    if (exists.length === 0) {
      return NextResponse.json(
        { error: "Galerie introuvable" },
        { status: 404 },
      );
    }
  }

  // Snapshot de l'usage disque AVANT écriture. On le projette au fil des
  // fichiers pour appliquer la limite de façon cumulative.
  const usage = await getStorageUsage();
  const limit = usage.limitBytes;
  let projectedUsed = usage.usedBytes;

  const results: FileResult[] = [];

  for (const file of files) {
    if (!ALLOWED_IMAGE_MIME.has(file.type)) {
      results.push({ name: file.name, ok: false, error: "Format non supporté" });
      continue;
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      results.push({
        name: file.name,
        ok: false,
        error: `Trop volumineux : ${(file.size / 1024 / 1024).toFixed(1)} Mo`,
      });
      continue;
    }

    // Garde-fou quota : on bloque dès que le fichier ferait dépasser la limite.
    if (projectedUsed + file.size > limit) {
      results.push({
        name: file.name,
        ok: false,
        quota: true,
        error: "Limite de stockage atteinte",
      });
      continue;
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(await file.arrayBuffer());
    } catch {
      results.push({ name: file.name, ok: false, error: "Lecture échouée" });
      continue;
    }

    let storageKey: string;
    try {
      storageKey = await saveBuffer(buffer, extForMime(file.type, file.name));
    } catch {
      results.push({
        name: file.name,
        ok: false,
        error: "Écriture disque échouée",
      });
      continue;
    }

    const cleanName = cleanFilename(file.name);
    const photoId = randomUUID();
    const slug = buildSlug(cleanName, photoId);

    try {
      const [inserted] = await db
        .insert(photos)
        .values({
          id: photoId,
          slug,
          storageKey,
          url: publicUrlFor(storageKey),
          fileSize: buffer.length,
          mimeType: file.type,
          title: cleanName,
          alt: cleanName,
          // Galerie cliente : double sécurité (jamais sur le site public).
          ...(galleryId
            ? { clientOnly: true, visible: false, placement: "gallery" }
            : {}),
        })
        .returning();

      if (!inserted) {
        await deleteStoredFile(storageKey);
        results.push({
          name: file.name,
          ok: false,
          error: "Enregistrement échoué",
        });
        continue;
      }

      // Rattachement à la galerie cliente (table de jonction).
      if (galleryId) {
        const [{ maxOrder }] = await db
          .select({
            maxOrder: sql<number>`coalesce(max(${clientGalleryPhotos.order}), -1)::int`,
          })
          .from(clientGalleryPhotos)
          .where(eq(clientGalleryPhotos.galleryId, galleryId));

        await db.insert(clientGalleryPhotos).values({
          galleryId,
          photoId: inserted.id,
          order: maxOrder + 1,
        });
      }

      projectedUsed += buffer.length;
      results.push({
        name: file.name,
        ok: true,
        id: inserted.id,
        url: inserted.url,
      });
    } catch (err) {
      // Rollback du fichier disque si l'insertion DB échoue.
      await deleteStoredFile(storageKey);
      console.error("Échec d'enregistrement de la photo", err);
      results.push({ name: file.name, ok: false, error: "Erreur base de données" });
    }
  }

  const finalUsage = await getStorageUsage();
  const anyOk = results.some((r) => r.ok);
  const anyQuota = results.some((r) => r.quota);

  // 200 si au moins un fichier passé ; sinon 413 (quota) ou 400 (autre).
  const status = anyOk ? 200 : anyQuota ? 413 : 400;

  return NextResponse.json({ results, usage: finalUsage }, { status });
}
