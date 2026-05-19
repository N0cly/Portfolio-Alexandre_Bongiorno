"use client";

import { useState } from "react";
import type { AboutSection } from "@/lib/site-content";

export function AboutSectionsEditor({
  initial,
  hiddenName,
}: {
  initial: AboutSection[];
  hiddenName: string;
}) {
  const [sections, setSections] = useState<AboutSection[]>(
    initial.length > 0 ? initial : [],
  );

  function updateAt(index: number, patch: Partial<AboutSection>) {
    setSections((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s)),
    );
  }

  function removeAt(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function moveUp(index: number) {
    if (index <= 0) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function moveDown(index: number) {
    if (index >= sections.length - 1) return;
    setSections((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
  }

  function addSection() {
    setSections((prev) => [...prev, { title: "", items: "" }]);
  }

  return (
    <div className="space-y-4">
      <input
        type="hidden"
        name={hiddenName}
        value={JSON.stringify(sections)}
      />

      {sections.length === 0 && (
        <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-500">
          Aucune section. Clique sur « Ajouter une section » pour commencer.
        </p>
      )}

      {sections.map((section, index) => (
        <div
          key={index}
          className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-4"
        >
          <div className="flex items-center justify-between gap-3">
            <input
              type="text"
              value={section.title}
              onChange={(e) => updateAt(index, { title: e.target.value })}
              placeholder="Titre de la section (ex : Publications, Awards, Clients)"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm font-medium outline-none focus:border-neutral-900"
            />
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => moveUp(index)}
                disabled={index === 0}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-30"
                aria-label="Monter"
                title="Monter"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => moveDown(index)}
                disabled={index === sections.length - 1}
                className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-xs hover:bg-neutral-100 disabled:opacity-30"
                aria-label="Descendre"
                title="Descendre"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => removeAt(index)}
                className="rounded-md border border-red-300 bg-white px-2 py-1 text-xs text-red-700 hover:bg-red-50"
                aria-label="Supprimer"
                title="Supprimer la section"
              >
                ✕
              </button>
            </div>
          </div>
          <div>
            <textarea
              value={section.items}
              onChange={(e) => updateAt(index, { items: e.target.value })}
              rows={4}
              placeholder="Un élément par ligne (ex : National Geographic — 2025)"
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm outline-none focus:border-neutral-900"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Un élément par ligne · {section.items.split("\n").filter((l) => l.trim()).length} élément(s)
            </p>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={addSection}
        className="w-full rounded-lg border border-dashed border-neutral-400 bg-white px-4 py-3 text-sm text-neutral-700 hover:border-neutral-900 hover:bg-neutral-50 transition"
      >
        + Ajouter une section
      </button>
    </div>
  );
}
