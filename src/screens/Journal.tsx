import { ArrowUpRight, Coins, NotebookPen, Sparkles } from "lucide-react";
import { DailyJournal } from "../components/DailyJournal";
import { DAILY_COIN_BUDGET } from "../game/engagement";
import type { Game } from "./types";
import "./journal.css";

export function Journal({ game }: { game: Game }) {
  return (
    <div className="journal-screen">
      <div className="page-intro">
        <div>
          <span className="eyebrow">
            <i /> À VOTRE RYTHME
          </span>
          <h1>
            Quêtes du jour<span className="heading-dot">.</span>
          </h1>
          <p>
            Un cadeau, trois missions, des pièces pour vos idées. Revenez quand
            vous voulez : aucun jour manqué ne vous pénalise.
          </p>
        </div>
        <span className="journal-page-mark" aria-hidden="true">
          <NotebookPen size={40} />
        </span>
      </div>
      <DailyJournal game={game} />
      <a className="journal-workshop-link" href="#workshop?view=built">
        <Coins size={18} aria-hidden="true" />
        Récolter les pièces de mes créations
        <ArrowUpRight size={17} aria-hidden="true" />
      </a>
    </div>
  );
}

export function JournalLink({ compact = false }: { compact?: boolean }) {
  return (
    <a
      className={`journal-invitation${compact ? " journal-invitation-compact" : ""}`}
      href="#journal"
    >
      <span className="journal-invitation-icon" aria-hidden="true">
        <Sparkles size={23} />
      </span>
      <span className="journal-invitation-copy">
        <strong>Votre cadeau et vos quêtes du jour.</strong>
        <span>
          {DAILY_COIN_BUDGET.toLocaleString("fr-FR")} pièces et une boîte
          Découverte à gagner chaque jour, à votre rythme.
        </span>
      </span>
      <span className="journal-invitation-action">
        Gagner des pièces <ArrowUpRight size={19} aria-hidden="true" />
      </span>
    </a>
  );
}
