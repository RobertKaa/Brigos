import { layout } from "./layout";
import type { AssemblySpec } from "./layout";

/** A complete garden estate: foundations, two storeys, three pavilions and planted courts. */
export const LEGENDARY_GARDEN_ASSEMBLIES: AssemblySpec[] = [
  {
    id: "astreval-gardens",
    name: "Les jardins d’Astréval",
    description:
      "Un palais à deux étages et son observatoire dominent deux pavillons, des galeries à arcades et quatre parterres fleuris. Une fontaine, des allées et un portail doré complètent ce grand domaine de 48 × 42 tenons.",
    difficulty: "Légendaire",
    color: "#e4eadb",
    placements: layout((p) => {
      // Two staggered courses connect every six-stud foundation module.
      for (let x = 0; x < 48; x += 6)
        for (let y = 0; y < 42; y += 6) p("plate-6x6", "charcoal", x, y, 0);
      const spansX = [3, 6, 6, 6, 6, 6, 6, 6, 3];
      const spansY = [3, 6, 6, 6, 6, 6, 6, 3];
      let patchX = 0;
      for (const width of spansX) {
        let patchY = 0;
        for (const depth of spansY) {
          if (width === 6 && depth === 6)
            p("plate-6x6", "green", patchX, patchY, 1);
          else if (width === 3 && depth === 6)
            for (let dy = 0; dy < 6; dy += 2)
              p("plate-2x3", "green", patchX, patchY + dy, 1, 90);
          else if (width === 6 && depth === 3) {
            p("plate-2x6", "green", patchX, patchY, 1, 90);
            p("plate-1x4", "green", patchX, patchY + 2, 1, 90);
            p("plate-1x2", "green", patchX + 4, patchY + 2, 1, 90);
          } else {
            p("plate-2x3", "green", patchX, patchY, 1, 90);
            p("plate-1x3", "green", patchX, patchY + 2, 1, 90);
          }
          patchY += depth;
        }
        patchX += width;
      }

      // The palace has real arch openings and full, reusable floor modules.
      const palaceFloor = (z: number) => {
        for (const x of [12, 18, 24, 30])
          for (const y of [3, 9]) p("plate-6x6", "ivory", x, y, z);
      };
      const palaceStorey = (z: number) => {
        for (const dz of [0, 3, 6]) {
          for (const x of [12, 20, 28])
            p("brick-1x8", "ivory", x, 3, z + dz, 90);
          for (const x of [12, 35]) {
            p("brick-1x6", "ivory", x, 4, z + dz);
            p("brick-1x4", "ivory", x, 10, z + dz);
          }
        }
        for (const x of [12, 20, 28]) p("arch-1x6", "ivory", x, 14, z, 90);
        for (const x of [18, 26, 34])
          for (const dz of [0, 3]) p("brick-1x2", "ivory", x, 14, z + dz, 90);
        for (const x of [12, 20, 28]) p("brick-1x8", "ivory", x, 14, z + 6, 90);
      };
      palaceFloor(2);
      palaceStorey(3);
      palaceFloor(12);
      palaceStorey(13);
      palaceFloor(22);

      // Rooftop terrace. The tower is set back so the balustrade stays open.
      for (const y of [3, 14])
        for (const x of [12, 20, 28]) {
          p("brick-1x8", "brown", x, y, 23, 90);
          p("tile-1x4", "ivory", x, y, 26, 90);
          p("tile-1x4", "ivory", x + 4, y, 26, 90);
        }
      for (const x of [12, 35]) {
        p("brick-1x6", "brown", x, 4, 23);
        p("brick-1x4", "brown", x, 10, 23);
        p("tile-1x4", "ivory", x, 4, 26);
        p("tile-1x2", "ivory", x, 8, 26);
        p("tile-1x4", "ivory", x, 10, 26);
      }
      for (const x of [20, 24])
        for (const y of [5, 9]) p("plate-4x4", "ivory", x, y, 23);
      for (const x of [20, 26])
        for (const y of [5, 11])
          for (const z of [24, 27, 30, 33]) p("brick-2x2", "ivory", x, y, z);
      for (const z of [24, 30]) {
        for (const x of [20, 27]) p("arch-1x4", "ivory", x, 7, z);
        for (const y of [5, 12]) p("arch-1x4", "ivory", 22, y, z, 90);
      }
      for (const x of [20, 24])
        for (const y of [5, 9]) p("plate-4x4", "blue", x, y, 36);
      for (const y of [5, 9]) {
        p("slope-2x4", "blue", 20, y, 37, 180);
        p("slope-2x4", "blue", 26, y, 37);
      }
      p("slope-2x4", "blue", 22, 5, 37, 270);
      p("slope-2x4", "blue", 22, 11, 37, 90);
      p("brick-4x4", "blue", 22, 7, 37);
      p("plate-4x4", "blue", 22, 7, 40);
      p("brick-2x2", "blue", 23, 8, 41);
      p("slope-1x2", "blue", 22, 8, 41, 180);
      p("slope-1x2", "blue", 25, 8, 41);
      p("slope-1x2", "blue", 23, 7, 41, 270);
      p("slope-1x2", "blue", 23, 10, 41, 90);
      p("round-2x2", "yellow", 23, 8, 44);
      p("special-cross", "yellow", 22, 7, 47);

      // Two smaller entrance pavilions share the palace's two-storey language.
      const pavilion = (x: number) => {
        const floor = (z: number) => {
          for (const dx of [0, 4])
            for (const y of [3, 9]) p("plate-4x6", "ivory", x + dx, y, z);
        };
        const storey = (z: number) => {
          for (const dz of [0, 3, 6]) {
            for (const dx of [0, 4])
              p("brick-1x4", "ivory", x + dx, 3, z + dz, 90);
            for (const dx of [0, 7]) {
              p("brick-1x6", "ivory", x + dx, 4, z + dz);
              p("brick-1x4", "ivory", x + dx, 10, z + dz);
            }
          }
          p("arch-1x6", "ivory", x + 1, 14, z, 90);
          for (const dx of [0, 7])
            for (const dz of [0, 3])
              p("brick-1x1", "ivory", x + dx, 14, z + dz);
          p("brick-1x8", "ivory", x, 14, z + 6, 90);
        };
        floor(2);
        storey(3);
        floor(12);
        storey(13);
        floor(22);
        for (const y of [3, 7, 11]) {
          p("brick-4x4", "blue", x + 2, y, 23);
          p("slope-2x4", "blue", x, y, 23, 180);
          p("slope-2x4", "blue", x + 6, y, 23);
          p("plate-4x4", "blue", x + 2, y, 26);
          p("slope-2x4", "blue", x + 2, y, 27, 180);
          p("slope-2x4", "blue", x + 4, y, 27);
        }
      };
      pavilion(3);
      pavilion(37);

      // Five vaulted bays on either side frame the planted courts.
      for (const x of [3, 41])
        for (const y of [18, 22, 26, 30, 34]) {
          p("arch-1x4", "ivory", x, y, 2);
          p("arch-1x4", "ivory", x + 3, y, 2);
          p("plate-4x4", "brown", x, y, 8);
          p("slope-2x4", "blue", x, y, 9, 180);
          p("slope-2x4", "blue", x + 2, y, 9);
        }

      // Twenty-four individual flowering plants sit in four accessible parterres.
      for (const x of [10, 30])
        for (const y of [20, 32]) {
          for (const dy of [0, 5]) p("brick-1x8", "brown", x, y + dy, 2, 90);
          for (const dx of [0, 7]) p("brick-1x4", "brown", x + dx, y + 1, 2);
          p("plate-4x6", "green", x + 1, y + 1, 2, 90);
          for (const dx of [1, 3, 5])
            for (const dy of [1, 3]) {
              p("round-2x2", "brown", x + dx, y + dy, 3);
              p("round-1x1", "green", x + dx, y + dy, 6);
              p("plate-1x2", "green", x + dx, y + dy, 9);
              p(
                "round-1x1",
                (dx + dy) % 3 ? "coral" : "yellow",
                x + dx,
                y + dy,
                10,
              );
            }
        }

      // The paths avoid the fountain, planting beds, gate pillars and galleries.
      for (const y of [15, 17, 19, 21, 33, 35, 37, 39])
        p("tile-2x4", "ivory", 22, y, 2, 90);
      for (const x of [11, 15, 29, 33])
        for (const y of [28, 30]) p("tile-2x4", "ivory", x, y, 2, 90);
      for (const x of [9, 37])
        for (const y of [28, 30]) p("tile-2x2", "ivory", x, y, 2);
      for (const x of [7, 39]) {
        for (const y of [18, 22, 26, 30, 34]) p("tile-2x4", "ivory", x, y, 2);
        p("tile-2x2", "ivory", x, 38, 2);
      }
      for (const x of [7, 11, 15, 26, 30, 34])
        p("tile-2x4", "ivory", x, 16, 2, 90);
      for (const x of [19, 38])
        for (const y of [16, 17]) p("tile-1x3", "ivory", x, y, 2, 90);
      for (const x of [9, 13, 17, 26, 30, 34])
        p("tile-2x4", "ivory", x, 38, 2, 90);
      for (const x of [21, 38]) p("tile-1x2", "ivory", x, 38, 2);

      // Four fruit trees mark the ends of the colonnades without blocking the paths.
      const fruitTree = (x: number, y: number, tall: boolean) => {
        const crown = tall ? 14 : 11;
        for (const z of tall ? [2, 5, 8, 11] : [2, 5, 8])
          p("round-2x2", "brown", x + 1, y + 1, z);
        p("plate-4x4", "green", x, y, crown);
        p("brick-2x2", "green", x + 1, y + 1, crown + 1);
        p("slope-1x2", "green", x, y + 1, crown + 1, 180);
        p("slope-1x2", "green", x + 3, y + 1, crown + 1);
        p("slope-1x2", "green", x + 1, y, crown + 1, 270);
        p("slope-1x2", "green", x + 1, y + 3, crown + 1, 90);
        for (const dx of [0, 3])
          for (const dy of [0, 3])
            p("round-1x1", "coral", x + dx, y + dy, crown + 1);
        p("plate-2x2", "green", x + 1, y + 1, crown + 4);
        p("slope-1x2", "green", x + 1, y + 1, crown + 5, 180);
        p("slope-1x2", "green", x + 2, y + 1, crown + 5);
      };
      for (const x of [3, 41]) {
        fruitTree(x, 15, true);
        fruitTree(x, 38, false);
      }

      // A raised pool, central basin and modest water jets remain visible from above.
      for (const y of [23, 32]) {
        p("brick-1x8", "ivory", 20, y, 2, 90);
        for (const x of [20, 24]) p("tile-1x4", "ivory", x, y, 5, 90);
      }
      for (const x of [19, 28]) {
        p("brick-1x8", "ivory", x, 24, 2);
        for (const y of [24, 28]) p("tile-1x4", "ivory", x, y, 5);
        for (const y of [23, 32]) {
          p("brick-1x1", "ivory", x, y, 2);
          p("tile-1x1", "ivory", x, y, 5);
        }
      }
      for (const x of [20, 24])
        for (const y of [24, 28]) p("plate-4x4", "blue", x, y, 2);
      p("plate-4x4", "blue", 22, 26, 3);
      p("round-4x4", "blue", 22, 26, 4);
      p("round-2x2", "ivory", 23, 27, 7);
      p("round-2x2", "blue", 23, 27, 10);
      p("special-cross", "blue", 22, 26, 13);
      p("round-1x1", "ivory", 23, 27, 14);
      for (const x of [21, 26])
        for (const y of [25, 30]) p("round-1x1", "blue", x, y, 3);

      // Low arcaded enclosure. A twelve-stud opening forms the front entrance.
      for (const y of [0, 41])
        for (let x = 0; x < 48; x += 6) {
          if (y === 41 && (x === 18 || x === 24)) continue;
          p("arch-1x6", "ivory", x, y, 2, 90);
          p("tile-1x4", "brown", x, y, 8, 90);
          p("tile-1x2", "brown", x + 4, y, 8, 90);
        }
      for (const x of [0, 47])
        for (let y = 1; y < 41; y += 4) {
          p("arch-1x4", "ivory", x, y, 2);
          p("tile-1x4", "brown", x, y, 8);
        }
      for (const x of [18, 28]) {
        for (const z of [2, 5, 8, 11]) p("brick-2x2", "ivory", x, 40, z);
        p("plate-2x2", "brown", x, 40, 14);
        p("round-2x2", "yellow", x, 40, 15);
      }
    }),
  },
];
