import { describe, expect, it, vi } from "vitest";
import * as THREE from "three";
import { BRIGO_BY_ID, CATALOG, MODELS } from "../../game/catalog";
import type { Brigo } from "../../game/catalog";
import { studCenters } from "../../game/geometry";
import { BRIGO_HEIGHT_SCALE, createBrigoMeshLibrary } from "./brigoMeshes";
import { placementTransform } from "./picking";

const brigo = (id: string): Brigo => BRIGO_BY_ID.get(id)!;
function meshes(group: THREE.Group): THREE.Mesh[] {
  return group.children.filter(
    (child): child is THREE.Mesh =>
      child instanceof THREE.Mesh && !child.userData.brigoInk,
  );
}
function hits(
  group: THREE.Group,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
) {
  group.updateMatrixWorld(true);
  return new THREE.Raycaster(origin, direction).intersectObjects(meshes(group));
}

describe("géométries 3D originales Brigo", () => {
  it.each(MODELS.map((model) => [model.id, model] as const))(
    "%s tient dans les dimensions du catalogue, sans sommets ni normales invalides",
    (_id, model) => {
      const library = createBrigoMeshLibrary();
      const piece = CATALOG.find((item) => item.model.id === model.id)!;
      const group = library.create(piece);
      const geometryMeshes = meshes(group);
      expect(geometryMeshes.length).toBeGreaterThan(0);
      const bounds = new THREE.Box3().setFromObject(group);
      expect(bounds.min.x).toBeGreaterThanOrEqual(-0.000001);
      expect(bounds.min.y).toBeGreaterThanOrEqual(-0.000001);
      expect(bounds.min.z).toBeGreaterThanOrEqual(-0.000001);
      expect(bounds.max.x).toBeLessThanOrEqual(model.width + 0.000001);
      expect(bounds.max.z).toBeLessThanOrEqual(model.depth + 0.000001);
      expect(bounds.max.y).toBeLessThanOrEqual(
        (model.height + 0.2) * BRIGO_HEIGHT_SCALE + 0.000001,
      );
      const clasps = studCenters(model);
      if (clasps.length)
        expect(bounds.max.y).toBeCloseTo(
          (model.height + 0.2) * BRIGO_HEIGHT_SCALE,
          5,
        );
      for (const mesh of geometryMeshes) {
        const positions = mesh.geometry.getAttribute("position");
        const normals = mesh.geometry.getAttribute("normal");
        expect(positions.count).toBeGreaterThan(0);
        expect(positions.count % 3).toBe(0);
        expect(normals.count).toBe(positions.count);
        expect([...positions.array].every(Number.isFinite)).toBe(true);
        expect([...normals.array].every(Number.isFinite)).toBe(true);
        for (let index = 0; index < normals.count; index++)
          expect(
            Math.hypot(
              normals.getX(index),
              normals.getY(index),
              normals.getZ(index),
            ),
          ).toBeCloseTo(1, 4);
        expect(mesh.material).toBeInstanceOf(THREE.MeshToonMaterial);
      }
      library.dispose();
    },
  );

  it("réutilise la géométrie entre couleurs et prévisualisations, avec des groupes indépendants", () => {
    const library = createBrigoMeshLibrary();
    const coral = library.create(brigo("brick-2x4:coral"));
    const blue = library.create(brigo("brick-2x4:blue"));
    const ghost = library.create(brigo("brick-2x4:coral"), { ghost: true });
    expect(coral).not.toBe(blue);
    expect(coral.children[0]).not.toBe(blue.children[0]);
    expect(meshes(coral)[0].geometry).toBe(meshes(blue)[0].geometry);
    expect(meshes(coral)[0].geometry).toBe(meshes(ghost)[0].geometry);
    expect(meshes(coral)[0].material).not.toBe(meshes(blue)[0].material);
    coral.position.set(4, 2, 7);
    expect(blue.position.toArray()).toEqual([0, 0, 0]);
    expect(ghost.position.toArray()).toEqual([0, 0, 0]);
    expect(coral.userData).toEqual({});
    library.dispose();
  });

  it("fusionne corps et raccords en losange, y compris sur les grandes plaques", () => {
    const library = createBrigoMeshLibrary();
    const plate = library.create(brigo("plate-6x6:mint"));
    expect(plate.children).toHaveLength(2);
    expect(meshes(plate)).toHaveLength(1);
    const piece = brigo("brick-1x1:coral");
    const cube = library.create(piece);
    const top = piece.model.height * BRIGO_HEIGHT_SCALE;
    // Above the body, the diamond has no material in its square corners.
    expect(
      hits(
        cube,
        new THREE.Vector3(0.5, top + 0.03, -1),
        new THREE.Vector3(0, 0, 1),
      ).length,
    ).toBeGreaterThan(0);
    expect(
      hits(
        cube,
        new THREE.Vector3(0.74, top + 0.03, 0.74),
        new THREE.Vector3(0, 1, 0),
      ),
    ).toHaveLength(0);
    library.dispose();
  });

  it("garde les arches réellement ouvertes et les vides des angles et étoiles", () => {
    const library = createBrigoMeshLibrary();
    const arch = library.create(brigo("arch-1x4:ivory"));
    expect(
      hits(arch, new THREE.Vector3(-1, 0.6, 2), new THREE.Vector3(1, 0, 0)),
    ).toHaveLength(0);
    expect(
      hits(arch, new THREE.Vector3(-1, 0.6, 0.1), new THREE.Vector3(1, 0, 0))
        .length,
    ).toBeGreaterThan(0);
    const corner = library.create(brigo("special-corner:yellow"));
    expect(
      hits(corner, new THREE.Vector3(1.6, 4, 1.6), new THREE.Vector3(0, -1, 0)),
    ).toHaveLength(0);
    const cross = library.create(brigo("special-cross:violet"));
    expect(
      hits(cross, new THREE.Vector3(0.2, 4, 0.2), new THREE.Vector3(0, -1, 0)),
    ).toHaveLength(0);
    expect(
      hits(cross, new THREE.Vector3(1.5, 4, 0.5), new THREE.Vector3(0, -1, 0))
        .length,
    ).toBeGreaterThan(0);
    library.dispose();
  });

  it.each([0, 90, 180, 270] as const)(
    "laisse l'essieu traverser le palier sans face ni sélection parasite à %s°",
    (rotation) => {
      const library = createBrigoMeshLibrary();
      const piece = brigo("special-bearing:mint");
      const bearing = library.create(piece);
      const transform = placementTransform({
        id: "bearing-review",
        brigoId: piece.id,
        x: 6,
        y: 7,
        z: 4,
        rotation,
      });
      bearing.applyMatrix4(transform);
      for (const side of [-1, 1]) {
        const direction = new THREE.Vector3(-side, 0, 0).transformDirection(
          transform,
        );
        const rayAt = (depth: number, height: number) =>
          hits(
            bearing,
            new THREE.Vector3(
              side < 0 ? -1 : 3,
              height * BRIGO_HEIGHT_SCALE,
              depth,
            ).applyMatrix4(transform),
            direction,
          );
        for (const depth of [0.55, 1, 1.45])
          for (const height of [0.55, 1, 1.45])
            expect(
              rayAt(depth, height),
              "Le tunnel est physiquement vide",
            ).toHaveLength(0);
        for (const [depth, height] of [
          [0.3, 1],
          [1.7, 1],
          [1, 0.3],
          [1, 1.7],
        ])
          expect(
            rayAt(depth, height).length,
            "Les quatre joues restent sélectionnables",
          ).toBeGreaterThan(0);
      }
      const center = new THREE.Vector3(1, BRIGO_HEIGHT_SCALE, 1).applyMatrix4(
        transform,
      );
      for (const direction of [
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, -1, 0),
        new THREE.Vector3(0, 0, 1),
        new THREE.Vector3(0, 0, -1),
      ]) {
        const expected = direction.y ? 0.5 * BRIGO_HEIGHT_SCALE : 0.5;
        const wall = hits(
          bearing,
          center,
          direction.transformDirection(transform),
        )[0];
        expect(
          wall?.distance,
          "Chaque paroi intérieure existe au bord exact du tunnel",
        ).toBeCloseTo(expected, 5);
      }
      library.dispose();
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "garde le vantail, les deux panneaux et la poignée visibles sur les deux faces à %s°",
    (rotation) => {
      const library = createBrigoMeshLibrary();
      const piece = brigo("special-door:brown");
      const door = library.create(piece);
      const transform = placementTransform({
        id: "door-review",
        brigoId: piece.id,
        x: 6,
        y: 7,
        z: 4,
        rotation,
      });
      door.applyMatrix4(transform);
      const h = piece.model.height * BRIGO_HEIGHT_SCALE;
      // Inspect actual visible surfaces, not just the presence of a mesh. The
      // panel must cover the opening, and its details must sit in front of it
      // from either side, including after placement quarter turns.
      const samples = [
        { height: h * 0.46, depth: 1.5, role: "body", face: 0.41 },
        { height: h * 0.27, depth: 1.5, role: "detail", face: 0.398 },
        { height: h * 0.68, depth: 1.5, role: "detail", face: 0.398 },
        { height: h * 0.465, depth: 1.92, role: "hub", face: 0.392 },
      ];
      for (const side of [-1, 1]) {
        for (const sample of samples) {
          const origin = new THREE.Vector3(
            side < 0 ? -1 : piece.model.width + 1,
            sample.height,
            sample.depth,
          ).applyMatrix4(transform);
          const direction = new THREE.Vector3(-side, 0, 0).transformDirection(
            transform,
          );
          const visible = hits(door, origin, direction)[0];
          expect(visible?.object.name).toBe(sample.role);
          const localHit = visible.point
            .clone()
            .applyMatrix4(transform.clone().invert());
          expect(localHit.x).toBeCloseTo(
            side < 0 ? sample.face : piece.model.width - sample.face,
            5,
          );
        }
      }
      library.dispose();
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "ne cache pas la poignée derrière un montant dans les vues obliques à %s°",
    (rotation) => {
      const library = createBrigoMeshLibrary();
      const piece = brigo("special-door:brown");
      const door = library.create(piece);
      const transform = placementTransform({
        id: "door-oblique-review",
        brigoId: piece.id,
        x: 6,
        y: 7,
        z: 4,
        rotation,
      });
      door.applyMatrix4(transform);
      const h = piece.model.height * BRIGO_HEIGHT_SCALE;
      for (const side of [-1, 1]) {
        for (const depthSide of [-1, 1]) {
          const target = new THREE.Vector3(
            side < 0 ? 0.392 : 0.608,
            h * 0.465,
            1.92,
          ).applyMatrix4(transform);
          // The 2D projection sees along game (±1, ±1, 25/7).
          // Convert its height component to the real 3D scene scale.
          const towardCamera = new THREE.Vector3(
            side,
            (25 / 7) * BRIGO_HEIGHT_SCALE,
            depthSide,
          )
            .normalize()
            .transformDirection(transform);
          const origin = target.clone().addScaledVector(towardCamera, 10);
          const visible = hits(door, origin, towardCamera.clone().negate())[0];
          expect(visible?.object.name).toBe("hub");
          expect(visible.point.distanceTo(target)).toBeLessThan(0.00001);
        }
      }
      library.dispose();
    },
  );

  it.each([0, 90, 180, 270] as const)(
    "laisse les quatre carreaux transparents et les croisillons au premier plan à %s°",
    (rotation) => {
      const library = createBrigoMeshLibrary();
      const piece = brigo("special-window:blue");
      const window = library.create(piece);
      const transform = placementTransform({
        id: "window-review",
        brigoId: piece.id,
        x: 6,
        y: 7,
        z: 4,
        rotation,
      });
      window.applyMatrix4(transform);
      for (const side of [-1, 1]) {
        for (const [height, depth, role] of [
          [0.6, 0.75, "glass"],
          [0.6, 1.25, "glass"],
          [1.4, 0.75, "glass"],
          [1.4, 1.25, "glass"],
          [0.6, 1, "body"],
          [1.02, 0.75, "body"],
        ] as const) {
          const origin = new THREE.Vector3(
            side < 0 ? -1 : piece.model.width + 1,
            height,
            depth,
          ).applyMatrix4(transform);
          const direction = new THREE.Vector3(-side, 0, 0).transformDirection(
            transform,
          );
          expect(hits(window, origin, direction)[0]?.object.name).toBe(role);
        }
      }
      library.dispose();
    },
  );

  it("garde un verre translucide sans écrire dans la profondeur", () => {
    const library = createBrigoMeshLibrary();
    const window = library.create(brigo("special-window:blue"));
    const glass = meshes(window).find((mesh) => mesh.name === "glass")!;
    const material = glass.material as THREE.MeshToonMaterial;
    expect(material.transparent).toBe(true);
    expect(material.depthWrite).toBe(false);
    expect(material.opacity).toBeLessThan(0.5);
    library.dispose();
  });

  it("affiche les roues dans le plan vertical YZ et non comme une pile de raccords", () => {
    const library = createBrigoMeshLibrary();
    const wheel = library.create(brigo("special-wheel:orange"));
    expect(meshes(wheel).map((mesh) => mesh.name)).toEqual([
      "tire",
      "body",
      "detail",
      "hub",
    ]);
    const tire = meshes(wheel)[0];
    const bounds = new THREE.Box3()
      .setFromObject(tire)
      .getSize(new THREE.Vector3());
    expect(bounds.y).toBeGreaterThan(bounds.x * 1.8);
    expect(bounds.z).toBeGreaterThan(bounds.x * 1.8);
    expect(
      hits(
        wheel,
        new THREE.Vector3(-1, BRIGO_HEIGHT_SCALE * 3, 1),
        new THREE.Vector3(1, 0, 0),
      ).length,
    ).toBeGreaterThan(0);
    library.dispose();
  });

  it.each(
    ["special-axle:orange", "special-hinge:coral"].flatMap((id) =>
      ([0, 90, 180, 270] as const).map((rotation) => [id, rotation] as const),
    ),
  )(
    "%s masque le métal encastré mais conserve sa partie exposée en vue oblique à %s°",
    (id, rotation) => {
      const library = createBrigoMeshLibrary();
      const piece = brigo(id);
      const group = library.create(piece);
      const transform = placementTransform({
        id: "mechanical-oblique-review",
        brigoId: piece.id,
        x: 6,
        y: 7,
        z: 4,
        rotation,
      });
      group.applyMatrix4(transform);
      const axle = piece.model.shape === "axle";
      const samples = axle
        ? [
            // This point is on the shaft inside an opaque end collar.
            { x: 0.155066, depth: 0.572398, height: 0.8, role: "body" },
            { x: 1, depth: 0.5, height: 0.8, role: "metal" },
          ]
        : [
            // The hinge pin enters the rear plate; its central gap stays open.
            { x: 0.5948, depth: 0.8628, height: 1.66, role: "body" },
            { x: 1, depth: 1, height: 1.66, role: "metal" },
          ];
      // Keep the actual camera direction fixed while rotating the piece, as
      // the vector drawing does. Test frontmost surfaces rather than draw order.
      const towardCamera = new THREE.Vector3(
        1,
        (25 / 7) * BRIGO_HEIGHT_SCALE,
        1,
      ).normalize();
      for (const sample of samples) {
        const target = new THREE.Vector3(
          sample.x,
          sample.height * BRIGO_HEIGHT_SCALE,
          sample.depth,
        ).applyMatrix4(transform);
        const visible = hits(
          group,
          target.clone().addScaledVector(towardCamera, 10),
          towardCamera.clone().negate(),
        )[0];
        expect(visible?.object.name).toBe(sample.role);
        if (sample.role === "metal")
          expect(visible.point.distanceTo(target)).toBeLessThan(0.00001);
        else expect(visible.point.distanceTo(target)).toBeGreaterThan(0.001);
      }
      library.dispose();
    },
  );

  it("sépare les matériaux des fantômes valides et invalides sans modifier les pièces", () => {
    const library = createBrigoMeshLibrary();
    const piece = brigo("brick-2x2:coral");
    const solid = meshes(library.create(piece))[0]
      .material as THREE.MeshToonMaterial;
    const valid = meshes(library.create(piece, { ghost: true }))[0]
      .material as THREE.MeshToonMaterial;
    const invalid = meshes(
      library.create(piece, { ghost: true, valid: false }),
    )[0].material as THREE.MeshToonMaterial;
    expect(solid.transparent).toBe(false);
    expect(valid.transparent).toBe(true);
    expect(valid.depthWrite).toBe(false);
    expect(valid.color.getHex()).not.toBe(invalid.color.getHex());
    expect(solid.color.getHexString()).toBe("ee6558");
    expect(valid.opacity).toBeGreaterThan(0.3);
    library.dispose();
  });

  it("dessine l'encre avec des triangles à largeur écran constante, sans surface sélectionnable", () => {
    const library = createBrigoMeshLibrary();
    const piece = library.create(brigo("brick-2x4:coral"));
    const ink = piece.children.find(
      (child) => child.userData.brigoInk,
    ) as THREE.Mesh;
    expect(ink).toBeInstanceOf(THREE.Mesh);
    const position = ink.geometry.getAttribute("position");
    const other = ink.geometry.getAttribute("inkOther");
    const sides = ink.geometry.getAttribute("inkSide");
    expect(position.count % 6).toBe(0);
    expect(other.count).toBe(position.count);
    expect(sides.count).toBe(position.count);
    expect(
      [...position.array, ...other.array, ...sides.array].every(
        Number.isFinite,
      ),
    ).toBe(true);
    expect(new Set(sides.array)).toEqual(new Set([-1, 1]));
    const material = ink.material as THREE.ShaderMaterial;
    expect(material).toBeInstanceOf(THREE.ShaderMaterial);
    expect(material.uniforms.inkColor.value.getHexString()).toBe("252127");
    expect(material.uniforms.inkHalfWidth.value * 2).toBeCloseTo(2.1);
    expect(material.depthWrite).toBe(false);
    const getSize = vi.fn((viewport: THREE.Vector2) => viewport.set(390, 420));
    material.onBeforeRender(
      { getSize } as unknown as THREE.WebGLRenderer,
      {} as THREE.Scene,
      {} as THREE.Camera,
      ink.geometry,
      ink,
      {} as THREE.Group,
    );
    expect(material.uniforms.inkViewport.value.toArray()).toEqual([390, 420]);
    expect(material.uniformsNeedUpdate).toBe(true);
    material.uniformsNeedUpdate = false;
    getSize.mockImplementation((viewport: THREE.Vector2) =>
      viewport.set(1024, 620),
    );
    material.onBeforeRender(
      { getSize } as unknown as THREE.WebGLRenderer,
      {} as THREE.Scene,
      {} as THREE.Camera,
      ink.geometry,
      ink,
      {} as THREE.Group,
    );
    expect(material.uniforms.inkViewport.value.toArray()).toEqual([1024, 620]);
    expect(material.uniformsNeedUpdate).toBe(true);
    expect(material.forceSinglePass).toBe(true);
    piece.updateMatrixWorld(true);
    expect(
      new THREE.Raycaster(
        new THREE.Vector3(1, 10, 2),
        new THREE.Vector3(0, -1, 0),
      ).intersectObject(ink),
    ).toHaveLength(0);
    library.dispose();
  });

  it("partage les contours entre couleurs et conserve une encre distincte pour chaque état d'aperçu", () => {
    const library = createBrigoMeshLibrary();
    const coral = library.create(brigo("special-wheel:coral"));
    const blue = library.create(brigo("special-wheel:blue"));
    const valid = library.create(brigo("special-wheel:coral"), { ghost: true });
    const invalid = library.create(brigo("special-wheel:coral"), {
      ghost: true,
      valid: false,
    });
    const inks = [coral, blue, valid, invalid].map(
      (piece) =>
        piece.children.find((child) => child.userData.brigoInk) as THREE.Mesh,
    );
    expect(inks.every((ink) => ink.geometry === inks[0].geometry)).toBe(true);
    expect(inks[0].material).toBe(inks[1].material);
    expect(new Set(inks.map((ink) => ink.material)).size).toBe(3);
    expect(inks[2].material).not.toBe(inks[3].material);
    library.dispose();
  });

  it("ajoute les aplats et hachures aux matériaux solides sans texture ni animation", () => {
    const library = createBrigoMeshLibrary();
    const material = meshes(library.create(brigo("brick-1x1:mint")))[0]
      .material as THREE.MeshToonMaterial;
    const shader = {
      vertexShader: THREE.ShaderLib.toon.vertexShader,
      fragmentShader: THREE.ShaderLib.toon.fragmentShader,
      uniforms: {},
    };
    material.onBeforeCompile(
      shader as Parameters<typeof material.onBeforeCompile>[0],
      {} as THREE.WebGLRenderer,
    );
    // The source hook must still match Three's actual shader, including instancing.
    expect(shader.vertexShader).toContain(
      "vBrigoPosition = (modelMatrix * brigoPosition).xyz",
    );
    expect(shader.vertexShader).toContain(
      "brigoNormal = mat3(instanceMatrix) * brigoNormal",
    );
    expect(shader.fragmentShader).toContain(
      "outgoingLight = brigoLight > 0.70",
    );
    expect(shader.fragmentShader).toContain("fwidth(brigoStroke)");
    expect(material.map).toBeNull();
    expect(material.gradientMap).toBeNull();
    expect(shader.uniforms).toEqual({});
    library.dispose();
  });

  it("libère une fois toutes les ressources partagées à la fermeture", () => {
    const library = createBrigoMeshLibrary();
    const groups = [
      library.create(brigo("special-wheel:coral")),
      library.create(brigo("special-wheel:blue")),
      library.create(brigo("special-wheel:coral"), { ghost: true }),
      library.create(brigo("special-wheel:coral"), {
        ghost: true,
        valid: false,
      }),
    ];
    const resources = new Set<THREE.BufferGeometry | THREE.Material>();
    for (const group of groups)
      for (const child of group.children) {
        if (!(
          child instanceof THREE.Mesh || child instanceof THREE.LineSegments
        ))
          continue;
        resources.add(child.geometry);
        if (Array.isArray(child.material))
          child.material.forEach((material) => resources.add(material));
        else resources.add(child.material);
      }
    const disposals = [...resources].map((resource) =>
      vi.spyOn(resource, "dispose"),
    );
    library.dispose();
    library.dispose();
    disposals.forEach((dispose) => expect(dispose).toHaveBeenCalledTimes(1));
    expect(() => library.create(brigo("brick-1x1:mint"))).toThrow("fermée");
  });
});
