import { createHash } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

/** Compose the isolated Lv38/Lv62 assembly with the exact Lv77 carrier seed. */

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaults = {
  contract: "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json",
  companionLevels: ".codex-temp/video-parity-gate-deadline-full-r10/verified-runtime.generated.ts",
  companionAudit: ".codex-temp/video-parity-gate-deadline-full-r10/verified-runtime-audit.json",
  companionRoutes: ".codex-temp/video-parity-gate-deadline-full-r10/final-completion-witnesses.json",
  gateSeed: ".codex-temp/video-parity-gate-deadline-seeds-r11/base-overrides.json",
  lv77Levels: ".codex-temp/video-parity-lv77-numeric-carrier-seed-r11/runtime-levels.json",
  lv77Audit: ".codex-temp/video-parity-lv77-numeric-carrier-seed-r11/audit.json",
  lv77BaseSeed: ".codex-temp/video-parity-lv77-numeric-queue-seed-r11/base-overrides.json",
  outputDir: ".codex-temp/video-parity-gate-deadline-complete-r11",
};

const parseArgs = (argv) => {
  const options = { ...defaults };
  const names = new Map([
    ["--contract", "contract"],
    ["--companion-levels", "companionLevels"],
    ["--companion-audit", "companionAudit"],
    ["--companion-routes", "companionRoutes"],
    ["--gate-seed", "gateSeed"],
    ["--lv77-levels", "lv77Levels"],
    ["--lv77-audit", "lv77Audit"],
    ["--lv77-base-seed", "lv77BaseSeed"],
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
const clone = (value) => structuredClone(value);
const paths = Object.fromEntries(Object.entries(options)
  .filter(([key]) => key !== "outputDir")
  .map(([key, path]) => [key, absolute(path)]));
const outputDir = absolute(options.outputDir);
const levelsOutputPath = resolve(outputDir, "runtime.generated.ts");
const routesOutputPath = resolve(outputDir, "input-routes.json");
const auditOutputPath = resolve(outputDir, "composition-audit.json");

const entries = await Promise.all(Object.entries(paths).map(async ([key, path]) => [key, await readFile(path, "utf8")]));
const sources = Object.fromEntries(entries);
const contractSha = sha256(sources.contract);

const companionBundle = await build({
  entryPoints: [paths.companionLevels],
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const companionUrl = `data:text/javascript;base64,${Buffer.from(companionBundle.outputFiles[0].text).toString("base64")}`;
const companionModule = await import(companionUrl);
const companionLevels = companionModule.VIDEO_PARITY_LEVELS;
const companionAudit = JSON.parse(sources.companionAudit);
const companionRoutes = JSON.parse(sources.companionRoutes);
const gateSeed = JSON.parse(sources.gateSeed);
const lv77Artifact = JSON.parse(sources.lv77Levels);
const lv77Audit = JSON.parse(sources.lv77Audit);
const lv77BaseSeed = JSON.parse(sources.lv77BaseSeed);
const activeContract = JSON.parse(sources.contract);
for (const id of [38, 62, 77]) {
  const label = `Lv${String(id).padStart(3, "0")}`;
  const seededTarget = gateSeed.levels?.find((entry) => entry.level_id === label)?.target;
  const activeTarget = activeContract.levels?.find((entry) => entry.level_id === label)?.our_design_target;
  if (!seededTarget || JSON.stringify(seededTarget) !== JSON.stringify(activeTarget)) {
    throw new Error(`${label} gate seed target does not exactly match the active contract`);
  }
}

const selected = [38, 62].map((id) => {
  const level = companionLevels.find((candidate) => Number(candidate.id) === id);
  const audit = companionAudit.levels.find((candidate) => candidate.level_id === `Lv${String(id).padStart(3, "0")}`);
  if (!level || !audit?.exact_contract?.exact || audit.validate_level !== "pass"
    || !audit.completion_witness?.replayed) {
    throw new Error(`Lv${id} companion evidence is not exact/validated/replayed`);
  }
  return clone(level);
});
const lv77 = lv77Artifact.levels?.find((entry) => entry.level_id === "Lv077")?.level;
if (!lv77 || lv77Audit.validation?.seeded_validate_level !== "pass"
  || !lv77Audit.validation?.unchanged_outside_numeric_carriers
  || !lv77Audit.validation?.inherited_exact_contract) {
  throw new Error("Lv77 carrier seed is not exact and validateLevel-passing");
}
selected.push(clone(lv77));
selected.sort((left, right) => left.id - right.id);

const puzzleBundle = await build({
  stdin: {
    contents: `export { validateLevel } from "./src/core/PuzzleModel.ts";`,
    resolveDir: root,
    sourcefile: "gate-deadline-r10-evidence-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const puzzleBundleSource = puzzleBundle.outputFiles[0].text;
const puzzleUrl = `data:text/javascript;base64,${Buffer.from(puzzleBundleSource).toString("base64")}`;
const { validateLevel } = await import(puzzleUrl);
for (const level of selected) validateLevel(level);

const companionRouteEntries = companionRoutes.filter((entry) => ["Lv038", "Lv062"].includes(entry.level_id));
if (companionRouteEntries.length !== 2 || companionRouteEntries.some((entry) => !entry.replayed)) {
  throw new Error("Companion route artifact lacks replayed Lv38/Lv62 witnesses");
}
const lv77BaseRoute = lv77BaseSeed.levels?.find((entry) => entry.level_id === "Lv077")?.route;
if (!Array.isArray(lv77BaseRoute) || !lv77BaseRoute.length) throw new Error("Lv77 base seed route is missing");
const inputRoutes = [
  ...clone(companionRouteEntries),
  {
    level_id: "Lv077",
    source: "lv77-numeric-carrier-seed-authored-repair-input",
    proof_scope: "input constraints only; not a completion claim until fresh runtime replay",
    replayed: false,
    route: clone(lv77BaseRoute),
  },
];

const levelsSource = `/* eslint-disable */
// AUTO-GENERATED by tools/compose-video-parity-gate-deadline-r10-evidence.mjs.
// Contract SHA-256: ${contractSha}
// Isolated evidence only; this file is not a formal campaign source.
export const VIDEO_PARITY_LEVELS = ${JSON.stringify(selected, null, 2)};
`;
const routesSource = `${JSON.stringify(inputRoutes, null, 2)}\n`;
const generatedOn = new Date().toISOString();
const sourceBindings = Object.fromEntries(Object.entries(paths).map(([key, path]) => [key, {
  path: display(path),
  sha256: sha256(sources[key]),
}]));
const audit = {
  schema_version: "blockout-video-parity-gate-deadline-complete-r10-composition-v1",
  generated_on: generatedOn,
  contract_sha256: contractSha,
  sources: sourceBindings,
  runtime_authority: {
    path: "src/core/PuzzleModel.ts",
    bundled_with_dependencies_sha256: sha256(puzzleBundleSource),
  },
  outputs: {
    levels: { path: display(levelsOutputPath), sha256: sha256(levelsSource) },
    input_routes: { path: display(routesOutputPath), sha256: sha256(routesSource) },
  },
  summary: {
    levels: selected.length,
    exact_contract: 3,
    validate_level_passed: 3,
    preexisting_fresh_replay_witnesses: 2,
    pending_fresh_replay_level_ids: ["Lv077"],
    active_contract_target_exact: 3,
  },
};

await mkdir(outputDir, { recursive: true });
const writeAtomic = async (path, value) => {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, value, "utf8");
  await rm(path, { force: true });
  await rename(temporary, path);
};
await Promise.all([
  writeAtomic(levelsOutputPath, levelsSource),
  writeAtomic(routesOutputPath, routesSource),
  writeAtomic(auditOutputPath, `${JSON.stringify(audit, null, 2)}\n`),
]);
console.log(JSON.stringify(audit, null, 2));
