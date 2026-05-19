import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#fafaf8] px-6 text-center text-neutral-900">
      <p className="text-xs uppercase tracking-[0.3em] text-neutral-500">
        Erreur 404
      </p>
      <h1
        className="mt-4 text-6xl font-light tracking-tight md:text-8xl"
        style={{
          fontFamily:
            "ui-serif, 'Cormorant Garamond', Georgia, 'Times New Roman', serif",
        }}
      >
        Page introuvable
      </h1>
      <p className="mt-6 max-w-md text-sm text-neutral-600">
        La page que tu cherches a peut-être été déplacée ou n'existe plus.
      </p>
      <div className="mt-10 flex gap-4">
        <Link
          href="/"
          className="rounded-full bg-neutral-900 px-6 py-3 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 transition"
        >
          Retour à l'accueil
        </Link>
        <Link
          href="/gallery"
          className="rounded-full border border-neutral-900 px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-neutral-900 hover:text-white transition"
        >
          Voir la galerie
        </Link>
      </div>
    </main>
  );
}
