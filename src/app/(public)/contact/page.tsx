import type { Metadata } from "next";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { eq, asc } from "drizzle-orm";
import { getSiteContent } from "@/lib/site-content";
import { ContactForm } from "@/components/ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Demande de devis, collaboration éditoriale, acquisition de tirage — envoyez-moi un message.",
};

async function getSocialLinks() {
  try {
    return await db
      .select()
      .from(links)
      .where(eq(links.visible, true))
      .orderBy(asc(links.order));
  } catch {
    return [];
  }
}

export default async function ContactPage() {
  const [content, socialLinks] = await Promise.all([
    getSiteContent(),
    getSocialLinks(),
  ]);

  const addressLines = content.contact.address
    .split("\n")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  return (
    <main className="mx-auto max-w-3xl px-8 py-24">
      <header className="mb-16 border-b border-neutral-300 pb-8">
        <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
          {content.contact.eyebrow}
        </p>
        <h1
          className="text-5xl font-light tracking-tight md:text-6xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {content.contact.title}
        </h1>
      </header>

      <section className="space-y-12">
        <p
          className="text-2xl font-light leading-snug text-neutral-700 md:text-3xl"
          style={{ fontFamily: "var(--font-serif)" }}
        >
          {content.contact.intro}
        </p>

        <ContactForm />

        <div className="grid gap-8 border-t border-neutral-300 pt-12 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
              Email direct
            </p>
            <a
              href={`mailto:${content.contact.email}`}
              className="text-lg text-neutral-900 underline-offset-4 hover:underline"
              style={{ fontFamily: "var(--font-serif)" }}
            >
              {content.contact.email}
            </a>
          </div>
          {addressLines.length > 0 && (
            <div>
              <p className="mb-2 text-xs uppercase tracking-[0.3em] text-neutral-500">
                {content.contact.addressLabel}
              </p>
              <p
                className="text-lg text-neutral-700"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {addressLines.map((line, i) => (
                  <span key={i}>
                    {line}
                    {i < addressLines.length - 1 && <br />}
                  </span>
                ))}
              </p>
            </div>
          )}
        </div>

        {socialLinks.length > 0 && (
          <div className="border-t border-neutral-300 pt-8">
            <p className="mb-3 text-xs uppercase tracking-[0.3em] text-neutral-500">
              Réseaux
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              {socialLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-neutral-700 hover:text-neutral-900 transition"
                  style={{ fontFamily: "var(--font-serif)" }}
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
