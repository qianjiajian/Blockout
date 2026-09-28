import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { build } from "esbuild";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const source = `export {validateLevel} from ${JSON.stringify(resolve(root, "src/core/PuzzleModel.ts"))}; export {matchFormalBlockShapeForLevel} from ${JSON.stringify(resolve(root, "src/game/formalBlockShapes.ts"))};`;
const bundle = await build({ stdin: { contents: source, resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const modulePath = resolve(root, "deliverables/axis-retry-20260926/agent101/.audit-api.mjs");
await writeFile(modulePath, bundle.outputFiles[0].text);
const api = await import(pathToFileURL(modulePath).href);
const candidate = JSON.parse(await readFile(resolve(root, "deliverables/axis-retry-20260926/agent101/candidate101-route.json"), "utf8"));
const level = candidate.level;
api.validateLevel(level);
const shapeCells = (block) => block.shape.map(([dx, dy]) => [block.x + dx, block.y + dy]);
const native = level.blocks.map((block) => {
  const match = api.matchFormalBlockShapeForLevel(shapeCells(block), level.id);
  return { id: block.id, shapeCells: block.shape.length, match: match ? { shapeId: match.shapeId, quarterTurns: match.quarterTurns } : null };
});
const nativeFailures = native.filter((entry) => !entry.match || entry.match.quarterTurns !== 0);
const hidden = level.blocks.filter((block) => block.shutterId === "r147-101-cover4");
const occupied = new Map();
for (const block of hidden) for (const cell of shapeCells(block)) {
  const key = cell.join(",");
  if (occupied.has(key)) throw new Error(`hidden overlap ${key}: ${occupied.get(key)} / ${block.id}`);
  occupied.set(key, block.id);
}
const expected = new Set();
for (let y = 6; y < 10; y += 1) for (let x = 0; x < 7; x += 1) expected.add(`${x},${y}`);
const missing = [...expected].filter((key) => !occupied.has(key));
const outside = [...occupied.keys()].filter((key) => !expected.has(key));
if (missing.length || outside.length) throw new Error(`hidden coverage mismatch missing=${missing.join(";")} outside=${outside.join(";")}`);
const report = { levelId: 101, validLevel: true, nativeBlockCount: native.length, nativeFailures, hiddenBlockCount: hidden.length, hiddenCellCount: occupied.size, hiddenCoverage: { expected: expected.size, missing, outside }, replay: candidate.replay, drags: candidate.drags?.length ?? candidate.route?.length ?? null };
await writeFile(resolve(root, "deliverables/axis-retry-20260926/agent101/candidate101-audit.json"), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
