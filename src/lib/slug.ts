export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * Génère un slug à partir d'un texte + des 6 premiers caractères d'un UUID
 * pour garantir l'unicité sans risque de collision (sauf si même texte + même prefix).
 */
export function buildSlug(text: string, uuid: string): string {
  const base = slugify(text) || "photo";
  const suffix = uuid.replace(/-/g, "").slice(0, 6);
  return `${base}-${suffix}`;
}
