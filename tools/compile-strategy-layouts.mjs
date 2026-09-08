import { readFile, readdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { build } from "esbuild";

const root = fileURLToPath(new URL("../", import.meta.url));
const resultsDir = resolve(root, "playtest-results");
const requestedCompileIds = new Set((process.env.STRATEGY_COMPILE_IDS ?? "")
  .split(",")
  .map(Number)
  .filter((id) => Number.isInteger(id) && id >= 1 && id <= 100));
const requestedResultFiles = (process.env.STRATEGY_RESULT_FILES ?? "")
  .split(",")
  .map((name) => name.trim())
  .filter(Boolean);
const baselineStrategyPath = resolve(root, "src/core/campaignStrategyLayouts.ts");
const availableFiles = await readdir(resultsDir);
const files = requestedResultFiles.length
  ? requestedResultFiles
  : availableFiles.filter((name) => /^round57-strategy-layouts-[a-zA-Z0-9_-]+\.json$/.test(name));
const missingResultFiles = files.filter((name) => !availableFiles.includes(name));
if (missingResultFiles.length) {
  throw new Error(`Strategy layout compiler is missing requested result files: ${missingResultFiles.join(",")}`);
}
const selected = new Map();

const quality = (level) => (
  (level.layoutVersion ?? 0) * 3_000_000
  +
  (level.targetMatched ? 1_500_000 : 0)
  - (level.routeTargetError ?? 0) * 1_000
  +
  (level.deviceSafe ? 2_000_000 : 0)
  + (level.baselinePassed === false ? 0 : 1_000_000)
  - level.metrics.directClearable * 50_000
  + Math.min(level.route.repositionOverhead, 3) * 10_000
  + Math.min(level.route.turns, 3) * 2_000
  + Math.min(level.metrics.forcedRepositions, 3) * 700
  + Math.min(level.metrics.oneStepMovable, 2) * 300
  + Math.min(level.metrics.contacts, 6) * 100
  - (level.searchDepth ?? 0)
);

for (const file of files) {
  const report = JSON.parse(await readFile(resolve(resultsDir, file), "utf8"));
  for (const level of report.levels) {
    if (requestedCompileIds.size && !requestedCompileIds.has(level.levelId)) continue;
    if (requestedCompileIds.size && (
      level.baselinePassed === false || level.targetMatched !== true
    )) continue;
    const current = selected.get(level.levelId);
    if (!current || quality(level) > quality(current)) selected.set(level.levelId, level);
  }
}

const entries = [...selected.values()].sort((a, b) => a.levelId - b.levelId);
const requiredIds = requestedCompileIds.size
  ? [...requestedCompileIds].sort((a, b) => a - b)
  : Array.from({ length: 100 }, (_, index) => index + 1);
const missingIds = requiredIds.filter((id) => !selected.has(id));
if (missingIds.length) {
  throw new Error(`Strategy layout compiler is missing required levels: ${missingIds.join(",")}`);
}
if (!requestedCompileIds.size && entries.length !== 100) {
  throw new Error(`Strategy layout compiler expected 100 levels, found ${entries.length}`);
}
const rejectedIds = requiredIds.filter((id) => {
  const level = selected.get(id);
  return level.baselinePassed === false
    || (requestedCompileIds.size > 0 && level.targetMatched !== true);
});
if (rejectedIds.length) {
  throw new Error(`Strategy layout compiler rejected unmatched target levels: ${rejectedIds.join(",")}`);
}
const records = Object.fromEntries(entries.map((level) => [level.levelId, {
  parMoves: level.route.minimumDrags,
  positions: level.positions,
}]));
if (requestedCompileIds.size) {
  const baselineSource = await readFile(baselineStrategyPath, "utf8");
  const baselineMatch = baselineSource.match(
    /export const STRATEGY_LAYOUT_OVERRIDES:[^=]+=(\s*\{[\s\S]*?\});\s*\n\s*export const applyStrategyLayoutOverride/,
  );
  if (!baselineMatch) {
    throw new Error(`Targeted strategy compile could not read the current baseline at ${baselineStrategyPath}`);
  }
  const baselineRecords = JSON.parse(baselineMatch[1]);
  for (let id = 1; id <= 100; id += 1) {
    if (requestedCompileIds.has(id)) continue;
    if (!baselineRecords[id]) throw new Error(`Current strategy baseline is missing Lv${id}`);
    records[id] = baselineRecords[id];
  }

  const bundle = await build({
    stdin: {
      contents: `import { LEVELS } from "./src/core/levels.ts"; export { LEVELS };`,
      resolveDir: root,
      sourcefile: "strategy-layout-compile-audit.ts",
      loader: "ts",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
  });
  const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`;
  const { LEVELS } = await import(moduleUrl);
  const mismatchedIds = [...requestedCompileIds].filter((id) => {
    const actualIds = LEVELS[id - 1].blocks.map((block) => block.id).sort();
    const candidateIds = Object.keys(records[id].positions).sort();
    return JSON.stringify(actualIds) !== JSON.stringify(candidateIds);
  });
  if (mismatchedIds.length) {
    throw new Error(`Strategy layout candidates do not match current block IDs: ${mismatchedIds.join(",")}`);
  }
}
if (Object.keys(records).length !== 100) {
  throw new Error(`Strategy layout compiler expected 100 output records, found ${Object.keys(records).length}`);
}
const source = `import type { LevelSpec } from "./types";\n\n`
  + `interface StrategyLayoutOverride {\n  parMoves: number;\n  positions: Record<string, readonly [number, number]>;\n}\n\n`
  + `// Generated by tools/compile-strategy-layouts.mjs from reversible in-board\n`
  + `// scrambles. Mechanics, colors, layers, counters, devices and silhouettes\n`
  + `// remain authored; only opening block positions and validated par change.\n`
  + `export const STRATEGY_LAYOUT_OVERRIDES: Record<number, StrategyLayoutOverride> = ${JSON.stringify(records, null, 2)};\n\n`
  + `export const applyStrategyLayoutOverride = (level: LevelSpec): LevelSpec => {\n`
  + `  const override = STRATEGY_LAYOUT_OVERRIDES[level.id];\n`
  + `  if (!override) return level;\n`
  + `  const blockIds = new Set(level.blocks.map((block) => block.id));\n`
  + `  if (blockIds.size !== Object.keys(override.positions).length\n`
  + `    || Object.keys(override.positions).some((blockId) => !blockIds.has(blockId))) return level;\n`
  + `  const playable = new Set((level.playable ?? []).map(([x, y]) => \`${'${x},${y}'}\`));\n`
  + `  const invalidPlacement = level.blocks.some((block) => {\n`
  + `    const [x, y] = override.positions[block.id];\n`
  + `    return block.shape.some(([dx, dy]) => !playable.has(\`${'${x + dx},${y + dy}'}\`));\n`
  + `  });\n`
  + `  if (invalidPlacement) return level;\n`
  + `  return {\n`
  + `    ...level,\n`
  + `    parMoves: override.parMoves,\n`
  + `    blocks: level.blocks.map((block) => {\n`
  + `      const position = override.positions[block.id];\n`
  + `      return position ? { ...block, x: position[0], y: position[1] } : block;\n`
  + `    }),\n`
  + `  };\n`
  + `};\n`;
await writeFile(resolve(root, "src/core/campaignStrategyLayouts.ts"), source, "utf8");
const misses = entries
  .filter((level) => (!requestedCompileIds.size || requestedCompileIds.has(level.levelId)) && level.baselinePassed === false)
  .map((level) => level.levelId);
const scope = requestedCompileIds.size ? `targeted levels ${[...requestedCompileIds].sort((a, b) => a - b).join(",")}` : "all levels";
console.log(`Compiled 100 strategy layouts (${scope}); ${misses.length} still need iteration${misses.length ? `: ${misses.join(",")}` : ""}.`);
