// Types et helpers de stockage SANS dépendance Node (fs/path).
// Ce module est importable côté client (les helpers sont purs).

/** Limite de stockage par défaut : 2 Go. */
export const STORAGE_LIMIT_BYTES_DEFAULT = 2 * 1024 * 1024 * 1024;

export type StorageUsage = {
  /** Octets actuellement occupés sur le disque par les photos. */
  usedBytes: number;
  /** Limite maximale autorisée (octets). */
  limitBytes: number;
  /** Nombre de fichiers stockés. */
  fileCount: number;
};

/** Formate un nombre d'octets en unité lisible (o, Ko, Mo, Go, To). */
export function formatBytes(bytes: number, decimals = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 o";
  const k = 1024;
  const units = ["o", "Ko", "Mo", "Go", "To"];
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1,
  );
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : decimals)} ${units[i]}`;
}

/** Pourcentage d'occupation (0–100, borné). */
export function usagePercent(usage: StorageUsage): number {
  if (usage.limitBytes <= 0) return 0;
  return Math.min(100, Math.max(0, (usage.usedBytes / usage.limitBytes) * 100));
}

/** Vrai si le stockage est plein (plus aucune place disponible). */
export function isStorageFull(usage: StorageUsage): boolean {
  return usage.usedBytes >= usage.limitBytes;
}
