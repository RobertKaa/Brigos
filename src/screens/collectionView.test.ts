import { describe, expect, it } from "vitest";
import { BRIGO_BY_ID } from "../game/catalog";
import { collectionSummary, sortCollection } from "./collectionView";

const brick = BRIGO_BY_ID.get("brick-1x1:blue")!;
const plate = BRIGO_BY_ID.get("plate-2x2:green")!;
const arch = BRIGO_BY_ID.get("arch-1x4:ivory")!;

describe("résumé et classement de l’album", () => {
  it("sépare les références possédées, les découvertes historiques et les exemplaires supplémentaires", () => {
    expect(
      collectionSummary(
        [brick, plate, arch],
        { [brick.id]: 2 },
        { [brick.id]: 3, [plate.id]: 1 },
        [brick.id, plate.id, arch.id],
      ),
    ).toEqual({
      all: 3,
      discovered: 3,
      owned: 2,
      missing: 0,
      duplicates: 1,
      spareCopies: 4,
    });
  });
  it("ne compte jamais un Brigo unique ou absent comme doublon", () => {
    expect(
      collectionSummary([brick, plate], { [brick.id]: 1 }, {}, [brick.id]),
    ).toMatchObject({ owned: 1, missing: 1, duplicates: 0, spareCopies: 0 });
  });
  it("classe les quantités libres et assemblées ensemble sans modifier le catalogue", () => {
    const album = [brick, plate, arch];
    const original = [...album];
    expect(
      sortCollection(
        album,
        "quantity",
        { [brick.id]: 2, [arch.id]: 3 },
        { [plate.id]: 7 },
      ).map((item) => item.id),
    ).toEqual([plate.id, arch.id, brick.id]);
    expect(album).toEqual(original);
  });
  it("place les formes rares en premier et départage les égalités par numéro", () => {
    const sameForm = BRIGO_BY_ID.get("brick-1x1:green")!;
    const sorted = sortCollection([sameForm, brick, arch], "rarity", {}, {});
    expect(sorted[0]).toBe(arch);
    expect(sorted.slice(1).map((item) => item.number)).toEqual(
      [brick.number, sameForm.number].sort((a, b) => a - b),
    );
  });
  it("conserve le classement numérique stable indépendamment des quantités", () => {
    expect(
      sortCollection([plate, brick], "number", { [plate.id]: 99 }, {}).map(
        (item) => item.number,
      ),
    ).toEqual([plate.number, brick.number].sort((a, b) => a - b));
  });
});
