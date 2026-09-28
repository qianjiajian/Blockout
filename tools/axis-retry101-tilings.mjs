import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const outDir = resolve(root, "deliverables/axis-retry-20260926/agent101");
await mkdir(outDir, { recursive: true });
const src = `
  export { LEVELS } from ${JSON.stringify(resolve(root, "src/core/levels.ts"))};
  export { validateLevel } from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))};
  export { searchRevisedLevel, replayRevisedRoute } from ${JSON.stringify(resolve(root, "src/core/revisedLevelSearch.ts"))};
  export { FORMAL_BLOCK_SHAPES, matchFormalBlockShapeForLevel } from ${JSON.stringify(resolve(root, "src/game/formalBlockShapes.ts"))};
`;
const bundle = await build({ stdin: { contents: src, resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const modulePath = resolve(outDir, `.api-${process.pid}.mjs`);
await writeFile(modulePath, bundle.outputFiles[0].text, "utf8");
const api = await import(pathToFileURL(modulePath).href);

const raw = JSON.parse(await (await import("node:fs/promises")).readFile(resolve(root, "deliverables/remake101-110-v146-20260924/proof101-v152/enriched101-1790326396635.json"), "utf8"));
const rawDrags = raw.drags;
const rawHidden = new Map(raw.level.blocks.filter((b) => b.shutterId === "r147-101-cover4").map((b) => [b.id, b]));
const live = api.LEVELS.find((l) => l.id === 101);
if (!live) throw new Error("missing Lv101");

const pointKey = ([x, y]) => `${x},${y}`;
const cells = (b) => b.shape.map(([x, y]) => [b.x + x, b.y + y]);
const inRegion = (shape, x, y) => shape.every(([dx, dy]) => x + dx >= 0 && x + dx < 7 && y + dy >= 6 && y + dy < 10);
const formal = api.FORMAL_BLOCK_SHAPES;
const shapeByCount = new Map();
for (const def of formal) {
  const n = def.cells.length;
  if (!shapeByCount.has(n)) shapeByCount.set(n, []);
  shapeByCount.get(n).push(def.cells);
}
const placements = (block) => {
  const seen = new Set();
  const out = [];
  for (const shape of shapeByCount.get(block.shape.length) ?? []) {
    for (let y = 6; y < 10; y += 1) for (let x = 0; x < 7; x += 1) {
      if (!inRegion(shape, x, y)) continue;
      const abs = shape.map(([dx, dy]) => [x + dx, y + dy]);
      const key = `${x},${y}:${abs.map(pointKey).sort().join(";")}`;
      if (seen.has(key)) continue;
      seen.add(key); out.push({ x, y, shape });
    }
  }
  return out;
};

const fixedIds = ["r147-101-cover4-6", "r147-101-cover4-2", "r147-101-cover4-4", "r147-101-cover4-5", "r147-101-cover4-3", "r147-101-cover4-1"];
const variableIds = ["r147-101-cover4-7", "r147-101-cover4-8", "r147-101-cover4-0", "r147-101-cover4-9"];
const fixed = fixedIds.map((id) => rawHidden.get(id));
const fixedOcc = new Set(fixed.flatMap(cells).map(pointKey));
const regionCells = new Set(Array.from({ length: 4 }, (_, j) => Array.from({ length: 7 }, (_, i) => `${i},${j + 6}`)).flat());
if (fixedOcc.size !== fixed.flatMap(cells).length) throw new Error("raw fixed overlap");

const variants = variableIds.map((id) => placements(rawHidden.get(id)));
const rows = [];
let examined = 0;
const dfs = async (i, occ, chosen) => {
  if (rows.some((r) => r.result?.witnessFound)) return;
  if (i === variableIds.length) {
    examined += 1;
    if (occ.size !== 28) return;
    const level = {
      ...live,
      blocks: live.blocks.map((b) => {
        const p = chosen.get(b.id);
        return p ? { ...b, x: p.x, y: p.y, shape: p.shape.map((cell) => [...cell]) } : b;
      }),
    };
    try {
      api.validateLevel(level);
      for (const b of level.blocks) {
        const m = api.matchFormalBlockShapeForLevel(cells(b), 101);
        if (!m || m.quarterTurns !== 0) throw new Error(`non-native ${b.id}`);
      }
      const routeReplay = api.replayRevisedRoute(level, rawDrags);
      rows.push({ index: examined, routeReplay, blocks: variableIds.map((id) => ({ id, ...chosen.get(id) })) });
      const result = routeReplay.valid && routeReplay.complete ? { status: "witness", termination: "witness", witnessFound: true, drags: rawDrags, replay: routeReplay } : api.searchRevisedLevel(level, { maxStates: 20_000, maxDragStates: 512, maxTransitions: 300_000, maxMilliseconds: 800 });
      rows[rows.length - 1].result = { status: result.status, termination: result.termination, exploredStates: result.exploredStates, discoveredStates: result.discoveredStates, attemptedTransitions: result.attemptedTransitions, witnessFound: result.witnessFound, replay: result.replay };
      if (result.witnessFound) {
        rows[rows.length - 1].drags = result.drags;
        rows[rows.length - 1].level = level;
        await writeFile(resolve(outDir, "candidate101-witness.json"), `${JSON.stringify({ level, drags: result.drags, result }, null, 2)}\n`, "utf8");
      }
    } catch (error) {
      rows.push({ index: examined, error: error instanceof Error ? error.message : String(error), blocks: variableIds.map((id) => ({ id, ...chosen.get(id) })) });
    }
    return;
  }
  const id = variableIds[i];
  for (const p of variants[i]) {
    const abs = p.shape.map(([dx, dy]) => [p.x + dx, p.y + dy]);
    if (abs.some((cell) => occ.has(pointKey(cell)))) continue;
    const next = new Set(occ); for (const cell of abs) next.add(pointKey(cell));
    const remaining = variableIds.slice(i + 1).reduce((s, other) => s + rawHidden.get(other).shape.length, 0);
    if (next.size + remaining < 28) continue;
      chosen.set(id, p); await dfs(i + 1, next, chosen); chosen.delete(id);
  }
};
const chosen = new Map(fixed.map((b) => [b.id, { x: b.x, y: b.y, shape: b.shape }]));
await dfs(0, fixedOcc, chosen);
const report = { generatedAt: new Date().toISOString(), levelId: 101, fixedIds, variableIds, examined, rows };
await writeFile(resolve(outDir, "tiling-search.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ examined, rows: rows.length, witness: rows.find((r) => r.result?.witnessFound)?.index ?? null, report: resolve(outDir, "tiling-search.json") }, null, 2));
