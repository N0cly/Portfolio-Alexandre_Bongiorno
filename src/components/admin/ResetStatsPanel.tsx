"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resetStats } from "@/app/admin/stats/actions";

type Mode = "preset" | "custom";
type Preset = "today" | "7d" | "30d" | "90d" | "all";
type Scope = "all" | "pageviews" | "interactions";

const presetLabels: Record<Preset, string> = {
  today: "Aujourd'hui",
  "7d": "7 derniers jours",
  "30d": "30 derniers jours",
  "90d": "90 derniers jours",
  all: "Tout l'historique",
};

const scopeLabels: Record<Scope, string> = {
  all: "Vues + interactions",
  pageviews: "Vues uniquement",
  interactions: "Interactions uniquement",
};

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function daysAgoISO(days: number): string {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);
}

export function ResetStatsPanel() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [mode, setMode] = useState<Mode>("preset");
  const [preset, setPreset] = useState<Preset>("7d");
  const [scope, setScope] = useState<Scope>("all");
  const [from, setFrom] = useState<string>(daysAgoISO(7));
  const [to, setTo] = useState<string>(todayISO());
  const [feedback, setFeedback] = useState<
    | { type: "success"; message: string }
    | { type: "error"; message: string }
    | null
  >(null);

  function confirmMessage(): string {
    const rangeLabel =
      mode === "preset"
        ? presetLabels[preset]
        : `du ${from} au ${to}`;
    return `Supprimer les statistiques (${scopeLabels[scope]}) — ${rangeLabel} ?\n\nCette action est irréversible.`;
  }

  function handleSubmit() {
    if (!confirm(confirmMessage())) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await resetStats(
        mode === "preset"
          ? { scope, preset }
          : { scope, from, to },
      );
      if (result.ok) {
        setFeedback({
          type: "success",
          message: `Supprimé : ${result.deleted.pageviews} vues, ${result.deleted.interactions} interactions.`,
        });
        router.refresh();
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  return (
    <section className="rounded-2xl border border-red-200 bg-white p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-sm uppercase tracking-[0.2em] text-red-700">
            Zone dangereuse — Reset des stats
          </h2>
          <p className="mt-1 text-xs text-neutral-500">
            Supprime définitivement les vues et/ou interactions enregistrées.
            Aucun moyen de récupérer après confirmation.
          </p>
        </div>
      </div>

      <div className="space-y-5">
        {/* Mode */}
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setMode("preset")}
            className={`rounded-md border px-3 py-1.5 text-xs uppercase tracking-wider transition ${
              mode === "preset"
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
            }`}
          >
            Période prédéfinie
          </button>
          <button
            type="button"
            onClick={() => setMode("custom")}
            className={`rounded-md border px-3 py-1.5 text-xs uppercase tracking-wider transition ${
              mode === "custom"
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
            }`}
          >
            Période custom
          </button>
        </div>

        {/* Période */}
        {mode === "preset" ? (
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-700">
              Période
            </label>
            <div className="grid grid-cols-2 gap-1.5 md:grid-cols-5">
              {(Object.keys(presetLabels) as Preset[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPreset(p)}
                  className={`rounded-md border px-3 py-2 text-xs transition ${
                    preset === p
                      ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                      : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                  }`}
                >
                  {presetLabels[p]}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-neutral-700">
                Date de début
              </span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                max={to}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-xs font-medium text-neutral-700">
                Date de fin
              </span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                min={from}
                max={todayISO()}
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            </label>
          </div>
        )}

        {/* Scope */}
        <div>
          <label className="mb-2 block text-xs font-medium text-neutral-700">
            Quoi supprimer
          </label>
          <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3">
            {(Object.keys(scopeLabels) as Scope[]).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setScope(s)}
                className={`rounded-md border px-3 py-2 text-xs transition ${
                  scope === s
                    ? "border-neutral-900 bg-neutral-50 text-neutral-900"
                    : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                }`}
              >
                {scopeLabels[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="flex items-center justify-between gap-4 border-t border-neutral-200 pt-4">
          {feedback ? (
            <p
              className={`text-sm ${
                feedback.type === "success"
                  ? "text-green-700"
                  : "text-red-700"
              }`}
            >
              {feedback.message}
            </p>
          ) : (
            <p className="text-xs text-neutral-500">
              {mode === "preset"
                ? `Va supprimer : ${scopeLabels[scope]} — ${presetLabels[preset]}`
                : `Va supprimer : ${scopeLabels[scope]} — du ${from} au ${to}`}
            </p>
          )}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className="rounded-full bg-red-600 px-6 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-red-700 disabled:opacity-50 transition"
          >
            {isPending ? "Suppression…" : "Supprimer"}
          </button>
        </div>
      </div>
    </section>
  );
}
