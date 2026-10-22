import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { transform } from "esbuild";
import { instrumentGooglePlayLifecycle, googlePlayLifecyclePlugin } from "./google-play-lifecycle-plugin.mjs";

const path = new URL("../src/game/ColorEscapeGame.ts", import.meta.url);
const original = await readFile(path, "utf8");
const result = instrumentGooglePlayLifecycle(original);
await transform(result, { loader: "ts", target: "es2020" });
assert.equal((result.match(/phase: "ready"/g) ?? []).length, 2);
for (const phase of ["reset", "success", "failed", "settlement"]) {
  assert.equal((result.match(new RegExp(`phase: "${phase}"`, "g")) ?? []).length, 1);
}
assert.throws(() => instrumentGooglePlayLifecycle(result), /already present/);
assert.throws(() => instrumentGooglePlayLifecycle(original.replace("private beginCelebration(): void", "private renamedCelebration(): void")), /anchor changed: success/);
assert.throws(() => instrumentGooglePlayLifecycle(original + '\n        this.screen = "failed";\n        this.dirty = true;'), /anchor changed: failure/);
const plugin = googlePlayLifecyclePlugin();
assert.equal(plugin.transform(original, "/project/src/web.ts"), undefined);
assert.ok(plugin.transform(original, "C:\\project\\src\\game\\ColorEscapeGame.ts"));
assert.equal(await readFile(path, "utf8"), original);
console.log(JSON.stringify({ status: "PASS", anchors: 6, readySites: 2, sharedSourceUnchanged: true,
  sourceSha256: createHash("sha256").update(original).digest("hex"),
  transformedSha256: createHash("sha256").update(result).digest("hex") }, null, 2));
