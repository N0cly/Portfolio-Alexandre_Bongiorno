"use client";

import { useEffect, useState, useTransition } from "react";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = sessionStorage.getItem("session_id");
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    sessionStorage.setItem("session_id", id);
  }
  return id;
}

export function LikeButton({
  photoId,
  initialCount,
}: {
  photoId: string;
  initialCount: number;
}) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Récupère l'état initial (a déjà liké ?)
  useEffect(() => {
    const sessionId = getSessionId();
    if (!sessionId) return;
    fetch(`/api/likes?photoId=${photoId}&sessionId=${sessionId}`)
      .then((r) => r.json())
      .then((d) => setLiked(Boolean(d.liked)))
      .catch(() => {});
  }, [photoId]);

  function toggle() {
    const sessionId = getSessionId();
    if (!sessionId) return;
    const wasLiked = liked;
    const newLiked = !wasLiked;
    // Update optimistic
    setLiked(newLiked);
    setCount((c) => c + (newLiked ? 1 : -1));

    startTransition(async () => {
      try {
        const res = await fetch("/api/likes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            photoId,
            sessionId,
            action: newLiked ? "like" : "unlike",
          }),
        });
        const data = await res.json();
        if (typeof data.likesCount === "number") {
          setCount(data.likesCount);
        }
      } catch {
        // Rollback en cas d'erreur
        setLiked(wasLiked);
        setCount((c) => c + (wasLiked ? 1 : -1));
      }
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition ${
        liked
          ? "border-red-300 bg-red-50 text-red-700"
          : "border-neutral-300 text-neutral-700 hover:border-neutral-900 hover:text-neutral-900"
      }`}
      aria-pressed={liked}
      aria-label={liked ? "Retirer mon like" : "Aimer cette photo"}
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill={liked ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
      <span className="tabular-nums">{count}</span>
    </button>
  );
}
