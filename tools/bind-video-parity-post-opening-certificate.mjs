import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const arg = (name) => {
  const index = args.indexOf(name);
  if (index < 0 || !args[index + 1]) throw new Error(`${name} is required`);
  return args[index + 1];
};
const paths = Object.fromEntries([
  "runtime", "audit", "proofInput", "completionRoutes", "repairAudit", "projection", "proof", "output",
].map((key) => [key, resolve(root, arg(`--${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`))]));
const expectedContract = arg("--contract-sha256").toUpperCase();
const levelNumber = Number(arg("--level"));
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
  }
  return value;
};
const names = Object.keys(paths);
const texts = Object.fromEntries(await Promise.all(names.filter((name) => name !== "output").map(async (name) => (
  [name, await readFile(paths[name], "utf8")]
))));
const json = Object.fromEntries(Object.entries(texts).filter(([name]) => name !== "runtime")
  .map(([name, text]) => [name, JSON.parse(text)]));
const levelLabel = `Lv${String(levelNumber).padStart(3, "0")}`;
const exact = json.audit.levels.find((entry) => entry.level_id === levelLabel);
const repair = json.repairAudit.levels.find((entry) => entry.level_id === levelLabel);
const proofEntry = json.proof.reports.find((entry) => entry.level_id === levelLabel);
const proofSource = json.proofInput.levels.find((entry) => entry.level_id === levelLabel);
const projected = json.projection.levels.find((entry) => entry.level_id === levelLabel);
const failures = [];
const check = (condition, label) => { if (!condition) failures.push(label); };
const runtimeSha = sha256(texts.runtime);
check(String(json.audit.inputs?.contract?.sha256).toUpperCase() === expectedContract, "audit contract SHA");
check(String(json.proofInput.source_binding?.contract?.sha256).toUpperCase() === expectedContract, "proof-input contract SHA");
check(String(json.projection.source_binding?.contract_sha256).toUpperCase() === expectedContract, "projection contract SHA");
check(String(json.audit.outputs?.levels_sha256).toUpperCase() === runtimeSha, "audit runtime SHA");
check(String(json.proofInput.source_binding?.runtime?.sha256).toUpperCase() === runtimeSha, "proof-input runtime SHA");
check(String(json.repairAudit.inputs?.levels?.sha256).toUpperCase() === runtimeSha, "repair runtime SHA");
check(exact?.exact_contract?.exact === true, "exact contract");
check(exact?.validate_level === "pass", "validateLevel");
check(repair?.independent_replay?.ok === true, "fresh independent PuzzleModel completion replay");
check(json.repairAudit.summary?.still_failed === 0, "repair failures");
check(String(json.proof.input_sha256).toUpperCase() === sha256(texts.projection), "proof projection SHA");
check(proofEntry?.proof?.status?.startsWith("floor_lower_bound_proven"), "strict projected floor proof");
check(proofEntry?.target_reposition_overhead === exact?.necessary_reposition?.target_floor, "target floor agreement");
check(Object.values(json.projection.theorem?.checks ?? {}).every(Boolean), "projection theorem checks");
check(json.projection.theorem?.cover_count === json.projection.theorem?.opening_clear_load, "cover deadline equals opening clear load");
const sourceLevelSha = sha256(JSON.stringify(canonical(proofSource.level)));
const projectedLevelSha = sha256(JSON.stringify(canonical(projected.level)));
check(String(json.projection.source_binding?.source_level_spec_sha256).toUpperCase() === sourceLevelSha, "source LevelSpec SHA");
check(String(json.projection.source_binding?.projected_level_spec_sha256).toUpperCase() === projectedLevelSha, "projected LevelSpec SHA");
if (failures.length) throw new Error(`certificate binding failed: ${failures.join(", ")}`);

const artifact = {
  schema_version: "blockout-video-parity-post-opening-floor-certificate-v1",
  level_id: levelLabel,
  contract_sha256: expectedContract,
  source_level_spec_sha256: sourceLevelSha,
  projected_level_spec_sha256: projectedLevelSha,
  certified_minimum_reposition_floor: proofEntry.target_reposition_overhead,
  completion_upper_bound_repositions: exact.completion_witness?.reposition_overhead_upper_bound ?? repair.independent_replay?.moves ?? null,
  acceptance: {
    contract_exact: true,
    validate_level: "pass",
    fresh_puzzle_model_completion_replay: true,
    strict_floor_lower_bound_proven: true,
    projection_is_lower_bound_safe: true,
  },
  theorem: json.projection.theorem,
  proof: {
    status: proofEntry.proof.status,
    explored_states: proofEntry.proof.explored_states,
    searched_reposition_budget: proofEntry.proof.searched_reposition_budget,
    proof_tool: "tools/prove-video-parity-reposition-floor-wide.mjs",
  },
  artifacts: Object.fromEntries(names.filter((name) => name !== "output").map((name) => [name, {
    path: relative(root, paths[name]).replaceAll("\\", "/"),
    sha256: sha256(texts[name]),
  }])),
};
await mkdir(dirname(paths.output), { recursive: true });
const outputText = `${JSON.stringify(artifact, null, 2)}\n`;
await writeFile(paths.output, outputText);
console.log(JSON.stringify({
  output: relative(root, paths.output).replaceAll("\\", "/"),
  sha256: sha256(outputText),
  level_spec_sha256: sourceLevelSha,
  floor: artifact.certified_minimum_reposition_floor,
}, null, 2));
