import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { pageViews, interactions } from "@/lib/db/schema";
import { z } from "zod";

const trackSchema = z.object({
  type: z.enum(["pageview", "interaction"]),
  path: z.string().optional(),
  referrer: z.string().optional(),
  interactionType: z.string().optional(),
  targetId: z.string().optional(),
  targetType: z.string().optional(),
  sessionId: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = trackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const ua = req.headers.get("user-agent") ?? null;

  try {
    if (parsed.data.type === "pageview") {
      await db.insert(pageViews).values({
        path: parsed.data.path ?? "/",
        referrer: parsed.data.referrer ?? null,
        userAgent: ua,
        sessionId: parsed.data.sessionId ?? null,
      });
    } else {
      await db.insert(interactions).values({
        type: parsed.data.interactionType ?? "click",
        targetId: parsed.data.targetId ?? null,
        targetType: parsed.data.targetType ?? null,
        path: parsed.data.path ?? null,
        sessionId: parsed.data.sessionId ?? null,
        metadata: parsed.data.metadata ?? {},
      });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Insert failed" },
      { status: 500 },
    );
  }
}
