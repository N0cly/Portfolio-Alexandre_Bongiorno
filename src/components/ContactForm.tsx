"use client";

import { useState, useTransition } from "react";
import { submitContact } from "@/app/(public)/contact/actions";

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<
    { type: "ok" | "error"; message: string } | null
  >(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const result = await submitContact(formData);
      if (result.ok) {
        setFeedback({ type: "ok", message: result.message });
        form.reset();
      } else {
        setFeedback({ type: "error", message: result.error });
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* Honeypot anti-bot */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] opacity-0"
        aria-hidden="true"
      />

      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Nom" name="name" required>
          <input
            type="text"
            name="name"
            required
            minLength={2}
            maxLength={100}
            placeholder="Ton nom"
            className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-2 text-base outline-none transition focus:border-neutral-900"
            style={{ fontFamily: "var(--font-serif)" }}
          />
        </Field>
        <Field label="Email" name="email" required>
          <input
            type="email"
            name="email"
            required
            maxLength={200}
            placeholder="ton@email.fr"
            className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-2 text-base outline-none transition focus:border-neutral-900"
            style={{ fontFamily: "var(--font-serif)" }}
          />
        </Field>
      </div>

      <Field label="Sujet (optionnel)" name="subject">
        <input
          type="text"
          name="subject"
          maxLength={200}
          placeholder="Ex : Demande pour un mariage en juin"
          className="w-full border-0 border-b border-neutral-300 bg-transparent px-0 py-2 text-base outline-none transition focus:border-neutral-900"
          style={{ fontFamily: "var(--font-serif)" }}
        />
      </Field>

      <Field label="Message" name="message" required>
        <textarea
          name="message"
          required
          minLength={10}
          maxLength={5000}
          rows={6}
          placeholder="Parle-moi de ton projet, ta date, ton lieu, le rendu que tu imagines..."
          className="w-full resize-y border-0 border-b border-neutral-300 bg-transparent px-0 py-2 text-base outline-none transition focus:border-neutral-900"
          style={{ fontFamily: "var(--font-serif)" }}
        />
      </Field>

      <div className="flex items-center justify-between gap-6 pt-4">
        {feedback ? (
          <p
            className={`text-sm ${
              feedback.type === "ok" ? "text-green-700" : "text-red-700"
            }`}
          >
            {feedback.message}
          </p>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-full bg-neutral-900 px-8 py-3 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50 transition"
        >
          {isPending ? "Envoi…" : "Envoyer"}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  name,
  required,
  children,
}: {
  label: string;
  name: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={name} className="block">
      <span className="block text-xs uppercase tracking-[0.2em] text-neutral-500">
        {label}
        {required && <span className="text-neutral-400"> *</span>}
      </span>
      {children}
    </label>
  );
}
