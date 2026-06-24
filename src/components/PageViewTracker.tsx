"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { hasAnalyticsConsent, CONSENT_EVENT } from "./CookieConsent";

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

export function PageViewTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin") || pathname === "/login") {
      return;
    }

    const send = () => {
      // Mesure d'audience soumise au consentement (le session_id n'est
      // créé qu'après accord).
      if (!hasAnalyticsConsent()) return;
      if (lastPath.current === pathname) return;
      lastPath.current = pathname;

      const sessionId = getSessionId();
      const referrer = document.referrer || undefined;

      fetch("/api/stats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        keepalive: true,
        body: JSON.stringify({
          type: "pageview",
          path: pathname,
          referrer,
          sessionId,
        }),
      }).catch(() => {
        /* silently fail — stats shouldn't break UX */
      });
    };

    send();

    // Si l'utilisateur accepte après l'affichage, on enregistre la vue courante.
    const onConsent = () => send();
    window.addEventListener(CONSENT_EVENT, onConsent);
    return () => window.removeEventListener(CONSENT_EVENT, onConsent);
  }, [pathname]);

  return null;
}

export function trackInteraction(params: {
  interactionType: string;
  targetId?: string;
  targetType?: string;
  metadata?: Record<string, unknown>;
}) {
  if (typeof window === "undefined") return;
  // Pas de mesure d'audience sans consentement.
  if (!hasAnalyticsConsent()) return;
  const sessionId = getSessionId();
  fetch("/api/stats", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    keepalive: true,
    body: JSON.stringify({
      type: "interaction",
      path: window.location.pathname,
      sessionId,
      ...params,
    }),
  }).catch(() => {});
}
