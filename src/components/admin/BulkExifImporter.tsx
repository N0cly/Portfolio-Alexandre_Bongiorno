"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { extractMissingExifBatch } from "@/app/admin/photos/actions";

type Progress = {
  processed: number;
  total: number;
};

export function BulkExifImporter() {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function runImport(reExtract: boolean) {
    setRunning(true);
    setError(null);
    setDone(null);
    setProgress(null);

    let totalProcessed = 0;
    let knownTotal = 0;

    try {
      while (true) {
        const result = await extractMissingExifBatch({ reExtract });
        if (!result.ok) {
          setError(result.error);
          break;
        }
        if (result.total > knownTotal) knownTotal = result.total;
        totalProcessed += result.processed;
        setProgress({
          processed: totalProcessed,
          total: knownTotal,
        });
        if (result.remaining === 0 || result.processed === 0) {
          setDone(
            totalProcessed === 0
              ? "Aucune photo à traiter."
              : `✓ ${totalProcessed} photo(s) traitée(s).`,
          );
          break;
        }
      }
    } finally {
      setRunning(false);
      startTransition(() => router.refresh());
    }
  }

  function handleMissing() {
    runImport(false);
  }

  function handleReExtractAll() {
    if (
      !confirm(
        "Re-extraire l'EXIF de TOUTES les photos (même celles déjà traitées) ? Cela écrasera les métadonnées existantes.",
      )
    )
      return;
    runImport(true);
  }

  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : 0;

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-500">
            Import EXIF en masse
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Lit les métadonnées (appareil, focale, ISO, GPS, date) de toutes
            les photos qui n'ont pas encore été traitées.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleMissing}
            disabled={running || isPending}
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50 transition"
          >
            {running ? "Extraction en cours…" : "Extraire les manquantes"}
          </button>
          <button
            type="button"
            onClick={handleReExtractAll}
            disabled={running || isPending}
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs uppercase tracking-[0.2em] text-neutral-700 hover:bg-neutral-100 disabled:opacity-50 transition"
            title="Re-extraire toutes les photos, même celles déjà traitées"
          >
            ↻ Tout re-extraire
          </button>
        </div>
      </div>

      {(running || progress) && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-700">
              {progress
                ? `${progress.processed} / ${progress.total} photo(s)`
                : "Démarrage…"}
            </span>
            <span className="tabular-nums text-neutral-500">{percent}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-neutral-200">
            <div
              className="h-full bg-neutral-900 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>
      )}

      {done && !running && (
        <p className="mt-3 text-sm text-green-700">{done}</p>
      )}
      {error && (
        <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
    </section>
  );
}
