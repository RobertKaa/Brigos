import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { createServer } from "vite";

const root = fileURLToPath(new URL("../", import.meta.url));
const notes = {
  tree: "Trois couronnes radiales en volume, de 6 à 4 puis 2 tenons, terminées par une pointe d’un tenon ; les branches se resserrent autour du tronc.",
  lighthouse:
    "Piliers de lanterne décalés sur les côtés pour dégager la lumière, sans augmenter le nombre de pièces.",
  dinosaur:
    "Quatre pattes portent un corps horizontal ; le cou dressé, la queue effilée et les yeux latéraux rendent le sauropode lisible.",
  spaceship:
    "Nez allongé, ailes étagées symétriques, cockpit sombre et dérive arrière ; silhouette resserrée avec moins de pièces.",
  mushroom:
    "Chapeau rond lissé et bombé, quatre pois clairs et pied élancé ; abandon du chapeau en gradins carrés.",
  penguin:
    "Silhouette debout, ailes distinctes et yeux sur la face verticale claire, au-dessus du bec et des pieds orange.",
  duck: "Tête détachée du corps, yeux verticaux, bec saillant et dos profilé par des pentes.",
  turtle:
    "Carapace au-dessus de quatre pattes ; tête avancée et basse, yeux sur la face et petite queue.",
  boat: "Pentes de proue et de poupe alignées sur la longueur de la coque ; bleu cohérent sur la coque.",
  airplane:
    "Fuselage de 2 × 10 tenons, envergure de 8, nez incliné vers l’avant et dérive verticale sur l’empennage arrière.",
  mailbox:
    "Fente sombre visible sous le petit toit corail, au-dessus du pied graphite.",
  hourglass:
    "Montants arrondis plus fins ; sable supérieur évasé de 1 à 3 puis 5 tenons, relié au volume inférieur par un goulot étroit.",
  piano:
    "Véritable piano droit à caisse haute sur quatre pieds, six touches claires longues et trois touches noires plus courtes.",
  snowman:
    "Yeux placés sur la face verticale et chapeau détaché de la silhouette blanche ; nez et écharpe restent visibles.",
  owl: "Face claire à grands yeux sombres, bec central et deux aigrettes pointues ; regard lisible sur la face verticale.",
  cup: "Tasse carrée remplie de café, avec une vraie anse en boucle verticale reliée au bord et au pied.",
  sailboat:
    "Voile triangulaire haute à quatre rangs et bord diagonal ; les plaques relient réellement chaque rang au mât.",
  "harbour-lighthouse":
    "Lanterne haute de 12 unités plaque, piliers latéraux et toit pyramidal réalisé avec des pièces actives.",
  "star-observatory":
    "Coupole arrondie et télescope horizontal supporté, avec objectif bleu distinct au sommet de l’observatoire.",
  "travellers-station":
    "Horloge construite en mosaïque sur les deux faces du pavillon, au-dessus du faîtage de la gare.",
  "cape-fort":
    "Quatre tours à baies arquées remplacent les vitrages d’immeuble ; remparts crénelés et passage voûté préservent la silhouette fortifiée.",
  "terraced-waterfall":
    "Relief de pierre continu, trois chutes larges et fines séparées par des plans d’eau horizontaux et des lèvres d’écume ; bassin inférieur fleuri.",
  "cargo-shuttle":
    "Coque et ailes resserrées autour d’un nez incliné, d’un cockpit sombre et de deux réacteurs ; vue initiale tournée pour lire l’avant.",
  "ocean-schooner":
    "Coque effilée et deux grandes voiles triangulaires ; les petites pentes lissent les diagonales de leurs bords.",
  "concert-grand-piano":
    "Piano à queue effilé sur trois pieds, clavier de dix touches, cordes dorées et couvercle ouvert sur le côté.",
  "tropical-conservatory":
    "Quatre fermes franchement inclinées reliées par un long faîtage ; plus de la moitié du toit reste ouverte pour voir les plantes.",
};

