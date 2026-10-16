import { memo } from "react";
import { RECIPE_BY_ID } from "../game/catalog";
import "./ConstructionBackdrop.css";

type Setting =
  | "woodland"
  | "meadow"
  | "wetland"
  | "desert"
  | "polar"
  | "alpine"
  | "harbour"
  | "canal"
  | "ocean"
  | "orbital"
  | "clouds"
  | "neighbourhood"
  | "civic"
  | "courtyard"
  | "botanical"
  | "atelier"
  | "salon"
  | "stage"
  | "arcade-room"
  | "railway"
  | "valley";

type Motif =
  | "pine"
  | "fern"
  | "flowers"
  | "reeds"
  | "rocks"
  | "fossil"
  | "cactus"
  | "snowflakes"
  | "moon"
  | "comets"
  | "buoy"
  | "sails"
  | "aviation"
  | "pennants"
  | "bicycle"
  | "tools"
  | "blueprint"
  | "pixels"
  | "post"
  | "time"
  | "notes"
  | "books"
  | "tea"
  | "lanterns"
  | "petals"
  | "water"
  | "columns"
  | "constellation"
  | "train"
  | "museum"
  | "seasons"
  | "curtains"
  | "cargo"
  | "chess"
  | "palms"
  | "aurora"
  | "terraces";

export interface ConstructionSetting {
  setting: Setting;
  motif: Motif;
  /** A composition key, also useful when reviewing the complete collection. */
  vignette: string;
}

const place = (
  setting: Setting,
  motif: Motif,
  vignette: string,
): ConstructionSetting => ({ setting, motif, vignette });

// These environments are independently drawn for Brigo. They describe the story
// of each model, without changing any saved placement, part, or recipe material.
// Keep the list explicit: a new construction deserves an intentional setting.
export const CONSTRUCTION_SETTINGS: Readonly<
  Record<string, ConstructionSetting>
> = {
  tree: place("woodland", "pine", "sentier-des-coniferes"),
  mushroom: place("woodland", "fern", "sous-bois-apres-la-pluie"),
  flower: place("meadow", "flowers", "prairie-du-matin"),
  penguin: place("polar", "rocks", "banquise-des-voyageurs"),
  duck: place("wetland", "reeds", "mare-aux-reflets"),
  turtle: place("courtyard", "water", "bassin-du-jardin"),
  dinosaur: place("valley", "fossil", "vallee-des-fougeres"),
  cactus: place("desert", "cactus", "dunes-au-soleil"),
  snowman: place("alpine", "snowflakes", "clairiere-enneigee"),
  owl: place("woodland", "moon", "lisiere-au-crepuscule"),
  totem: place("woodland", "pennants", "clairiere-des-couleurs"),
  bench: place("courtyard", "bicycle", "allee-du-parc"),
  robot: place("atelier", "blueprint", "atelier-de-brigobot"),
  mosaic: place("atelier", "pixels", "table-des-couleurs"),
  mailbox: place("neighbourhood", "post", "rue-des-courriers"),
  hourglass: place("salon", "time", "cabinet-du-temps"),
  arcade: place("arcade-room", "pixels", "salle-des-etoiles-pixel"),
  piano: place("salon", "notes", "recital-a-la-lune"),
  armchair: place("salon", "books", "coin-lecture"),
  pyramid: place("atelier", "tools", "premieres-maquettes"),
  "starter-bridge": place("canal", "reeds", "ruisseau-des-debutants"),
  cup: place("salon", "tea", "petit-dejeuner-au-soleil"),
  table: place("courtyard", "tea", "gouter-sous-les-branches"),
  streetlamp: place("neighbourhood", "moon", "square-a-la-nuit-tombante"),
  house: place("neighbourhood", "bicycle", "quartier-corail"),
  lighthouse: place("harbour", "buoy", "pointe-des-brigos"),
  well: place("courtyard", "flowers", "place-du-village"),
  bridge: place("canal", "water", "berge-du-petit-pont"),
  castle: place("clouds", "pennants", "royaume-des-nuages"),
  cafe: place("neighbourhood", "tea", "terrasse-du-cafe-soleil"),
  library: place("civic", "books", "promenade-des-lecteurs"),
  greenhouse: place("botanical", "fern", "jardin-sous-verriere"),
  pagoda: place("courtyard", "lanterns", "allee-des-lanternes"),
  chalet: place("alpine", "pine", "val-du-chalet-enneige"),
  spacegate: place("orbital", "comets", "passage-des-confins"),
  torii: place("courtyard", "petals", "entree-du-jardin"),
  fountain: place("courtyard", "water", "square-aux-jets-deau"),
  aqueduct: place("valley", "columns", "vallee-des-trois-arches"),
  spaceship: place("orbital", "comets", "orbite-dexploration"),
  boat: place("canal", "buoy", "canal-des-couleurs"),
  airplane: place("clouds", "aviation", "carnet-de-vol"),
  sailboat: place("ocean", "sails", "baie-des-alizes"),
  "winter-garden": place("botanical", "flowers", "pavillon-des-plantes"),
  "harbour-lighthouse": place("harbour", "sails", "entree-du-grand-port"),
  "star-observatory": place("alpine", "constellation", "cretes-des-etoiles"),
  "travellers-station": place("railway", "train", "quai-des-voyageurs"),
  "arcade-bookshop": place("neighbourhood", "books", "passage-des-arcades"),
  "garden-villa": place("botanical", "lanterns", "verger-de-la-villa"),
  "discovery-museum": place("civic", "museum", "esplanade-des-decouvertes"),
  "season-gate": place("courtyard", "seasons", "promenade-des-saisons"),
  "four-seasons-theatre": place("civic", "curtains", "parvis-du-theatre"),
  "cape-fort": place("harbour", "rocks", "falaise-du-cap"),
  "waterlily-fountain": place("wetland", "flowers", "bassin-des-nenuphars"),
  "chamber-organ": place("stage", "notes", "salle-des-sept-registres"),
  "terraced-waterfall": place("valley", "water", "gorge-des-cascades"),
  "cargo-shuttle": place("orbital", "cargo", "station-des-confins"),
  "ocean-schooner": place("ocean", "sails", "route-du-grand-large"),
  "grand-chessboard": place("salon", "chess", "salon-des-strateges"),
  "concert-grand-piano": place("stage", "curtains", "grande-salle-de-concert"),
  "four-seasons-garden": place(
    "botanical",
    "seasons",
    "jardin-au-fil-de-lannee",
  ),
  "cargo-harbor": place("harbour", "cargo", "terminal-des-marees"),
  "tropical-conservatory": place("botanical", "palms", "serre-des-tropiques"),
  "astreval-gardens": place(
    "botanical",
    "terraces",
    "jardins-suspendus-dastreval",
  ),
  "aurora-palace": place("polar", "aurora", "rivage-des-aurores"),
  "high-citadel": place("alpine", "pennants", "cretes-des-huit-tours"),
  "seed-handcart": place("botanical", "fern", "tournee-des-jeunes-pousses"),
  "dune-scout": place("desert", "rocks", "piste-des-eclaireurs"),
  "crystal-hauler": place("valley", "cargo", "convoi-des-eclats"),
  "travelling-library": place(
    "neighbourhood",
    "books",
    "halte-des-livres-voyageurs",
  ),
  "cartographer-chest": place(
    "atelier",
    "blueprint",
    "coffre-des-cartographes",
  ),
  "canal-liftbridge": place("canal", "water", "passerelle-des-deux-rives"),
  "articulated-chart-desk": place("salon", "books", "pupitre-des-horizons"),
};

