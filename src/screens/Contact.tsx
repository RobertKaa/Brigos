import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Mail, Send } from "lucide-react";
import {
  CONTACT_TOPICS,
  parseContactMessage,
  readContactConfiguration,
  sendContactMessage,
} from "../contact";
import type { ContactConfiguration } from "../contact";
import { ContactVerification } from "../components/ContactVerification";
import "./contact.css";
const configuration = readContactConfiguration(import.meta.env);
export function Contact({
  config = configuration,
  send = sendContactMessage,
}: {
  config?: ContactConfiguration | null;
  send?: typeof sendContactMessage;
}) {
  const [token, setToken] = useState("");
  const [verification, setVerification] = useState(0);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const pending = useRef<{ payload: string; id: string } | null>(null);
  const sending = useRef(false);
  const feedback = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const title = document.title;
    document.title = "Contact · Brigos";
    return () => {
      document.title = title;
    };
  }, []);
  useEffect(() => {
    if (sent || error) feedback.current?.focus();
  }, [sent, error]);
  return (
    <article
      className="legal-page contact-page"
      aria-labelledby="contact-title"
    >
      <a className="legal-return" href="#mentions-legales">
        <ArrowLeft size={17} aria-hidden="true" />
        Retour aux mentions légales
      </a>
      <header className="legal-intro">
        <span className="eyebrow">
          <Mail size={16} aria-hidden="true" />
          UN MESSAGE POUR BRIGOS
        </span>
        <h1 id="contact-title">Contacter TreborKaa</h1>
        <p>
          Une question, un souci ou une remarque ? Écrivez au créateur de
          Brigos.
        </p>
      </header>
      {sent ? (
        <div className="contact-card">
          <p
            ref={feedback}
            tabIndex={-1}
            role="status"
            className="contact-success"
          >
            <strong>Votre message a été envoyé.</strong>Merci d’avoir pris le
            temps de nous écrire.
          </p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => setSent(false)}
          >
            Écrire un autre message
          </button>
        </div>
      ) : (
        <form
          className="contact-card"
          onSubmit={async (event) => {
            event.preventDefault();
            if (sending.current || !config || !token) return;
            const form = event.currentTarget;
            const fields = Object.fromEntries(new FormData(form));
            if (fields.website) return;
            let data;
            try {
              data = parseContactMessage(fields);
            } catch {
              setError(
                "Vérifiez votre adresse e-mail et écrivez un message de 20 à 5 000 caractères.",
              );
              return;
            }
            const payload = JSON.stringify(data);
            if (pending.current?.payload !== payload)
              pending.current = { payload, id: crypto.randomUUID() };
            sending.current = true;
            setBusy(true);
            setError("");
            try {
              await send(config, data, token, pending.current.id);
              form.reset();
              pending.current = null;
              setSent(true);
            } catch (cause) {
              setError(
                cause instanceof Error
                  ? cause.message
                  : "Le message n’a pas pu être envoyé.",
              );
            } finally {
              sending.current = false;
              setBusy(false);
              setToken("");
              setVerification((value) => value + 1);
            }
          }}
        >
          {!config && (
            <p className="contact-availability" role="status">
              L’envoi de messages sera disponible prochainement. Merci de
              revenir un peu plus tard.
            </p>
          )}
          <p className="contact-required">Tous les champs sont obligatoires.</p>
          <div className="contact-row">
            <label htmlFor="contact-name">
              Votre pseudo
              <input
                id="contact-name"
                name="name"
                autoComplete="nickname"
                disabled={busy}
                required
                maxLength={80}
              />
            </label>
            <label htmlFor="contact-email">
              Votre adresse e-mail
              <input
                id="contact-email"
                name="email"
                type="email"
                autoComplete="email"
                disabled={busy}
                required
                maxLength={254}
                aria-describedby="contact-email-help"
              />
              <small id="contact-email-help">Pour pouvoir vous répondre.</small>
            </label>
          </div>
          <label htmlFor="contact-topic">
            Sujet
            <select id="contact-topic" name="topic" required disabled={busy}>
              {Object.entries(CONTACT_TOPICS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label htmlFor="contact-message">
            Votre message
            <textarea
              id="contact-message"
              name="message"
              required
              minLength={20}
              maxLength={5000}
              rows={7}
              disabled={busy}
              aria-describedby="contact-message-help"
            />
            <small id="contact-message-help">20 à 5 000 caractères.</small>
          </label>
          <div className="contact-trap" aria-hidden="true">
            <label htmlFor="contact-website">
              Site internet
              <input
                id="contact-website"
                name="website"
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
          </div>
          <p className="contact-privacy">
            Votre pseudo, votre e-mail et votre message sont transmis à
            l’éditeur via Supabase et Resend pour traiter votre demande. La
            protection contre les envois automatisés est assurée par{" "}
            <a
              href="https://www.cloudflare.com/privacypolicy/"
              rel="noreferrer"
            >
              Cloudflare Turnstile
            </a>
            .
          </p>
          {config && (
            <ContactVerification
              key={verification}
              siteKey={config.siteKey}
              onToken={setToken}
            />
          )}
          {error && (
            <p
              ref={feedback}
              tabIndex={-1}
              className="contact-error"
              role="alert"
            >
              {error}
            </p>
          )}
          <button
            className="button button-primary"
            type="submit"
            disabled={!config || !token || busy}
            aria-busy={busy}
          >
            <Send size={17} aria-hidden="true" />
            {busy ? "Envoi en cours…" : "Envoyer le message"}
          </button>
          {config && !token && !error && (
            <p className="contact-required" role="status">
              La vérification de sécurité est nécessaire avant l’envoi.
            </p>
          )}
        </form>
      )}
    </article>
  );
}
