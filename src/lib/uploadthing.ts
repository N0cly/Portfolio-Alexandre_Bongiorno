import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";
import { auth } from "./auth";
import { db } from "./db";
import { photos } from "./db/schema";
import { buildSlug } from "./slug";
import { randomUUID } from "crypto";

const f = createUploadthing();

export const ourFileRouter = {
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
        // Clean filename : remove extension, replace separators with spaces
        const cleanName = file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[_-]+/g, " ")
          .trim();

        // Pre-generate UUID so the slug references the same id
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
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;
