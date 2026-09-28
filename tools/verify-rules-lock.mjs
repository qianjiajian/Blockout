import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const MANIFEST_PATH = "docs/rules/manifest.json";

export function rulesDigest(text) {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  return createHash("sha256").update(normalized, "utf8").digest("hex");
}

// Dependency injection keeps negative tests read-only: no edits to frozen files.
export function verifyRulesLock({
  readText = (path) => readFileSync(resolve(PROJECT_ROOT, path), "utf8"),
} = {}) {
  const errors = [];
  const read = (path) => {
    try { return readText(path); }
    catch (error) {
      errors.push(`Cannot read ${path}: ${error.message}`);
      return null;
    }
  };
  const raw = read(MANIFEST_PATH);
  if (raw === null) return { ok: false, errors, verified: [] };
  let manifest;
  try { manifest = JSON.parse(raw.replace(/^\uFEFF/, "")); }
  catch (error) { return { ok: false, errors: [`Invalid manifest JSON: ${error.message}`], verified: [] }; }
  if (!manifest || manifest.schemaVersion !== 1 || manifest.hashAlgorithm !== "sha256-utf8-lf"
    || typeof manifest.activeVersion !== "string" || !Array.isArray(manifest.versions) || !manifest.versions.length) {
    return { ok: false, errors: ["Unsupported or incomplete rules manifest"], verified: [] };
  }
  const seenVersions = new Set();
  const seenDocuments = new Set();
  const verified = [];
  for (const entry of manifest.versions) {
    if (!entry || !/^\d+\.\d+\.\d+$/.test(entry.version ?? "")
      || entry.ruleId !== `blockout-rules-v${entry.version}` || typeof entry.runtimeProfile !== "string"
      || !entry.runtimeProfile || entry.status !== "frozen" || !/^[a-f0-9]{64}$/.test(entry.sha256 ?? "")) {
      errors.push("Invalid frozen version entry");
      continue;
    }
    if (seenVersions.has(entry.version)) errors.push(`Duplicate version ${entry.version}`);
    seenVersions.add(entry.version);
    const path = entry.document;
    if (typeof path !== "string" || !path.startsWith("docs/") || !path.endsWith(".md")
      || path.includes("\\") || path.split("/").some((segment) => !segment || segment === ".." || segment === ".")
      || isAbsolute(path)) {
      errors.push(`Invalid rule document path for ${entry.version}`);
      continue;
    }
    if (seenDocuments.has(path)) errors.push(`Versions must not overwrite the same document: ${path}`);
    seenDocuments.add(path);
    const text = read(path);
    if (text === null) continue;
    const actual = rulesDigest(text);
    if (actual !== entry.sha256) errors.push(`Frozen document changed: ${path}; expected ${entry.sha256}, actual ${actual}`);
    if (!text.includes(entry.ruleId) || !text.includes(entry.runtimeProfile)) errors.push(`Missing rule/profile identity: ${path}`);
    verified.push({ version: entry.version, document: path, sha256: actual });
  }
  const active = manifest.versions.find((entry) => entry?.version === manifest.activeVersion);
  if (!active) errors.push("Active rules version is not registered");
  const agents = read("AGENTS.md");
  if (agents !== null && (!agents.includes(MANIFEST_PATH) || !agents.includes("docs/rules/WORKSTATE.md")
    || !agents.includes("tools/verify-rules-lock.mjs") || (active && !agents.includes(active.document)))) {
    errors.push("AGENTS.md must point to the manifest, active document, workstate and verifier");
  }
  if (read("docs/rules/WORKSTATE.md")?.trim() === "") errors.push("Workstate must not be empty");
  if (read("docs/rules/README.md")?.trim() === "") errors.push("Recovery instructions must not be empty");
  return { ok: errors.length === 0, activeVersion: manifest.activeVersion, errors, verified };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = verifyRulesLock();
  if (result.ok) {
    console.log(`PASS rules lock: active v${result.activeVersion}; ${result.verified.length} immutable version(s)`);
    for (const entry of result.verified) console.log(`${entry.version} ${entry.sha256} ${entry.document}`);
    console.log("Document integrity only; not gameplay validation or release approval.");
  } else {
    console.error(`FAIL rules lock:\n${result.errors.join("\n")}`);
    process.exitCode = 1;
  }
}
