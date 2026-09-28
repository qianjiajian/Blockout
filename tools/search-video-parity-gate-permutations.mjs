import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only exhaustive descriptor-to-gate-geometry permutation screen.
// It uses the memory-bounded DFS only to find/reject below-floor routes.  Any
// survivor still requires current-runtime exact audit, fresh replay and v6 proof.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const inputRelative = process.env.VIDEO_PARITY_GATE_SEARCH_INPUT_RELATIVE;
const outputRelative = process.env.VIDEO_PARITY_GATE_SEARCH_OUTPUT_RELATIVE;
const levelId = Number(process.env.VIDEO_PARITY_GATE_SEARCH_LEVEL_ID);
const maxStates = Number(process.env.VIDEO_PARITY_GATE_SEARCH_MAX_STATES ?? 200000);
const mode = process.env.VIDEO_PARITY_GATE_SEARCH_MODE ?? "descriptors";
const startIndex = Math.max(0, Number(process.env.VIDEO_PARITY_GATE_SEARCH_START_INDEX ?? 0));
if (!inputRelative || !outputRelative || !Number.isSafeInteger(levelId)) throw new Error("input/output/level env required");
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const inputText = await readFile(resolve(root, inputRelative), "utf8");
const input = JSON.parse(inputText);
const entry = input.levels.find((candidate) => candidate.level.id === levelId);
if (!entry) throw new Error(`Lv${levelId} missing`);
const permutations = (values) => {
  const result = [];
  const visit = (remaining, current) => {
    if (!remaining.length) { result.push([...current]); return; }
    const seen = new Set();
    remaining.forEach((value, index) => {
      const key = JSON.stringify(value);
      if (seen.has(key)) return;
      seen.add(key);
      visit([...remaining.slice(0, index), ...remaining.slice(index + 1)], [...current, value]);
    });
  };
  visit(values, []);
  return result;
};
const descriptors = entry.level.gates.map((gate) => ({ color: gate.color, frozen: gate.frozen, star: gate.star }));
const variants = mode === "pair-swaps" ? [
  structuredClone(descriptors),
  ...descriptors.flatMap((_left, leftIndex) => descriptors.slice(leftIndex + 1).map((_right, offset) => {
    const rightIndex = leftIndex + 1 + offset;
    const candidate = structuredClone(descriptors);
    [candidate[leftIndex], candidate[rightIndex]] = [candidate[rightIndex], candidate[leftIndex]];
    return candidate;
  })),
] : mode === "frozen-values" ? (() => {
  const frozenIndices = entry.level.gates.map((gate, index) => gate.frozen === undefined ? null : index)
    .filter((index) => index !== null);
  const values = frozenIndices.map((index) => entry.level.gates[index].frozen);
  return permutations(values).map((permutation) => {
    const candidate = structuredClone(descriptors);
    frozenIndices.forEach((gateIndex, index) => { candidate[gateIndex].frozen = permutation[index]; });
    return candidate;
  });
})() : permutations(descriptors);
const work = resolve(root, dirname(outputRelative), "gate-permutation-work");
await mkdir(work, { recursive: true });
const proofTool = resolve(root, "playtest-results/experiments/competitor-composition-r140/prove-reposition-lower-bound.mjs");
const run = (args) => new Promise((resolveRun) => {
  const child = spawn(process.execPath, args, { cwd: root, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = ""; let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; }); child.stderr.on("data", (chunk) => { stderr += chunk; });
  child.on("close", (code) => resolveRun({ code, stdout, stderr }));
});
const results = [];
for (let index = 0; index < variants.length; index += 1) {
  if (index < startIndex) continue;
  const candidate = structuredClone(entry);
  candidate.level.gates.forEach((gate, gateIndex) => {
    const descriptor = variants[index][gateIndex]; gate.color = descriptor.color;
    if (descriptor.frozen === undefined) delete gate.frozen; else gate.frozen = descriptor.frozen;
    if (descriptor.star === undefined) delete gate.star; else gate.star = descriptor.star;
  });
  const candidatePath = resolve(work, `candidate-${String(index).padStart(3, "0")}.json`);
  await writeFile(candidatePath, `${JSON.stringify({ title: "gate permutation screen", levels: [candidate] }, null, 2)}\n`, "utf8");
  const runResult = await run([
    proofTool, "--input", candidatePath, "--levels", String(levelId), "--algorithm", "bounded-dfs",
    "--max-states", String(maxStates), "--max-memory-mb", "900", "--transposition-cap", "120000",
    "--symmetry-reduction", "--zero-cost-closure-reduction", "--skip-official",
    "--validation-max-states", "1", "--stop-after-floor", "--no-write",
  ]);
  const match = runResult.stdout.match(/proof=([^,\s]+)/);
  const status = match?.[1] ?? `process-${runResult.code}`;
  results.push({ index, status, descriptors: variants[index], candidate });
  console.log(`${index + 1}/${variants.length} ${status}`);
  if (status.startsWith("floor_lower_bound_proven")) break;
}
const output = { schema_version: "blockout-video-parity-gate-permutation-screen-v1", source_binding: { input: { path: inputRelative, sha256: sha256(inputText) } }, level_id: `Lv${String(levelId).padStart(3, "0")}`, mode, max_states: maxStates, total_permutations: variants.length, tested: results.length, survivors: results.filter((result) => result.status.startsWith("floor_lower_bound_proven")) };
const text = `${JSON.stringify(output, null, 2)}\n`; const path = resolve(root, outputRelative); await mkdir(dirname(path), { recursive: true }); await writeFile(path, text, "utf8");
console.log(JSON.stringify({ output: outputRelative, sha256: sha256(text), tested: results.length, survivors: output.survivors.length }, null, 2));
