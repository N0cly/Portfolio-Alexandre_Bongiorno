"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type NavItem = {
  href: string;
  label: string;
  showUnread?: boolean;
};

export function AdminShell({
  navItems,
  email,
  unreadCount,
  onSignOut,
  children,
}: {
  navItems: NavItem[];
  email: string | null;
  unreadCount: number;
  onSignOut: () => Promise<void>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Ferme automatiquement le drawer au changement de page (mobile)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // Bloque le scroll quand le drawer est ouvert (mobile)
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // ESC pour fermer le drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const currentTitle =
    navItems.find((n) => {
      if (n.href === "/admin") return pathname === "/admin";
      return pathname.startsWith(n.href);
    })?.label ?? "Admin";

  return (
    <div className="flex min-h-screen items-start bg-neutral-100 text-neutral-900">
      {/* Topbar mobile : visible < md */}
      <div className="fixed left-0 right-0 top-0 z-30 flex items-center justify-between border-b border-neutral-200 bg-white/90 px-4 py-3 backdrop-blur md:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Ouvrir le menu admin"
          className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-neutral-100 transition"
        >
          <span className="flex flex-col gap-[5px]">
            <span className="block h-[2px] w-5 rounded-full bg-neutral-900" />
            <span className="block h-[2px] w-5 rounded-full bg-neutral-900" />
            <span className="block h-[2px] w-5 rounded-full bg-neutral-900" />
          </span>
        </button>
        <span className="text-sm font-medium text-neutral-900">
          {currentTitle}
        </span>
        {unreadCount > 0 && (
          <Link
            href="/admin/messages"
            aria-label={`${unreadCount} messages non lus`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md hover:bg-neutral-100 transition"
          >
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-600" />
            </span>
          </Link>
        )}
        {unreadCount === 0 && <span className="h-10 w-10" /> /* spacer */}
      </div>

      {/* Backdrop mobile */}
      <div
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity duration-300 md:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      />

      {/* Sidebar : sticky sur desktop, drawer animé sur mobile */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 shrink-0 flex-col border-r border-neutral-200 bg-white p-6 shadow-2xl transition-transform duration-300 ease-out md:sticky md:top-0 md:z-auto md:h-screen md:w-60 md:translate-x-0 md:shadow-none ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="mb-8 flex items-start justify-between shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-light text-neutral-900">Admin</h2>
            {email && (
              <p className="text-xs text-neutral-500 truncate">{email}</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="md:hidden inline-flex h-9 w-9 items-center justify-center rounded-md hover:bg-neutral-100 transition"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const active =
              item.href === "/admin"
                ? pathname === "/admin"
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center justify-between rounded-md px-3 py-2 text-sm transition ${
                  active
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900"
                }`}
              >
                <span>{item.label}</span>
                {item.showUnread && unreadCount > 0 && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      active ? "bg-white text-neutral-900" : "bg-blue-600 text-white"
                    }`}
                  >
                    {unreadCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 shrink-0 space-y-1 border-t border-neutral-200 pt-4">
          <form
            action={async () => {
              await onSignOut();
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
            className="block rounded-md px-3 py-2 text-sm text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900 transition"
          >
            ← Retour au site
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="min-w-0 flex-1 p-4 pt-20 text-neutral-900 md:p-8 md:pt-8">
        {children}
      </main>
    </div>
  );
}
