"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  formatBytes,
  isStorageFull,
  usagePercent,
  type StorageUsage,
} from "@/lib/storage-types";

/**
 * Hook partagé : maintient l'usage de stockage à jour.
 * - `usage`     : dernier état connu (ou `initial`)
 * - `refresh()` : refetch depuis /api/storage
 * - `applyUsage`: applique un usage renvoyé par /api/upload (évite un refetch)
 */
export function useStorageUsage(initial?: StorageUsage | null) {
  const [usage, setUsage] = useState<StorageUsage | null>(initial ?? null);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    try {
      const res = await fetch("/api/storage", { cache: "no-store" });
      if (res.ok) {
        const data = (await res.json()) as StorageUsage;
        setUsage(data);
      }
    } catch {
      // silencieux : on garde le dernier état connu
    } finally {
      inFlight.current = false;
    }
  }, []);

  const applyUsage = useCallback((next: StorageUsage) => {
    setUsage(next);
  }, []);

  useEffect(() => {
    // Pas d'état initial fourni → on va le chercher.
    if (!initial) refresh();
    // On ne dépend que du montage.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { usage, refresh, applyUsage };
}

/** Jauge visuelle de la place restante (composant présentationnel). */
export function StorageGauge({ usage }: { usage: StorageUsage | null }) {
  if (!usage) {
    return (
      <div className="rounded-2xl border border-neutral-200 bg-neutral-50 px-4 py-3">
        <div className="h-2 w-full animate-pulse rounded-full bg-neutral-200" />
        <p className="mt-2 text-xs text-neutral-400">
          Calcul de l&apos;espace de stockage…
        </p>
      </div>
    );
  }

  const percent = usagePercent(usage);
  const full = isStorageFull(usage);
  const remaining = Math.max(0, usage.limitBytes - usage.usedBytes);
  const nearFull = percent >= 90 && !full;

  const barColor = full
    ? "bg-red-600"
    : nearFull
      ? "bg-amber-500"
      : "bg-emerald-600";

  const wrapColor = full
    ? "border-red-200 bg-red-50"
    : nearFull
      ? "border-amber-200 bg-amber-50"
      : "border-neutral-200 bg-neutral-50";

  return (
    <div className={`rounded-2xl border px-4 py-3 ${wrapColor}`}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-neutral-500">
            Stockage des photos
          </p>
          <p className="mt-0.5 text-sm text-neutral-800">
            <span className="font-semibold">{formatBytes(usage.usedBytes)}</span>
            <span className="text-neutral-400"> / {formatBytes(usage.limitBytes)}</span>
            <span className="text-neutral-400">
              {" "}
              · {usage.fileCount} fichier{usage.fileCount > 1 ? "s" : ""}
            </span>
          </p>
        </div>
        <span
          className={`text-sm font-semibold tabular-nums ${
            full
              ? "text-red-700"
              : nearFull
                ? "text-amber-700"
                : "text-neutral-600"
          }`}
        >
          {percent.toFixed(0)} %
        </span>
      </div>

      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${Math.max(percent, full ? 100 : 2)}%` }}
        />
      </div>

      {full ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-red-700">
          <span aria-hidden>⚠️</span>
          <span>
            Limite atteinte. Les nouveaux uploads sont bloqués — supprime des
            photos pour libérer de l&apos;espace et réactiver l&apos;envoi.
          </span>
        </p>
      ) : nearFull ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs font-medium text-amber-700">
          <span aria-hidden>⚠️</span>
          <span>
            Bientôt plein : {formatBytes(remaining)} restants. Pense à faire du
            tri.
          </span>
        </p>
      ) : (
        <p className="mt-2 text-xs text-neutral-500">
          {formatBytes(remaining)} disponibles.
        </p>
      )}
    </div>
  );
}
