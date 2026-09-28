import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { chromium } from "playwright";
import { createServer } from "vite";
import { verifyRulesLock } from "./verify-rules-lock.mjs";
import { loadMechanismInventory, applyInventoryReview } from "./revised-source-inventory.mjs";
import { auditSourceLevel, verifySourceReview } from "./audit-revised-generation-inputs.mjs";
import { auditOpeningCoverage } from "./revised-opening-coverage.mjs";

// A visual design review, deliberately separate from the still-unmigrated candidate
// certificate pipeline. No solving, difficulty/time certification or LEVELS writes.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sha = bytes => createHash("sha256").update(bytes).digest("hex");
const readJson = async p => JSON.parse(await readFile(path.join(root, p), "utf8"));
const truthPath = "deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json";
const directPath = ".codex-temp/video-audit-21-30-independent/audit-lv021-030.json";
const sourceReviewPath = "docs/level-generation/source-review-lv021-030.json";
const draftPaths = ["lv021-024.json", "lv025-027.json", "lv028-030.json"].map(f => `.codex-temp/opening-preview-v130/${f}`);
const lock = verifyRulesLock();
assert(lock.ok && lock.activeVersion === "1.4.0", JSON.stringify(lock));
const manifest = await readJson("docs/rules/manifest.json");
const truthBytes = await readFile(path.join(root, truthPath));
const directBytes = await readFile(path.join(root, directPath));
const truth = JSON.parse(truthBytes);
const inventory = await loadMechanismInventory({ root, truthSha256: sha(truthBytes), directSha256: sha(directBytes) });
const reviewedMasks = await verifySourceReview(await readJson(sourceReviewPath), { root, truthSha256: sha(truthBytes) });
const bindings = { ...inventory.bindings };
for (const p of [truthPath, directPath, sourceReviewPath, ...draftPaths, "docs/rules/manifest.json", "docs/mechanism-rules-v1.4.0.md", "tools/revised-opening-coverage.mjs", "tools/render-revised-opening-preview.mjs", "tools/revised-opening-preview.html", "tools/revised-opening-preview-browser.mjs", "tools/verify-rules-lock.mjs", "tools/audit-revised-generation-inputs.mjs", "tools/revised-source-inventory.mjs"]) {
  bindings[p] = { sha256: sha(await readFile(path.join(root, p))) };
}
for (const r of reviewedMasks.values()) for (const e of r.evidence) bindings[e.path] = { sha256: e.sha256 };
const compiled = await build({ absWorkingDir: root, stdin: { contents: 'export {PuzzleModel} from "./src/core/PuzzleModel.ts"; export {auditRevisedCandidate} from "./src/core/revisedCandidateAudit.ts"; export {auditCandidateBlockArt} from "./tools/revised-candidate-block-art.mjs";', resolveDir: root, sourcefile: "preview-static-entry.mjs" }, bundle: true, format: "esm", platform: "node", write: false, metafile: true });
const checks = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
for (const p of Object.keys(compiled.metafile.inputs)) if (p !== "preview-static-entry.mjs") bindings[p] = { sha256: sha(await readFile(path.join(root, p))) };
const drafts = (await Promise.all(draftPaths.map(readJson))).flat().sort((a, b) => a.levelId - b.levelId);
assert.deepEqual(drafts.map(x => x.levelId), [21,22,23,24,25,26,27,28,29,30]);
const rows = [];
for (const draft of drafts) {
  const record = truth.levels.find(x => x.level === draft.levelId);
  const source = applyInventoryReview(record, inventory.rows.get(draft.levelId));
  const row = auditSourceLevel(source); // Pure extraction of reviewed quantities; NOT old buildAudit/approval.
  assert.equal(row.evidenceGaps.length, 0, `Missing evidence Lv${draft.levelId}`);
  const facts = row.immutableSourceContract;
  const board = reviewedMasks.get(draft.levelId)?.correctedReferenceBoard ?? record.board;
  const originalMask = board.source_playable_mask.flatMap((line, y) => [...line].flatMap((v, x) => v === "#" ? [[x, y]] : []));
  const sourceContract = {
    levelId: draft.levelId, referenceId: `${inventory.rows.get(draft.levelId).reviewPath}#Lv${draft.levelId}`,
    sha256: sha(JSON.stringify({ facts, originalMask, bindings: inventory.bindings })), seed: `opening-layout-review-B-filled-${draft.levelId}`,
    width: facts.width, height: facts.height, openingBlockCount: facts.openingCount, fullBlockCount: facts.fullCount, originalMask,
    mechanisms: {
      generatorQueueLengths: [], axisHorizontalBlocks: 0, axisVerticalBlocks: 0, keyGroups: [], starBlocks: 0,
      flipDoorInitialOpen: [], coloredGridCellCounts: [], bombSeconds: [], liftCount: 0, liftHiddenBatchCounts: [],
      shutterClearCounts: facts.covers.values, shutterHiddenBatchCounts: facts.covers.hidden_batch_counts,
      numericIceValues: facts.numericIce.values, shellBlocks: facts.shells.count,
      exits: [...Array.from({ length: facts.ordinaryExitCount }, () => ({ kind: "ordinary", frozen: 0, star: false })), ...facts.frozenExitValues.map(frozen => ({ kind: "ordinary", frozen, star: false }))],
    },
  };
  const shared = checks.auditRevisedCandidate(draft.level, sourceContract);
  const stable = new checks.PuzzleModel(draft.level).snapshot();
  const openingCoverage = auditOpeningCoverage(stable);
  const initialExits = [];
  for (const block of stable.blocks) for (const side of ["left", "right", "top", "bottom"]) {
    const probe = new checks.PuzzleModel(draft.level);
    probe.beginAction();
    const result = probe.tryExit(block.id, side);
    if (result.ok) {
      probe.commitAction();
      initialExits.push({ blockId: block.id, side, layerRemoved: result.layerRemoved === true, cleared: probe.snapshot().cleared });
    }
  }
  const art = checks.auditCandidateBlockArt(draft.level);
  const extras = [...openingCoverage.issues];
  if (!initialExits.length) extras.push({ code: "filled-opening-has-no-legal-first-clear" });
  const iceShell = draft.level.blocks.filter(b => b.frozen > 0 && b.layers?.length > 1).length;
  if (iceShell !== (facts.numericIce.post_melt_shell ?? 0)) extras.push({ code: "ice-shell-colocation", expected: facts.numericIce.post_melt_shell ?? 0, actual: iceShell });
  const sourceIceItems = facts.numericIce.items;
  if (sourceIceItems?.length === facts.numericIce.count && sourceIceItems.every(i => typeof i.post_melt_shell === "boolean")) {
    const expected = sourceIceItems.map(i => `${i.value}:${i.post_melt_shell}`).sort();
    const actual = draft.level.blocks.filter(b => b.frozen > 0).map(b => `${b.frozen}:${(b.layers?.length ?? 0) > 1}`).sort();
    if (JSON.stringify(expected) !== JSON.stringify(actual)) extras.push({ code: "ice-value-shell-pairing", expected, actual });
  }
  for (const gate of draft.level.gates) if (!draft.level.blocks.some(b => (b.layers ?? [b.color]).includes(gate.color))) extras.push({ code: "empty-gate-color", gate: gate.id });
  for (const r of art.requirements) bindings[`public/${r.path}`] = { sha256: sha(await readFile(path.join(root, "public", r.path))) };
  rows.push({ ...draft, sourceContract, sourceFacts: facts, measurements: shared.measurements, openingCoverage, initialExits, issues: [...shared.issues, ...extras, ...art.issues], art,
    previewOnly: true, sourceFirstIntroductionCertified: false, spatialWitness: false, lowerBoundCertified: false, timeValidated: false, userAccepted: false, releaseApproved: false });
}
const failures = rows.filter(r => r.issues.length);
if (failures.length) {
  console.log(JSON.stringify(failures.map(r => ({ level: r.levelId, issues: r.issues })), null, 2));
  process.exitCode = 2;
} else if (process.argv.includes("--audit-only")) {
  console.log(JSON.stringify(rows.map(r => ({ level: r.levelId, opening: r.measurements.openingBlockCount, full: r.measurements.fullBlockCount, playable: r.measurements.playableCellCount, coverage: r.openingCoverage, firstClearOptions: r.initialExits.length, issues: r.issues })), null, 2));
} else {
  const stamp = new Date().toISOString().replaceAll(/[:.]/g, "-");
  const relative = `deliverables/revised-opening-layouts-lv021-030-${stamp}`;
  const out = path.join(root, relative);
  await mkdir(path.join(out, "boards"), { recursive: true });
  await mkdir(path.join(out, "levels"), { recursive: true });
  const protectedPaths = ["src/core/levels.ts", "src/core/PuzzleModel.ts", "src/game/ColorEscapeGame.ts"];
  for (const p of protectedPaths) bindings[p] = { sha256: sha(await readFile(path.join(root, p))) };
  const server = await createServer({ root, configFile: false, server: { host: "127.0.0.1", port: 0 }, logLevel: "error" });
  await server.listen();
  const port = server.httpServer.address().port;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 900, height: 1600 }, deviceScaleFactor: 1 });
  const errors = [], renderResults = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.addInitScript(() => {
    window.__PREVIEW_STORAGE__ = [];
    for (const method of ["getItem", "setItem", "removeItem", "clear"]) Storage.prototype[method] = function() { window.__PREVIEW_STORAGE__.push(method); throw Error("Preview cannot access persistent saves"); };
    for (const method of ["open", "deleteDatabase"]) indexedDB[method] = function() { window.__PREVIEW_STORAGE__.push(method); throw Error("Preview cannot access databases"); };
  });
  try {
    await page.goto(`http://127.0.0.1:${port}/tools/revised-opening-preview.html`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForFunction(() => window.__OPENING_PREVIEW__, undefined, { timeout: 60000 });
    for (const row of rows) {
      await page.evaluate(level => window.__OPENING_PREVIEW__.load(level), row.level);
      await page.waitForFunction(requirements => {
        const g = window.__OPENING_PREVIEW__.game, d = g.getDebugState();
        return d.art.ready && d.art.revisedMechanisms.ready && !d.art.formalGameplay.requestedIceSignature && !d.art.formalGameplay.iceError && d.puzzle.started && !d.revisedMechanismAnimations.length && requirements.every(({ color, kind, shapeId }) => {
          const img = g.art.formalBlocks?.[color]?.[kind]?.[shapeId];
          return img && (img.naturalWidth || img.width) > 0;
        });
      }, row.art.requirements, { timeout: 60000 });
      await page.waitForTimeout(180);
      const result = await page.evaluate(() => {
        const g = window.__OPENING_PREVIEW__.game, d = g.getDebugState(), b = d.board, t = d.viewportTransform;
        const c = document.querySelector("canvas").getBoundingClientRect();
        const snapshot = g.model.snapshot();
        return { visibleCount: snapshot.blocks.filter(block => !block.shutterId || snapshot.shutters.find(s => s.id === block.shutterId)?.revealed === true).length,
          clip: { x: c.left + t.offsetX + (b.innerX - b.cell * .68) * t.scale, y: c.top + t.offsetY + (b.innerY - b.cell * .68) * t.scale,
            width: (b.innerWidth + b.cell * 1.36) * t.scale, height: (b.innerHeight + b.cell * 1.36) * t.scale },
          coverage: d.art.formalGameplay, stableSnapshot: snapshot, storage: window.__PREVIEW_STORAGE__ };
      });
      assert.equal(result.visibleCount, row.sourceFacts.openingCount, `Stable render opening Lv${row.levelId}`);
      result.openingCoverage = auditOpeningCoverage(result.stableSnapshot);
      delete result.stableSnapshot;
      assert(result.openingCoverage.passed, `Stable render 100% coverage Lv${row.levelId}: ${JSON.stringify(result.openingCoverage)}`);
      assert.deepEqual(result.openingCoverage, row.openingCoverage);
      assert.deepEqual(result.coverage.missingWholeBlockIds, []);
      assert.deepEqual(result.storage, []);
      assert.deepEqual(errors, []);
      const name = `level-${String(row.levelId).padStart(3, "0")}`;
      await page.screenshot({ path: path.join(out, "boards", `${name}.png`), clip: result.clip });
      renderResults.push({ levelId: row.levelId, ...result });
      console.log(`Rendered Lv${row.levelId}: opening ${result.visibleCount}, all silhouettes loaded`);
    }
    const band = r => r.level.difficulty === "super" ? "超难" : r.level.difficulty === "hard" ? "困难" : "普通";
    const escape = s => String(s).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
    const sheetCss = `:root{--ink:#f9f0d5;--muted:#c4bee8;--gold:#e9be65;--bg:#14112e;--panel:#242048}*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--ink);font-family:"Microsoft YaHei","Noto Sans CJK SC",sans-serif}header{padding:38px 52px 24px;border-bottom:1px solid #514674}header small{letter-spacing:3px;color:var(--gold);font-weight:700}h1{margin:10px 0 14px;font-size:38px}p{color:var(--muted);line-height:1.65}a{color:inherit;text-decoration:none}nav{display:flex;gap:10px;flex-wrap:wrap;margin-top:22px}nav a{padding:8px 15px;border:1px solid #665583;border-radius:30px}main{padding:28px 40px}.gallery{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:20px}.tile{display:block;background:var(--panel);border:1px solid #4b4069;border-radius:18px;overflow:hidden}.top{padding:15px 18px 0;display:flex;align-items:center;justify-content:space-between}.num{font-size:26px;font-weight:800}.band{font-size:13px;color:var(--gold)}.tile h2{font-size:17px;margin:9px 18px}.boardbox{background:#211c58;display:flex;align-items:center;justify-content:center;height:430px;padding:8px}.boardbox img{width:100%;height:100%;object-fit:contain}.meta{padding:12px 18px 16px;font-size:13px;line-height:1.9;color:var(--muted)}footer{padding:20px 44px 35px;color:var(--muted);font-size:15px;line-height:1.8}body.single{width:1000px}.single header{padding:30px 42px 20px}.single h1{font-size:32px}.single main{display:grid;grid-template-columns:620px 1fr;gap:24px;padding:28px 34px}.single .boardbox{height:850px;border-radius:20px;padding:14px}.notes{padding:8px 4px}.notes h3{font-size:18px;color:var(--gold);margin:24px 0 12px}.notes p{font-size:16px}.fact{font-size:17px;line-height:2;color:var(--ink)}.muted{color:var(--muted)}.notice{border-left:3px solid var(--gold);padding-left:12px;font-size:15px;line-height:1.8}@media(max-width:900px){.gallery{grid-template-columns:repeat(2,minmax(0,1fr))}header{padding:24px}main{padding:18px}.boardbox{height:360px}}`;
    const meta = r => `${r.level.width} × ${r.level.height}　${r.measurements.leftRightSymmetric ? "左右" : "上下"}对称<br>开局 ${r.measurements.openingBlockCount} 块 · 全关 ${r.measurements.fullBlockCount} 块<br>出口 ${r.level.gates.length} · 卷帘 ${(r.level.shutters ?? []).length}<br>满铺 ${r.openingCoverage.coveredCells}/${r.openingCoverage.playableCells} 格 · 裸露空格 0`;
    const cards = rows.map(r => { const f = `level-${String(r.levelId).padStart(3, "0")}`; return `<a class="tile" href="levels/${f}.png"><div class="top"><span class="num">${r.levelId}</span><span class="band">${band(r)} · 目标档位</span></div><h2>${escape(r.title)}</h2><div class="boardbox"><img src="boards/${f}.png" alt="第${r.levelId}关开局布局"></div><div class="meta">${meta(r)}</div></a>`; }).join("");
    const html = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>21–30关 · 开局布局核对</title><style>${sheetCss}</style><header><small>BLOCK OUT! / LAYOUT REVIEW B · 100% FILLED</small><h1>第21–30关 · 开局满铺预览</h1><p>可见色块＋真实卷帘，逐关覆盖100%可玩格。先确认外形与摆放，再生成正式地图。点击任意关卡查看大图。<br>沿用规则 v1.4.0；以下是布局草案，不是已验收或已发布关卡。</p><nav><a href="overview.png">下载总览图</a><a href="review.json">布局核对记录</a></nav></header><main class="gallery">${cards}</main><footer>紫色卷帘上的数字＝所需清除/剥层次数；浅蓝冰门、冰块数字＝冰数。外壳块保留彩色边框与内芯。<br>已核对：来源数量、对称/连通、100%满铺与无重叠、出口配色、素材显示、合法首步。尚未验证：完整通关、10/15/20必要腾挪、时间与三星、全季首次引入。<br>未修改正式关卡或存档。请按关卡号反馈需要调整的轮廓、色块或机制位置。</footer></html>`;
    await writeFile(path.join(out, "index.html"), html, { flag: "wx" });
    const design = await browser.newPage({ viewport: { width: 1000, height: 1250 }, deviceScaleFactor: 1 });
    for (const r of rows) {
      const f = `level-${String(r.levelId).padStart(3, "0")}`;
      const curtains = (r.level.shutters ?? []).map(s => `${s.count} 次 → 隐藏 ${r.level.blocks.filter(b => b.shutterId === s.id).length} 块`).join("<br>") || "无卷帘";
      const ice = r.sourceFacts.numericIce.values.join(" / ") || "无";
      const doc = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><style>${sheetCss}</style><body class="single"><header><small>开局布局核对 / 满铺草案 B / 非正式地图</small><h1>第 ${r.levelId} 关 · ${escape(r.title)}</h1><p>${band(r)}目标档位 · 规则 v1.4.0 · ${r.levelId === 26 ? "本关已按授权重配普通出口，保留冰门5/9/14" : "棋盘轮廓与色块位置原创"}</p></header><main><div class="boardbox"><img src="../boards/${f}.png"></div><section class="notes"><h3>开局核对</h3><div class="fact">${meta(r)}</div><h3>出口与机制</h3><p>普通出口 ${r.level.gates.filter(g => !g.frozen).length}<br>冰门 ${r.sourceFacts.frozenExitValues.join(" / ")}<br>全关冰块 ${ice}<br>全关外壳 ${r.sourceFacts.shells.count} 块</p><h3>卷帘 → 隐藏块</h3><p>${curtains}</p><h3>布局思路</h3><p>${r.designNotes.map(escape).join("<br>")}</p><h3>异形块占比</h3><p>开局 ${r.measurements.openingIrregularCount}/${r.measurements.openingBlockCount}<br>全关 ${r.measurements.fullIrregularCount}/${r.measurements.fullBlockCount}<br>两项均不超过30%</p><div class="notice">本图仅供核对摆放。可解性、必要腾挪、时间与三星待后续验证。</div></section></main><footer>图中只显示实际开局可见块；卷帘后的色块已预留，未当作开局块展示。<br>确认布局方向后再制作正式地图，最终仍须通过全部验证。正式 LEVELS 与存档未改。</footer></body></html>`;
      await writeFile(path.join(out, "levels", `${f}.html`), doc, { flag: "wx" });
      await design.goto(`http://127.0.0.1:${port}/${relative}/levels/${f}.html`, { waitUntil: "networkidle" });
      await design.screenshot({ path: path.join(out, "levels", `${f}.png`), fullPage: true });
    }
    await design.setViewportSize({ width: 2200, height: 1400 });
    await design.goto(`http://127.0.0.1:${port}/${relative}/index.html`, { waitUntil: "networkidle" });
    await design.screenshot({ path: path.join(out, "overview.png"), fullPage: true });
    await design.setViewportSize({ width: 390, height: 844 });
    assert(await design.evaluate(() => document.documentElement.scrollWidth <= innerWidth), "Gallery must not horizontally overflow mobile");
    for (const [p, binding] of Object.entries(bindings)) assert.equal(sha(await readFile(path.join(root, p))), binding.sha256, `Source changed during render: ${p}`);
    const report = { schemaVersion: "opening-layout-preview-v2-filled", ruleVersion: lock.activeVersion, rules: manifest.versions.at(-1), purpose: "User-requested opening layout pictures BEFORE full candidate/map generation", previewOnly: true,
      checked: ["source-counts", "common-static-geometry", "cover-containment", "unique-gates", "ice-shell-colocation", "stable-visible-count", "stable-opening-100-percent-covered", "legal-first-clear-or-peel", "whole-block-art-loaded", "no-save-access"],
      sourceFirstIntroductionCertified: false, fullCandidateValidated: false, spatialWitness: false, lowerBoundCertified: false, timeValidated: false, userAccepted: false, releaseApproved: false,
      bindings, staticCheckerVersion: "Existing v1.2.1 common geometry/inventory subchecks only; NOT a complete v1.4 artifact certificate", rows, renderResults, errors };
    await writeFile(path.join(out, "review.json"), JSON.stringify(report, null, 2) + "\n", { flag: "wx" });
    console.log(JSON.stringify({ output: relative, overview: `${relative}/overview.png`, levelImages: 10, previewOnly: true, errors }, null, 2));
  } finally { await browser.close(); await server.close(); }
}
