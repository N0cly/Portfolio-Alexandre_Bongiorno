import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { CookiePreferencesButton } from "@/components/CookieConsent";
import { legalInfo } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Cookies & traceurs",
  description:
    "Utilisation des cookies et traceurs : mesure d'audience interne, sans suivi publicitaire.",
};

export default function CookiesPage() {
  const { privacy } = legalInfo;

  return (
    <LegalPage eyebrow="Vie privée" title="Cookies & traceurs">
      <LegalSection title="En résumé">
        <p>
          Ce site n&apos;utilise <strong className="font-medium">aucun cookie
          publicitaire ni cookie tiers</strong>. Il n&apos;y a pas de suivi
          entre sites ni de partage de données avec des régies publicitaires.
        </p>
      </LegalSection>

      <LegalSection title="Traceurs utilisés">
        <p>
          Le seul traceur déposé est un identifiant technique stocké dans le{" "}
          <em className="italic">stockage de session</em> de votre navigateur :
        </p>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b border-neutral-300 text-left text-xs uppercase tracking-wider text-neutral-500">
                <th className="py-2 pr-4 font-normal">Nom</th>
                <th className="py-2 pr-4 font-normal">Type</th>
                <th className="py-2 pr-4 font-normal">Finalité</th>
                <th className="py-2 font-normal">Durée</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-neutral-200">
                <td className="py-2 pr-4 font-mono text-xs">session_id</td>
                <td className="py-2 pr-4">sessionStorage</td>
                <td className="py-2 pr-4">
                  Mesure d&apos;audience interne et fonctionnalité « j&apos;aime »
                </td>
                <td className="py-2">Durée de la session de l&apos;onglet</td>
              </tr>
              <tr>
                <td className="py-2 pr-4 font-mono text-xs">cookie_consent</td>
                <td className="py-2 pr-4">localStorage</td>
                <td className="py-2 pr-4">
                  Mémorise votre choix de consentement (traceur strictement
                  nécessaire)
                </td>
                <td className="py-2">6 mois</td>
              </tr>
            </tbody>
          </table>
        </div>
      </LegalSection>

      <LegalSection title="Mesure d'audience">
        <p>
          La mesure d&apos;audience est{" "}
          <strong className="font-medium">interne (first-party)</strong> :
          l&apos;adresse IP est hachée et les données ne sont pas transmises à
          des tiers. Elle n&apos;est activée qu&apos;après votre consentement.
          Les données sont conservées {privacy.retention.audience}.
        </p>
      </LegalSection>

      <LegalSection title="Gérer votre consentement">
        <p>
          Vous pouvez retirer ou modifier votre consentement à tout moment :
        </p>
        <p>
          <CookiePreferencesButton />
        </p>
        <p className="text-neutral-500">
          Pour en savoir plus sur le traitement de vos données, consultez la{" "}
          <a
            href="/confidentialite"
            className="underline underline-offset-4 hover:opacity-70"
          >
            politique de confidentialité
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
