import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const EXPECTED_CONTRACT_SHA256 = "1A413DB0084EA42C507AFB2D232B9537A3F9AB91E8F16D409C0ACD19A03DE88D";
const paths = {
  contract: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v7.json",
  activeOverrides: ".codex-temp/video-parity-v7-r93-active-plus-lv14/overrides.json",
  runtime: ".codex-temp/video-parity-v7-early-formal-r102/runtime.generated.ts",
  audit: ".codex-temp/video-parity-v7-early-formal-r102/audit.json",
  routes: ".codex-temp/video-parity-v7-early-formal-r102/routes.json",
  combinedProof: "playtest-results/experiments/video-parity-v7/proofs/lv002-lv013/reposition-floor-proof-v7-early-r102-2-13.json",
  wideLv8Proof: "playtest-results/experiments/video-parity-v7/proofs/lv008-wide/reposition-lower-bound-report-v7-r102-contract-bound-lv008.json",
  output: "playtest-results/experiments/video-parity-v7/acceptance/lv002-lv013-acceptance.json",
};
const individualProof = (id) => `playtest-results/experiments/video-parity-v7/proofs/lv${String(id).padStart(3, "0")}/reposition-floor-proof-v7-r102-${id}.json`;
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().flatMap((key) => (
    value[key] === undefined ? [] : [[key, canonicalize(value[key])]]
  )));
};
const canonicalJson = (value) => JSON.stringify(canonicalize(value));
const fail = (condition, message) => { if (!condition) throw new Error(message); };
const readArtifact = async (path) => {
  const text = await readFile(resolve(root, path), "utf8");
  return { path, text, sha256: sha256(text), json: path.endsWith(".json") ? JSON.parse(text) : null };
};

const [contractArtifact, overridesArtifact, runtimeArtifact, auditArtifact, routesArtifact, combinedProofArtifact, wideProofArtifact] = await Promise.all([
  readArtifact(paths.contract),
  readArtifact(paths.activeOverrides),
  readArtifact(paths.runtime),
  readArtifact(paths.audit),
  readArtifact(paths.routes),
  readArtifact(paths.combinedProof),
  readArtifact(paths.wideLv8Proof),
]);
fail(contractArtifact.sha256 === EXPECTED_CONTRACT_SHA256, "active v7 contract SHA drifted");