const canonicalRows = (rows) =>
  rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b), "en"));
const geometry = (recipe) =>
  JSON.stringify(
    canonicalRows(
      recipe.placements.map((p) => [
        p.modelId,
        p.colorId ?? null,
        p.x,
        p.y,
        p.z,
        p.rotation,
      ]),
    ),
  );
const materials = (recipe) =>
  JSON.stringify(
    canonicalRows(
      recipe.requirements.map((r) => [
        r.modelId ?? null,
        r.family ?? null,
        r.colorId ?? null,
        r.quantity,
      ]),
    ),
  );
const canonicalObject = (value) =>
  Array.isArray(value)
    ? value.map(canonicalObject)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, canonicalObject(value[key])]),
        )
      : value;
const hash = (value) =>
  createHash("sha256").update(JSON.stringify(value)).digest("hex");
const cell = (value) =>
  String(value).replaceAll("|", "\\|").replaceAll("\n", " ");
const code = (value) =>
  String.fromCharCode(96) + value + String.fromCharCode(96);
const count = (recipe) =>
  recipe.requirements.reduce((sum, r) => sum + r.quantity, 0);
const number = (value) => value.toLocaleString("fr-FR");

// SSR modules are evaluated without opening an HTTP or WebSocket listener.
const server = await createServer({
  root,
  configFile: false,
  appType: "custom",
  optimizeDeps: { noDiscovery: true, include: [] },
  server: { middlewareMode: true, hmr: false, watch: null, ws: false },
});
try {
  const { RECIPES, MODELS } = await server.ssrLoadModule(
    "/src/game/catalog.ts",
  );
  const { V5_RECIPE_SNAPSHOTS } = await server.ssrLoadModule(
    "/src/game/v5RecipeSnapshots.ts",
  );
  const { CURRENT_SAVE_VERSION } = await server.ssrLoadModule(
    "/src/game/releaseVersion.ts",
  );
  const { validateAssembly } = await server.ssrLoadModule(
    "/src/game/assemblyValidation.ts",
  );
  if (CURRENT_SAVE_VERSION < 6)
    throw new Error(
      "Le rapport final exige les plans revus activés à partir de la sauvegarde v6.",
    );
  if (RECIPES.length !== 65 || Object.keys(V5_RECIPE_SNAPSHOTS).length !== 65)
    throw new Error(
      "Le rapport exige les 65 identités publiées et leurs instantanés historiques.",
    );
  const digests = JSON.parse(
    await fs.readFile(
      path.join(root, "src/game/fixtures/published-v5-digests.json"),
      "utf8",
    ),
  );
  for (const digest of digests)
    if (
      hash(canonicalObject(V5_RECIPE_SNAPSHOTS[digest.id])) !== digest.content
    )
      throw new Error(`Instantané historique altéré : ${digest.id}.`);

  const current = new Map(RECIPES.map((recipe) => [recipe.id, recipe]));
  const records = Object.values(V5_RECIPE_SNAPSHOTS).map((before) => {
    const after = current.get(before.id);
    if (!after) throw new Error(`Identité historique retirée : ${before.id}.`);
    if (
      count(before) !== before.placements.length ||
      count(after) !== after.placements.length
    )
      throw new Error(`Nomenclature incohérente : ${before.id}.`);
    const issues = validateAssembly(after, MODELS, {
      checkInstructionOrder: true,
    });
    if (issues.length)
      throw new Error(
        `Assemblage invalide ${before.id} : ${JSON.stringify(issues)}.`,
      );
    const geometryChanged = geometry(before) !== geometry(after);
    const materialsChanged = materials(before) !== materials(after);
    const changed = geometryChanged || materialsChanged;
    const cameraChanged =
      (before.previewRotation ?? 0) !== (after.previewRotation ?? 0);
    let note = changed ? notes[before.id] : "Assemblage conservé après revue.";
    if (changed && !note)
      throw new Error(`Note visuelle manquante pour ${before.id}.`);
    if (before.id === "house" || before.id === "castle")
      note =
        "Assemblage conservé ; sa porte bénéficie de la correction du rendu commun.";
    if (cameraChanged)
      note += ` Caméra initiale : ${after.previewRotation ?? 0}° ; ce réglage seul ne déclenche aucun démontage.`;
    if (before.name !== after.name)
      note = `Ancien nom : « ${before.name} ». ${note}`;
    return {
      id: before.id,
      name: after.name,
      before: count(before),
      after: count(after),
      changed,
      geometryChanged,
      materialsChanged,
      cameraChanged,
      note,
    };
  });
  const revised = records.filter((record) => record.changed).length;
  const beforeTotal = records.reduce((sum, record) => sum + record.before, 0);
  const afterTotal = records.reduce((sum, record) => sum + record.after, 0);
  const rows = records
    .map(
      (r) =>
        `| ${cell(r.name)} (${code(r.id)}) | ${number(r.before)} | ${number(r.after)} | ${r.changed ? "Révisé" : "Conservé"} | ${cell(r.note)} |`,
    )
    .join("\n");
  const document = `# Revue des 65 constructions — v5 vers v6

La revue conserve les 65 identités publiées : **${revised} plans révisés** et **${65 - revised} plans conservés**. La bibliothèque représente ${number(beforeTotal)} Brigos en v5 et ${number(afterTotal)} Brigos après correction, pour un exemplaire de chaque plan. Les comptages viennent des exigences et correspondent exactement aux pièces placées.

Les plans marqués **Révisé** ont une géométrie ou une nomenclature différente. Lors de la migration v5→v6, leurs créations exposées sont démontées et leurs références exactes, couleurs comprises, sont restituées à l’inventaire. Les créations marquées **Conservé** restent exposées. L’XP est recalculée à partir de l’exposition restante ; les pièces de monnaie, boîtes, découvertes, récompenses déjà réclamées et ouvertures en cours sont préservées.

Les noms, descriptions, clés et ordre des pièces ne provoquent aucun démontage. Le réglage ${code("previewRotation")} change seulement la caméra initiale : il préserve également création, inventaire et XP. Les portes bénéficient d’une correction du rendu commun, notamment celles de la maison et du château, sans changement de leur assemblage.

La migration est enregistrée immédiatement dans une transaction IndexedDB ; plusieurs onglets ne doublent pas la restitution. Le switch unique ${code("CURRENT_SAVE_VERSION")} reste à 5 pendant l’intégration des fichiers, puis passe à 6 une fois la livraison complète. Les actions React attendent un état de la version active avant d’utiliser les plans revus.

| Plan | Brigos v5 | Brigos v6 | État | Revue visuelle |
| --- | ---: | ---: | --- | --- |
${rows}

Les 65 plans du tableau passent les contrôles de collisions, d’attache sur tenons, de connectivité finale et d’ordre de montage. Les 65 instantanés historiques correspondent aux empreintes SHA256 complètes figées avant correction.

Ce rapport est généré par ${code("node scripts/generate-construction-review.mjs")} à partir du catalogue v6 et du snapshot v5 indépendant. Le script évalue les modules en SSR, sans ouvrir de serveur HTTP ni WebSocket, et refuse de produire le tableau si une identité, une empreinte, une nomenclature ou un assemblage est incohérent.
`;
  await fs.mkdir(path.join(root, "docs"), { recursive: true });
  await fs.writeFile(
    path.join(root, "docs/construction-review.md"),
    document,
    "utf8",
  );
  console.log(
    JSON.stringify({
      plans: records.length,
      revised,
      kept: 65 - revised,
      piecesBefore: beforeTotal,
      piecesAfter: afterTotal,
      output: path.join(root, "docs/construction-review.md"),
    }),
  );
} finally {
  await server.close();
}
