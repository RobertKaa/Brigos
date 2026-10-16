import type { Requirement } from "./catalog";

export interface V4RecipeSnapshot {
  readonly name: string;
  readonly requirements: readonly Readonly<Requirement>[];
  readonly geometry: string;
}

// Frozen published v4 / planRevision 1 materials and geometry.
// Never regenerate this snapshot from revised live recipes. Keys and
// instruction order are excluded because they do not change an assembly.
export const V4_RECIPE_SNAPSHOTS = {
  totem: {
    name: "Le petit totem",
    requirements: [
      {
        modelId: "brick-2x2",
        quantity: 5,
        label: "Ancien plan v4",
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
        quantity: 6,
        colorId: "orange",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x4",
        quantity: 1,
        colorId: "mint",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x4",
        quantity: 1,
        colorId: "mint",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 1,
        colorId: "mint",
        label: "Ancien plan v4",
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
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-2x2",
        quantity: 3,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "cone-6x6",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "cone-4x4",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "cone-2x2",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["cone-2x2","green",2,2,22,0],["cone-4x4","green",1,1,16,0],["cone-6x6","green",0,0,10,0],["plate-4x4","ivory",1,1,0,0],["round-2x2","brown",2,2,1,0],["round-2x2","brown",2,2,4,0],["round-2x2","brown",2,2,7,0]]',
  },
  house: {
    name: "La maison corail",
    requirements: [
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x3",
        quantity: 3,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "special-window",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 7,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "special-door",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x2",
        quantity: 4,
        colorId: "coral",
        label: "Ancien plan v4",
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
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-2x2",
        quantity: 3,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-2x2",
        quantity: 3,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 12,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-2x2",
        quantity: 3,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-2x2",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","charcoal",0,0,20,0],["brick-1x1","charcoal",0,0,23,0],["brick-1x1","charcoal",0,0,26,0],["brick-1x1","charcoal",0,3,20,0],["brick-1x1","charcoal",0,3,23,0],["brick-1x1","charcoal",0,3,26,0],["brick-1x1","charcoal",3,0,20,0],["brick-1x1","charcoal",3,0,23,0],["brick-1x1","charcoal",3,0,26,0],["brick-1x1","charcoal",3,3,20,0],["brick-1x1","charcoal",3,3,23,0],["brick-1x1","charcoal",3,3,26,0],["plate-4x4","blue",0,0,0,0],["plate-4x4","charcoal",0,0,29,0],["plate-4x4","ivory",0,0,19,0],["round-2x2","coral",1,1,10,0],["round-2x2","coral",1,1,16,0],["round-2x2","coral",1,1,4,0],["round-2x2","ivory",1,1,1,0],["round-2x2","ivory",1,1,13,0],["round-2x2","ivory",1,1,7,0],["round-2x2","yellow",1,1,20,0],["round-2x2","yellow",1,1,23,0],["round-2x2","yellow",1,1,26,0],["tile-2x2","coral",1,1,30,0]]',
  },
  robot: {
    name: "Brigobot",
    requirements: [
      {
        modelId: "brick-1x2",
        quantity: 5,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x4",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x2",
        quantity: 2,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x6",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 2,
        colorId: "orange",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x2",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 2,
        colorId: "orange",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x2",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
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
        quantity: 2,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "arch-1x4",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-2x4",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x4",
        quantity: 2,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["arch-1x4","ivory",1,0,1,0],["arch-1x4","ivory",3,0,1,0],["brick-1x4","ivory",1,0,8,0],["brick-1x4","ivory",4,0,8,0],["plate-2x4","blue",0,0,0,0],["plate-2x4","blue",3,0,0,0],["plate-4x4","ivory",1,0,7,0],["tile-1x4","yellow",1,0,11,0],["tile-1x4","yellow",4,0,11,0],["tile-2x4","charcoal",2,0,8,0]]',
  },
  castle: {
    name: "Le château des nuages",
    requirements: [
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "mint",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 21,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 17,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "special-door",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x1",
        quantity: 4,
        colorId: "violet",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x4",
        quantity: 4,
        colorId: "violet",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 4,
        colorId: "violet",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 4,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","ivory",0,0,11,0],["brick-1x1","ivory",0,3,11,0],["brick-1x1","ivory",0,5,1,0],["brick-1x1","ivory",0,5,11,0],["brick-1x1","ivory",0,5,4,0],["brick-1x1","ivory",0,5,7,0],["brick-1x1","ivory",2,0,11,0],["brick-1x1","ivory",3,5,11,0],["brick-1x1","ivory",4,5,1,0],["brick-1x1","ivory",4,5,4,0],["brick-1x1","ivory",4,5,7,0],["brick-1x1","ivory",5,0,11,0],["brick-1x1","ivory",5,2,11,0],["brick-1x1","ivory",5,5,1,0],["brick-1x1","ivory",5,5,11,0],["brick-1x1","ivory",5,5,4,0],["brick-1x1","ivory",5,5,7,0],["brick-1x1","violet",0,0,14,0],["brick-1x1","violet",0,5,14,0],["brick-1x1","violet",5,0,14,0],["brick-1x1","violet",5,5,14,0],["brick-1x2","ivory",0,0,1,90],["brick-1x2","ivory",0,0,4,90],["brick-1x2","ivory",0,0,7,90],["brick-1x2","ivory",0,1,1,0],["brick-1x2","ivory",0,1,4,0],["brick-1x2","ivory",0,1,7,0],["brick-1x2","ivory",0,3,1,0],["brick-1x2","ivory",0,3,4,0],["brick-1x2","ivory",0,3,7,0],["brick-1x2","ivory",2,0,1,90],["brick-1x2","ivory",2,0,4,90],["brick-1x2","ivory",2,0,7,90],["brick-1x2","ivory",4,0,1,90],["brick-1x2","ivory",4,0,4,90],["brick-1x2","ivory",4,0,7,90],["brick-1x2","ivory",5,1,1,0],["brick-1x2","ivory",5,1,4,0],["brick-1x2","ivory",5,1,7,0],["brick-1x2","ivory",5,3,1,0],["brick-1x2","ivory",5,3,4,0],["brick-1x2","ivory",5,3,7,0],["plate-1x1","violet",0,0,10,0],["plate-1x1","violet",0,5,10,0],["plate-1x1","violet",5,0,10,0],["plate-1x1","violet",5,5,10,0],["plate-1x4","violet",0,1,10,0],["plate-1x4","violet",1,0,10,90],["plate-1x4","violet",1,5,10,90],["plate-1x4","violet",5,1,10,0],["plate-6x6","mint",0,0,0,0],["round-1x1","yellow",0,0,17,0],["round-1x1","yellow",0,5,17,0],["round-1x1","yellow",5,0,17,0],["round-1x1","yellow",5,5,17,0],["special-door","charcoal",1,5,1,90]]',
  },
  dinosaur: {
    name: "Le Brigosaurus",
    requirements: [
      {
        modelId: "brick-1x2",
        quantity: 6,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x4",
        quantity: 2,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x3",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 23,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x2",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x1",
        quantity: 2,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x1",
        quantity: 3,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x3",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","green",0,1,11,0],["brick-1x1","green",0,1,8,0],["brick-1x1","green",0,2,10,0],["brick-1x1","green",0,2,13,0],["brick-1x1","green",0,2,7,0],["brick-1x1","green",1,1,10,0],["brick-1x1","green",1,1,13,0],["brick-1x1","green",1,1,7,0],["brick-1x1","green",1,2,10,0],["brick-1x1","green",1,2,13,0],["brick-1x1","green",1,2,7,0],["brick-1x1","green",2,1,10,0],["brick-1x1","green",2,1,13,0],["brick-1x1","green",2,1,7,0],["brick-1x1","green",2,2,10,0],["brick-1x1","green",2,2,13,0],["brick-1x1","green",2,2,7,0],["brick-1x1","green",3,1,10,0],["brick-1x1","green",3,1,13,0],["brick-1x1","green",3,1,7,0],["brick-1x1","green",3,2,10,0],["brick-1x1","green",3,2,13,0],["brick-1x1","green",3,2,7,0],["brick-1x2","green",0,1,0,0],["brick-1x2","green",0,1,3,0],["brick-1x2","green",3,1,0,0],["brick-1x2","green",3,1,17,0],["brick-1x2","green",3,1,20,0],["brick-1x2","green",3,1,3,0],["brick-2x3","green",2,1,23,90],["plate-1x1","green",0,1,14,0],["plate-1x1","green",0,1,15,0],["plate-1x3","green",-2,1,7,90],["plate-2x4","green",0,1,16,90],["plate-2x4","green",0,1,6,90],["slope-1x1","yellow",0,2,17,90],["slope-1x1","yellow",1,2,17,90],["slope-1x1","yellow",2,2,17,90],["slope-1x2","green",-2,1,8,180],["tile-1x1","charcoal",4,1,26,0],["tile-1x1","charcoal",4,2,26,0]]',
  },
  cafe: {
    name: "Le café Soleil",
    requirements: [
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x6",
        quantity: 3,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 7,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x4",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-2x2",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x2",
        quantity: 4,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x6",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x2",
        quantity: 3,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","brown",0,1,1,0],["brick-1x1","brown",0,1,4,0],["brick-1x1","brown",0,1,7,0],["brick-1x1","brown",1,4,1,0],["brick-1x1","brown",5,1,1,0],["brick-1x1","brown",5,1,4,0],["brick-1x1","brown",5,1,7,0],["brick-1x4","coral",1,2,1,90],["brick-1x6","brown",0,0,1,90],["brick-1x6","brown",0,0,4,90],["brick-1x6","brown",0,0,7,90],["plate-1x4","brown",1,2,4,90],["plate-2x6","ivory",0,0,10,90],["plate-6x6","ivory",0,0,0,0],["round-1x1","green",3,4,1,0],["round-1x1","ivory",2,2,5,0],["tile-1x1","charcoal",1,2,5,0],["tile-1x2","coral",0,0,11,0],["tile-1x2","coral",2,0,11,0],["tile-1x2","coral",3,2,5,90],["tile-1x2","coral",4,0,11,0],["tile-1x2","yellow",1,0,11,0],["tile-1x2","yellow",3,0,11,0],["tile-1x2","yellow",5,0,11,0],["tile-2x2","yellow",0,3,4,0]]',
  },
  spaceship: {
    name: "Le vaisseau d’exploration",
    requirements: [
      {
        modelId: "plate-4x6",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x4",
        quantity: 2,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x4",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 3,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-2x4",
        quantity: 2,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-2x4",
        quantity: 2,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x3",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x4",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x2",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x2",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x2",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x2",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x2","blue",1,5,1,90],["brick-1x2","blue",1,5,4,90],["brick-1x2","blue",1,5,7,90],["brick-2x3","ivory",1,2,2,0],["brick-2x3","ivory",1,2,5,0],["plate-1x2","blue",1,5,10,90],["plate-2x4","blue",1,1,1,0],["plate-2x4","ivory",1,1,8,0],["plate-4x4","blue",-3,1,1,0],["plate-4x4","blue",3,1,1,0],["plate-4x6","charcoal",0,0,0,0],["slope-1x2","yellow",1,5,11,90],["slope-2x2","blue",1,3,9,270],["slope-2x2","charcoal",1,1,9,90],["tile-2x4","blue",-1,1,2,0],["tile-2x4","blue",3,1,2,0],["tile-2x4","yellow",-3,1,2,0],["tile-2x4","yellow",5,1,2,0]]',
  },
  mosaic: {
    name: "Le cœur pixel",
    requirements: [
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 16,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 20,
        colorId: "coral",
        label: "Ancien plan v4",
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
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-2x2",
        quantity: 4,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x2",
        quantity: 8,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x2",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 3,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-2x2","coral",2,2,14,0],["plate-4x4","green",1,1,0,0],["plate-6x6","coral",0,0,13,0],["round-2x2","ivory",2,2,1,0],["round-2x2","ivory",2,2,10,0],["round-2x2","ivory",2,2,4,0],["round-2x2","ivory",2,2,7,0],["slope-2x2","coral",0,0,14,180],["slope-2x2","coral",0,2,14,180],["slope-2x2","coral",0,4,14,180],["slope-2x2","coral",2,0,14,270],["slope-2x2","coral",2,4,14,90],["slope-2x2","coral",4,0,14,0],["slope-2x2","coral",4,2,14,0],["slope-2x2","coral",4,4,14,0],["tile-1x1","coral",3,3,17,0],["tile-1x1","ivory",2,2,17,0],["tile-1x1","ivory",2,3,17,0],["tile-1x1","ivory",3,2,17,0]]',
  },
  flower: {
    name: "La fleur du matin",
    requirements: [
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-2x2",
        quantity: 2,
        colorId: "orange",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x2",
        quantity: 1,
        colorId: "orange",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 3,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "special-cross",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 4,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","green",1,1,11,0],["brick-1x1","green",1,1,14,0],["brick-1x1","green",1,1,8,0],["plate-2x2","orange",1,1,7,0],["plate-4x4","brown",0,0,0,0],["round-1x1","coral",1,1,18,0],["round-2x2","orange",1,1,1,0],["round-2x2","orange",1,1,4,0],["special-cross","yellow",0,0,17,0],["tile-1x1","yellow",0,1,18,0],["tile-1x1","yellow",1,0,18,0],["tile-1x1","yellow",1,2,18,0],["tile-1x1","yellow",2,1,18,0]]',
  },
  penguin: {
    name: "Le manchot voyageur",
    requirements: [
      {
        modelId: "plate-4x6",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 2,
        colorId: "orange",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x4",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 4,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x3",
        quantity: 3,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x3",
        quantity: 3,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x3",
        quantity: 4,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x1",
        quantity: 3,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x2",
        quantity: 1,
        colorId: "orange",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x1",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x3",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x2","charcoal",0,1,5,0],["brick-1x2","charcoal",0,1,8,0],["brick-1x2","charcoal",4,1,5,0],["brick-1x2","charcoal",4,1,8,0],["brick-1x2","orange",0,1,1,0],["brick-1x2","orange",4,1,1,0],["brick-1x3","charcoal",1,1,12,90],["brick-1x3","charcoal",1,1,5,90],["brick-1x3","charcoal",1,1,8,90],["brick-1x3","ivory",1,2,12,90],["brick-1x3","ivory",1,2,5,90],["brick-1x3","ivory",1,2,8,90],["plate-1x1","charcoal",1,2,16,0],["plate-1x1","charcoal",3,2,16,0],["plate-1x1","ivory",1,2,15,0],["plate-1x1","ivory",2,2,16,0],["plate-1x1","ivory",3,2,15,0],["plate-1x2","orange",2,2,15,0],["plate-1x3","charcoal",1,1,11,90],["plate-1x3","charcoal",1,1,15,90],["plate-1x3","charcoal",1,1,16,90],["plate-1x3","charcoal",1,2,11,90],["plate-1x4","charcoal",0,1,4,90],["plate-1x4","charcoal",1,2,4,90],["plate-2x3","charcoal",1,1,17,90],["plate-4x6","blue",0,0,0,90]]',
  },
  duck: {
    name: "Le canard Soleil",
    requirements: [
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x3",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x2",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x3",
        quantity: 2,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x3",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x3",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x1",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x2",
        quantity: 1,
        colorId: "orange",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x3",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x3","yellow",1,0,1,90],["brick-2x3","yellow",1,1,1,90],["brick-2x3","yellow",1,1,4,90],["plate-1x1","charcoal",1,2,7,0],["plate-1x1","charcoal",3,2,7,0],["plate-1x2","orange",2,2,7,0],["plate-1x3","yellow",1,1,7,90],["plate-2x3","yellow",1,1,8,90],["plate-4x4","blue",0,0,0,0],["slope-1x3","yellow",1,0,4,270],["tile-1x1","ivory",0,3,1,0],["tile-1x2","blue",0,1,1,0]]',
  },
  turtle: {
    name: "La tortue des jardins",
    requirements: [
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 4,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x2",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x2",
        quantity: 4,
        colorId: "brown",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","green",1,1,1,0],["brick-1x1","green",1,4,1,0],["brick-1x1","green",4,1,1,0],["brick-1x1","green",4,4,1,0],["brick-1x2","green",2,4,1,0],["brick-2x2","green",2,0,1,0],["plate-4x4","brown",1,1,4,0],["plate-6x6","blue",0,0,0,0],["slope-2x2","brown",1,1,5,180],["slope-2x2","brown",1,3,5,180],["slope-2x2","brown",3,1,5,0],["slope-2x2","brown",3,3,5,0],["tile-1x1","charcoal",2,0,4,0],["tile-1x1","charcoal",3,0,4,0]]',
  },
  boat: {
    name: "Le bateau du canal",
    requirements: [
      {
        modelId: "brick-2x6",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x6",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x2",
        quantity: 4,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 3,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x2",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x2",
        quantity: 2,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x2",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 1,
        colorId: "orange",
        label: "Ancien plan v4",
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
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x3",
        quantity: 2,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x6",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x2",
        quantity: 4,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x2",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x2",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x4",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x2",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x2",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 2,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x1",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","coral",0,7,5,0],["brick-1x1","coral",0,7,8,0],["brick-2x2","ivory",0,3,2,0],["brick-2x3","blue",0,0,1,0],["brick-2x3","blue",0,5,1,0],["plate-1x4","blue",-1,7,4,90],["plate-2x6","blue",-2,3,1,90],["plate-2x8","charcoal",0,0,0,0],["slope-1x1","coral",0,7,11,270],["slope-2x2","blue",0,0,4,270],["slope-2x2","charcoal",0,3,5,90],["tile-1x2","coral",0,6,4,90],["tile-1x2","yellow",-1,3,2,0],["tile-1x2","yellow",-2,3,2,0],["tile-1x2","yellow",2,3,2,0],["tile-1x2","yellow",3,3,2,0]]',
  },
  well: {
    name: "Le puits du village",
    requirements: [
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 4,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 4,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-2x2",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 4,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x4",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","brown",0,0,10,0],["brick-1x1","brown",0,0,7,0],["brick-1x1","brown",3,0,10,0],["brick-1x1","brown",3,0,7,0],["brick-1x2","ivory",0,1,1,0],["brick-1x2","ivory",0,1,4,0],["brick-1x2","ivory",3,1,1,0],["brick-1x2","ivory",3,1,4,0],["brick-1x4","brown",0,0,13,90],["brick-1x4","ivory",0,0,1,90],["brick-1x4","ivory",0,0,4,90],["brick-1x4","ivory",0,3,1,90],["brick-1x4","ivory",0,3,4,90],["plate-4x4","green",0,0,0,0],["tile-1x4","brown",0,0,16,90],["tile-2x2","blue",1,1,1,0]]',
  },
  mailbox: {
    name: "La boîte aux lettres",
    requirements: [
      {
        modelId: "plate-2x4",
        quantity: 1,
        colorId: "mint",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 3,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x4",
        quantity: 2,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x3",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x2",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x2",
        quantity: 2,
        colorId: "coral",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x2","charcoal",0,1,1,0],["brick-1x2","charcoal",0,1,4,0],["brick-1x2","charcoal",0,1,7,0],["brick-1x2","yellow",0,0,11,90],["brick-2x3","coral",0,1,11,0],["plate-2x4","coral",0,0,10,0],["plate-2x4","coral",0,0,14,0],["plate-2x4","mint",0,0,0,0],["slope-1x2","coral",0,1,15,180],["slope-1x2","coral",1,1,15,0],["tile-1x2","yellow",0,0,15,90]]',
  },
  hourglass: {
    name: "Le sablier doré",
    requirements: [
      {
        modelId: "plate-2x3",
        quantity: 2,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x2",
        quantity: 2,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 8,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x3",
        quantity: 2,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x2",
        quantity: 2,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 2,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x3",
        quantity: 2,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x2","brown",0,0,1,0],["brick-1x2","brown",0,0,10,0],["brick-1x2","brown",0,0,4,0],["brick-1x2","brown",0,0,7,0],["brick-1x2","brown",4,0,1,0],["brick-1x2","brown",4,0,10,0],["brick-1x2","brown",4,0,4,0],["brick-1x2","brown",4,0,7,0],["brick-1x2","yellow",2,0,2,0],["brick-1x2","yellow",2,0,5,0],["brick-1x3","yellow",1,0,9,90],["brick-1x3","yellow",1,1,9,90],["plate-2x2","blue",3,0,0,0],["plate-2x2","blue",3,0,13,0],["plate-2x3","blue",0,0,0,90],["plate-2x3","blue",0,0,13,90],["plate-2x3","yellow",1,0,1,90],["plate-2x3","yellow",1,0,8,90],["slope-1x2","yellow",1,0,2,180],["slope-1x2","yellow",3,0,2,0]]',
  },
  arcade: {
    name: "La borne Pixel",
    requirements: [
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 14,
        colorId: "violet",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 4,
        colorId: "violet",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x4",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 4,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x4",
        quantity: 1,
        colorId: "violet",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x2",
        quantity: 2,
        colorId: "violet",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x4",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","blue",1,1,10,0],["brick-1x1","blue",1,1,13,0],["brick-1x1","blue",2,1,10,0],["brick-1x1","blue",2,1,13,0],["brick-1x1","violet",0,1,10,0],["brick-1x1","violet",0,1,13,0],["brick-1x1","violet",3,1,10,0],["brick-1x1","violet",3,1,13,0],["brick-1x4","violet",0,0,1,90],["brick-1x4","violet",0,0,10,90],["brick-1x4","violet",0,0,13,90],["brick-1x4","violet",0,0,4,90],["brick-1x4","violet",0,0,7,90],["brick-1x4","violet",0,1,1,90],["brick-1x4","violet",0,1,4,90],["brick-1x4","violet",0,1,7,90],["brick-1x4","violet",0,2,1,90],["brick-1x4","violet",0,2,4,90],["brick-1x4","violet",0,2,7,90],["brick-1x4","violet",0,3,1,90],["brick-1x4","violet",0,3,4,90],["brick-1x4","violet",0,3,7,90],["plate-2x4","violet",0,0,16,90],["plate-2x4","yellow",0,2,10,90],["plate-4x4","charcoal",0,0,0,0],["round-1x1","coral",1,3,11,0],["slope-1x2","violet",0,0,17,270],["slope-1x2","violet",2,0,17,270],["tile-1x1","blue",2,3,11,0],["tile-1x4","yellow",0,1,17,90]]',
  },
  piano: {
    name: "Le piano de minuit",
    requirements: [
      {
        modelId: "plate-4x6",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 4,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x3",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x2",
        quantity: 4,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x2",
        quantity: 3,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 3,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x6",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","charcoal",0,0,1,0],["brick-1x1","charcoal",0,3,1,0],["brick-1x1","charcoal",5,0,1,0],["brick-1x1","charcoal",5,3,1,0],["brick-2x3","charcoal",0,0,5,90],["brick-2x3","charcoal",3,0,5,90],["plate-1x2","ivory",1,2,5,0],["plate-1x2","ivory",3,2,5,0],["plate-1x2","ivory",4,2,5,0],["plate-2x6","charcoal",0,0,8,90],["plate-4x6","charcoal",0,0,0,90],["plate-4x6","charcoal",0,0,4,90],["tile-1x1","charcoal",1,2,6,0],["tile-1x1","charcoal",3,2,6,0],["tile-1x1","charcoal",4,2,6,0],["tile-1x2","ivory",0,2,5,0],["tile-1x2","ivory",2,1,9,90],["tile-1x2","ivory",2,2,5,0],["tile-1x2","ivory",5,2,5,0]]',
  },
  library: {
    name: "La bibliothèque arc-en-ciel",
    requirements: [
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 6,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 3,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 3,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 3,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 3,
        colorId: "violet",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x6",
        quantity: 3,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x4","blue",1,1,9,0],["brick-1x4","blue",2,1,5,0],["brick-1x4","blue",3,1,1,0],["brick-1x4","brown",0,1,1,0],["brick-1x4","brown",0,1,5,0],["brick-1x4","brown",0,1,9,0],["brick-1x4","brown",5,1,1,0],["brick-1x4","brown",5,1,5,0],["brick-1x4","brown",5,1,9,0],["brick-1x4","coral",1,1,1,0],["brick-1x4","coral",3,1,9,0],["brick-1x4","coral",4,1,5,0],["brick-1x4","violet",2,1,9,0],["brick-1x4","violet",3,1,5,0],["brick-1x4","violet",4,1,1,0],["brick-1x4","yellow",1,1,5,0],["brick-1x4","yellow",2,1,1,0],["brick-1x4","yellow",4,1,9,0],["plate-4x6","brown",0,1,12,90],["plate-4x6","brown",0,1,4,90],["plate-4x6","brown",0,1,8,90],["plate-6x6","ivory",0,0,0,0],["round-1x1","brown",1,1,13,0],["round-1x1","green",1,1,16,0]]',
  },
  greenhouse: {
    name: "Le jardin sous les arches",
    requirements: [
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 8,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "arch-1x4",
        quantity: 4,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 3,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 3,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x3",
        quantity: 4,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x4",
        quantity: 2,
        colorId: "brown",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["arch-1x4","ivory",0,1,1,0],["arch-1x4","ivory",1,0,1,90],["arch-1x4","ivory",1,5,1,90],["arch-1x4","ivory",5,1,1,0],["brick-1x1","ivory",0,0,1,0],["brick-1x1","ivory",0,0,4,0],["brick-1x1","ivory",0,5,1,0],["brick-1x1","ivory",0,5,4,0],["brick-1x1","ivory",5,0,1,0],["brick-1x1","ivory",5,0,4,0],["brick-1x1","ivory",5,5,1,0],["brick-1x1","ivory",5,5,4,0],["plate-1x3","brown",0,0,7,90],["plate-1x3","brown",0,5,7,90],["plate-1x3","brown",3,0,7,90],["plate-1x3","brown",3,5,7,90],["plate-1x4","brown",0,1,7,0],["plate-1x4","brown",5,1,7,0],["plate-6x6","green",0,0,0,0],["round-1x1","brown",1,2,1,0],["round-1x1","brown",3,2,1,0],["round-1x1","brown",3,4,1,0],["round-1x1","green",1,2,4,0],["round-1x1","green",3,2,4,0],["round-1x1","green",3,4,4,0]]',
  },
  pagoda: {
    name: "La pagode des lanternes",
    requirements: [
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 12,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x2",
        quantity: 8,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x2",
        quantity: 2,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x2",
        quantity: 6,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x2",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-2x2",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-2x2","coral",2,2,16,0],["brick-2x2","coral",2,2,8,0],["plate-2x2","charcoal",2,2,19,0],["plate-4x4","charcoal",1,1,15,0],["plate-4x4","coral",1,1,11,0],["plate-6x6","charcoal",0,0,7,0],["plate-6x6","coral",0,0,0,0],["round-1x1","ivory",1,1,1,0],["round-1x1","ivory",1,1,12,0],["round-1x1","ivory",1,1,4,0],["round-1x1","ivory",1,4,1,0],["round-1x1","ivory",1,4,12,0],["round-1x1","ivory",1,4,4,0],["round-1x1","ivory",4,1,1,0],["round-1x1","ivory",4,1,12,0],["round-1x1","ivory",4,1,4,0],["round-1x1","ivory",4,4,1,0],["round-1x1","ivory",4,4,12,0],["round-1x1","ivory",4,4,4,0],["round-1x1","yellow",2,2,23,0],["round-2x2","yellow",2,2,20,0],["slope-1x2","charcoal",1,1,16,180],["slope-1x2","charcoal",1,3,16,180],["slope-1x2","charcoal",2,1,16,270],["slope-1x2","charcoal",2,4,16,90],["slope-1x2","charcoal",4,1,16,0],["slope-1x2","charcoal",4,3,16,0],["slope-2x2","charcoal",0,0,8,180],["slope-2x2","charcoal",0,2,8,180],["slope-2x2","charcoal",0,4,8,180],["slope-2x2","charcoal",2,0,8,270],["slope-2x2","charcoal",2,4,8,90],["slope-2x2","charcoal",4,0,8,0],["slope-2x2","charcoal",4,2,8,0],["slope-2x2","charcoal",4,4,8,0]]',
  },
  chalet: {
    name: "Le chalet enneigé",
    requirements: [
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 2,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 4,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 2,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x1",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x1",
        quantity: 2,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x2",
        quantity: 4,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x2","brown",2,1,1,90],["brick-1x2","brown",2,1,4,90],["brick-1x2","charcoal",2,4,1,90],["brick-1x2","charcoal",2,4,4,90],["brick-1x4","brown",1,1,1,0],["brick-1x4","brown",1,1,4,0],["brick-1x4","brown",4,1,1,0],["brick-1x4","brown",4,1,4,0],["plate-4x4","ivory",1,1,7,0],["plate-6x6","ivory",0,0,0,0],["round-1x1","green",0,0,1,0],["round-1x1","green",5,5,1,0],["slope-1x1","green",0,0,4,0],["slope-1x1","green",5,5,4,0],["slope-1x1","ivory",0,3,1,0],["slope-1x1","ivory",5,2,1,0],["slope-2x2","ivory",1,1,8,180],["slope-2x2","ivory",1,3,8,180],["slope-2x2","ivory",3,1,8,0],["slope-2x2","ivory",3,3,8,0]]',
  },
  spacegate: {
    name: "Le portail interstellaire",
    requirements: [
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 12,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-2x4",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-2x4",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 2,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x6",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x6",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x2",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x2",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-2x2",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","ivory",1,0,1,0],["brick-1x1","ivory",4,0,1,0],["brick-1x2","blue",0,2,1,0],["brick-1x2","blue",0,2,10,0],["brick-1x2","blue",0,2,13,0],["brick-1x2","blue",0,2,16,0],["brick-1x2","blue",0,2,4,0],["brick-1x2","blue",0,2,7,0],["brick-1x2","blue",5,2,1,0],["brick-1x2","blue",5,2,10,0],["brick-1x2","blue",5,2,13,0],["brick-1x2","blue",5,2,16,0],["brick-1x2","blue",5,2,4,0],["brick-1x2","blue",5,2,7,0],["brick-2x2","blue",2,2,23,0],["brick-2x6","blue",0,2,20,90],["plate-2x6","ivory",0,2,19,90],["plate-6x6","charcoal",0,0,0,0],["round-2x2","yellow",2,2,26,0],["slope-2x2","ivory",0,2,23,180],["slope-2x2","ivory",4,2,23,0],["tile-1x1","blue",1,0,4,0],["tile-1x1","blue",4,0,4,0],["tile-2x4","ivory",1,3,1,90],["tile-2x4","yellow",1,1,1,90]]',
  },
  armchair: {
    name: "La petite chaise",
    requirements: [
      {
        modelId: "brick-1x1",
        quantity: 4,
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x3",
        quantity: 1,
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 2,
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 1,
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1",null,0,0,0,0],["brick-1x1",null,0,2,0,0],["brick-1x1",null,1,0,0,0],["brick-1x1",null,1,2,0,0],["brick-1x2",null,0,0,4,90],["brick-1x2",null,0,0,7,90],["plate-2x3",null,0,0,3,0],["tile-1x1",null,0,2,4,0]]',
  },
  pyramid: {
    name: "L’escalier des débutants",
    requirements: [
      {
        modelId: "brick-2x4",
        quantity: 1,
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x4",
        quantity: 1,
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x2",
        quantity: 1,
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 1,
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x2",
        quantity: 1,
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 1,
        label: "Ancien plan v4",
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
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x4",
        quantity: 3,
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 2,
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1",null,0,0,0,0],["brick-1x1",null,0,3,0,0],["brick-1x1",null,3,0,0,0],["brick-1x1",null,3,3,0,0],["brick-1x4",null,0,0,4,0],["brick-1x4",null,3,0,4,0],["plate-2x4",null,0,0,3,0],["plate-2x4",null,1,0,4,0],["plate-2x4",null,2,0,3,0]]',
  },
  cactus: {
    name: "Le cactus du désert",
    requirements: [
      {
        modelId: "brick-2x2",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x2",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 6,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x3",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 3,
        colorId: "green",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","green",1,1,11,0],["brick-1x1","green",1,1,14,0],["brick-1x1","green",1,1,17,0],["brick-1x1","green",1,1,4,0],["brick-1x1","green",1,1,7,0],["brick-1x1","green",2,1,11,0],["brick-2x2","brown",1,1,0,0],["plate-1x3","green",0,1,10,90],["plate-2x2","brown",1,1,3,0],["round-1x1","green",0,1,11,0],["round-1x1","green",1,1,20,0],["round-1x1","green",2,1,14,0]]',
  },
  snowman: {
    name: "Le bonhomme de neige",
    requirements: [
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-4x4",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-2x2",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x2",
        quantity: 1,
        colorId: "orange",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x3",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x3",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x1",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x2",
        quantity: 1,
        colorId: "orange",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x3",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-2x2",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-2x3","ivory",1,1,14,90],["plate-1x1","charcoal",1,2,17,0],["plate-1x1","charcoal",3,2,17,0],["plate-1x2","orange",2,2,17,0],["plate-1x3","charcoal",1,1,17,90],["plate-2x2","orange",1,1,13,0],["plate-2x3","charcoal",1,1,18,90],["plate-4x4","blue",0,0,0,0],["round-2x2","charcoal",1,1,19,0],["round-2x2","ivory",1,1,10,0],["round-2x2","ivory",1,1,7,0],["round-4x4","ivory",0,0,1,0],["round-4x4","ivory",0,0,4,0]]',
  },
  owl: {
    name: "Le hibou Noisette",
    requirements: [
      {
        modelId: "plate-2x6",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 2,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 3,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x2",
        quantity: 2,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x3",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x2",
        quantity: 2,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x3",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x3",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x3",
        quantity: 2,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x1",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x1",
        quantity: 2,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x1",
        quantity: 2,
        colorId: "brown",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","ivory",1,1,8,0],["brick-1x1","ivory",3,1,8,0],["brick-1x1","yellow",1,1,1,0],["brick-1x1","yellow",2,1,8,0],["brick-1x1","yellow",3,1,1,0],["brick-1x2","brown",0,0,1,0],["brick-1x2","brown",4,0,1,0],["brick-1x3","brown",1,0,8,90],["brick-2x3","brown",1,0,5,90],["plate-1x1","brown",1,1,12,0],["plate-1x1","brown",3,1,12,0],["plate-1x1","charcoal",1,1,11,0],["plate-1x1","charcoal",3,1,11,0],["plate-1x2","brown",0,0,4,0],["plate-1x2","brown",4,0,4,0],["plate-1x3","brown",1,0,11,90],["plate-1x3","brown",1,0,12,90],["plate-2x3","brown",1,0,4,90],["plate-2x6","brown",0,0,0,90],["slope-1x1","brown",1,1,13,0],["slope-1x1","brown",3,1,13,180],["slope-1x2","brown",0,0,5,180],["slope-1x2","brown",4,0,5,0],["tile-1x1","yellow",2,1,11,0]]',
  },
  cup: {
    name: "La tasse du matin",
    requirements: [
      {
        modelId: "plate-4x6",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-4x4",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "arch-1x4",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 4,
        colorId: "brown",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["arch-1x4","ivory",4,0,1,0],["plate-4x6","brown",0,0,0,90],["round-4x4","ivory",0,0,1,0],["round-4x4","ivory",0,0,4,0],["tile-1x1","brown",1,1,7,0],["tile-1x1","brown",1,2,7,0],["tile-1x1","brown",2,1,7,0],["tile-1x1","brown",2,2,7,0]]',
  },
  table: {
    name: "La table du goûter",
    requirements: [
      {
        modelId: "brick-1x1",
        quantity: 8,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x4",
        quantity: 2,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-2x2",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","brown",0,0,0,0],["brick-1x1","brown",0,0,3,0],["brick-1x1","brown",0,3,0,0],["brick-1x1","brown",0,3,3,0],["brick-1x1","brown",3,0,0,0],["brick-1x1","brown",3,0,3,0],["brick-1x1","brown",3,3,0,0],["brick-1x1","brown",3,3,3,0],["plate-4x4","brown",0,0,6,0],["tile-1x4","brown",0,0,7,90],["tile-1x4","brown",0,3,7,90],["tile-2x2","ivory",1,1,7,0]]',
  },
  streetlamp: {
    name: "Le lampadaire du square",
    requirements: [
      {
        modelId: "plate-4x4",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 4,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x2",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x2",
        quantity: 3,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-2x4",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-2x2","yellow",1,1,14,0],["brick-2x2","yellow",1,1,17,0],["brick-2x2","yellow",1,1,20,0],["plate-2x2","charcoal",1,1,13,0],["plate-4x4","charcoal",0,0,0,0],["plate-4x4","charcoal",0,0,23,0],["round-1x1","charcoal",1,1,1,0],["round-1x1","charcoal",1,1,10,0],["round-1x1","charcoal",1,1,4,0],["round-1x1","charcoal",1,1,7,0],["slope-2x4","charcoal",0,0,24,180],["slope-2x4","charcoal",2,0,24,0]]',
  },
  torii: {
    name: "La porte du jardin",
    requirements: [
      {
        modelId: "plate-4x6",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 8,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x6",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x8",
        quantity: 1,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-2x4",
        quantity: 2,
        colorId: "charcoal",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x2","charcoal",1,1,1,0],["brick-1x2","charcoal",4,1,1,0],["brick-1x2","coral",1,1,10,0],["brick-1x2","coral",1,1,14,0],["brick-1x2","coral",1,1,4,0],["brick-1x2","coral",1,1,7,0],["brick-1x2","coral",4,1,10,0],["brick-1x2","coral",4,1,14,0],["brick-1x2","coral",4,1,4,0],["brick-1x2","coral",4,1,7,0],["plate-2x6","coral",0,1,13,90],["plate-2x8","charcoal",-1,1,17,90],["plate-4x6","green",0,0,0,90],["tile-2x4","charcoal",-1,1,18,90],["tile-2x4","charcoal",3,1,18,90]]',
  },
  fountain: {
    name: "La fontaine du jardin",
    requirements: [
      {
        modelId: "plate-6x6",
        quantity: 1,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x6",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x4",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x4",
        quantity: 2,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x2",
        quantity: 2,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-2x2",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x3",
        quantity: 4,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x4",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "round-1x1",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x4","ivory",0,1,1,0],["brick-1x4","ivory",5,1,1,0],["brick-1x6","ivory",0,0,1,90],["brick-1x6","ivory",0,5,1,90],["plate-4x4","blue",1,1,1,0],["plate-6x6","green",0,0,0,0],["round-1x1","blue",2,2,5,0],["round-1x1","ivory",2,2,8,0],["round-2x2","blue",2,2,2,0],["tile-1x2","blue",2,1,2,90],["tile-1x2","blue",2,4,2,90],["tile-1x3","ivory",0,0,4,90],["tile-1x3","ivory",0,5,4,90],["tile-1x3","ivory",3,0,4,90],["tile-1x3","ivory",3,5,4,90],["tile-1x4","blue",1,1,2,0],["tile-1x4","blue",4,1,2,0],["tile-1x4","ivory",0,1,4,0],["tile-1x4","ivory",5,1,4,0]]',
  },
  aqueduct: {
    name: "L’aqueduc des trois arches",
    requirements: [
      {
        modelId: "plate-2x6",
        quantity: 2,
        colorId: "green",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 12,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "arch-2x4",
        quantity: 3,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-4x6",
        quantity: 2,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x4",
        quantity: 6,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-2x4",
        quantity: 3,
        colorId: "blue",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["arch-2x4","ivory",0,0,7,0],["arch-2x4","ivory",0,4,7,0],["arch-2x4","ivory",0,8,7,0],["brick-1x2","ivory",0,0,1,90],["brick-1x2","ivory",0,0,4,90],["brick-1x2","ivory",0,11,1,90],["brick-1x2","ivory",0,11,4,90],["brick-1x2","ivory",0,3,1,90],["brick-1x2","ivory",0,3,4,90],["brick-1x2","ivory",0,4,1,90],["brick-1x2","ivory",0,4,4,90],["brick-1x2","ivory",0,7,1,90],["brick-1x2","ivory",0,7,4,90],["brick-1x2","ivory",0,8,1,90],["brick-1x2","ivory",0,8,4,90],["brick-1x4","ivory",-1,0,14,0],["brick-1x4","ivory",-1,4,14,0],["brick-1x4","ivory",-1,8,14,0],["brick-1x4","ivory",2,0,14,0],["brick-1x4","ivory",2,4,14,0],["brick-1x4","ivory",2,8,14,0],["plate-2x6","green",0,0,0,0],["plate-2x6","green",0,6,0,0],["plate-4x6","ivory",-1,0,13,0],["plate-4x6","ivory",-1,6,13,0],["tile-2x4","blue",0,0,14,0],["tile-2x4","blue",0,4,14,0],["tile-2x4","blue",0,8,14,0]]',
  },
  sailboat: {
    name: "Le voilier de la baie",
    requirements: [
      {
        modelId: "plate-2x8",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-2x6",
        quantity: 1,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-2x8",
        quantity: 1,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "slope-1x2",
        quantity: 2,
        colorId: "blue",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 5,
        colorId: "brown",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x3",
        quantity: 1,
        colorId: "coral",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x3",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "plate-1x4",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x2",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "brick-1x1",
        quantity: 1,
        colorId: "ivory",
        label: "Ancien plan v4",
      },
      {
        modelId: "tile-1x1",
        quantity: 1,
        colorId: "yellow",
        label: "Ancien plan v4",
      },
    ],
    geometry:
      '[["brick-1x1","brown",0,3,12,0],["brick-1x1","brown",0,3,15,0],["brick-1x1","brown",0,3,18,0],["brick-1x1","brown",0,3,5,0],["brick-1x1","brown",0,3,9,0],["brick-1x1","ivory",0,4,12,0],["brick-1x2","ivory",0,4,9,0],["brick-1x3","ivory",0,4,5,0],["brick-2x6","blue",0,1,1,0],["plate-1x4","ivory",0,3,8,0],["plate-2x8","blue",0,0,0,0],["plate-2x8","brown",0,0,4,0],["slope-1x2","blue",0,0,5,270],["slope-1x2","blue",0,7,5,90],["tile-1x1","yellow",0,3,21,0],["tile-1x3","coral",1,2,5,0]]',
  },
} as const satisfies Record<string, V4RecipeSnapshot>;
