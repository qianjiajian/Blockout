import { readFile, mkdir, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { build } from "esbuild";

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const split = arg.indexOf("=");
  if (split < 0 || !arg.startsWith("--")) throw new Error(`Expected --name=value: ${arg}`);
  return [arg.slice(2, split), arg.slice(split + 1)];
}));
if (!args.baseline) throw new Error("Supply --baseline=<saved original formalBlockShapes.ts>");
const root = process.cwd();
const currentPath = resolve(root, "src/game/formalBlockShapes.ts");
const baselinePath = resolve(root, args.baseline);
const baselineSource = await readFile(baselinePath, "utf8");
const currentSource = await readFile(currentPath, "utf8");
const hash = source => createHash("sha256").update(source).digest("hex");

// Resolve the saved module's relative imports as if it still lived beside the
// current module. Neither version writes game data or instantiates a model.
async function loadModule(source, label) {
  const result = await build({
    stdin: { contents: source, resolveDir: dirname(currentPath), sourcefile: `${label}.ts`, loader: "ts" },
    bundle: true, write: false, format: "esm", platform: "node",
  });
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}#${label}`);
}
const before = await loadModule(baselineSource, "before");
const after = await loadModule(currentSource, "after");
const key = cells => cells.map(([x, y]) => `${x},${y}`).sort().join(";");
const rotated = (definition, turn) => definition.cells.map(([x, y]) => {
  const width = definition.canonicalWidth, height = definition.canonicalHeight;
  return turn === 0 ? [x, y] : turn === 1 ? [height - 1 - y, x]
    : turn === 2 ? [width - 1 - x, height - 1 - y] : [y, width - 1 - x];
});
const cases = [[], [[0, 0], [0, 0]], [[0.5, 0]], [[NaN, 0]], [[Infinity, 0]]];
const authoredKeys = new Set();
for (const definition of before.FORMAL_BLOCK_SHAPES) {
  for (let turn = 0; turn < 4; turn++) {
    const cells = rotated(definition, turn);
    authoredKeys.add(key(cells));
    for (const [dx, dy] of [[0, 0], [13, 21], [-9, 4]]) {
      for (const reflection of [false, true]) {
        const transformed = cells.map(([x, y]) => [(reflection ? -x : x) + dx, y + dy]);
        cases.push(transformed, [...transformed].reverse());
      }
    }
  }
}
// All nonempty subsets include invalid/disconnected silhouettes and possible
// reflections, so the check detects extra matches as well as missing sprites.
for (let mask = 1; mask < 512; mask++) {
  const cells = Array.from({ length: 9 }, (_, index) => [index % 3, Math.floor(index / 3)])
    .filter((_cell, index) => mask & (1 << index));
  cases.push(cells, cells.map(([x, y]) => [x - 7, y + 12]), [...cells].reverse());
}
let comparisons = 0;
const compare = (left, right, label) => {
  comparisons++;
  if (JSON.stringify(left) !== JSON.stringify(right)) throw new Error(`Shape mismatch: ${label}`);
};
for (let index = 0; index < cases.length; index++) {
  for (const policy of ["legacy", "native-only"]) {
    compare(before.matchFormalBlockShape(cases[index], policy), after.matchFormalBlockShape(cases[index], policy),
      `case ${index}, ${policy}`);
  }
}
for (let level = 0; level <= 231; level++) {
  for (const cells of [[[0, 0], [0, 1]], [[1, 0], [0, 1], [1, 1]], [[0, 0], [1, 1]], [[2, -4]]]) {
    compare(before.matchFormalBlockShapeForLevel(cells, level), after.matchFormalBlockShapeForLevel(cells, level),
      `policy level ${level}`);
  }
}

// Benchmark a repeatable mix of native artwork, rotated legacy silhouettes,
// reflections and unknown inputs. This measures matcher CPU work, not FPS,
// browser heat, texture memory or an entire gameplay frame.
const benchmarkCases = cases.slice(5, 1013);
const iterations = 50_000;
const rounds = 5;
const timing = (matcher, count) => {
  let checksum = 0;
  const start = performance.now();
  for (let index = 0; index < count; index++) {
    const match = matcher(benchmarkCases[index % benchmarkCases.length], index % 3 ? "native-only" : "legacy");
    checksum += match ? match.shapeId + match.quarterTurns + match.minX + match.minY : -1;
  }
  return { elapsedMs: performance.now() - start, checksum };
};
timing(before.matchFormalBlockShape, 2000);
timing(after.matchFormalBlockShape, 2000);
const beforeTimings = [], afterTimings = [];
for (let round = 0; round < rounds; round++) {
  const order = round % 2 ? ["after", "before"] : ["before", "after"];
  for (const version of order) {
    const result = timing((version === "before" ? before : after).matchFormalBlockShape, iterations);
    (version === "before" ? beforeTimings : afterTimings).push(result);
  }
}
if (new Set([...beforeTimings, ...afterTimings].map(result => result.checksum)).size !== 1) {
  throw new Error("Benchmark result checksums differ");
}
const median = samples => [...samples].map(sample => sample.elapsedMs).sort((a, b) => a - b)[Math.floor(samples.length / 2)];
const beforeMs = median(beforeTimings), afterMs = median(afterTimings);
const report = {
  status: "PASS", baselinePath, currentPath,
  baselineSha256: hash(baselineSource), currentSha256: hash(currentSource),
  equivalence: { cases: cases.length, comparisons, policies: ["legacy", "native-only"], levelPolicyChecks: 232 * 4 },
  fixedIndex: { authoredDefinitions: before.FORMAL_BLOCK_SHAPES.length, enumeratedRotations: before.FORMAL_BLOCK_SHAPES.length * 4,
    uniqueKeys: authoredKeys.size, retainsCallerInputs: false },
  benchmark: { iterationsPerRound: iterations, rounds, beforeTimings, afterTimings,
    beforeMedianMs: beforeMs, afterMedianMs: afterMs, reductionPercent: (1 - afterMs / beforeMs) * 100 },
  limitation: "Local Node microbenchmark; not measured whole-frame FPS, device temperature or heap savings.",
};
if (args.output) {
  const output = resolve(root, args.output);
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, JSON.stringify(report, null, 2) + "\n");
}
console.log(JSON.stringify(report, null, 2));
