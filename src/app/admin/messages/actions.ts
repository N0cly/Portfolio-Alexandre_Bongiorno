"use server";

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { contactSubmissions } from "@/lib/db/schema";

const statusSchema = z.enum(["new", "read", "replied", "archived"]);

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
}

function bump() {
  revalidatePath("/admin/messages");
  revalidatePath("/admin", "layout");
}

export async function updateMessageStatus(
  id: string,
  status: z.infer<typeof statusSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    if (!statusSchema.safeParse(status).success) {
      return { ok: false, error: "Statut invalide" };
    }
    await db
      .update(contactSubmissions)
      .set({ status })
      .where(eq(contactSubmissions.id, id));
    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function bulkUpdateStatus(
  ids: string[],
  status: z.infer<typeof statusSchema>,
): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    if (ids.length === 0) return { ok: true, updated: 0 };
    if (!statusSchema.safeParse(status).success) {
      return { ok: false, error: "Statut invalide" };
    }
    const result = await db
      .update(contactSubmissions)
      .set({ status })
      .where(inArray(contactSubmissions.id, ids))
      .returning({ id: contactSubmissions.id });
    bump();
    return { ok: true, updated: result.length };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function deleteMessage(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    await db.delete(contactSubmissions).where(eq(contactSubmissions.id, id));
    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function bulkDelete(
  ids: string[],
): Promise<{ ok: true; deleted: number } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    if (ids.length === 0) return { ok: true, deleted: 0 };
    const result = await db
      .delete(contactSubmissions)
      .where(inArray(contactSubmissions.id, ids))
      .returning({ id: contactSubmissions.id });
    bump();
    return { ok: true, deleted: result.length };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