export function getConstructionSetting(recipeId: string): ConstructionSetting {
  return Object.prototype.hasOwnProperty.call(CONSTRUCTION_SETTINGS, recipeId)
    ? CONSTRUCTION_SETTINGS[recipeId]
    : place("atelier", "tools", "carnet-de-creation");
}

interface Landscape {
  ground: string;
  distant: string;
  contours: string;
  detail: string;
}

// Each layer batches many pen strokes into one path. No filters, masks, large
// textures, external assets, or animation: detailed silhouettes stay inexpensive
// when a whole workshop page is visible at once.
const LANDSCAPES: Record<Setting, Landscape> = {
  woodland: {
    ground: "M45 515Q140 440 255 485T490 493T730 480T955 503L925 646 126 653Z",
    distant:
      "M65 449 112 289 165 449H146L180 332 220 449H205L253 259 310 449ZM713 459l61-218 68 218h-29l38-143 50 143h-24l44-184 55 184Z",
    contours:
      "M65 517q93-44 190-17m489 0q113-50 207 3M117 584q63-29 137-17m511-3q75-19 152 10M109 422l16-49 18 49m39-27 12-39 13 39m588 3 16-55 17 55m90-13 14-52 17 52",
    detail:
      "M75 547q17-23 32 0m-20-2-6-19m9 18 11-21M860 559q19-26 35-2m-23-3-5-21m9 19 12-21M150 616l24-6 17 6m616-13 30-7 18 7M149 262l11-5 10 5m610-51 13-6 10 6",
  },
  meadow: {
    ground: "M42 526Q195 410 340 481T604 486T958 477L931 646H101Z",
    distant: "M64 474q71-110 149-53t140 16q146-137 301-22t277 18l-2 106H62Z",
    contours:
      "M66 510q84-46 181-24m509 12q101-40 183 4M93 580q64-30 137-12m571-3q62-29 114-2M166 353q14-39 29 0m-15-13v49m629-28q15-43 30 0m-15-11v51",
    detail:
      "M93 538l8-23 8 23m6 6 5-17 8 15M867 540l12-31 12 31m-7 15 13-21 8 20M143 603l-5-19m7 12 8-13m-2 14 11-4M811 598l2-24m1 12 13-10m-15 22-11-9M247 252l12-6 12 6m-35 12 10-5 9 5",
  },
  wetland: {
    ground: "M44 512q121-74 232-22t231 3q155-63 452 10l-19 144H91Z",
    distant: "M64 469q80-57 160-8t159-2q160-65 267-7t282 1v94H61Z",
    contours:
      "M63 533q127-25 241 0m404 0q119-24 220 3M102 566h133m565 0h99M129 591h81m626 4h76M132 439v-91m-4 21-12-16m17 45 17-17M851 443v-104m-4 30-16-15m21 49 16-20",
    detail:
      "M74 486v-86m-1 27-11-20m16 54 10-21M909 488v-78m-2 27-15-16m17 40 15-15M85 605q22-19 45 0l-23 7Zm774 7q27-22 53-1l-25 9ZM224 447l17-7 17 7m490-21 15-7 15 7",
  },
  desert: {
    ground: "M43 537q147-135 338-34t317-10q143-68 263 5l-37 147H92Z",
    distant:
      "M62 463 176 337 238 405 331 317 426 443 592 418 699 302 758 375 844 330 940 460v92H59Z",
    contours:
      "M66 529q120-61 221-19m447 1q103-54 203-10M132 593q72-38 148-13m471 8q76-29 151-5M160 381l19-19 33 47m518-70 23 37 19-16",
    detail:
      "M85 559l24-4m18 9 16-5m-23 40 24-3m716-37 22-5m17 18 25-4M152 502v-66q0-20 13-20t13 20v22h18v-29m-45 50h-20v-25M859 471v-49q0-18 12-18t12 18v25h19v-18M99 626l27-9 35 9m670-8 27-10 33 10",
  },
  polar: {
    ground:
      "M37 542 158 484 302 512 454 479 622 513 779 476 965 528 920 653 104 647Z",
    distant:
      "M65 468 137 293 221 394 276 286 393 456 607 448 716 274 804 384 855 292 943 469v74H58Z",
    contours:
      "M98 477 145 340 166 397 187 384 209 432m504-109 32 72 31-21 36 62M56 548l125-19 98 19m437 4 100-28 119 17M105 594l104-17 58 25m503-2 89-20 64 17",
    detail:
      "M88 559l73-13-15 20 58-5m631 1 64-16-12 19 39-1M159 625l39-10 38 6m541 1 42-8 34 8M94 270l11-8 12 8m684-29 13-7 11 7M257 164l15 8 16-8",
  },
  alpine: {
    ground: "M42 531q105-98 223-29t231-7q159-76 462 4l-30 145H98Z",
    distant:
      "M52 472 178 203 263 353 338 242 461 456 616 438 738 187 817 327 878 248 954 469v73H57Z",
    contours:
      "M147 269l32-66 42 75-28-10-18 24-13-23Zm560-23 31-59 47 85-27-15-18 20-17-30ZM58 534q108-37 209-14m470-3q101-28 211 1M112 586q69-25 136-6m528 5q78-31 139-12",
    detail:
      "M96 490l21-62 23 62m-23-61v75m760-9 23-74 26 74m-26-73v89M88 561l27-5 22 5m704 17 23-7 27 6M134 349l10-12 11 12m684 1 9-13 10 13M167 616l23-8 20 8m585 2 29-9 24 9",
  },
  harbour: {
    ground:
      "M40 533 176 475 297 505 484 480 704 506 828 470 962 531 925 651H91Z",
    distant:
      "M69 477V412l45-24 48 24v65h45v-91l44-28 44 28v91h414v-69l47-31 48 31v69h42V355l42-33 42 33v122Z",
    contours:
      "M66 529h210m446 0h214M98 563h133m560 0h106M127 598h121m525 0h151M118 427v24m124-44v27m518-7v24m125-76v29M66 494h192m493 0h179",
    detail:
      "M90 480v-111h62m-62 0 54-58m-24 58v43m-14 0h27M882 462v-103h-53m53 0-44-46m17 47v40m-13 0h26M131 611l21-8 17 8m662 8 20-8 16 8M300 180l19-8 20 8m454 53 18-8 20 8",
  },
  canal: {
    ground:
      "M37 527 165 465 323 506 494 482 699 498 833 466 967 529 925 648H93Z",
    distant:
      "M65 472v-79l42-36 41 36v79h40v-65l42-29 40 29v65h463v-88l42-32 42 32v88h40v-61l42-35 39 35v61Z",
    contours:
      "M50 538l207-43m488 1 202 40M92 560h148m563 0h107M135 595h100m554 1h123M60 505l198-37m485 1 203 34M107 408v31m127-14v28m541-52v32m126-7v28",
    detail:
      "M93 515v-48m31 42v-47m29 41v-45m692 43v-46m31 52v-46m31 51v-47M101 483l60-13m679 0 68 14M96 614l40-4m47 15h59m580-11 55 2m-15-354 18-7 19 7M149 253l17-7 17 7",
  },
  ocean: {
    ground: "M44 518q83-33 165 0t164 0 164 0 164 0 250 0l-24 132H91Z",
    distant:
      "M61 472q93-47 151 0l59-11 61 15h380l71-30 54 24 46-9 59 14v64H60Z",
    contours:
      "M61 529q54-25 108 0t108 0m450 0q54-25 108 0t108 0M94 570q43-20 86 0t86 0m491 0q43-20 86 0t86 0M146 610q27-15 54 0t54 0m539 0q27-15 54 0t54 0",
    detail:
      "M90 480q27-18 53 0m684-2q29-17 58 0M106 365l20-10 20 10m665-35 20-10 20 10m-57-69 13-7 13 7M96 595l20-3m-2 35h29m724-36 25-3m-49 36h37M708 438l24-18 16 17",
  },
  orbital: {
    ground:
      "M42 547 177 476 326 515 507 476 704 512 839 472 965 541 930 649H91Z",
    distant:
      "M55 482 173 433 237 451 292 429 377 479 667 476 727 417 790 443 844 413 944 485v61H55Z",
    contours:
      "M76 540l121-31 70 22m466 0 113-37 91 41M131 589l75-20 65 19m475 3 82-28 83 21M99 457l59-22 42 10m554 3 73-23 53 21",
    detail:
      "M125 609l34-10 36 10-35 11Zm679-12 43-12 41 13-43 11ZM97 243h17m-8-8v16M839 168h20m-10-10v20M737 294h15m-8-7v14M228 142h11m-5-5v10M101 396l38-13m722 0 42 18",
  },
  clouds: {
    ground:
      "M41 540q26-41 63-28-7-50 43-55 30-56 81-18 48-22 63 33h401q21-64 70-44 50-40 83 16 56-6 58 48 44-3 61 46l-39 112H91Z",
    distant:
      "M67 334q-7-37 26-42 5-49 47-40 30-27 50 9 39-4 48 29h74v23H67Zm653-87q-3-36 29-39 14-42 49-24 28-21 52 10 36 4 38 34h48v19Z",
    contours:
      "M67 558q62-35 129-7m589 2q65-34 137-3M128 600q53-25 103-6m549 0q52-26 103-5M99 299h107m552-70h95M94 431l35-14m730-63 39-15",
    detail:
      "M85 197h22m-11-11v22M868 322h18m-9-9v18M153 395l39-14m-29 26 27-10M810 411l35-12m-23 24 28-9M167 624l29-7m608 1 31-8M274 165l13-6 13 6",
  },
  neighbourhood: {
    ground: "M40 532 214 472 498 487 800 471 964 534 931 649H85Z",
    distant:
      "M56 479v-123l43-32 45 32v123h27V305l52-39 52 39v174h445V337l46-33 46 33v142h27V290l52-40 52 40v189Z",
    contours:
      "M57 511h207m476 0h204M95 574l171-51m477 1 165 51M132 615l119-34m528-1 95 29M85 375h28v29H85Zm120-43h35v33h-35Zm0 53h35v33h-35Zm542-30h31v31h-31Zm124-42h34v32h-34Zm0 53h34v32h-34Z",
    detail:
      "M62 482h212m447 0h222M102 479v-41h34v41m646-1v-49h29v49M154 229h96m-63-10h74m477-23h81m-49 12h57M77 550l20-5m27-7 20-6m707 12 23 7m-53-18 15 5M146 632h48m638 0h57",
  },
  civic: {
    ground: "M38 533 221 467 500 487 782 467 964 533 932 649H91Z",
    distant:
      "M56 479V346h42v-28h112v28h43v133h479V330h43v-32h108v32h49v149ZM95 346v133m39-133v133m38-133v133m-74-149h111M776 330v149m38-149v149m38-149v149m-77-165h108",
    contours:
      "M54 511h217m459 0h215M77 552l167-55m510 1 173 54M101 597l158-54m476 0 165 53M165 636l96-34m480 0 97 33M78 466h162m501 0h178",
    detail:
      "M90 387h25v41H90Zm62 0h25v41h-25Zm626-22h25v43h-25Zm63 0h25v43h-25ZM104 543v-54h54v37m684 0v-37h53v54M116 565l-2-16m769 16 4-16M173 232h77m-53-12h46m488-11h69m-40 15h51",
  },
  courtyard: {
    ground: "M38 530 210 470 500 489 800 470 963 531 934 648H90Z",
    distant:
      "M61 480v-65q46-42 91 0v65h31v-80q42-44 84 0v80h467v-76q43-45 85 0v76h31v-61q44-43 88 0v61Z",
    contours:
      "M57 519h202m484 0h199M112 574l144-42m490 0 145 42M156 623l112-34m466 0 116 34M96 459h47m54-13h52m494 0h67m51 13h63M138 391v-93m-28 69q26-58 56 0m691 21v-90m-31 62q32-59 61 0",
    detail:
      "M85 545q20-25 39 0m-24 0 2-22m8 20 12-17M873 550q19-23 35 0m-23-1-2-21m9 21 9-17M187 603l19-4m601 1 23 4M111 273l11-6 12 6m686 0 12-6 12 6M96 604h39m736 0h39",
  },
  botanical: {
    ground: "M41 526q116-82 235-33l222-12 225 13q126-56 237 31l-27 126H90Z",
    distant:
      "M61 476v-102q13-89 93-110 79 23 92 110v102h489v-95q16-90 96-121 80 32 101 121v95ZM85 476V375q12-67 69-88 58 21 66 88v101m536 0v-94q16-67 75-96 60 29 77 96v94",
    contours:
      "M154 288v188m-68-104h135m-120-41h106m624-43v188m-75-96h153m-135-45h110M70 526q85-27 181-12m497 0q94-28 182 13M124 587q53-25 120-10m527 0q68-23 125-2",
    detail:
      "M108 462v-60m0 34q-27-33-28-12 1 15 28 19m0-25q22-40 31-22 7 15-31 31M867 463v-71m0 48q-28-36-34-15-1 18 34 23m0-29q23-39 31-22 6 16-31 30M97 610l24-6 22 6m715-2 24-6 21 6M190 210l13-6 13 6m575 6 13-6 13 6",
  },
  atelier: {
    ground: "M39 531 219 467 500 486 786 469 962 533 932 650H91Z",
    distant:
      "M66 478V269h194v209Zm673 0V282h192v196ZM86 290h154v73H86Zm673 13h152v71H759Z",
    contours:
      "M65 393h194m-194 46h194m481-35h190m-190 43h190M92 330h120m-110-16h43m-43 33h64m616-23h102m-85 21h47M62 527l193-39m489 0 193 39M126 589l133-36m482 0 142 38",
    detail:
      "M91 391v-12h22v12m15 0v-15h27v15m28 0v-13h43v13M766 402v-18h36v18m17 0v-21h21v21m20 0v-17h45v17M93 437v-22h45v22m35 0v-15h51v15M774 445v-22h39v22m35 0v-17h51v17M145 618l39-12 33 9m578-7 27-8 33 8",
  },
  salon: {
    ground: "M42 533 220 467 500 488 786 469 962 533 928 649H92Z",
    distant:
      "M65 480V264h185v216Zm686 0V258h178v222ZM85 283h145v147H85Zm685-6h140v148H770Z",
    contours:
      "M156 283v147m-71-75h145m609-78v148m-69-74h140M64 453h185m503 0h177M62 528l195-36m488 0 193 37M107 575l149-40m492 0 148 41M151 619l118-36m466 0 116 36",
    detail:
      "M97 468v-29h50v29m627 0v-29h47v29M168 480v-52m-18-19 19-36 18 36Zm680 69v-49m-19-18 19-37 21 37ZM101 307l17-13m-12 29 29-21m644 4 21-16m-17 34 35-26M128 603h29m679 0h27",
  },
  stage: {
    ground: "M43 537 219 467 500 487 786 467 961 537 929 649H91Z",
    distant:
      "M61 482V218q96 70 196 5v259Zm682 0V221q96 67 193-5v266ZM72 222h181m493 0h181",
    contours:
      "M86 246q7 114 38 168m-1-149q13 94 29 118m41-119q-4 99-30 151m43-150q-3 71-15 114M771 262q5 94 27 147m13-141q12 79 24 112m34-122q2 85-23 151m56-159q-5 75-15 113M61 516h200m476 0h200M110 574l151-43m476 0 152 43",
    detail:
      "M70 480h184m492 0h184M85 429l38-13 42 13m671 0 33-13 42 13M110 604h138m511 0h137M144 628h90m535 0h92M178 187h67m512 0h67M97 547h33m748 0h28",
  },
  "arcade-room": {
    ground: "M41 533 220 470 501 487 787 470 963 534 928 649H91Z",
    distant:
      "M64 479V294h188v185Zm685 0V286h184v193ZM83 313h149v109H83Zm686-8h144v116H769Z",
    contours:
      "M68 453h184m499 0h181M95 349h30v-20h31v20h31v-20h29m565 11h22v-20h23v20h22v22h22v-22h26M61 526l199-36m481 0 197 37M99 574l164-43m475 0 159 43M143 619l121-36m472 0 121 36",
    detail:
      "M104 401h20v-20h20v20h20v-20h20v20h21m582-21h20v20h20v-20h20v20h20M96 473v-15h41v15m644 0v-15h40v15M171 461h29m-15-14v29m660-18h23m-12-12v24M131 604h28m680 0h27M153 226h21v-21h22v21h22",
  },
  railway: {
    ground: "M41 534 216 465 502 487 784 466 962 535 928 650H91Z",
    distant:
      "M62 479V337h182v142Zm687 0V322h181v157ZM78 354h149v40H78Zm689-14h146v40H767Z",
    contours:
      "M53 517l210-32m474 0 210 32M77 550l182-32m482 0 182 32M98 580l164-32m476 0 164 32M122 610l144-30m469 0 143 30M83 536l13 12m33-22 14 13m31-23 17 13m622-7-16 12m57-1-16 13m-72-33-15 13M107 372h98m575-13h111",
    detail:
      "M99 479v-65m0 2h47v30H99m-10-30h66M871 479v-75m-19 0h38m-19 0-14-21m14 21 15-21M96 303l28-13m701-25 34-13M166 434h31v32h-31Zm621-32h29v64h-29ZM143 630l33-7m650 0 31 7",
  },
  valley: {
    ground:
      "M40 537 166 475 315 505 500 478 699 507 838 471 963 533 928 650H92Z",
    distant:
      "M54 476 120 327 201 282 273 401 331 358 409 467 611 463 693 346 769 284 844 371 907 323 949 479v65H56Z",
    contours:
      "M88 449l52-87 63-44 41 72m485-47 38-29 43 62M67 533l120-32 82 24m465 2 101-29 109 26M109 585l85-23 75 22m478 4 80-29 79 23M151 626l45-14 44 11m546-4 43-12 43 12",
    detail:
      "M93 488l16-28 26-7 21 32m696-1 25-31 27 1 19 31M103 392l18-11m705-3 19-10M100 563l20-5 22 4m732 3 23-7M159 592l19-8m654 4 25-9M85 303l13-7 12 7m738-81 14-6 14 6",
  },
};

