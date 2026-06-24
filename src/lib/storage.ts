import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import {
  STORAGE_LIMIT_BYTES_DEFAULT,
  type StorageUsage,
} from "./storage-types";

/**
 * Répertoire de stockage des photos sur le serveur.
 * Configurable via UPLOAD_DIR (chemin absolu ou relatif au cwd).
 * Par défaut : <racine du projet>/uploads
 *
 * ⚠️ Ce répertoire doit être PERSISTANT (VPS, volume Docker…).
 * Il ne fonctionne pas sur un hébergement au filesystem éphémère (Vercel).
 */
export const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.join(process.cwd(), "uploads");

/** Limite de stockage (octets). Configurable via PHOTO_STORAGE_LIMIT_BYTES. */
export const STORAGE_LIMIT_BYTES = (() => {
  const raw = process.env.PHOTO_STORAGE_LIMIT_BYTES;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0
    ? parsed
    : STORAGE_LIMIT_BYTES_DEFAULT;
})();

/** Types MIME image autorisés à l'upload. */
export const ALLOWED_IMAGE_MIME = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
]);

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

/** Extensions servies par /api/files avec leur Content-Type. */
export const EXT_TO_CONTENT_TYPE: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

/** Déduit l'extension de fichier depuis le type MIME (fallback : nom puis jpg). */
export function extForMime(mime: string, fallbackName?: string): string {
  const fromMime = MIME_TO_EXT[mime?.toLowerCase()];
  if (fromMime) return fromMime;
  if (fallbackName) {
    const ext = fallbackName.split(".").pop()?.toLowerCase();
    if (ext && /^[a-z0-9]{1,5}$/.test(ext)) return ext;
  }
  return "jpg";
}

/**
 * Valide une clé de stockage locale (nom de fichier plat, sans séparateur).
 * Empêche tout path traversal.
 */
export function isSafeStorageKey(key: string): boolean {
  return (
    typeof key === "string" &&
    key.length > 0 &&
    key.length <= 255 &&
    /^[a-zA-Z0-9._-]+$/.test(key) &&
    !key.includes("..")
  );
}

/** Crée le répertoire de stockage s'il n'existe pas. */
export async function ensureUploadDir(): Promise<void> {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

/** Chemin disque absolu pour une clé de stockage (après validation). */
export function diskPathFor(storageKey: string): string {
  const resolved = path.join(UPLOAD_DIR, storageKey);
  // Double garde : le chemin résolu doit rester dans UPLOAD_DIR.
  if (resolved !== UPLOAD_DIR && !resolved.startsWith(UPLOAD_DIR + path.sep)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

/** URL publique servant un fichier stocké localement. */
export function publicUrlFor(storageKey: string): string {
  return `/api/files/${storageKey}`;
}

/**
 * Calcule l'usage réel du disque : somme de la taille des fichiers
 * présents dans UPLOAD_DIR. Source de vérité pour la jauge et le quota.
 */
export async function getStorageUsage(): Promise<StorageUsage> {
  await ensureUploadDir();
  let usedBytes = 0;
  let fileCount = 0;
  const entries = await fs.readdir(UPLOAD_DIR, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    try {
      const stat = await fs.stat(path.join(UPLOAD_DIR, entry.name));
      usedBytes += stat.size;
      fileCount += 1;
    } catch {
      // fichier disparu entre readdir et stat : on ignore
    }
  }
  return { usedBytes, limitBytes: STORAGE_LIMIT_BYTES, fileCount };
}

/** Écrit un buffer sur le disque et renvoie la clé de stockage générée. */
export async function saveBuffer(buffer: Buffer, ext: string): Promise<string> {
  await ensureUploadDir();
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : "jpg";
  const storageKey = `${randomUUID()}.${safeExt}`;
  await fs.writeFile(diskPathFor(storageKey), buffer);
  return storageKey;
}

/**
 * Supprime un fichier stocké localement.
 * Sans effet (silencieux) si la clé n'est pas locale (ex. ancienne clé
 * UploadThing) ou si le fichier n'existe plus.
 */
export async function deleteStoredFile(storageKey: string): Promise<void> {
  if (!isSafeStorageKey(storageKey)) return;
  try {
    await fs.unlink(diskPathFor(storageKey));
  } catch {
    // ENOENT ou clé distante : rien à faire
  }
}
