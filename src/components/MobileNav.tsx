"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NavLink = {
  href: string;
  label: string;
  external?: boolean;
  id?: string;
};

export function MobileNav({ links }: { links: NavLink[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* Bouton burger — visible uniquement < md */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={open}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-100 md:hidden"
      >
        <span className="flex flex-col gap-[6px]">
          <span className="block h-px w-6 bg-neutral-900" />
          <span className="block h-px w-6 bg-neutral-900" />
        </span>
      </button>

      {/* Overlay — fixed donc indépendant du flow ; md:hidden pour ne jamais apparaître desktop */}
      <div
        className={`fixed inset-0 z-[60] flex flex-col bg-[#fafaf8] transition-opacity duration-300 ease-out md:hidden ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
        aria-hidden={!open}
      >
        {/* Header overlay : close button */}
        <div className="flex items-center justify-end px-6 py-5">
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full transition hover:bg-neutral-200/60"
          >
            <svg
              width="22"
              height="22"
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

        {/* Liens centrés */}
        <nav className="flex flex-1 flex-col items-center justify-center gap-8 px-8 pb-24">
          {links.map((link, i) => {
            const baseClass =
              "text-4xl font-light tracking-tight text-neutral-900 transition-all duration-500 ease-out";
            const stateClass = open
              ? "opacity-100 translate-y-0"
              : "opacity-0 translate-y-4";
            const style: React.CSSProperties = {
              fontFamily: "var(--font-serif)",
              transitionDelay: open ? `${120 + i * 70}ms` : "0ms",
            };

            if (link.external) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className={`${baseClass} ${stateClass}`}
                  style={style}
                  data-track-link={link.id}
                >
                  {link.label}
                </a>
              );
            }

            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className={`${baseClass} ${stateClass}`}
                style={style}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </>
  );
}
