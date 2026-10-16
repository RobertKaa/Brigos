import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { BRIGO_BY_ID } from "../../game/catalog";
import type { SandboxPlacement } from "../../game/sandbox";
import { createBrigoMeshLibrary } from "./brigoMeshes";
import { buildPlacedBatch, SANDBOX_BATCH_THRESHOLD } from "./batching";
import { placementTransform } from "./picking";

function placements(count: number): SandboxPlacement[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `placement-${index}`,
    brigoId: "brick-1x1:coral",
    x: index % 24,
    y: Math.floor(index / 24),
    z: 0,
    rotation: 0,
  }));
}
const findMesh = (group: THREE.Group) =>
  group.children.find(
    (child): child is THREE.Mesh =>
      child instanceof THREE.Mesh && !child.userData.brigoInk,
  )!;
const findInk = (group: THREE.Group) =>
  group.children.find(
    (child): child is THREE.Mesh =>
      child instanceof THREE.Mesh && child.userData.brigoInk,
  )!;

describe("regroupement du rendu des grands projets libres", () => {
  it("conserve des groupes simples avant 120 pièces, avec une sélection par identifiant", () => {
    const library = createBrigoMeshLibrary();
    const pieces = placements(SANDBOX_BATCH_THRESHOLD - 1);
    const result = buildPlacedBatch(pieces, library);
    expect(result.group.children).toHaveLength(119);
    expect(result.pickMeshes).toHaveLength(119);
    expect(result.boundsById.size).toBe(119);
    expect(result.group.children[37].userData.placementId).toBe("placement-37");
    expect(
      result.pickMeshes.every((mesh) => !(mesh instanceof THREE.InstancedMesh)),
    ).toBe(true);
    result.dispose();
    library.dispose();
  });

  it.each([120, 500])(
    "limite %i pièces identiques à un corps et un contour instanciés",
    (count) => {
      const library = createBrigoMeshLibrary();
      const result = buildPlacedBatch(placements(count), library);
      expect(result.group.children).toHaveLength(2);
      expect(result.pickMeshes).toHaveLength(1);
      const mesh = result.pickMeshes[0] as THREE.InstancedMesh;
      expect(mesh).toBeInstanceOf(THREE.InstancedMesh);
      expect(mesh.count).toBe(count);
      expect(mesh.userData.placementIds).toHaveLength(count);
      expect(result.boundsById.size).toBe(count);
      expect(findInk(result.group)).toBeInstanceOf(THREE.InstancedMesh);
      expect((findInk(result.group) as THREE.InstancedMesh).count).toBe(count);
      result.dispose();
      library.dispose();
    },
  );

  it("partage les géométries et conserve les couleurs exactes sans changer les placements", () => {
    const library = createBrigoMeshLibrary();
    const pieces = placements(120).map((piece, index) =>
      Object.freeze({
        ...piece,
        brigoId: index % 2 ? "brick-1x1:blue" : "brick-1x1:coral",
      }),
    );
    const before = JSON.stringify(pieces);
    Object.freeze(pieces);
    const result = buildPlacedBatch(pieces, library);
    const source = library.create(BRIGO_BY_ID.get("brick-1x1:coral")!);
    const sourceMesh = findMesh(source);
    expect(result.pickMeshes).toHaveLength(2);
    expect(result.group.children).toHaveLength(3);
    for (const mesh of result.pickMeshes) {
      expect(mesh.geometry).toBe(sourceMesh.geometry);
      expect((mesh as THREE.InstancedMesh).count).toBe(60);
    }
    expect(
      new Set(
        result.pickMeshes.map((mesh) =>
          (mesh.material as THREE.MeshToonMaterial).color.getHexString(),
        ),
      ),
    ).toEqual(new Set(["ee6558", "548bd8"]));
    expect(JSON.stringify(pieces)).toBe(before);
    result.dispose();
    library.dispose();
  });

  it("retrouve la pièce exacte depuis instanceId sans inclure les contours dans le raycast", () => {
    const library = createBrigoMeshLibrary();
    const result = buildPlacedBatch(placements(500), library);
    result.group.updateMatrixWorld(true);
    const hits = new THREE.Raycaster(
      new THREE.Vector3(13.5, 10, 1.5),
      new THREE.Vector3(0, -1, 0),
    ).intersectObjects(result.pickMeshes, false);
    expect(hits.length).toBeGreaterThan(0);
    const hit = hits[0];
    expect(hit.instanceId).toBe(37);
    expect(hit.object.userData.placementIds[hit.instanceId!]).toBe(
      "placement-37",
    );
    expect(result.pickMeshes.every((mesh) => !mesh.userData.brigoInk)).toBe(
      true,
    );
    expect(
      new THREE.Raycaster(
        new THREE.Vector3(13.5, 10, 1.5),
        new THREE.Vector3(0, -1, 0),
      ).intersectObject(findInk(result.group)),
    ).toHaveLength(0);
    result.dispose();
    library.dispose();
  });

  it("préserve les limites et matrices des rotations, hauteurs et formes asymétriques", () => {
    const library = createBrigoMeshLibrary();
    const pieces = placements(120).map((piece, index): SandboxPlacement => ({
      ...piece,
      brigoId: index % 2 ? "special-corner:yellow" : "brick-1x4:coral",
      rotation: ([0, 90, 180, 270] as const)[index % 4],
      z: index % 7,
    }));
    const result = buildPlacedBatch(pieces, library);
    for (const piece of pieces) {
      const single = library.create(BRIGO_BY_ID.get(piece.brigoId)!);
      single.applyMatrix4(placementTransform(piece));
      const expected = new THREE.Box3().setFromObject(single);
      const actual = result.boundsById.get(piece.id)!;
      expected.min
        .toArray()
        .forEach((value, axis) =>
          expect(actual.min.getComponent(axis)).toBeCloseTo(value, 6),
        );
      expected.max
        .toArray()
        .forEach((value, axis) =>
          expect(actual.max.getComponent(axis)).toBeCloseTo(value, 6),
        );
      for (const mesh of result.pickMeshes) {
        const instance = mesh.userData.placementIds.indexOf(piece.id);
        if (instance < 0) continue;
        const matrix = new THREE.Matrix4();
        (mesh as THREE.InstancedMesh).getMatrixAt(instance, matrix);
        matrix.elements.forEach((value, index) =>
          expect(value).toBeCloseTo(
            placementTransform(piece).elements[index],
            5,
          ),
        );
      }
    }
    result.dispose();
    library.dispose();
  });

  it("instance les deux extrémités du trait d'encre dans les mêmes coordonnées que le corps", () => {
    const library = createBrigoMeshLibrary();
    const pieces = placements(120);
    pieces[0] = {
      ...pieces[0],
      brigoId: "brick-1x4:coral",
      x: 5,
      y: 8,
      z: 6,
      rotation: 90,
    };
    const source = library.create(BRIGO_BY_ID.get(pieces[0].brigoId)!);
    const result = buildPlacedBatch(pieces, library);
    const ink = result.group.children.find(
      (child) =>
        child instanceof THREE.InstancedMesh &&
        child.userData.brigoInk &&
        child.geometry === findInk(source).geometry,
    ) as THREE.InstancedMesh;
    expect(ink.geometry).toBe(findInk(source).geometry);
    const instance = new THREE.Matrix4();
    ink.getMatrixAt(0, instance);
    const transform = placementTransform(pieces[0]);
    for (const attribute of ["position", "inkOther"]) {
      const positions = findInk(source).geometry.getAttribute(attribute);
      for (let index = 0; index < positions.count; index++) {
        const expected = new THREE.Vector3()
          .fromBufferAttribute(positions, index)
          .applyMatrix4(transform);
        const actual = new THREE.Vector3()
          .fromBufferAttribute(ink.geometry.getAttribute(attribute), index)
          .applyMatrix4(instance);
        expect(actual.distanceTo(expected)).toBeLessThan(0.00001);
      }
    }
    result.dispose();
    library.dispose();
  });

  it("garde les rôles détaillés des roues et une identification par exemplaire sur chacun", () => {
    const library = createBrigoMeshLibrary();
    const pieces = placements(120).map((piece) => ({
      ...piece,
      brigoId: "special-wheel:mint",
    }));
    const result = buildPlacedBatch(pieces, library);
    expect(result.pickMeshes).toHaveLength(4);
    expect(result.group.children).toHaveLength(5);
    for (const mesh of result.pickMeshes) {
      expect(mesh.userData.placementIds).toEqual(
        pieces.map((piece) => piece.id),
      );
      expect((mesh as THREE.InstancedMesh).count).toBe(120);
    }
    result.dispose();
    library.dispose();
  });

  it("ignore une référence inconnue plutôt que créer une géométrie non bornée", () => {
    const library = createBrigoMeshLibrary();
    const result = buildPlacedBatch(
      [{ ...placements(1)[0], brigoId: "unknown" }],
      library,
    );
    expect(result.group.children).toHaveLength(0);
    expect(result.pickMeshes).toHaveLength(0);
    expect(result.boundsById.size).toBe(0);
    result.dispose();
    library.dispose();
  });

  it("libère une seule fois ses instances et contours, jamais les ressources du catalogue", () => {
    const library = createBrigoMeshLibrary();
    const source = library.create(BRIGO_BY_ID.get("brick-1x1:coral")!);
    const sourceMesh = findMesh(source);
    const sourceInk = findInk(source);
    const libraryGeometry = vi.spyOn(sourceMesh.geometry, "dispose");
    const libraryEdges = vi.spyOn(sourceInk.geometry, "dispose");
    const libraryMaterial = vi.spyOn(
      sourceMesh.material as THREE.Material,
      "dispose",
    );
    const libraryInk = vi.spyOn(
      sourceInk.material as THREE.Material,
      "dispose",
    );
    const result = buildPlacedBatch(placements(500), library);
    const instanceDispose = vi.spyOn(
      result.pickMeshes[0] as THREE.InstancedMesh,
      "dispose",
    );
    const inkInstanceDispose = vi.spyOn(
      findInk(result.group) as THREE.InstancedMesh,
      "dispose",
    );
    result.dispose();
    result.dispose();
    expect(instanceDispose).toHaveBeenCalledTimes(1);
    expect(inkInstanceDispose).toHaveBeenCalledTimes(1);
    for (const dispose of [
      libraryGeometry,
      libraryEdges,
      libraryMaterial,
      libraryInk,
    ])
      expect(dispose).not.toHaveBeenCalled();
    expect(
      findMesh(library.create(BRIGO_BY_ID.get("brick-1x1:coral")!)).geometry,
    ).toBe(sourceMesh.geometry);
    expect(result.group.children).toHaveLength(0);
    expect(result.pickMeshes).toHaveLength(0);
    expect(result.boundsById.size).toBe(0);
    library.dispose();
    for (const dispose of [
      libraryGeometry,
      libraryEdges,
      libraryMaterial,
      libraryInk,
    ])
      expect(dispose).toHaveBeenCalledTimes(1);
  });
});
