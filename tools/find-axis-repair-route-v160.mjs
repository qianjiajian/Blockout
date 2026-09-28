import { build } from "esbuild";
import { readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const ids = new Set([63, 101, 118]);
const source = `export { LEVELS } from ${JSON.stringify(resolve(root, "src/core/levels.ts"))}; export { replayRevisedRoute } from ${JSON.stringify(resolve(root, "src/core/revisedLevelSearch.ts"))};`;
const bundle = await build({ stdin: { contents: source, resolveDir: root, loader: "ts" }, bundle: true, platform: "node", format: "esm", write: false, logLevel: "silent" });
const temp = resolve(root, ".codex-temp", `axis-find-${process.pid}.mjs`);
await writeFile(temp, bundle.outputFiles[0].text, "utf8");
const api = await import(pathToFileURL(temp).href);
const files = [];
const walk = async (dir) => {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = resolve(dir, entry.name);
    if (entry.isDirectory()) await walk(path);
    else if (entry.isFile() && entry.name.endsWith(".json")) files.push(path);
  }
};
await walk(resolve(root, "deliverables"));
const rows = [];
const seen = new Set();
for (const path of files) {
  let raw;
  try { raw = JSON.parse(await readFile(path, "utf8")); } catch { continue; }
  const level = raw.level ?? raw.input?.level ?? raw.candidate?.level;
  const id = Number(level?.id);
  const drags = raw.drags ?? raw.route ?? raw.result?.drags;
  if (!ids.has(id) || !Array.isArray(drags) || seen.has(`${id}:${drags.length}:${path}`)) continue;
  seen.add(`${id}:${drags.length}:${path}`);
  const finalLevel = api.LEVELS.find((candidate) => candidate.id === id);
  let replay;
  try { replay = api.replayRevisedRoute(finalLevel, drags); } catch (error) { replay = { valid: false, complete: false, error: error instanceof Error ? error.message : String(error) }; }
  rows.push({ id, path: path.slice(root.length + 1), drags: drags.length, valid: replay?.valid ?? false, complete: replay?.complete ?? false, error: replay?.error ?? null });
}
rows.sort((a, b) => Number(a.id) - Number(b.id) || Number(b.complete) - Number(a.complete) || a.drags - b.drags);
const out = resolve(root, "deliverables/axis-rectangular-repair-solver-20260926/route-search-v160.json");
await writeFile(out, `${JSON.stringify({ generatedAt: new Date().toISOString(), rows }, null, 2)}\n`, "utf8");
for (const id of ids) {
  const matches = rows.filter((row) => row.id === id);
  console.log(JSON.stringify({ id, complete: matches.filter((row) => row.complete).slice(0, 5), tried: matches.length }, null, 2));
}
console.log(JSON.stringify({ out, candidates: rows.length }));
