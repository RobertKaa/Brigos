import { describe, expect, it } from "vitest";
import {
  createRevealSession,
  finishChest,
  nextHiddenDrop,
  revealDrop,
  revealEveryDrop,
} from "./openingSession";

describe("session visuelle d’ouverture", () => {
  it("ignore la fin d’animation d’une boîte précédente", () => {
    const next = createRevealSession("next", false);
    expect(finishChest(next, "old")).toBe(next);
    expect(finishChest(next, "next").phase).toBe("cards");
  });

  it.each([5, 10])(
    "révèle exactement les %i cartes enregistrées, même pendant l’intro",
    (count) => {
      const session = revealEveryDrop(createRevealSession("box", false), count);
      expect(session.phase).toBe("cards");
      expect(session.revealed).toEqual(
        Array.from({ length: count }, (_, index) => index),
      );
      expect(session.cascading).toBe(false);
      expect(nextHiddenDrop(session, count)).toBeUndefined();
    },
  );

  it("ignore les clics répétés et indices invalides sans doubler une révélation", () => {
    const session = revealDrop(createRevealSession("box", true), 9, 10);
    expect(session.revealed).toEqual([9]);
    expect(revealDrop(session, 9, 10)).toBe(session);
    for (const index of [-1, 10, 0.5, NaN])
      expect(revealDrop(session, index, 10)).toBe(session);
  });

  it("poursuit une cascade après les découvertes manuelles et s’arrête à la dernière carte", () => {
    let session = { ...createRevealSession("box", false), cascading: true };
    session = revealDrop(session, 3, 5);
    const sequence: number[] = [];
    for (
      let index = nextHiddenDrop(session, 5);
      index !== undefined;
      index = nextHiddenDrop(session, 5)
    ) {
      sequence.push(index);
      session = revealDrop(session, index, 5);
    }
    expect(sequence).toEqual([0, 1, 2, 4]);
    expect(session.revealed).toHaveLength(5);
    expect(session.cascading).toBe(false);
  });

  it("Tout révéler annule une cascade en cours", () => {
    const session = {
      ...revealDrop(createRevealSession("box", true), 4, 10),
      cascading: true,
    };
    const completed = revealEveryDrop(session, 10);
    expect(completed.cascading).toBe(false);
    expect(new Set(completed.revealed).size).toBe(10);
  });

  it("le mode de mouvement réduit affiche directement le plateau sans exposer les surprises", () => {
    expect(createRevealSession("box", true)).toEqual({
      id: "box",
      phase: "cards",
      revealed: [],
      cascading: false,
    });
  });
});
