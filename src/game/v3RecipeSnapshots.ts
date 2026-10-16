import type { Requirement } from "./catalog";

export interface RecipeSnapshot {
  readonly name: string;
  readonly requirements: readonly Readonly<Requirement>[];
  readonly geometry: string;
}

// Frozen v3 materials and geometry. Never derive these values from live recipes.
// Geometry is sorted [model, color, x, y, z, rotation]; keys and instruction order
// are deliberately excluded, since they do not alter an assembled creation.
export const V3_RECIPE_SNAPSHOTS = {
  totem: {
    name: "Le petit totem",
    requirements: [
      {
        modelId: "brick-2x2",
        quantity: 5,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-2x2",null,0,0,0,0],["brick-2x2",null,0,0,12,0],["brick-2x2",null,0,0,3,0],["brick-2x2",null,0,0,6,0],["brick-2x2",null,0,0,9,0]]',
  },
  bench: {
    name: "Le banc du parc",
    requirements: [
      {
        modelId: "brick-1x1",
        colorId: "orange",
        quantity: 6,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x4",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x4",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","orange",0,0,0,0],["brick-1x1","orange",0,0,4,0],["brick-1x1","orange",0,1,0,0],["brick-1x1","orange",3,0,0,0],["brick-1x1","orange",3,0,4,0],["brick-1x1","orange",3,1,0,0],["brick-1x4","mint",0,0,7,90],["plate-2x4","mint",0,0,3,90],["tile-1x4","mint",0,1,4,90]]',
  },
  tree: {
    name: "Mon beau sapin",
    requirements: [
      {
        modelId: "plate-4x4",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "orange",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x6",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "mint",
        quantity: 49,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-1x2",
        colorId: "mint",
        quantity: 8,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "mint",
        quantity: 10,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x2",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","mint",0,0,11,0],["brick-1x1","mint",0,0,14,0],["brick-1x1","mint",0,1,11,0],["brick-1x1","mint",0,1,14,0],["brick-1x1","mint",1,0,11,0],["brick-1x1","mint",1,0,14,0],["brick-1x1","mint",1,0,20,0],["brick-1x1","mint",1,0,27,0],["brick-1x1","mint",1,0,30,0],["brick-1x1","mint",1,1,11,0],["brick-1x1","mint",1,1,14,0],["brick-1x1","mint",1,1,20,0],["brick-1x1","mint",1,1,27,0],["brick-1x1","mint",1,1,30,0],["brick-1x1","mint",2,0,11,0],["brick-1x1","mint",2,0,14,0],["brick-1x1","mint",2,0,20,0],["brick-1x1","mint",2,0,27,0],["brick-1x1","mint",2,0,30,0],["brick-1x1","mint",2,0,36,0],["brick-1x1","mint",2,1,11,0],["brick-1x1","mint",2,1,14,0],["brick-1x1","mint",2,1,20,0],["brick-1x1","mint",2,1,27,0],["brick-1x1","mint",2,1,30,0],["brick-1x1","mint",3,0,11,0],["brick-1x1","mint",3,0,14,0],["brick-1x1","mint",3,0,20,0],["brick-1x1","mint",3,0,27,0],["brick-1x1","mint",3,0,30,0],["brick-1x1","mint",3,1,11,0],["brick-1x1","mint",3,1,14,0],["brick-1x1","mint",3,1,20,0],["brick-1x1","mint",3,1,27,0],["brick-1x1","mint",3,1,30,0],["brick-1x1","mint",4,0,11,0],["brick-1x1","mint",4,0,14,0],["brick-1x1","mint",4,0,20,0],["brick-1x1","mint",4,0,27,0],["brick-1x1","mint",4,0,30,0],["brick-1x1","mint",4,1,11,0],["brick-1x1","mint",4,1,14,0],["brick-1x1","mint",4,1,20,0],["brick-1x1","mint",4,1,27,0],["brick-1x1","mint",4,1,30,0],["brick-1x1","mint",5,0,11,0],["brick-1x1","mint",5,0,14,0],["brick-1x1","mint",5,1,11,0],["brick-1x1","mint",5,1,14,0],["brick-1x2","mint",1,0,17,0],["brick-1x2","mint",2,0,17,0],["brick-1x2","mint",2,0,23,0],["brick-1x2","mint",2,0,33,0],["brick-1x2","mint",2,0,40,0],["brick-1x2","mint",3,0,17,0],["brick-1x2","mint",3,0,23,0],["brick-1x2","mint",3,0,33,0],["brick-1x2","mint",3,0,40,0],["brick-1x2","mint",4,0,17,0],["brick-2x2","orange",2,0,1,0],["brick-2x2","orange",2,0,4,0],["brick-2x2","orange",2,0,7,0],["plate-2x2","mint",2,0,39,0],["plate-2x4","mint",1,0,26,90],["plate-2x6","mint",0,0,10,90],["plate-4x4","ivory",1,-1,0,0],["slope-1x2","mint",0,0,17,180],["slope-1x2","mint",1,0,23,180],["slope-1x2","mint",1,0,33,180],["slope-1x2","mint",2,0,43,180],["slope-1x2","mint",3,0,43,0],["slope-1x2","mint",4,0,23,0],["slope-1x2","mint",4,0,33,0],["slope-1x2","mint",5,0,17,0]]',
  },
  car: {
    name: "Le bolide cubique",
    requirements: [
      {
        modelId: "brick-1x1",
        colorId: "charcoal",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "blue",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "yellow",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-2x2",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","charcoal",0,0,0,0],["brick-1x1","charcoal",0,3,0,0],["brick-1x1","charcoal",1,0,0,0],["brick-1x1","charcoal",1,3,0,0],["brick-1x2","blue",0,0,4,90],["brick-1x2","blue",0,3,4,90],["brick-2x2","blue",0,1,4,0],["plate-2x4","yellow",0,0,3,0],["tile-1x2","yellow",0,0,7,90],["tile-1x2","yellow",0,3,7,90],["tile-2x2","charcoal",0,1,7,0]]',
  },
  house: {
    name: "La maison corail",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x3",
        colorId: "coral",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "special-window",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "coral",
        quantity: 7,
        label: "Ancien plan v3",
      },
      {
        modelId: "special-door",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x4",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "coral",
        quantity: 4,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x2","coral",1,2,7,0],["brick-1x2","coral",4,1,1,0],["brick-1x2","coral",4,1,4,0],["brick-1x2","coral",4,1,7,0],["brick-1x2","coral",4,3,1,0],["brick-1x2","coral",4,3,4,0],["brick-1x2","coral",4,3,7,0],["brick-1x3","coral",1,1,1,90],["brick-1x3","coral",1,1,4,90],["brick-1x3","coral",1,1,7,90],["plate-4x4","ivory",1,1,10,0],["plate-6x6","blue",0,0,0,0],["slope-2x2","coral",1,1,11,180],["slope-2x2","coral",1,3,11,180],["slope-2x2","coral",3,1,11,0],["slope-2x2","coral",3,3,11,0],["special-door","ivory",1,4,1,90],["special-window","ivory",1,2,1,0]]',
  },
  lighthouse: {
    name: "Le phare des Brigos",
    requirements: [
      {
        modelId: "plate-4x4",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-2x2",
        colorId: "ivory",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-2x2",
        colorId: "coral",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "yellow",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x4",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-2x2",
        colorId: "coral",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","yellow",1,1,20,0],["brick-1x1","yellow",1,2,20,0],["brick-1x1","yellow",2,1,20,0],["brick-1x1","yellow",2,2,20,0],["plate-2x2","yellow",1,1,19,0],["plate-4x4","blue",0,0,0,0],["plate-4x4","charcoal",0,0,23,0],["round-2x2","coral",1,1,10,0],["round-2x2","coral",1,1,16,0],["round-2x2","coral",1,1,4,0],["round-2x2","ivory",1,1,1,0],["round-2x2","ivory",1,1,13,0],["round-2x2","ivory",1,1,7,0],["tile-2x2","coral",1,1,24,0]]',
  },
  robot: {
    name: "Brigobot",
    requirements: [
      {
        modelId: "brick-1x2",
        colorId: "ivory",
        quantity: 5,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "blue",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x6",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "orange",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "orange",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x2",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x2","charcoal",2,1,17,90],["brick-1x2","ivory",1,0,0,0],["brick-1x2","ivory",1,0,3,0],["brick-1x2","ivory",2,0,17,90],["brick-1x2","ivory",3,0,0,0],["brick-1x2","ivory",3,0,3,0],["brick-1x2","orange",0,0,14,0],["brick-1x2","orange",5,0,14,0],["brick-2x2","blue",2,0,10,0],["brick-2x2","blue",2,0,7,0],["brick-2x2","ivory",2,0,14,0],["plate-2x2","ivory",2,0,20,0],["plate-2x4","blue",1,0,6,90],["plate-2x6","blue",0,0,13,90],["round-1x1","orange",0,0,17,0],["round-1x1","orange",5,0,17,0]]',
  },
  bridge: {
    name: "Le petit pont",
    requirements: [
      {
        modelId: "plate-2x4",
        colorId: "blue",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "arch-1x4",
        colorId: "ivory",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x4",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x4",
        colorId: "ivory",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-2x4",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x4",
        colorId: "yellow",
        quantity: 2,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["arch-1x4","ivory",1,0,1,0],["arch-1x4","ivory",3,0,1,0],["brick-1x4","ivory",1,0,8,0],["brick-1x4","ivory",4,0,8,0],["plate-2x4","blue",0,0,0,0],["plate-2x4","blue",3,0,0,0],["plate-4x4","ivory",1,0,7,0],["tile-1x4","yellow",1,0,11,0],["tile-1x4","yellow",4,0,11,0],["tile-2x4","charcoal",2,0,8,0]]',
  },
  rocket: {
    name: "Objectif lune",
    requirements: [
      {
        modelId: "plate-4x4",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "coral",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "orange",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x4",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-1x2",
        colorId: "coral",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-2x2",
        colorId: "ivory",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-2x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","coral",0,0,1,0],["brick-1x1","coral",0,3,1,0],["brick-1x1","coral",3,0,1,0],["brick-1x1","coral",3,3,1,0],["brick-1x1","orange",1,1,1,0],["plate-4x4","blue",0,0,0,0],["plate-4x4","ivory",0,0,4,0],["round-2x2","ivory",1,1,11,0],["round-2x2","ivory",1,1,5,0],["round-2x2","ivory",1,1,8,0],["round-2x2","yellow",1,1,14,0],["slope-1x2","coral",0,1,5,0],["slope-1x2","coral",1,1,17,180],["slope-1x2","coral",2,1,17,0],["slope-1x2","coral",3,1,5,180]]',
  },
  castle: {
    name: "Le château des nuages",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "ivory",
        quantity: 17,
        label: "Ancien plan v3",
      },
      {
        modelId: "special-door",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "ivory",
        quantity: 21,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-1x1",
        colorId: "violet",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-1x4",
        colorId: "violet",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "violet",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "yellow",
        quantity: 4,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","ivory",0,0,1,0],["brick-1x1","ivory",0,0,11,0],["brick-1x1","ivory",0,0,4,0],["brick-1x1","ivory",0,0,7,0],["brick-1x1","ivory",0,3,11,0],["brick-1x1","ivory",0,5,11,0],["brick-1x1","ivory",2,0,11,0],["brick-1x1","ivory",3,5,11,0],["brick-1x1","ivory",4,0,1,0],["brick-1x1","ivory",4,0,4,0],["brick-1x1","ivory",4,0,7,0],["brick-1x1","ivory",5,0,1,0],["brick-1x1","ivory",5,0,11,0],["brick-1x1","ivory",5,0,4,0],["brick-1x1","ivory",5,0,7,0],["brick-1x1","ivory",5,2,11,0],["brick-1x1","ivory",5,5,11,0],["brick-1x1","violet",0,0,14,0],["brick-1x1","violet",0,5,14,0],["brick-1x1","violet",5,0,14,0],["brick-1x1","violet",5,5,14,0],["brick-1x2","ivory",0,1,1,0],["brick-1x2","ivory",0,1,4,0],["brick-1x2","ivory",0,1,7,0],["brick-1x2","ivory",0,3,1,0],["brick-1x2","ivory",0,3,4,0],["brick-1x2","ivory",0,3,7,0],["brick-1x2","ivory",0,5,1,90],["brick-1x2","ivory",0,5,4,90],["brick-1x2","ivory",0,5,7,90],["brick-1x2","ivory",2,5,1,90],["brick-1x2","ivory",2,5,4,90],["brick-1x2","ivory",2,5,7,90],["brick-1x2","ivory",4,5,1,90],["brick-1x2","ivory",4,5,4,90],["brick-1x2","ivory",4,5,7,90],["brick-1x2","ivory",5,1,1,0],["brick-1x2","ivory",5,1,4,0],["brick-1x2","ivory",5,1,7,0],["brick-1x2","ivory",5,3,1,0],["brick-1x2","ivory",5,3,4,0],["brick-1x2","ivory",5,3,7,0],["plate-1x1","violet",0,0,10,0],["plate-1x1","violet",0,5,10,0],["plate-1x1","violet",5,0,10,0],["plate-1x1","violet",5,5,10,0],["plate-1x4","violet",0,1,10,0],["plate-1x4","violet",1,0,10,90],["plate-1x4","violet",1,5,10,90],["plate-1x4","violet",5,1,10,0],["plate-6x6","mint",0,0,0,0],["round-1x1","yellow",0,0,17,0],["round-1x1","yellow",0,5,17,0],["round-1x1","yellow",5,0,17,0],["round-1x1","yellow",5,5,17,0],["special-door","charcoal",1,0,1,90]]',
  },
  dinosaur: {
    name: "Le Brigosaurus",
    requirements: [
      {
        modelId: "brick-1x2",
        colorId: "mint",
        quantity: 6,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        colorId: "mint",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "mint",
        quantity: 24,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-1x4",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-1x1",
        colorId: "yellow",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-1x3",
        colorId: "mint",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x3",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "charcoal",
        quantity: 2,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","mint",0,1,10,0],["brick-1x1","mint",0,1,13,0],["brick-1x1","mint",0,1,7,0],["brick-1x1","mint",0,2,10,0],["brick-1x1","mint",0,2,13,0],["brick-1x1","mint",0,2,7,0],["brick-1x1","mint",1,1,10,0],["brick-1x1","mint",1,1,13,0],["brick-1x1","mint",1,1,7,0],["brick-1x1","mint",1,2,10,0],["brick-1x1","mint",1,2,13,0],["brick-1x1","mint",1,2,7,0],["brick-1x1","mint",2,1,10,0],["brick-1x1","mint",2,1,13,0],["brick-1x1","mint",2,1,7,0],["brick-1x1","mint",2,2,10,0],["brick-1x1","mint",2,2,13,0],["brick-1x1","mint",2,2,7,0],["brick-1x1","mint",3,1,10,0],["brick-1x1","mint",3,1,13,0],["brick-1x1","mint",3,1,7,0],["brick-1x1","mint",3,2,10,0],["brick-1x1","mint",3,2,13,0],["brick-1x1","mint",3,2,7,0],["brick-1x2","mint",0,1,0,0],["brick-1x2","mint",0,1,3,0],["brick-1x2","mint",3,1,0,0],["brick-1x2","mint",3,1,17,0],["brick-1x2","mint",3,1,20,0],["brick-1x2","mint",3,1,3,0],["brick-2x3","mint",2,1,23,90],["plate-1x3","mint",-4,1,18,90],["plate-1x3","mint",-6,1,19,90],["plate-1x4","mint",-2,1,17,90],["plate-2x4","mint",0,1,16,90],["plate-2x4","mint",0,1,6,90],["slope-1x1","yellow",0,2,17,90],["slope-1x1","yellow",1,2,17,90],["slope-1x1","yellow",2,2,17,90],["tile-1x1","charcoal",4,1,26,0],["tile-1x1","charcoal",4,2,26,0],["tile-1x2","mint",-7,1,20,90]]',
  },
  cafe: {
    name: "Le café Soleil",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "orange",
        quantity: 21,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x4",
        colorId: "coral",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "orange",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x4",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-2x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x6",
        colorId: "yellow",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "coral",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x4",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","mint",3,4,1,0],["brick-1x1","orange",2,3,1,0],["brick-1x2","orange",0,0,1,90],["brick-1x2","orange",0,0,4,90],["brick-1x2","orange",0,0,7,90],["brick-1x2","orange",0,1,1,0],["brick-1x2","orange",0,1,4,0],["brick-1x2","orange",0,1,7,0],["brick-1x2","orange",0,3,1,0],["brick-1x2","orange",0,3,4,0],["brick-1x2","orange",0,3,7,0],["brick-1x2","orange",2,0,1,90],["brick-1x2","orange",2,0,4,90],["brick-1x2","orange",2,0,7,90],["brick-1x2","orange",4,0,1,90],["brick-1x2","orange",4,0,4,90],["brick-1x2","orange",4,0,7,90],["brick-1x2","orange",5,1,1,0],["brick-1x2","orange",5,1,4,0],["brick-1x2","orange",5,1,7,0],["brick-1x2","orange",5,3,1,0],["brick-1x2","orange",5,3,4,0],["brick-1x2","orange",5,3,7,0],["brick-1x4","coral",1,1,1,90],["brick-1x4","coral",1,5,11,90],["plate-2x6","yellow",0,0,10,90],["plate-2x6","yellow",0,2,10,90],["plate-2x6","yellow",0,4,10,90],["plate-6x6","ivory",0,0,0,0],["tile-1x1","mint",3,4,4,0],["tile-1x2","coral",0,4,11,90],["tile-1x2","coral",2,4,11,90],["tile-1x2","coral",4,4,11,90],["tile-1x4","charcoal",1,1,4,90],["tile-1x4","yellow",1,5,14,90],["tile-2x2","yellow",1,2,4,0]]',
  },
  spaceship: {
    name: "Le vaisseau d’exploration",
    requirements: [
      {
        modelId: "plate-4x6",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x4",
        colorId: "blue",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "blue",
        quantity: 6,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "blue",
        quantity: 16,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "yellow",
        quantity: 16,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "ivory",
        quantity: 12,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-1x2",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-1x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","blue",1,5,1,0],["brick-1x1","blue",1,5,4,0],["brick-1x1","blue",1,5,7,0],["brick-1x1","blue",2,5,1,0],["brick-1x1","blue",2,5,4,0],["brick-1x1","blue",2,5,7,0],["brick-1x1","ivory",1,2,2,0],["brick-1x1","ivory",1,2,5,0],["brick-1x1","ivory",1,3,2,0],["brick-1x1","ivory",1,3,5,0],["brick-1x1","ivory",1,4,2,0],["brick-1x1","ivory",1,4,5,0],["brick-1x1","ivory",2,2,2,0],["brick-1x1","ivory",2,2,5,0],["brick-1x1","ivory",2,3,2,0],["brick-1x1","ivory",2,3,5,0],["brick-1x1","ivory",2,4,2,0],["brick-1x1","ivory",2,4,5,0],["plate-1x2","blue",1,5,10,90],["plate-2x4","blue",1,1,1,0],["plate-2x4","ivory",1,1,8,0],["plate-4x4","blue",-3,1,1,0],["plate-4x4","blue",3,1,1,0],["plate-4x6","charcoal",0,0,0,0],["slope-1x2","yellow",1,5,11,90],["slope-2x2","blue",1,3,9,270],["slope-2x2","charcoal",1,1,9,90],["tile-1x1","blue",-1,1,2,0],["tile-1x1","blue",-1,4,2,0],["tile-1x1","blue",-2,1,2,0],["tile-1x1","blue",-2,4,2,0],["tile-1x1","blue",-3,1,2,0],["tile-1x1","blue",-3,4,2,0],["tile-1x1","blue",0,1,2,0],["tile-1x1","blue",0,4,2,0],["tile-1x1","blue",3,1,2,0],["tile-1x1","blue",3,4,2,0],["tile-1x1","blue",4,1,2,0],["tile-1x1","blue",4,4,2,0],["tile-1x1","blue",5,1,2,0],["tile-1x1","blue",5,4,2,0],["tile-1x1","blue",6,1,2,0],["tile-1x1","blue",6,4,2,0],["tile-1x1","yellow",-1,2,2,0],["tile-1x1","yellow",-1,3,2,0],["tile-1x1","yellow",-2,2,2,0],["tile-1x1","yellow",-2,3,2,0],["tile-1x1","yellow",-3,2,2,0],["tile-1x1","yellow",-3,3,2,0],["tile-1x1","yellow",0,2,2,0],["tile-1x1","yellow",0,3,2,0],["tile-1x1","yellow",3,2,2,0],["tile-1x1","yellow",3,3,2,0],["tile-1x1","yellow",4,2,2,0],["tile-1x1","yellow",4,3,2,0],["tile-1x1","yellow",5,2,2,0],["tile-1x1","yellow",5,3,2,0],["tile-1x1","yellow",6,2,2,0],["tile-1x1","yellow",6,3,2,0]]',
  },
  mosaic: {
    name: "Le cœur pixel",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "ivory",
        quantity: 16,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "coral",
        quantity: 20,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["plate-6x6","ivory",0,0,0,0],["tile-1x1","coral",0,1,1,0],["tile-1x1","coral",0,2,1,0],["tile-1x1","coral",1,0,1,0],["tile-1x1","coral",1,1,1,0],["tile-1x1","coral",1,2,1,0],["tile-1x1","coral",1,3,1,0],["tile-1x1","coral",2,1,1,0],["tile-1x1","coral",2,2,1,0],["tile-1x1","coral",2,3,1,0],["tile-1x1","coral",2,4,1,0],["tile-1x1","coral",3,1,1,0],["tile-1x1","coral",3,2,1,0],["tile-1x1","coral",3,3,1,0],["tile-1x1","coral",3,4,1,0],["tile-1x1","coral",4,0,1,0],["tile-1x1","coral",4,1,1,0],["tile-1x1","coral",4,2,1,0],["tile-1x1","coral",4,3,1,0],["tile-1x1","coral",5,1,1,0],["tile-1x1","coral",5,2,1,0],["tile-1x1","ivory",0,0,1,0],["tile-1x1","ivory",0,3,1,0],["tile-1x1","ivory",0,4,1,0],["tile-1x1","ivory",0,5,1,0],["tile-1x1","ivory",1,4,1,0],["tile-1x1","ivory",1,5,1,0],["tile-1x1","ivory",2,0,1,0],["tile-1x1","ivory",2,5,1,0],["tile-1x1","ivory",3,0,1,0],["tile-1x1","ivory",3,5,1,0],["tile-1x1","ivory",4,4,1,0],["tile-1x1","ivory",4,5,1,0],["tile-1x1","ivory",5,0,1,0],["tile-1x1","ivory",5,3,1,0],["tile-1x1","ivory",5,4,1,0],["tile-1x1","ivory",5,5,1,0]]',
  },
  mushroom: {
    name: "Le champignon des bois",
    requirements: [
      {
        modelId: "plate-4x4",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "ivory",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-6x6",
        colorId: "coral",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "coral",
        quantity: 8,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "coral",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "ivory",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "coral",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-2x2","coral",2,2,8,0],["brick-2x2","ivory",2,2,1,0],["brick-2x2","ivory",2,2,4,0],["plate-4x4","mint",1,1,0,0],["plate-6x6","coral",0,0,7,0],["slope-2x2","coral",0,0,8,180],["slope-2x2","coral",0,2,8,180],["slope-2x2","coral",0,4,8,180],["slope-2x2","coral",2,0,8,270],["slope-2x2","coral",2,4,8,90],["slope-2x2","coral",4,0,8,0],["slope-2x2","coral",4,2,8,0],["slope-2x2","coral",4,4,8,0],["tile-1x1","coral",3,3,11,0],["tile-1x1","ivory",2,2,11,0],["tile-1x1","ivory",2,3,11,0],["tile-1x1","ivory",3,2,11,0]]',
  },
  flower: {
    name: "La fleur du matin",
    requirements: [
      {
        modelId: "plate-4x4",
        colorId: "orange",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "orange",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "mint",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "special-cross",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "yellow",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "coral",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","mint",1,1,11,0],["brick-1x1","mint",1,1,5,0],["brick-1x1","mint",1,1,8,0],["brick-2x2","orange",1,1,1,0],["plate-4x4","orange",0,0,0,0],["plate-4x4","orange",0,0,4,0],["round-1x1","coral",1,1,15,0],["special-cross","yellow",0,0,14,0],["tile-1x1","yellow",0,1,15,0],["tile-1x1","yellow",1,0,15,0],["tile-1x1","yellow",1,2,15,0],["tile-1x1","yellow",2,1,15,0]]',
  },
  penguin: {
    name: "Le manchot voyageur",
    requirements: [
      {
        modelId: "plate-4x4",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "orange",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        colorId: "charcoal",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "charcoal",
        quantity: 10,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "ivory",
        quantity: 8,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x2",
        colorId: "orange",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "charcoal",
        quantity: 2,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","ivory",1,2,11,0],["brick-1x1","ivory",1,2,15,0],["brick-1x1","ivory",1,2,5,0],["brick-1x1","ivory",1,2,8,0],["brick-1x1","ivory",2,2,11,0],["brick-1x1","ivory",2,2,15,0],["brick-1x1","ivory",2,2,5,0],["brick-1x1","ivory",2,2,8,0],["brick-1x2","charcoal",0,1,11,0],["brick-1x2","charcoal",0,1,5,0],["brick-1x2","charcoal",0,1,8,0],["brick-1x2","charcoal",1,1,11,90],["brick-1x2","charcoal",1,1,15,90],["brick-1x2","charcoal",1,1,5,90],["brick-1x2","charcoal",1,1,8,90],["brick-1x2","charcoal",3,1,11,0],["brick-1x2","charcoal",3,1,5,0],["brick-1x2","charcoal",3,1,8,0],["brick-1x2","orange",0,1,1,0],["brick-1x2","orange",3,1,1,0],["plate-2x2","orange",1,2,18,0],["plate-2x4","charcoal",0,1,14,90],["plate-2x4","charcoal",0,1,4,90],["plate-4x4","blue",0,0,0,0],["tile-1x1","charcoal",1,2,19,0],["tile-1x1","charcoal",2,2,19,0],["tile-1x2","charcoal",1,1,18,90]]',
  },
  duck: {
    name: "Le canard Soleil",
    requirements: [
      {
        modelId: "plate-4x4",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x3",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "yellow",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-1x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x2",
        colorId: "orange",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-1x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "charcoal",
        quantity: 2,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-2x2","yellow",1,1,4,0],["brick-2x2","yellow",1,1,7,0],["brick-2x3","yellow",1,1,1,0],["plate-1x2","yellow",1,2,10,90],["plate-2x2","orange",1,0,10,0],["plate-4x4","blue",0,0,0,0],["slope-1x2","yellow",1,3,4,90],["tile-1x1","charcoal",1,2,11,0],["tile-1x1","charcoal",2,2,11,0],["tile-1x2","blue",0,0,1,0],["tile-1x2","ivory",3,2,1,0]]',
  },
  snail: {
    name: "L’escargot Iris",
    requirements: [
      {
        modelId: "plate-4x6",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x6",
        colorId: "orange",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "ivory",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-4x4",
        colorId: "violet",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "charcoal",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-2x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "coral",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","ivory",1,0,4,0],["brick-1x1","ivory",2,0,4,0],["brick-2x6","orange",1,0,1,0],["plate-4x6","mint",0,0,0,0],["round-1x1","coral",1,3,10,0],["round-2x2","yellow",1,3,7,0],["round-4x4","violet",0,2,4,0],["tile-1x1","charcoal",1,0,7,0],["tile-1x1","charcoal",2,0,7,0]]',
  },
  turtle: {
    name: "La tortue Menthe",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "mint",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x4",
        colorId: "violet",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "charcoal",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "violet",
        quantity: 4,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","mint",1,1,1,0],["brick-1x1","mint",1,4,1,0],["brick-1x1","mint",4,1,1,0],["brick-1x1","mint",4,4,1,0],["brick-1x2","mint",2,4,1,0],["brick-2x2","mint",2,0,1,0],["plate-4x4","violet",1,1,4,0],["plate-6x6","blue",0,0,0,0],["slope-2x2","violet",1,1,5,180],["slope-2x2","violet",1,3,5,180],["slope-2x2","violet",3,1,5,0],["slope-2x2","violet",3,3,5,0],["tile-1x1","charcoal",2,0,4,0],["tile-1x1","charcoal",3,0,4,0]]',
  },
  boat: {
    name: "Le bateau du canal",
    requirements: [
      {
        modelId: "brick-2x6",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x6",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "coral",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "ivory",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "yellow",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x2",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "orange",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x2","blue",1,2,7,90],["brick-1x2","ivory",0,2,4,0],["brick-1x2","ivory",1,3,7,90],["brick-1x2","ivory",3,2,4,0],["brick-2x2","ivory",1,2,4,0],["brick-2x6","blue",1,0,0,0],["plate-2x2","charcoal",1,2,10,0],["plate-4x6","blue",0,0,3,0],["round-1x1","orange",1,3,11,0],["slope-2x2","coral",0,0,4,180],["slope-2x2","coral",0,4,4,180],["slope-2x2","coral",2,0,4,0],["slope-2x2","coral",2,4,4,0],["tile-1x2","yellow",0,2,7,0],["tile-1x2","yellow",3,2,7,0]]',
  },
  airplane: {
    name: "L’avion des couleurs",
    requirements: [
      {
        modelId: "plate-2x8",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x3",
        colorId: "blue",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x6",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "yellow",
        quantity: 5,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-1x4",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "coral",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-2x2","ivory",0,3,2,0],["brick-2x3","blue",0,0,1,0],["brick-2x3","blue",0,5,1,0],["plate-1x4","blue",-1,7,4,90],["plate-2x6","blue",-2,3,1,90],["plate-2x8","charcoal",0,0,0,0],["slope-2x2","blue",0,0,4,270],["slope-2x2","charcoal",0,3,5,90],["tile-1x2","coral",0,6,4,90],["tile-1x2","yellow",-1,3,2,0],["tile-1x2","yellow",-2,3,2,0],["tile-1x2","yellow",0,7,5,90],["tile-1x2","yellow",2,3,2,0],["tile-1x2","yellow",3,3,2,0]]',
  },
  submarine: {
    name: "Le sous-marin Soleil",
    requirements: [
      {
        modelId: "plate-4x6",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-2x2",
        colorId: "yellow",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x4",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "blue",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-1x2",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","charcoal",1,2,7,0],["brick-1x2","yellow",1,2,4,0],["brick-2x4","yellow",1,1,1,0],["plate-1x2","charcoal",1,1,10,0],["plate-4x6","blue",0,0,0,0],["round-1x1","blue",2,1,4,0],["round-1x1","blue",2,3,4,0],["round-2x2","yellow",1,-1,1,0],["round-2x2","yellow",1,5,1,0],["tile-1x1","blue",1,1,11,0]]',
  },
  well: {
    name: "Le puits du village",
    requirements: [
      {
        modelId: "plate-4x4",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x4",
        colorId: "ivory",
        quantity: 6,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "ivory",
        quantity: 6,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "orange",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x4",
        colorId: "orange",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "coral",
        quantity: 4,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","orange",0,1,10,0],["brick-1x1","orange",0,1,13,0],["brick-1x1","orange",3,1,10,0],["brick-1x1","orange",3,1,13,0],["brick-1x2","ivory",0,1,1,0],["brick-1x2","ivory",0,1,4,0],["brick-1x2","ivory",0,1,7,0],["brick-1x2","ivory",3,1,1,0],["brick-1x2","ivory",3,1,4,0],["brick-1x2","ivory",3,1,7,0],["brick-1x4","ivory",0,0,1,90],["brick-1x4","ivory",0,0,4,90],["brick-1x4","ivory",0,0,7,90],["brick-1x4","ivory",0,3,1,90],["brick-1x4","ivory",0,3,4,90],["brick-1x4","ivory",0,3,7,90],["plate-4x4","mint",0,0,0,0],["plate-4x4","orange",0,0,16,0],["slope-2x2","coral",0,0,17,180],["slope-2x2","coral",0,2,17,180],["slope-2x2","coral",2,0,17,0],["slope-2x2","coral",2,2,17,0]]',
  },
  mailbox: {
    name: "La boîte aux trésors",
    requirements: [
      {
        modelId: "plate-2x4",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "charcoal",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        colorId: "coral",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x3",
        colorId: "coral",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-1x2",
        colorId: "coral",
        quantity: 2,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x2","charcoal",0,1,1,0],["brick-1x2","charcoal",0,1,4,0],["brick-1x2","charcoal",0,1,7,0],["brick-1x2","yellow",0,0,11,90],["brick-2x3","coral",0,1,11,0],["plate-2x4","coral",0,0,10,0],["plate-2x4","coral",0,0,14,0],["plate-2x4","mint",0,0,0,0],["slope-1x2","coral",0,1,15,180],["slope-1x2","coral",1,1,15,0],["tile-1x2","yellow",0,0,15,90]]',
  },
  hourglass: {
    name: "Le sablier doré",
    requirements: [
      {
        modelId: "plate-4x4",
        colorId: "blue",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "charcoal",
        quantity: 12,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-2x2",
        colorId: "yellow",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-2x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","charcoal",0,0,1,0],["brick-1x1","charcoal",0,0,4,0],["brick-1x1","charcoal",0,0,7,0],["brick-1x1","charcoal",0,3,1,0],["brick-1x1","charcoal",0,3,4,0],["brick-1x1","charcoal",0,3,7,0],["brick-1x1","charcoal",3,0,1,0],["brick-1x1","charcoal",3,0,4,0],["brick-1x1","charcoal",3,0,7,0],["brick-1x1","charcoal",3,3,1,0],["brick-1x1","charcoal",3,3,4,0],["brick-1x1","charcoal",3,3,7,0],["plate-4x4","blue",0,0,0,0],["plate-4x4","blue",0,0,10,0],["round-1x1","yellow",1,1,4,0],["round-2x2","yellow",1,1,1,0],["round-2x2","yellow",1,1,7,0],["tile-2x2","yellow",1,1,11,0]]',
  },
  arcade: {
    name: "La borne Pixel",
    requirements: [
      {
        modelId: "plate-4x4",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x4",
        colorId: "violet",
        quantity: 11,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-1x4",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "coral",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "violet",
        quantity: 8,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "blue",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x4",
        colorId: "violet",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "violet",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x4",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","blue",1,2,10,0],["brick-1x1","blue",1,2,13,0],["brick-1x1","blue",2,2,10,0],["brick-1x1","blue",2,2,13,0],["brick-1x1","violet",0,1,10,0],["brick-1x1","violet",0,1,13,0],["brick-1x1","violet",0,2,10,0],["brick-1x1","violet",0,2,13,0],["brick-1x1","violet",3,1,10,0],["brick-1x1","violet",3,1,13,0],["brick-1x1","violet",3,2,10,0],["brick-1x1","violet",3,2,13,0],["brick-1x4","violet",0,0,1,90],["brick-1x4","violet",0,0,10,90],["brick-1x4","violet",0,0,13,90],["brick-1x4","violet",0,0,4,90],["brick-1x4","violet",0,0,7,90],["brick-1x4","violet",0,1,1,90],["brick-1x4","violet",0,1,4,90],["brick-1x4","violet",0,1,7,90],["brick-1x4","violet",0,2,1,90],["brick-1x4","violet",0,2,4,90],["brick-1x4","violet",0,2,7,90],["plate-1x4","yellow",0,3,1,90],["plate-4x4","charcoal",0,0,0,0],["plate-4x4","violet",0,0,16,0],["round-1x1","coral",1,3,2,0],["slope-2x2","violet",0,0,17,90],["slope-2x2","violet",2,0,17,90],["tile-1x1","blue",2,3,2,0],["tile-1x4","yellow",0,3,17,90]]',
  },
  piano: {
    name: "Le piano de minuit",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x6",
        colorId: "charcoal",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x6",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x4",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "ivory",
        quantity: 9,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "ivory",
        quantity: 6,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "violet",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "charcoal",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x6",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "charcoal",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x2",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","ivory",0,1,5,0],["brick-1x1","ivory",1,1,5,0],["brick-1x1","ivory",2,1,5,0],["brick-1x1","ivory",3,1,5,0],["brick-1x1","ivory",4,1,5,0],["brick-1x1","ivory",5,1,5,0],["brick-1x2","violet",0,4,7,90],["brick-1x2","violet",2,4,7,90],["brick-1x2","violet",4,4,7,90],["brick-2x2","charcoal",4,4,4,0],["brick-2x4","charcoal",0,4,4,90],["brick-2x6","charcoal",0,0,1,0],["brick-2x6","charcoal",4,0,1,0],["plate-2x6","charcoal",0,4,10,90],["plate-4x6","charcoal",0,0,4,90],["plate-6x6","charcoal",0,0,0,0],["tile-1x1","charcoal",1,1,8,0],["tile-1x1","charcoal",3,1,8,0],["tile-1x1","charcoal",4,1,8,0],["tile-1x1","ivory",0,0,5,0],["tile-1x1","ivory",0,1,8,0],["tile-1x1","ivory",1,0,5,0],["tile-1x1","ivory",2,0,5,0],["tile-1x1","ivory",2,1,8,0],["tile-1x1","ivory",3,0,5,0],["tile-1x1","ivory",4,0,5,0],["tile-1x1","ivory",5,0,5,0],["tile-1x1","ivory",5,1,8,0],["tile-1x2","charcoal",0,5,11,90],["tile-1x2","charcoal",2,5,11,90],["tile-1x2","charcoal",4,5,11,90],["tile-1x2","ivory",2,4,11,90]]',
  },
  library: {
    name: "La bibliothèque arc-en-ciel",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x4",
        colorId: "orange",
        quantity: 6,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "coral",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "yellow",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "blue",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "violet",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x6",
        colorId: "orange",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        colorId: "orange",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x2","blue",1,2,9,0],["brick-1x2","blue",2,2,5,0],["brick-1x2","blue",3,2,1,0],["brick-1x2","coral",1,2,1,0],["brick-1x2","coral",3,2,9,0],["brick-1x2","coral",4,2,5,0],["brick-1x2","violet",2,2,9,0],["brick-1x2","violet",3,2,5,0],["brick-1x2","violet",4,2,1,0],["brick-1x2","yellow",1,2,5,0],["brick-1x2","yellow",2,2,1,0],["brick-1x2","yellow",4,2,9,0],["brick-1x4","orange",0,1,1,0],["brick-1x4","orange",0,1,5,0],["brick-1x4","orange",0,1,9,0],["brick-1x4","orange",5,1,1,0],["brick-1x4","orange",5,1,5,0],["brick-1x4","orange",5,1,9,0],["plate-2x4","orange",0,1,13,0],["plate-2x4","orange",2,1,13,0],["plate-2x4","orange",4,1,13,0],["plate-4x6","orange",0,1,12,90],["plate-4x6","orange",0,1,4,90],["plate-4x6","orange",0,1,8,90],["plate-6x6","ivory",0,0,0,0],["round-1x1","mint",1,1,14,0]]',
  },
  greenhouse: {
    name: "La serre des petites pousses",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "ivory",
        quantity: 8,
        label: "Ancien plan v3",
      },
      {
        modelId: "arch-1x4",
        colorId: "ivory",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "orange",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "mint",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-6x6",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x3",
        colorId: "blue",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x6",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x6",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x3",
        colorId: "blue",
        quantity: 4,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["arch-1x4","ivory",0,1,1,0],["arch-1x4","ivory",1,0,1,90],["arch-1x4","ivory",1,5,1,90],["arch-1x4","ivory",5,1,1,0],["brick-1x1","ivory",0,0,1,0],["brick-1x1","ivory",0,0,4,0],["brick-1x1","ivory",0,5,1,0],["brick-1x1","ivory",0,5,4,0],["brick-1x1","ivory",5,0,1,0],["brick-1x1","ivory",5,0,4,0],["brick-1x1","ivory",5,5,1,0],["brick-1x1","ivory",5,5,4,0],["brick-2x6","blue",2,0,8,0],["plate-2x6","ivory",2,0,11,0],["plate-6x6","ivory",0,0,7,0],["plate-6x6","mint",0,0,0,0],["round-1x1","mint",1,2,4,0],["round-1x1","mint",3,2,4,0],["round-1x1","mint",3,4,4,0],["round-1x1","orange",1,2,1,0],["round-1x1","orange",3,2,1,0],["round-1x1","orange",3,4,1,0],["slope-2x3","blue",0,0,8,180],["slope-2x3","blue",0,3,8,180],["slope-2x3","blue",4,0,8,0],["slope-2x3","blue",4,3,8,0],["tile-1x3","blue",2,0,12,0],["tile-1x3","blue",2,3,12,0],["tile-1x3","blue",3,0,12,0],["tile-1x3","blue",3,3,12,0]]',
  },
  pagoda: {
    name: "La pagode des lanternes",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "coral",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "ivory",
        quantity: 12,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-6x6",
        colorId: "charcoal",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "charcoal",
        quantity: 16,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        colorId: "coral",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x4",
        colorId: "coral",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "special-cross",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-2x2","coral",2,2,16,0],["brick-2x2","coral",2,2,8,0],["plate-4x4","coral",1,1,11,0],["plate-6x6","charcoal",0,0,15,0],["plate-6x6","charcoal",0,0,7,0],["plate-6x6","coral",0,0,0,0],["round-1x1","ivory",1,1,1,0],["round-1x1","ivory",1,1,12,0],["round-1x1","ivory",1,1,4,0],["round-1x1","ivory",1,4,1,0],["round-1x1","ivory",1,4,12,0],["round-1x1","ivory",1,4,4,0],["round-1x1","ivory",4,1,1,0],["round-1x1","ivory",4,1,12,0],["round-1x1","ivory",4,1,4,0],["round-1x1","ivory",4,4,1,0],["round-1x1","ivory",4,4,12,0],["round-1x1","ivory",4,4,4,0],["slope-2x2","charcoal",0,0,16,180],["slope-2x2","charcoal",0,0,8,180],["slope-2x2","charcoal",0,2,16,180],["slope-2x2","charcoal",0,2,8,180],["slope-2x2","charcoal",0,4,16,180],["slope-2x2","charcoal",0,4,8,180],["slope-2x2","charcoal",2,0,16,270],["slope-2x2","charcoal",2,0,8,270],["slope-2x2","charcoal",2,4,16,90],["slope-2x2","charcoal",2,4,8,90],["slope-2x2","charcoal",4,0,16,0],["slope-2x2","charcoal",4,0,8,0],["slope-2x2","charcoal",4,2,16,0],["slope-2x2","charcoal",4,2,8,0],["slope-2x2","charcoal",4,4,16,0],["slope-2x2","charcoal",4,4,8,0],["special-cross","yellow",1,1,19,0]]',
  },
  chalet: {
    name: "Le chalet enneigé",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "mint",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x4",
        colorId: "coral",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "coral",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-1x1",
        colorId: "ivory",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        colorId: "charcoal",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-1x1",
        colorId: "mint",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x4",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "ivory",
        quantity: 4,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x2","charcoal",2,4,1,90],["brick-1x2","charcoal",2,4,4,90],["brick-1x2","coral",2,1,1,90],["brick-1x2","coral",2,1,4,90],["brick-1x4","coral",1,1,1,0],["brick-1x4","coral",1,1,4,0],["brick-1x4","coral",4,1,1,0],["brick-1x4","coral",4,1,4,0],["plate-4x4","ivory",1,1,7,0],["plate-6x6","ivory",0,0,0,0],["round-1x1","mint",0,0,1,0],["round-1x1","mint",5,5,1,0],["slope-1x1","ivory",0,3,1,0],["slope-1x1","ivory",5,2,1,0],["slope-1x1","mint",0,0,4,0],["slope-1x1","mint",5,5,4,0],["slope-2x2","ivory",1,1,8,180],["slope-2x2","ivory",1,3,8,180],["slope-2x2","ivory",3,1,8,0],["slope-2x2","ivory",3,3,8,0]]',
  },
  spacegate: {
    name: "Le portail interstellaire",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "ivory",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "blue",
        quantity: 48,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "ivory",
        quantity: 8,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "yellow",
        quantity: 8,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "blue",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x6",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "ivory",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-2x2",
        colorId: "yellow",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","blue",0,2,1,0],["brick-1x1","blue",0,2,10,0],["brick-1x1","blue",0,2,13,0],["brick-1x1","blue",0,2,16,0],["brick-1x1","blue",0,2,20,0],["brick-1x1","blue",0,2,23,0],["brick-1x1","blue",0,2,4,0],["brick-1x1","blue",0,2,7,0],["brick-1x1","blue",0,3,1,0],["brick-1x1","blue",0,3,10,0],["brick-1x1","blue",0,3,13,0],["brick-1x1","blue",0,3,16,0],["brick-1x1","blue",0,3,20,0],["brick-1x1","blue",0,3,23,0],["brick-1x1","blue",0,3,4,0],["brick-1x1","blue",0,3,7,0],["brick-1x1","blue",1,2,20,0],["brick-1x1","blue",1,2,23,0],["brick-1x1","blue",1,3,20,0],["brick-1x1","blue",1,3,23,0],["brick-1x1","blue",2,2,20,0],["brick-1x1","blue",2,2,23,0],["brick-1x1","blue",2,3,20,0],["brick-1x1","blue",2,3,23,0],["brick-1x1","blue",3,2,20,0],["brick-1x1","blue",3,2,23,0],["brick-1x1","blue",3,3,20,0],["brick-1x1","blue",3,3,23,0],["brick-1x1","blue",4,2,20,0],["brick-1x1","blue",4,2,23,0],["brick-1x1","blue",4,3,20,0],["brick-1x1","blue",4,3,23,0],["brick-1x1","blue",5,2,1,0],["brick-1x1","blue",5,2,10,0],["brick-1x1","blue",5,2,13,0],["brick-1x1","blue",5,2,16,0],["brick-1x1","blue",5,2,20,0],["brick-1x1","blue",5,2,23,0],["brick-1x1","blue",5,2,4,0],["brick-1x1","blue",5,2,7,0],["brick-1x1","blue",5,3,1,0],["brick-1x1","blue",5,3,10,0],["brick-1x1","blue",5,3,13,0],["brick-1x1","blue",5,3,16,0],["brick-1x1","blue",5,3,20,0],["brick-1x1","blue",5,3,23,0],["brick-1x1","blue",5,3,4,0],["brick-1x1","blue",5,3,7,0],["brick-1x1","ivory",1,0,1,0],["brick-1x1","ivory",4,0,1,0],["plate-2x2","yellow",2,2,26,0],["plate-2x6","ivory",0,2,19,90],["plate-6x6","charcoal",0,0,0,0],["round-2x2","yellow",2,2,27,0],["slope-2x2","ivory",0,2,26,180],["slope-2x2","ivory",4,2,26,0],["tile-1x1","blue",1,0,4,0],["tile-1x1","blue",4,0,4,0],["tile-1x1","ivory",1,1,1,0],["tile-1x1","ivory",1,3,1,0],["tile-1x1","ivory",2,2,1,0],["tile-1x1","ivory",2,4,1,0],["tile-1x1","ivory",3,1,1,0],["tile-1x1","ivory",3,3,1,0],["tile-1x1","ivory",4,2,1,0],["tile-1x1","ivory",4,4,1,0],["tile-1x1","yellow",1,2,1,0],["tile-1x1","yellow",1,4,1,0],["tile-1x1","yellow",2,1,1,0],["tile-1x1","yellow",2,3,1,0],["tile-1x1","yellow",3,2,1,0],["tile-1x1","yellow",3,4,1,0],["tile-1x1","yellow",4,1,1,0],["tile-1x1","yellow",4,3,1,0]]',
  },
  windmill: {
    name: "Le moulin à quatre pales",
    requirements: [
      {
        modelId: "plate-6x6",
        colorId: "mint",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "ivory",
        quantity: 30,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "charcoal",
        quantity: 3,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "coral",
        quantity: 22,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x1",
        colorId: "blue",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-4x4",
        colorId: "charcoal",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-2x2",
        colorId: "coral",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "slope-1x2",
        colorId: "coral",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "charcoal",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x8",
        colorId: "ivory",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        colorId: "ivory",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "round-1x1",
        colorId: "orange",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1","blue",2,4,10,0],["brick-1x1","charcoal",2,4,1,0],["brick-1x1","charcoal",2,4,4,0],["brick-1x1","charcoal",2,4,7,0],["brick-1x1","coral",1,1,10,0],["brick-1x1","coral",1,1,4,0],["brick-1x1","coral",1,2,10,0],["brick-1x1","coral",1,2,4,0],["brick-1x1","coral",1,3,10,0],["brick-1x1","coral",1,3,4,0],["brick-1x1","coral",1,4,10,0],["brick-1x1","coral",1,4,4,0],["brick-1x1","coral",2,1,10,0],["brick-1x1","coral",2,1,4,0],["brick-1x1","coral",3,1,10,0],["brick-1x1","coral",3,1,4,0],["brick-1x1","coral",3,4,10,0],["brick-1x1","coral",3,4,4,0],["brick-1x1","coral",4,1,10,0],["brick-1x1","coral",4,1,4,0],["brick-1x1","coral",4,2,10,0],["brick-1x1","coral",4,2,4,0],["brick-1x1","coral",4,3,10,0],["brick-1x1","coral",4,3,4,0],["brick-1x1","coral",4,4,10,0],["brick-1x1","coral",4,4,4,0],["brick-1x1","ivory",-1,4,21,0],["brick-1x1","ivory",0,4,21,0],["brick-1x1","ivory",1,1,1,0],["brick-1x1","ivory",1,1,7,0],["brick-1x1","ivory",1,2,1,0],["brick-1x1","ivory",1,2,7,0],["brick-1x1","ivory",1,3,1,0],["brick-1x1","ivory",1,3,7,0],["brick-1x1","ivory",1,4,1,0],["brick-1x1","ivory",1,4,7,0],["brick-1x1","ivory",2,1,1,0],["brick-1x1","ivory",2,1,7,0],["brick-1x1","ivory",2,4,14,0],["brick-1x1","ivory",2,4,17,0],["brick-1x1","ivory",2,4,24,0],["brick-1x1","ivory",2,4,27,0],["brick-1x1","ivory",3,1,1,0],["brick-1x1","ivory",3,1,7,0],["brick-1x1","ivory",3,4,1,0],["brick-1x1","ivory",3,4,7,0],["brick-1x1","ivory",4,1,1,0],["brick-1x1","ivory",4,1,7,0],["brick-1x1","ivory",4,2,1,0],["brick-1x1","ivory",4,2,7,0],["brick-1x1","ivory",4,3,1,0],["brick-1x1","ivory",4,3,7,0],["brick-1x1","ivory",4,4,1,0],["brick-1x1","ivory",4,4,7,0],["brick-1x1","ivory",5,4,21,0],["brick-1x1","ivory",6,4,21,0],["plate-2x8","ivory",-1,4,20,90],["plate-4x4","charcoal",1,1,13,0],["plate-6x6","mint",0,0,0,0],["round-1x1","orange",2,4,21,0],["slope-1x2","coral",1,3,14,180],["slope-1x2","coral",4,3,14,0],["slope-2x2","coral",1,1,14,180],["slope-2x2","coral",3,1,14,0],["tile-1x1","charcoal",3,3,14,0],["tile-1x1","charcoal",3,4,14,0],["tile-1x1","ivory",1,4,21,0],["tile-1x1","ivory",2,4,30,0],["tile-1x1","ivory",3,4,21,0],["tile-1x1","ivory",4,4,21,0]]',
  },
  armchair: {
    name: "Le fauteuil cosy",
    requirements: [
      {
        modelId: "brick-1x1",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x3",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        quantity: 2,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1",null,0,0,0,0],["brick-1x1",null,0,2,0,0],["brick-1x1",null,1,0,0,0],["brick-1x1",null,1,2,0,0],["brick-1x2",null,0,0,4,90],["brick-1x2",null,0,0,7,90],["plate-2x3",null,0,0,3,0],["tile-1x1",null,0,2,4,0]]',
  },
  pyramid: {
    name: "La mini-pyramide",
    requirements: [
      {
        modelId: "brick-2x4",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-2x2",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-1x2",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "tile-1x1",
        quantity: 1,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x2",null,0,1,7,90],["brick-2x2",null,0,1,4,0],["brick-2x4",null,0,0,0,0],["plate-1x2",null,0,1,10,90],["plate-2x4",null,0,0,3,0],["tile-1x1",null,0,1,11,0]]',
  },
  "starter-bridge": {
    name: "Le pont des débutants",
    requirements: [
      {
        modelId: "brick-1x1",
        quantity: 4,
        label: "Ancien plan v3",
      },
      {
        modelId: "plate-2x4",
        quantity: 1,
        label: "Ancien plan v3",
      },
      {
        modelId: "brick-1x2",
        quantity: 2,
        label: "Ancien plan v3",
      },
    ],
    geometry:
      '[["brick-1x1",null,0,0,0,0],["brick-1x1",null,0,1,0,0],["brick-1x1",null,3,0,0,0],["brick-1x1",null,3,1,0,0],["brick-1x2",null,0,0,4,0],["brick-1x2",null,3,0,4,0],["plate-2x4",null,0,0,3,90]]',
  },
} as const satisfies Record<string, RecipeSnapshot>;
