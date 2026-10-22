import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { transform } from "esbuild";
import { instrumentGooglePlayPrivacyState, googlePlayPrivacyStatePlugin } from "./google-play-privacy-state-plugin.mjs";

const path = new URL("../src/game/ColorEscapeGame.ts", import.meta.url);
const original = await readFile(path, "utf8");
const normalized = original.replace(/\r\n/g, "\n");
const projected = instrumentGooglePlayPrivacyState(original);
await transform(projected, { loader: "ts", target: "es2020" });
const start = projected.indexOf("  getGooglePlayPrivacyState() {");
const end = projected.indexOf("  getDebugState(): Record<string, unknown> {");
const accessor = projected.slice(start, end);
assert.equal(projected.replace(accessor, ""), normalized, "only the accessor is injected");
const read = new Function(`return ({ ${accessor} }).getGooglePlayPrivacyState;`)();
const current = { screen: "settings", save: { language: "zh-CN", coins: 4321 } };
let fullDebugReads = 0;
const receiver = new Proxy({
  get screen() { return current.screen; },
  get save() { return current.save; },
  viewportTransform: () => ({ scale: 0.7, offsetX: 3, offsetY: 7 }),
  getDebugState() { fullDebugReads++; throw Error("Full diagnostics must not be read by privacy"); },
}, {
  get(target, key, receiver) {
    assert.ok(["screen", "save", "viewportTransform"].includes(key), `unexpected game system read: ${String(key)}`);
    return Reflect.get(target, key, receiver);
  },
});
const first = read.call(receiver);
assert.deepEqual(first, { screen: "settings", settings: { language: "zh-CN" }, viewportTransform: { scale: 0.7, offsetX: 3, offsetY: 7 } });
first.settings.language = "tampered";
first.viewportTransform.scale = 99;
assert.equal(current.save.language, "zh-CN");
current.screen = "playing";
current.save.language = "en";
const second = read.call(receiver);
assert.equal(second.screen, "playing");
assert.equal(second.settings.language, "en");
assert.equal(second.viewportTransform.scale, 0.7);
assert.equal(fullDebugReads, 0);
assert.throws(() => instrumentGooglePlayPrivacyState(projected), /already present/);
assert.throws(() => instrumentGooglePlayPrivacyState(original.replace("getDebugState(): Record<string, unknown>", "getRenamedDebugState(): Record<string, unknown>")), /anchor changed/);
assert.throws(() => instrumentGooglePlayPrivacyState(original + "\n  getDebugState(): Record<string, unknown> {"), /anchor changed/);
const plugin = googlePlayPrivacyStatePlugin();
assert.equal(plugin.transform(original, "/project/src/web.ts"), undefined);
assert.ok(plugin.transform(original, "C:\\project\\src\\game\\ColorEscapeGame.ts?build=google-play"));
const entry = await readFile(new URL("../src/googlePlay/entry.ts", import.meta.url), "utf8");
assert.match(entry, /JSON\.parse\(JSON\.stringify\(game\.getDebugState\(\)\)\)/, "release diagnostic snapshots remain isolated");
assert.match(entry, /installGooglePlayPrivacy\(host\.canvas, \(\) => presentation\.getGooglePlayPrivacyState\(\), host\)/);
assert.equal(await readFile(path, "utf8"), original);
console.log(JSON.stringify({ status: "PASS", sourceSha256: createHash("sha256").update(original).digest("hex"),
  projectedSha256: createHash("sha256").update(projected).digest("hex"), sharedSourceUnchanged: true,
  onlyPresentationFieldsRead: true, fullDebugReads, detachedLanguageAndTransform: true,
  fullReleaseDiagnosticBridgePreserved: true, driftRejected: true }, null, 2));
