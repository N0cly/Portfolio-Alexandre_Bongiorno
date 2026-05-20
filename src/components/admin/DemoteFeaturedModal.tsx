"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

export type FeaturedBrief = {
  id: string;
  url: string;
  title: string | null;
  alt: string | null;
};

export function DemoteFeaturedModal({
  open,
  photos,
  onClose,
  onConfirm,
  isPending,
}: {
  open: boolean;
  photos: FeaturedBrief[];
  onClose: () => void;
  onConfirm: (demotePhotoId: string) => void;
  isPending: boolean;
}) {
  const [pickedId, setPickedId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setPickedId(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="border-b border-neutral-200 px-6 py-4">
          <h2 className="text-lg font-light">
            La sélection est pleine (6 photos max)
          </h2>
          <p className="mt-1 text-sm text-neutral-500">
            Choisis quelle photo retirer de la sélection pour faire de la place
            à la nouvelle. La photo retirée passera en « Galerie uniquement ».
          </p>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {photos.map((p) => {
              const picked = pickedId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPickedId(p.id)}
                  className={`group relative aspect-square overflow-hidden rounded-lg bg-neutral-100 ring-2 transition ${
                    picked
                      ? "ring-red-500"
                      : "ring-transparent hover:ring-neutral-400"
                  }`}
                >
                  <Image
                    src={p.url}
                    alt={p.alt ?? ""}
                    fill
                    sizes="200px"
                    className="object-cover"
                  />
                  {picked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-500/30">
                      <div className="rounded-full bg-white px-3 py-1 text-xs uppercase tracking-wider text-red-700">
                        À retirer
                      </div>
                    </div>
                  )}
                  {p.title && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-1.5">
                      <p className="truncate text-xs text-white">{p.title}</p>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <footer className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="text-sm text-neutral-600 hover:text-neutral-900"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => pickedId && onConfirm(pickedId)}
            disabled={!pickedId || isPending}
            className="rounded-full bg-red-600 px-5 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-red-700 disabled:opacity-50 transition"
          >
            {isPending ? "Application…" : "Confirmer et remplacer"}
          </button>
        </footer>
      </div>
    </div>
  );
}
