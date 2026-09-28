import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const root = resolve(fileURLToPath(new URL("..", import.meta.url)));
const outputDir = resolve(root, "playtest-results", "experiments", "mechanism-parity-2026-09-20");
const truthRelativePaths = [
  "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json",
  "deliverables/level-generation-blueprint/blockout-lv101-lv200-video-parity-truth-v1.json",
];

const sha256 = (value) => createHash("sha256").update(value).digest("hex").toUpperCase();
const stableValue = (value) => {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value)
    .sort()
    .filter((key) => value[key] !== undefined)
    .map((key) => [key, stableValue(value[key])]));
};
const semanticSha256 = (value) => sha256(JSON.stringify(stableValue(value)));

const bundle = await build({
  stdin: {
    contents: `
      export { LEVELS } from "./src/core/levels.ts";
      export {
        MECHANISM_KIND_IDS,
        compareMechanismKindParity,
        competitorSourceLevelId,
      } from "./src/core/mechanismKindParity.ts";
      export { GAME_ART } from "./src/game/artManifest.ts";
    `,
    resolveDir: root,
    sourcefile: "mechanism-parity-audit-entry.ts",
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const runtime = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);

const stringLeaves = (value) => {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (!value || typeof value !== "object") return [];
  return Object.values(value).flatMap(stringLeaves);
};
const assetFamily = async (manifestKey, value) => {
  const paths = [...new Set(stringLeaves(value))];
  const missingPaths = [];
  for (const assetPath of paths) {
    try {
      await readFile(resolve(root, "public", assetPath));
    } catch {
      missingPaths.push(assetPath);
    }
  }
  return {
    manifestKey,
    declaredPathCount: paths.length,
    allDeclaredFilesPresent: missingPaths.length === 0,
    missingPaths,
    samplePaths: paths.slice(0, 8),
  };
};

const gameplayArt = runtime.GAME_ART.gameplay;
const solidArt = Object.fromEntries(Object.entries(gameplayArt.formalBlocks)
  .map(([color, art]) => [color, art.solid]));
const shellArt = Object.fromEntries(Object.entries(gameplayArt.formalBlocks)
  .map(([color, art]) => [color, art.shell]));
const artSpecs = [
  { kind: "color-exit", mode: "dedicated-sprites", values: [["gameplay.gates", gameplayArt.gates]], renderer: ["drawGateSegment", "drawGateBorderSegmentSprite"], gap: null },
  { kind: "irregular-block", mode: "campaign-complete-sprites", values: [["gameplay.formalBlocks.*.solid", solidArt]], renderer: ["drawBlock", "drawFormalWholeBlock"], gap: "资源覆盖由当前关卡实际形状/颜色驱动，不是所有理论形状×颜色的笛卡尔全集。" },
  { kind: "frozen-exit", mode: "sprite-with-nine-slice-fallback", values: [["gameplay.iceStrips", gameplayArt.iceStrips], ["gameplay.iceCover", gameplayArt.iceCover]], renderer: ["drawGateIceStrip", "drawIceSurface"], gap: null },
  { kind: "irregular-board", mode: "dedicated-board-sprites", values: [["gameplay.formalFloor", gameplayArt.formalFloor], ["gameplay.emptyCell", gameplayArt.emptyCell], ["gameplay.boardRim.horizontal", gameplayArt.boardRim.horizontal], ["gameplay.boardRim.vertical", gameplayArt.boardRim.vertical], ["gameplay.boardRim.corners", gameplayArt.boardRim.corners]], renderer: ["drawBoard", "buildBoardRimLayout"], gap: null },
  { kind: "numeric-ice", mode: "partial-whole-sprite-with-fallback", values: [["gameplay.formalIceBlocks", gameplayArt.formalIceBlocks], ["gameplay.iceCover", gameplayArt.iceCover]], renderer: ["drawFormalFrozenBlock", "drawFormalFrozenCells", "drawBlockIceStrip", "drawIceSurface"], gap: "仅 shape 1–9 有整块冰图；shape 10–18 使用单格/冰条/九宫回退。" },
  { kind: "multilayer-shell", mode: "partial-shell-sprites-with-badge-fallback", values: [["gameplay.formalBlocks.*.shell", shellArt], ["gameplay.layerPreviewBadges", gameplayArt.layerPreviewBadges]], renderer: ["drawBlock", "drawFormalWholeBlock", "layerPreviewBadges"], gap: "整块外壳仅覆盖 shape 1/2/3/7/8/9；其他形状显示外层实心块与内层颜色徽章。" },
  { kind: "shutter", mode: "dedicated-nine-slice", values: [["gameplay.shutter", gameplayArt.shutter]], renderer: ["drawShutter", "drawShutterSurface"], gap: null },
  { kind: "generator", mode: "dedicated-oriented-sprites", values: [["gameplay.videoParity.sideGenerator", gameplayArt.videoParity.sideGenerator], ["gameplay.videoParity.sideGeneratorVertical", gameplayArt.videoParity.sideGeneratorVertical], ["gameplay.progressionMechanics", gameplayArt.progressionMechanics]], renderer: ["drawIndependentGenerator", "drawGenerator"], gap: null },
  { kind: "axis-block", mode: "dedicated-overlay", values: [["gameplay.videoParity.movementAxis", gameplayArt.videoParity.movementAxis]], renderer: ["drawBlockMechanicMarkers"], gap: null },
  { kind: "key-lock", mode: "dedicated-overlays", values: [["gameplay.videoParity.keyTokens", gameplayArt.videoParity.keyTokens], ["gameplay.videoParity.chainLocks", gameplayArt.videoParity.chainLocks]], renderer: ["drawBlockMechanicMarkers"], gap: null },
  { kind: "layered-lift", mode: "dedicated-nine-slice", values: [["gameplay.videoParity.liftFrame", gameplayArt.videoParity.liftFrame]], renderer: ["drawLiftFrame"], gap: null },
  { kind: "timed-generator", mode: "dedicated-chassis-and-status-plate", values: [["gameplay.videoParity.sideGenerator", gameplayArt.videoParity.sideGenerator], ["gameplay.videoParity.sideGeneratorVertical", gameplayArt.videoParity.sideGeneratorVertical], ["gameplay.videoParity.timedFeeder", gameplayArt.videoParity.timedFeeder]], renderer: ["drawIndependentGenerator"], gap: null },
  { kind: "staged-frame", mode: "dedicated-nine-slice", values: [["gameplay.videoParity.stagedFrame", gameplayArt.videoParity.stagedFrame]], renderer: ["drawStagedFrame"], gap: null },
  { kind: "star", mode: "partial-whole-sprite-with-programmatic-fallback", values: [["gameplay.starBlocks", gameplayArt.starBlocks], ["gameplay.starGates", gameplayArt.starGates]], renderer: ["drawStarBlockOverlay", "drawStarGateBorderSegment", "drawStarMark"], gap: "星标块整形覆盖 shape 1–9；其他形状退回可读的程序化星标。" },
  { kind: "bomb", mode: "programmatic-only", values: [], renderer: ["drawBlockMechanicMarkers"], gap: "无可替换的独立炸弹徽记/数字底板资源；当前为 Canvas 圆形与文字。" },
  { kind: "rotation-badge", mode: "programmatic-only", values: [], renderer: ["drawBlockMechanicMarkers"], gap: "无可替换的双箭头徽记资源；当前为 Canvas 圆环和箭头路径。" },
  { kind: "flip-door", mode: "shared-gate-sprite-plus-programmatic-state", values: [["gameplay.gates (shared)", gameplayArt.gates]], renderer: ["drawFlipDoorSegment", "drawFlipDoorDecorations"], gap: "没有翻转门专属开/关贴图；底座复用普通出口，X/外向箭头为程序绘制。" },
  { kind: "colored-grid", mode: "programmatic-only", values: [], renderer: ["drawColoredGrid"], gap: "没有可替换的彩色网格格面资源；填充、描边和内网格均为 Canvas 绘制。" },
];
const artCoverage = await Promise.all(artSpecs.map(async (spec) => ({
  kind: spec.kind,
  renderingMode: spec.mode,
  assetFamilies: await Promise.all(spec.values.map(([key, value]) => assetFamily(key, value))),
  rendererReferences: spec.renderer,
  collectionCardArt: runtime.MECHANISM_KIND_IDS.indexOf(spec.kind) < 14 ? "present" : "missing",
  replacementGap: spec.gap,
})));

if (!Array.isArray(runtime.LEVELS) || runtime.LEVELS.length !== 200) {
  throw new Error(`Expected final runtime LEVELS 1-200, received ${runtime.LEVELS?.length ?? "invalid"}`);
}
if (runtime.LEVELS.some((level, index) => level.id !== index + 1)) {
  throw new Error("Final runtime LEVELS are not sequential 1-200");
}

const truthSources = await Promise.all(truthRelativePaths.map(async (relativePath) => {
  const text = await readFile(resolve(root, relativePath), "utf8");
  return { relativePath, sha256: sha256(text), payload: JSON.parse(text) };
}));
const truthLevels = truthSources.flatMap(({ payload }) => payload.levels ?? []);
const truthById = new Map(truthLevels.map((level) => [Number(level.level ?? level.level_id), level]));
if (truthById.size !== 200) throw new Error(`Expected 200 competitor truth records, received ${truthById.size}`);

const levels = runtime.LEVELS.map((level) => {
  const competitorLevelId = runtime.competitorSourceLevelId(level.id);
  const truthLevel = truthById.get(competitorLevelId);
  if (!truthLevel) throw new Error(`Missing competitor truth Lv${competitorLevelId} for runtime Lv${level.id}`);
  return runtime.compareMechanismKindParity(level.id, truthLevel, level);
});

const byKind = runtime.MECHANISM_KIND_IDS.map((kind) => ({
  kind,
  competitorPresent: levels.filter((level) => level.competitor[kind] === "present").length,
  competitorAbsent: levels.filter((level) => level.competitor[kind] === "absent").length,
  competitorUnknown: levels.filter((level) => level.competitor[kind] === "unknown").length,
  runtimePresent: levels.filter((level) => level.runtime[kind]).length,
  missingLevelIds: levels.filter((level) => level.missingKinds.includes(kind)).map((level) => level.runtimeLevelId),
  extraLevelIds: levels.filter((level) => level.extraKinds.includes(kind)).map((level) => level.runtimeLevelId),
}));

const mismatchLevels = levels.filter((level) => level.status === "mismatch");
const partialUnknownLevels = levels.filter((level) => level.status === "partial-unknown");
const sourceMissingLevels = levels.filter((level) => level.status === "source-missing");
const exactKnownLevels = levels.filter((level) => level.status === "exact-known");
const levelsWithUnknown = levels.filter((level) => level.competitorUnknownKinds.length > 0);
const report = {
  schemaVersion: 1,
  policy: "competitor-final-runtime-mechanism-kind-parity-tristate-v1",
  campaignSemanticSha256: semanticSha256(runtime.LEVELS),
  taxonomy: runtime.MECHANISM_KIND_IDS,
  sourceMapping: {
    description: "Every runtime level uses the same-numbered competitor source level.",
    runtimeToCompetitorOverrides: {},
  },
  truthSources: truthSources.map(({ relativePath, sha256: hash }) => ({ path: relativePath, sha256: hash })),
  policyNotes: [
    "present requires positive source evidence; absent requires an exhaustive explicit zero/empty field; null, unclear and omitted non-exhaustive fields remain unknown.",
    "color-exit absence is never inferred from the partial fact table without explicit evidence of an alternative completion rule.",
    "Runtime facts are read from final LEVELS after every solvability, adjacency and shutter overlay.",
    "Internal shutters with skin=staging are implementation metadata and are excluded from the player-facing shutter kind.",
    "rotation-badge denotes the source-observed circular double-arrow badge only; it does not claim a proved rotation interaction.",
    "Elevator and conveyor are tracked outside the 18-kind shipping taxonomy and must remain separately audited if introduced.",
  ],
  summary: {
    levelCount: levels.length,
    taxonomySize: runtime.MECHANISM_KIND_IDS.length,
    exactKnownLevelCount: exactKnownLevels.length,
    partialUnknownLevelCount: partialUnknownLevels.length,
    sourceMissingLevelCount: sourceMissingLevels.length,
    sourceMissingLevelIds: sourceMissingLevels.map((level) => level.runtimeLevelId),
    levelsWithUnknownKindCount: levelsWithUnknown.length,
    unknownKindAssignmentCount: levelsWithUnknown.reduce(
      (sum, level) => sum + level.competitorUnknownKinds.length,
      0,
    ),
    mismatchLevelsWithUnknownKindCount: mismatchLevels.filter(
      (level) => level.competitorUnknownKinds.length > 0,
    ).length,
    mismatchLevelCount: mismatchLevels.length,
    mismatchLevelIds: mismatchLevels.map((level) => level.runtimeLevelId),
    missingKindCount: levels.reduce((sum, level) => sum + level.missingKinds.length, 0),
    extraKindCount: levels.reduce((sum, level) => sum + level.extraKinds.length, 0),
    knownParityPass: mismatchLevels.length === 0,
    completeParityClaimAvailable: mismatchLevels.length === 0
      && partialUnknownLevels.length === 0
      && sourceMissingLevels.length === 0,
  },
  byKind,
  artCoverage,
  artCoverageSummary: {
    declaredAssetFamilyCount: artCoverage.reduce((sum, entry) => sum + entry.assetFamilies.length, 0),
    missingDeclaredFileCount: artCoverage.reduce((sum, entry) => sum + entry.assetFamilies.reduce(
      (familySum, family) => familySum + family.missingPaths.length,
      0,
    ), 0),
    programmaticOnlyKinds: artCoverage.filter((entry) => entry.renderingMode === "programmatic-only").map((entry) => entry.kind),
    missingCollectionCardKinds: artCoverage.filter((entry) => entry.collectionCardArt === "missing").map((entry) => entry.kind),
  },
  levels,
};

const list = (values) => values.length ? values.join(", ") : "—";
const markdown = [
  "# 竞品 vs 最终运行时：逐关机制种类三态审计",
  "",
  `- Campaign semantic SHA-256：\`${report.campaignSemanticSha256}\``,
  `- 审计范围：最终 \`LEVELS\` ${report.summary.levelCount} 关，${report.summary.taxonomySize} 类机制`,
  `- 已知事实门禁：${report.summary.knownParityPass ? "PASS" : "FAIL"}`,
  `- 完整 200 关一致声明：${report.summary.completeParityClaimAvailable ? "可成立" : "不可成立（仍有未知或缺源）"}`,
  `- 已知不一致关：${list(report.summary.mismatchLevelIds)}`,
  `- 竞品来源缺失关：${list(report.summary.sourceMissingLevelIds)}`,
  "",
  "## 判定规则",
  "",
  ...report.policyNotes.map((note) => `- ${note}`),
  "- Lv1–200 全部按同号竞品来源核对，不再交换 Lv2/Lv5。",
  "",
  "## 按机制汇总",
  "",
  "| 机制 | 竞品有 | 竞品无 | 竞品未知 | 我方有 | 缺失关 | 多出关 |",
  "|---|---:|---:|---:|---:|---|---|",
  ...byKind.map((row) => `| ${row.kind} | ${row.competitorPresent} | ${row.competitorAbsent} | ${row.competitorUnknown} | ${row.runtimePresent} | ${list(row.missingLevelIds)} | ${list(row.extraLevelIds)} |`),
  "",
  "## 18 类美术与渲染覆盖",
  "",
  "| 机制 | 渲染方式 | 已登记资源族 | 收藏卡图 | 后期替换缺口 |",
  "|---|---|---|---|---|",
  ...artCoverage.map((entry) => `| ${entry.kind} | ${entry.renderingMode} | ${entry.assetFamilies.length ? entry.assetFamilies.map((family) => `${family.manifestKey}(${family.declaredPathCount})`).join("<br>") : "无"} | ${entry.collectionCardArt} | ${entry.replacementGap ?? "—"} |`),
  "",
  `- 已登记资源文件缺失数：${report.artCoverageSummary.missingDeclaredFileCount}`,
  `- 纯程序绘制、无独立可替换贴图：${list(report.artCoverageSummary.programmaticOnlyKinds)}`,
  `- 缺少收藏卡独立入口图：${list(report.artCoverageSummary.missingCollectionCardKinds)}`,
  "",
  "## 逐关结果",
  "",
  "| 我方关 | 竞品源关 | 状态 | 竞品已知存在 | 我方存在 | 缺失 | 多出 | 竞品未知 |",
  "|---:|---:|---|---|---|---|---|---|",
  ...levels.map((level) => (
    `| ${level.runtimeLevelId} | ${level.competitorLevelId} | ${level.status} | ${list(level.competitorPresentKinds)} | ${list(level.runtimePresentKinds)} | ${list(level.missingKinds)} | ${list(level.extraKinds)} | ${list(level.competitorUnknownKinds)} |`
  )),
  "",
  "## 结论边界",
  "",
  report.summary.knownParityPass
    ? "所有竞品已知机制种类均与最终运行时一致。未知字段仍按未知保留。"
    : `发现 ${report.summary.mismatchLevelCount} 个关卡存在已知机制种类不一致，正式冻结前必须修复。`,
  sourceMissingLevels.length
    ? `Lv${sourceMissingLevels.map((level) => level.runtimeLevelId).join("/Lv")} 缺少竞品视频，不能计入“完整一致”。`
    : "不存在竞品来源缺失关。",
  "",
].join("\n");

await mkdir(outputDir, { recursive: true });
await Promise.all([
  writeFile(resolve(outputDir, "report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8"),
  writeFile(resolve(outputDir, "report.md"), markdown, "utf8"),
]);

console.log(JSON.stringify({
  outputDir,
  campaignSemanticSha256: report.campaignSemanticSha256,
  summary: report.summary,
}, null, 2));
if (!report.summary.knownParityPass) process.exitCode = 1;
