"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { updatePhoto } from "@/app/admin/photos/actions";

export type EditablePhoto = {
  id: string;
  url: string;
  title: string | null;
  alt: string | null;
  slug: string | null;
  category: string | null;
  tags: string[];
  placement: string | null;
  displayWidth: string | null;
  displayHeight: string | null;
  rotation: number;
  objectFit: string | null;
  visible: boolean;
};

const widthOptions: { value: string; label: string }[] = [
  { value: "1", label: "1 col" },
  { value: "2", label: "2 col" },
  { value: "3", label: "3 col" },
  { value: "4", label: "4 col" },
  { value: "5", label: "Pleine largeur" },
];

const aspectOptions: { value: string; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "1:1", label: "Carré" },
  { value: "3:4", label: "Portrait" },
  { value: "2:3", label: "Portrait haut" },
  { value: "4:3", label: "Paysage" },
  { value: "16:9", label: "Cinéma" },
];

const placementOptions: {
  value: "gallery" | "hero" | "featured";
  label: string;
  help: string;
}[] = [
  {
    value: "gallery",
    label: "Galerie uniquement",
    help: "Apparaît seulement sur /gallery",
  },
  {
    value: "featured",
    label: "Sélection homepage",
    help: "Apparaît sur la homepage (section sélection) + galerie",
  },
  {
    value: "hero",
    label: "Photo hero",
    help: "Plein écran d'accueil. Si plusieurs photos sont hero, la plus récente est choisie.",
  },
];

