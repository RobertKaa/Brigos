import { useEffect } from "react";
import { ArrowLeft, FileText } from "lucide-react";
import "./legal-notice.css";

// Only coordinates explicitly supplied for publication belong here.
// The remaining publisher information is tracked in Trello PK9HVdJB.
export type LegalPublisher = {
  name: string;
  status?: string;
  address?: string;
  phone?: string;
  publicationDirector?: string;
  registration?: string;
};
export const LEGAL_PUBLISHER: LegalPublisher | null = { name: "TreborKaa" };

export function LegalNotice({
  returnHref = "#boxes",
  publisher = LEGAL_PUBLISHER,
}: {
  returnHref?: string;
  publisher?: LegalPublisher | null;
}) {
  useEffect(() => {
    const previousTitle = document.title;
    document.title = "Mentions légales · Brigos";
    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <article className="legal-page" aria-labelledby="legal-title">
      <a className="legal-return" href={returnHref}>
        <ArrowLeft size={17} aria-hidden="true" />
        Revenir au jeu
      </a>
      <header className="legal-intro">
        <span className="eyebrow">
          <FileText size={16} aria-hidden="true" />À PROPOS DE BRIGOS
        </span>
        <h1 id="legal-title">Mentions légales</h1>
        <p>
          Les informations sur l’édition, l’hébergement et les contenus du site.
        </p>
      </header>

      {!publisher && (
        <p className="legal-draft" role="note">
          <strong>Version de travail</strong>
          Les coordonnées de l’éditeur doivent être complétées et validées avant
          publication.
        </p>
      )}

      <div className="legal-sections">
        <section className="legal-section" aria-labelledby="legal-publisher">
          <span className="legal-section-number" aria-hidden="true">
            01
          </span>
          <div>
            <h2 id="legal-publisher">Édition et contact</h2>
            {publisher ? (
              <dl className="legal-details">
                <div>
                  <dt>Éditeur</dt>
                  <dd>{publisher.name}</dd>
                </div>
                {publisher.status && (
                  <div>
                    <dt>Statut</dt>
                    <dd>{publisher.status}</dd>
                  </div>
                )}
                {publisher.address && (
                  <div>
                    <dt>Adresse</dt>
                    <dd>{publisher.address}</dd>
                  </div>
                )}
                <div>
                  <dt>Contact</dt>
                  <dd>
                    <a href="#contact">Contacter {publisher.name}</a>
                  </dd>
                </div>
                {publisher.phone && (
                  <div>
                    <dt>Téléphone</dt>
                    <dd>{publisher.phone}</dd>
                  </div>
                )}
                {publisher.publicationDirector && (
                  <div>
                    <dt>Direction de la publication</dt>
                    <dd>{publisher.publicationDirector}</dd>
                  </div>
                )}
                {publisher.registration && (
                  <div>
                    <dt>Immatriculation</dt>
                    <dd>{publisher.registration}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p>
                L’identité, le statut et les coordonnées de l’éditeur, ainsi que
                la direction de la publication, sont en cours de renseignement.
              </p>
            )}
          </div>
        </section>

        <section className="legal-section" aria-labelledby="legal-hosting">
          <span className="legal-section-number" aria-hidden="true">
            02
          </span>
          <div>
            <h2 id="legal-hosting">Hébergement</h2>
            <p>Le site brigoslab.com est hébergé par Cloudflare Pages.</p>
            <dl className="legal-details">
              <div>
                <dt>Hébergeur</dt>
                <dd>Cloudflare, Inc.</dd>
              </div>
              <div>
                <dt>Adresse</dt>
                <dd>
                  101 Townsend Street, San Francisco, CA 94107, États-Unis
                </dd>
              </div>
              <div>
                <dt>Téléphone</dt>
                <dd>+1 (650) 319-8930</dd>
              </div>
              <div>
                <dt>Site</dt>
                <dd>
                  <a
                    href="https://www.cloudflare.com/privacypolicy/"
                    rel="noreferrer"
                  >
                    Informations Cloudflare
                  </a>
                </dd>
              </div>
            </dl>
            <p className="legal-secondary">
              La démo sur github.io est hébergée par GitHub Pages.{" "}
              <a
                href="https://docs.github.com/fr/site-policy/privacy-policies/github-general-privacy-statement"
                rel="noreferrer"
              >
                Informations GitHub
              </a>
              .
            </p>
          </div>
        </section>

        <section className="legal-section" aria-labelledby="legal-content">
          <span className="legal-section-number" aria-hidden="true">
            03
          </span>
          <div>
            <h2 id="legal-content">Contenus et droits</h2>
            <p>
              Brigos est un univers de collection et de construction numérique.
              Ses textes, illustrations, cartes, modèles et éléments graphiques
              sont soumis aux droits applicables à chaque contenu.
            </p>
            <p>
              Les droits des auteurs et les licences des ressources utilisées
              doivent être respectés. La consultation du site ne vaut pas
              autorisation de reproduire ou de redistribuer ses contenus.
            </p>
          </div>
        </section>

        <section className="legal-section" aria-labelledby="legal-storage">
          <span className="legal-section-number" aria-hidden="true">
            04
          </span>
          <div>
            <h2 id="legal-storage">Données et sauvegarde</h2>
            <p>
              En mode invité, la partie est enregistrée dans le navigateur de
              l’appareil utilisé. Effacer les données du site peut supprimer
              cette progression. Les préférences d’affichage sont également
              mémorisées sur l’appareil.
            </p>
            <p>
              Avec un compte, l’authentification et la sauvegarde en ligne
              utilisent Supabase : adresse e-mail, profil et progression du jeu.
              Les e-mails liés au compte sont envoyés via Resend.
            </p>
            <p>
              Les prestataires techniques peuvent traiter les informations de
              connexion nécessaires au fonctionnement et à la sécurité du
              service.
            </p>
          </div>
        </section>
      </div>
      <a className="legal-return legal-bottom-return" href={returnHref}>
        <ArrowLeft size={17} aria-hidden="true" />
        Revenir au jeu
      </a>
    </article>
  );
}
