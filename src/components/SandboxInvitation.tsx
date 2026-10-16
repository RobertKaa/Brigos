import { ArrowUpRight, Blocks } from "lucide-react";
import type { GameState } from "../game/engine";
import "./sandbox-invitation.css";

export function SandboxInvitation({ state }: { state: GameState }) {
  const projects = state.sandboxProjects ?? [];
  return (
    <a href="#sandbox" className="sandbox-invitation">
      <span className="sandbox-invitation-mark" aria-hidden="true">
        <Blocks size={30} />
      </span>
      <span className="sandbox-invitation-copy">
        <span>LE BAC À SABLE</span>
        <strong>Vos Brigos. Vos propres idées.</strong>
        <span>
          Placez, empilez et tournez les pièces de votre stock. Vos créations
          libres se sauvegardent au fil de vos gestes.
        </span>
      </span>
      <span className="sandbox-invitation-cta">
        <strong>
          {projects.length ? "Retrouver mes créations" : "Construire librement"}{" "}
          <ArrowUpRight size={18} aria-hidden="true" />
        </strong>
        <span>
          {projects.length
            ? `${projects.length} projet${projects.length > 1 ? "s" : ""} en cours`
            : "Aucun plan imposé"}
        </span>
      </span>
    </a>
  );
}
