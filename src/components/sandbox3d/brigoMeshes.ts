import * as THREE from "three";
import type { Brigo, BrigoModel } from "../../game/catalog";
import { studCenters } from "../../game/geometry";

/** The catalogue stores height in thirds of a horizontal grid cell. */
export const BRIGO_HEIGHT_SCALE = 0.34;
const CLASP_HEIGHT = 0.2 * BRIGO_HEIGHT_SCALE;
const INK = "#252127";
type Point2 = [number, number];
type Point3 = [number, number, number];
type Role = "body" | "tire" | "metal" | "hub" | "detail" | "glass";
type Options = { ghost?: boolean; valid?: boolean };

interface Surface {
  role: Role;
  geometry: THREE.BufferGeometry;
}

interface ModelGeometry {
  surfaces: Surface[];
  ink: THREE.BufferGeometry;
}

/**
 * Flat, saturated colour blocks and sparse engraved hatching. The palette is
 * deliberately independent of the bright editor lights: those lights must not
 * bleach a coral or mint Brigo into a near-white plastic render.
 */
function illustrateMaterial(material: THREE.MeshToonMaterial) {
  material.customProgramCacheKey = () => "brigo-printed-cel-v1";
  material.onBeforeCompile = (shader) => {
    const varyings =
      "varying vec3 vBrigoPosition; varying vec3 vBrigoNormal;\n";
    shader.vertexShader = varyings + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <worldpos_vertex>",
      `#include <worldpos_vertex>
      vec4 brigoPosition = vec4(position, 1.0);
      vec3 brigoNormal = normal;
      #ifdef USE_INSTANCING
        brigoPosition = instanceMatrix * brigoPosition;
        brigoNormal = mat3(instanceMatrix) * brigoNormal;
      #endif
      vBrigoPosition = (modelMatrix * brigoPosition).xyz;
      vBrigoNormal = normalize(mat3(modelMatrix) * brigoNormal);`,
    );
    shader.fragmentShader = varyings + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <opaque_fragment>",
      `vec3 brigoNormal = normalize(vBrigoNormal);
      if (!gl_FrontFacing) brigoNormal = -brigoNormal;
      float brigoLight = dot(brigoNormal, normalize(vec3(-0.45, 0.85, 0.55)));
      vec3 brigoShadow = mix(diffuse * 0.28, vec3(0.018, 0.015, 0.021), 0.14);
      vec3 brigoMid = diffuse * 0.70;
      vec3 brigoLit = mix(diffuse, vec3(1.0, 0.96, 0.86), 0.19);
      outgoingLight = brigoLight > 0.70 ? brigoLit :
        (brigoLight > 0.12 ? brigoMid : brigoShadow);
      // Derivative filtering fades the hatch before it can alias at a distance.
      float brigoStroke = dot(vBrigoPosition, vec3(7.0, 10.0, 7.0));
      float brigoPixel = max(fwidth(brigoStroke), 0.001);
      float brigoHatch = 1.0 - smoothstep(0.06, 0.06 + brigoPixel,
        abs(fract(brigoStroke) - 0.5));
      brigoHatch *= 1.0 - smoothstep(0.18, 0.42, brigoPixel);
      outgoingLight *= 1.0 - brigoHatch * 0.28 * (1.0 - step(0.12, brigoLight));
      #include <opaque_fragment>`,
    );
  };
}

/** Six vertices per edge produce real two-pixel ink on WebGL and WebGL2. */
function inkGeometry(surfaces: Surface[]): THREE.BufferGeometry {
  const positions: number[] = [];
  const others: number[] = [];
  const sides: number[] = [];
  for (const { geometry } of surfaces) {
    const edges = new THREE.EdgesGeometry(geometry, 24);
    const points = edges.getAttribute("position");
    for (let index = 0; index < points.count; index += 2) {
      const start = new THREE.Vector3().fromBufferAttribute(points, index);
      const end = new THREE.Vector3().fromBufferAttribute(points, index + 1);
      for (const [along, side] of [
        [0, -1],
        [1, -1],
        [0, 1],
        [0, 1],
        [1, -1],
        [1, 1],
      ]) {
        positions.push(...(along ? end : start).toArray());
        others.push(...(along ? start : end).toArray());
        sides.push(side * (along ? -1 : 1));
      }
    }
    edges.dispose();
  }
  const result = new THREE.BufferGeometry();
  result.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(positions, 3),
  );
  result.setAttribute("inkOther", new THREE.Float32BufferAttribute(others, 3));
  result.setAttribute("inkSide", new THREE.Float32BufferAttribute(sides, 1));
  result.computeBoundingBox();
  result.computeBoundingSphere();
  return result;
}

