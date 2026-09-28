// Read-only asset audit. Only newly generated reports are written; assets,
// loaders, manifests and existing WeChat outputs are never modified here.
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { resolve, relative, extname } from 'node:path';
import ts from 'typescript';
import { listFiles, computeWechatSourceFingerprint, snapshotWechatOutput } from '../scripts/wechat-build-integrity.mjs';
import { IDENTICAL_ART_PAIRS } from '../scripts/wechat-identical-art.mjs';
import { assertWechatResourcesExcluded, WECHAT_RESOURCE_EXCLUSIONS } from '../scripts/wechat-resource-policy.mjs';

const root = resolve(import.meta.dirname, '..');
const before = await computeWechatSourceFingerprint(root);
const stamp = new Date().toISOString().replaceAll(':', '-').replaceAll('.', '-');
const out = resolve(root, 'deliverables', `wechat-resource-audit-${stamp}`);
const bundle = await build({ stdin: { contents: `
  export { ColorEscapeGame } from './src/game/ColorEscapeGame';
  export { LEVELS } from './src/core/levels';
  export { GAME_ART } from './src/game/artManifest';
  export { ACTIVE_REVISED_MECHANISM_ART_PATHS } from './src/game/revisedMechanismArt';
`, resolveDir: root }, bundle: true, write: false, platform: 'node', format: 'cjs', metafile: true });
const module = { exports: {} };
new Function('module', 'exports', bundle.outputFiles[0].text)(module, module.exports);
const { ColorEscapeGame, LEVELS, GAME_ART, ACTIVE_REVISED_MECHANISM_ART_PATHS } = module.exports;
assert.equal(LEVELS.length, 200);
const manifest = JSON.parse(await readFile(resolve(root, 'art-source/manifest.json'), 'utf8'));
const buildManifest = JSON.parse(await readFile(resolve(root, 'dist-wechat.build-manifest.json'), 'utf8'));
const built = await snapshotWechatOutput(resolve(root, 'dist-wechat'));
assert.deepEqual(built, buildManifest.outputs, 'Existing build output differs from its own snapshot');
assert.equal(before, buildManifest.sourceFingerprint, 'Build must match current sources before auditing native sizes');
const builtMap = new Map(built.map(row => [row.path, row]));
assert.deepEqual(buildManifest.resourceExclusions, WECHAT_RESOURCE_EXCLUSIONS, 'Build resource policy must match current reviewed exclusions');
assertWechatResourcesExcluded(built);
const buildGameConfig = JSON.parse(await readFile(resolve(root, 'dist-wechat/game.json'), 'utf8'));
const paths = new Map();
function flatten(value, key = 'GAME_ART') {
  if (typeof value === 'string' && value.startsWith('assets/')) paths.set(value, [...(paths.get(value) ?? []), key]);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) flatten(v, `${key}.${k}`);
}
flatten(GAME_ART);
const activeMechanismPaths = new Set(ACTIVE_REVISED_MECHANISM_ART_PATHS);
assert.equal(activeMechanismPaths.size, ACTIVE_REVISED_MECHANISM_ART_PATHS.length, 'Active mechanism URLs must be unique');
for (const path of activeMechanismPaths) paths.set(path, ['ACTIVE_REVISED_MECHANISM_ART_PATHS']);

