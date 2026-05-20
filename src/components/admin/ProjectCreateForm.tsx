"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/app/admin/projects/actions";

export function ProjectCreateForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await createProject({
        name,
        description: description || undefined,
      });
      if (r.ok) {
        router.push(`/admin/projects/${r.id}`);
      } else {
        setError(r.error);
      }
    });
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="rounded-full border border-neutral-900 px-5 py-2 text-xs uppercase tracking-[0.2em] hover:bg-neutral-900 hover:text-white transition"
      >
        + Nouveau projet
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
          Nouveau projet
        </h2>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-neutral-400 hover:text-neutral-900"
        >
          ×
        </button>
      </header>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-700">
          Nom du projet *
        </span>
        <input
          type="text"
          required
          minLength={2}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Mariage Marie & Tom, Série Reykjavik, etc."
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-700">
          Description (optionnel)
        </span>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          maxLength={2000}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
        />
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
