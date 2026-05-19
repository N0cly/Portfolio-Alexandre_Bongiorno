"use client";

import { useState, useTransition } from "react";
import { saveSiteContent } from "@/app/admin/settings/actions";
import type { SiteContent } from "@/lib/site-content";
import { AboutSectionsEditor } from "./AboutSectionsEditor";

export function SettingsForm({ initial }: { initial: SiteContent }) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setStatus(null);
    startTransition(async () => {
      const result = await saveSiteContent(formData);
      if (result.ok) {
        setStatus({ type: "success", message: "Enregistré ✓" });
      } else {
        setStatus({ type: "error", message: result.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-10">
      <Section title="Site">
        <Field
          label="Nom du studio"
          name="studioName"
          defaultValue={initial.studioName}
          help="Logo dans le header, signature dans le footer"
        />
      </Section>

      <Section title="Hero (page d'accueil)">
        <Field
          label="Eyebrow"
          name="hero.eyebrow"
          defaultValue={initial.hero.eyebrow}
          help="Petit texte au-dessus du titre"
        />
        <Field
          label="Titre — ligne 1"
          name="hero.titleLine1"
          defaultValue={initial.hero.titleLine1}
        />
        <Field
          label="Titre — ligne 2"
          name="hero.titleLine2"
          defaultValue={initial.hero.titleLine2}
          help="Affichée en italique"
        />
      </Section>

      <Section title="Intro homepage">
        <Field
          label="Label"
          name="intro.label"
          defaultValue={initial.intro.label}
        />
        <Field
          label="Texte d'intro"
          name="intro.text"
          defaultValue={initial.intro.text}
          textarea
          rows={3}
        />
      </Section>

      <Section title="Sélection récente">
        <Field
          label="Titre de section"
          name="selection.title"
          defaultValue={initial.selection.title}
        />
        <Field
          label="Texte du lien"
          name="selection.cta"
          defaultValue={initial.selection.cta}
        />
      </Section>

      <Section title="Citation">
        <Field
          label="Texte"
          name="quote.text"
          defaultValue={initial.quote.text}
          textarea
          rows={2}
        />
        <Field
          label="Auteur"
          name="quote.author"
          defaultValue={initial.quote.author}
        />
      </Section>

      <Section title="Page À propos">
        <Field
          label="Eyebrow"
          name="about.eyebrow"
          defaultValue={initial.about.eyebrow}
        />
        <Field
          label="Titre"
          name="about.title"
          defaultValue={initial.about.title}
        />
        <Field
          label="Bio"
          name="about.bio"
          defaultValue={initial.about.bio}
          textarea
          rows={6}
          help="Sépare les paragraphes par une ligne vide"
        />
        <div className="space-y-2">
          <p className="text-xs font-medium text-neutral-700">
            Sections sous la bio
          </p>
          <p className="text-xs text-neutral-500">
            Crée autant de sections que tu veux (Publications, Expositions,
            Awards, Clients, Brand collaborations…). Une seule colonne sera
            affichée si tu n'as qu'une section, deux colonnes au-delà.
          </p>
          <AboutSectionsEditor
            initial={initial.about.sections}
            hiddenName="about.sections"
          />
        </div>
      </Section>

      <Section title="Page Contact">
        <Field
          label="Eyebrow"
          name="contact.eyebrow"
          defaultValue={initial.contact.eyebrow}
        />
        <Field
          label="Titre"
          name="contact.title"
          defaultValue={initial.contact.title}
        />
        <Field
          label="Phrase d'intro"
          name="contact.intro"
          defaultValue={initial.contact.intro}
          textarea
          rows={2}
        />
        <Field
          label="Email"
          name="contact.email"
          defaultValue={initial.contact.email}
        />
        <Field
          label="Label adresse"
          name="contact.addressLabel"
          defaultValue={initial.contact.addressLabel}
          help="Ex : Atelier, Studio, Bureau"
        />
        <Field
          label="Adresse"
          name="contact.address"
          defaultValue={initial.contact.address}
          textarea
          rows={3}
        />
      </Section>

      <div className="sticky bottom-0 -mx-8 flex items-center justify-end gap-4 border-t border-neutral-200 bg-white/95 px-8 py-4 backdrop-blur">
        {status && (
          <p
            className={`text-sm ${
              status.type === "success" ? "text-green-700" : "text-red-700"
            }`}
          >
            {status.message}
          </p>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-neutral-900 px-6 py-3 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50 transition"
        >
          {isPending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
    </form>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-neutral-200 bg-white p-6">
      <h2 className="text-sm uppercase tracking-[0.2em] text-neutral-500">
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  name,
  defaultValue,
  help,
  textarea,
  rows = 3,
}: {
  label: string;
  name: string;
  defaultValue: string;
  help?: string;
  textarea?: boolean;
  rows?: number;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs font-medium text-neutral-700">
        {label}
      </span>
      {textarea ? (
        <textarea
          name={name}
          defaultValue={defaultValue}
          rows={rows}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 outline-none"
        />
      ) : (
        <input
          type="text"
          name={name}
          defaultValue={defaultValue}
          className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 outline-none"
        />
      )}
      {help && <span className="block text-xs text-neutral-500">{help}</span>}
    </label>
  );
}
