import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { z } from "zod";
import { eq, sql } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "./db";
import { photos, clientGalleryPhotos, clientGalleries } from "./db/schema";
import { buildSlug } from "./slug";
import { randomUUID } from "crypto";

const f = createUploadthing();

function cleanFilename(name: string): string {
  return name
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim();
}

export const ourFileRouter = {
  // ── Upload des photos du portfolio public ────────────────────────────
  photoUploader: f({
    image: {
      maxFileSize: "32MB",
      maxFileCount: 50,
    },
  })
    .middleware(async () => {
      const session = await auth();
      if (!session?.user) {
        throw new UploadThingError("Unauthorized");
      }
      return { userId: session.user.id ?? session.user.email ?? "admin" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        const cleanName = cleanFilename(file.name);
        const photoId = randomUUID();
        const slug = buildSlug(cleanName, photoId);

        const [inserted] = await db
          .insert(photos)
          .values({
            id: photoId,
            slug,
            storageKey: file.key,
            url: file.ufsUrl,
            fileSize: file.size,
            mimeType: file.type,
            title: cleanName,
            alt: cleanName,
          })
          .returning();
        return {
          uploadedBy: metadata.userId,
          photoId: inserted?.id,
          url: file.ufsUrl,
        };
      } catch (err) {
        console.error("Failed to save photo metadata", err);
        return {
          uploadedBy: metadata.userId,
          url: file.ufsUrl,
          dbError: true,
        };
      }
    }),

  // ── Upload de photos privées dans une galerie client ─────────────────
  // Ces photos N'APPARAISSENT JAMAIS sur le site public.
  // Marquées clientOnly=true ET visible=false (double sécurité).
  clientGalleryUploader: f({
    image: {
      maxFileSize: "32MB",
      maxFileCount: 50,
    },
  })
    .input(z.object({ galleryId: z.string().uuid() }))
    .middleware(async ({ input }) => {
      const session = await auth();
      if (!session?.user) {
        throw new UploadThingError("Unauthorized");
      }

      // Vérifie que la galerie existe
      const exists = await db
        .select({ id: clientGalleries.id })
        .from(clientGalleries)
        .where(eq(clientGalleries.id, input.galleryId))
        .limit(1);
      if (exists.length === 0) {
        throw new UploadThingError("Galerie introuvable");
      }

      return {
        galleryId: input.galleryId,
        userId: session.user.id ?? session.user.email ?? "admin",
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      try {
        const cleanName = cleanFilename(file.name);
        const photoId = randomUUID();
        const slug = buildSlug(cleanName, photoId);

        // Insert avec clientOnly=true et visible=false (double sécurité)
        const [inserted] = await db
          .insert(photos)
          .values({
            id: photoId,
            slug,
            storageKey: file.key,
            url: file.ufsUrl,
            fileSize: file.size,
            mimeType: file.type,
            title: cleanName,
            alt: cleanName,
            clientOnly: true,
            visible: false,
            placement: "gallery",
          })
          .returning();

        if (!inserted) {
          return {
            uploadedBy: metadata.userId,
            url: file.ufsUrl,
            dbError: true,
          };
        }

        // Calcule l'ordre suivant dans la galerie
        const [{ maxOrder }] = await db
          .select({
            maxOrder: sql<number>`coalesce(max(${clientGalleryPhotos.order}), -1)::int`,
          })
          .from(clientGalleryPhotos)
          .where(eq(clientGalleryPhotos.galleryId, metadata.galleryId));

        // Ajoute dans la junction
        await db.insert(clientGalleryPhotos).values({
          galleryId: metadata.galleryId,
          photoId: inserted.id,
          order: maxOrder + 1,
        });

        return {
          uploadedBy: metadata.userId,
          photoId: inserted.id,
          url: file.ufsUrl,
        };
      } catch (err) {
        console.error("Failed to save client photo", err);
        return {
          uploadedBy: metadata.userId,
          url: file.ufsUrl,
          dbError: true,
        };
      }
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
