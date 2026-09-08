import { readFile, readdir, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const projectRoot = fileURLToPath(new URL("../", import.meta.url));
const expectedIdentity = {
  description: "方块出逃 - 竖屏颜色滑块益智微信小游戏",
  compileType: "game",
  appid: "wx51654dfc10c64035",
  projectname: "color-escape",
};
const mainPackageLimitBytes = 4 * 1024 * 1024;
const minimumReleaseHeadroomBytes = 256 * 1024;

function packageBudgetStatus(releaseBytes) {
  const headroomBytes = mainPackageLimitBytes - releaseBytes;
  if (releaseBytes > mainPackageLimitBytes) return { ok: false, reason: "limit", headroomBytes };
  if (headroomBytes < minimumReleaseHeadroomBytes) return { ok: false, reason: "headroom", headroomBytes };
  return { ok: true, reason: "ok", headroomBytes };
}

// Keep the release threshold executable instead of trusting an unchecked
// constant: exact safe boundary passes; either byte beyond a boundary fails.
if (packageBudgetStatus(mainPackageLimitBytes + 1).reason !== "limit"
  || packageBudgetStatus(mainPackageLimitBytes - minimumReleaseHeadroomBytes + 1).reason !== "headroom"
  || !packageBudgetStatus(mainPackageLimitBytes - minimumReleaseHeadroomBytes).ok) {
  throw new Error("WeChat package budget boundary self-check failed");
}

async function readJson(relativePath) {
  return JSON.parse(await readFile(resolve(projectRoot, relativePath), "utf8"));
}

for (const relativePath of [
  "project.config.json",
  "wechat/project.config.json",
  "dist-wechat/project.config.json",
]) {
  const config = await readJson(relativePath);
  for (const [key, expected] of Object.entries(expectedIdentity)) {
    if (config[key] !== expected) {
      throw new Error(`${relativePath}: ${key} is ${JSON.stringify(config[key])}; expected ${JSON.stringify(expected)}`);
    }
  }
  if (config.isGameTourist !== false) throw new Error(`${relativePath}: tourist mode must stay disabled`);
  if (config.setting?.uploadWithSourceMap !== false) {
    throw new Error(`${relativePath}: uploadWithSourceMap must stay disabled for the release package`);
  }
}

const sourceGameConfig = await readJson("wechat/game.json");
const builtGameConfig = await readJson("dist-wechat/game.json");
if (JSON.stringify(sourceGameConfig) !== JSON.stringify(builtGameConfig)) {
  throw new Error("dist-wechat/game.json does not match wechat/game.json");
}
if (builtGameConfig.deviceOrientation !== "portrait" || builtGameConfig.showStatusBar !== false) {
  throw new Error("The WeChat game must stay portrait and hide the native status bar");
}

const privateConfig = await readJson("dist-wechat/project.private.config.json");
if (privateConfig.projectname !== expectedIdentity.projectname) {
  throw new Error("dist-wechat/project.private.config.json has a different project name");
}

for (const relativePath of ["dist-wechat/game.js", "dist-wechat/assets"]) {
  await stat(resolve(projectRoot, relativePath));
}

async function findFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...await findFiles(absolutePath));
    else files.push({ path: absolutePath, name: entry.name, bytes: (await stat(absolutePath)).size });
  }
  return files;
}

const builtFiles = await findFiles(resolve(projectRoot, "dist-wechat"));
const sourceMaps = builtFiles.filter((file) => file.name.endsWith(".map"));
if (sourceMaps.length > 0) throw new Error(`WeChat release contains sourcemaps: ${sourceMaps.map((file) => file.path).join(", ")}`);

// DevTools owns this per-machine file and does not upload it as game content.
// Count everything else conservatively, including project.config.json, so the
// gate stays stricter than the upload transform instead of depending on it.
const releaseFiles = builtFiles.filter((file) => file.name !== "project.private.config.json");
const releaseBytes = releaseFiles.reduce((sum, file) => sum + file.bytes, 0);
const budget = packageBudgetStatus(releaseBytes);
const growthBudgetBytes = budget.headroomBytes - minimumReleaseHeadroomBytes;
if (budget.reason === "limit") {
  throw new Error(`WeChat main package is ${releaseBytes} bytes, above the ${mainPackageLimitBytes}-byte (4 MiB) limit`);
}
if (budget.reason === "headroom") {
  throw new Error(
    `WeChat main package has only ${budget.headroomBytes} bytes of headroom; keep at least ${minimumReleaseHeadroomBytes} bytes or move optional art into a subpackage`,
  );
}

console.log(
  `Verified WeChat project identity ${expectedIdentity.projectname} / ${expectedIdentity.appid}, portrait config, private IDE config, ${releaseFiles.length} release files / ${releaseBytes} bytes / ${budget.headroomBytes} bytes platform headroom / ${growthBudgetBytes} bytes guarded growth budget, and 0 sourcemaps.`,
);
