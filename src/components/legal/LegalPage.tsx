import type { ReactNode } from "react";
import { legalInfo } from "@/lib/legal-content";

/** Mise en page commune des pages légales (cohérente avec /about). */
export function LegalPage({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-3xl px-8 py-24">
      <header className="mb-12 border-b border-neutral-300 pb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
          {eyebrow}
        </p>
        <h1
          className="text-4xl font-light tracking-tight md:text-5xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {title}
        </h1>
        <p className="mt-4 text-xs uppercase tracking-[0.2em] text-neutral-400">
          Dernière mise à jour : {legalInfo.lastUpdated}
        </p>
      </header>

      <div className="space-y-10 text-[15px] leading-relaxed text-neutral-700">
        {children}
      </div>
    </main>
  );
}

/** Bloc « section » avec un sous-titre discret. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-xs uppercase tracking-[0.25em] text-neutral-500">
        {title}
      </h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}
