import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { links } from "@/lib/db/schema";
import { getSiteContent } from "@/lib/site-content";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { LinksManager } from "@/components/admin/LinksManager";

async function getLinksList() {
  try {
    return await db.select().from(links).orderBy(asc(links.order));
  } catch {
    return [];
  }
}

export default async function SettingsPage() {
  const [content, linksList] = await Promise.all([
    getSiteContent(),
    getLinksList(),
  ]);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-light">Paramètres</h1>
        <p className="text-sm text-neutral-500">
          Modifie les textes du site et gère les liens externes. Tout est
          immédiatement appliqué sur les pages publiques.
        </p>
      </header>

      <LinksManager
        initial={linksList.map((l) => ({
          id: l.id,
          label: l.label,
          url: l.url,
          icon: l.icon,
          visible: l.visible,
        }))}
      />

      <SettingsForm initial={content} />
    </div>
  );
}
