"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/app/admin/users/actions";

export function CreateUserForm() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");

  function generatePassword() {
    const chars =
      "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pwd = "";
    const arr = new Uint8Array(16);
    crypto.getRandomValues(arr);
    for (let i = 0; i < 16; i++) {
      pwd += chars[arr[i] % chars.length];
    }
    setPassword(pwd);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await createUser({
        email,
        password,
        name: name || undefined,
      });
      if (result.ok) {
        setEmail("");
        setName("");
        setPassword("");
        setOpen(false);
        router.refresh();
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
        + Inviter un utilisateur
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
          Nouvel utilisateur
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
            Email *
          </span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-700">
            Nom (optionnel)
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-neutral-700">
          Mot de passe * (10 caractères minimum)
        </span>
        <div className="flex gap-2">
          <input
            type="text"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-900"
          />
          <button
            type="button"
            onClick={generatePassword}
            className="rounded-md border border-neutral-300 px-3 py-2 text-xs uppercase tracking-wider hover:bg-neutral-100 transition"
          >
            Générer
          </button>
        </div>
        <span className="mt-1 block text-xs text-neutral-500">
          Copie le mot de passe maintenant — il ne sera plus jamais affiché en
          clair.
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
          {isPending ? "Création…" : "Créer le compte"}
        </button>
      </div>
    </form>
  );
}
