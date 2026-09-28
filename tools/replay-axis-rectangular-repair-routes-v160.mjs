import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const candidates = {
  54: "deliverables/remake31-200-v145-20260924/batches/lv051-060/root54/enriched54-1790316779122.json",
  56: "deliverables/remake31-200-v145-20260924/batches/lv051-060/agent55-57/candidate56-1790251909382.json",
  63: "deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/bound-candidate63-1790248803816.json",
  89: "deliverables/remake81-90-v146-20260924/agent88-90/candidate89-enriched-1790264221432.json",
  101: "deliverables/remake101-110-v146-20260924/proof101-v152/enriched101-1790326396635.json",
  118: "deliverables/revised-formal-progress-v111-2026-09-22T18-08-56-346Z/level-118.json",
  135: "deliverables/revised-design-additions-v190-2026-09-22T07-51-48-834Z/levels/level-135.json",
  172: "deliverables/revised-formal-progress-v111-2026-09-22T18-08-56-346Z/level-172.json",
};
const source = `
  export { LEVELS } from ${JSON.stringify(resolve(root, "src/core/levels.ts"))};
  export { replayRevisedRoute } from ${JSON.stringify(resolve(root, "src/core/revisedLevelSearch.ts"))};
`;
const bundle = await build({ stdin: { contents: source, resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const temp = resolve(root, ".codex-temp", `axis-replay-${process.pid}.mjs`);
await writeFile(temp, bundle.outputFiles[0].text, "utf8");
const api = await import(pathToFileURL(temp).href);
const rows = [];
for (const [idText, relative] of Object.entries(candidates)) {
  const id = Number(idText);
  const raw = JSON.parse(await readFile(resolve(root, relative), "utf8"));
  const drags = raw.drags ?? raw.route ?? raw.result?.drags ?? raw.level?.drags;
  const level = api.LEVELS.find((candidate) => candidate.id === id);
  const replay = Array.isArray(drags) ? api.replayRevisedRoute(level, drags) : null;
  rows.push({ id, source: relative, sourceLevelSha256: raw.formalLevelSha256 ?? raw.levelSha256 ?? null, drags: Array.isArray(drags) ? drags.length : null, replay });
}
const out = resolve(root, "deliverables/axis-rectangular-repair-solver-20260926/route-replay-v160.json");
await writeFile(out, `${JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ out, rows }, null, 2));
