import Link from "next/link";
import { auth, signOut } from "@/lib/auth";
import { getUnreadMessagesCount } from "@/lib/messages";

const navItems = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/photos", label: "Photos" },
  { href: "/admin/client-galleries", label: "Galeries clients" },
  { href: "/admin/messages", label: "Messages", showUnread: true },
  { href: "/admin/stats", label: "Statistiques" },
  { href: "/admin/users", label: "Utilisateurs" },
  { href: "/admin/settings", label: "Paramètres" },
];

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
    <div className="flex min-h-screen bg-neutral-100 text-neutral-900">
      <aside className="w-60 border-r border-neutral-200 bg-white p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-lg font-light text-neutral-900">Admin</h2>
          {session?.user?.email && (
            <p className="text-xs text-neutral-500 truncate">
              {session.user.email}
            </p>
          )}
        </div>

        <nav className="space-y-1 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-md px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900 transition"
            >
              <span>{item.label}</span>
              {item.showUnread && unreadCount > 0 && (
                <span className="rounded-full bg-blue-600 px-2 py-0.5 text-[10px] font-medium text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="w-full rounded-md px-3 py-2 text-left text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition"
          >
            Se déconnecter
          </button>
        </form>

        <Link
          href="/"
          className="mt-2 rounded-md px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition"
        >
          ← Retour au site
        </Link>
      </aside>

      <main className="flex-1 p-8 text-neutral-900">{children}</main>
    </div>
  );
}
