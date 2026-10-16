import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("C:/Users/Administrator/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp");
const root = resolve(import.meta.dirname, "..");
const originalRoot = "C:/Users/Administrator/Desktop/block out/联赛界面";
const sourceDir = resolve(root, "art-source/ui/league-supplied-v1");
const runtimeDir = resolve(root, "public/assets/art/ui/league-supplied-v1");
const entries = [
  ["1.png", "row-first", "First-place ranking row"],
  ["2.png", "row-second", "Second-place ranking row"],
  ["3.png", "row-third", "Third-place ranking row"],
  ["4.png", "row-regular", "Other ranking rows"],
  ["5.png", "self-row", "Fixed player ranking row"],
  ["上.png", "top-header", "Top header"],
  ["下.png", "bottom-footer", "Bottom footer"],
  ["低.png", "list-panel", "Scrollable ranking-list backdrop"],
  ["按钮.png", "challenge-button", "Challenge button; label remains dynamic"],
  ["按钮1.png", "back-button", "Back button"],
  ["按钮2.png", "info-button", "League detail button"],
  ["文字低.png", "tier-name-base", "Backdrop beneath the current tier name"],
  ["时间低.png", "timer-panel", "Season countdown backdrop; countdown remains dynamic"],
  ["联赛字低.png", "title-base", "League title backdrop"],
  ["背景.png", "stage-background", "Stage background"],
  ["星.png", "level-star", "Player level icon"],
  ["积分图标.png", "score-token", "League score icon"],
  ["金币.png", "coin-reward", "Reward icon; amounts remain dynamic"],
  ["箭头1.png", "arrow-left", "Previous tier arrow"],
  ["箭头2.png", "arrow-right", "Next tier arrow"],
  ["详情1.png", "detail-panel", "League details panel; content remains dynamic"],
  ["详情2.png", "close-button", "League details close button"],
];
const digest = (buffer) => createHash("sha256").update(buffer).digest("hex");
const verify = process.argv.includes("--verify");
const rebuild = process.argv.includes("--rebuild");
if (!verify) {
  await mkdir(sourceDir, { recursive: true });
  await mkdir(runtimeDir, { recursive: true });
}
const records = [];
const manifestAssets = [];
const recorded = verify || rebuild
  ? JSON.parse(await readFile(resolve(sourceDir, "provenance.json"), "utf8"))
  : null;
for (const [original, id, role] of entries) {
  const file = `${id}.png`;
  const sourcePath = resolve(sourceDir, file);
  const runtimePath = resolve(runtimeDir, file);
  if (!verify && !rebuild) await copyFile(resolve(originalRoot, original), sourcePath);
  const bytes = await readFile(sourcePath);
  const metadata = await sharp(bytes).metadata();
  const sha256 = digest(bytes);
  if (recorded) {
    const prior = recorded.assets.find((entry) => entry.id === id);
    if (!prior || prior.sha256 !== sha256 || metadata.width !== prior.width || metadata.height !== prior.height) {
      throw new Error(`Source drift: ${file}`);
    }
  }
  if (verify) {
    if (digest(await readFile(runtimePath)) !== sha256) throw new Error(`Runtime drift: ${file}`);
  } else await copyFile(sourcePath, runtimePath);
  records.push({ id, source: `${originalRoot}/${original}`, file, width: metadata.width,
    height: metadata.height, alpha: metadata.hasAlpha, bytes: bytes.length, sha256,
    transform: "original-byte-copy", role });
  manifestAssets.push({ key: `ui.leagueSupplied.${id}`, source: `ui/league-supplied-v1/${file}`,
    runtime: `../public/assets/art/ui/league-supplied-v1/${file}`, width: metadata.width,
    height: metadata.height, alpha: metadata.hasAlpha, grid: [1, 1], transform: "copy",
    loadGroup: "formal-leaderboard" });
}
const references = [];
for (let index = 1; index <= 4; index += 1) {
  const original = `示意图${index}.png`;
  const file = `reference-${index}.png`;
  const sourcePath = resolve(sourceDir, file);
  if (!verify && !rebuild) await copyFile(resolve(originalRoot, original), sourcePath);
  const bytes = await readFile(sourcePath);
  const metadata = await sharp(bytes).metadata();
  const sha256 = digest(bytes);
  if (recorded && recorded.references.find((entry) => entry.file === file)?.sha256 !== sha256) {
    throw new Error(`Reference drift: ${file}`);
  }
  references.push({ source: `${originalRoot}/${original}`, file, width: metadata.width,
    height: metadata.height, bytes: bytes.length, sha256, usage: "source-reference-only" });
}
const manifestPath = resolve(root, "art-source/manifest.json");
const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
if (verify) {
  for (const asset of manifestAssets) {
    const actual = manifest.assets.filter((entry) => entry.key === asset.key);
    if (actual.length !== 1 || JSON.stringify(actual[0]) !== JSON.stringify(asset)) {
      throw new Error(`Manifest drift: ${asset.key}`);
    }
  }
} else {
  manifest.assets = manifest.assets.filter((entry) => !entry.key.startsWith("ui.leagueSupplied."));
  manifest.assets.push(...manifestAssets);
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
  if (!rebuild) await writeFile(resolve(sourceDir, "provenance.json"), `${JSON.stringify({
    version: 1, importedOn: "2026-10-09", userRequest: "Replace Glory League UI with the supplied formal art, following the supplied reference layouts.",
    policy: "All source and runtime assets are exact original-byte copies. Reference screenshots are archived only. Their sample names, ranks, scores, levels, countdown and reward amounts are not business-rule instructions. Existing profile avatars and eight rank badges are reused.",
    assets: records, references,
  }, null, 2)}\n`, "utf8");
}
console.log(`${verify ? "Verified" : "Imported"} ${records.length} original-byte league assets and ${references.length} source-only references; decoded RGBA ${records.reduce((sum, entry) => sum + entry.width * entry.height * 4, 0)} bytes.`);
