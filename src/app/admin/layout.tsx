import { auth, signOut } from "@/lib/auth";
import { getUnreadMessagesCount } from "@/lib/messages";
import { AdminShell } from "@/components/admin/AdminShell";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/projects", label: "Projets" },
  { href: "/admin/client-galleries", label: "Galeries clients" },
  { href: "/admin/messages", label: "Messages", showUnread: true },
  { href: "/admin/stats", label: "Statistiques" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/settings", label: "Paramètres" },
];

async function handleSignOut() {
  "use server";
  await signOut({ redirectTo: "/" });
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, unreadCount] = await Promise.all([
    auth(),
    getUnreadMessagesCount(),
  ]);

  return (
    <AdminShell
      navItems={navItems}
      email={session?.user?.email ?? null}
      unreadCount={unreadCount}
      onSignOut={handleSignOut}
    >
      {children}
    </AdminShell>
  );
}
