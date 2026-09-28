import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const STRICT = resolve(ROOT, "tools/strict-accept-expanded-density-v5.mjs");
const args = process.argv.slice(2);
const optional = (name, fallback = null) => {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1];
};
const required = (name) => {
  const value = optional(name);
  if (!value) throw new Error(`${name} is required`);
  return value;
};

const input = resolve(ROOT, required("--input"));
const outputDir = resolve(ROOT, required("--output-dir"));
const levelNumber = Number(required("--level"));
const maxStates = Number(optional("--max-states", "300000"));
const maxMemoryMb = Number(optional("--max-memory-mb", "800"));
const transpositionCap = Number(optional("--transposition-cap", "150000"));
const maximumAttempts = Number(optional("--max-attempts", "40"));
const relaxedBoundPruning = args.includes("--relaxed-bound-pruning");
const relaxedBoundRootOnly = !args.includes("--no-relaxed-bound-root-only");
const relaxedBoundMaxStates = Number(optional("--relaxed-bound-max-states", "5000"));
if (![levelNumber, maxStates, maxMemoryMb, transpositionCap, maximumAttempts, relaxedBoundMaxStates]
  .every((value) => Number.isSafeInteger(value) && value > 0)) throw new Error("numeric arguments must be positive integers");

const artifact = JSON.parse(await readFile(input, "utf8"));
const levelId = `Lv${String(levelNumber).padStart(3, "0")}`;
const source = (artifact.levels ?? []).find((entry) => entry.level_id === levelId || entry.level?.id === levelNumber);
if (!source) throw new Error(`${levelId} is missing from ${input}`);

const internal = [...(source.level.shutters ?? [])]
  .filter((shutter) => shutter.skin === "staging")
  .sort((left, right) => left.count - right.count || left.id.localeCompare(right.id));
if (!internal.length) throw new Error(`${levelId} has no internal staging shutters`);
const stageByBlock = new Map();
source.level.blocks.filter((block) => !block.shutterId).forEach((block) => stageByBlock.set(block.id, 0));
internal.forEach((shutter, index) => source.level.blocks
  .filter((block) => block.shutterId === shutter.id)
  .forEach((block) => stageByBlock.set(block.id, index + 1)));
const capacities = Array.from({ length: internal.length + 1 }, () => 0);
for (const drag of source.route ?? []) {
  if (!drag.exitSide) capacities[stageByBlock.get(drag.blockId)] += 1;
}
const target = source.target?.recommended_minimum_reposition_overhead
  ?? source.target?.solver_acceptance?.minimum_reposition_overhead
  ?? source.audit?.target_reposition_overhead;
if (!Number.isSafeInteger(target) || target < 1) throw new Error(`${levelId} has no positive target floor`);
if (capacities.reduce((sum, value) => sum + value, 0) < target) throw new Error(`${levelId} witness capacities are below target`);

const proportional = capacities.map((capacity) => Math.floor(target * capacity / capacities.reduce((sum, value) => sum + value, 0)));
let proportionalRemainder = target - proportional.reduce((sum, value) => sum + value, 0);
const ranking = capacities.map((capacity, index) => ({
  index,
  remainder: (target * capacity) % capacities.reduce((sum, value) => sum + value, 0),
})).sort((left, right) => right.remainder - left.remainder || left.index - right.index);
for (let cursor = 0; proportionalRemainder > 0; cursor += 1) {
  const index = ranking[cursor % ranking.length].index;
  if (proportional[index] < capacities[index]) {
    proportional[index] += 1;
    proportionalRemainder -= 1;
  }
}

const allocations = [];
const enumerate = (index, remaining, current) => {
  if (index === capacities.length - 1) {
    if (remaining >= 0 && remaining <= capacities[index]) allocations.push([...current, remaining]);
    return;
  }
  for (let value = 0; value <= Math.min(capacities[index], remaining); value += 1) {
    current.push(value);
    enumerate(index + 1, remaining - value, current);
    current.pop();
  }
};
enumerate(0, target, []);
allocations.sort((left, right) => {
  const leftDistance = left.reduce((sum, value, index) => sum + Math.abs(value - proportional[index]), 0);
  const rightDistance = right.reduce((sum, value, index) => sum + Math.abs(value - proportional[index]), 0);
  return leftDistance - rightDistance
    || Math.max(...left) - Math.max(...right)
    || left.join(",").localeCompare(right.join(","));
});

