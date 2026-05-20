"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  updateProject,
  deleteProject,
  addPhotosToProject,
  removePhotoFromProject,
} from "@/app/admin/projects/actions";

type ProjectData = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  coverPhotoId: string | null;
  visible: boolean;
};

type PhotoItem = {
  id: string;
  url: string;
  title: string | null;
  alt: string | null;
};

export function ProjectEditor({
  project,
  selectedPhotos,
  availablePhotos,
}: {
  project: ProjectData;
  selectedPhotos: PhotoItem[];
  availablePhotos: PhotoItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? "");
  const [visible, setVisible] = useState(project.visible);
  const [coverPhotoId, setCoverPhotoId] = useState<string | null>(
    project.coverPhotoId,
  );
  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  function flash(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 1800);
  }

  function handleSave() {
    startTransition(async () => {
      const r = await updateProject({
        id: project.id,
        name,
        description: description || null,
        visible,
        coverPhotoId,
      });
      if (r.ok) {
        flash("Enregistré ✓");
        router.refresh();
      } else {
        flash(`Erreur : ${r.error}`);
      }
    });
  }

  // Auto-sauvegarde immédiate de la couverture (sans avoir à cliquer Enregistrer)
  function handleSetCover(newCoverId: string | null) {
    setCoverPhotoId(newCoverId);
    startTransition(async () => {
      const r = await updateProject({
        id: project.id,
        coverPhotoId: newCoverId,
      });
      if (r.ok) {
        flash(
          newCoverId ? "Couverture définie ✓" : "Couverture retirée",
        );
        router.refresh();
      } else {
        flash(`Erreur : ${r.error}`);
        setCoverPhotoId(project.coverPhotoId); // rollback
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Supprimer définitivement le projet "${project.name}" ? Les photos ne sont pas supprimées.`,
      )
    )
      return;
    startTransition(async () => {
      const r = await deleteProject(project.id);
      if (r.ok) router.push("/admin/projects");
      else flash(`Erreur : ${r.error}`);
    });
  }

  function togglePick(id: string) {
    setPickedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleAddPicked() {
    const ids = Array.from(pickedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const r = await addPhotosToProject(project.id, ids);
      if (r.ok) {
        flash(`${r.added} photo(s) ajoutée(s) ✓`);
        setPickedIds(new Set());
        router.refresh();
      } else {
        flash(`Erreur : ${r.error}`);
      }
    });
  }

  function handleRemove(photoId: string) {
    startTransition(async () => {
      const r = await removePhotoFromProject(project.id, photoId);
      if (r.ok) {
        flash("Retirée");
        router.refresh();
      } else {
        flash(`Erreur : ${r.error}`);
      }
    });
  }

  return (
    <div className="space-y-8">
      {/* Paramètres */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em] text-neutral-500">
          Paramètres
        </h2>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-700">
            Nom
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </label>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-neutral-700">
            Description
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={2000}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </label>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setVisible(!visible)}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition ${
              visible
                ? "border-green-300 bg-green-50 text-green-800"
                : "border-neutral-300 bg-neutral-50 text-neutral-600"
            }`}
          >
            <span
              className={`flex h-4 w-7 items-center rounded-full transition ${
                visible
                  ? "bg-green-600 justify-end"
                  : "bg-neutral-300 justify-start"
              }`}
            >
              <span className="mx-0.5 h-3 w-3 rounded-full bg-white" />
            </span>
            {visible ? "Visible publiquement" : "Masqué"}
          </button>
        </div>
        <div className="mt-6 flex items-center justify-between gap-4 border-t border-neutral-200 pt-4">
          {status && <span className="text-sm text-neutral-700">{status}</span>}
          <div className="ml-auto flex gap-3">
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="rounded-full border border-red-300 px-4 py-2 text-xs uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
            >
              Supprimer
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="rounded-full bg-neutral-900 px-5 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50 transition"
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </section>

      {/* Photos du projet */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <header className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Photos du projet ({selectedPhotos.length})
          </h2>
          {selectedPhotos.length > 0 && (
            <p className="text-xs text-neutral-500">
              Clique sur une photo pour la définir comme couverture (badge ★)
            </p>
          )}
        </header>
        {selectedPhotos.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Aucune photo. Ajoute-en depuis la section ci-dessous.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {selectedPhotos.map((p) => {
                const isCover = coverPhotoId === p.id;
                return (
                  <div
                    key={p.id}
                    className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-100"
                  >
                    <Image
                      src={p.url}
                      alt={p.alt ?? ""}
                      fill
                      sizes="200px"
                      className="object-cover"
                    />
                    {/* Clic sur toute la tile : toggle couverture (auto-sauvegarde) */}
                    <button
                      type="button"
                      onClick={() => handleSetCover(isCover ? null : p.id)}
                      disabled={isPending}
                      aria-label={
                        isCover
                          ? "Retirer comme couverture"
                          : "Définir comme couverture"
                      }
                      title={
                        isCover
                          ? "Couverture actuelle (clic pour retirer)"
                          : "Définir comme couverture"
                      }
                      className={`absolute inset-0 z-10 ring-inset transition ${
                        isCover
                          ? "ring-4 ring-amber-500"
                          : "ring-0 ring-amber-500 hover:ring-2"
                      }`}
                    />
                    {isCover && (
                      <div className="pointer-events-none absolute left-2 top-2 z-20 inline-flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white shadow">
                        ★ Couverture
                      </div>
                    )}
                    {/* Bouton retirer du projet, au-dessus du ring */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemove(p.id);
                      }}
                      disabled={isPending}
                      className="absolute right-1.5 top-1.5 z-30 rounded-full bg-white/95 px-2 py-0.5 text-xs opacity-0 group-hover:opacity-100 transition"
                      title="Retirer du projet"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
            {coverPhotoId && (
              <button
                type="button"
                onClick={() => handleSetCover(null)}
                disabled={isPending}
                className="mt-3 text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline disabled:opacity-50"
              >
                Retirer la couverture personnalisée (utiliser la première photo
                automatiquement)
              </button>
            )}
          </>
        )}
      </section>

      {/* Photo picker */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-500">
              Ajouter des photos
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Sélectionne, puis valide (200 max, exclus les photos clientOnly).
            </p>
          </div>
          {pickedIds.size > 0 && (
            <button
              onClick={handleAddPicked}
              disabled={isPending}
              className="rounded-full bg-neutral-900 px-5 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50 transition"
            >
              Ajouter ({pickedIds.size})
            </button>
          )}
        </header>
        {availablePhotos.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Toutes les photos sont déjà dans ce projet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-6">
            {availablePhotos.map((p) => {
              const picked = pickedIds.has(p.id);
              return (
                <button
                  key={p.id}
                  onClick={() => togglePick(p.id)}
                  className={`group relative aspect-square overflow-hidden rounded-lg bg-neutral-100 ring-2 transition ${
                    picked
                      ? "ring-neutral-900"
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
                    <div className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-neutral-900 text-xs text-white">
                      ✓
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
