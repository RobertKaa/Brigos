import { commandFixture, runCommandFixture } from "../game/commandTestUtils";
import { Children, createElement, isValidElement } from "react";
import type { ReactElement, ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGame, MAX_VALUE } from "../game/engine";
import type { GameState } from "../game/engine";
import { claimVisitReward } from "../game/progression";
import {
  claimDailyMission,
  claimDailyPuzzle,
  getEngagement,
  initialEngagement,
} from "../game/engagement";
import { getDailyPuzzle } from "../game/dailyPuzzle";
import type { Game } from "../screens/types";
import { DailyPuzzle } from "./DailyPuzzle";
import { claimAvailableJournalMissions, DailyJournal } from "./DailyJournal";

vi.mock("./DailyPuzzle", () => ({ DailyPuzzle: vi.fn(() => null) }));

const NOW = Date.parse("2026-10-15T12:00:00.000Z");

function render(
  state: GameState = createGame(),
  overrides: Partial<Game> = {},
) {
  const game: Game = {
    state,
    ready: true,
    busy: false,
    persistent: true,
    notice: null,
    notify: vi.fn(),
    act: vi.fn(async () => commandFixture(createGame())),
    ...overrides,
  };
  return {
    game,
    html: renderToStaticMarkup(createElement(DailyJournal, { game })),
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.clearAllMocks();
});
afterEach(() => vi.useRealTimers());

