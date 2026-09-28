import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const ids = (process.env.AXIS_REPAIR_IDS ?? "54,56,63,89,101,118,135,172,194").split(",").map((value) => Number(value.trim())).filter(Number.isFinite);
const maxStates = Number(process.env.AXIS_REPAIR_MAX_STATES ?? 250_000);
const maxMilliseconds = Number(process.env.AXIS_REPAIR_TIMEOUT_MS ?? 20_000);
const maxTransitions = Number(process.env.AXIS_REPAIR_MAX_TRANSITIONS ?? 500_000);
const outputDir = resolve(root, process.env.AXIS_REPAIR_OUTPUT ?? "deliverables/axis-rectangular-repair-solver-20260926");
const source = `
  export { LEVELS } from ${JSON.stringify(resolve(root, "src/core/levels.ts"))};
  export { validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
  export { searchRevisedLevel, replayRevisedRoute } from ${JSON.stringify(resolve(root, "src/core/revisedLevelSearch.ts"))};
`;
const bundle = await build({ stdin: { contents: source, resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const modulePath = resolve(outputDir, `.axis-repair-api-${process.pid}.mjs`);
await mkdir(outputDir, { recursive: true });
await writeFile(modulePath, bundle.outputFiles[0].text, "utf8");
const api = await import(pathToFileURL(modulePath).href);
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === "object"
  ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
const sha = (value) => createHash("sha256").update(JSON.stringify(canonical(value))).digest("hex");
const rows = [];
for (const id of ids) {
  const level = api.LEVELS.find((candidate) => candidate.id === id);
  if (!level) throw new Error(`Missing Lv${id}`);
  try {
    api.validateLevel(level);
    const result = api.searchRevisedLevel(level, { maxStates, maxDragStates: 1024, maxTransitions, maxMilliseconds });
    const replay = result.witnessFound ? api.replayRevisedRoute(level, result.drags) : result.replay ?? null;
    rows.push({ levelId: id, semanticSha256: sha(level), status: result.status, termination: result.termination,
      exploredStates: result.exploredStates, discoveredStates: result.discoveredStates, attemptedTransitions: result.attemptedTransitions,
      witnessFound: result.witnessFound, lowerBoundCertified: result.lowerBoundCertified, replay, reasons: result.reasons });
  } catch (error) {
    rows.push({ levelId: id, semanticSha256: sha(level), status: "error", termination: "error", error: error instanceof Error ? error.stack ?? error.message : String(error) });
  }
}
const report = { generatedAt: new Date().toISOString(), ruleVersion: "1.60.0", ids, settings: { maxStates, maxMilliseconds, maxTransitions }, campaignSemanticSha256: sha(api.LEVELS), rows };
const reportPath = resolve(outputDir, "report-v160.json");
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ reportPath, campaignSemanticSha256: report.campaignSemanticSha256, rows }, null, 2));