// Local ink follows each material and its light, instead of framing every model
// with the same speed lines. Facets and short pen marks stay outside the central
// silhouette; two batched paths are enough for the whole environment.
const PENWORK: Record<Setting, { shade: string; hatch: string }> = {
  woodland: {
    shade:
      "M112 289 165 449h-29l-10-37Zm141-30 57 190h-31l-17-73ZM774 241l68 218h-29l-15-66ZM65 517q93-44 190-17l-7 9q-109-8-183 15Z",
    hatch:
      "M118 358l15 21m-19-8 23 29m-24-10 23 29m118-70 15 27m-16-9 22 35m503-72 14 28m-14-11 19 36M100 557l27-8m-18 15 28-8m-16 15 25-7M833 588l30-8m-19 15 29-8m-19 15 25-7",
  },
  meadow: {
    shade:
      "M66 510q84-46 181-24l-17 10q-92-11-164 21ZM801 565q62-29 114-2l-8 7q-62-17-106 3ZM94 539l7-24 2 22 12 7Zm775 3 10-33 3 30 10 3Z",
    hatch:
      "M112 546l6-15m0 20 11-23m-1 25 15-18M173 590l4-13m4 14 7-19m2 17 12-11M836 547l7-17m1 21 10-24m0 24 13-16M871 602l4-12m5 13 7-18",
  },
  wetland: {
    shade:
      "M63 533q127-25 241 0l-39 5q-108-15-202 3ZM708 533q119-24 220 3l-33 4q-110-15-187 1ZM85 605q22-19 45 0l-23 7Zm774 7q27-22 53-1l-25 9Z",
    hatch:
      "M77 547h53m-34 6h67m-36 6h32M819 550h64m-46 7h73m-47 6h28M103 589h31m-17 6h39m683 1h48m-31 7h31M79 449l8-11m-9 24 10-13m807 0 11-15m-10 28 11-16",
  },
  desert: {
    shade:
      "M176 337l62 68 31-32-20 66-54-37ZM699 302l59 73 35-20-50 74-18-50ZM132 593q72-38 148-13l-15 10q-69-12-133 11Z",
    hatch:
      "M182 374l12 25m-9-11 15 27m-10-8 16 26M711 344l9 21m-5-4 12 27m-7-6 16 32M87 558l26-7m-17 17 35-9m-20 20 29-7M852 590l31-10m-23 18 39-12m-26 20 30-8",
  },
  polar: {
    shade:
      "M137 293l84 101-29 3-38-44ZM716 274l88 110-26-9-33-35ZM158 484l144 28-49 11-86-23ZM779 476l186 52-65 7-89-35Z",
    hatch:
      "M150 346l12 22m-9-7 19 28m-13-10 19 30M733 321l14 27m-9-9 20 31M83 576l39-8-12 13 43-9m-19 17 24-5M816 585l39-10-14 15 48-10m-23 18 29-6",
  },
  alpine: {
    shade:
      "M178 203l85 150-31-14-37-71ZM338 242l123 214-53-17-42-98ZM738 187l79 140-32-55-27-15ZM878 248l76 221-35-33-33-112Z",
    hatch:
      "M198 289l14 28m-8-10 23 43m-15-16 23 45M747 283l12 22m-8-6 18 33m-9-10 25 42M113 573l24-7m-12 14 22-7m691 27 27-9m-16 16 29-9",
  },
  harbour: {
    shade:
      "M114 388l48 24v65h-22v-53ZM251 358l44 28v91h-21v-79ZM888 322l42 33v122h-23V368ZM66 494h192v9H66Zm685 0h179v9H751Z",
    hatch:
      "M146 429l9 12m-9 0 9 12m-9 0 9 12M280 412l8 12m-8 0 8 12m-8 0 8 12M913 387l9 12m-9 1 9 12m-9 1 9 12M83 548h40m-19 7h52m676 27h42m-25 7h53M118 584h31m692 42h35",
  },
  canal: {
    shade:
      "M107 357l41 36v79h-17v-72ZM775 352l42 32v88h-17v-81ZM60 505l198-37v9L60 514Zm683-36 203 34v10l-203-35Z",
    hatch:
      "M84 534l22-6m-9 13 23-6m-9 13 23-6M861 530l28 6m-14 2 28 7m-15 2 25 6M107 575h47m-29 6h63m655-5h52m-28 6h43M113 419l10 15m-10-3 10 15m664-32 10 15m-10-3 10 15",
  },
  ocean: {
    shade:
      "M61 529q54-25 108 0t108 0l-14 10q-52 17-103-4-53-15-99 1ZM757 570q43-20 86 0t86 0l-16 9q-44 9-78-4-40-15-78 1Z",
    hatch:
      "M81 540l21-6m-12 14 24-7m-9 14 24-7M212 547l21-6m-12 13 18-5M773 580l23-6m-13 14 28-7m-16 14 25-6M879 584l20-6m-13 13 22-6M115 606h28m-15 7h39m665-2h32m-16 7h42",
  },
  orbital: {
    shade:
      "M173 433l64 18-21 10-39-9ZM727 417l63 26-22 14-23-19ZM131 589l75-20 65 19-30 6-35-12ZM804 597l43-12 41 13-43 11Z",
    hatch:
      "M152 448l17-6m-8 12 15-5M759 440l17 7m-26 0 18 8M92 552l20-6m-10 13 24-7m-12 15 23-7M854 547l25 9m-14-1 28 10m-17-1 28 10M150 608l10-3 10 3-10 4Zm679-9 16-4 16 4-16 4Z",
  },
  clouds: {
    shade:
      "M104 512q-7-50 43-55-22 19-21 43-1 22-22 12ZM845 444q56-6 58 48l-22-8q-4-28-36-40ZM128 600q53-25 103-6l-12 9q-51-10-91 5Z",
    hatch:
      "M78 559q17-9 33-8m-21 14q17-7 32-7m-18 13 19-4M827 553q26-11 48-7m-34 15q23-8 43-6m-25 13 23-3M113 298q17-6 33-3m-20 9 20-2M787 228q20-5 35 0m-22 6h22",
  },
  neighbourhood: {
    shade:
      "M99 324l45 32v123h-18V365ZM223 266l52 39v174h-20V317ZM766 304l46 33v142h-19V348ZM891 250l52 40v189h-21V302Z",
    hatch:
      "M132 386l7 12m-7 1 7 12m-7 1 7 12M261 340l8 13m-8 1 8 13m-8 1 8 13M800 370l7 12m-7 2 7 12m-7 2 7 12M928 332l8 13m-8 1 8 13m-8 1 8 13M112 563l30-9m-16 16 29-9m664 14 26 8m-12-13 29 9",
  },
  civic: {
    shade:
      "M98 318h112v12H98Zm112 28h43v133h-19V360ZM775 298h108v12H775Zm108 32h49v149h-20V345ZM78 466h162v8H78Zm663 0h178v8H741Z",
    hatch:
      "M239 373l9 12m-9 1 9 12m-9 2 9 12m-9 2 9 12M918 359l9 13m-9 1 9 13m-9 1 9 13m-9 1 9 13M100 554l25-8m-12 14 26-8m-11 14 26-8M817 596l27 9m-13-13 26 9m-11-13 26 9",
  },
  courtyard: {
    shade:
      "M61 480v-65q20-20 41-23-21 11-24 35v53ZM183 480v-80q19-21 41-24-21 13-24 36v68ZM850 480v-61q19-19 39-23-20 13-22 34v50Z",
    hatch:
      "M66 441l8-11m-8 24 8-11m116-10 8-12m-8 25 8-12M855 448l9-12m-9 25 9-12M106 563l26-8m-15 15 29-9m-17 17 27-9M826 601l28 9m-17-15 29 9m-16-15 30 10",
  },
  botanical: {
    shade:
      "M154 264q79 23 92 110v102h-19V379q-5-75-73-115ZM831 260q80 32 101 121v95h-18v-96q-14-76-83-120ZM70 526q85-27 181-12l-15 9q-99-11-166 10Z",
    hatch:
      "M199 314l15 19m-10-1 19 23m-12-5 17 23M880 319l16 21m-10-2 19 23m-11-4 19 25M85 454l12-8m-10 18 13-9M879 459l13-9m-11 18 15-10M138 594l24-7m-12 14 24-7m646 17 26-8m-13 15 25-8",
  },
  atelier: {
    shade:
      "M66 269h194v21H86v73H66Zm173 21h21v188h-21ZM739 282h192v21H759v71h-20Zm174 21h18v175h-18ZM65 393h194v8H65Zm675 11h190v8H740Z",
    hatch:
      "M245 311l9 12m-9 1 9 12m-9 1 9 12M918 323l8 11m-8 2 8 11m-8 2 8 11M113 560l27-8m-16 15 27-8m-16 16 29-9M832 563l29 10m-17-16 30 10m-17-16 31 11M152 613l5-11m4 13 5-10m651-4 5 11m4-12 5 11",
  },
  salon: {
    shade:
      "M65 264h185v19H85v147H65Zm165 19h20v197h-20ZM751 258h178v19H770v148h-19Zm159 19h19v203h-19ZM64 453h185v8H64ZM752 453h177v8H752Z",
    hatch:
      "M236 304l8 12m-8 1 8 12m-8 2 8 12M915 297l9 13m-9 1 9 13m-9 1 9 13M108 560l32-9m-18 17 30-9m-17 17 32-9M826 577l27 9m-13-14 27 9m-13-15 28 10M155 607l16-5m-9 11 16-5m637-1 16 5m-8-11 16 5",
  },
  stage: {
    shade:
      "M86 246q7 114 38 168l-28-9q-24-80-10-159ZM193 264q-4 99-30 151l23-11q25-78 7-140ZM771 262q5 94 27 147l-25-13q-18-78-2-134ZM869 258q2 85-23 151l20-15q22-74 3-136Z",
    hatch:
      "M95 295l10 26m-9-10 13 33m-11-12 14 37M178 300l-5 27m4-13-7 37m5-17-9 41M784 307l8 27m-6-11 10 35m-7-13 12 39M859 310l-5 25m4-11-7 34m5-13-9 39M113 581l27-8m-14 15 28-8m666 7 29 9m-15-15 30 9",
  },
  "arcade-room": {
    shade:
      "M64 294h188v19H83v109H64Zm168 19h20v166h-20ZM749 286h184v19H769v116h-20Zm164 19h20v174h-20ZM68 453h184v8H68Zm683 0h181v8H751Z",
    hatch:
      "M237 333l9 12m-9 1 9 12m-9 1 9 12M918 325l9 12m-9 1 9 12m-9 1 9 12M105 557h16v-6h17m-24 17h16v-6h17M847 563h18v6h18m-26 6h18v6h16M150 602l19-6m-11 13 18-6m648-4 20 7m-11-13 20 7",
  },
  railway: {
    shade:
      "M62 337h182v17H78v40H62Zm165 17h17v125h-17ZM749 322h181v18H767v40h-18Zm164 18h17v139h-17ZM77 550l182-32-7 9-175 32Zm664-32 182 32v9l-176-32Z",
    hatch:
      "M232 369l7 12m-7 1 7 12m-7 2 7 12M918 355l7 12m-7 2 7 12m-7 2 7 12M99 561l22-6m-10 14 25-7m-14 15 27-8M854 569l24 7m-13-13 28 8m-14-14 27 8M133 606l23-6m-14 13 25-7m650-2 23 7m-13-13 26 8",
  },
  valley: {
    shade:
      "M201 282l72 119-29-11-24-72ZM331 358l78 109-32-9-28-50ZM769 284l75 87-34 5-21-44ZM907 323l42 156-26-18-16-73Z",
    hatch:
      "M214 335l15 25m-11-9 19 32m-12-9 21 36M780 332l15 20m-10-3 21 28m-12-8 22 30M115 561l22-6m-11 13 23-6m-11 13 23-7M838 581l26 8m-14-14 29 9m-16-15 28 9M164 610l12-4m-4 11 15-5m621 0 14 5m-5-11 13 5",
  },
};