describe("carnet quotidien Brigo", () => {
  it("présente un budget gratuit explicite, trois missions et un passeport sans série", () => {
    const { html, game } = render();
    expect(html).toContain("550 pièces + 1 boîte Découverte");
    expect(html).toContain("à gagner gratuitement");
    expect(html).toContain("Une Découverte coûte 100 pièces.");
    expect(html.match(/class="journal-task"/g)).toHaveLength(3);
    expect(html).toContain("Vos visites comptent, même espacées.");
    expect(html).toContain("aucune série à maintenir");
    expect(html).toContain("Les jours manqués ne retirent aucun tampon.");
    expect(html).toContain('aria-label="0 visites sur 7"');
    expect(html).toContain('href="#boxes"');
    expect(html).not.toMatch(/href="#(?:journal-gift|_R_)/);
    expect(game.act).not.toHaveBeenCalled();
  });

  it("attribue au cadeau déjà récupéré une mission disponible et un seul tampon", () => {
    const state = claimVisitReward(createGame(), NOW);
    const { html } = render(state);
    expect(html).toContain(
      'aria-label="Récupérer 50 pièces : La porte de l’atelier"',
    );
    expect(html).toContain("Cadeau reçu aujourd’hui");
    expect(html).toContain('aria-label="1 visite sur 7"');
    expect(html.match(/class="is-stamped"/g)).toHaveLength(1);
    expect(html).not.toContain("Récupérer mon cadeau");
    expect(html).toContain('class="journal-gift-button" disabled=""');
  });

  it("distingue les 150 pièces du circuit de la mission de 50 pièces débloquée ensuite", () => {
    const state = claimDailyPuzzle(
      createGame(),
      getDailyPuzzle("2026-10-15").solutionRotations,
      NOW,
    );
    const { html } = render(state);
    expect(html).toContain(
      'aria-label="Récupérer 50 pièces : Le déclic du jour"',
    );
    expect(html).toContain("150 pièces à la clé.");
    expect(vi.mocked(DailyPuzzle).mock.calls.at(-1)?.[0]).toMatchObject({
      dayKey: "2026-10-15",
      completed: true,
      disabled: false,
    });
  });

  it("attend les trois récompenses récupérées avant de proposer le bonus de journée", () => {
    let state = claimVisitReward(createGame(), NOW);
    state = claimDailyPuzzle(
      state,
      getDailyPuzzle("2026-10-15").solutionRotations,
      NOW,
    );
    state = {
      ...state,
      engagement: { ...(state.engagement ?? initialEngagement()), openings: 2 },
    };
    // Synchronise la visite au moyen de la même action qui reçoit sa mission.
    state = claimDailyMission(state, "visit", NOW);
    state = claimDailyMission(state, "open-boxes", NOW);
    const before = render(state).html;
    expect(before).toContain("Le bonus de la page");
    expect(before).toContain(
      'aria-label="Récupérer le bonus de journée : 100 pièces">2 / 3',
    );
    state = claimDailyMission(state, "puzzle", NOW);
    const available = render(state).html;
    expect(available).toContain("La page est complète !");
    expect(available).toContain(
      'aria-label="Récupérer le bonus de journée : 100 pièces">Récupérer',
    );
    const claimed = render(claimDailyMission(state, "day-complete", NOW)).html;
    expect(claimed).toContain("Votre bonus est dans votre réserve.");
  });

  it("propose le cadeau de passeport lorsque ses sept visites sont remplies", () => {
    const fresh = createGame();
    const state: GameState = {
      ...fresh,
      engagement: {
        ...(fresh.engagement ?? initialEngagement()),
        dayKey: "2026-10-15",
        passport: { visits: 7, cycles: 0, lastVisitDay: "2026-10-15" },
      },
    };
    const { html } = render(state);
    expect(html).toContain('aria-label="7 visites sur 7"');
    expect(html.match(/class="is-stamped"/g)).toHaveLength(7);
    expect(html).toContain("Récupérer le cadeau du passeport");
    expect(html).toContain("300 pièces + 1 boîte Prisme");
  });

  it("bloque les réclamations et le circuit pendant une sauvegarde", () => {
    const state = claimVisitReward(createGame(), NOW);
    const { html } = render(state, { busy: true });
    expect(html).toMatch(
      /<button[^>]*disabled=""[^>]*aria-label="Récupérer 50 pièces : La porte de l’atelier"/,
    );
    expect(vi.mocked(DailyPuzzle).mock.calls.at(-1)?.[0].disabled).toBe(true);
  });

  it("explique une réserve pleine et transmet cette limite au mini-jeu", () => {
    const { html } = render({ ...createGame(), coins: MAX_VALUE });
    expect(html).toContain(
      "Dépensez quelques pièces avant de récupérer cette récompense.",
    );
    expect(html).toContain('class="journal-gift-button" disabled=""');
    expect(vi.mocked(DailyPuzzle).mock.calls.at(-1)?.[0].disabled).toBe(true);
  });

  it("affiche le changement d’horloge et garde les cadeaux bloqués", () => {
    const future = claimVisitReward(createGame(), NOW + 86_400_000);
    const { html } = render(future);
    expect(html).toContain('role="status">L’horloge a changé.');
    expect(vi.mocked(DailyPuzzle).mock.calls.at(-1)?.[0].disabled).toBe(true);
  });

  it("transmet la solution du circuit au moteur au lieu de créditer la monnaie côté interface", () => {
    const state = createGame();
    const act = vi.fn<Game["act"]>(async (transform) => {
      const response = runCommandFixture(state, transform);
      const result = response.state;
      expect(result.coins).toBe(state.coins + 150);
      expect(getEngagement(result, NOW).puzzle.completed).toBe(true);
      return response;
    });
    render(state, { act });
    const props = vi.mocked(DailyPuzzle).mock.calls.at(-1)![0];
    props.onComplete(getDailyPuzzle("2026-10-15").solutionRotations);
    expect(act).toHaveBeenCalledOnce();
  });

  it("présente le cadeau avant les missions et garde les activités secondaires repliées", () => {
    const { html } = render();
    expect(html.indexOf('id="journal-gift"')).toBeLessThan(
      html.indexOf('class="journal-missions"'),
    );
    expect(html.match(/id="journal-gift"/g)).toHaveLength(1);
    expect(html).toContain("Commencez ici.");
    expect(html).toMatch(
      /<details[^>]*class="journal-puzzle"(?![^>]*open=)[^>]*>/,
    );
    expect(html).toContain('<details class="journal-passport-details">');
    expect(html).toContain("0 / 7 visites");
    expect(html).toContain(
      'aria-label="Pièces obtenues dans les quêtes du jour"',
    );
    expect(html).toContain('max="550" value="0"');
  });

  it("affiche les gains bruts reçus et la prochaine action après le cadeau", () => {
    const state = claimAvailableJournalMissions(
      claimVisitReward(createGame(), NOW),
      NOW,
    );
    const { html } = render(state);
    expect(html).toContain('max="550" value="150"');
    expect(html).toContain('href="#boxes">Ouvrir mes boîtes');
    expect(html).not.toContain("Tout récupérer");
  });
});

function completedDay(): GameState {
  let state = claimVisitReward(createGame(), NOW);
  state = claimDailyPuzzle(
    state,
    getDailyPuzzle("2026-10-15").solutionRotations,
    NOW,
  );
  return {
    ...state,
    engagement: { ...(state.engagement ?? initialEngagement()), openings: 2 },
  };
}

function findElement(
  node: ReactNode,
  predicate: (element: ReactElement<Record<string, unknown>>) => boolean,
): ReactElement<Record<string, unknown>> | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return;
  if (predicate(node)) return node;
  for (const child of Children.toArray(node.props.children as ReactNode)) {
    const result = findElement(child, predicate);
    if (result) return result;
  }
}

