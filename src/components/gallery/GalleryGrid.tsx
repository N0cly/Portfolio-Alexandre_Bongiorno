"use client";

import Image from "next/image";
import Link from "next/link";
import { trackInteraction } from "@/components/PageViewTracker";

export type GalleryPhoto = {
  id: string;
  url: string;
  title: string | null;
  alt: string | null;
  slug?: string | null;
  width: number | null;
  height: number | null;
  displayWidth: string | null;
  displayHeight: string | null;
  rotation: number;
  objectFit: string | null;
};

const widthClasses: Record<string, string> = {
  "1": "md:col-span-1",
  "2": "md:col-span-2",
  "3": "md:col-span-3",
  "4": "md:col-span-4",
  "5": "md:col-span-6",
};

const aspectClasses: Record<string, string> = {
  auto: "aspect-[4/5]",
  "1:1": "aspect-square",
  "3:4": "aspect-[3/4]",
  "2:3": "aspect-[2/3]",
  "4:3": "aspect-[4/3]",
  "16:9": "aspect-video",
};

export function GalleryGrid({ photos }: { photos: GalleryPhoto[] }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-12 md:grid-cols-6">
      {photos.map((photo, i) => {
        const widthClass =
          widthClasses[photo.displayWidth ?? "2"] ?? "md:col-span-2";
        const aspectClass =
          aspectClasses[photo.displayHeight ?? "auto"] ?? "aspect-[4/5]";
        const rotation = photo.rotation ?? 0;
        const objectFit = (photo.objectFit ?? "cover") as "cover" | "contain";
        const offsetClass = i % 6 === 1 || i % 6 === 4 ? "md:mt-12" : "";
        const displayName = photo.title ?? photo.alt;
        const href = `/photo/${photo.slug ?? photo.id}`;

        return (
          <Link
            key={photo.id}
            href={href}
            onClick={() =>
              trackInteraction({
                interactionType: "photo_click",
                targetId: photo.id,
                targetType: "photo",
              })
            }
            className={`group block text-left ${widthClass} ${offsetClass}`}
          >
            <div
              className={`relative w-full overflow-hidden bg-neutral-100 ${aspectClass} transition-transform`}
              style={{ transform: `rotate(${rotation}deg)` }}
            >
              <Image
                src={photo.url}
                alt={photo.alt ?? photo.title ?? ""}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                loading="lazy"
                className="bg-neutral-200 transition duration-700 group-hover:scale-[1.03]"
                style={{ objectFit }}
              />
            </div>
            {displayName && (
              <p
                className="mt-4 text-sm italic text-neutral-500"
                style={{ fontFamily: "var(--font-serif)" }}
              >
                {displayName}
              </p>
            )}
          </Link>
        );
      })}
    </div>
  );
}