// Exercise the actual loaders with in-memory image placeholders, without a
// constructor, Canvas, host storage, audio or a real player session.
const loaded = new Set();
const game = Object.assign(Object.create(ColorEscapeGame.prototype), {
  art: {}, save: { selectedJourneyEpisode: 1 }, model: { level: LEVELS[0] },
  formalStarDynamicImages: [], host: { releaseImage() {} }, scheduleFrame() {},
  requestJourneyHomeThemeArt() {}, failArtLoad(_phase, error) { throw error; },
  loadImages: async (urls) => urls.map(src => { loaded.add(src); return { src }; }),
  formalPageArtCache: {}, formalPageArtRequestToken: 0,
});
await game.loadArt();
await Promise.resolve();
assert(game.artReady, 'Main loader failed');
for (const screen of ['supply', 'leaderboard', 'levels', 'records']) {
  game.screen = screen; game.requestFormalPageArt(screen);
  await Promise.resolve(); await Promise.resolve();
  assert.equal(game.formalPageArt?.screen, screen, `Page loader failed: ${screen}`);
}
for (const [screen, method, field] of [
  ['records', 'requestCollectionAlbumArt', 'collectionAlbumArt'],
  ['achievements', 'requestAchievementArt', 'achievementArt'],
  ['dailyTasks', 'requestDailyTaskArt', 'dailyTaskArt'],
  ['win', 'requestWinArt', 'winArt'],
]) {
  for (const k of ['collectionAlbumArtRequestToken', 'collectionAlbumArtworkRequestToken', 'achievementArtRequestToken', 'dailyTaskArtRequestToken', 'winArtRequestToken']) game[k] = 0;
  game.screen = screen; game[method]();
  await Promise.resolve(); await Promise.resolve();
  assert(game[field], `Group loader failed: ${field}`);
}
for (const p of [...GAME_ART.ui.formalPages.journey.homeThemes, ...activeMechanismPaths]) loaded.add(p);
const levelUsage = new Map();
for (const level of LEVELS) {
  game.model = { level };
  for (const request of [...game.formalBlockAssetPlan().requests, ...game.formalIceAssetPlan().requests]) {
    loaded.add(request.path);
    levelUsage.set(request.path, [...(levelUsage.get(request.path) ?? []), level.id]);
  }
}

