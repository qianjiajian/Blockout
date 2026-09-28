import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Extract exact, replayed runtime records into a contract-bound override shim.
// This is used only under .codex-temp so isolated floor experiments can cover
// contract-projection drift without touching the formal generator or campaign.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contractRelative = process.env.VIDEO_PARITY_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
const runtimeRelative = process.env.VIDEO_PARITY_RUNTIME_SEED_LEVELS_RELATIVE
  ?? ".codex-temp/video-parity-v6-runtime-r13-final/runtime.generated.ts";
const auditRelative = process.env.VIDEO_PARITY_RUNTIME_SEED_AUDIT_RELATIVE
  ?? ".codex-temp/video-parity-v6-runtime-r13-final/audit.json";
const routesRelative = process.env.VIDEO_PARITY_RUNTIME_SEED_ROUTES_RELATIVE
  ?? ".codex-temp/video-parity-v6-runtime-r13-final/routes.json";
const fallbackRoutesRelatives = String(process.env.VIDEO_PARITY_RUNTIME_SEED_FALLBACK_ROUTES_RELATIVES
  ?? ".codex-temp/video-parity-v6-runtime-r13-final/fresh-witnesses-11.json")
  .split(";").map((value) => value.trim()).filter(Boolean);
const scaffoldCandidatesRelative = process.env.VIDEO_PARITY_RUNTIME_SEED_SCAFFOLD_CANDIDATES_RELATIVE
  ?.trim() || null;
const outputRelative = process.env.VIDEO_PARITY_RUNTIME_SEED_OUTPUT_RELATIVE
  ?? ".codex-temp/video-parity-runtime-base-seeds/overrides.json";
const ids = String(process.env.VIDEO_PARITY_RUNTIME_SEED_LEVEL_IDS ?? "")
  .split(",").map((value) => Number(value.trim())).filter(Number.isInteger);
if (!ids.length) throw new Error("VIDEO_PARITY_RUNTIME_SEED_LEVEL_IDS is required");

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const label = (id) => `Lv${String(id).padStart(3, "0")}`;
const [contractText, runtimeText, auditText, routesText, scaffoldCandidatesText, ...fallbackRoutesTexts] = await Promise.all([
  readFile(resolve(root, contractRelative), "utf8"),
  readFile(resolve(root, runtimeRelative), "utf8"),
  readFile(resolve(root, auditRelative), "utf8"),
  readFile(resolve(root, routesRelative), "utf8"),
  scaffoldCandidatesRelative
    ? readFile(resolve(root, scaffoldCandidatesRelative), "utf8")
    : Promise.resolve(null),
  ...fallbackRoutesRelatives.map((path) => readFile(resolve(root, path), "utf8")),
]);
const contract = JSON.parse(contractText);
const audit = JSON.parse(auditText);
const routesArtifact = JSON.parse(routesText);
const contractSha256 = sha256(contractText);
if (String(audit.inputs?.contract?.sha256 ?? "").toUpperCase() !== contractSha256) {
  throw new Error("Runtime audit is not bound to the active contract");
}
if (String(audit.outputs?.levels_sha256 ?? "").toUpperCase() !== sha256(runtimeText)) {
  throw new Error("Runtime source SHA differs from its audit");
}
const bundle = await build({
  entryPoints: [resolve(root, runtimeRelative)], bundle: true, platform: "node",
  format: "esm", write: false, logLevel: "silent",
});
const module = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const runtimeById = new Map(module.VIDEO_PARITY_LEVELS.map((level) => [level.id, level]));
const auditById = new Map(audit.levels.map((entry) => [Number(entry.level_id.replace(/^Lv/i, "")), entry]));
const routeEntries = Array.isArray(routesArtifact) ? routesArtifact : routesArtifact.levels ?? [];
const routeById = new Map(routeEntries.map((entry) => [
  Number(String(entry.level_id ?? entry.id).replace(/^Lv/i, "")), entry.drags ?? entry.route ?? [],
]));
for (const text of fallbackRoutesTexts) {
  const artifact = JSON.parse(text);
  for (const entry of Array.isArray(artifact) ? artifact : artifact.levels ?? []) {
    const id = Number(String(entry.level_id ?? entry.id).replace(/^Lv/i, ""));
    const route = entry.drags ?? entry.route ?? [];
    if (Number.isInteger(id) && Array.isArray(route) && route.length && entry.replayed !== false) {
      routeById.set(id, route);
    }
  }
}
const targetById = new Map(contract.levels.map((entry) => [
  Number(entry.level_id.replace(/^Lv/i, "")), entry.our_design_target,
]));
const scaffoldCandidatesArtifact = scaffoldCandidatesText ? JSON.parse(scaffoldCandidatesText) : null;
const scaffoldById = new Map((scaffoldCandidatesArtifact?.levels ?? []).map((entry) => {
  const level = entry.level ?? entry;
  return [Number(level.id ?? String(entry.level_id ?? "").replace(/^Lv/i, "")), level];
}));