// Marginal details deliberately sit to the sides and above the construction.
// Paths are paired as a silhouette and pen work to remain legible at card size.
const MOTIFS: Record<Motif, { shape?: string; ink: string }> = {
  pine: {
    shape: "M91 491l35-116 38 116Zm739 5 40-135 44 135Z",
    ink: "M126 399v111m-20-57 20-12 22 12m-29 20 7-5 18 10m727-95v130m-24-67 24-14 24 14m-38 24 14-9 26 12",
  },
  fern: {
    ink: "M115 535q15-86 59-138m-48 95-33-19m45-5 26 3m-15-25-27-17m37 0 21 4m-14-20-17-14M869 535q-13-86-59-138m48 95 33-19m-45-5-26 3m15-25 27-17m-37 0-21 4m14-20 17-14",
  },
  flowers: {
    ink: "M107 526v-54m0 26-20-15m20 24 20-16m-20-45c-29-19-34 15-11 15-20 24 18 34 19 9 28 7 29-26 5-20 8-28-26-28-23-2M872 535v-54m0 27-20-16m20 26 19-17m-20-45c-24-20-33 9-12 14-19 21 14 32 17 9 25 7 30-22 6-18 8-26-24-30-22-6",
  },
  reeds: {
    ink: "M89 531v-101m0 40-18-17m19 42 24-30m-11 64v-80m11-22v-14m-29 29v-24m765 110v-107m-1 47-22-22m24 50 23-30m-10 62v-82m13-25v-16m-35 30v-26M112 574h42m674 9h45",
  },
  rocks: {
    shape: "M67 549l30-34 51 5 28 33-59 16Zm756 14 40-44 52 8 24 36-61 14Z",
    ink: "M97 515l17 31-47 3m47-3 34-26m715-1 16 32-56 12m56-12 36-24M115 598l23-7 23 7m654 4 33-11 30 9",
  },
  fossil: {
    shape: "M82 520l20-35 66-2 26 38-54 20Zm724 2 33-40 65 5 26 38-74 17Z",
    ink: "M109 514q-7-25 15-26 23 4 18 20-4 13-15 7-11-9-2-13M139 531l17-26m690 12q-18-25 5-29 27-3 25 19-2 13-15 8-13-5-5-14M81 447l12-31 15 31m-14-13 24-14m-22 27-21-9",
  },
  cactus: {
    shape:
      "M90 518v-77q0-22 15-22t15 22v22h20v-25h14v37h-34v43Zm755 0v-88q0-23 17-23t17 23v32h18v-26h14v40h-32v42Z",
    ink: "M105 430v78m757-89v88M83 545l29-6 28 6m698 0 31-7 30 7M96 455h18m-16 22h16m740-32h16m-17 23h18",
  },
  snowflakes: {
    ink: "M137 218v38m-16-29 32 20m-32 0 32-20m-18-1 2 8 8-1m-19 12 10-1 3 10M822 295v32m-14-25 28 18m-28 0 28-18M844 126v25m-11-19 22 13m-22 0 22-13M116 374v24m-10-18 20 12m-20 0 20-12M111 548l25-7 24 7m666 6 28-7 26 7",
  },
  moon: {
    shape: "M809 109q-59 44-10 94-78-1-66-61 13-41 76-33Z",
    ink: "M92 201h18m-9-9v18M853 249h20m-10-10v20M142 313h13m-7-7v14M747 93h10m-5-5v10M88 568l54-8m686 7 46-7M205 155l13-6 13 6",
  },
  comets: {
    shape: "M771 136a55 55 0 1 0 1 0ZM126 278l17-17 19 17-19 17Z",
    ink: "M709 202q74 11 142-84m-155 98q83 25 172-90M89 175l113-52m-94 64 75-34M145 279l68-39m-54 45 62-30M861 349l20-7m-10-5v20M785 142l9-11m-34 26 13-11",
  },
  buoy: {
    shape: "M111 513l15-31 15 31-7 24h-17Zm725 18 14-31 15 31-6 20h-17Z",
    ink: "M126 481v-34m0 5 21 9-21 8m724 29v-36m0 5 21 8-21 8M98 540q27-9 54 0m672 14q26-10 54 0M95 330l16-8 18 8m662-73 19-8 18 8",
  },
  sails: {
    shape: "M119 389v-76l-45 76Zm686-25v-82l51 82Z",
    ink: "M119 308v105m-55-17h75l-15 15H82Zm741-134v119m-31-10h87l-17 16h-55Zm16-80 38 67h-38m-15-61-24 61h24M107 446h38m685-6h38M109 568h44m693 15h36",
  },
  aviation: {
    ink: "M81 349q22-37 87-39m-66 57q30-24 71-25M812 296q59 10 91 55m-90-22q41 10 63 38M148 213l48-16-16-11 10-6 25 12 25-5 11 5-26 12-9 26-10 5 2-27-47 11ZM137 537l22-9m668 3 24 11M783 167l19-6 18 6",
  },
  pennants: {
    shape: "M105 366l42 15-42 16Zm756 0-43 15 43 16Z",
    ink: "M105 362v132m756-132v132M83 502h47m705 0h48M92 235q74 39 149 8m-123 6 9 25 15-20m22 3 13 24 12-25m26-6 15 18 7-22M774 234q64 27 128 0m-107 9 11 22 12-19m21 0 12 20 11-23",
  },
  bicycle: {
    ink: "M77 514a23 23 0 1 0 46 0 23 23 0 1 0-46 0m81 0a23 23 0 1 0 46 0 23 23 0 1 0-46 0m-58 0 22-38 20 38h-42l52-38m-30 0h35l18 38m-22-43-4-14h15m-52 20-4-14h-13M822 541l18-6 21 6m-44-72h61m-49-11h38",
  },
  tools: {
    shape: "M99 458l23-27 12 10-23 27Zm712 44 29-31 12 11-29 31Z",
    ink: "M105 452l-22-20 16-18 23 19M819 495l-22-23 14-14 23 19M138 517l18-26 38 17-17 27Zm10-4 35 13m-24-30 19 24M840 410l18-26 25 21-17 25Zm10-13 24 19M94 553h86m636 4h76",
  },
  blueprint: {
    shape: "M86 355h103v96H86Zm729-7h99v97h-99Z",
    ink: "M96 365h83v76H96Zm17 13h49v34h-49Zm10 9 8-4 8 4-8 5Zm21 0 8-4 8 4-8 5Zm-13 25v14m21-14v14m-42 0h62m664-65h60v55h-60Zm-17 71h93m-70-4v9m45-9v9m-37-94h16m-8-8v16M94 481h85m642 5h78",
  },
  pixels: {
    shape:
      "M104 215h19v-19h19v19h19v19h-19v19h-19v-19h-19Zm727 98h18v-18h18v18h18v18h-18v18h-18v-18h-18Z",
    ink: "M85 476h23v-23h24v23h23v23h-23v23h-24v-23H85ZM818 505h21v-21h21v21h21v21h-21v21h-21v-21h-21ZM146 577h27v27h-27Zm670 25h22v22h-22Z",
  },
  post: {
    shape: "M90 363h84v53H90Zm736 16h78v49h-78Z",
    ink: "M90 363l42 29 42-29m-84 53 29-29m55 29-29-29m681-8 39 27 39-27m-78 49 27-27m51 27-27-27M104 315h60m-51-14h63M811 336h57m-29-14h39M121 544l20-4m692 5 22-5",
  },
  time: {
    shape: "M94 369a40 40 0 1 0 80 0 40 40 0 1 0-80 0Z",
    ink: "M134 340v31l22 13m-22-56v9m0 63v10m-41-41h10m63 0h9M841 308h43m-43 64h43m-38-64q0 23 16 32-16 10-16 32m33-64q0 23-17 32 17 10 17 32M822 488h66m-55-13h43M104 557h56",
  },
  notes: {
    ink: "M81 311q54-16 108 0m-108 12q54-16 108 0m-108 12q54-16 108 0m-108 12q54-16 108 0m-108 12q54-16 108 0M113 350v-63l36-9v62m-36-41 36-8m-36 56q-20-6-20 7t20 2m36-19q-20-5-20 7t20 2M831 405v-72l32-11v61m-32-38 32-10m-32 68q-19-5-19 7t19 3m32-32q-18-5-18 7t18 3",
  },
  books: {
    shape:
      "M84 500h93v13H84Zm12-17h93v14H96Zm722 39h89v13h-89Zm-7-18h86v15h-86Z",
    ink: "M93 361q21-12 42 0 21-12 42 0v65q-21-12-42 0-21-12-42 0Zm42 0v65m-33-46q11-5 24-1m18-1q13-4 24 1M103 507h60m-47-17h57m657 38h62m-64-17h51M823 391v66m0-66q21-12 43 0v66q-22-12-43 0m-22-66q10-5 22 0m-22 23q10-5 22 0",
  },
  tea: {
    shape: "M93 459h55v33q-28 24-55 0Zm733 45h49v30q-24 23-49 0Z",
    ink: "M148 465h12q18 19-12 22M87 510h78m-55-68q-12-12 0-24m20 24q-12-12 0-24M875 510h11q17 16-11 20m-55 19h71m-52-59q-10-12 0-22m19 22q-9-11 0-22M98 357l40-21 44 21-42 21Zm40-21v42m-29 160h47",
  },
  lanterns: {
    shape:
      "M105 316q-20 36 0 64h34q20-28 0-64Zm739 17q-18 30 0 58h31q18-28 0-58Z",
    ink: "M122 280v36m-25 0h50m-25 0v64m-26-32h52m-47 32h42m-21 0v20m-9 0h18M859 294v39m-23 0h47m-24 0v58m-22-30h44m-42 30h41m-21 0v18m-8 0h16M94 274q70 25 145 1m543 14q71 19 130-5",
  },
  petals: {
    shape:
      "M87 297q-14-25 10-29 25 2 11 25 28-3 22 18-12 20-29 0-5 27-22 11-13-18 8-25ZM854 288q-12-23 11-25 22 2 10 24 24-3 18 17-12 18-26-1-5 25-21 10-11-16 8-25Z",
    ink: "M70 367q54-57 142-68m-88 27-7-25m47 11 9-27M797 340q48-30 117-30m-56 8-3-24m28 17 10-20M126 411q8-13 19-6-1 13-13 13Zm712 18q12-9 19 2-5 10-16 5ZM137 567l12-9 10 10m674 8 12-9 11 9M100 493l11-8 10 8",
  },
  water: {
    ink: "M96 535q21-15 42 0t42 0m642 8q22-16 44 0t44 0M90 576q21-11 42 0t42 0m642 9q22-12 44 0t44 0M132 468q-15-20 0-44 17 25 0 44Zm728 12q-17-22 0-48 17 27 0 48ZM136 617h48m638 5h48M99 351q0-28 24-41m731 30q11 11 12 26",
  },
  columns: {
    shape: "M100 462h39V352h-39Zm744 3h40V349h-40Z",
    ink: "M95 350h50m-50 12h50m-54 102h58m-45-100v88m13-88v88M838 348h53m-53 13h53m-55 106h59m-43-103v91m14-91v91M81 479h83m665 3h81M106 536l19-6 20 6m693 7 22-7 19 7",
  },
  constellation: {
    shape: "M765 104q-40 31-5 67-57 0-49-43 12-30 54-24Z",
    ink: "M91 204l44-49 52 23 26-45m-122 71 71 27 25-53m-55-22h7m-4-4v8m48 18h8m-4-4v8m21-46h8m-4-4v8m-54 98h7m-4-4v8M807 238l38-20 34 30 27-43m-63 13 7 45 29-15m-72-10h7m-4-4v8m96-38h7m-4-4v8M115 304h15m-7-8v16",
  },
  train: {
    shape: "M90 414h86v57H90Zm728-19h83v58h-83Z",
    ink: "M100 424h25v19h-25Zm35 0h29v19h-29ZM100 471v14m66-14v14m-76-30h86M827 405h26v19h-26Zm36 0h27v19h-27Zm-36 48v14m63-14v14m-72-29h83M104 303h65m658-24h58M127 298v-52m-25 0h51v32h-51Zm719-9v-43m-22 0h44v28h-44Z",
  },
  museum: {
    shape: "M91 451l28-31 35 6 15 25-44 15Zm746-8 20-42 25 2 18 41-37 17Z",
    ink: "M119 420l5 46 30-40m-65 56h85m-73-17v16m61-16v16M857 401l7 60 18-58m-49 73h72m-62-15v14m52-15v14M97 327h68v54H97Zm8 35 17-16 14 15 15-20M821 288h67v67h-67Zm13 40 16-20 25 30m-19-39h1",
  },
  seasons: {
    ink: "M116 341v58m0-33q-25-20-22-2 2 13 22 14m0-26q20-31 29-16 5 11-29 26M836 339l17-17 17 17-17 17Zm17-26v-11m0 63v11m-26-37h-11m63 0h11M100 490l14-27 14 27m-14-27v42M848 482v32m-14-25 28 18m-28 0 28-18M114 569l27-7m687 7 25-7",
  },
  curtains: {
    shape: "M76 292q56 31 111 0l-24 62-45 20Zm754 0q56 31 110 0l-41 82-45-20Z",
    ink: "M91 306q23 37 41 51m-8-43 22 29m707-28-13 27m32-26-23 40M80 281h112m636 0h114M119 374l-15 32 32-15m762-17 18 32-34-15M88 522h113m620 0h111M118 557h73m642 0h73",
  },
  cargo: {
    shape: "M76 479v-48h84v48Zm746 3v-49h92v49Zm12-52v-43h69v43Z",
    ink: "M88 437v35m13-35v35m13-35v35m14-35v35m13-35v35m693-34v36m14-36v36m14-36v36m14-36v36m14-36v36m-43-79v31m14-31v31m14-31v31M73 484h92m652 2h104M112 370l17-11 16 11m701-25 18-10 17 10M112 557h51m667 10h50",
  },
  chess: {
    shape: "M95 451h62v13H95Zm735 14h64v13h-64Z",
    ink: "M107 450l8-31h22l9 31m-26-31v-15h13v15m-20-19h26m-18-8h10M843 464l8-34h22l9 34m-32-34v-14h24v14m-28-15 5-15h22l5 15m-29-17h27M88 518l40-13 40 13-40 14Zm40-13v27m-20-20 40 13M817 545l38-12 39 12-39 14Zm38-12v26",
  },
  palms: {
    shape:
      "M116 494q9-66-3-119l13-2q17 61 6 121Zm742 0q-4-76 17-120l13 3q-20 55-13 117Z",
    ink: "M121 376q-35-47-57-15 35-1 57 15-12-51 15-59-5 34-15 59 41-45 64-13-35 0-64 13-36 4-45 31 27-12 45-31 26-7 44 16-29 0-44-16M883 378q-28-48-55-20 32 3 55 20-2-51 23-53-12 32-23 53 43-26 60-1-37-8-60 1-35 0-45 25 29-10 45-25M109 517h36m704 0h41",
  },
  aurora: {
    shape:
      "M77 152q175-95 282-44T676 89q135-45 250 23l-2 70q-146-86-281-28T329 163Q195 108 77 226Z",
    ink: "M88 173q136-84 245-37t312-6q152-61 268 8M116 196q106-73 213-31m363-19q121-30 211 19M134 282h17m-9-8v16M856 261h19m-10-9v18M208 92h12m-6-6v12M107 566l35-8m684 10 36-8",
  },
  terraces: {
    shape: "M65 483v-42h91v-39h85v83Zm691 2v-44h88v-43h91v88Z",
    ink: "M64 441h92m0-39h85m-176 63h176m516-24h87m0-43h91m-179 65h178M89 441v-39m0 17-13-11m13 20 16-11M181 402v-43m0 20-13-14m13 27 16-13M784 441v-42m0 20-13-14m13 27 15-11M884 397v-47m0 22-14-13m14 28 15-14M91 533h80m657 0h80",
  },
};

