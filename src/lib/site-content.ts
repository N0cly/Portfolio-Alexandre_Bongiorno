import "server-only";
import { eq } from "drizzle-orm";
import { db } from "./db";
import { siteSettings } from "./db/schema";

export type AboutSection = {
  title: string;
  items: string; // un item par ligne
};

export type SiteContent = {
  studioName: string;
  hero: {
    eyebrow: string;
    titleLine1: string;
    titleLine2: string;
  };
  intro: {
    label: string;
    text: string;
  };
  selection: {
    title: string;
    cta: string;
  };
  quote: {
    text: string;
    author: string;
  };
  about: {
    eyebrow: string;
    title: string;
    bio: string;
    sections: AboutSection[];
  };
  contact: {
    eyebrow: string;
    title: string;
    intro: string;
    email: string;
    addressLabel: string;
    address: string;
  };
};

export const DEFAULT_SITE_CONTENT: SiteContent = {
  studioName: "Studio",
  hero: {
    eyebrow: "Portfolio 2026",
    titleLine1: "Capturer",
    titleLine2: "l'éphémère.",
  },
  intro: {
    label: "À propos",
    text: "Photographe basé à Bordeaux. Travail documentaire, portrait et paysage. Disponible pour commandes éditoriales et personnelles.",
  },
  selection: {
    title: "Sélection récente",
    cta: "Voir la galerie →",
  },
  quote: {
    text: "La photographie est l'art de saisir ce qui ne reviendra plus.",
    author: "Henri Cartier-Bresson",
  },
  about: {
    eyebrow: "Bio",
    title: "À propos",
    bio: "Photographe basé à Bordeaux, je documente depuis dix ans le territoire de la côte atlantique : ses lumières, ses gens, ses paysages mouvants.\n\nMon travail explore la frontière entre le portrait documentaire et le paysage. Je cherche des images qui suspendent le temps, où la présence humaine se dissout dans son environnement.",
    sections: [
      {
        title: "Publications",
        items:
          "National Geographic — 2025\nPolka Magazine — 2024\nLe Monde — 2023",
      },
      {
        title: "Expositions",
        items:
          "Galerie du Jour, Paris — 2025\nVisa pour l'Image, Perpignan — 2024",
      },
    ],
  },
  contact: {
    eyebrow: "Échangeons",
    title: "Contact",
    intro:
      "Pour toute demande de commande, collaboration éditoriale, ou acquisition de tirage, écris-moi par email.",
    email: "contact@studio.fr",
    addressLabel: "Atelier",
    address: "12 rue des Marronniers\n33000 Bordeaux",
  },
};

const SETTINGS_KEY = "siteContent";

function deepMerge<T>(base: T, override: Partial<T> | undefined | null): T {
  if (!override) return base;
  const result: Record<string, unknown> = { ...(base as object) };
  for (const key of Object.keys(override)) {
    const oVal = (override as Record<string, unknown>)[key];
    const bVal = (base as Record<string, unknown>)[key];
    if (
      oVal &&
      typeof oVal === "object" &&
      !Array.isArray(oVal) &&
      bVal &&
      typeof bVal === "object" &&
      !Array.isArray(bVal)
    ) {
      result[key] = deepMerge(bVal, oVal as Partial<typeof bVal>);
    } else if (oVal !== undefined && oVal !== null && oVal !== "") {
      result[key] = oVal;
    }
  }
  return result as T;
}

type LegacyAbout = {
  publications?: string;
  exhibitions?: string;
  sections?: AboutSection[];
};

function migrateLegacyAbout(
  stored: Partial<SiteContent> & { about?: LegacyAbout },
): Partial<SiteContent> {
  if (!stored.about) return stored;
  // Si déjà migré, on garde tel quel
  if (stored.about.sections && Array.isArray(stored.about.sections)) {
    return stored;
  }
  // Migration legacy publications/exhibitions → sections[]
  const migrated: AboutSection[] = [];
  if (typeof stored.about.publications === "string" && stored.about.publications.trim()) {
    migrated.push({
      title: "Publications",
      items: stored.about.publications,
    });
  }
  if (typeof stored.about.exhibitions === "string" && stored.about.exhibitions.trim()) {
    migrated.push({
      title: "Expositions",
      items: stored.about.exhibitions,
    });
  }
  return {
    ...stored,
    about: {
      ...stored.about,
      sections: migrated.length > 0 ? migrated : undefined,
    } as SiteContent["about"],
  };
}

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const rows = await db
      .select()
      .from(siteSettings)
      .where(eq(siteSettings.key, SETTINGS_KEY))
      .limit(1);
    if (rows.length === 0) return DEFAULT_SITE_CONTENT;
    const stored = migrateLegacyAbout(
      rows[0].value as Partial<SiteContent> & { about?: LegacyAbout },
    );
    return deepMerge(DEFAULT_SITE_CONTENT, stored);
  } catch {
    return DEFAULT_SITE_CONTENT;
  }
}

export async function updateSiteContent(
  content: SiteContent,
): Promise<void> {
  await db
    .insert(siteSettings)
    .values({
      key: SETTINGS_KEY,
      value: content,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: siteSettings.key,
      set: { value: content, updatedAt: new Date() },
    });
}
