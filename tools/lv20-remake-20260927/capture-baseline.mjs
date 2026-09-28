import fs from "node:fs";
import { build } from "esbuild";
import { createHash } from "node:crypto";
import { verifyRulesLock } from "../verify-rules-lock.mjs";

const lock = verifyRulesLock();
if (!lock.ok) throw new Error(lock.errors.join("\n"));
const built = await build({
  stdin: {
    contents: 'export { LEVELS } from "./src/core/levels.ts"; export { levelStarTargets } from "./src/core/levelStarConditions.ts";',
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  write: false,
  platform: "node",
  format: "esm",
  logLevel: "silent",
});
const { LEVELS, levelStarTargets } = await import(
  `data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString("base64")}`,
);
const hash = (value) => createHash("sha256")
  .update(typeof value === "string" || Buffer.isBuffer(value) ? value : JSON.stringify(value))
  .digest("hex");
const files = [
  "src/core/levels.ts",
  "src/core/PuzzleModel.ts",
  "src/game/ColorEscapeGame.ts",
  "src/game/formalBlockShapes.ts",
  "src/core/levelStarConditions.ts",
];
const comparisonFile = "deliverables/competitor-vs-ours-lv001-200-current-v168-20260927/comparison.json";
const comparison = JSON.parse(fs.readFileSync(comparisonFile, "utf8")).levels.find((entry) => entry.level === 20);
const level = LEVELS.find((entry) => entry.id === 20);
const output = "deliverables/lv20-remake-20260927/baseline.json";
fs.mkdirSync("deliverables/lv20-remake-20260927", { recursive: true });
fs.writeFileSync(output, JSON.stringify({
  capturedAt: new Date().toISOString(),
  activeVersion: lock.activeVersion,
  level,
  levelSha256: hash(level),
  stars: levelStarTargets(level),
  levelHashes: LEVELS.map((entry) => ({ id: entry.id, sha256: hash(entry) })),
  sourceComparison: { file: comparisonFile, sha256: hash(fs.readFileSync(comparisonFile)), level: comparison },
  files: Object.fromEntries(files.map((path) => [path, hash(fs.readFileSync(path))])),
}, null, 2), { flag: "wx" });
console.log(output);
