import { describe, expect, it } from "vitest";
import { readAppRoute } from "../navigation";
import { FAQ_GROUPS, filterFaqGroups } from "./faqContent";

const ids = (query: string) =>
  filterFaqGroups(query).flatMap((group) =>
    group.questions.map((item) => item.id),
  );
describe("recherche dans la FAQ", () => {
  it("retrouve les réponses malgré les accents, les majuscules et les espaces", () => {
    expect(ids(" BOÎTE ")).toEqual(ids("boite"));
    expect(ids("QUÊTES")).toEqual(ids("quetes"));
    expect(ids("legendaire")).toContain("probabilites");
  });
  it("cherche aussi dans le contenu des réponses et accepte plusieurs mots", () => {
    expect(ids("72 heures")).toEqual(["production"]);
    expect(ids("importée fusionnée")).toEqual(["invite-compte"]);
  });
  it("retourne toute la FAQ pour une recherche vide et aucun résultat pour un contenu inconnu", () => {
    expect(ids(" ")).toHaveLength(
      FAQ_GROUPS.reduce((sum, group) => sum + group.questions.length, 0),
    );
    expect(filterFaqGroups("<script>alert(1)</script>")).toEqual([]);
  });
  it("garde des identifiants uniques et des liens directs vers les destinations du jeu", () => {
    const entries = FAQ_GROUPS.flatMap((group) => group.questions);
    expect(new Set(entries.map((item) => item.id)).size).toBe(entries.length);
    for (const item of entries)
      if (item.link) {
        expect(item.link.href).toMatch(
          /^#(?:boxes|collection|workshop|sandbox|journal|community)(?:\?view=built)?$/,
        );
        expect(readAppRoute(item.link.href).view).not.toBe("faq");
      }
  });
});
