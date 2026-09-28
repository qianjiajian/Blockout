import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const out = resolve(root, "deliverables/axis-retry-20260926/agent63");
await mkdir(out, { recursive: true });
const source = `export {LEVELS} from ${JSON.stringify(resolve(root, "src/core/levels.ts"))}; export {FORMAL_BLOCK_SHAPES,matchFormalBlockShapeForLevel} from ${JSON.stringify(resolve(root, "src/game/formalBlockShapes.ts"))};`;
const bundle = await build({ stdin: { contents: source, resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const modulePath = resolve(out, `.tiling-api-${process.pid}.mjs`);
await writeFile(modulePath, bundle.outputFiles[0].text);
const api = await import(pathToFileURL(modulePath).href);
const level = api.LEVELS.find((candidate) => candidate.id === 63);
const variableIds = ["v146-63-opening-14", "v146-63-opening-15", "v146-63-opening-17", "v146-63-opening-5", "v146-63-opening-6"];
const fixedIds = level.blocks.map((block) => block.id).filter((id) => !variableIds.includes(id));
const fixed = level.blocks.filter((block) => fixedIds.includes(block.id));
const pointKey = ([x, y]) => `${x},${y}`;
const shapeCells = (block, p = block) => p.shape.map(([dx, dy]) => [p.x + dx, p.y + dy]);
const occupied = new Set(fixed.flatMap((block) => shapeCells(block)).map(pointKey));
const shapeMap = new Map();
for (const definition of api.FORMAL_BLOCK_SHAPES) {
  if (!shapeMap.has(definition.cells.length)) shapeMap.set(definition.cells.length, []);
  shapeMap.get(definition.cells.length).push(definition.cells);
}
const placements = (block) => {
  const result = [];
  const seen = new Set();
  for (const shape of shapeMap.get(block.shape.length) ?? []) for (let y = 0; y < 8; y += 1) for (let x = 0; x < 6; x += 1) {
    if (shape.some(([dx, dy]) => x + dx < 0 || x + dx >= 6 || y + dy < 0 || y + dy >= 8)) continue;
    const cells = shape.map(([dx, dy]) => [x + dx, y + dy]);
    if (cells.some((cell) => occupied.has(pointKey(cell)))) continue;
    const key = `${x},${y}:${cells.map(pointKey).sort().join(";")}`;
    if (seen.has(key)) continue;
    seen.add(key); result.push({ x, y, shape: shape.map((cell) => [...cell]) });
  }
  return result;
};
const candidates = [];
const variable = variableIds.map((id) => level.blocks.find((block) => block.id === id));
const ordered = [variable[1], variable[0], variable[2], variable[3], variable[4]];
const shapes15 = [[ [0, 0], [0, 1], [1, 1] ]];
const allPlacements = ordered.map((block) => block.id === "v146-63-opening-15"
  ? shapes15.flatMap((shape) => Array.from({ length: 8 }, (_, y) => Array.from({ length: 6 }, (_, x) => ({ x, y, shape }))).flat()).filter((p) => p.x + 1 < 6 && p.y + 1 < 8 && p.shape.every(([dx, dy]) => !occupied.has(`${p.x + dx},${p.y + dy}`)))
  : placements(block));
const dfs = (i, used, picked) => {
  if (i === ordered.length) {
    const all = new Set([...occupied, ...used]);
    if (all.size !== 48) return;
    candidates.push({ blocks: Object.fromEntries(ordered.map((block) => [block.id, picked.get(block.id)])) });
    return;
  }
  const block = ordered[i];
  for (const placement of allPlacements[i]) {
    const cells = placement.shape.map(([dx, dy]) => [placement.x + dx, placement.y + dy]);
    if (cells.some((cell) => used.has(pointKey(cell)))) continue;
    const next = new Set(used); for (const cell of cells) next.add(pointKey(cell));
    picked.set(block.id, placement); dfs(i + 1, next, picked); picked.delete(block.id);
  }
};
dfs(0, new Set(), new Map());
const result = { levelId: 63, variableIds, candidateCount: candidates.length, candidates };
await writeFile(resolve(out, "l3-tilings.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify({ candidateCount: candidates.length, out: resolve(out, "l3-tilings.json") }, null, 2));
