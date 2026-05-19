import "server-only";
import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

const COOKIE_PREFIX = "cga-";

function getSecret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET missing");
  return s;
}

function sign(galleryId: string): string {
  return createHmac("sha256", getSecret()).update(galleryId).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export async function grantClientGalleryAccess(
  galleryId: string,
  expiresAt: Date | null,
): Promise<void> {
  const store = await cookies();
  const maxAge = expiresAt
    ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
    : 60 * 60 * 24 * 30; // 30 jours
  store.set(`${COOKIE_PREFIX}${galleryId}`, sign(galleryId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge,
    path: "/",
  });
}

export async function revokeClientGalleryAccess(
  galleryId: string,
): Promise<void> {
  const store = await cookies();
  store.delete(`${COOKIE_PREFIX}${galleryId}`);
}

export async function hasClientGalleryAccess(
  galleryId: string,
): Promise<boolean> {
  try {
    const store = await cookies();
    const cookie = store.get(`${COOKIE_PREFIX}${galleryId}`);
    if (!cookie) return false;
    return safeEqual(cookie.value, sign(galleryId));
  } catch {
    return false;
  }
}
