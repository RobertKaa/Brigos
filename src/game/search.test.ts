import { expect, it } from "vitest";
import { BRIGO_BY_ID } from "./catalog";
import { matchesSearch } from "./search";

it("retrouve une pièce par dimensions, couleur sans accent ou numéro de référence", () => {
  const brigo = BRIGO_BY_ID.get("brick-2x2:blue")!;
  for (const query of [
    "brique 2x2",
    "Brique 2 × 2",
    "2*2",
    "ocean",
    "#035",
    "035",
  ])
    expect(matchesSearch(brigo, query)).toBe(true);
  expect(matchesSearch(brigo, "menthe")).toBe(false);
});