const levels = ids.map((id) => {
  const level = runtimeById.get(id);
  const levelAudit = auditById.get(id);
  const route = routeById.get(id);
  if (!level || !levelAudit || !targetById.has(id)) throw new Error(`${label(id)} missing from source artifacts`);
  if (levelAudit.exact_contract?.exact !== true && levelAudit.status !== "assembled_and_replayed") {
    throw new Error(`${label(id)} runtime audit does not establish exact assembly`);
  }
  if (!Array.isArray(route) || !route.length) throw new Error(`${label(id)} has no runtime completion route`);
  const seededLevel = structuredClone(level);
  const scaffold = scaffoldById.get(id);
  if (scaffoldCandidatesRelative && !scaffold) {
    throw new Error(`${label(id)} has no stage scaffold in ${scaffoldCandidatesRelative}`);
  }
  if (scaffold) {
    // A fully assembled runtime replaces countdown-cover/generator staging
    // rectangles with live devices. Reattach the geometry-only base shutters
    // so a later assembler pass deterministically recreates the same device
    // placement while retaining the freshly repaired runtime route.
    seededLevel.shutters = structuredClone(scaffold.shutters ?? []);
  }
  return {
    level_id: label(id),
    target: targetById.get(id),
    level: seededLevel,
    route,
    route_semantics: "fully_assembled_runtime",
    validation: {
      source_runtime: runtimeRelative,
      source_runtime_sha256: sha256(runtimeText),
      source_audit: auditRelative,
      exact_contract: true,
      completion_witness_replayed: levelAudit.status === "assembled_and_replayed",
    },
  };
});
const output = {
  schema_version: "blockout-video-parity-base-overrides-v1",
  title: "Contract-bound exact runtime base seed shim",
  generated_on: new Date().toISOString(),
  prototype_only: true,
  applied_to_live_campaign: false,
  source: {
    contract: { path: contractRelative, sha256: contractSha256 },
    runtime: { path: runtimeRelative, sha256: sha256(runtimeText) },
    audit: { path: auditRelative, sha256: sha256(auditText) },
    routes: { path: routesRelative, sha256: sha256(routesText) },
    fallback_routes: fallbackRoutesRelatives.map((path, index) => ({
      path, sha256: sha256(fallbackRoutesTexts[index]),
    })),
    ...(scaffoldCandidatesText ? {
      scaffold_candidates: {
        path: scaffoldCandidatesRelative,
        sha256: sha256(scaffoldCandidatesText),
        purpose: "geometry-only staged-device placement scaffold",
      },
    } : {}),
  },
  scope: levels.map((entry) => entry.level_id),
  levels,
};
const text = `${JSON.stringify(output, null, 2)}\n`;
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, text, "utf8");
console.log(JSON.stringify({ output: outputRelative, levels: output.scope, sha256: sha256(text) }, null, 2));
