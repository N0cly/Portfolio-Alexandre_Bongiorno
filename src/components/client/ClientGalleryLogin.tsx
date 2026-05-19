"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { authenticateClientGallery } from "@/app/(public)/client/[slug]/actions";

export function ClientGalleryLogin({ slug }: { slug: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await authenticateClientGallery({ slug, password });
      if (result.ok) {
        router.refresh();
      } else {
        setError(result.error);
        setPassword("");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
    >
      <label className="block">
        <span className="mb-2 block text-xs uppercase tracking-[0.2em] text-neutral-500">
          Mot de passe
        </span>
        <input
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          autoFocus
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-base outline-none focus:border-neutral-900"
        />
      </label>

      {error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !password}
        className="w-full rounded-full bg-neutral-900 px-6 py-3 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50 transition"
      >
        {isPending ? "Vérification…" : "Accéder à la galerie"}
      </button>

      <p className="text-center text-xs text-neutral-500">
        Lien obtenu auprès du photographe.
      </p>
    </form>
  );
}