function inkMaterial(ghost: boolean, valid: boolean): THREE.ShaderMaterial {
  const viewport = new THREE.Vector2(1, 1);
  const material = new THREE.ShaderMaterial({
    name: "brigo:printed-ink",
    uniforms: {
      inkColor: {
        value: new THREE.Color(ghost ? (valid ? "#27846d" : "#d6453b") : INK),
      },
      inkOpacity: { value: ghost ? 0.8 : 1 },
      inkViewport: { value: viewport },
      inkHalfWidth: { value: ghost ? 0.8 : 1.05 },
    },
    vertexShader: `
      attribute vec3 inkOther;
      attribute float inkSide;
      uniform vec2 inkViewport;
      uniform float inkHalfWidth;
      void main() {
        vec4 vertex = vec4(position, 1.0);
        vec4 other = vec4(inkOther, 1.0);
        #ifdef USE_INSTANCING
          vertex = instanceMatrix * vertex;
          other = instanceMatrix * other;
        #endif
        vec4 projected = projectionMatrix * modelViewMatrix * vertex;
        vec4 projectedOther = projectionMatrix * modelViewMatrix * other;
        vec2 direction = (projectedOther.xy / projectedOther.w -
          projected.xy / projected.w) * inkViewport;
        vec2 perpendicular = vec2(-direction.y, direction.x) /
          max(length(direction), 0.00001);
        projected.xy += perpendicular * inkSide * inkHalfWidth * 2.0 /
          inkViewport * projected.w;
        projected.z -= 0.000002 * projected.w;
        gl_Position = projected;
      }
    `,
    fragmentShader: `
      uniform vec3 inkColor;
      uniform float inkOpacity;
      void main() {
        gl_FragColor = vec4(inkColor, inkOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.DoubleSide,
    forceSinglePass: true,
    transparent: ghost,
    depthWrite: false,
    toneMapped: false,
  });
  // CSS pixels keep the same visual weight on desktop and high-DPI mobile.
  material.onBeforeRender = (renderer) => {
    const width = viewport.x,
      height = viewport.y;
    renderer.getSize(viewport);
    viewport.x = Math.max(1, viewport.x);
    viewport.y = Math.max(1, viewport.y);
    if (viewport.x !== width || viewport.y !== height)
      material.uniformsNeedUpdate = true;
  };
  return material;
}

// The catalogue's original chamfered silhouettes and diamond clasps are shared
// with BrigoScene. No manufacturer geometry, textures or external assets enter
// this renderer. A role is merged once so a large plate does not create a mesh
// and an outline object for each of its clasps.
class GeometryBuilder {
  private positions = new Map<Role, number[]>();

  private triangle(
    role: Role,
    a: Point3,
    b: Point3,
    c: Point3,
    outward: Point3,
  ) {
    const ab = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
    const ac = new THREE.Vector3(...c).sub(new THREE.Vector3(...a));
    const normal = ab.cross(ac);
    if (normal.lengthSq() < 1e-16) return;
    if (normal.dot(new THREE.Vector3(...outward)) < 0) [b, c] = [c, b];
    let values = this.positions.get(role);
    if (!values) this.positions.set(role, (values = []));
    values.push(...a, ...b, ...c);
  }

  face(role: Role, vertices: Point3[], outward: Point3) {
    for (let index = 1; index + 1 < vertices.length; index++)
      this.triangle(
        role,
        vertices[0],
        vertices[index],
        vertices[index + 1],
        outward,
      );
  }

  /** Extrude even concave profiles, retaining real door and arch openings. */
  prism(
    role: Role,
    profile: Point2[],
    start: number,
    length: number,
    axis: "x" | "y" = "y",
  ) {
    const point = ([a, b]: Point2, depth: number): Point3 =>
      axis === "y" ? [a, depth, b] : [depth, b, a];
    const direction: Point3 = axis === "y" ? [0, 1, 0] : [1, 0, 0];
    const triangles = THREE.ShapeUtils.triangulateShape(
      profile.map(([x, y]) => new THREE.Vector2(x, y)),
      [],
    );
    for (const triangle of triangles) {
      this.triangle(
        role,
        point(profile[triangle[0]], start),
        point(profile[triangle[1]], start),
        point(profile[triangle[2]], start),
        direction.map((value) => -value) as Point3,
      );
      this.triangle(
        role,
        point(profile[triangle[0]], start + length),
        point(profile[triangle[1]], start + length),
        point(profile[triangle[2]], start + length),
        direction,
      );
    }
    const signedArea = profile.reduce((sum, [x, y], index) => {
      const next = profile[(index + 1) % profile.length];
      return sum + x * next[1] - next[0] * y;
    }, 0);
    const sign = signedArea >= 0 ? 1 : -1;
    profile.forEach((vertex, index) => {
      const next = profile[(index + 1) % profile.length];
      const da = next[0] - vertex[0];
      const db = next[1] - vertex[1];
      const outward: Point3 =
        axis === "y" ? [db * sign, 0, -da * sign] : [0, -da * sign, db * sign];
      this.face(
        role,
        [
          point(vertex, start),
          point(next, start),
          point(next, start + length),
          point(vertex, start + length),
        ],
        outward,
      );
    });
  }

  block(
    role: Role,
    x: number,
    z: number,
    y: number,
    width: number,
    depth: number,
    height: number,
  ) {
    this.prism(
      role,
      chamfer([
        [x, z],
        [x + width, z],
        [x + width, z + depth],
        [x, z + depth],
      ]),
      y,
      height,
    );
  }

  finish(): Surface[] {
    return [...this.positions].map(([role, positions]) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(positions, 3),
      );
      // Unindexed faces keep the deliberately faceted ink-and-toon treatment.
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      return { role, geometry };
    });
  }
}

function chamfer(profile: Point2[], amount = 0.18): Point2[] {
  return profile.flatMap(([x, z], index) => {
    const previous = profile[(index + profile.length - 1) % profile.length];
    const next = profile[(index + 1) % profile.length];
    return [previous, next].map(([nx, nz]): Point2 => {
      const length = Math.hypot(nx - x, nz - z);
      const inset = Math.min(amount, length / 3);
      return [x + ((nx - x) * inset) / length, z + ((nz - z) * inset) / length];
    });
  });
}

function ring(width: number, height: number, count = 12, phase = 0): Point2[] {
  return Array.from({ length: count }, (_, index) => {
    const angle = (index * Math.PI * 2) / count + phase;
    return [
      width / 2 + (Math.cos(angle) * width) / 2,
      height / 2 + (Math.sin(angle) * height) / 2,
    ];
  });
}

function compileModel(model: BrigoModel): Surface[] {
  const { width: w, depth: d, shape } = model;
  const h = model.height * BRIGO_HEIGHT_SCALE;
  const builder = new GeometryBuilder();
  const block = (
    x: number,
    z: number,
    y: number,
    width: number,
    depth: number,
    height: number,
    role: Role = "body",
  ) => builder.block(role, x, z, y, width, depth, height);

  if (shape === "wheel") {
    const profile = ring(d * 0.98, h * 0.98, 12, Math.PI / 12).map(
      ([z, y]): Point2 => [z + d * 0.01, y + h * 0.01],
    );
    builder.prism("tire", profile, 0.03, w - 0.06, "x");
    const rim = profile.map(([z, y]): Point2 => [
      d / 2 + (z - d / 2) * 0.66,
      h / 2 + (y - h / 2) * 0.66,
    ]);
    const diamond: Point2[] = [
      [d / 2, h * 0.26],
      [d * 0.72, h / 2],
      [d / 2, h * 0.74],
      [d * 0.28, h / 2],
    ];
    const hub: Point2[] = [
      [d / 2, h * 0.41],
      [d * 0.59, h / 2],
      [d / 2, h * 0.59],
      [d * 0.41, h / 2],
    ];
    for (const side of [0, w - 0.03]) {
      builder.prism("body", rim, side + 0.004, 0.022, "x");
      builder.prism("detail", diamond, side + 0.002, 0.026, "x");
      builder.prism("hub", hub, side, 0.03, "x");
    }
  } else if (shape === "axle") {
    block(0.15, d * 0.28, h * 0.2, w - 0.3, d * 0.44, h * 0.6, "metal");
    block(0, 0, 0, 0.5, d, h);
    block(w - 0.5, 0, 0, 0.5, d, h);
    block(w / 2 - 0.28, d * 0.12, 0, 0.56, d * 0.76, h, "hub");
  } else if (shape === "bearing") {
    // Match the illustrated chamfered ring in game units, then convert height.
    // Split end caps surround an open square bore instead of crossing it.
    const height = model.height;
    const outer: Point2[] = [
      [0, 0.18],
      [0.18, 0],
      [d - 0.18, 0],
      [d, 0.18],
      [d, height - 0.18],
      [d - 0.18, height],
      [0.18, height],
      [0, height - 0.18],
    ];
    const inner: Point2[] = [
      [0.5, 0.5],
      [0.5, 0.5],
      [d - 0.5, 0.5],
      [d - 0.5, 0.5],
      [d - 0.5, height - 0.5],
      [d - 0.5, height - 0.5],
      [0.5, height - 0.5],
      [0.5, height - 0.5],
    ];
    const at = (x: number, [z, y]: Point2): Point3 => [
      x,
      y * BRIGO_HEIGHT_SCALE,
      z,
    ];
    outer.forEach((vertex, index) => {
      const next = (index + 1) % outer.length;
      const other = outer[next];
      const outward: Point3 = [0, vertex[0] - other[0], other[1] - vertex[1]];
      builder.face(
        "body",
        [at(0, vertex), at(0, other), at(w, other), at(w, vertex)],
        outward,
      );
      for (const x of [0, w])
        builder.face(
          "body",
          [
            at(x, vertex),
            at(x, other),
            at(x, inner[next]),
            at(x, inner[index]),
          ],
          [x === 0 ? -1 : 1, 0, 0],
        );
      if (
        inner[index][0] !== inner[next][0] ||
        inner[index][1] !== inner[next][1]
      ) {
        const inward: Point3 = [
          0,
          inner[next][0] - inner[index][0],
          inner[index][1] - inner[next][1],
        ];
        builder.face(
          "body",
          [
            at(0, inner[index]),
            at(w, inner[index]),
            at(w, inner[next]),
            at(0, inner[next]),
          ],
          inward,
        );
      }
    });
  } else if (shape === "hinge") {
    block(0, 0, 0, w, d * 0.44, h);
    block(0, d * 0.56, 0, w, d * 0.44, h);
    block(w * 0.28, d * 0.35, h * 0.17, w * 0.44, d * 0.3, h * 0.66, "metal");
  } else if (shape === "cone") {
    const bottom = ring(w, d, 10);
    const radius = w > 2 ? 1 : 0;
    const top = ring(radius * 2, radius * 2, 10).map(([x, z]): Point2 => [
      x + w / 2 - radius,
      z + d / 2 - radius,
    ]);
    bottom.forEach(([x, z], index) => {
      const next = (index + 1) % bottom.length;
      builder.face(
        "body",
        [
          [x, 0, z],
          [bottom[next][0], 0, bottom[next][1]],
          [top[next][0], h, top[next][1]],
          [top[index][0], h, top[index][1]],
        ],
        [x + bottom[next][0] - w, 1, z + bottom[next][1] - d],
      );
    });
    builder.face(
      "body",
      bottom.map(([x, z]) => [x, 0, z]),
      [0, -1, 0],
    );
    if (radius)
      builder.face(
        "body",
        top.map(([x, z]) => [x, h, z]),
        [0, 1, 0],
      );
  } else if (shape === "round") {
    builder.prism("body", ring(w, d), 0, h);
  } else if (shape === "slope") {
    const profile = chamfer([
      [0, 0],
      [w, 0],
      [w, d],
      [0, d],
    ]);
    const heightAt = (x: number) =>
      h + ((0.6 * BRIGO_HEIGHT_SCALE - h) * x) / w;
    const bottom = profile.map(([x, z]): Point3 => [x, 0, z]);
    const top = profile.map(([x, z]): Point3 => [x, heightAt(x), z]);
    builder.face("body", bottom, [0, -1, 0]);
    builder.face("body", top, [h, w, 0]);
    profile.forEach(([x, z], index) => {
      const next = (index + 1) % profile.length;
      builder.face(
        "body",
        [bottom[index], bottom[next], top[next], top[index]],
        [profile[next][1] - z, 0, x - profile[next][0]],
      );
    });
  } else if (shape === "arch" || shape === "window" || shape === "door") {
    const pillar = Math.min(0.58, d / 4);
    const cap = (shape === "door" ? 0.85 : 1) * BRIGO_HEIGHT_SCALE;
    const profile: Point2[] = [
      [0, 0],
      [pillar, 0],
    ];
    if (shape === "arch") {
      for (let index = 0; index <= 12; index++) {
        const t = index / 12;
        profile.push([
          pillar + (d - pillar * 2) * t,
          h -
            cap -
            ((t - 0.5) * 2) ** 2 * Math.min(1.75 * BRIGO_HEIGHT_SCALE, h / 3),
        ]);
      }
    } else profile.push([pillar, h - cap], [d - pillar, h - cap]);
    profile.push([d - pillar, 0], [d, 0], [d, h], [0, h]);
    builder.prism("body", profile, 0, w, "x");
    if (shape === "window") {
      const sill = 0.55 * BRIGO_HEIGHT_SCALE;
      block(0, 0, 0, w, d, sill);
      block(
        w / 2 - 0.005,
        pillar,
        sill,
        0.01,
        d - pillar * 2,
        h - cap - sill,
        "glass",
      );
      block(w / 2 - 0.08, d / 2 - 0.075, sill, 0.16, 0.15, h - cap - sill);
      block(
        w / 2 - 0.08,
        pillar,
        h / 2 - 0.1 * BRIGO_HEIGHT_SCALE,
        0.16,
        d - pillar * 2,
        0.2 * BRIGO_HEIGHT_SCALE,
      );
    } else if (shape === "door") {
      block(
        w / 2 - 0.09,
        pillar,
        0.1 * BRIGO_HEIGHT_SCALE,
        0.18,
        d - pillar * 2,
        h - cap - 0.1 * BRIGO_HEIGHT_SCALE,
      );
      for (const side of [w / 2 - 0.102, w / 2 + 0.09]) {
        for (const [bottom, top] of [
          [0.7 * BRIGO_HEIGHT_SCALE, h * 0.42],
          [h * 0.51, h - 1.5 * BRIGO_HEIGHT_SCALE],
        ])
          block(
            side,
            pillar + 0.25,
            bottom,
            0.012,
            d - pillar * 2 - 0.5,
            top - bottom,
            "detail",
          );
        block(
          side - 0.006,
          // Inset enough that the near jamb cannot hide the handle in the
          // shared isometric view; retain the same solid leaf and footprint.
          d - pillar - 0.58,
          h * 0.43,
          0.024,
          0.16,
          h * 0.07,
          "hub",
        );
      }
    }
  } else if (shape === "corner") {
    builder.prism(
      "body",
      chamfer([
        [0, 0],
        [w, 0],
        [w, 1],
        [1, 1],
        [1, d],
        [0, d],
      ]),
      0,
      h,
    );
  } else if (shape === "cross") {
    const x = Math.floor(w / 2),
      z = Math.floor(d / 2);
    builder.prism(
      "body",
      chamfer([
        [x, 0],
        [x + 1, 0],
        [x + 1, z],
        [w, z],
        [w, z + 1],
        [x + 1, z + 1],
        [x + 1, d],
        [x, d],
        [x, z + 1],
        [0, z + 1],
        [0, z],
        [x, z],
      ]),
      0,
      h,
    );
  } else block(0, 0, 0, w, d, h);

  for (const { x, y: z } of studCenters(model)) {
    builder.prism(
      "body",
      [
        [x, z - 0.27],
        [x + 0.27, z],
        [x, z + 0.27],
        [x - 0.27, z],
      ],
      h,
      CLASP_HEIGHT,
    );
  }
  return builder.finish();
}

function surfaceColor(brigo: Brigo, role: Role): THREE.Color {
  if (role === "tire" || role === "detail") return new THREE.Color(INK);
  if (role === "metal") return new THREE.Color("#777181");
  if (role === "glass") return new THREE.Color("#83b8c8");
  const color = new THREE.Color(brigo.color.hex);
  return role === "hub" ? color.offsetHSL(0, -0.05, 0.12) : color;
}

/** Own the library for the lifetime of one renderer; dispose only on teardown. */
export function createBrigoMeshLibrary() {
  const models = new Map<string, ModelGeometry>();
  const materials = new Map<string, THREE.MeshToonMaterial>();
  const inks = new Map<string, THREE.ShaderMaterial>();
  let disposed = false;

  return {
    create(brigo: Brigo, options: Options = {}): THREE.Group {
      if (disposed) throw new Error("La bibliothèque 3D Brigos est fermée.");
      const { model } = brigo;
      const key = [
        model.id,
        model.shape,
        model.width,
        model.depth,
        model.height,
        model.studs,
      ].join(":");
      let compiled = models.get(key);
      if (!compiled) {
        const surfaces = compileModel(model);
        compiled = {
          surfaces,
          ink: inkGeometry(surfaces.filter(({ role }) => role !== "glass")),
        };
        models.set(key, compiled);
      }
      const ghost = options.ghost === true;
      const valid = options.valid !== false;
      const group = new THREE.Group();
      group.name = `brigo:${brigo.id}`;
      for (const surface of compiled.surfaces) {
        const materialKey = ghost
          ? `ghost:${valid}`
          : `${brigo.color.hex}:${surface.role}`;
        let material = materials.get(materialKey);
        if (!material) {
          const glass = !ghost && surface.role === "glass";
          material = new THREE.MeshToonMaterial({
            color: ghost
              ? valid
                ? "#58b89c"
                : "#ee6558"
              : surfaceColor(brigo, surface.role),
            transparent: ghost || glass,
            opacity: ghost ? 0.42 : glass ? 0.32 : 1,
            depthWrite: !ghost && !glass,
            side: THREE.DoubleSide,
          });
          if (!ghost && !glass) illustrateMaterial(material);
          materials.set(materialKey, material);
        }
        const mesh = new THREE.Mesh(surface.geometry, material);
        mesh.name = surface.role;
        mesh.castShadow = !ghost && surface.role !== "glass";
        mesh.receiveShadow = !ghost;
        group.add(mesh);
      }
      const inkKey = ghost ? `ghost:${valid}` : "solid";
      let ink = inks.get(inkKey);
      if (!ink) inks.set(inkKey, (ink = inkMaterial(ghost, valid)));
      const edges = new THREE.Mesh(compiled.ink, ink);
      edges.name = "brigo:ink";
      edges.userData.brigoInk = true;
      // Shader-expanded contours are decoration, never physical surfaces.
      edges.raycast = () => {};
      edges.renderOrder = 1;
      group.add(edges);
      return group;
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const { surfaces, ink } of models.values()) {
        for (const { geometry } of surfaces) {
          geometry.dispose();
        }
        ink.dispose();
      }
      for (const material of materials.values()) material.dispose();
      for (const ink of inks.values()) ink.dispose();
      models.clear();
      materials.clear();
      inks.clear();
    },
  };
}
