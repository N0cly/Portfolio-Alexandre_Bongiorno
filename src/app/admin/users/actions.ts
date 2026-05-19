"use server";

import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { hash } from "bcryptjs";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  return session;
}

function bump() {
  revalidatePath("/admin/users");
}

const createSchema = z.object({
  email: z.string().email().max(200),
  password: z.string().min(10).max(200),
  name: z.string().max(100).optional(),
});

export async function createUser(
  input: z.infer<typeof createSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const parsed = createSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          "Email invalide ou mot de passe trop court (10 caractères minimum)",
      };
    }

    // Vérifie unicité
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, parsed.data.email))
      .limit(1);
    if (existing.length > 0) {
      return { ok: false, error: "Cet email est déjà utilisé" };
    }

    const passwordHash = await hash(parsed.data.password, 12);
    await db.insert(users).values({
      email: parsed.data.email,
      passwordHash,
      name: parsed.data.name ?? null,
      role: "admin",
    });

    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

const updateSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email().max(200).optional(),
  name: z.string().max(100).nullable().optional(),
  password: z.string().min(10).max(200).optional(),
});

export async function updateUser(
  input: z.infer<typeof updateSchema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireAdmin();
    const parsed = updateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error:
          "Champs invalides (email valide requis, mot de passe ≥ 10 caractères)",
      };
    }

    const { id, password, ...rest } = parsed.data;
    const patch: Record<string, unknown> = { ...rest };

    if (password) {
      patch.passwordHash = await hash(password, 12);
    }

    // Vérifie unicité de l'email si changé
    if (parsed.data.email) {
      const existing = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, parsed.data.email))
        .limit(1);
      if (existing.length > 0 && existing[0].id !== id) {
        return { ok: false, error: "Cet email est déjà utilisé" };
      }
    }

    await db.update(users).set(patch).where(eq(users.id, id));
    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}

export async function deleteUser(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const session = await requireAdmin();

    // Empêche de se supprimer soi-même
    if (session.user?.email) {
      const [self] = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.email, session.user.email))
        .limit(1);
      if (self?.id === id) {
        return {
          ok: false,
          error: "Tu ne peux pas supprimer ton propre compte.",
        };
      }
    }

    // Empêche de supprimer le dernier compte
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(users);
    if (count <= 1) {
      return {
        ok: false,
        error: "Impossible de supprimer le dernier compte admin.",
      };
    }

    await db.delete(users).where(eq(users.id, id));
    bump();
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur",
    };
  }
}
