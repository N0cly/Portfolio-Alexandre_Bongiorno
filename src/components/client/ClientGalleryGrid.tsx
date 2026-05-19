"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";

export type ClientPhoto = {
  id: string;
  url: string;
  title: string | null;
  alt: string | null;
  width: number | null;
  height: number | null;
};

export function ClientGalleryGrid({ photos }: { photos: ClientPhoto[] }) {
  const [index, setIndex] = useState<number | null>(null);

  const close = useCallback(() => setIndex(null), []);
  const prev = useCallback(() => {
    setIndex((i) =>
      i === null ? null : (i - 1 + photos.length) % photos.length,
    );
  }, [photos.length]);
  const next = useCallback(() => {
    setIndex((i) => (i === null ? null : (i + 1) % photos.length));
  }, [photos.length]);

  // Bloque le scroll quand la lightbox est ouverte
  useEffect(() => {
    if (index === null) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [index]);

  // Navigation clavier
  useEffect(() => {
    if (index === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [index, close, prev, next]);

  const current = index !== null ? photos[index] : null;

  return (
    <>
      {/* Grid */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {photos.map((photo, i) => (
          <figure
            key={photo.id}
            className="group relative overflow-hidden bg-neutral-100"
          >
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="block w-full"
              aria-label={`Voir ${photo.title ?? "la photo"} en grand`}
            >
              <div className="relative aspect-[4/5] w-full">
                <Image
                  src={photo.url}
                  alt={photo.alt ?? ""}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="object-cover transition duration-700 group-hover:scale-[1.03]"
                />
              </div>
            </button>
            <a
              href={photo.url}
              download
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="absolute right-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs uppercase tracking-wider opacity-0 group-hover:opacity-100 hover:bg-white transition"
            >
              ↓ Télécharger
            </a>
            {photo.title && (
              <figcaption
                className="mt-3 text-sm italic text-neutral-500"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {photo.title}
              </figcaption>
            )}
          </figure>
        ))}
      </div>

      {/* Lightbox éditorial — cream, serif, sobre (style /photo/[slug]) */}
      {current && (
        <div
          className="fixed inset-0 z-[80] flex flex-col bg-[#fafaf8] text-neutral-900"
          onClick={close}
          role="dialog"
          aria-modal="true"
          aria-label={current.title ?? "Photo en grand"}
        >
          {/* Top bar : compteur + télécharger à gauche, close à droite */}
          <div
            className="flex items-center justify-between border-b border-neutral-200 px-6 py-5 md:px-10 md:py-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-4 text-xs uppercase tracking-[0.2em] text-neutral-500">
              <span>
                {String((index ?? 0) + 1).padStart(2, "0")} /{" "}
                {String(photos.length).padStart(2, "0")}
              </span>
              <a
                href={current.url}
                download
                target="_blank"
                rel="noopener noreferrer"
                className="text-neutral-700 underline-offset-4 transition hover:text-neutral-900 hover:underline"
              >
                ↓ Télécharger
              </a>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Fermer"
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

          {/* Zone photo + flèches */}
          <div
            className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-8 md:px-20 md:py-12"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  prev();
                }}
                aria-label="Photo précédente"
                className="absolute left-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-200/60 hover:text-neutral-900 md:flex"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
            )}

            {/* Photo */}
            <div className="flex max-h-full max-w-full flex-col items-center">
              <Image
                src={current.url}
                alt={current.alt ?? ""}
                width={current.width ?? 1800}
                height={current.height ?? 1200}
                className="max-h-[80vh] w-auto object-contain"
                priority
              />
              {current.title && (
                <p
                  className="mt-6 text-center text-base italic text-neutral-500"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {current.title}
                </p>
              )}
            </div>

            {/* Next */}
            {photos.length > 1 && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  next();
                }}
                aria-label="Photo suivante"
                className="absolute right-4 top-1/2 hidden h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-200/60 hover:text-neutral-900 md:flex"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            )}
          </div>

          {/* Mobile prev/next en bas */}
          {photos.length > 1 && (
            <div
              className="flex items-center justify-between border-t border-neutral-200 px-6 py-4 md:hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={prev}
                className="text-xs uppercase tracking-[0.2em] text-neutral-500 transition hover:text-neutral-900"
              >
                ← Précédente
              </button>
              <button
                type="button"
                onClick={next}
                className="text-xs uppercase tracking-[0.2em] text-neutral-500 transition hover:text-neutral-900"
              >
                Suivante →
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