const sourceText = await readFile(resolve(root, 'src/game/ColorEscapeGame.ts'), 'utf8');
const sourceTree = ts.createSourceFile('ColorEscapeGame.ts', sourceText, ts.ScriptTarget.Latest, true);
const classNode = sourceTree.statements.find(ts.isClassDeclaration);
function propertyMethods(property) {
  const uses = [];
  for (const method of classNode.members) {
    if (!ts.isMethodDeclaration(method)) continue;
    function visit(n) {
      if (ts.isPropertyAccessExpression(n) && n.name.text === property) {
        uses.push({ method: method.name.getText(sourceTree), line: sourceTree.getLineAndCharacterOfPosition(n.getStart(sourceTree)).line + 1 });
      }
      ts.forEachChild(n, visit);
    }
    visit(method);
  }
  return uses;
}
const deadSlots = [
  // Historical URLs deliberately do not depend on removed GAME_ART fields.
  // They still classify any accidentally reintroduced file after cleanup.
  ['assets/art/ui/navigation-v3/five-tab-icons-atlas-v1.png', 'navigationFive', '旧五栏导航图集；正式底栏改用 home-v3 单独图标'],
  ['assets/art/gameplay/board/irregular-cell-v1.png', 'irregularCell', '旧异形棋盘格；历史加载后无读取/绘制'],
  ['assets/art/gameplay/mechanics/mechanism-guide-icons-atlas-v1.png', 'mechanismGuideIcons', '旧玩法图鉴图集；现用 mechanism-guide-v2 独立图'],
  ['assets/art/fx/victory-halo-v1.png', 'victoryHalo', '旧胜利光环；当前结算改用正式 win/glow'],
  ['assets/art/fx/block-blocked-halo-v1.png', 'blockBlockedHalo', '旧受阻光环；历史只有调试 ready 标记，无绘制'],
  ['assets/art/ui/formal-pages/overlays/win/perfect-title.png', 'perfectTitle', '旧 PERFECT 图片；当前胜利标题为本地化 Canvas 文字'],
];
const dead = new Map(deadSlots.map(([url, property, reason]) => {
  const uses = propertyMethods(property);
  assert(uses.every(u => /^(loadArt|loadDeferredArt|getDebugState|winArtImages|requestWinArt)$/.test(u.method)), `Unreviewed usage of ${property}`);
  return [url, { reason, evidence: uses }];
}));
const aliases = new Map(IDENTICAL_ART_PAIRS.map(([from, to]) => [`assets/art/ui/formal-pages/${from}`, `assets/art/ui/formal-pages/${to}`]));
const exclusions = new Map(WECHAT_RESOURCE_EXCLUSIONS.map(entry => [`assets/${entry.source}`, entry]));
const globalDeclared = new Map(manifest.assets.map(a => [a.runtime.replace('../public/', ''), a]));
const editorCss = await readFile(resolve(root, 'src/editor/boardEditor.css'), 'utf8');
const route = p => {
  if (p === 'assets/audio/happy-carnival.mp3') return 'menu-music/happy-carnival.mp3';
  if (p === 'assets/audio/happy-foods.mp3') return 'audio/happy-foods.mp3';
  if (p.startsWith('assets/audio/sfx/')) return p.replace('assets/audio/', 'audio/');
  for (const [from, to] of [
    ['assets/art/ui/formal-pages/journey/home-', 'journey-themes/home-'],
    ['assets/art/ui/formal-pages/journey/episode-', 'journey-themes/episode-'],
    ['assets/art/ui/formal-pages/collection-card-atlases-v1/', 'collection-art/atlases/'],
    ['assets/art/ui/formal-pages/', 'meta-ui/formal-pages/'],
    ['assets/art/gameplay/blocks/formal-v1/', 'gameplay-art/formal-v1/'],
    ['assets/art/gameplay/mechanics/revised-reference-v1/', 'gameplay-art/revised-mechanisms/'],
    ['assets/art/gameplay/mechanics/shutter-nine-slice-v1/', 'gameplay-art/shutter-nine-slice/'],
    ['assets/art/fx/', 'gameplay-art/fx/'],
  ]) if (p.startsWith(from)) return p.replace(from, to).replace(/\.webp$/, '.png');
  return p;
};
const packageOf = p => ['meta-ui', 'gameplay-art', 'journey-themes', 'collection-art', 'audio', 'menu-music'].includes(p.split('/')[0]) ? p.split('/')[0] : '主包';
const publicFiles = await listFiles(resolve(root, 'public/assets'));
const inventory = [];
for (const file of publicFiles) {
  const url = `assets/${file}`, shippingPath = route(url), native = builtMap.get(shippingPath);
  const row = { source: `public/${url}`, shippingPath, package: packageOf(shippingPath), sourceBytes: (await stat(resolve(root, 'public', url))).size,
    nativeBytes: native?.bytes ?? 0, sha256: native?.sha256, manifestKeys: paths.get(url) ?? [], globalManifest: globalDeclared.has(url),
    loadedByAudit: loaded.has(url), levelIds: levelUsage.get(url) ?? [] };
  if (exclusions.has(url)) {
    const exclusion = exclusions.get(url);
    assert.equal(shippingPath, exclusion.output, `Excluded asset route changed: ${url}`);
    assert(!native && !loaded.has(url), `Excluded asset unexpectedly shipped or loaded: ${url}`);
    Object.assign(row, { category: '已排除-开发侧保留', exclusionReason: exclusion.reason,
      reason: exclusion.reason === 'web-editor-only' ? '保留网页编辑器源图；微信包已精确排除，包内占用为0'
        : '保留开发来源/生成记录；微信包已精确排除，包内占用为0' });
  } else if (aliases.has(url)) {
    assert(!native, `Alias unexpectedly ships twice: ${url}`);
    Object.assign(row, { category: '已去重不重复打包', reason: '构建别名已排除此副本', canonical: route(aliases.get(url)) });
  } else if (/\.(json|md)$/.test(file)) Object.assign(row, { category: 'A-打包多余元数据', reason: '资源来源/音效生成记录；运行代码无读取；需保留开发侧验证原件' });
  else if (dead.has(url)) Object.assign(row, { category: 'B-已退役旧资源残留', ...dead.get(url) });
  else if (!loaded.has(url) && !url.startsWith('assets/audio/')) {
    const dynamic = url.includes('/blocks/formal-v1/') || url.includes('/mechanics/formal-gameplay-v1/ice-');
    const editor = editorCss.includes(url);
    Object.assign(row, { category: dynamic ? 'D-当前200关未请求候选' : editor ? 'C-仅编辑器使用' : 'C-微信无加载路径',
      reason: dynamic ? '真实 formalBlock/iceAssetPlan 遍历200关未请求；已登记可替换资源，关卡仍在变动，不直接删除'
        : editor ? '仅网页棋盘编辑器 CSS 引用；微信入口不包含编辑器，Web 版本必须保留'
        : '当前全部页面/启动加载器未请求，类内无对应字段读取；保留在资源表/优化器的旧资源' });
  } else Object.assign(row, { category: '保留-现役或条件资源', reason: url.startsWith('assets/audio/') ? '微信音乐/15类音效动态加载' : '加载器/200关资源计划或新版机制组可达；不以单次试玩未显示判废弃' });
  if (!aliases.has(url) && !exclusions.has(url)) assert(native, `Mapped shipping file missing: ${shippingPath}`);
  inventory.push(row);
}
const groups = [...new Set(inventory.map(r => r.category))].map(category => {
  const rows = inventory.filter(r => r.category === category);
  return { category, count: rows.length, sourceBytes: rows.reduce((s, r) => s + r.sourceBytes, 0), nativeBytes: rows.reduce((s, r) => s + r.nativeBytes, 0) };
});
const packages = [...new Set(built.map(r => packageOf(r.path)))].map(name => {
  const rows = built.filter(r => packageOf(r.path) === name), bytes = rows.reduce((s, r) => s + r.bytes, 0);
  const subpackage = buildGameConfig.subpackages?.find(entry => entry.name === name);
  assert(name === '主包' || subpackage, `Unknown package: ${name}`);
  const limit = (name === '主包' || subpackage.independent === true ? 4 : 2) * 1024 ** 2;
  const reserved = name === '主包' ? 256 * 1024 : 64 * 1024;
  return { name, files: rows.length, bytes, projectLimitBytes: limit, headroomBytes: limit - bytes, guardHeadroomBytes: reserved, guardPass: limit - bytes >= reserved };
});
const hashes = new Map();
for (const row of built.filter(r => /\.(png|jpg|mp3|wav)$/.test(r.path))) hashes.set(row.sha256, [...(hashes.get(row.sha256) ?? []), row]);
const duplicates = [...hashes.values()].filter(rows => rows.length > 1).map(rows => ({ files: rows, potentialSavings: rows[0].bytes * (rows.length - 1), reason: '逐字节相同；不是未使用，需统一引用/路由后才可去掉副本' }));
const sourceAssets = await listFiles(resolve(root, 'art-source'));
const declaredSources = new Set(manifest.assets.map(a => a.source));
const sourceOnly = [];
for (const path of sourceAssets) if (!declaredSources.has(path)) sourceOnly.push({ path: `art-source/${path}`, bytes: (await stat(resolve(root, 'art-source', path))).size,
  status: /unused|reference|示意|\.md$|manifest\.json$/.test(path) ? '源端参考/说明/未采用切图；不上传' : '未列为当前导出源；可能是旧版/制作输入，保留待复核' });