function journalTree(game: Game) {
  let tree: ReactNode = null;
  function Inspect() {
    tree = DailyJournal({ game });
    return tree;
  }
  renderToStaticMarkup(createElement(Inspect));
  return tree;
}

describe("récupération groupée des missions", () => {
  it("enchaîne les trois missions puis le bonus sans changer les gains ni la source", () => {
    const before = completedDay();
    const snapshot = JSON.stringify(before);
    const next = claimAvailableJournalMissions(before, NOW);
    expect(next.coins - before.coins).toBe(300);
    expect(next.engagement?.claimedMissions).toEqual([
      "visit",
      "open-boxes",
      "puzzle",
      "day-complete",
    ]);
    expect(next.boxes).toEqual(before.boxes);
    expect(JSON.stringify(before)).toBe(snapshot);
    expect(() => claimAvailableJournalMissions(next, NOW)).toThrow(
      "Aucune récompense",
    );
  });

  it("ne réclame que les missions prêtes et refuse un jour futur ou une réserve insuffisante", () => {
    const before = claimVisitReward(createGame(), NOW);
    const next = claimAvailableJournalMissions(before, NOW);
    expect(next.coins - before.coins).toBe(50);
    expect(next.engagement?.claimedMissions).toEqual(["visit"]);
    const full = { ...completedDay(), coins: MAX_VALUE - 299 };
    const snapshot = JSON.stringify(full);
    expect(() => claimAvailableJournalMissions(full, NOW)).toThrow(
      "réserve de pièces est pleine",
    );
    expect(JSON.stringify(full)).toBe(snapshot);
    expect(() =>
      claimAvailableJournalMissions(before, NOW - 86_400_000),
    ).toThrow("Aucune récompense");
  });

  it("récupère toutes les missions dans une seule sauvegarde, avec le bonus déjà annoncé", () => {
    let state = completedDay();
    const before = state.coins;
    const act = vi.fn<Game["act"]>(async (transform) => {
      const response = runCommandFixture(state, transform);
      state = response.state;
      return response;
    });
    const { game, html } = render(state, { act });
    expect(html).toContain("Tout récupérer · 300 pièces");
    const button = findElement(
      journalTree(game),
      (item) =>
        item.props.className === "journal-small-button journal-claim-all",
    )!;
    (button.props.onClick as () => void)();
    expect(act).toHaveBeenCalledOnce();
    expect(state.coins).toBe(before + 300);
    expect(state.engagement?.claimedMissions).toHaveLength(4);
  });

  it.each([{ busy: true }, { ready: false }])(
    "ne déclenche aucune transaction quand l’interface est verrouillée (%o)",
    (overrides) => {
      const { game } = render(completedDay(), overrides);
      const button = findElement(
        journalTree(game),
        (item) =>
          item.props.className === "journal-small-button journal-claim-all",
      )!;
      expect(button.props.disabled).toBe(true);
      (button.props.onClick as () => void)();
      expect(game.act).not.toHaveBeenCalled();
    },
  );

  it("permet toujours une récupération individuelle quand le total dépasse la réserve", () => {
    const { game } = render({ ...completedDay(), coins: MAX_VALUE - 50 });
    const tree = journalTree(game);
    const all = findElement(
      tree,
      (item) =>
        item.props.className === "journal-small-button journal-claim-all",
    )!;
    const visit = findElement(
      tree,
      (item) =>
        item.props["aria-label"] ===
        "Récupérer 50 pièces : La porte de l’atelier",
    )!;
    expect(all.props.disabled).toBe(true);
    expect(visit.props.disabled).toBe(false);
    (all.props.onClick as () => void)();
    expect(game.act).not.toHaveBeenCalled();
  });
});
