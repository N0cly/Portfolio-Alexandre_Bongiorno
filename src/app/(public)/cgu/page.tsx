import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { legalInfo } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Conditions générales d'utilisation",
  description: "Conditions générales d'utilisation du site.",
};

export default function CguPage() {
  const { editor, developer, photographer } = legalInfo;

  return (
    <LegalPage
      eyebrow="Conditions d'utilisation"
      title="Conditions générales d'utilisation"
    >
      <LegalSection title="Objet">
        <p>
          Les présentes conditions générales d&apos;utilisation (CGU) encadrent
          l&apos;accès et l&apos;utilisation du site. En naviguant sur le site,
          vous acceptez sans réserve les présentes CGU.
        </p>
      </LegalSection>

      <LegalSection title="Accès au site">
        <p>
          Le site est accessible gratuitement. Certaines sections (galeries
          clients) sont protégées par mot de passe et réservées à leurs
          destinataires. Tout accès non autorisé, ou toute tentative
          d&apos;accès, à ces espaces est interdit. Les identifiants
          communiqués sont strictement personnels et confidentiels.
        </p>
        <p>
          L&apos;éditeur s&apos;efforce d&apos;assurer la disponibilité du site
          mais ne saurait être tenu responsable d&apos;une interruption,
          temporaire ou définitive, notamment pour maintenance ou cas de force
          majeure.
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Les photographies présentes sur le site sont la propriété exclusive
          du photographe, {photographer.name}, et sont protégées par le droit
          d&apos;auteur. Les photographies des galeries clients ne peuvent être
          diffusées que dans le cadre convenu avec celui-ci.
        </p>
        <p>
          Le site lui-même (code source, conception, développement) est la
          propriété de {" "}
          <a
              href={developer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:opacity-70"
          >
            {developer.name}
          </a>, sauf cession expresse convenue par
          contrat. Toute reproduction ou utilisation des contenus du site, sans
          autorisation écrite préalable des titulaires de droits concernés, est
          interdite.
        </p>
      </LegalSection>

      <LegalSection title="Responsabilité">
        <p>
          Les informations diffusées sur le site sont fournies à titre
          indicatif. L&apos;éditeur ne saurait être tenu responsable des
          dommages directs ou indirects résultant de l&apos;utilisation du site
          ou de l&apos;impossibilité d&apos;y accéder. Le site peut contenir des
          liens vers des sites tiers, dont l&apos;éditeur ne maîtrise pas le
          contenu.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Le traitement des données personnelles est décrit dans la{" "}
          <a
            href="/confidentialite"
            className="underline underline-offset-4 hover:opacity-70"
          >
            politique de confidentialité
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Droit applicable">
        <p>
          Les présentes CGU sont soumises au droit français. En cas de litige,
          et à défaut de résolution amiable, les tribunaux français seront
          compétents. Pour toute question, vous pouvez contacter l&apos;éditeur
          à{" "}
          <a
            href={`mailto:${editor.email}`}
            className="underline underline-offset-4 hover:opacity-70"
          >
            {editor.email}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
