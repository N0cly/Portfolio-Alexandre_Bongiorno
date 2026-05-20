type Exif = {
  make?: string;
  model?: string;
  lensModel?: string;
  focalLength?: number;
  fNumber?: number;
  iso?: number;
  exposureTime?: string;
  gps?: { lat: number; lng: number };
};

export function PhotoExif({ exif }: { exif: Exif | null }) {
  if (!exif) return null;
  const hasAny =
    exif.make ||
    exif.model ||
    exif.lensModel ||
    exif.focalLength ||
    exif.fNumber ||
    exif.iso ||
    exif.exposureTime;
  if (!hasAny) return null;

  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.3em] text-neutral-500">
        Données techniques
      </p>
      <dl
        className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-neutral-700"
        style={{ fontFamily: "var(--font-serif)" }}
      >
        {exif.model && (
          <>
            <dt className="text-neutral-500">Boîtier</dt>
            <dd>{exif.model}</dd>
          </>
        )}
        {exif.lensModel && (
          <>
            <dt className="text-neutral-500">Objectif</dt>
            <dd className="truncate">{exif.lensModel}</dd>
          </>
        )}
        {exif.focalLength && (
          <>
            <dt className="text-neutral-500">Focale</dt>
            <dd>{exif.focalLength} mm</dd>
          </>
        )}
        {exif.fNumber && (
          <>
            <dt className="text-neutral-500">Ouverture</dt>
            <dd>ƒ/{exif.fNumber}</dd>
          </>
        )}
        {exif.iso && (
          <>
            <dt className="text-neutral-500">ISO</dt>
            <dd>{exif.iso}</dd>
          </>
        )}
        {exif.exposureTime && (
          <>
            <dt className="text-neutral-500">Vitesse</dt>
            <dd>{exif.exposureTime}</dd>
          </>
        )}
      </dl>
    </div>
  );
}

export function PhotoMap({ gps }: { gps: { lat: number; lng: number } | null }) {
  if (!gps) return null;
  // OpenStreetMap embed - aucun API key requis
  const bbox = `${gps.lng - 0.01},${gps.lat - 0.005},${gps.lng + 0.01},${gps.lat + 0.005}`;
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${gps.lat},${gps.lng}`;
  const link = `https://www.openstreetmap.org/?mlat=${gps.lat}&mlon=${gps.lng}#map=16/${gps.lat}/${gps.lng}`;

  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-[0.3em] text-neutral-500">
        Localisation
      </p>
      <div className="overflow-hidden rounded-md border border-neutral-200">
        <iframe
          src={src}
          width="100%"
          height="200"
          style={{ border: 0 }}
          loading="lazy"
          title="Carte de la photo"
        />
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
      >
        Voir sur OpenStreetMap ↗
      </a>
    </div>
  );
}
