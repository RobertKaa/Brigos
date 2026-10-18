import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronDown, CircleHelp, Search, X } from "lucide-react";
import { FAQ_GROUPS, filterFaqGroups } from "./faqContent";
import "./legal-notice.css";
import "./faq.css";

export function Faq({ returnHref = "#boxes" }: { returnHref?: string }) {
  const [query, setQuery] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const groups = filterFaqGroups(query);
  const count = groups.reduce((sum, group) => sum + group.questions.length, 0);
  const searching = query.trim().length > 0;
  useEffect(() => {
    const title = document.title;
    document.title = "FAQ · Brigos";
    return () => {
      document.title = title;
    };
  }, []);

  return (
    <article className="legal-page faq-page" aria-labelledby="faq-title">
      <a className="legal-return" href={returnHref}>
        <ArrowLeft size={17} aria-hidden="true" />
        Revenir au jeu
      </a>
      <header className="legal-intro">
        <span className="eyebrow">
          <CircleHelp size={16} aria-hidden="true" />
          UN COUP DE MAIN
        </span>
        <h1 id="faq-title">FAQ</h1>
        <p>
          Les réponses pour collectionner, construire et retrouver votre
          progression.
        </p>
      </header>
      <div className="faq-search">
        <label htmlFor="faq-search">Rechercher dans la FAQ</label>
        <div className="faq-search-field">
          <Search size={18} aria-hidden="true" />
          <input
            ref={input}
            id="faq-search"
            type="search"
            value={query}
            maxLength={120}
            placeholder="Ex. sauvegarde, boîte, atelier…"
            autoComplete="off"
            aria-describedby="faq-results"
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className="faq-clear"
              aria-label="Effacer la recherche"
              onClick={() => {
                setQuery("");
                input.current?.focus();
              }}
            >
              <X size={18} aria-hidden="true" />
            </button>
          )}
        </div>
        <p id="faq-results" role="status" aria-live="polite">
          {count === 0
            ? "Aucune réponse trouvée."
            : searching
              ? `${count} ${count === 1 ? "réponse trouvée" : "réponses trouvées"}.`
              : `${count} questions, ${FAQ_GROUPS.length} thèmes pour vous guider.`}
        </p>
      </div>
      {count === 0 ? (
        <div className="faq-empty">
          <h2>Essayez avec un autre mot</h2>
          <p>Par exemple : « monnaie », « quêtes » ou « compte ».</p>
          <button
            className="button button-secondary"
            type="button"
            onClick={() => {
              setQuery("");
              input.current?.focus();
            }}
          >
            Afficher toutes les questions
          </button>
        </div>
      ) : (
        <div className="faq-groups">
          {groups.map((group) => (
            <section
              key={group.id}
              className="faq-group"
              aria-labelledby={`faq-group-${group.id}`}
            >
              <h2 id={`faq-group-${group.id}`}>{group.title}</h2>
              <div className="faq-questions">
                {group.questions.map((item) => (
                  <details
                    className="faq-question"
                    key={`${item.id}-${searching ? "search" : "browse"}`}
                    open={searching}
                  >
                    <summary>
                      <span>{item.question}</span>
                      <ChevronDown size={18} aria-hidden="true" />
                    </summary>
                    <div className="faq-answer">
                      {item.paragraphs.map((text, index) => (
                        <p key={index}>{text}</p>
                      ))}
                      {item.link && (
                        <a href={item.link.href}>{item.link.label}</a>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <a className="legal-return legal-bottom-return" href={returnHref}>
        <ArrowLeft size={17} aria-hidden="true" />
        Revenir au jeu
      </a>
    </article>
  );
}
