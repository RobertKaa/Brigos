import { createServer } from "vite";
const server = await createServer({
  server: { middlewareMode: true, hmr: false, watch: null, ws: false },
  appType: "custom",
});
try {
  const { RECIPES, MODELS } = await server.ssrLoadModule(
    "/src/game/catalog.ts",
  );
  const { validateAssembly } = await server.ssrLoadModule(
    "/src/game/assemblyValidation.ts",
  );
  let issueCount = 0;
  const requested = process.argv.slice(2);
  for (const id of requested)
    if (!RECIPES.some((plan) => plan.id === id))
      throw new Error(`Plan inconnu : ${id}`);
  for (const plan of RECIPES.filter(
    (p) =>
      !process.argv.slice(2).length || process.argv.slice(2).includes(p.id),
  )) {
    const issues = validateAssembly(plan, MODELS, {
      checkInstructionOrder: true,
    });
    issueCount += issues.length;
    console.log(
      plan.id,
      plan.placements.length,
      JSON.stringify(
        issues.map((issue) => ({
          ...issue,
          part: plan.placements.find((p) => p.key === issue.placementKey),
          other: plan.placements.find((p) => p.key === issue.otherKey),
        })),
      ),
    );
  }
  if (issueCount) process.exitCode = 1;
} finally {
  await server.close();
}
