"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updateMessageStatus,
  deleteMessage,
  bulkUpdateStatus,
  bulkDelete,
} from "@/app/admin/messages/actions";

type Message = {
  id: string;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  status: string;
  createdAt: string;
};

type Status = "new" | "read" | "replied" | "archived";

const statusLabels: Record<string, string> = {
  new: "Nouveau",
  read: "Lu",
  replied: "Répondu",
  archived: "Archivé",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  read: "bg-neutral-100 text-neutral-700",
  replied: "bg-green-100 text-green-800",
  archived: "bg-neutral-200 text-neutral-500",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) {
    return `Aujourd'hui ${d.toLocaleTimeString("fr-FR", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  }
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function MessagesList({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [openId, setOpenId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);

  function flashStatus(msg: string) {
    setStatus(msg);
    setTimeout(() => setStatus(null), 1800);
  }

  function toggleOpen(id: string, currentStatus: string) {
    if (openId === id) {
      setOpenId(null);
      return;
    }
    setOpenId(id);
    // Auto-mark as "read" si c'est encore "new"
    if (currentStatus === "new") {
      startTransition(async () => {
        await updateMessageStatus(id, "read");
        router.refresh();
      });
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selectedIds.size === messages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(messages.map((m) => m.id)));
    }
  }

  function handleStatusChange(id: string, newStatus: Status) {
    startTransition(async () => {
      const r = await updateMessageStatus(id, newStatus);
      if (r.ok) {
        flashStatus(`Marqué : ${statusLabels[newStatus]}`);
        router.refresh();
      } else {
        flashStatus(`Erreur : ${r.error}`);
      }
    });
  }

  function handleDelete(id: string) {
    if (!confirm("Supprimer définitivement ce message ?")) return;
    startTransition(async () => {
      const r = await deleteMessage(id);
      if (r.ok) {
        flashStatus("Supprimé");
        setOpenId(null);
        router.refresh();
      } else {
        flashStatus(`Erreur : ${r.error}`);
      }
    });
  }

  function handleBulkStatus(newStatus: Status) {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    startTransition(async () => {
      const r = await bulkUpdateStatus(ids, newStatus);
      if (r.ok) {
        flashStatus(`${r.updated} message(s) marqué(s) : ${statusLabels[newStatus]}`);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        flashStatus(`Erreur : ${r.error}`);
      }
    });
  }

  function handleBulkDelete() {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`Supprimer définitivement ${ids.length} message(s) ?`)) return;
    startTransition(async () => {
      const r = await bulkDelete(ids);
      if (r.ok) {
        flashStatus(`${r.deleted} message(s) supprimé(s)`);
        setSelectedIds(new Set());
        router.refresh();
      } else {
        flashStatus(`Erreur : ${r.error}`);
      }
    });
  }

  return (
    <div className="space-y-3">
      {/* Bulk actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-neutral-50 px-4 py-2 text-sm">
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-700">
            <input
              type="checkbox"
              checked={selectedIds.size === messages.length && messages.length > 0}
              onChange={selectAll}
              className="rounded"
            />
            <span>
              {selectedIds.size > 0
                ? `${selectedIds.size} sélectionné(s)`
                : "Tout sélectionner"}
            </span>
          </label>
          {status && <span className="text-xs text-neutral-700">{status}</span>}
        </div>

        {selectedIds.size > 0 && (
          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleBulkStatus("read")}
              disabled={isPending}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:bg-white"
            >
              Marquer lu
            </button>
            <button
              onClick={() => handleBulkStatus("replied")}
              disabled={isPending}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:bg-white"
            >
              Répondu
            </button>
            <button
              onClick={() => handleBulkStatus("archived")}
              disabled={isPending}
              className="rounded-full border border-neutral-300 px-3 py-1 text-xs hover:bg-white"
            >
              Archiver
            </button>
            <button
              onClick={handleBulkDelete}
              disabled={isPending}
              className="rounded-full border border-red-300 px-3 py-1 text-xs text-red-700 hover:bg-red-50"
            >
              Supprimer
            </button>
          </div>
        )}
      </div>

      {/* Liste */}
      <ul className="space-y-2">
        {messages.map((m) => {
          const isOpen = openId === m.id;
          const isSelected = selectedIds.has(m.id);
          const isNew = m.status === "new";

          return (
            <li
              key={m.id}
              className={`rounded-2xl border bg-white transition ${
                isNew ? "border-blue-300" : "border-neutral-200"
              } ${isSelected ? "ring-2 ring-neutral-900" : ""}`}
            >
              <div className="flex items-start gap-3 p-4">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(m.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="mt-1 rounded"
                />
                <button
                  onClick={() => toggleOpen(m.id, m.status)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span
                        className={`font-medium ${
                          isNew ? "text-neutral-900" : "text-neutral-700"
                        }`}
                      >
                        {m.name}
                      </span>
                      <span className="text-xs text-neutral-500">
                        &lt;{m.email}&gt;
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                          statusColors[m.status] ?? statusColors.read
                        }`}
                      >
                        {statusLabels[m.status] ?? m.status}
                      </span>
                      <span className="text-xs text-neutral-500">
                        {formatDate(m.createdAt)}
                      </span>
                    </div>
                  </div>
                  {m.subject && (
                    <p className={`mt-1 text-sm ${isNew ? "font-medium" : ""}`}>
                      {m.subject}
                    </p>
                  )}
                  {!isOpen && (
                    <p className="mt-1 truncate text-sm text-neutral-600">
                      {m.message}
                    </p>
                  )}
                </button>
              </div>

              {isOpen && (
                <div className="border-t border-neutral-200 px-4 py-4">
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-neutral-700">
                    {m.message}
                  </p>
                  <div className="mt-5 flex flex-wrap gap-2 border-t border-neutral-100 pt-4">
                    <a
                      href={`mailto:${m.email}?subject=${encodeURIComponent(
                        m.subject ? `Re: ${m.subject}` : `Re: Votre message`,
                      )}`}
                      className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 transition"
                    >
                      ↗ Répondre par email
                    </a>
                    <button
                      onClick={() => handleStatusChange(m.id, "replied")}
                      disabled={isPending || m.status === "replied"}
                      className="rounded-full border border-green-300 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-green-700 hover:bg-green-50 disabled:opacity-50 transition"
                    >
                      ✓ Marquer répondu
                    </button>
                    {m.status !== "archived" && (
                      <button
                        onClick={() => handleStatusChange(m.id, "archived")}
                        disabled={isPending}
                        className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs uppercase tracking-[0.2em] hover:bg-neutral-100 transition"
                      >
                        Archiver
                      </button>
                    )}
                    {m.status === "archived" && (
                      <button
                        onClick={() => handleStatusChange(m.id, "read")}
                        disabled={isPending}
                        className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs uppercase tracking-[0.2em] hover:bg-neutral-100 transition"
                      >
                        Désarchiver
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={isPending}
                      className="rounded-full border border-red-300 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-red-700 hover:bg-red-50 transition"
                    >
                      Supprimer
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
