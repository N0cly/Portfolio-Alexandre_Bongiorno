"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type NavLink = {
  href: string;
  label: string;
  external?: boolean;
  id?: string;
};

// Courbe d'easing « ease-out-expo » — douce, naturelle, premium
const SMOOTH_EASE = "cubic-bezier(0.16, 1, 0.3, 1)";

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
        className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-900 transition md:hidden"
      >
        <span className="flex flex-col gap-[6px]">
          <span className="block h-px w-6 bg-neutral-100" />
          <span className="block h-px w-6 bg-neutral-100" />
        </span>
      </button>

      {/* Overlay — fade smooth + léger scale */}
      <div
        className="fixed top-0 left-0 right-0 inset-0 z-60 flex flex-col bg-[#fafaf8] md:hidden"
        style={{
          opacity: open ? 1 : 0,
          transform: open ? "scale(1)" : "scale(1.02)",
          transformOrigin: "top right",
          transition: `opacity 600ms ${SMOOTH_EASE}, transform 600ms ${SMOOTH_EASE}`,
          pointerEvents: open ? "auto" : "none",
          willChange: "opacity, transform",
        }}
        aria-hidden={!open}
      >
        {/* Header overlay : close button */}
        <div
          className="flex items-center justify-end px-6 py-5"
          style={{
            opacity: open ? 1 : 0,
            transition: `opacity 400ms ${SMOOTH_EASE}`,
            transitionDelay: open ? "150ms" : "0ms",
          }}
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label="Fermer le menu"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-neutral-200/60 transition hover:bg-neutral-300/80"
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

        {/* Liens centrés avec stagger très smooth */}
        <nav className="flex flex-1 flex-col items-center justify-center gap-8 bg-[#fafaf8] px-8 pb-24">
          {links.map((link, i) => {
            // À l'ouverture : stagger doux par index, du 1er au dernier
            // À la fermeture : stagger inverse plus rapide (le dernier disparaît en premier)
            const enterDelay = 250 + i * 90;
            const exitDelay = (links.length - 1 - i) * 30;
            const className =
              "text-4xl font-light tracking-tight text-neutral-900 hover:opacity-70";
            const style: React.CSSProperties = {
              fontFamily: "var(--font-serif)",
              opacity: open ? 1 : 0,
              transform: open ? "translateY(0)" : "translateY(20px)",
              transition: `opacity 700ms ${SMOOTH_EASE}, transform 700ms ${SMOOTH_EASE}`,
              transitionDelay: `${open ? enterDelay : exitDelay}ms`,
              willChange: "opacity, transform",
            };

            if (link.external) {
              return (
                <a
                  key={link.href}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setOpen(false)}
                  className={className}
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
                className={className}
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
