import type { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import {
  diskPathFor,
  isSafeStorageKey,
  EXT_TO_CONTENT_TYPE,
} from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ key: string }> },
) {
  const { key } = await ctx.params;

  if (!isSafeStorageKey(key)) {
    return new Response("Bad request", { status: 400 });
  }

  let filePath: string;
  try {
    filePath = diskPathFor(key);
  } catch {
    return new Response("Forbidden", { status: 403 });
  }

  try {
    const file = await fs.readFile(filePath);
    const ext = path.extname(key).slice(1).toLowerCase();
    const contentType = EXT_TO_CONTENT_TYPE[ext] ?? "application/octet-stream";
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(file.byteLength),
        // Les clés sont uniques (UUID) → contenu immuable, cache agressif.
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
