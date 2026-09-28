import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/**
 * Prepare an isolated, current-contract-bound input for the Lv17/Lv32
 * gate/numeric last-block repair.  The inherited R10 LevelSpecs are already
 * exact mechanism assemblies over the R9 base geometry; only their completion
 * witnesses are missing.  This tool does not alter a LevelSpec.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  contract: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
  baseCandidates: ".codex-temp/numeric-deadline-peel-full-r9/report/formal-candidates.json",
  inheritedLevels: ".codex-temp/video-parity-v6-runtime-r10/runtime.generated.ts",
  inheritedAudit: ".codex-temp/video-parity-v6-runtime-r10/audit.json",
  outputDir: ".codex-temp/video-parity-lv17-lv32-last-gate-seeds/input",
};

const parseArgs = (argv) => {
  const options = { ...defaults };
  const names = new Map([
    ["--contract", "contract"],
    ["--base-candidates", "baseCandidates"],
    ["--inherited-levels", "inheritedLevels"],
    ["--inherited-audit", "inheritedAudit"],
    ["--output-dir", "outputDir"],
  ]);
  for (let index = 0; index < argv.length; index += 1) {
    const name = names.get(argv[index]);
    if (!name) throw new Error(`Unknown option: ${argv[index]}`);
    const value = argv[index + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${argv[index]}`);
    options[name] = value;
    index += 1;
  }
  return options;
};

const options = parseArgs(process.argv.slice(2));
const absolute = (path) => resolve(root, path);
const display = (path) => relative(root, path).replaceAll("\\", "/");
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const sameJson = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const selectedIds = [17, 32];
const paths = Object.fromEntries(Object.entries(options)
  .filter(([key]) => key !== "outputDir")
  .map(([key, path]) => [key, absolute(path)]));
const outputDir = absolute(options.outputDir);
const outputPath = resolve(outputDir, "runtime-candidates.json");
const auditPath = resolve(outputDir, "audit.json");
const sources = Object.fromEntries(await Promise.all(Object.entries(paths).map(async ([key, path]) => (
  [key, await readFile(path, "utf8")]
))));

const levelsBundle = await build({
  entryPoints: [paths.inheritedLevels],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const levelsBundleSource = levelsBundle.outputFiles[0].text;
const levelsModuleUrl = `data:text/javascript;base64,${Buffer.from(levelsBundleSource).toString("base64")}`;
const inheritedLevels = (await import(levelsModuleUrl)).VIDEO_PARITY_LEVELS;
const contract = JSON.parse(sources.contract);
const baseArtifact = JSON.parse(sources.baseCandidates);
const inheritedAudit = JSON.parse(sources.inheritedAudit);

const entries = selectedIds.map((id) => {
  const levelId = `Lv${String(id).padStart(3, "0")}`;
  const target = contract.levels.find((entry) => entry.level_id === levelId)?.our_design_target;
  const baseEntry = baseArtifact.levels?.find((entry) => entry.level_id === levelId);
  const level = inheritedLevels?.find((entry) => Number(entry.id) === id);
  const audit = inheritedAudit.levels?.find((entry) => entry.level_id === levelId);
  if (!target || !baseEntry || !level || !audit) throw new Error(`${levelId} is missing an input`);
  if (!sameJson(target, baseEntry.target)) {
    throw new Error(`${levelId} R9 base target differs from the active contract`);
  }
  if (!audit.exact_contract?.exact || audit.validate_level !== "pass") {
    throw new Error(`${levelId} inherited mechanism assembly is not exact/validated`);
  }
  if (Number(level.width) !== Number(baseEntry.level.width)
    || Number(level.height) !== Number(baseEntry.level.height)
    || !sameJson(level.playable, baseEntry.level.playable)
    || !sameJson(level.blocks.map((block) => [block.id, block.x, block.y, block.shape]),
      baseEntry.level.blocks.map((block) => [block.id, block.x, block.y, block.shape]))) {
    throw new Error(`${levelId} inherited runtime no longer uses the exact R9 base geometry`);
  }
  return {
    level_id: levelId,
    target,
    level,
    route: [],
    provenance: {
      r9_base_geometry_exact: true,
      inherited_exact_contract: true,
      inherited_validate_level: "pass",
      inherited_completion_status: audit.status,
    },
  };
});

const generatedOn = new Date().toISOString();
const artifact = {
  schema_version: "blockout-video-parity-lv17-lv32-runtime-seed-input-v1",
  generated_on: generatedOn,
  source_contract: { path: display(paths.contract), sha256: sha256(sources.contract) },
  levels: entries,
};
const artifactText = `${JSON.stringify(artifact, null, 2)}\n`;
const audit = {
  schema_version: "blockout-video-parity-lv17-lv32-runtime-seed-input-audit-v1",
  generated_on: generatedOn,
  inputs: Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, {
    path: display(path),
    sha256: sha256(sources[key]),
  }])),
  runtime_import_bundle_sha256: sha256(levelsBundleSource),
  output: { path: display(outputPath), sha256: sha256(artifactText) },
  summary: {
    selected: entries.length,
    active_contract_target_exact: entries.length,
    r9_base_geometry_exact: entries.length,
    inherited_exact_contract: entries.length,
    inherited_validate_level: entries.length,
  },
};

const writeAtomic = async (path, value) => {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, value, "utf8");
  await rm(path, { force: true });
  await rename(temporary, path);
};
await Promise.all([
  writeAtomic(outputPath, artifactText),
  writeAtomic(auditPath, `${JSON.stringify(audit, null, 2)}\n`),
]);
console.log(JSON.stringify(audit, null, 2));
