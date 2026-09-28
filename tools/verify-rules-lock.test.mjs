import test from "node:test";
import assert from "node:assert/strict";
import { rulesDigest, verifyRulesLock, MANIFEST_PATH } from "./verify-rules-lock.mjs";

function fixture() {
  const document = "docs/rules-v1.md";
  const text = "# blockout-rules-v1.0.0\nrevised-2026-09-21\n隐藏冰允许\n";
  const manifest = { schemaVersion: 1, activeVersion: "1.0.0", hashAlgorithm: "sha256-utf8-lf", versions: [
    { version: "1.0.0", ruleId: "blockout-rules-v1.0.0", runtimeProfile: "revised-2026-09-21", document, sha256: rulesDigest(text), status: "frozen" },
  ] };
  const files = new Map([
    [document, text],
    ["AGENTS.md", `${MANIFEST_PATH}\n${document}\ndocs/rules/WORKSTATE.md\ntools/verify-rules-lock.mjs`],
    ["docs/rules/WORKSTATE.md", "Not verified yet"],
    ["docs/rules/README.md", "Read the locked document first"],
  ]);
  return { manifest, files, document, verify: () => verifyRulesLock({ readText: (path) => {
    if (path === MANIFEST_PATH) return JSON.stringify(manifest);
    if (!files.has(path)) throw new Error("Missing file");
    return files.get(path);
  } }) };
}

test("current project rule lock and recovery pointers are valid", () => {
  const result = verifyRulesLock();
  assert.equal(result.ok, true, result.errors.join("\n"));
});
test("accepts identical content with Windows newlines or UTF-8 BOM", () => {
  const f = fixture();
  f.files.set(f.document, "\uFEFF" + f.files.get(f.document).replace(/\n/g, "\r\n"));
  assert.equal(f.verify().ok, true);
});
test("detects one changed rule character without writing to the locked file", () => {
  const f = fixture();
  f.files.set(f.document, f.files.get(f.document).replace("允许", "禁止"));
  assert.match(f.verify().errors.join("\n"), /Frozen document changed/);
});
test("detects missing rule file and missing active version", () => {
  const f = fixture();
  f.files.delete(f.document);
  f.manifest.activeVersion = "9.0.0";
  const errors = f.verify().errors.join("\n");
  assert.match(errors, /Cannot read/);
  assert.match(errors, /not registered/);
});
test("rejects duplicate versions and in-place reuse of a document", () => {
  const f = fixture();
  f.manifest.versions.push({ ...f.manifest.versions[0] });
  const errors = f.verify().errors.join("\n");
  assert.match(errors, /Duplicate version/);
  assert.match(errors, /same document/);
});
test("rejects path traversal before reading outside the document tree", () => {
  const f = fixture();
  f.manifest.versions[0].document = "docs/../../outside.md";
  assert.match(f.verify().errors.join("\n"), /Invalid rule document path/);
});
test("detects a stale AGENTS recovery pointer", () => {
  const f = fixture();
  f.files.set("AGENTS.md", "Use the old chat summary");
  assert.match(f.verify().errors.join("\n"), /AGENTS.md must point/);
});
test("fails closed on malformed manifests or an unavailable manifest", () => {
  assert.equal(verifyRulesLock({ readText: () => "{" }).ok, false);
  assert.equal(verifyRulesLock({ readText: () => "null" }).ok, false);
  assert.equal(verifyRulesLock({ readText: () => { throw new Error("unavailable"); } }).ok, false);
});
test("allows workstate updates without altering the immutable rules", () => {
  const f = fixture();
  f.files.set("docs/rules/WORKSTATE.md", "New actual test results; rules unchanged");
  assert.equal(f.verify().ok, true);
});
