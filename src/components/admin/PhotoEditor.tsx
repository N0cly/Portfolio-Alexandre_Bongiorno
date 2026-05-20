"use client";

import { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { updatePhoto, extractPhotoExif } from "@/app/admin/photos/actions";
import {
  DemoteFeaturedModal,
  type FeaturedBrief,
} from "./DemoteFeaturedModal";

export type InfoField = {
  label: string;
  value: string;
  url?: string;
};

export type EditablePhoto = {
  id: string;
  url: string;
  title: string | null;
  alt: string | null;
  slug: string | null;
  category: string | null;
  tags: string[];
  takenAt: string | null; // ISO date string
  description: string | null;
  infoFields: InfoField[];
  exif: {
    make?: string;
    model?: string;
    lensModel?: string;
    focalLength?: number;
    fNumber?: number;
    iso?: number;
    exposureTime?: string;
    takenAt?: string;
    gps?: { lat: number; lng: number };
  } | null;
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
    help: "Plein écran d'accueil. L'ancienne photo hero passera automatiquement en galerie.",
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

  // Date prise de vue (format YYYY-MM-DD pour input type=date)
  const initialTakenAt = photo.takenAt
    ? new Date(photo.takenAt).toISOString().slice(0, 10)
    : "";
  const [takenAt, setTakenAt] = useState(initialTakenAt);
  const [description, setDescription] = useState(photo.description ?? "");
  const [infoFields, setInfoFields] = useState<InfoField[]>(
    photo.infoFields ?? [],
  );

  function addInfoField() {
    setInfoFields((prev) => [...prev, { label: "", value: "", url: "" }]);
  }
  function updateInfoField(i: number, patch: Partial<InfoField>) {
    setInfoFields((prev) =>
      prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)),
    );
  }
  function removeInfoField(i: number) {
    setInfoFields((prev) => prev.filter((_, idx) => idx !== i));
  }
  function moveInfoField(i: number, direction: -1 | 1) {
    setInfoFields((prev) => {
      const next = [...prev];
      const j = i + direction;
      if (j < 0 || j >= next.length) return prev;
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  }

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

  // État pour le modal de "qui rétrograder"
  const [demoteOpen, setDemoteOpen] = useState(false);
  const [demoteCandidates, setDemoteCandidates] = useState<FeaturedBrief[]>([]);

  function callUpdate(demotePhotoId?: string) {
    startTransition(async () => {
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

      const cleanedInfoFields = infoFields
        .filter((f) => f.label.trim() && f.value.trim())
        .map((f) => ({
          label: f.label.trim(),
          value: f.value.trim(),
          url: f.url && f.url.trim().length > 0 ? f.url.trim() : undefined,
        }));

      const result = await updatePhoto({
        id: photo.id,
        title: title.trim(),
        alt: alt.trim(),
        slug: slug.trim() || undefined,
        tags: finalTags,
        takenAt: takenAt || null,
        description: description.trim() || null,
        infoFields: cleanedInfoFields,
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
        demotePhotoId,
      });

      if (result.ok) {
        setDemoteOpen(false);
        router.refresh();
        onClose();
        return;
      }
      if ("needsDemotion" in result && result.needsDemotion) {
        setDemoteCandidates(result.current);
        setDemoteOpen(true);
        return;
      }
      if ("error" in result) {
        setError(result.error);
      }
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    callUpdate();
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
        className="flex h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white text-neutral-900 shadow-2xl md:flex-row"
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
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
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

          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-6 py-5">
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
              label="EXIF"
              help="Métadonnées techniques extraites du fichier (appareil, focale, ISO, GPS...)"
            >
              {photo.exif ? (
                <div className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {photo.exif.make && (
                      <div>
                        <span className="text-neutral-500">Marque : </span>
                        <span>{photo.exif.make}</span>
                      </div>
                    )}
                    {photo.exif.model && (
                      <div>
                        <span className="text-neutral-500">Boîtier : </span>
                        <span>{photo.exif.model}</span>
                      </div>
                    )}
                    {photo.exif.lensModel && (
                      <div className="col-span-2">
                        <span className="text-neutral-500">Objectif : </span>
                        <span>{photo.exif.lensModel}</span>
                      </div>
                    )}
                    {photo.exif.focalLength && (
                      <div>
                        <span className="text-neutral-500">Focale : </span>
                        <span>{photo.exif.focalLength} mm</span>
                      </div>
                    )}
                    {photo.exif.fNumber && (
                      <div>
                        <span className="text-neutral-500">Ouverture : </span>
                        <span>ƒ/{photo.exif.fNumber}</span>
                      </div>
                    )}
                    {photo.exif.iso && (
                      <div>
                        <span className="text-neutral-500">ISO : </span>
                        <span>{photo.exif.iso}</span>
                      </div>
                    )}
                    {photo.exif.exposureTime && (
                      <div>
                        <span className="text-neutral-500">Vitesse : </span>
                        <span>{photo.exif.exposureTime}</span>
                      </div>
                    )}
                    {photo.exif.gps && (
                      <div className="col-span-2">
                        <span className="text-neutral-500">GPS : </span>
                        <span>
                          {photo.exif.gps.lat.toFixed(5)},{" "}
                          {photo.exif.gps.lng.toFixed(5)}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => {
                      startTransition(async () => {
                        await extractPhotoExif(photo.id);
                        router.refresh();
                      });
                    }}
                    className="text-xs text-neutral-600 underline-offset-4 hover:text-neutral-900 hover:underline disabled:opacity-50"
                  >
                    {isPending ? "Lecture…" : "↻ Re-extraire l'EXIF"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => {
                    startTransition(async () => {
                      await extractPhotoExif(photo.id);
                      router.refresh();
                    });
                  }}
                  className="w-full rounded-md border border-dashed border-neutral-400 bg-white px-3 py-2 text-xs uppercase tracking-wider text-neutral-700 hover:border-neutral-900 disabled:opacity-50 transition"
                >
                  {isPending ? "Lecture…" : "Extraire les métadonnées EXIF"}
                </button>
              )}
            </Field>

            <Field
              label="Date prise de vue"
              help="Date du shooting. Affichée sur la page photo (optionnel)."
            >
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={takenAt}
                  onChange={(e) => setTakenAt(e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  className="rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
                />
                {takenAt && (
                  <button
                    type="button"
                    onClick={() => setTakenAt("")}
                    className="text-xs text-neutral-500 hover:text-neutral-900"
                  >
                    Effacer
                  </button>
                )}
              </div>
            </Field>

            <Field
              label="Description (longue)"
              help="Texte affiché sur la page individuelle de la photo. Pour ajouter un lien dans le texte, utilise plutôt la section « Informations supplémentaires »."
            >
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                maxLength={5000}
                placeholder="Quelques mots sur la photo, le contexte, l'histoire..."
                className="w-full resize-y rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-900"
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

            <Field
              label="Informations supplémentaires"
              help="Ajoute autant de champs que tu veux (Événement, Lieu, Client, Matériel...). Si tu mets une URL, la valeur devient un lien cliquable sur la page publique."
            >
              <div className="space-y-3">
                {infoFields.length === 0 && (
                  <p className="rounded-md border border-dashed border-neutral-300 px-3 py-3 text-center text-xs text-neutral-500">
                    Aucune info. Clique sur « + Ajouter » pour commencer.
                  </p>
                )}
                {infoFields.map((field, i) => (
                  <div
                    key={i}
                    className="space-y-2 rounded-md border border-neutral-200 bg-neutral-50 p-3"
                  >
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          updateInfoField(i, { label: e.target.value })
                        }
                        placeholder="Label (ex: Événement)"
                        maxLength={60}
                        className="flex-1 rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-xs font-medium outline-none focus:border-neutral-900"
                      />
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveInfoField(i, -1)}
                          disabled={i === 0}
                          className="rounded border border-neutral-300 bg-white px-2 py-0.5 text-xs hover:bg-neutral-100 disabled:opacity-30"
                          aria-label="Monter"
                          title="Monter"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveInfoField(i, 1)}
                          disabled={i === infoFields.length - 1}
                          className="rounded border border-neutral-300 bg-white px-2 py-0.5 text-xs hover:bg-neutral-100 disabled:opacity-30"
                          aria-label="Descendre"
                          title="Descendre"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeInfoField(i)}
                          className="rounded border border-red-300 bg-white px-2 py-0.5 text-xs text-red-700 hover:bg-red-50"
                          aria-label="Supprimer"
                          title="Supprimer"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                    <input
                      type="text"
                      value={field.value}
                      onChange={(e) =>
                        updateInfoField(i, { value: e.target.value })
                      }
                      placeholder="Valeur (ex: Festival Lollapalooza)"
                      maxLength={500}
                      className="w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-neutral-900"
                    />
                    <input
                      type="url"
                      value={field.url ?? ""}
                      onChange={(e) =>
                        updateInfoField(i, { url: e.target.value })
                      }
                      placeholder="Lien optionnel (https://...)"
                      maxLength={500}
                      className="w-full rounded-md border border-neutral-300 bg-white px-2.5 py-1.5 font-mono text-xs outline-none focus:border-neutral-900"
                    />
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addInfoField}
                  className="w-full rounded-md border border-dashed border-neutral-400 bg-white px-3 py-2 text-xs uppercase tracking-wider text-neutral-700 hover:border-neutral-900 hover:bg-neutral-50 transition"
                >
                  + Ajouter une info
                </button>
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

          <footer className="flex shrink-0 items-center justify-end gap-3 border-t border-neutral-200 bg-white px-6 py-4">
            {error && (
              <p className="mr-auto text-sm text-red-700">{error}</p>
            )}
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

      {/* Modal "qui rétrograder" — apparaît si la sélection est pleine */}
      <DemoteFeaturedModal
        open={demoteOpen}
        photos={demoteCandidates}
        onClose={() => setDemoteOpen(false)}
        onConfirm={(demoteId) => callUpdate(demoteId)}
        isPending={isPending}
      />
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
