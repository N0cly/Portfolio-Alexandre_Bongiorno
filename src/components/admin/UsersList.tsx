"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUser, deleteUser } from "@/app/admin/users/actions";

type UserRow = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  createdAt: string;
  isCurrent: boolean;
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function UsersList({ users }: { users: UserRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  function flashStatus(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 1800);
  }

  function handleDelete(user: UserRow) {
    if (
      !confirm(
        `Supprimer définitivement le compte de ${user.email} ?\n\nIl ne pourra plus se connecter.`,
      )
    )
      return;
    startTransition(async () => {
      const result = await deleteUser(user.id);
      if (result.ok) {
        flashStatus("Compte supprimé");
        router.refresh();
      } else {
        flashStatus(`Erreur : ${result.error}`);
      }
    });
  }

  if (users.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-neutral-300 p-12 text-center text-sm text-neutral-500">
        Aucun utilisateur (impossible normalement, tu dois être connecté pour
        voir cette page).
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {status && (
        <div className="rounded-lg bg-neutral-50 px-4 py-2 text-sm text-neutral-700">
          {status}
        </div>
      )}

      <ul className="space-y-2">
        {users.map((user) => (
          <li
            key={user.id}
            className="rounded-2xl border border-neutral-200 bg-white"
          >
            {editingId === user.id ? (
              <EditUserRow
                user={user}
                isPending={isPending}
                onCancel={() => setEditingId(null)}
                onSave={(payload) => {
                  startTransition(async () => {
                    const result = await updateUser({
                      id: user.id,
                      ...payload,
                    });
                    if (result.ok) {
                      flashStatus("Compte mis à jour ✓");
                      setEditingId(null);
                      router.refresh();
                    } else {
                      flashStatus(`Erreur : ${result.error}`);
                    }
                  });
                }}
              />
            ) : (
              <div className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-medium text-neutral-700">
                  {(user.name?.[0] ?? user.email[0]).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-neutral-900">
                      {user.name ?? user.email}
                    </p>
                    {user.isCurrent && (
                      <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-blue-800">
                        Toi
                      </span>
                    )}
                    <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-600">
                      {user.role}
                    </span>
                  </div>
                  {user.name && (
                    <p className="truncate text-sm text-neutral-500">
                      {user.email}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-neutral-400">
                    Créé le {formatDate(user.createdAt)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingId(user.id)}
                    className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:bg-neutral-100 transition"
                  >
                    Éditer
                  </button>
                  {!user.isCurrent && (
                    <button
                      onClick={() => handleDelete(user)}
                      disabled={isPending}
                      className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50 transition"
                    >
                      Supprimer
                    </button>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function EditUserRow({
  user,
  isPending,
  onCancel,
  onSave,
}: {
  user: UserRow;
  isPending: boolean;
  onCancel: () => void;
  onSave: (payload: {
    email?: string;
    name?: string | null;
    password?: string;
  }) => void;
}) {
  const [email, setEmail] = useState(user.email);
  const [name, setName] = useState(user.name ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  function submit() {
    onSave({
      email: email !== user.email ? email : undefined,
      name: name !== (user.name ?? "") ? name || null : undefined,
      password: newPassword || undefined,
    });
  }

  return (
    <div className="space-y-3 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-700">
            Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-700">
            Nom
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

      {showPassword ? (
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-neutral-700">
            Nouveau mot de passe (10 caractères min.)
          </span>
          <input
            type="text"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={10}
            autoComplete="new-password"
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-900"
          />
        </label>
      ) : (
        <button
          type="button"
          onClick={() => setShowPassword(true)}
          className="text-xs uppercase tracking-[0.2em] text-neutral-600 hover:text-neutral-900 transition"
        >
          Changer le mot de passe →
        </button>
      )}

      <div className="flex items-center justify-end gap-3 border-t border-neutral-200 pt-3">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-neutral-600 hover:text-neutral-900"
        >
          Annuler
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isPending}
          className="rounded-full bg-neutral-900 px-5 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50 transition"
        >
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </div>
  );
}
