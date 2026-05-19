import { getSiteContent } from "@/lib/site-content";

export async function PublicFooter() {
  const content = await getSiteContent();

  return (
    <footer className="mx-auto w-full max-w-6xl px-8 py-12">
      <div className="flex flex-col items-start justify-between gap-6 border-t border-neutral-300 pt-8 md:flex-row md:items-center">
        <p
          className="text-lg"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {content.studioName}
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">
          © {new Date().getFullYear()} — Tous droits réservés
        </p>
      </div>
    </footer>
  );
}
