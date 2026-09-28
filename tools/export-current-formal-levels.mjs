import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { build } from "esbuild";

const ROOT = process.cwd();
const OUTPUT = path.resolve(ROOT, process.argv[2] ?? ".codex-temp/current-formal-levels.json");

const canonical = (value) => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().filter((key) => value[key] !== undefined)
    .map((key) => [key, canonical(value[key])]));
};

const result = await build({
  stdin: {
    contents: `import { LEVELS } from "./src/core/levels.ts"; export default LEVELS;`,
    resolveDir: ROOT,
    loader: "ts",
    sourcefile: "current-formal-levels-entry.ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  target: "es2022",
  write: false,
  logLevel: "silent",
});

const moduleUrl = `data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString("base64")}`;
const { default: levels } = await import(moduleUrl);
if (!Array.isArray(levels) || levels.length !== 100) {
  throw new Error(`Expected 100 formal levels, received ${Array.isArray(levels) ? levels.length : typeof levels}`);
}
if (!levels.every((level, index) => level.id === index + 1)) {
  throw new Error("Formal level IDs are not continuous from 1 to 100");
}

const text = `${JSON.stringify(levels, null, 2)}\n`;
const semanticSha256 = createHash("sha256")
  .update(JSON.stringify(canonical(levels)))
  .digest("hex")
  .toUpperCase();
await mkdir(path.dirname(OUTPUT), { recursive: true });
await writeFile(OUTPUT, text, "utf8");
console.log(JSON.stringify({ output: OUTPUT, levelCount: levels.length, semanticSha256 }, null, 2));