const bundle = await build({
  entryPoints: [resolve(root, paths.runtime)],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtimeModule = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].contents).toString("base64")}`);
const levels = runtimeModule.VIDEO_PARITY_LEVELS;
fail(Array.isArray(levels) && levels.length === 12, "runtime must contain exactly Lv2-Lv13");
const ids = levels.map((level) => level.id);
fail(canonicalJson(ids) === canonicalJson(Array.from({ length: 12 }, (_value, index) => index + 2)), "runtime level ids differ from Lv2-Lv13");
const levelById = new Map(levels.map((level) => [level.id, level]));
const contractById = new Map(contractArtifact.json.levels.map((entry) => [Number(entry.level_id.slice(2)), entry]));
const overrideById = new Map(overridesArtifact.json.levels.map((entry) => [Number(entry.level_id.slice(2)), entry]));
const routeById = new Map(routesArtifact.json.map((entry) => [Number(entry.level_id.slice(2)), entry]));
const canonicalRuntimeSha256 = sha256(canonicalJson([...levels].sort((left, right) => left.id - right.id)));

const audit = auditArtifact.json;
fail(audit.inputs?.contract?.sha256 === EXPECTED_CONTRACT_SHA256, "runtime audit contract SHA mismatch");
fail(resolve(root, audit.outputs?.levels).toLowerCase() === resolve(root, paths.runtime).toLowerCase(), "runtime audit output path mismatch");
fail(audit.outputs?.levels_sha256 === runtimeArtifact.sha256, "runtime audit source SHA mismatch");
fail(audit.outputs?.canonical_level_specs_sha256 === canonicalRuntimeSha256, "runtime audit canonical LevelSpec SHA mismatch");
for (const field of ["emitted", "exact_contract", "validate_level_passed", "completion_witness_replayed"]) {
  fail(audit.summary?.[field] === 12, `runtime audit ${field} must be 12`);
}

const standardProofArtifacts = new Map();
for (const id of [9, 10, 11, 12, 13]) {
  standardProofArtifacts.set(id, await readArtifact(individualProof(id)));
}
const proofFor = (id) => {
  if (id <= 7) return { artifact: combinedProofArtifact, report: combinedProofArtifact.json, entry: combinedProofArtifact.json.levels.find((item) => item.level_id === id), kind: "strict-frontier" };
  if (id === 8) return { artifact: wideProofArtifact, report: wideProofArtifact.json, entry: wideProofArtifact.json.reports.find((item) => item.level_id === "Lv008"), kind: "memory-bounded-strict-frontier" };
  const artifact = standardProofArtifacts.get(id);
  return { artifact, report: artifact.json, entry: artifact.json.levels.find((item) => item.level_id === id), kind: "strict-frontier" };
};

const accepted = [];
for (const id of ids) {
  const label = `Lv${String(id).padStart(3, "0")}`;
  const level = levelById.get(id);
  const target = contractById.get(id)?.our_design_target;
  const override = overrideById.get(id);
  const route = routeById.get(id);
  fail(target && override, `${label}: missing contract target or active override`);
  fail(canonicalJson(override.target) === canonicalJson(target), `${label}: active override target mismatch`);
  fail(Array.isArray(route?.drags) && route.drags.length > 0, `${label}: missing runtime completion route`);
  const hasSq3 = level.blocks.some((block) => {
    const xs = block.shape.map(([x]) => x);
    const ys = block.shape.map(([, y]) => y);
    return block.shape.length === 9 && Math.max(...xs) - Math.min(...xs) === 2
      && Math.max(...ys) - Math.min(...ys) === 2;
  });
  fail(!hasSq3, `${label}: forbidden 3x3 block found`);
  const proof = proofFor(id);
  const floor = target.campaign_reposition_floor;
  if (id === 8) {
    fail(proof.report.formal_contract_bound === true, `${label}: wide proof is not formally contract-bound`);
    fail(proof.report.binding_stable_at_post_search_check === true, `${label}: wide proof binding drifted`);
    fail(proof.report.runtime_contract_binding?.valid === true, `${label}: wide proof runtime binding invalid`);
    fail(proof.report.input_sha256 === runtimeArtifact.sha256, `${label}: wide proof runtime source mismatch`);
    fail(proof.entry?.target_reposition_overhead === floor, `${label}: wide proof floor mismatch`);
    fail(proof.entry?.proof?.lower_bound_statement_proven === true, `${label}: lower bound not proven`);
    fail(proof.entry?.certification?.target_floor_certified_for_playable_level === true, `${label}: wide proof not certified playable`);
  } else {
    fail(proof.report.binding?.runtime_contract?.valid === true, `${label}: strict proof runtime binding invalid`);
    fail(proof.report.binding?.binding_stable_at_post_search_check !== false, `${label}: strict proof binding drifted`);
    fail(proof.report.input?.sha256 === runtimeArtifact.sha256, `${label}: strict proof runtime source mismatch`);
    fail(proof.entry?.campaign_reposition_floor === floor, `${label}: strict proof floor mismatch`);
    fail(proof.entry?.lower_bound_statement_proven === true && proof.entry?.target_floor_certified === true, `${label}: strict floor not certified`);
    fail(proof.entry?.provided_completion_witness?.replay?.complete === true, `${label}: strict proof lacks complete replay`);
  }
  accepted.push({
    level_id: label,
    target_reposition_floor: floor,
    level_spec_sha256: sha256(canonicalJson(level)),
    exact_contract: true,
    validate_level: true,
    completion_witness_replayed: true,
    no_3x3_block: true,
    proof_method: proof.kind,
    proof_status: proof.entry.proof?.status ?? proof.entry.status,
    explored_states: proof.entry.proof?.explored_states ?? proof.entry.explored_states,
    proof_path: proof.artifact.path,
    proof_sha256: proof.artifact.sha256,
  });
}

const output = {
  schema_version: "blockout-video-parity-v7-early-acceptance-v1",
  generated_at: new Date().toISOString(),
  applied_to_live_campaign: false,
  contract: { path: paths.contract, sha256: contractArtifact.sha256 },
  runtime: {
    path: paths.runtime,
    sha256: runtimeArtifact.sha256,
    canonical_level_specs_sha256: canonicalRuntimeSha256,
    audit: { path: paths.audit, sha256: auditArtifact.sha256 },
    routes: { path: paths.routes, sha256: routesArtifact.sha256 },
  },
  active_override_source: { path: paths.activeOverrides, sha256: overridesArtifact.sha256 },
  acceptance_rule: "exact competitor contract + validateLevel + complete PuzzleModel replay + exhaustive exclusion of every route below the authored reposition floor; completion routes alone are never lower-bound evidence",
  summary: { requested: 12, accepted: accepted.length, rejected: 0, incomplete: 0 },
  accepted,
};
const outputPath = resolve(root, paths.output);
await mkdir(dirname(outputPath), { recursive: true });
const outputText = `${JSON.stringify(output, null, 2)}\n`;
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({
  output: relative(root, outputPath).replaceAll("\\", "/"),
  accepted: accepted.length,
  sha256: sha256(outputText),
}, null, 2));
