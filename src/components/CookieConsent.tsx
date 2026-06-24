"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

/** Clé de stockage du choix de consentement (localStorage). */
export const CONSENT_KEY = "cookie_consent";
/** Événement émis quand le consentement change (écouté par le tracker). */
export const CONSENT_EVENT = "cookie-consent-changed";
/** Durée de validité du consentement (CNIL : ré-interroger ~tous les 6 mois). */
const CONSENT_MAX_AGE_DAYS = 182;

type Choice = "accepted" | "refused";
type StoredConsent = { choice: Choice; date: string };

function readConsent(): StoredConsent | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CONSENT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.choice !== "accepted" && parsed.choice !== "refused") return null;
    // Expiration : on ré-interroge passé le délai.
    const ageMs = Date.now() - new Date(parsed.date).getTime();
    if (
      !Number.isFinite(ageMs) ||
      ageMs > CONSENT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

/** Vrai si l'utilisateur a accepté la mesure d'audience (et non expiré). */
export function hasAnalyticsConsent(): boolean {
  return readConsent()?.choice === "accepted";
}

function writeConsent(choice: Choice) {
  if (typeof window === "undefined") return;
  try {
    const value: StoredConsent = { choice, date: new Date().toISOString() };
    window.localStorage.setItem(CONSENT_KEY, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: choice }));
  } catch {
    /* localStorage indisponible : on ignore */
  }
}

/** Bandeau de consentement, affiché tant qu'aucun choix valide n'existe. */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Décision absente ou expirée → on affiche le bandeau.
    if (readConsent() === null) setVisible(true);
  }, []);

  if (!visible) return null;

  const decide = (choice: Choice) => {
    writeConsent(choice);
    setVisible(false);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Consentement à la mesure d'audience"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-300 bg-[#fafaf8]/95 px-6 py-4 backdrop-blur"
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm leading-relaxed text-neutral-700">
          Ce site utilise un identifiant de session (stocké dans votre
          navigateur) pour une mesure d&apos;audience interne, sans suivi
          publicitaire ni partage avec des tiers.{" "}
          <Link
            href="/cookies"
            className="underline underline-offset-4 hover:opacity-70"
          >
            En savoir plus
          </Link>
          .
        </p>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={() => decide("refused")}
            className="rounded-full border border-neutral-300 px-4 py-1.5 text-xs uppercase tracking-[0.15em] text-neutral-700 transition hover:border-neutral-900 hover:text-neutral-900"
          >
            Refuser
          </button>
          <button
            type="button"
            onClick={() => decide("accepted")}
            className="rounded-full bg-neutral-900 px-4 py-1.5 text-xs uppercase tracking-[0.15em] text-white transition hover:bg-neutral-700"
          >
            Accepter
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Bouton à placer sur la page Cookies : permet de retirer/modifier le
 * consentement aussi facilement que de le donner (réaffiche le bandeau).
 */
export function CookiePreferencesButton() {
  const reset = () => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(CONSENT_KEY);
      window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: "reset" }));
    } catch {
      /* ignore */
    }
    window.location.reload();
  };

  return (
    <button
      type="button"
      onClick={reset}
      className="inline-block text-xs uppercase tracking-[0.2em] text-neutral-600 underline underline-offset-4 transition hover:text-neutral-900"
    >
      Modifier mes préférences de consentement
    </button>
  );
}