const run = (commandArgs) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(process.execPath, commandArgs, { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); process.stdout.write(chunk); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); process.stderr.write(chunk); });
  child.on("error", rejectRun);
  child.on("close", (code) => resolveRun({ code, stdout, stderr }));
});

await mkdir(outputDir, { recursive: true });
const lower = capacities.map(() => 0);
const upper = [...capacities];
const softUpper = [...capacities];
const attempted = new Set();
const history = [];
let acceptedCandidate = null;
let finalReason = "attempt_limit";

for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
  const allocation = allocations.find((candidate) => {
    const key = candidate.join(",");
    return !attempted.has(key) && candidate.every((value, index) => (
      value >= lower[index] && value <= upper[index] && value <= softUpper[index]
    ));
  });
  if (!allocation) {
    finalReason = upper.reduce((sum, value) => sum + value, 0) < target
      ? "counterexample_upper_bounds_below_target"
      : "proof_cap_exhausted_for_remaining_allocations";
    break;
  }
  const key = allocation.join(",");
  attempted.add(key);
  const candidate = structuredClone(source);
  candidate.audit = { ...(candidate.audit ?? {}), strict_stage_floor_allocation: allocation };
  const attemptDir = resolve(outputDir, `attempt-${String(attempt).padStart(2, "0")}-${key.replaceAll(",", "-")}`);
  const candidatePath = resolve(attemptDir, "formal-candidates.json");
  await mkdir(attemptDir, { recursive: true });
  await writeFile(candidatePath, `${JSON.stringify({
    title: `${levelId} staged floor-allocation search candidate`,
    source: input,
    levels: [candidate],
  }, null, 2)}\n`, "utf8");
  console.log(`${levelId}: allocation attempt ${attempt} => [${key}]`);
  const strictArgs = [
    STRICT,
    "--input", candidatePath,
    "--output-dir", resolve(attemptDir, "strict"),
    "--levels", String(levelNumber),
    "--max-states", String(maxStates),
    "--max-memory-mb", String(maxMemoryMb),
    "--transposition-cap", String(transpositionCap),
    "--symmetry-reduction",
  ];
  if (relaxedBoundPruning) strictArgs.push(
    "--relaxed-bound-pruning",
    relaxedBoundRootOnly ? "--relaxed-bound-root-only" : "--no-relaxed-bound-root-only",
    "--relaxed-bound-max-states", String(relaxedBoundMaxStates),
  );
  const result = await run(strictArgs);
  const auditPath = resolve(attemptDir, "strict", "strict-v5-acceptance-audit.json");
  const audit = JSON.parse(await readFile(auditPath, "utf8"));
  const decision = audit.decisions?.[0];
  const row = {
    attempt,
    allocation,
    exit_code: result.code,
    status: decision?.status ?? "missing_decision",
    components: [],
  };
  for (const component of decision?.components ?? []) {
    const index = component.component_index - 1;
    const floor = component.target_reposition_overhead;
    const counterexample = component.proof_entry?.proof?.counterexample_reposition_overhead;
    row.components.push({ index: index + 1, floor, verdict: component.verdict, proof_status: component.proof_status, counterexample });
    if (component.verdict === "C") lower[index] = Math.max(lower[index], floor);
    else if (component.verdict === "D" && Number.isSafeInteger(counterexample)) {
      upper[index] = Math.min(upper[index], counterexample);
      softUpper[index] = Math.min(softUpper[index], counterexample);
    } else {
      softUpper[index] = Math.min(softUpper[index], Math.max(0, floor - 1));
    }
  }
  history.push(row);
  if (decision?.accepted) {
    acceptedCandidate = candidate;
    finalReason = "accepted";
    break;
  }
}

const summary = {
  level_id: levelId,
  source: input,
  target,
  capacities,
  proportional_start: proportional,
  certified_lower_bounds: lower,
  counterexample_upper_bounds: upper,
  proof_cap_soft_upper_bounds: softUpper,
  status: finalReason,
  attempts: history,
};
await writeFile(resolve(outputDir, "stage-floor-allocation-search.json"), `${JSON.stringify(summary, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "strict-accepted-candidates.json"), `${JSON.stringify({
  title: "Strictly accepted dense staged v5 candidates",
  levels: acceptedCandidate ? [acceptedCandidate] : [],
}, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  level_id: levelId,
  status: finalReason,
  target,
  capacities,
  certified_lower_bounds: lower,
  counterexample_upper_bounds: upper,
  attempts: history.length,
}, null, 2));
process.exitCode = acceptedCandidate ? 0 : 1;