export function PhotoEditor({
  photo,
  existingTags,
  onClose,
}: {
  photo: EditablePhoto;
  existingTags: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Normalise les valeurs historiques (ex: "auto" pour width n'est plus dans les options)
  const validWidths = ["1", "2", "3", "4", "5"];
  const initialWidth =
    photo.displayWidth && validWidths.includes(photo.displayWidth)
      ? photo.displayWidth
      : "3";
  const validAspects = ["auto", "1:1", "3:4", "4:3", "16:9", "2:3"];
  const initialHeight =
    photo.displayHeight && validAspects.includes(photo.displayHeight)
      ? photo.displayHeight
      : "auto";

  // Si le titre/alt est encore un nom de fichier (DSC_1234.jpg), on le nettoie pour l'UI
  function cleanFilename(s: string | null): string {
    if (!s) return "";
    return s
      .replace(/\.[^.]+$/, "")
      .replace(/[_-]+/g, " ")
      .trim();
  }

  const [title, setTitle] = useState(
    photo.title ? cleanFilename(photo.title) : cleanFilename(photo.alt),
  );
  const [alt, setAlt] = useState(cleanFilename(photo.alt));
  const [slug, setSlug] = useState(photo.slug ?? "");
  const [tags, setTags] = useState<string[]>(photo.tags ?? []);
  const [tagInput, setTagInput] = useState("");
  const [placement, setPlacement] = useState<"gallery" | "hero" | "featured">(
    (photo.placement as "gallery" | "hero" | "featured") ?? "gallery",
  );

  function addTag(raw: string) {
    const clean = raw.trim().replace(/,$/, "").trim();
    if (!clean) return;
    if (clean.length > 60) return;
    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setTagInput("");
      return;
    }
    setTags((prev) => [...prev, clean]);
    setTagInput("");
  }

  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === "," || e.key === "Tab") {
      if (tagInput.trim()) {
        e.preventDefault();
        addTag(tagInput);
      }
    } else if (e.key === "Backspace" && !tagInput && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  }

  const tagSuggestions = existingTags.filter(
    (t) => !tags.some((existing) => existing.toLowerCase() === t.toLowerCase()),
  );
  const [displayWidth, setDisplayWidth] = useState(initialWidth);
  const [displayHeight, setDisplayHeight] = useState(initialHeight);
  const [rotation, setRotation] = useState(photo.rotation ?? 0);
  const [objectFit, setObjectFit] = useState(photo.objectFit ?? "cover");
  const [visible, setVisible] = useState(photo.visible);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      // Inclus le tag en cours de frappe s'il y en a un
      const finalTags = tagInput.trim()
        ? [
            ...tags,
            ...(tags.some(
              (t) => t.toLowerCase() === tagInput.trim().toLowerCase(),
            )
              ? []
              : [tagInput.trim()]),
          ]
        : tags;

      const result = await updatePhoto({
        id: photo.id,
        title: title.trim(),
        alt: alt.trim(),
        slug: slug.trim() || undefined,
        tags: finalTags,
        placement,
        displayWidth: displayWidth as "1" | "2" | "3" | "4" | "5",
        displayHeight: displayHeight as
          | "auto"
          | "1:1"
          | "3:4"
          | "4:3"
          | "16:9"
          | "2:3",
        rotation,
        objectFit: objectFit as "cover" | "contain",
        visible,
      });
      if (result.ok) {
        router.refresh();
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  const previewAspect =
    displayHeight === "auto"
      ? "aspect-[4/5]"
      : displayHeight === "1:1"
        ? "aspect-square"
        : displayHeight === "3:4"
          ? "aspect-[3/4]"
          : displayHeight === "2:3"
            ? "aspect-[2/3]"
            : displayHeight === "4:3"
              ? "aspect-[4/3]"
              : "aspect-video";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl md:flex-row"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Aperçu */}
        <div className="flex flex-1 items-center justify-center bg-neutral-100 p-8 md:max-w-md">
          <div
            className={`relative w-full ${previewAspect} overflow-hidden rounded transition-transform`}
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            <Image
              src={photo.url}
              alt=""
              fill
              sizes="400px"
              style={{ objectFit: objectFit as "cover" | "contain" }}
            />
          </div>
        </div>

        {/* Formulaire */}
        <form
          onSubmit={onSubmit}
          className="flex flex-1 flex-col overflow-y-auto"
        >
          <header className="flex items-center justify-between border-b border-neutral-200 px-6 py-4">
            <h2 className="text-lg font-light">Éditer la photo</h2>
            <button
              type="button"
              onClick={onClose}
              className="text-xl text-neutral-400 hover:text-neutral-900"
              aria-label="Fermer"
            >
              ×
            </button>
          </header>

          <div className="flex-1 space-y-5 px-6 py-5">
            <Field
              label="Titre"
              help="Nom affiché sous la photo sur le site"
            >
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Marais salants au crépuscule"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            </Field>

            <Field
              label="Description (alt)"
              help="Texte alternatif pour l'accessibilité (lecteurs d'écran, SEO)"
            >
              <input
                type="text"
                value={alt}
                onChange={(e) => setAlt(e.target.value)}
                placeholder="Description détaillée de l'image"
                className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
              />
            </Field>

            <Field
              label="URL (slug)"
              help="L'URL publique de la photo : /photo/[slug]. Modifier casse les liens existants."
            >
              <div className="flex items-center gap-2">
                <span className="rounded-l-md border border-r-0 border-neutral-300 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                  /photo/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="marais-salants-a3f9c2"
                  pattern="[a-z0-9]+(-[a-z0-9]+)*"
                  className="w-full rounded-r-md border border-neutral-300 px-3 py-2 font-mono text-sm outline-none focus:border-neutral-900"
                />
              </div>
            </Field>

            <Field
              label="Tags"
              help="Une photo peut avoir plusieurs tags → elle apparaît dans toutes les sections correspondantes. Entrée ou virgule pour ajouter."
            >
              <div className="flex flex-wrap items-center gap-1.5 rounded-md border border-neutral-300 bg-white px-2 py-1.5 focus-within:border-neutral-900">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 rounded-full bg-neutral-900 px-2.5 py-0.5 text-xs text-white"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="text-white/70 hover:text-white"
                      aria-label={`Retirer ${tag}`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                <input
                  type="text"
                  list="tags-suggestions"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  onBlur={() => {
                    if (tagInput.trim()) addTag(tagInput);
                  }}
                  placeholder={
                    tags.length === 0
                      ? "Ex : Mariages, Portraits, Voyage..."
                      : "+ Ajouter un tag"
                  }
                  className="min-w-[120px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
                />
                <datalist id="tags-suggestions">
                  {tagSuggestions.map((t) => (
                    <option key={t} value={t} />
                  ))}
                </datalist>
              </div>
            </Field>

            <Field label="Position sur le site">
              <div className="space-y-2">
                {placementOptions.map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition ${
                      placement === opt.value
                        ? "border-neutral-900 bg-neutral-50"
                        : "border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <input
                      type="radio"
                      name="placement"
                      value={opt.value}
                      checked={placement === opt.value}
                      onChange={() => setPlacement(opt.value)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-sm font-medium text-neutral-900">
                        {opt.label}
                      </p>
                      <p className="text-xs text-neutral-500">{opt.help}</p>
                    </div>
                  </label>
                ))}
              </div>
            </Field>

            <details className="rounded-md border border-neutral-200">
              <summary className="cursor-pointer select-none px-3 py-2 text-xs uppercase tracking-[0.2em] text-neutral-600 hover:text-neutral-900">
                Apparence
              </summary>
              <div className="space-y-4 border-t border-neutral-200 px-3 py-4">
                <Field label="Largeur dans la grille">
                  <div className="grid grid-cols-5 gap-1.5">
                    {widthOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDisplayWidth(opt.value)}
                        className={`rounded-md border px-2 py-2 text-xs transition ${
                          displayWidth === opt.value
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label="Ratio">
                  <div className="grid grid-cols-3 gap-1.5">
                    {aspectOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setDisplayHeight(opt.value)}
                        className={`rounded-md border px-2 py-2 text-xs transition ${
                          displayHeight === opt.value
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </Field>

                <Field label={`Rotation : ${rotation}°`}>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={-15}
                      max={15}
                      step={1}
                      value={rotation}
                      onChange={(e) => setRotation(Number(e.target.value))}
                      className="flex-1"
                    />
                    <button
                      type="button"
                      onClick={() => setRotation(0)}
                      className="text-xs text-neutral-500 hover:text-neutral-900"
                    >
                      Reset
                    </button>
                  </div>
                </Field>

                <Field label="Cadrage">
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setObjectFit("cover")}
                      className={`rounded-md border px-2 py-2 text-xs transition ${
                        objectFit === "cover"
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                      }`}
                    >
                      Couvrir (recadre)
                    </button>
                    <button
                      type="button"
                      onClick={() => setObjectFit("contain")}
                      className={`rounded-md border px-2 py-2 text-xs transition ${
                        objectFit === "contain"
                          ? "border-neutral-900 bg-neutral-900 text-white"
                          : "border-neutral-300 text-neutral-700 hover:border-neutral-500"
                      }`}
                    >
                      Contenir (lettrebox)
                    </button>
                  </div>
                </Field>
              </div>
            </details>

            <Field label="Visibilité publique">
              <button
                type="button"
                onClick={() => setVisible(!visible)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-sm transition ${
                  visible
                    ? "border-green-300 bg-green-50 text-green-800"
                    : "border-neutral-300 bg-neutral-50 text-neutral-600"
                }`}
              >
                <span>{visible ? "Visible sur le site" : "Masquée"}</span>
                <span
                  className={`flex h-5 w-9 items-center rounded-full transition ${
                    visible
                      ? "bg-green-600 justify-end"
                      : "bg-neutral-300 justify-start"
                  }`}
                >
                  <span className="mx-0.5 h-4 w-4 rounded-full bg-white" />
                </span>
              </button>
            </Field>

            {error && (
              <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
          </div>

          <footer className="flex items-center justify-end gap-3 border-t border-neutral-200 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="text-sm text-neutral-600 hover:text-neutral-900"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-full bg-neutral-900 px-5 py-2 text-xs uppercase tracking-[0.2em] text-white hover:bg-neutral-700 disabled:opacity-50 transition"
            >
              {isPending ? "Enregistrement…" : "Enregistrer"}
            </button>
          </footer>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  help,
  children,
}: {
  label: string;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium text-neutral-700">{label}</p>
      {children}
      {help && <p className="text-xs text-neutral-500">{help}</p>}
    </div>
  );
}
