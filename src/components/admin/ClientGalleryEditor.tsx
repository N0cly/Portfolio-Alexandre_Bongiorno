"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  updateClientGallery,
  deleteClientGallery,
  addPhotosToGallery,
  removePhotoFromGallery,
} from "@/app/admin/client-galleries/actions";
import { ClientGalleryUploader } from "./ClientGalleryUploader";

type GalleryData = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  expiresAt: string | null;
  viewCount: number;
  lastViewedAt: string | null;
};

type PhotoItem = {
  id: string;
  url: string;
  title: string | null;
  alt: string | null;
};

export function ClientGalleryEditor({
  gallery,
  selectedPhotos,
  availablePhotos,
}: {
  gallery: GalleryData;
  selectedPhotos: PhotoItem[];
  availablePhotos: PhotoItem[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<string | null>(null);

  const [name, setName] = useState(gallery.name);
  const [description, setDescription] = useState(gallery.description ?? "");
  const [expiresAt, setExpiresAt] = useState(gallery.expiresAt ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [showPasswordField, setShowPasswordField] = useState(false);

  const [pickedIds, setPickedIds] = useState<Set<string>>(new Set());

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/client/${gallery.slug}`
      : `/client/${gallery.slug}`;

  function flashStatus(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 1800);
  }

  function handleSaveSettings() {
    startTransition(async () => {
      const result = await updateClientGallery({
        id: gallery.id,
        name,
        description: description || null,
        expiresAt: expiresAt || null,
        password: newPassword || undefined,
      });
      if (result.ok) {
        flashStatus("Enregistré ✓");
        setNewPassword("");
        setShowPasswordField(false);
        router.refresh();
      } else {
        flashStatus(`Erreur : ${result.error}`);
      }
    });
  }

  function handleDelete() {
    if (
      !confirm(
        `Supprimer définitivement la galerie "${gallery.name}" ? Les photos ne sont pas supprimées, seul le lien client est révoqué.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteClientGallery(gallery.id);
      if (result.ok) {
        router.push("/admin/client-galleries");
      } else {
        flashStatus(`Erreur : ${result.error}`);
      }
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
      const result = await addPhotosToGallery(gallery.id, ids);
      if (result.ok) {
        flashStatus(`${result.added} photo(s) ajoutée(s) ✓`);
        setPickedIds(new Set());
        router.refresh();
      } else {
        flashStatus(`Erreur : ${result.error}`);
      }
    });
  }

  function handleRemove(photoId: string) {
    startTransition(async () => {
      const result = await removePhotoFromGallery(gallery.id, photoId);
      if (result.ok) {
        flashStatus("Retirée");
        router.refresh();
      } else {
        flashStatus(`Erreur : ${result.error}`);
      }
    });
  }

  async function copyLink() {
    await navigator.clipboard.writeText(publicUrl);
    flashStatus("Lien copié ✓");
  }

  return (
    <div className="space-y-8">
      {/* Lien partageable */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-3 text-sm uppercase tracking-[0.2em] text-neutral-500">
          Lien à partager
        </h2>
        <div className="flex flex-wrap items-center gap-3">
          <code className="flex-1 min-w-0 truncate rounded-md bg-neutral-50 px-3 py-2 font-mono text-sm">
            {publicUrl}
          </code>
          <button
            onClick={copyLink}
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs uppercase tracking-[0.2em] hover:bg-neutral-100 transition"
          >
            Copier
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs uppercase tracking-[0.2em] hover:bg-neutral-100 transition"
          >
            Ouvrir
          </a>
        </div>
        <p className="mt-3 text-xs text-neutral-500">
          Le client devra entrer le mot de passe pour accéder. {gallery.viewCount}{" "}
          vue{gallery.viewCount > 1 ? "s" : ""} enregistrée(s).
        </p>
      </section>

      {/* Paramètres */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em] text-neutral-500">
          Paramètres
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
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
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-neutral-700">
              Date d'expiration
            </span>
            <input
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
          </label>
        </div>
        <label className="mt-4 block">
          <span className="mb-1 block text-xs font-medium text-neutral-700">
            Description (note interne)
          </span>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </label>

        <div className="mt-4">
          {showPasswordField ? (
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-neutral-700">
                Nouveau mot de passe
              </span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  placeholder="6 caractères min."
                  className="flex-1 rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-900"
                />
                <button
                  type="button"
                  onClick={() => {
                    setNewPassword("");
                    setShowPasswordField(false);
                  }}
                  className="text-xs text-neutral-500 hover:text-neutral-900"
                >
                  Annuler
                </button>
              </div>
            </label>
          ) : (
            <button
              type="button"
              onClick={() => setShowPasswordField(true)}
              className="text-xs uppercase tracking-[0.2em] text-neutral-600 hover:text-neutral-900 transition"
            >
              Changer le mot de passe →
            </button>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between gap-4 border-t border-neutral-200 pt-4">
          <div className="flex items-center gap-3">
            {status && <span className="text-sm text-neutral-700">{status}</span>}
          </div>
          <div className="flex gap-3">
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
              onClick={handleSaveSettings}
              disabled={isPending}
              className="rounded-full bg-neutral-900 px-5 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50 transition"
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </div>
      </section>

      {/* Upload de photos privées (clientOnly) */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <header className="mb-4">
          <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Upload de photos privées
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Ces photos seront exclusivement visibles dans cette galerie client
            (jamais sur le site public). Idéal pour livrer un shooting privé
            sans ajouter les photos à ton portfolio.
          </p>
        </header>
        <ClientGalleryUploader galleryId={gallery.id} />
      </section>

      {/* Photos dans la galerie */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <h2 className="mb-4 text-sm uppercase tracking-[0.2em] text-neutral-500">
          Photos dans la galerie ({selectedPhotos.length})
        </h2>
        {selectedPhotos.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Aucune photo. Sélectionne-en depuis la section ci-dessous.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3 md:grid-cols-5 lg:grid-cols-6">
            {selectedPhotos.map((p) => (
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
                <button
                  onClick={() => handleRemove(p.id)}
                  disabled={isPending}
                  className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-xs opacity-0 group-hover:opacity-100 transition"
                  title="Retirer"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Photo picker — ajoute des photos du portfolio existant */}
      <section className="rounded-2xl border border-neutral-200 bg-white p-6">
        <header className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-500">
              Ajouter depuis le portfolio
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              Sélectionne des photos déjà présentes dans ton portfolio. Pour
              uploader des photos uniquement pour ce client, utilise la section
              ci-dessus.
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
            Toutes les photos sont déjà dans cette galerie.
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
