import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { legalInfo } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Traitement des données personnelles et droits RGPD sur ce site.",
};

export default function ConfidentialitePage() {
  const { editor, host, database, privacy } = legalInfo;
  const r = privacy.retention;

  return (
    <LegalPage
      eyebrow="Protection des données"
      title="Politique de confidentialité"
    >
      <LegalSection title="Responsable du traitement">
        <p>
          Le responsable du traitement des données est {editor.name}
          {editor.address ? `, ${editor.address}` : ""}. Pour toute question
          relative à vos données ou pour exercer vos droits, vous pouvez écrire
          à{" "}
          <a
            href={`mailto:${privacy.contactEmail}`}
            className="underline underline-offset-4 hover:opacity-70"
          >
            {privacy.contactEmail}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Données collectées et finalités">
        <p>Ce site collecte des données dans les cas suivants :</p>
        <ul className="ml-4 list-disc space-y-2 marker:text-neutral-400">
          <li>
            <strong className="font-medium">Formulaire de contact</strong> :
            nom, adresse email, objet et message, ainsi qu&apos;une adresse IP
            sous forme hachée. Finalité : traiter et répondre à votre demande.
          </li>
          <li>
            <strong className="font-medium">Mesure d&apos;audience</strong> :
            pages consultées, site référent, type de navigateur, pays et un
            identifiant de session (stocké dans votre navigateur), avec adresse
            IP hachée. Finalité : mesurer la fréquentation du site de façon
            interne et anonymisée. Ce traitement est soumis à votre consentement
            (voir la{" "}
            <a
              href="/cookies"
              className="underline underline-offset-4 hover:opacity-70"
            >
              politique cookies
            </a>
            ).
          </li>
          <li>
            <strong className="font-medium">Mentions « j&apos;aime » et
            interactions</strong> : un identifiant de session pour éviter les
            doublons et fournir la fonctionnalité demandée.
          </li>
          <li>
            <strong className="font-medium">Galeries clients</strong> :
            l&apos;accès est protégé par un mot de passe stocké de façon hachée.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Base légale">
        <p>
          Le traitement des messages de contact repose sur l&apos;exécution de
          votre demande. La mesure d&apos;audience repose sur votre{" "}
          consentement. Les fonctionnalités du site (galeries, « j&apos;aime »)
          reposent sur l&apos;intérêt légitime de l&apos;éditeur à fournir un
          service fonctionnel.
        </p>
      </LegalSection>

      <LegalSection title="Durées de conservation">
        <ul className="ml-4 list-disc space-y-2 marker:text-neutral-400">
          <li>Messages de contact : {r.contactMessages}.</li>
          <li>Données de mesure d&apos;audience : {r.audience}.</li>
          <li>Interactions et « j&apos;aime » : {r.likesInteractions}.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Destinataires et sous-traitants">
        <p>
          Vos données ne sont ni vendues ni cédées à des tiers à des fins
          commerciales. Elles sont traitées par les prestataires techniques
          suivants :
        </p>
        <ul className="ml-4 list-disc space-y-2 marker:text-neutral-400">
          <li>
            <strong className="font-medium">{host.name}</strong> — hébergement
            du site (serveurs localisés en {host.serverLocation}).
          </li>
          <li>
            <strong className="font-medium">{database.provider}</strong> — base
            de données, sur l&apos;infrastructure {database.infrastructure}{" "}
            ({database.location}).{" "}
            {database.adequacy
              ? "Le Royaume-Uni bénéficie d'une décision d'adéquation de la Commission européenne, garantissant un niveau de protection équivalent."
              : ""}
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Vos droits">
        <p>
          Conformément au Règlement général sur la protection des données
          (RGPD) et à la loi « Informatique et Libertés », vous disposez des
          droits d&apos;accès, de rectification, d&apos;effacement, de
          limitation, d&apos;opposition et de portabilité de vos données. Vous
          pouvez les exercer à tout moment en écrivant à{" "}
          <a
            href={`mailto:${privacy.contactEmail}`}
            className="underline underline-offset-4 hover:opacity-70"
          >
            {privacy.contactEmail}
          </a>
          .
        </p>
        <p>
          Vous disposez également du droit d&apos;introduire une réclamation
          auprès de la CNIL (
          <a
            href="https://www.cnil.fr"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:opacity-70"
          >
            www.cnil.fr
          </a>
          ).
        </p>
      </LegalSection>
    </LegalPage>
  );
}
