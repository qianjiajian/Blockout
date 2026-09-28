import { build } from "esbuild";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
const root = process.cwd(); const out = resolve(root, "deliverables/axis-retry-20260926/agent63"); await mkdir(out, { recursive: true });
const source = `export {LEVELS} from ${JSON.stringify(resolve(root, "src/core/levels.ts"))}; export {searchRevisedLevel,replayRevisedRoute} from ${JSON.stringify(resolve(root, "src/core/revisedLevelSearch.ts"))};`;
const bundle = await build({ stdin: { contents: source, resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const modulePath = resolve(out, `.search-api-${process.pid}.mjs`); await writeFile(modulePath, bundle.outputFiles[0].text); const api = await import(pathToFileURL(modulePath).href);
const tilings = JSON.parse(await readFile(resolve(out, "l3-tilings.json"), "utf8")); const base = api.LEVELS.find((level) => level.id === 63); const rows = [];
for (let index = 0; index < tilings.candidates.length; index += 1) {
  const candidate = tilings.candidates[index];
  const level = { ...base, blocks: base.blocks.map((block) => candidate.blocks[block.id] ? { ...block, ...candidate.blocks[block.id] } : block) };
  const result = api.searchRevisedLevel(level, { maxStates: 60_000, maxDragStates: 1024, maxTransitions: 1_000_000, maxMilliseconds: 2000 });
  rows.push({ index, status: result.status, termination: result.termination, exploredStates: result.exploredStates, discoveredStates: result.discoveredStates, attemptedTransitions: result.attemptedTransitions, witnessFound: result.witnessFound });
  if (result.witnessFound) { await writeFile(resolve(out, "candidate63-l3-route.json"), `${JSON.stringify({ level, drags: result.drags, result, tiling: candidate }, null, 2)}\n`); break; }
}
await writeFile(resolve(out, "l3-search.json"), `${JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)}\n`);
console.log(JSON.stringify({ rows, witness: rows.find((row) => row.witnessFound)?.index ?? null }, null, 2));
