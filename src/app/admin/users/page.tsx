import { desc } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { UsersList } from "@/components/admin/UsersList";
import { CreateUserForm } from "@/components/admin/CreateUserForm";

export const dynamic = "force-dynamic";

async function getUsers() {
  try {
    return await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        createdAt: users.createdAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  } catch {
    return [];
  }
}

export default async function UsersAdminPage() {
  const [session, list] = await Promise.all([auth(), getUsers()]);
  const currentEmail = session?.user?.email ?? null;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-light">Utilisateurs</h1>
        <p className="text-sm text-neutral-500">
          Donne accès au panel admin à plusieurs personnes. Tous les comptes ont
          les mêmes droits.
        </p>
      </header>

      <CreateUserForm />

      <UsersList
        users={list.map((u) => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          createdAt: u.createdAt.toISOString(),
          isCurrent: u.email === currentEmail,
        }))}
      />
    </div>
  );
}
