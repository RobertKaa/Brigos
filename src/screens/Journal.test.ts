import { commandFixture } from "../game/commandTestUtils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { createGame } from "../game/engine";
import type { Game } from "./types";
import { Journal, JournalLink } from "./Journal";

vi.mock("../components/DailyJournal", () => ({ DailyJournal: () => null }));

const game: Game = {
  state: createGame(),
  ready: true,
  busy: false,
  persistent: true,
  notice: null,
  notify: vi.fn(),
  act: vi.fn(async () => commandFixture(createGame())),
};

describe("destination Quêtes", () => {
  it("nomme clairement les quêtes et dirige la récolte vers les créations déjà montées", () => {
    const html = renderToStaticMarkup(createElement(Journal, { game }));
    expect(html).toContain("Quêtes du jour");
    expect(html).toContain("aucun jour manqué ne vous pénalise");
    expect(html).toContain('href="#workshop?view=built"');
    expect(html).toContain("Récolter les pièces de mes créations");
    expect(html).not.toContain('class="production-panel');
    expect(game.act).not.toHaveBeenCalled();
  });

  it("relie les invitations à la même destination sans ajouter un parcours intermédiaire", () => {
    const html = renderToStaticMarkup(createElement(JournalLink));
    expect(html).toContain('href="#journal"');
    expect(html).toContain("Votre cadeau et vos quêtes du jour.");
    expect(html).toContain("550 pièces");
    expect(html).toContain("Gagner des pièces");
  });
});
