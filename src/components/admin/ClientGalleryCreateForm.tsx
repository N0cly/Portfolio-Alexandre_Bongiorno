"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClientGallery } from "@/app/admin/client-galleries/actions";

export function ClientGalleryCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createClientGallery({
        name,
        password,
        description: description || undefined,
        expiresAt: expiresAt || undefined,
      });
      if (result.ok) {
        router.push(`/admin/client-galleries/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-neutral-900 px-5 py-2 text-xs uppercase tracking-[0.2em] hover:bg-neutral-900 hover:text-white transition"
      >
        + Nouvelle galerie cliente
      </button>
    );
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-500">
          Nouvelle galerie
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-neutral-400 hover:text-neutral-900"
          aria-label="Fermer"
        >
          ×
        </button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-700">
            Nom de la galerie *
          </span>
          <input
            type="text"
            required
            minLength={2}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Mariage Marie & Tom"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-700">
            Mot de passe *
          </span>
          <input
            type="text"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="6 caractères minimum"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-900"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-700">
          Description (optionnel)
        </span>
        <input
          type="text"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Note interne pour te rappeler le contexte"
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-700">
          Date d'expiration (optionnel)
        </span>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          min={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
        <span className="mt-1 block text-xs text-neutral-500">
          Après cette date, le mot de passe ne fonctionnera plus.
        </span>
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-4">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          Annuler
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-neutral-900 px-5 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50 transition"
        >
          {isPending ? "Création…" : "Créer"}
        </button>
      </div>
    </form>
  );
}
