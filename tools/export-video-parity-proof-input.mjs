import { build } from "esbuild";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Prototype-only bridge from an exact generated TypeScript runtime to the
// memory-bounded legacy proof-input envelope.  It never edits live levels.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const runtimeRelative = process.env.VIDEO_PARITY_PROOF_RUNTIME_RELATIVE;
const auditRelative = process.env.VIDEO_PARITY_PROOF_AUDIT_RELATIVE;
const routesRelative = process.env.VIDEO_PARITY_PROOF_ROUTES_RELATIVE;
const outputRelative = process.env.VIDEO_PARITY_PROOF_INPUT_OUTPUT_RELATIVE;
const contractRelative = process.env.VIDEO_PARITY_CONTRACT_RELATIVE
  ?? "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-design-contract-v6.json";
if (!runtimeRelative || !auditRelative || !routesRelative || !outputRelative) {
  throw new Error("runtime, audit, routes and output environment paths are required");
}
const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const [runtimeText, auditText, routesText, contractText] = await Promise.all([
  readFile(resolve(root, runtimeRelative), "utf8"),
  readFile(resolve(root, auditRelative), "utf8"),
  readFile(resolve(root, routesRelative), "utf8"),
  readFile(resolve(root, contractRelative), "utf8"),
]);
const audit = JSON.parse(auditText);
const routes = JSON.parse(routesText);
const contract = JSON.parse(contractText);
const contractSha256 = sha256(contractText);
if (String(audit.inputs?.contract?.sha256).toUpperCase() !== contractSha256
  || String(audit.outputs?.levels_sha256).toUpperCase() !== sha256(runtimeText)) {
  throw new Error("runtime/audit/contract binding mismatch");
}
const bundle = await build({
  stdin: {
    contents: `export { VIDEO_PARITY_LEVELS as levels } from ${JSON.stringify(resolve(root, runtimeRelative))};`,
    resolveDir: root,
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const { levels } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
const targetById = new Map(contract.levels.map((entry) => [entry.level_id, entry.our_design_target]));
const routeById = new Map((Array.isArray(routes) ? routes : routes.levels ?? routes.routes ?? [])
  .map((entry) => [entry.level_id, entry.drags ?? entry.route ?? entry.actions ?? []]));
const label = (id) => `Lv${String(id).padStart(3, "0")}`;
const output = {
  title: "Current v6 contract-bound runtime proof input",
  applied_to_live_campaign: false,
  source_binding: {
    runtime: { path: runtimeRelative, sha256: sha256(runtimeText) },
    audit: { path: auditRelative, sha256: sha256(auditText) },
    routes: { path: routesRelative, sha256: sha256(routesText) },
    contract: { path: contractRelative, sha256: contractSha256 },
  },
  levels: levels.map((level) => ({
    level_id: label(level.id),
    target: targetById.get(label(level.id)),
    level,
    route: routeById.get(label(level.id)) ?? [],
  })),
};
const outputText = `${JSON.stringify(output, null, 2)}\n`;
const outputPath = resolve(root, outputRelative);
await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, outputText, "utf8");
console.log(JSON.stringify({ output: outputRelative, levels: levels.map((level) => label(level.id)), sha256: sha256(outputText), contract_sha256: contractSha256 }, null, 2));
