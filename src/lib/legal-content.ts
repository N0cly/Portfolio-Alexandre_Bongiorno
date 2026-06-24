/**
 * Source unique des informations légales du site.
 * Remplace les valeurs « À RENSEIGNER » par les vraies données de l'éditeur.
 *
 * Câblé d'après les infos fournies :
 *  - Hébergeur : IONOS (VPS, serveurs localisés en Espagne)
 *  - Base de données : Neon (serveurs AWS eu-west-2, Londres, Royaume-Uni)
 *  - Réalisation : Nocly (https://nocly.fr)
 */
export const legalInfo = {
  // Date de dernière mise à jour affichée sur les pages légales.
  lastUpdated: "24 juin 2026",

  // ── Éditeur du site ──────────────────────────────────────────────────
  // À COMPLÉTER : ces informations sont obligatoires (LCEN art. 6-III).
  editor: {
    name: "Enzo BEDOS", // ex. "Alexandre Bongiorno"
    legalStatus: "auto-entrepreneur", // ex. "Micro-entreprise (auto-entrepreneur)"
    siret: "939 642 377",
    vatNumber: "", // n° TVA intracommunautaire si assujetti, sinon ""
    address: "Av de la cote bleue, 13820 Ensues-la-Redonne, France",
    email: "enzo.bedos@nocly.fr",
    phone: "", // facultatif
    publicationDirector: "Enzo BEDOS", // en général = name
  },

  // ── Hébergeur (IONOS) ────────────────────────────────────────────────
  // Entité française d'IONOS ; serveurs (VPS) localisés en Espagne.
  // À vérifier sur ton contrat IONOS (entité + adresse exactes).
  host: {
    name: "IONOS SARL",
    address:
      "7 place de la Gare, BP 70109, 57200 Sarreguemines Cedex, France",
    phone: "0970 808 911",
    website: "https://www.ionos.fr",
    serverLocation: "Espagne",
  },

  // ── Base de données / sous-traitant ──────────────────────────────────
  database: {
    provider: "Neon Inc.", // société américaine
    infrastructure: "Amazon Web Services (AWS)",
    location: "Londres, Royaume-Uni (région eu-west-2)",
    // Le Royaume-Uni bénéficie d'une décision d'adéquation de la Commission
    // européenne (transfert encadré).
    adequacy: true,
  },

  // ── Réalisation du site ──────────────────────────────────────────────
  developer: {
    name: "Nocly",
    url: "https://nocly.fr",
  },

  // ── Contact RGPD ─────────────────────────────────────────────────────
  privacy: {
    contactEmail: "enzo.bedos@nocly.fr", // peut être identique à editor.email
    retention: {
      contactMessages: "3 ans à compter du dernier contact",
      audience: "25 mois",
      likesInteractions: "13 mois",
    },
  },
} as const;

export type LegalInfo = typeof legalInfo;
