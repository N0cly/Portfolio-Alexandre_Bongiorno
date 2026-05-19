"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import {
  DEFAULT_SITE_CONTENT,
  type SiteContent,
  type AboutSection,
  updateSiteContent,
} from "@/lib/site-content";

function parseAboutSections(raw: string): AboutSection[] | null {
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const cleaned: AboutSection[] = [];
    for (const s of parsed) {
      if (typeof s !== "object" || s === null) continue;
      const title = typeof s.title === "string" ? s.title.trim() : "";
      const items = typeof s.items === "string" ? s.items : "";
      if (!title) continue;
      cleaned.push({ title: title.slice(0, 80), items: items.slice(0, 4000) });
    }
    return cleaned;
  } catch {
    return null;
  }
}

export async function saveSiteContent(
  formData: FormData,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await auth();
  if (!session?.user) {
    return { ok: false, error: "Unauthorized" };
  }

  const get = (key: string) => String(formData.get(key) ?? "").trim();

  const content: SiteContent = {
    studioName: get("studioName") || DEFAULT_SITE_CONTENT.studioName,
    hero: {
      eyebrow: get("hero.eyebrow") || DEFAULT_SITE_CONTENT.hero.eyebrow,
      titleLine1:
        get("hero.titleLine1") || DEFAULT_SITE_CONTENT.hero.titleLine1,
      titleLine2:
        get("hero.titleLine2") || DEFAULT_SITE_CONTENT.hero.titleLine2,
    },
    intro: {
      label: get("intro.label") || DEFAULT_SITE_CONTENT.intro.label,
      text: get("intro.text") || DEFAULT_SITE_CONTENT.intro.text,
    },
    selection: {
      title: get("selection.title") || DEFAULT_SITE_CONTENT.selection.title,
      cta: get("selection.cta") || DEFAULT_SITE_CONTENT.selection.cta,
    },
    quote: {
      text: get("quote.text") || DEFAULT_SITE_CONTENT.quote.text,
      author: get("quote.author") || DEFAULT_SITE_CONTENT.quote.author,
    },
    about: {
      eyebrow: get("about.eyebrow") || DEFAULT_SITE_CONTENT.about.eyebrow,
      title: get("about.title") || DEFAULT_SITE_CONTENT.about.title,
      bio: get("about.bio") || DEFAULT_SITE_CONTENT.about.bio,
      sections:
        parseAboutSections(get("about.sections")) ??
        DEFAULT_SITE_CONTENT.about.sections,
    },
    contact: {
      eyebrow: get("contact.eyebrow") || DEFAULT_SITE_CONTENT.contact.eyebrow,
      title: get("contact.title") || DEFAULT_SITE_CONTENT.contact.title,
      intro: get("contact.intro") || DEFAULT_SITE_CONTENT.contact.intro,
      email: get("contact.email") || DEFAULT_SITE_CONTENT.contact.email,
      addressLabel:
        get("contact.addressLabel") ||
        DEFAULT_SITE_CONTENT.contact.addressLabel,
      address: get("contact.address") || DEFAULT_SITE_CONTENT.contact.address,
    },
  };

  try {
    await updateSiteContent(content);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Erreur d'enregistrement",
    };
  }
}
