import "server-only";
import exifr from "exifr";

export type ExtractedExif = {
  make?: string;
  model?: string;
  lensModel?: string;
  focalLength?: number;
  fNumber?: number;
  iso?: number;
  exposureTime?: string;
  takenAt?: string;
  gps?: { lat: number; lng: number };
};

function formatExposureTime(seconds: number | undefined): string | undefined {
  if (!seconds || seconds <= 0) return undefined;
  if (seconds >= 1) return `${seconds.toFixed(1)}s`;
  const denom = Math.round(1 / seconds);
  return `1/${denom}s`;
}

export async function extractExifFromUrl(
  url: string,
): Promise<ExtractedExif | null> {
  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    const data = await exifr.parse(buffer, {
      gps: true,
      pick: [
        "Make",
        "Model",
        "LensModel",
        "FocalLength",
        "FNumber",
        "ISO",
        "ISOSpeedRatings",
        "ExposureTime",
        "DateTimeOriginal",
        "CreateDate",
        "latitude",
        "longitude",
      ],
    });

    if (!data) return null;

    const exif: ExtractedExif = {};
    if (data.Make) exif.make = String(data.Make).trim();
    if (data.Model) exif.model = String(data.Model).trim();
    if (data.LensModel) exif.lensModel = String(data.LensModel).trim();
    if (typeof data.FocalLength === "number")
      exif.focalLength = Math.round(data.FocalLength);
    if (typeof data.FNumber === "number")
      exif.fNumber = Math.round(data.FNumber * 10) / 10;
    const iso = data.ISO ?? data.ISOSpeedRatings;
    if (typeof iso === "number") exif.iso = iso;
    if (typeof data.ExposureTime === "number") {
      exif.exposureTime = formatExposureTime(data.ExposureTime);
    }
    const taken = data.DateTimeOriginal ?? data.CreateDate;
    if (taken instanceof Date) {
      exif.takenAt = taken.toISOString();
    }
    if (
      typeof data.latitude === "number" &&
      typeof data.longitude === "number"
    ) {
      exif.gps = { lat: data.latitude, lng: data.longitude };
    }

    return exif;
  } catch {
    return null;
  }
}
