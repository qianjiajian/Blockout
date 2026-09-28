import { createHash, randomUUID } from "node:crypto";
import { readFile, realpath, mkdir, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { build, version as esbuildVersion } from "esbuild";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SELF = "tools/revised-candidate-artifact.mjs";
const EXECUTING_SELF_SHA = createHash("sha256").update(await readFile(fileURLToPath(import.meta.url))).digest("hex");
const OUTPUT_ROOT = "playtest-results/experiments/revised-candidate-artifacts";
export const ARTIFACT_VERSION = "revised-candidate-artifact-v1";
export const DEFAULT_BUDGETS = Object.freeze({ maxStates: 5000, maxDragStates: 1000, maxTransitions: 250000, maxMilliseconds: 5000 });
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");
const parseJson = (bytes) => JSON.parse(bytes.toString("utf8").replace(/^\uFEFF/, ""));
const plain = (value) => value !== null && typeof value === "object" && !Array.isArray(value)
  && [Object.prototype, null].includes(Object.getPrototypeOf(value));

/** Preserve every array order: block.shape[0] is an input policy, not a set. */
export function canonicalJson(value) {
  if (value === null || typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number" && Number.isFinite(value)) return JSON.stringify(value);
  if (Array.isArray(value)) return `[${Array.from(value, canonicalJson).join(",")}]`;
  if (plain(value)) return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  throw new Error("Artifact must contain JSON values only (no undefined, sparse arrays, non-finite numbers or class instances)");
}
export const semanticHash = (value) => digest(canonicalJson(value));

export function parseProposal(value) {
  if (!plain(value) || Object.keys(value).sort().join(",") !== "level,levelId,ruleVersion,schemaVersion,seed") {
    throw new Error("Proposal must contain exactly schemaVersion, ruleVersion, levelId, seed, level; source quotas and certificates are not accepted");
  }
  if (value.schemaVersion !== 1 || value.ruleVersion !== "1.2.1") throw new Error("Proposal requires schema 1 and locked rules 1.2.1");
  if (!Number.isSafeInteger(value.levelId) || value.levelId < 21 || value.levelId > 30) throw new Error("Only isolated Lv21-30 proposals are currently supported");
  if (typeof value.seed !== "string" || !value.seed.trim() || value.seed.length > 256) throw new Error("A nonempty recorded generation seed is required");
  if (!plain(value.level) || value.level.id !== value.levelId || value.level.mechanismRules !== "revised-2026-09-21-v1.2") {
    throw new Error("Candidate ID/profile must match its proposal and current revised profile");
  }
  canonicalJson(value);
  return structuredClone(value);
}

export function normalizeBudgets(value = {}) {
  if (!plain(value) || Object.keys(value).some((key) => !Object.hasOwn(DEFAULT_BUDGETS, key))) throw new Error("Unknown budget field; the difficulty floor cannot be overridden");
  const result = { ...DEFAULT_BUDGETS, ...value };
  for (const [key, amount] of Object.entries(result)) {
    if (!Number.isSafeInteger(amount) || amount < 1) throw new Error(`${key} must be a positive safe integer`);
  }
  return result;
}

/** Supplied routes are data, never evidence flags. They must be replayed anew. */
export function parseCandidateRoute(value, level) {
  if (!plain(value) || Object.keys(value).sort().join(",") !== "candidateSha256,drags,schemaVersion"
    || value.schemaVersion !== 1 || value.candidateSha256 !== semanticHash(level) || !Array.isArray(value.drags)) {
    throw new Error("Route requires schema 1, the exact complete candidate hash and drags only");
  }
  for (const drag of value.drags) {
    if (!plain(drag) || Object.keys(drag).some((key) => !["blockId", "path", "exitSide"].includes(key))
      || typeof drag.blockId !== "string" || !drag.blockId || !Array.isArray(drag.path)
      || drag.path.some((p) => !Array.isArray(p) || p.length !== 2 || p.some((n) => !Number.isSafeInteger(n)))
      || (drag.exitSide !== undefined && !["top", "right", "bottom", "left"].includes(drag.exitSide))) {
      throw new Error("Invalid route drag; only blockId, adjacent anchor path and optional exitSide are accepted");
    }
  }
  canonicalJson(value);
  return structuredClone(value);
}

function repositoryPath(root, path) {
  if (typeof path !== "string" || !path || isAbsolute(path) || path.includes("\\")
    || path.split("/").some((part) => !part || part === "." || part === "..")) throw new Error(`Unsafe repository binding: ${path}`);
  const absolute = resolve(root, path);
  const rel = relative(root, absolute);
  if (rel.startsWith("..") || isAbsolute(rel)) throw new Error(`Binding escapes repository: ${path}`);
  return absolute;
}

/** Hash actual bytes, including images. Never validate merely by hash-string shape. */
export async function assertFileBindings(bindings, root = ROOT) {
  if (!plain(bindings) || !Object.keys(bindings).length) throw new Error("Missing file bindings");
  const resolvedRoot = await realpath(root);
  for (const [path, binding] of Object.entries(bindings)) {
    if (!plain(binding) || !/^[a-f0-9]{64}$/.test(binding.sha256 ?? "")) throw new Error(`Invalid binding: ${path}`);
    const absolute = await realpath(repositoryPath(root, path));
    const rel = relative(resolvedRoot, absolute);
    if (rel.startsWith("..") || isAbsolute(rel)) throw new Error(`Symlink escapes repository: ${path}`);
    if (digest(await readFile(absolute)) !== binding.sha256) throw new Error(`Snapshot drift: ${path}`);
  }
}

/** A checksum is tamper/drift detection, not a trusted signature or a proof. */
export function sealArtifact(body) {
  return { ...body, integrity: { algorithm: "sha256-canonical-json-v1", bodySha256: semanticHash(body), trustedSignature: false } };
}
export function verifyArtifactSeal(artifact) {
  if (!plain(artifact) || artifact.schemaVersion !== ARTIFACT_VERSION) throw new Error("Unsupported artifact");
  const { integrity, ...body } = artifact;
  if (integrity?.algorithm !== "sha256-canonical-json-v1" || integrity.trustedSignature !== false
    || integrity.bodySha256 !== semanticHash(body)) throw new Error("Artifact checksum mismatch");
  return body;
}

/** Do not trust a saved PASS. Verification still has to rerun the actual tools. */
export function assertSameContext(previous, context) {
  const body = verifyArtifactSeal(previous);
  if (body.kind !== "candidate-validation" || canonicalJson(body.context) !== canonicalJson(context)) {
    throw new Error("Stale artifact: candidate, seed, source, rules, budgets, tool or execution environment changed; run a new validation");
  }
}

async function loadBoundRuntime(root) {
  const files = {};
  // This module executes the wrapper; all domain code is loaded afresh below.
  for (const path of [SELF, "package.json", "pnpm-lock.yaml", "tsconfig.json", "src/core/types.ts"]) {
    files[path] = { sha256: digest(await readFile(repositoryPath(root, path))) };
  }
  if (files[SELF].sha256 !== EXECUTING_SELF_SHA) throw new Error("Artifact wrapper changed after loading; restart with the current source");
  const options = { bundle: true, platform: "node", format: "esm", target: "node22", packages: "external", sourcemap: false, minify: false };
  const compiled = await build({
    ...options, absWorkingDir: root, write: false, metafile: true, logLevel: "silent",
    stdin: { contents: [
      'export { buildAudit } from "./tools/audit-revised-generation-inputs.mjs";',
      'export { buildCandidateSourceContract, auditCandidateSourceDetails } from "./tools/revised-candidate-source-contract.mjs";',
      'export { auditRevisedCandidate } from "./src/core/revisedCandidateAudit.ts";',
      'export { searchRevisedLevel, replayRevisedRoute } from "./src/core/revisedLevelSearch.ts";',
      'export { checkRevisedRepositionFloor } from "./src/core/revisedRepositionFloor.ts";',
      'export { certifyFirstExitObligations } from "./tools/revised-first-exit-obligations.mjs";',
      'export { auditCandidateBlockArt } from "./tools/revised-candidate-block-art.mjs";',
    ].join("\n"), resolveDir: root, sourcefile: "revised-artifact-entry.mjs", loader: "js" },
    // Give bundled source utilities a valid project-relative URL, without firing their CLI guards.
    define: { "import.meta.url": JSON.stringify(pathToFileURL(resolve(root, "tools/__revised_artifact_runtime__.mjs")).href) },
    plugins: [{ name: "capture-executed-source-bytes", setup(bundler) {
      bundler.onLoad({ filter: /\.(?:mjs|js|ts|json)$/ }, async ({ path }) => {
        const bytes = await readFile(path);
        const rel = relative(root, path).replaceAll("\\", "/");
        repositoryPath(root, rel);
        if (rel.startsWith("node_modules/")) throw new Error("Unexpected bundled package; external dependencies need an explicit binding policy");
        files[rel] = { sha256: digest(bytes) };
        return { contents: bytes, loader: path.endsWith(".ts") ? "ts" : path.endsWith(".json") ? "json" : "js" };
      });
    } }],
  });
  for (const path of Object.keys(compiled.metafile.inputs)) {
    if (path === "revised-artifact-entry.mjs") continue;
    if (!files[path.replaceAll("\\", "/")]) throw new Error(`Unbound executable input: ${path}`);
  }
  const code = compiled.outputFiles[0].text;
  await assertFileBindings(files, root);
  const runtime = await import(`data:text/javascript;base64,${Buffer.from(`${code}\n// fresh ${randomUUID()}`).toString("base64")}`);
  return { runtime, files, tool: { version: ARTIFACT_VERSION, bundleSha256: digest(code), esbuildVersion, nodeVersion: process.version,
    platform: process.platform, arch: process.arch, compilerOptions: options } };
}

async function prepareInputs(root) {
  const loaded = await loadBoundRuntime(root);
  const audit = await loaded.runtime.buildAudit(root);
  if (audit.rulesDocumentVersion !== "1.2.1" || audit.ruleVersion !== "revised-2026-09-21-v1.2"
    || !audit.conclusion.mechanismInventoryComplete || audit.conclusion.hardConflictLevels.length
    || !audit.evidenceIntegrity.directLedgerHashMatchesTruth || !audit.evidenceIntegrity.correctionHashMatchesTruth
    || !audit.evidenceIntegrity.sourceReviewVerified || !audit.evidenceIntegrity.mechanismInventoryVerified) {
    throw new Error("Source/rule inventory verification is incomplete or conflicted");
  }
  const files = { ...loaded.files };
  for (const [path, binding] of Object.entries(audit.inputs)) {
    if (files[path] && files[path].sha256 !== binding.sha256) throw new Error(`Compilation/source snapshot drift: ${path}`);
    files[path] = binding;
  }
  // Reference opening frames that predate corrected stable-opening reviews are still bound.
  for (const evidence of audit.evidenceIntegrity.openingEvidenceFiles) {
    if (!evidence.exists || !evidence.sha256) throw new Error(`Missing opening evidence: ${evidence.path}`);
    files[evidence.path] = { sha256: evidence.sha256 };
  }
  const manifest = parseJson(await readFile(resolve(root, "docs/rules/manifest.json")));
  const active = manifest.versions.find((entry) => entry.version === manifest.activeVersion);
  await assertFileBindings(files, root);
  return { ...loaded, files, audit, rules: structuredClone(active) };
}

/** Bind all ten source contracts before there is any candidate to bias their quotas. */
export async function prepareSourceBatch({ root = ROOT } = {}) {
  const input = await prepareInputs(root);
  const contracts = input.audit.levels.map((row) => input.runtime.buildCandidateSourceContract(row, { seed: `source-contract-lv${row.level}`, audit: input.audit }));
  await assertFileBindings(input.files, root);
  return sealArtifact({ schemaVersion: ARTIFACT_VERSION, kind: "source-contract-batch", generatedAt: new Date().toISOString(),
    rules: input.rules, tool: input.tool, files: input.files, contracts, generationSeedsAssigned: false,
    releaseApproved: false, userAccepted: false, scope: "Isolated Lv21-30 input contracts only; synthetic contract labels are not generated-candidate seeds" });
}

/** Full fresh validation. Saved result booleans are never an execution input. */
export async function validateCandidateFile(candidatePath, { root = ROOT, budgets = {}, previousPath, routePath } = {}) {
  const absolute = isAbsolute(candidatePath) ? candidatePath : resolve(root, candidatePath);
  const candidateRelative = relative(root, absolute).replaceAll("\\", "/");
  repositoryPath(root, candidateRelative);
  const bytes = await readFile(absolute);
  const proposal = parseProposal(parseJson(bytes));
  const input = await prepareInputs(root);
  const row = input.audit.levels.find((entry) => entry.level === proposal.levelId);
  const source = input.runtime.buildCandidateSourceContract(row, { seed: proposal.seed, audit: input.audit });
  const files = { ...input.files, [candidateRelative]: { sha256: digest(bytes) } };
  const blockArt = input.runtime.auditCandidateBlockArt(proposal.level);
  for (const requirement of blockArt.requirements) {
    const path = `public/${requirement.path}`;
    try { files[path] = { sha256: digest(await readFile(repositoryPath(root, path))) }; }
    catch (error) {
      if (error.code !== "ENOENT") throw error;
      blockArt.issues.push({ code: "missing-whole-block-file", ...requirement });
    }
  }
  blockArt.passed = blockArt.issues.length === 0;
  let suppliedRoute = null, routeFile = null;
  if (routePath) {
    routeFile = relative(root, resolve(root, routePath)).replaceAll("\\", "/");
    const routeBytes = await readFile(repositoryPath(root, routeFile));
    files[routeFile] = { sha256: digest(routeBytes) };
    suppliedRoute = parseCandidateRoute(parseJson(routeBytes), proposal.level);
  }
  const context = { rules: input.rules, levelId: proposal.levelId, seed: proposal.seed,
    candidateFile: candidateRelative, candidateByteSha256: digest(bytes), candidateSha256: semanticHash(proposal.level),
    proposalSha256: semanticHash(proposal), sourceContractSha256: semanticHash(source), source, files, tool: input.tool,
    budgets: normalizeBudgets(budgets), floor: source.minimumRepositionFloor,
    routeFile, suppliedRouteSha256: suppliedRoute ? semanticHash(suppliedRoute) : null };
  await assertFileBindings(files, root);
  if (previousPath) assertSameContext(parseJson(await readFile(resolve(root, previousPath))), context);
  const audit = input.runtime.auditRevisedCandidate(proposal.level, source.sourceContract);
  const attachments = input.runtime.auditCandidateSourceDetails(proposal.level, row);
  const difficultyMatches = proposal.level.difficulty === (source.band === "super-hard" ? "super" : source.band);
  const skipped = { status: "not-run", reason: "Candidate static/source contract failed" };
  let witness = skipped, replay = skipped, floor = skipped, structuralFloor = skipped;
  if (audit.staticPassed && attachments.passed && difficultyMatches) {
    if (suppliedRoute) {
      const checked = input.runtime.replayRevisedRoute(proposal.level, suppliedRoute.drags);
      witness = { status: checked.valid && checked.complete ? "witness" : "invalid", witnessFound: checked.valid && checked.complete,
        evidence: "supplied-route-fresh-model-replay", pointerPolicy: "first-shape-cell-center-and-unit-steps",
        drags: suppliedRoute.drags, replay: checked, lowerBoundCertified: false, pointerReplayValidated: false, timeValidated: false };
    } else witness = input.runtime.searchRevisedLevel(proposal.level, context.budgets);
    if (witness.witnessFound) replay = input.runtime.replayRevisedRoute(proposal.level, witness.drags);
    else replay = { status: "not-run", reason: "No spatial witness found" };
    // Lower-bound evidence remains independent of whether the subset search found a route.
    structuralFloor = input.runtime.certifyFirstExitObligations(proposal.level, { floor: context.floor });
    floor = structuralFloor.thresholdProven === true ? structuralFloor
      : input.runtime.checkRevisedRepositionFloor(proposal.level, { ...context.budgets, floor: context.floor });
  }
  await assertFileBindings(files, root);
  const gates = {
    static: audit.staticPassed && attachments.passed && difficultyMatches,
    stageAttachments: attachments.checked === true && attachments.passed === true,
    wholeBlockArt: blockArt.passed === true,
    spatialWitness: witness.witnessFound === true && replay.valid === true && replay.complete === true,
    repositionFloor: floor.thresholdProven === true && floor.status === "threshold-proven" && floor.floor === context.floor,
    pointerReplay: false, sameRouteTimeAndStars: false, calibratedTimeCoefficients: false, userAcceptance: false,
  };
  return sealArtifact({ schemaVersion: ARTIFACT_VERSION, kind: "candidate-validation", generatedAt: new Date().toISOString(),
    context, evidence: { static: audit, stageAttachments: attachments, wholeBlockArt: blockArt, difficultyMatches, witness, independentModelReplay: replay,
      structuralFloor, repositionFloor: floor,
      routeSha256: witness.witnessFound ? semanticHash(witness.drags) : null }, gates,
    status: !gates.static ? "rejected-static" : !gates.wholeBlockArt ? "rejected-block-art"
      : gates.spatialWitness && gates.repositionFloor ? "awaiting-pointer-time-calibration" : "not-certified",
    outstandingGates: Object.keys(gates).filter((key) => !gates[key]), releaseApproved: false, userAccepted: false,
    verifiedByFreshExecution: true,
    scope: "Isolated candidate only. No import/write of formal LEVELS, no saved proof trusted, no Pointer/time/user approval inferred." });
}

/** Recheck immediately before persistence; output is new and confined to experiment artifacts. */
export async function writeArtifact(artifact, outputPath, root = ROOT) {
  const body = verifyArtifactSeal(artifact);
  const files = body.context?.files ?? body.files;
  await assertFileBindings(files, root);
  const allowed = resolve(root, OUTPUT_ROOT);
  const output = resolve(root, outputPath);
  const rel = relative(allowed, output);
  if (!rel || rel.startsWith("..") || isAbsolute(rel) || !output.endsWith(".json")) throw new Error(`Reports must be new JSON files inside ${OUTPUT_ROOT}`);
  // Resolve an existing ancestor before creating directories, rejecting junction escapes.
  let ancestor = dirname(output), actualAncestor;
  while (true) {
    try { actualAncestor = await realpath(ancestor); break; }
    catch (error) { if (error.code !== "ENOENT") throw error; ancestor = dirname(ancestor); }
  }
  const actualRoot = await realpath(root);
  const expectedAncestor = resolve(actualRoot, relative(root, ancestor));
  if (relative(expectedAncestor, actualAncestor) !== "") throw new Error("Artifact output traverses a junction or symlink");
  await mkdir(dirname(output), { recursive: true });
  const actualParent = await realpath(dirname(output));
  const parentRelative = relative(resolve(actualRoot, OUTPUT_ROOT), actualParent);
  if (parentRelative.startsWith("..") || isAbsolute(parentRelative)) throw new Error("Artifact parent escapes experiment output root");
  await assertFileBindings(files, root);
  // Exclusive create deliberately refuses overwriting even an existing experiment report.
  await writeFile(output, `${JSON.stringify(artifact, null, 2)}\n`, { encoding: "utf8", flag: "wx" });
  return output;
}

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const options = {};
  const allowed = ["candidate", "route", "previous", "out", "max-states", "max-drag-states", "max-transitions", "max-milliseconds"];
  for (const arg of args) {
    const match = /^--([^=]+)=(.+)$/.exec(arg);
    if (!match || !allowed.includes(match[1]) || options[match[1]] !== undefined) throw new Error(`Unknown/duplicate option: ${arg}`);
    options[match[1]] = match[2];
  }
  if (!["inputs", "validate", "verify"].includes(command)) throw new Error("Usage: revised-candidate-artifact.mjs inputs | validate --candidate=path | verify --candidate=path --previous=report [--out=path]");
  if (command === "inputs" && Object.keys(options).some((key) => key !== "out")) throw new Error("inputs accepts only --out");
  if (command !== "inputs" && !options.candidate) throw new Error("Missing --candidate");
  if ((command === "verify") !== Boolean(options.previous)) throw new Error("--previous is required only for verify; stored gates are always recomputed");
  const budgets = {};
  for (const [flag, key] of [["max-states", "maxStates"], ["max-drag-states", "maxDragStates"], ["max-transitions", "maxTransitions"], ["max-milliseconds", "maxMilliseconds"]]) {
    if (options[flag]) budgets[key] = Number(options[flag]);
  }
  const artifact = command === "inputs" ? await prepareSourceBatch() : await validateCandidateFile(options.candidate, { budgets, previousPath: options.previous, routePath: options.route });
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const output = options.out ?? `${OUTPUT_ROOT}/${stamp}-${randomUUID().slice(0, 8)}-${command}.json`;
  const path = await writeArtifact(artifact, output);
  console.log(JSON.stringify({ command, path, status: artifact.status ?? "source-contracts-bound", levels: artifact.contracts?.length,
    gates: artifact.gates, releaseApproved: false }, null, 2));
  if (artifact.gates && (!artifact.gates.static || !artifact.gates.wholeBlockArt || !artifact.gates.spatialWitness || !artifact.gates.repositionFloor)) process.exitCode = 2;
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => { console.error(`FAIL artifact pipeline: ${error.message}`); process.exitCode = 1; });
}