const after = await computeWechatSourceFingerprint(root);
assert.equal(before, after, 'Inputs changed during audit');
const excludedRows = inventory.filter(row => row.category === '已排除-开发侧保留');
assert.equal(excludedRows.length, WECHAT_RESOURCE_EXCLUSIONS.length, 'Reviewed exclusions must retain every development source file');
assert(excludedRows.every(row => row.nativeBytes === 0));
const historicalDeadResources = deadSlots.map(([url, property, reason]) => ({
  source: `public/${url}`, property, reason, presentInPublic: publicFiles.includes(url.slice('assets/'.length)),
  presentInBuild: builtMap.has(route(url)), loadedByAudit: loaded.has(url), manifestKeys: paths.get(url) ?? [],
  evidence: dead.get(url).evidence,
}));
const activeMechanismRows = inventory.filter(row => activeMechanismPaths.has(row.source.replace(/^public\//, '')));
assert.equal(activeMechanismRows.length, activeMechanismPaths.size, 'Every active mechanism image must be inventoried');
assert(activeMechanismRows.every(row => row.loadedByAudit && row.category === '保留-现役或条件资源'
  && row.package === 'gameplay-art' && row.nativeBytes > 0), 'Active mechanism art must be retained in its mapped subpackage');
const undeclaredRevised = activeMechanismRows.filter(row => !row.globalManifest);
const sha = text => createHash('sha256').update(text).digest('hex');
const result = { schemaVersion: 1, auditedAt: new Date().toISOString(), rulesVersion: '1.11.0', sourceFingerprint: before,
  buildManifestSha256: sha(await readFile(resolve(root, 'dist-wechat.build-manifest.json'))),
  scope: '当前 public/assets、真实加载方法/200关资源计划、完整 dist-wechat、源端留档；不是微信真机全流程或后台上传结果',
  method: '实跑真实加载方法但使用内存图片占位；单独复核6个无绘制字段的AST读取；动态条件保守保留；不读写玩家存档',
  writes: '本次审计只新增报告；不生成构建、不删除/移动资源、不调整加载器或打包规则、不上传。历史清理和构建结果不由本脚本推断',
  totals: { publicFiles: inventory.length, publicImages: inventory.filter(r => /\.(png|jpg|webp)$/.test(r.source)).length,
    exportedImageUrls: paths.size, globalManifestEntries: manifest.assets.length, revisedImageUrls: activeMechanismPaths.size,
    shippingFiles: built.length, shippingBytes: built.reduce((s, r) => s + r.bytes, 0),
    excludedSourceFiles: excludedRows.length, excludedSourceBytes: excludedRows.reduce((s, row) => s + row.sourceBytes, 0),
    excludedShippingBytes: excludedRows.reduce((s, row) => s + row.nativeBytes, 0),
    historicalDeadSourceFilesAbsent: historicalDeadResources.filter(row => !row.presentInPublic).length,
    undeclaredRevisedImages: undeclaredRevised.length,
    sourceOnlyFiles: sourceOnly.length, sourceOnlyBytes: sourceOnly.reduce((s, r) => s + r.bytes, 0) },
  buildEvidence: { sourceFingerprintMatches: true, outputHashesMatch: true,
    packageBudgetPass: packages.every(row => row.guardPass) && built.reduce((s, row) => s + row.bytes, 0) <= 20 * 1024 ** 2,
    buildOrVerificationCommandExecutedByAudit: false },
  groups, packages, duplicates, inventory, historicalDeadResources, sourceOnly, outputs: built,
};
await mkdir(out, { recursive: false });
await writeFile(resolve(out, 'inventory.json'), JSON.stringify(result, null, 2) + '\n');
const kb = n => `${(n / 1024).toFixed(2)} KiB`;
const mi = n => `${(n / 1024 ** 2).toFixed(3)} MiB`;
const candidates = inventory.filter(r => /^[ABC]-/.test(r.category));
const sum = rows => rows.reduce((s, r) => s + r.nativeBytes, 0);
const table = (heads, rows) => `| ${heads.join(' | ')} |\n| ${heads.map(() => '---').join(' | ')} |\n${rows.map(r => '| ' + r.join(' | ') + ' |').join('\n')}\n`;
const metaUi = packages.find(row => row.name === 'meta-ui');
const duplicateBytes = duplicates.reduce((total, group) => total + group.potentialSavings, 0);
const deadRows = inventory.filter(row => row.category.startsWith('B-'));
const audioCount = inventory.filter(row => row.source.startsWith('public/assets/audio/') && /\.(mp3|wav)$/.test(row.source)).length;
const report = [
  '# 微信版本资源审计清单',
  `审计时间：${result.auditedAt}。本次审计只读取当前状态并新增本报告；不执行删除/移动、修改加载器/打包规则、构建或上传发布。此前清理不等同于本脚本的写入。`,
  '## 结论',
  `扫描 public/assets 全部 ${inventory.length} 个文件（${result.totals.publicImages} 张图片），核对当前生成包 ${built.length} 个发布文件。当前剩余可整理候选（A/B/C）共 ${candidates.length} 个，包内合计 ${sum(candidates).toLocaleString('en-US')} bytes（${kb(sum(candidates))}）。这是现存候选的毛节省，不是历史清理收益；不重复计算已删除或已排除的文件。`,
  `已有 ${excludedRows.length} 个开发侧保留文件通过精确策略排除微信包（源端 ${kb(result.totals.excludedSourceBytes)}，包内 ${result.totals.excludedShippingBytes} bytes）。历史核实的 ${deadSlots.length} 个旧无绘制资源中，当前 ${result.totals.historicalDeadSourceFilesAbsent} 个不再存在于 public；状态详见历史旧资源表。`,
  `当前生成包总计 ${mi(result.totals.shippingBytes)}，距项目总上限20 MiB余 ${(20*1024**2-result.totals.shippingBytes).toLocaleString('en-US')} bytes。meta-ui=${metaUi.bytes.toLocaleString('en-US')} bytes，余 ${metaUi.headroomBytes.toLocaleString('en-US')} bytes，项目预留 ${metaUi.guardHeadroomBytes.toLocaleString('en-US')} bytes，当前体积门禁 ${metaUi.guardPass ? 'PASS' : 'FAIL'}。本审计计算的全包体积门禁 ${result.buildEvidence.packageBudgetPass ? 'PASS' : 'FAIL'}，但未执行 pnpm build:wechat 或完整发布校验，不能据此宣称该命令成功/失败、真机验收或已上传。以上为磁盘原始体积，不是微信后台上传压缩统计。`,
  '## 分类总览',
  table(['分类', '文件数', '当前包内占用'], groups.map(g => [g.category, g.count, kb(g.nativeBytes)])),
  'A为仍被打包的开发元数据；B为历史已核实旧资源的残留；C为无微信加载路径或编辑器专用残留；已排除项不计入A/B/C。B若仍被加载，移除图片前须同步整理代码。D只列候选，当前不建议删。版本号旧、未登记总manifest或一次试玩未出现，均不等于废弃。',
  '## 当前分包体积',
  table(['包', '文件数', 'bytes', '项目上限余量', '预留门禁'], packages.map(p => [p.name, p.files, p.bytes, kb(p.headroomBytes), p.guardPass ? 'PASS' : 'FAIL'])),
  '## 已排除微信包、开发侧仍保留',
  table(['源文件', '微信目标路径', '当前包内bytes', '说明'], excludedRows.map(row => [row.source, row.shippingPath, row.nativeBytes, row.reason])),
  '仅上述精确路径可从源侧验包预期中排除；生成包快照不做相同过滤，若文件重新入包会失败。元数据开发原件和编辑器源图均保留。',
  '## A：运行时无读取的元数据（开发侧保留）',
  table(['微信包内路径', 'bytes', '说明'], inventory.filter(r => r.category.startsWith('A-')).map(r => [r.shippingPath, r.nativeBytes, r.reason])),
  '本表仅显示当前仍被打包的元数据；已排除的 README/manifest 在上一表列出，不重复作为待清理项。开发来源和生成记录不能仅凭扩展名永久删除。',
  '## B：已退役旧资源的当前残留',
  table(['微信包内路径', 'bytes', '当前仍加载', '原因/证据'], deadRows.map(r => [r.shippingPath, r.nativeBytes, r.loadedByAudit ? '是' : '否', `${r.reason}；` + (r.evidence.map(e => `ColorEscapeGame.ts:${e.line} (${e.method})`).join('、') || '当前类方法无该属性读取')])),
  '## 历史旧资源状态（固定URL复查，不依赖已删字段）',
  table(['历史源文件', 'public仍存在', '包内仍存在', '当前仍加载/导出URL'], historicalDeadResources.map(row => [row.source, row.presentInPublic ? '是' : '否', row.presentInBuild ? '是' : '否', `${row.loadedByAudit ? '是' : '否'} / ${row.manifestKeys.length}`])),
  `以上 ${historicalDeadResources.length} 个历史字段继续逐项检查AST方法读取；若出现未经复核的方法会终止审计。不存在的旧文件不加入当前 inventory，不计入剩余清理数量或收益。`,
  '## C：微信加载链不可达 / 网页编辑器专用',
  table(['微信包内路径', 'bytes', '类别'], inventory.filter(r => r.category.startsWith('C-')).map(r => [r.shippingPath, r.nativeBytes, r.category])),
  '正式游戏使用 formal-border-v2。formal-border-v1 的编辑器依赖应保留在Web源侧；已通过策略排除的3张不再列入本表。Journey 锁定状态使用 episode-locked-shade.png 等现役组件，不应因删除旧边框而误删这些组件。',
  '## D：当前200关资源计划未请求（需保留待确认）',
  table(['微信包内路径', 'bytes'], inventory.filter(r => r.category.startsWith('D-')).map(r => [r.shippingPath, r.nativeBytes])),
  '该项只表示当前最终LEVELS没有对应颜色/形状组合；正式资源仍可由动态查表使用，且剩余关卡还在制作。不是永久废弃证据，不把这部分计入确定清理收益。',
  '## 完全重复但仍在用的资源',
  table(['相同文件组', '可去重毛节省'], duplicates.map(g => [g.files.map(r => r.path).join('<br>'), kb(g.potentialSavings)])),
  `当前共 ${duplicates.length} 组，潜在毛节省 ${kb(duplicateBytes)}，须同步改引用/分包路由后才可合并，不能直接删一份。构建现有 ${aliases.size} 个精确别名，已不重复打包的副本不计算在此收益中。`,
  '## 不能误删的资源',
  `- revisedMechanismArt.ts 的 ACTIVE_REVISED_MECHANISM_ART_PATHS 包含 ${activeMechanismPaths.size} 个现役机制图URL（含新卷帘面板及8片门框），已逐项归为保留并核对 gameplay-art 映射。原始63张来源清单保留为溯源，不当作当前加载清单。当前主美术清单共 ${manifest.assets.length} 项，现役机制PNG仍有 ${undeclaredRevised.length} 张未登记主清单；不将独立清单覆盖但未登记主清单的图片误判为废弃。`,
  '- collection-album-v1/new-badge、v2/detail-panel 与 progress-panel 仍被新版收藏使用；不能按v1/v2目录整删。Adventures title.png 也已恢复实际绘制。',
  `- Shop/reference.png 是商店实际背景，不是可删示意图；Journey大背景/终点/奖励弹层、十章主题、收藏图集、当前 ${audioCount} 段音乐音效及旧机制兼容图，不能仅因体积大或某一局没见到就删除。`,
  '- 部分图集只有某些格仍使用，不能把未使用格等同于整张图未使用。',
  '## 已经留档、不进入上传包的资源',
  `art-source 内有 ${sourceOnly.length} 个文件未作为当前主美术清单导出源（合计 ${mi(result.totals.sourceOnlyBytes)}），完整列表见 inventory.json 的 sourceOnly。这包含历史版本、示意图、未采用切图、制作输入、README与manifest，不是可一键删除清单。art-source 不在微信复制入口内，清理它们不减少上传包。`,
  '- 旧home-v2、旧收藏整套/旧任务v1、旧成就蓝奖章、旧玩法图鉴图片、旧彩色块/出口/连接器与exit-suction-trail等已有源端/临时归档；当前运行目录中未再发现这些已退役整套路径。',
  '- .codex-temp、playtest-results、deliverables、docs、测试、node_modules和原始设计资料不被 scripts/build-wechat.mjs 拷入上传目录，不当作包内垃圾删除。项目私有配置保留，不计入发布包统计。',
  '## 建议的后续检查（本审计未执行）',
  candidates.length ? `1. 逐项复核本报告当前剩余 ${candidates.length} 个A/B/C候选，再同步更新引用和精确打包规则；不降低包体门槛。` : '1. 当前未发现剩余A/B/C清理候选；不要重复删除已经移除或已排除的资源。',
  `2. ${duplicates.length ? `如需进一步缩包，复核当前 ${duplicates.length} 组字节重复资源并用验证过的别名合并。` : '当前没有需要进一步合并的字节重复资源。'} D类动态形状资源保持待确认，不自动删除。`,
  '3. 重跑typecheck、资源和完整包体验证、启动/五页/结算/受阻反馈/编辑器测试以及微信真机冷启动；只在用户确认后上传。',
  '## 证据与限制',
  `源指纹：${before}。inventory.json 保存全部 ${inventory.length} 个当前public文件、包内实际大小/SHA、${paths.size} 个图URL、${LEVELS.length} 关动态计划关联、完整构建快照、精确排除与历史旧资源状态及源端留档清单。构建源指纹与输出SHA匹配，不拿旧包体当当前结果。`,
  '本脚本实际执行并通过：占位加载器、200关资源计划枚举、映射路径、精确排除、构建输入指纹和输出SHA一致性检查。本脚本不执行规则锁命令、build、完整微信验包、删除、自动修复、真机遍历或上传，因此不记录这些操作的推测结果。条件加载/版本兼容路径保守保留，静态与占位加载不是所有路径已真实绘制的证明。',
].join('\n\n') + '\n';
await writeFile(resolve(out, '资源审计报告.md'), report);
console.log(JSON.stringify({ output: relative(root, out), totals: result.totals, groups, packages, duplicates, certainCandidateBytes: sum(candidates) }, null, 2));
