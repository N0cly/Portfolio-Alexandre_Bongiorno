import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/LegalPage";
import { legalInfo } from "@/lib/legal-content";

export const metadata: Metadata = {
  title: "Mentions légales",
  description: "Mentions légales du site.",
};

export default function MentionsLegalesPage() {
  const { editor, host, developer, photographer } = legalInfo;

  return (
    <LegalPage eyebrow="Informations légales" title="Mentions légales">
      <LegalSection title="Éditeur du site">
        <p>
          {editor.name}
          {editor.legalStatus ? ` — ${editor.legalStatus}` : ""}
        </p>
        <p>SIRET : {editor.siret}</p>
        {editor.vatNumber ? <p>N° TVA intracommunautaire : {editor.vatNumber}</p> : null}
        <p>Adresse : {editor.address}</p>
        <p>
          Email :{" "}
          <a
            href={`mailto:${editor.email}`}
            className="underline underline-offset-4 hover:opacity-70"
          >
            {editor.email}
          </a>
        </p>
        {editor.phone ? <p>Téléphone : {editor.phone}</p> : null}
      </LegalSection>

      <LegalSection title="Directeur de la publication">
        <p>{editor.publicationDirector}</p>
      </LegalSection>

      <LegalSection title="Hébergeur">
        <p>{host.name}</p>
        <p>{host.address}</p>
        {host.phone ? <p>Téléphone : {host.phone}</p> : null}
        {host.serverLocation ? (
          <p>Localisation des serveurs : {host.serverLocation}.</p>
        ) : null}
        {host.website ? (
          <p>
            <a
              href={host.website}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-4 hover:opacity-70"
            >
              {host.website}
            </a>
          </p>
        ) : null}
      </LegalSection>

      <LegalSection title="Conception et réalisation">
        <p>
          Site conçu et développé par{" "}
          <a
            href={developer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:opacity-70"
          >
            {developer.name}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Propriété intellectuelle">
        <p>
          Les photographies présentes sur ce site sont la propriété exclusive
          de {photographer.name} (le photographe), qui en détient l&apos;intégralité
          des droits d&apos;auteur. Toute reproduction, représentation ou
          diffusion, totale ou partielle, sans son autorisation écrite préalable
          est interdite.
        </p>
        <p>
          Le code source, la conception et le développement du site sont la
          propriété de{" "}
          <a
            href={developer.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:opacity-70"
          >
            {developer.name}
          </a>
          , sauf cession expresse de ces droits convenue par contrat. Toute
          reproduction ou réutilisation du code sans autorisation est interdite.
        </p>
        <p>
          Les autres contenus (textes, éléments graphiques) demeurent la
          propriété de leurs auteurs respectifs. Toute contrefaçon est
          sanctionnée par le Code de la propriété intellectuelle.
        </p>
      </LegalSection>

      <LegalSection title="Données personnelles">
        <p>
          Le traitement de vos données personnelles est décrit dans notre{" "}
          <a
            href="/confidentialite"
            className="underline underline-offset-4 hover:opacity-70"
          >
            politique de confidentialité
          </a>{" "}
          et notre{" "}
          <a
            href="/cookies"
            className="underline underline-offset-4 hover:opacity-70"
          >
            politique relative aux cookies et traceurs
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
