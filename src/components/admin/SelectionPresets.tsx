"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  saveCurrentAsPreset,
  applyPreset,
  deletePreset,
  renamePreset,
  overwritePresetWithCurrent,
} from "@/app/admin/photos/preset-actions";

type Preset = {
  id: string;
  name: string;
  photoCount: number;
  updatedAt: string;
  photos: { id: string; url: string }[];
};

export function SelectionPresets({ presets }: { presets: Preset[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 2000);
  }

  function handleSave() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const r = await saveCurrentAsPreset(newName);
      if (r.ok) {
        flash("Preset sauvegardé ✓");
        setNewName("");
        setCreating(false);
        router.refresh();
      } else {
        flash(`Erreur : ${r.error}`);
      }
    });
  }

  function handleApply(preset: Preset) {
    if (
      !confirm(
        `Appliquer le preset "${preset.name}" ? Les photos actuellement en sélection seront déplacées en galerie et remplacées par les ${preset.photoCount} photo(s) de ce preset.`,
      )
    )
      return;
    startTransition(async () => {
      const r = await applyPreset(preset.id, { useFirstAsHero: true });
      if (r.ok) {
        flash(`✓ Preset appliqué (${r.applied} photo(s))`);
        router.refresh();
      } else {
        flash(`Erreur : ${r.error}`);
      }
    });
  }

  function handleDelete(preset: Preset) {
    if (!confirm(`Supprimer le preset "${preset.name}" ?`)) return;
    startTransition(async () => {
      const r = await deletePreset(preset.id);
      if (r.ok) {
        flash("Preset supprimé");
        router.refresh();
      } else {
        flash(`Erreur : ${r.error}`);
      }
    });
  }

  function handleOverwrite(preset: Preset) {
    if (
      !confirm(
        `Mettre à jour "${preset.name}" avec la sélection actuelle ? L'ancienne sélection du preset sera écrasée.`,
      )
    )
      return;
    startTransition(async () => {
      const r = await overwritePresetWithCurrent(preset.id);
      if (r.ok) {
        flash("Preset mis à jour ✓");
        router.refresh();
      } else {
        flash(`Erreur : ${r.error}`);
      }
    });
  }

  function handleRenameSubmit(id: string) {
    if (!renameValue.trim()) return;
    startTransition(async () => {
      const r = await renamePreset({ id, name: renameValue });
      if (r.ok) {
        flash("Renommé ✓");
        setRenaming(null);
        router.refresh();
      } else {
        flash(`Erreur : ${r.error}`);
      }
    });
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Presets de sélection
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Sauvegarde plusieurs configurations de sélection pour les
            réappliquer en un clic.
          </p>
        </div>
        {!creating && (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="rounded-full border border-neutral-900 px-4 py-1.5 text-xs uppercase tracking-[0.2em] hover:bg-neutral-900 hover:text-white transition"
          >
            + Sauvegarder la sélection actuelle
          </button>
        )}
      </header>

      {creating && (
        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-3">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Nom du preset (ex : Été 2026, Mode, Sombre…)"
            maxLength={80}
            autoFocus
            className="min-w-[200px] flex-1 rounded-md border border-neutral-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-neutral-900"
          />
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending || !newName.trim()}
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50 transition"
          >
            Sauvegarder
          </button>
          <button
            type="button"
            onClick={() => {
              setCreating(false);
              setNewName("");
            }}
            className="text-xs text-neutral-500 hover:text-neutral-900"
          >
            Annuler
          </button>
        </div>
      )}

      {status && (
        <p className="mt-3 text-sm text-neutral-700">{status}</p>
      )}

      {presets.length === 0 ? (
        <p className="mt-4 text-sm text-neutral-500">
          Aucun preset enregistré. Configure ta sélection puis sauvegarde-la.
        </p>
      ) : (
        <ul className="mt-4 space-y-3">
          {presets.map((preset) => (
            <li
              key={preset.id}
              className="rounded-lg border border-neutral-200 bg-neutral-50 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  {renaming === preset.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={renameValue}
                        onChange={(e) => setRenameValue(e.target.value)}
                        autoFocus
                        className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm outline-none focus:border-neutral-900"
                      />
                      <button
                        onClick={() => handleRenameSubmit(preset.id)}
                        className="text-xs text-neutral-700 underline-offset-4 hover:underline"
                      >
                        OK
                      </button>
                      <button
                        onClick={() => setRenaming(null)}
                        className="text-xs text-neutral-500 hover:text-neutral-900"
                      >
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <p className="font-medium text-neutral-900">{preset.name}</p>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {preset.photoCount} photo(s) ·{" "}
                    {new Date(preset.updatedAt).toLocaleDateString("fr-FR", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleApply(preset)}
                    disabled={isPending}
                    className="rounded-full bg-neutral-900 px-3 py-1 text-xs uppercase tracking-wider text-white hover:bg-neutral-700 disabled:opacity-50"
                  >
                    Appliquer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOverwrite(preset)}
                    disabled={isPending}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-xs uppercase tracking-wider hover:bg-white"
                    title="Remplace ce preset avec la sélection actuelle"
                  >
                    ↻ Maj
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenaming(preset.id);
                      setRenameValue(preset.name);
                    }}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-xs uppercase tracking-wider hover:bg-white"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(preset)}
                    disabled={isPending}
                    className="rounded-full border border-red-300 px-3 py-1 text-xs uppercase tracking-wider text-red-700 hover:bg-red-50 disabled:opacity-50"
                  >
                    ✕
                  </button>
                </div>
              </div>
              {preset.photos.length > 0 && (
                <div className="mt-3 flex gap-1.5 overflow-x-auto">
                  {preset.photos.slice(0, 8).map((p) => (
                    <div
                      key={p.id}
                      className="relative h-14 w-14 shrink-0 overflow-hidden rounded bg-neutral-200"
                    >
                      <Image
                        src={p.url}
                        alt=""
                        fill
                        sizes="56px"
                        className="object-cover"
                      />
                    </div>
                  ))}
                  {preset.photos.length > 8 && (
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded bg-neutral-200 text-xs text-neutral-600">
                      +{preset.photos.length - 8}
                    </div>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
