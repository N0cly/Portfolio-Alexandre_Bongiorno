"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import imageCompression from "browser-image-compression";
import { StorageGauge, useStorageUsage } from "./StorageGauge";
import { isStorageFull } from "@/lib/storage-types";

const MAX_FILE_SIZE_MB = 25;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

const COMPRESSION_OPTIONS = {
  maxSizeMB: 3,
  maxWidthOrHeight: 2400,
  useWebWorker: true,
  initialQuality: 0.85,
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
};

export function ClientGalleryUploader({ galleryId }: { galleryId: string }) {
  const router = useRouter();
  const { usage, applyUsage } = useStorageUsage(null);
  const storageFull = usage ? isStorageFull(usage) : false;
  const storageFullRef = useRef(false);
  storageFullRef.current = storageFull;

  const [uploads, setUploads] = useState<LocalUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadsRef = useRef<LocalUpload[]>([]);
  const isUploadingRef = useRef(false);
  uploadsRef.current = uploads;

  const updateById = useCallback(
    (id: string, patch: Partial<LocalUpload>) => {
      setUploads((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
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

      const item = pending[0];
      const single = [item.file];
      updateUploadsByFiles(single, { status: "uploading" });

      try {
        const fd = new FormData();
        fd.append("files", item.file, item.file.name);
        fd.append("galleryId", galleryId);
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
  }, [updateUploadsByFiles, applyUsage, router, galleryId]);

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
        });
        toCompress.push({ id, file });
      });

      setUploads((prev) => [...initialItems, ...prev]);

      // Compression parallèle (max 4)
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
    <div className="space-y-4">
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
              Libère de l&apos;espace en supprimant des photos pour réactiver
              l&apos;envoi.
            </p>
          </>
        ) : (
          <>
            <p className="text-sm font-medium text-neutral-700">
              Glisse des photos privées ici ou clique pour parcourir
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              Photos uniquement visibles dans cette galerie cliente · Jamais sur
              le site public · Max {MAX_FILE_SIZE_MB} MB par fichier ·
              Compression auto
            </p>
          </>
        )}
      </div>

      {(totalInProgress > 0 || totalDone > 0 || totalError > 0) && (
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
        </div>
      )}

      {uploads.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:grid-cols-5 lg:grid-cols-6">
          {uploads.map((item) => {
            const isError =
              item.status === "error" || item.status === "rejected";
            const isDone = item.status === "done";
            return (
              <div
                key={item.id}
                className="relative aspect-square overflow-hidden rounded-lg bg-neutral-100"
              >
                {item.previewUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.previewUrl}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-neutral-400">
                    ?
                  </div>
                )}

                {!isError && !isDone && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-[1px]">
                    <svg
                      className="h-5 w-5 animate-spin text-white"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        className="opacity-25"
                      />
                      <path
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v3a5 5 0 00-5 5H4z"
                      />
                    </svg>
                    <p className="mt-1 text-[10px] text-white/90">
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
                    <div className="rounded-full bg-white/90 p-1.5 text-green-700">
                      <svg
                        width="14"
                        height="14"
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
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-1.5 text-center">
                      <p
                        className="text-[10px] text-white"
                        title={item.error}
                      >
                        ✕
                      </p>
                      <div className="flex gap-1">
                        {item.status === "error" && (
                          <button
                            onClick={() => retryUpload(item.id)}
                            className="rounded bg-white/90 px-1.5 py-0.5 text-[9px] text-neutral-900"
                          >
                            Retry
                          </button>
                        )}
                        <button
                          onClick={() => removeUpload(item.id)}
                          className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] text-white"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
