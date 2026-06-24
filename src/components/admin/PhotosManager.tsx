"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { reorderPhotos } from "@/app/admin/photos/actions";
import { PhotoEditor, type EditablePhoto } from "./PhotoEditor";
import { StorageGauge, useStorageUsage } from "./StorageGauge";
import { isStorageFull, type StorageUsage } from "@/lib/storage-types";

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

// Compression : on cible 3 MB max, 2400px côté long, qualité auto
const COMPRESSION_OPTIONS = {
  maxSizeMB: 3,
  maxWidthOrHeight: 2400,
  useWebWorker: true,
  initialQuality: 0.85,
};

type ServerPhoto = EditablePhoto & {
  fileSize: number | null;
  createdAt: string | Date;
};

type LocalUpload = {
  id: string;
  file: File;
  previewUrl: string;
  status:
    | "compressing"
    | "pending"
    | "uploading"
    | "done"
    | "error"
    | "rejected";
  error?: string;
  originalSize?: number;
};

export function PhotosManager({
  photos,
  existingTags,
  context = "gallery",
  initialStorage = null,
}: {
  photos: ServerPhoto[];
  existingTags: string[];
  context?: "gallery" | "selection";
  initialStorage?: StorageUsage | null;
}) {
  const router = useRouter();
  const {
    usage,
    refresh: refreshUsage,
    applyUsage,
  } = useStorageUsage(initialStorage);
  const storageFull = usage ? isStorageFull(usage) : false;
  const storageFullRef = useRef(false);
  storageFullRef.current = storageFull;

  const [uploads, setUploads] = useState<LocalUpload[]>([]);
  const [orderedPhotos, setOrderedPhotos] = useState<ServerPhoto[]>(photos);
  const [isDragging, setIsDragging] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderStatus, setReorderStatus] = useState<string | null>(null);
  const [editingPhoto, setEditingPhoto] = useState<EditablePhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadsRef = useRef<LocalUpload[]>([]);
  const isUploadingRef = useRef(false);
  uploadsRef.current = uploads;

  useEffect(() => {
    setOrderedPhotos(photos);
  }, [photos]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const updateUploadsByFiles = useCallback(
    (files: File[], patch: Partial<LocalUpload>) => {
      setUploads((prev) =>
        prev.map((item) =>
          files.includes(item.file) ? { ...item, ...patch } : item,
        ),
      );
    },
    [],
  );

  const processQueue = useCallback(async () => {
    if (isUploadingRef.current) return;
    isUploadingRef.current = true;

    while (true) {
      const pending = uploadsRef.current.filter(
        (i) => i.status === "pending",
      );
      if (pending.length === 0) break;

      // Upload séquentiel (un fichier par requête) : chaque envoi voit
      // l'espace déjà consommé par le précédent, ce qui rend le contrôle
      // de quota côté serveur fiable.
      const item = pending[0];
      const single = [item.file];
      updateUploadsByFiles(single, { status: "uploading" });

      try {
        const fd = new FormData();
        fd.append("files", item.file, item.file.name);
        const res = await fetch("/api/upload", { method: "POST", body: fd });
        const data = await res.json().catch(() => null);

        if (data?.usage) applyUsage(data.usage);

        const fileResult = data?.results?.[0];
        if (res.ok && fileResult?.ok) {
          updateUploadsByFiles(single, { status: "done" });
          router.refresh();
        } else if (fileResult?.quota || res.status === 413) {
          updateUploadsByFiles(single, {
            status: "error",
            error: "Stockage plein — libère de l'espace",
          });
        } else {
          updateUploadsByFiles(single, {
            status: "error",
            error: fileResult?.error ?? "Upload échoué",
          });
        }
      } catch (err) {
        updateUploadsByFiles(single, {
          status: "error",
          error: err instanceof Error ? err.message : "Erreur réseau",
        });
      }
    }

    isUploadingRef.current = false;
  }, [updateUploadsByFiles, applyUsage, router]);

  const updateById = useCallback(
    (id: string, patch: Partial<LocalUpload>) => {
      setUploads((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const addFiles = useCallback(
    async (files: FileList | File[]) => {
      const initialItems: LocalUpload[] = [];
      const toCompress: { id: string; file: File }[] = [];

      Array.from(files).forEach((file) => {
        const id = crypto.randomUUID();
        if (storageFullRef.current) {
          initialItems.push({
            id,
            file,
            previewUrl: file.type.startsWith("image/")
              ? URL.createObjectURL(file)
              : "",
            status: "rejected",
            error: "Stockage plein",
          });
          return;
        }
        if (!file.type.startsWith("image/")) {
          initialItems.push({
            id,
            file,
            previewUrl: "",
            status: "rejected",
            error: "Pas une image",
          });
          return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
          initialItems.push({
            id,
            file,
            previewUrl: URL.createObjectURL(file),
            status: "rejected",
            error: `Trop volumineux : ${(file.size / 1024 / 1024).toFixed(1)} MB`,
          });
          return;
        }
        initialItems.push({
          id,
          file,
          previewUrl: URL.createObjectURL(file),
          status: "compressing",
          originalSize: file.size,
        });
        toCompress.push({ id, file });
      });

      setUploads((prev) => [...initialItems, ...prev]);

      // Compression en parallèle (max 4 simultanées pour pas saturer le CPU)
      const queue = [...toCompress];
      const workers = Array.from({ length: Math.min(4, queue.length) }, () =>
        (async () => {
          while (queue.length > 0) {
            const item = queue.shift();
            if (!item) break;
            try {
              const compressed = await imageCompression(
                item.file,
                COMPRESSION_OPTIONS,
              );
              // Préserve l'extension correcte
              const renamed = new File([compressed], item.file.name, {
                type: compressed.type,
                lastModified: Date.now(),
              });
              updateById(item.id, { file: renamed, status: "pending" });
            } catch (err) {
              updateById(item.id, {
                status: "error",
                error:
                  err instanceof Error
                    ? `Compression : ${err.message}`
                    : "Erreur compression",
              });
            }
          }
        })(),
      );
      await Promise.all(workers);
    },
    [updateById],
  );

  useEffect(() => {
    const hasPending = uploads.some((i) => i.status === "pending");
    if (hasPending && !isUploadingRef.current) {
      processQueue();
    }
  }, [uploads, processQueue]);

  useEffect(() => {
    if (uploads.length === 0) return;
    const doneIds = uploads
      .filter((i) => i.status === "done")
      .map((i) => i.id);
    if (doneIds.length === 0) return;
    const timer = setTimeout(() => {
      setUploads((prev) => {
        prev.forEach((i) => {
          if (doneIds.includes(i.id) && i.previewUrl) {
            URL.revokeObjectURL(i.previewUrl);
          }
        });
        return prev.filter((i) => !doneIds.includes(i.id));
      });
    }, 800);
    return () => clearTimeout(timer);
  }, [uploads]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  };

  const removeUpload = (id: string) => {
    setUploads((prev) => {
      const item = prev.find((i) => i.id === id);
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.id !== id);
    });
  };

  const retryUpload = (id: string) => {
    setUploads((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, status: "pending", error: undefined } : i,
      ),
    );
  };

  async function handleDelete(id: string) {
    if (!confirm("Supprimer cette photo ?")) return;
    setDeletingId(id);
    const res = await fetch(`/api/photos/${id}`, { method: "DELETE" });
    setDeletingId(null);
    if (res.ok) {
      router.refresh();
      refreshUsage();
    } else {
      alert("Erreur lors de la suppression");
    }
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedPhotos.findIndex((p) => p.id === active.id);
    const newIndex = orderedPhotos.findIndex((p) => p.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const newOrder = arrayMove(orderedPhotos, oldIndex, newIndex);
    setOrderedPhotos(newOrder);
    setReorderStatus("Enregistrement…");

    const result = await reorderPhotos(newOrder.map((p) => p.id), context);
    if (result.ok) {
      setReorderStatus(
        context === "selection"
          ? "Ordre sélection enregistré ✓"
          : "Ordre galerie enregistré ✓",
      );
      setTimeout(() => setReorderStatus(null), 1500);
    } else {
      setReorderStatus(`Erreur : ${result.error}`);
      setOrderedPhotos(photos);
    }
  }

  const totalInProgress = uploads.filter(
    (u) =>
      u.status === "uploading" ||
      u.status === "pending" ||
      u.status === "compressing",
  ).length;
  const totalDone = uploads.filter((u) => u.status === "done").length;
  const totalError = uploads.filter(
    (u) => u.status === "error" || u.status === "rejected",
  ).length;

  return (
    <div className="space-y-6">
      <StorageGauge usage={usage} />

      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!storageFull) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => {
          if (!storageFull) fileInputRef.current?.click();
        }}
        aria-disabled={storageFull}
        className={`rounded-2xl border-2 border-dashed p-6 text-center transition ${
          storageFull
            ? "cursor-not-allowed border-red-200 bg-red-50/50 opacity-70"
            : isDragging
              ? "cursor-pointer border-neutral-900 bg-neutral-50"
              : "cursor-pointer border-neutral-300 hover:border-neutral-500"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          disabled={storageFull}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {storageFull ? (
          <>
            <p className="text-sm font-medium text-red-700">
              Stockage plein — upload désactivé
            </p>
            <p className="mt-1 text-xs text-red-600">
              Supprime des photos ci-dessous pour libérer de l&apos;espace et
              réactiver l&apos;envoi.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-neutral-700">
              Glisse tes photos ici ou clique pour parcourir
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Taille max {MAX_FILE_SIZE_MB} MB · Compression auto (max 2400px /
              3MB) · Pas de limite de nombre
            </p>
          </>
        )}
      </div>

      {(totalInProgress > 0 ||
        totalDone > 0 ||
        totalError > 0 ||
        reorderStatus) && (
        <div className="flex flex-wrap items-center gap-4 rounded-lg bg-neutral-50 px-4 py-2 text-sm">
          {totalInProgress > 0 && (
            <span className="flex items-center gap-1.5 text-blue-700">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-600" />
              {totalInProgress} en cours
            </span>
          )}
          {totalDone > 0 && (
            <span className="text-green-700">✓ {totalDone} terminé(s)</span>
          )}
          {totalError > 0 && (
            <span className="text-red-700">✕ {totalError} erreur(s)</span>
          )}
          {reorderStatus && (
            <span className="text-neutral-700">{reorderStatus}</span>
          )}
        </div>
      )}

      {orderedPhotos.length > 0 && (
        <p className="text-xs text-neutral-500">
          {context === "selection"
            ? "Glisse pour modifier l'ordre dans la sélection homepage (indépendant de l'ordre galerie)"
            : "Glisse pour modifier l'ordre dans la galerie · clique sur ✎ pour éditer une photo"}
        </p>
      )}

      {orderedPhotos.length === 0 && uploads.length === 0 ? (
        <p className="py-12 text-center text-sm text-neutral-500">
          Aucune photo pour l'instant.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {uploads.map((item) => (
            <UploadTile
              key={item.id}
              item={item}
              onRemove={() => removeUpload(item.id)}
              onRetry={() => retryUpload(item.id)}
            />
          ))}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={orderedPhotos.map((p) => p.id)}
              strategy={rectSortingStrategy}
            >
              {orderedPhotos.map((photo, i) => (
                <SortableServerTile
                  key={photo.id}
                  photo={photo}
                  isFirst={i === 0 && uploads.length === 0}
                  isDeleting={deletingId === photo.id}
                  onDelete={() => handleDelete(photo.id)}
                  onEdit={() => setEditingPhoto(photo)}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}

      {editingPhoto && (
        <PhotoEditor
          photo={editingPhoto}
          existingTags={existingTags}
          onClose={() => setEditingPhoto(null)}
        />
      )}
    </div>
  );
}

function UploadTile({
  item,
  onRemove,
  onRetry,
}: {
  item: LocalUpload;
  onRemove: () => void;
  onRetry: () => void;
}) {
  const isError = item.status === "error" || item.status === "rejected";
  const isDone = item.status === "done";

  return (
    <div className="group relative aspect-square overflow-hidden rounded-lg bg-neutral-100">
      {item.previewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.previewUrl}
          alt=""
          className="h-full w-full object-cover"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
          Fichier invalide
        </div>
      )}

      {!isError && !isDone && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
          <Spinner />
          <p className="mt-2 text-xs text-white/90">
            {item.status === "uploading"
              ? "Upload…"
              : item.status === "compressing"
                ? "Compression…"
                : "En attente"}
          </p>
        </div>
      )}

      {isDone && (
        <div className="absolute inset-0 flex items-center justify-center bg-green-500/30">
          <div className="rounded-full bg-white/90 p-2 text-green-700">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>
      )}

      {isError && (
        <>
          <div className="absolute inset-0 bg-red-900/60" />
          <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center">
            <p className="text-xs text-white" title={item.error}>
              ✕ {item.error}
            </p>
            <div className="mt-2 flex gap-2">
              {item.status === "error" && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRetry();
                  }}
                  className="rounded-full bg-white/90 px-3 py-1 text-xs text-neutral-900 hover:bg-white"
                >
                  Réessayer
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                className="rounded-full bg-white/20 px-3 py-1 text-xs text-white hover:bg-white/30"
              >
                Retirer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function SortableServerTile({
  photo,
  isFirst,
  isDeleting,
  onDelete,
  onEdit,
}: {
  photo: EditablePhoto;
  isFirst: boolean;
  isDeleting: boolean;
  onDelete: () => void;
  onEdit: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: photo.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
    opacity: isDragging ? 0.6 : 1,
    cursor: isDragging ? "grabbing" : "grab",
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`group relative aspect-square overflow-hidden rounded-lg bg-neutral-100 ${
        isDragging ? "ring-2 ring-neutral-900 shadow-2xl" : ""
      } ${!photo.visible ? "opacity-50" : ""}`}
    >
      <Image
        src={photo.url}
        alt={photo.alt ?? photo.title ?? ""}
        fill
        sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
        priority={isFirst}
        draggable={false}
        className="pointer-events-none object-cover"
      />

      <div className="pointer-events-none absolute left-2 top-2 flex flex-col gap-1">
        {!photo.visible && (
          <span className="rounded bg-neutral-900/80 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">
            Masquée
          </span>
        )}
        {photo.placement === "hero" && (
          <span className="rounded bg-amber-500/95 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">
            ★ Hero
          </span>
        )}
        {photo.placement === "featured" && (
          <span className="rounded bg-blue-600/90 px-2 py-0.5 text-[10px] uppercase tracking-wider text-white">
            ♦ Sélection
          </span>
        )}
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-start gap-1.5 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-3 pt-8 pb-2 opacity-0 transition group-hover:opacity-100">
        {(photo.title || photo.alt) && (
          <p className="max-w-full truncate text-xs text-white">
            {photo.title ?? photo.alt}
          </p>
        )}
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] uppercase tracking-wider text-neutral-600">
          ⋮⋮ glisser
        </span>
      </div>

      <div className="absolute right-2 top-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition">
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="rounded-full bg-white/90 px-2.5 py-1 text-xs hover:bg-white"
          title="Éditer"
        >
          ✎
        </button>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          disabled={isDeleting}
          className="rounded-full bg-white/90 px-2.5 py-1 text-xs hover:bg-white disabled:opacity-50"
          title="Supprimer"
        >
          {isDeleting ? "…" : "✕"}
        </button>
      </div>

    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-6 w-6 animate-spin text-white"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
      />
    </svg>
  );
}
