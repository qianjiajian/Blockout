import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const GENERATOR = resolve(ROOT, "tools/generate-competitor-constrained-levels.mjs");
const STRICT = resolve(ROOT, "tools/strict-accept-expanded-density-v5.mjs");
const CONTRACT_RELATIVE = "deliverables/level-generation-blueprint/blockout-lv001-lv100-expanded-density-contract-v5.json";

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
const positiveInteger = (name, fallback) => {
  const value = Number(optional(name, String(fallback)));
  if (!Number.isSafeInteger(value) || value <= 0) throw new Error(`${name} must be a positive integer`);
  return value;
};
const parseIds = (specification) => {
  const ids = new Set();
  for (const token of specification.split(",").map((part) => part.trim()).filter(Boolean)) {
    const match = token.match(/^(\d+)(?:-(\d+))?$/);
    if (!match) throw new Error(`Invalid level selection: ${token}`);
    const from = Number(match[1]);
    const to = Number(match[2] ?? match[1]);
    if (!Number.isSafeInteger(from) || !Number.isSafeInteger(to) || from < 1 || to > 100 || from > to) {
      throw new Error(`Invalid level range: ${token}`);
    }
    for (let id = from; id <= to; id += 1) ids.add(id);
  }
  return [...ids].sort((left, right) => left - right);
};
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stableValue(value[key])]));
  }
  return value;
};

const ids = parseIds(required("--levels"));
const outputDir = resolve(ROOT, required("--output-dir"));
const seedFrom = positiveInteger("--seed-from", 1);
const seedTo = positiveInteger("--seed-to", seedFrom);
const trials = positiveInteger("--trials", 160);
const validationCap = positiveInteger("--validation-cap", 120_000);
const maxStates = positiveInteger("--max-states", 300_000);
const relaxedStates = positiveInteger("--relaxed-max-states", 25_000);
const useRelaxedBound = args.includes("--relaxed-bound");
const freezeVariants = Number(optional("--freeze-variants", "0"));
if (!Number.isSafeInteger(freezeVariants) || freezeVariants < 0) throw new Error("--freeze-variants must be a non-negative integer");
if (seedTo < seedFrom) throw new Error("--seed-to must be >= --seed-from");

const contractPath = resolve(ROOT, CONTRACT_RELATIVE);
const contractBytes = await readFile(contractPath);
const contract = JSON.parse(contractBytes.toString("utf8"));
const contractByNumber = new Map(contract.levels.map((entry) => [Number(entry.level_id.slice(2)), entry]));