const indoor = new Set<Setting>(["atelier", "salon", "stage", "arcade-room"]);
const nightMotifs = new Set<Motif>([
  "moon",
  "constellation",
  "comets",
  "aurora",
]);

export const ConstructionBackdrop = memo(function ConstructionBackdrop({
  recipeId,
  framing,
}: {
  recipeId: string;
  framing: {
    minX: number;
    minY: number;
    width: number;
    height: number;
    viewBox?: string;
  };
}) {
  const profile = getConstructionSetting(recipeId);
  const landscape = LANDSCAPES[profile.setting];
  const penwork = PENWORK[profile.setting];
  const motif = MOTIFS[profile.motif];
  const theme = RECIPE_BY_ID.get(recipeId)?.theme ?? "objects";
  // The three sky compositions are intentional rather than random on rerenders.
  const composition =
    [...recipeId].reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 3;
  const skyShift = composition * 36;
  return (
    <g
      className="scene-backdrop"
      data-scene-decoration={theme}
      data-scene-setting={profile.setting}
      data-scene-vignette={profile.vignette}
      data-scene-motif={profile.motif}
      data-scene-drawing="inked-environment"
      transform={`translate(${framing.minX} ${framing.minY}) scale(${framing.width / 1000} ${framing.height / 700})`}
      strokeLinejoin="round"
      strokeLinecap="round"
      pointerEvents="none"
      aria-hidden="true"
    >
      <path
        d="M47 495 62 179 138 89 322 51 715 63 897 145 953 346 942 538 868 643 165 650 57 572Z"
        fill="var(--scene-sky, #e9e5d7)"
        opacity=".75"
      />
      {!indoor.has(profile.setting) && !nightMotifs.has(profile.motif) && (
        <circle
          cx={785 - skyShift}
          cy={162 + skyShift / 3}
          r={profile.setting === "desert" ? 64 : 43}
          fill="var(--scene-sun, #e4ba63)"
          opacity=".6"
        />
      )}
      {!indoor.has(profile.setting) && profile.setting !== "orbital" && (
        <path
          d={`M${115 + skyShift} 183h69l15-14h39l18 14h43m405 43h64l17-15h39l17 15h38`}
          fill="none"
          stroke="var(--scene-line, #a9a389)"
          strokeWidth="3.4"
          opacity=".65"
        />
      )}
      <path
        d={landscape.distant}
        fill="var(--scene-ground, #d8d3b8)"
        stroke="var(--scene-line, #a9a389)"
        strokeWidth="2.8"
        opacity=".6"
      />
      <path
        d={landscape.ground}
        fill="var(--scene-ground, #d8d3b8)"
        stroke="var(--scene-ink, #635c50)"
        strokeWidth="3.4"
        opacity=".78"
      />
      <path
        data-scene-pass="shadow-facets"
        d={penwork.shade}
        fill="var(--scene-ink, #635c50)"
        opacity=".18"
      />
      <path
        d={landscape.contours}
        fill="none"
        stroke="var(--scene-line, #a9a389)"
        strokeWidth="3"
        opacity=".8"
      />
      {motif.shape && (
        <path
          d={motif.shape}
          fill="var(--scene-sun, #e4ba63)"
          stroke="var(--scene-ink, #635c50)"
          strokeWidth="2.8"
          opacity=".58"
        />
      )}
      <g fill="none" stroke="var(--scene-ink, #635c50)" strokeWidth="3">
        <path d={landscape.detail} opacity=".64" />
        <path d={motif.ink} opacity=".82" />
        <path
          data-scene-pass="material-hatching"
          d={penwork.hatch}
          strokeWidth="2.4"
          opacity=".56"
        />
      </g>
    </g>
  );
});