const run = (commandArgs, environment = process.env) => new Promise((resolveRun, rejectRun) => {
  const child = spawn(process.execPath, commandArgs, {
    cwd: ROOT,
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
  let stdout = "";
  let stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
  child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
  child.on("error", rejectRun);
  child.on("close", (code, signal) => resolveRun({ code, signal, stdout, stderr }));
});

await mkdir(outputDir, { recursive: true });
const accepted = [];
const rows = [];
for (const id of ids) {
  const levelId = `Lv${String(id).padStart(3, "0")}`;
  const contractEntry = contractByNumber.get(id);
  if (!contractEntry) throw new Error(`${levelId} is missing from v5 contract`);
  if (contractEntry.our_design_target.requires_staged_reveal) {
    rows.push({ level_id: levelId, status: "skipped_staged" });
    continue;
  }
  let winner = null;
  const attempts = [];
  for (let seed = seedFrom; seed <= seedTo && !winner; seed += 1) {
    const attemptDir = resolve(outputDir, levelId, `seed-${String(seed).padStart(3, "0")}`);
    await mkdir(attemptDir, { recursive: true });
    const relativeAttempt = relative(ROOT, attemptDir).replaceAll("\\", "/");
    console.log(`${levelId}: generating seed ${seed}`);
    const generated = await run(["--expose-gc", GENERATOR], {
      ...process.env,
      FORMAL_CONTRACT_RELATIVE: CONTRACT_RELATIVE,
      FORMAL_GENERATED_RELATIVE: `${relativeAttempt}/competitorConstrainedLevels.generated.ts`,
      FORMAL_REPORT_DIR_RELATIVE: relativeAttempt,
      FORMAL_LEVEL_IDS: String(id),
      FORMAL_GENERATE_IDS: String(id),
      FORMAL_TRIALS: String(trials),
      FORMAL_SEED_OFFSET: String(seed),
      FORMAL_VALIDATION_CAP: String(validationCap),
      FORMAL_MAXIMIZE_FOREIGN: "1",
      FORMAL_PACK_PREFER_EDGES: seed % 2 === 1 ? "1" : "0",
      FORMAL_REPACK: "1",
      FORMAL_STRICT_FREEZE_VARIANTS: String(freezeVariants),
      FORMAL_STRICT_ACCEPT: "0",
    });
    const row = { seed, generator_exit_code: generated.code, generator_signal: generated.signal, generator_stderr: generated.stderr.trim() };
    if (generated.code !== 0) {
      row.status = "generator_failed";
      attempts.push(row);
      continue;
    }
    const candidatePath = resolve(attemptDir, "formal-candidates.json");
    const artifact = JSON.parse(await readFile(candidatePath, "utf8"));
    const candidate = artifact.levels?.find((entry) => entry.level_id === levelId);
    if (!candidate) {
      row.status = "missing_candidate";
      attempts.push(row);
      continue;
    }
    if ((candidate.level.shutters?.length ?? 0) > 0) {
      row.status = "quality_rejected_unexpected_staging";
      attempts.push(row);
      continue;
    }
    row.candidate_sha256 = sha256(JSON.stringify(stableValue(candidate.level)));
    row.opening_density = Number((candidate.level.blocks.reduce((sum, block) => sum + block.shape.length, 0)
      / (candidate.level.playable?.length ?? candidate.level.width * candidate.level.height)).toFixed(4));
    const strictDir = resolve(attemptDir, "strict-v5");
    console.log(`${levelId}: proving seed ${seed}`);
    const strictArguments = [
      STRICT,
      "--input", candidatePath,
      "--output-dir", strictDir,
      "--levels", String(id),
      "--max-states", String(maxStates),
      "--symmetry-reduction",
    ];
    if (useRelaxedBound) strictArguments.push(
      "--relaxed-bound-pruning",
      "--relaxed-bound-root-only",
      "--relaxed-bound-max-states", String(relaxedStates),
    );
    const proved = await run(strictArguments);
    const audit = JSON.parse(await readFile(resolve(strictDir, "strict-v5-acceptance-audit.json"), "utf8"));
    const decision = audit.decisions?.[0];
    row.status = decision?.status ?? "missing_decision";
    row.proof_exit_code = proved.code;
    row.proof_signal = proved.signal;
    row.proof = decision ? {
      certified_lower_bound: decision.certified_additive_lower_bound,
      component_status: decision.components?.[0]?.proof_status ?? null,
      explored_states: decision.components?.[0]?.explored_states ?? null,
      relaxed_bound_calls: decision.components?.[0]?.proof_entry?.proof?.relaxed_bound_calls ?? null,
      relaxed_bound_prunes: decision.components?.[0]?.proof_entry?.proof?.relaxed_bound_prunes ?? null,
      counterexample: decision.components?.[0]?.proof_entry?.proof?.counterexample_reposition_overhead ?? null,
    } : null;
    attempts.push(row);
    if (decision?.accepted && proved.code === 0) {
      winner = {
        ...candidate,
        dense_certificate_search: {
          seed,
          candidate_source: relative(ROOT, candidatePath).replaceAll("\\", "/"),
          strict_audit: relative(ROOT, resolve(strictDir, "strict-v5-acceptance-audit.json")).replaceAll("\\", "/"),
          candidate_sha256: row.candidate_sha256,
          opening_density: row.opening_density,
        },
      };
      accepted.push(winner);
      console.log(`${levelId}: ACCEPTED seed ${seed}`);
    } else {
      console.log(`${levelId}: seed ${seed} not certified (${row.status})`);
    }
  }
  rows.push({ level_id: levelId, status: winner ? "accepted" : "unresolved", accepted_seed: winner?.dense_certificate_search.seed ?? null, attempts });
  await writeFile(resolve(outputDir, "search-progress.json"), `${JSON.stringify({
    schema_version: "blockout-v5-dense-nonstaged-certificate-search-1",
    contract: CONTRACT_RELATIVE,
    contract_sha256: sha256(contractBytes),
    requested_levels: ids,
    rows,
    levels: accepted,
  }, null, 2)}\n`, "utf8");
}

const report = {
  schema_version: "blockout-v5-dense-nonstaged-certificate-search-1",
  generated_at: new Date().toISOString(),
  applied_to_live_campaign: false,
  contract: CONTRACT_RELATIVE,
  contract_sha256: sha256(contractBytes),
  configuration: {
    seed_from: seedFrom,
    seed_to: seedTo,
    trials,
    validation_cap: validationCap,
    max_states: maxStates,
    relaxed_bound: useRelaxedBound,
    relaxed_max_states: useRelaxedBound ? relaxedStates : null,
  },
  counts: {
    requested: ids.length,
    accepted: rows.filter((row) => row.status === "accepted").length,
    unresolved: rows.filter((row) => row.status === "unresolved").length,
    skipped_staged: rows.filter((row) => row.status === "skipped_staged").length,
  },
  rows,
  levels: accepted,
};
await writeFile(resolve(outputDir, "strict-accepted-candidates.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(resolve(outputDir, "search-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({
  output: relative(ROOT, outputDir).replaceAll("\\", "/"),
  counts: report.counts,
  unresolved: rows.filter((row) => row.status === "unresolved").map((row) => row.level_id),
}, null, 2));
if (report.counts.unresolved) process.exitCode = 1;
