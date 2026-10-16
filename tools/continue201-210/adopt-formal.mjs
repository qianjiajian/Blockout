/**
 * Accept the current 201–210 isolated LevelSpecs as formal data only after
 * same-object static, source, floor, route and two-viewport browser evidence.
 *
 * Usage: node tools/continue201-210/adopt-formal.mjs --browser PATH
 *   --browser PATH [--browser PATH ...] [--check]
 * --check validates without writing. The production campaign stays at 200.
 */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { verifyRulesLock } from '../verify-rules-lock.mjs';
import {
  inspectDisjoint211to220Data,
  inspectDisjoint221to230Data,
} from './pointer/disjoint-data-audit.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const base = 'deliverables/continue201-210-20260930';
const outputDir = `${base}/formal-adoption`;
const inputs = {
  static: `${base}/formal-static-audit.json`,
  source: `${base}/formal-source-review.json`,
  isolated: `${base}/formal-isolated-hidden-repair.json`,
  route: 'tests/fixtures/remake201-210-hidden-repair-20260930.json',
  sourceFirst: 'deliverables/continue201-210-20260929/source201-205.json',
  sourceSecond: 'deliverables/continue201-210-20260929/source206-210.json',
};
const ids = Array.from({ length: 10 }, (_, index) => index + 201);
const rhythm = ['easy', 'normal', 'normal', 'hard', 'easy', 'normal', 'hard', 'easy', 'normal', 'super'];
const bands = { easy: [5, 10], normal: [11, 15], hard: [16, 20], super: [21, 30] };
const viewports = ['320x568', '496x1078'];
const canonical = value => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha = value => createHash('sha256').update(value).digest('hex');
const objectSha = value => sha(JSON.stringify(value));
const canonicalSha = value => objectSha(canonical(value));
const invariant = (condition, message) => assert.ok(condition, message);
const shaEqual = (actual, expected, label) => assert.equal(actual?.toLowerCase(), expected?.toLowerCase(), label);

function localPath(path) {
  const full = resolve(root, path);
  const rel = relative(root, full);
  invariant(rel && rel !== '..' && !rel.startsWith(`..\\`) && !rel.startsWith('../') && !isAbsolute(rel),
    `Evidence path must stay inside workspace: ${path}`);
  return full;
}
const readJson = async path => JSON.parse(await readFile(localPath(path), 'utf8'));
const fileSha = async path => sha(await readFile(localPath(path)));
function exactIds(rows, label) {
  invariant(Array.isArray(rows), `${label}: expected array`);
  assert.deepEqual(rows.map(row => row.id).sort((a, b) => a - b), ids, `${label}: exact ten IDs`);
}
function parseArgs(argv) {
  const reports = [];
  let checkOnly = false;
  for (let index = 0; index < argv.length; index++) {
    if (argv[index] === '--browser' && argv[index + 1] && !argv[index + 1].startsWith('--')) {
      reports.push(argv[++index]);
    } else if (argv[index] === '--check') {
      checkOnly = true;
    } else {
      throw new Error(`Unknown or incomplete argument: ${argv[index]}`);
    }
  }
  invariant(reports.length >= 2, 'Pass every completed browser report explicitly with --browser PATH');
  assert.equal(new Set(reports.map(localPath)).size, reports.length, 'Duplicate browser report path');
  return { reports, checkOnly };
}
async function videoSha(path) {
  const hash = createHash('sha256');
  for await (const bytes of createReadStream(resolve(path))) hash.update(bytes);
  return hash.digest('hex');
}
async function currentLevels() {
  const bundle = await build({
    stdin: {
      contents: "export { FORMAL_ISOLATED_201_210_LEVELS } from './src/core/formal201to210Data.ts'; export { LEVELS, getLevelStrict } from './src/core/levels.ts';",
      resolveDir: root,
      sourcefile: 'formal-201-210-adoption.ts',
    },
    platform: 'node', format: 'esm', bundle: true, write: false, logLevel: 'silent',
  });
  return import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
}
function floorRecord(report, id) {
  const records = report.records;
  return Array.isArray(records) ? records.find(row => row.id === id) : records?.[String(id)];
}
async function validateAssets(staticRows) {
  const assets = new Map();
  for (const row of staticRows) for (const block of row.checks.nativeArt.blocks) {
    assert.equal(block.quarterTurns, 0, `Lv${row.id} rotated art`);
    invariant(block.passed, `Lv${row.id} missing native block art`);
    for (const asset of block.assets) {
      invariant(asset.exists && /^[a-f0-9]{64}$/i.test(asset.sha256), `Lv${row.id} invalid art record`);
      const path = `public/${asset.path}`;
      if (assets.has(path)) shaEqual(assets.get(path), asset.sha256, `Conflicting art hash: ${path}`);
      assets.set(path, asset.sha256);
    }
  }
  for (const [path, expected] of assets) shaEqual(await fileSha(path), expected, `Art changed: ${path}`);
  return assets.size;
}
function checkBrowserReport(report, path) {
  assert.equal(report.status, 'PASS', `${path}: report status`);
  assert.equal(report.candidateOnly, true, `${path}: isolated candidate mode`);
  assert.equal(report.isolatedFormalDataValidated, true, `${path}: isolated data`);
  assert.equal(report.productionDataValidated, false, `${path}: production data claim`);
  assert.equal(report.naturalClock, true, `${path}: natural clock`);
  assert.equal(report.clockFrozen, false, `${path}: clock frozen`);
  assert.equal(report.playerSaveTouched, false, `${path}: player save`);
  assert.equal(report.releaseApproved, false, `${path}: release approval`);
  assert.equal(report.scaffoldIsProductionData, false, `${path}: scaffold claim`);
  for (const key of ['errors', 'drift', 'sourceEvidenceDrift']) {
    assert.deepEqual(report[key], [], `${path}: ${key}`);
  }
  const workspaceDrift = report.currentWorkspaceDrift;
  invariant(Array.isArray(workspaceDrift), `${path}: missing workspace drift audit`);
  if (workspaceDrift.length === 0) {
    assert.deepEqual(report.acceptedConcurrentData, [], `${path}: unexpected concurrent-data exception`);
  } else {
    const allowed = new Set(['src/core/formal211to220Data.ts', 'src/core/remake221to230Data.ts']);
    invariant(workspaceDrift.length <= allowed.size
      && new Set(workspaceDrift.map(drift => drift.path)).size === workspaceDrift.length
      && workspaceDrift.every(drift => allowed.has(drift.path)),
    `${path}: material source drift`);
    const accepted = report.acceptedConcurrentData;
    invariant(Array.isArray(accepted) && accepted.length === workspaceDrift.length,
      `${path}: missing drift proof`);
    for (const drift of workspaceDrift) {
      const proof = accepted.find(item => item.path === drift.path);
      invariant(proof && accepted.filter(item => item.path === drift.path).length === 1,
        `${path}: ambiguous drift proof for ${drift.path}`);
      assert.equal(proof.accepted, true, `${path}: drift proof acceptance`);
      assert.equal(proof.verifiedPureData, true, `${path}: strict AST pure-data proof`);
      assert.equal(proof.disjointScope, true, `${path}: dependency/scope proof`);
      if (drift.path === 'src/core/formal211to220Data.ts') {
        assert.equal(proof.verifier, 'strict-ast-json-batch-211-220-v1', `${path}: Lv211 verifier`);
        for (const key of ['unchangedImportAndGetter', 'exactExistingEntriesPreserved', 'levelIdsMatchEvidence']) {
          assert.equal(proof[key], true, `${path}: Lv211 ${key}`);
        }
      } else {
        assert.equal(proof.verifier, 'strict-ast-json-batch-221-230-v1', `${path}: Lv221 verifier`);
        assert.equal(proof.reason,
          'Only literal Lv221–230 records changed; all Lv201–210 objects and shared runtime inputs remained byte-identical to the browser snapshot.',
          `${path}: Lv221 drift proof reason`);
      }
      const [min, max] = drift.path.includes('211to220') ? [211, 220] : [221, 230];
      for (const key of ['priorIds', 'currentIds']) {
        invariant(Array.isArray(proof[key])
          && new Set(proof[key]).size === proof[key].length
          && proof[key].every(id => Number.isInteger(id) && id >= min && id <= max),
        `${path}: ${key} is not confined to ${min}–${max}`);
      }
      shaEqual(report.bindings?.[drift.path], drift.priorSha256, `${path}: prior drift binding`);
      shaEqual(proof.currentSha256, drift.currentSha256, `${path}: accepted current drift hash`);
    }
  }
  const viewport = `${report.viewport?.width}x${report.viewport?.height}`;
  invariant(viewports.includes(viewport), `${path}: unexpected viewport ${viewport}`);
  invariant(Array.isArray(report.rows) && report.rows.length > 0, `${path}: no browser rows`);
  const requested = [...report.requestedIds].sort((a, b) => a - b);
  assert.deepEqual(report.rows.map(row => row.id).sort((a, b) => a - b), requested,
    `${path}: requested IDs must match rows`);
  assert.equal(new Set(requested).size, requested.length, `${path}: duplicate IDs`);
  return viewport;
}
function checkBrowserRow(row, level, fixture, viewport, reportPath, reportSha) {
  const id = level.id;
  const levelSha = canonicalSha(level);
  const routeSha = canonicalSha(fixture.route);
  assert.equal(row.id, id, `Lv${id} browser ID`);
  assert.equal(row.status, 'PASS', `Lv${id} ${viewport} browser status`);
  assert.equal(row.candidateOverlay, true, `Lv${id} ${viewport} isolated overlay`);
  assert.equal(row.candidateStarTargetsValidated, true, `Lv${id} ${viewport} star target binding`);
  shaEqual(row.levelSha256, levelSha, `Lv${id} ${viewport} level hash`);
  shaEqual(row.routeSha256, routeSha, `Lv${id} ${viewport} route hash`);
  invariant(row.naturalClockProbe?.after < row.naturalClockProbe?.before,
    `Lv${id} ${viewport} clock did not advance naturally`);
  const timed = row.naturalTimingReplay;
  invariant(timed?.passed && timed.ticks > 0 && timed.wholeModelReplay
    && timed.exactBombTimersCompared && timed.deferredExitCallbacksCompared,
  `Lv${id} ${viewport} natural timing replay`);
  shaEqual(timed.levelSha256, levelSha, `Lv${id} ${viewport} timing level hash`);
  invariant(row.nativeDrawAudit?.calls > 0 && row.nativeDrawAudit.rotated === 0
    && row.nativeDrawAudit.canvasRotationCalls === 0, `Lv${id} ${viewport} native draw`);
  invariant(row.final?.complete && !row.final.failed && row.final.remainingSeconds > 0
    && (row.final.timeFreezeSeconds ?? 0) === 0, `Lv${id} ${viewport} full natural clear`);
  assert.equal(row.final.levelId, id, `Lv${id} ${viewport} final level ID`);
  assert.equal(row.final.moves, fixture.totalDrags, `Lv${id} ${viewport} route moves`);
  assert.equal(row.steps.length, fixture.totalDrags, `Lv${id} ${viewport} Pointer steps`);
  assert.equal(row.nonClearingDrags, fixture.upperBound, `Lv${id} ${viewport} U`);
  assert.equal(row.storage?.backend, 'MemoryHost', `Lv${id} ${viewport} save backend`);
  assert.equal(row.storage.save.bestStars[String(id)], 3, `Lv${id} ${viewport} saved stars`);
  assert.equal(row.storage.save.bestMoves[String(id)], fixture.totalDrags, `Lv${id} ${viewport} saved moves`);
  const settled = row.settlement, conditions = settled?.starConditions;
  invariant(settled?.status === 'committed' && settled.levelId === id
    && settled.earnedStars === 3 && row.requiredStars === 3,
  `Lv${id} ${viewport} actual three-star settlement`);
  invariant(conditions?.passed && conditions.earnedStars === 3
    && conditions.moveAchieved && conditions.timeAchieved,
  `Lv${id} ${viewport} actual three-star conditions`);
  assert.equal(conditions.moves, fixture.totalDrags, `Lv${id} ${viewport} settled moves`);
  assert.equal(conditions.moveTarget, fixture.starTargets.moveTarget,
    `Lv${id} ${viewport} star move target`);
  assert.equal(conditions.timeTargetSeconds, fixture.starTargets.timeTargetSeconds,
    `Lv${id} ${viewport} star time target`);
  invariant(conditions.elapsedSeconds <= fixture.starTargets.timeTargetSeconds,
    `Lv${id} ${viewport} elapsed time above star target`);
  return {
    viewport,
    reportPath,
    reportSha256: reportSha,
    routeSha256: routeSha,
    naturalElapsedSeconds: timed.activeSeconds,
    settlementElapsedSeconds: conditions.elapsedSeconds,
    earnedStars: settled.earnedStars,
    memoryHostBestMoves: row.storage.save.bestMoves[String(id)],
  };
}
async function validate(args) {
  const lock = verifyRulesLock();
  invariant(lock.ok, `Rules lock failed:\n${lock.errors.join('\n')}`);
  const [staticAudit, sourceReview, isolated, fixture, sourceFirst, sourceSecond, api] = await Promise.all([
    readJson(inputs.static), readJson(inputs.source), readJson(inputs.isolated), readJson(inputs.route),
    readJson(inputs.sourceFirst), readJson(inputs.sourceSecond), currentLevels(),
  ]);
  invariant(staticAudit.passed && staticAudit.productionBoundary?.passed
    && staticAudit.productionBoundary.levelCount === 200
    && staticAudit.productionBoundary.lastId === 200
    && staticAudit.productionBoundary.rejects201,
  'Static audit or production boundary failed');
  assert.equal(isolated.productionBoundary?.campaignLevelCount, 200,
    'Isolated record production boundary');
  assert.equal(isolated.productionBoundary?.productionLevelsChanged, false,
    'Isolated record production change');
  assert.equal(api.LEVELS.length, 200, 'Current production LEVELS boundary');
  assert.throws(() => api.getLevelStrict(201), undefined, 'Lv201 must stay outside production lookup');
  exactIds(api.FORMAL_ISOLATED_201_210_LEVELS, 'Current isolated LevelSpecs');
  exactIds(staticAudit.levels, 'Static audit');
  exactIds(sourceReview.levels, 'Source review');
  exactIds(isolated.levels, 'Isolated formal record');
  assert.deepEqual(Object.keys(fixture.levels).map(Number).sort((a, b) => a - b), ids, 'Route fixture IDs');
  assert.deepEqual(sourceFirst.levels.map(row => row.level ?? row.id), ids.slice(0, 5), 'Source first IDs');
  assert.deepEqual(sourceSecond.levels.map(row => row.level ?? row.id), ids.slice(5), 'Source second IDs');
  const sourceVideo = sourceReview.sourceVideo;
  invariant(sourceVideo?.path && sourceVideo.sha256, 'Missing source video binding');
  for (const [label, expected] of [
    ['static audit', staticAudit.sourceVideoSha256],
    ['first source extract', sourceFirst.sourceVideo?.sha256],
    ['second source extract', sourceSecond.sourceVideo?.sha256],
  ]) shaEqual(expected, sourceVideo.sha256, `${label} video SHA`);
  assert.equal(resolve(sourceFirst.sourceVideo.path), resolve(sourceVideo.path), 'First source video path');
  assert.equal(resolve(sourceSecond.sourceVideo.path), resolve(sourceVideo.path), 'Second source video path');
  shaEqual(await videoSha(sourceVideo.path), sourceVideo.sha256, 'Actual local source video SHA');
  const currentAssetCount = await validateAssets(staticAudit.levels);
  const reportInputs = await Promise.all(args.reports.map(async path => {
    const report = await readJson(path);
    return { path, report, sha256: await fileSha(path), viewport: checkBrowserReport(report, path) };
  }));
  for (const input of reportInputs) for (const drift of input.report.currentWorkspaceDrift) {
    const snapshot = await readFile(localPath(resolve(input.report.sourceSnapshot, drift.path)), 'utf8');
    const reviewed = drift.path === 'src/core/formal211to220Data.ts'
      ? inspectDisjoint211to220Data(drift.path, snapshot)
      : inspectDisjoint221to230Data(drift.path, snapshot);
    invariant(reviewed.verifiedPureData && reviewed.disjointScope,
      `${input.path}: current unrelated data no longer meets strict AST contract`);
  }
  // A PASS produced from a private snapshot is useful only while the reviewed
  // level data, route and runtime inputs remain byte-identical to every run.
  const criticalBindings = [
    'src/core/formal201to210Data.ts',
    'src/core/PuzzleModel.ts',
    'src/game/ColorEscapeGame.ts',
    'src/game/countdownWarning.ts',
    'tools/continue201-210/pointer/disjoint-data-audit.mjs',
    inputs.route,
  ];
  for (const file of criticalBindings) {
    const current = await fileSha(file);
    for (const input of reportInputs) {
      shaEqual(input.report.bindings?.[file], current,
        `${input.path}: current source binding changed for ${file}`);
    }
  }
  const browserRows = new Map();
  for (const input of reportInputs) for (const row of input.report.rows) {
    invariant(ids.includes(row.id), `${input.path}: out-of-batch Lv${row.id}`);
    const key = `${row.id}:${input.viewport}`;
    invariant(!browserRows.has(key), `Duplicate browser evidence for ${key}`);
    browserRows.set(key, { ...input, row });
  }
  assert.equal(browserRows.size, ids.length * viewports.length,
    'Every level needs exactly one report on each viewport');
  const inputsSha = Object.fromEntries(await Promise.all(
    Object.entries(inputs).map(async ([key, path]) => [key, { path, sha256: await fileSha(path) }]),
  ));
  const floorCache = new Map();
  const levels = [];
  for (const [index, id] of ids.entries()) {
    const level = api.FORMAL_ISOLATED_201_210_LEVELS[index];
    const staticRow = staticAudit.levels[index], reviewRow = sourceReview.levels[index];
    const isolatedRow = isolated.levels[index], route = fixture.levels[String(id)];
    const rawLevelSha256 = objectSha(level), canonicalLevelSha256 = canonicalSha(level);
    assert.equal(level.id, id, `Lv${id} source order`);
    assert.equal(level.difficulty, rhythm[index], `Lv${id} difficulty rhythm`);
    for (const [label, actual, expected] of [
      ['static raw', staticRow.rawLevelSha256, rawLevelSha256],
      ['static canonical', staticRow.levelSha256, canonicalLevelSha256],
      ['isolated raw', isolatedRow.levelSha256, rawLevelSha256],
      ['isolated canonical', isolatedRow.currentCanonicalLevelSha256
        ?? isolatedRow.canonicalProofLevelSha256, canonicalLevelSha256],
      ['source review canonical', reviewRow.currentCanonicalLevelSha256, canonicalLevelSha256],
    ]) shaEqual(actual, expected, `Lv${id} ${label}`);
    invariant(staticRow.staticPassed && staticRow.failures.length === 0,
      `Lv${id} static audit status`);
    for (const gate of ['opening', 'hidden', 'adjacency', 'generatorQueue', 'mechanism', 'nativeArt']) {
      invariant(staticRow.checks[gate]?.passed, `Lv${id} ${gate} static gate`);
    }
    invariant(reviewRow.sourceParity === 'NOT_CLAIMED'
      && reviewRow.sourceUnknowns?.length > 0 && reviewRow.knownDesignDifferences?.length > 0,
    `Lv${id} source UNKNOWN/adaptation review`);
    invariant(staticRow.source.sourceParityStatus.startsWith('NOT_CERTIFIED')
      && staticRow.source.documentedDifferences?.length > 0,
    `Lv${id} source parity claim`);
    const [min, max] = bands[rhythm[index]];
    assert.equal(route.lowerBound, isolatedRow.lowerBound, `Lv${id} L fixture`);
    assert.equal(route.upperBound, isolatedRow.upperBound, `Lv${id} U fixture`);
    assert.equal(route.starTargets.moveTarget, isolatedRow.starTargets.moveTarget,
      `Lv${id} star move target`);
    assert.equal(route.starTargets.timeTargetSeconds, isolatedRow.starTargets.timeTargetSeconds,
      `Lv${id} star time target`);
    invariant(Array.isArray(route.route) && route.route.length === route.totalDrags,
      `Lv${id} full route length`);
    invariant(route.lowerBound >= min && route.lowerBound <= route.upperBound
      && route.upperBound <= max, `Lv${id} L/U outside difficulty band`);
    invariant(route.totalDrags <= route.starTargets.moveTarget,
      `Lv${id} route cannot meet star move target`);
    const binding = staticRow.evidenceBinding;
    invariant(binding.route.valid && binding.route.complete && binding.route.error === null,
      `Lv${id} model route not complete`);
    assert.equal(binding.route.totalDrags, route.totalDrags, `Lv${id} model total drags`);
    assert.equal(binding.route.repositionDrags, route.upperBound, `Lv${id} model U`);
    const floorPath = binding.freshFloorPath;
    if (!floorCache.has(floorPath)) floorCache.set(floorPath, await readJson(floorPath));
    const floor = floorRecord(floorCache.get(floorPath), id), result = floor?.freshResult ?? floor?.result;
    invariant(result?.status === 'threshold-proven' && result.thresholdProven,
      `Lv${id} fresh lower bound not proven`);
    shaEqual(result.sourceLevelSha256, canonicalLevelSha256, `Lv${id} fresh floor object`);
    if (floor.currentLevelSha256) shaEqual(floor.currentLevelSha256, canonicalLevelSha256,
      `Lv${id} fresh floor row object`);
    if (floor.sourceLevelRawSha256) shaEqual(floor.sourceLevelRawSha256, rawLevelSha256,
      `Lv${id} fresh floor raw object`);
    assert.equal(result.floor, route.lowerBound, `Lv${id} fresh L`);
    const pointer = viewports.map(viewport => {
      const browser = browserRows.get(`${id}:${viewport}`);
      invariant(browser, `Missing Lv${id} ${viewport} browser evidence`);
      return checkBrowserRow(browser.row, level, route, viewport, browser.path, browser.sha256);
    });
    levels.push({
      schemaVersion: 1, id, status: 'FORMAL_DATA_ACCEPTED',
      rawLevelSha256, canonicalLevelSha256, difficulty: rhythm[index],
      L: result.floor, U: route.upperBound,
      routeMoves: route.totalDrags, starMoves: route.starTargets.moveTarget,
      starTimeSeconds: route.starTargets.timeTargetSeconds,
      sourceParity: 'NOT_CLAIMED_AUTHORED_ADAPTATION_WITH_UNKNOWNS',
      evidence: {
        sourceVideoSha256: sourceVideo.sha256.toLowerCase(),
        sourceReview: inputs.source,
        sourceExtract: id <= 205 ? inputs.sourceFirst : inputs.sourceSecond,
        staticAudit: inputs.static,
        isolatedRecord: inputs.isolated,
        freshLowerBound: { path: floorPath, sha256: await fileSha(floorPath) },
        completeRoute: { ...inputsSha.route, routeSha256: canonicalSha(route.route) },
        pointer,
      },
      productionCampaignIntegrated: false, releaseApproved: false,
    });
  }
  const aggregate = {
    schemaVersion: 1, status: 'FORMAL_DATA_ACCEPTED', activeRuleVersion: lock.activeVersion,
    ids, levelCount: ids.length, sourceVideo: {
      path: sourceVideo.path, sha256: sourceVideo.sha256.toLowerCase(),
      sourceParityCertified: false,
    },
    currentNativeArtFilesVerified: currentAssetCount,
    inputEvidence: inputsSha,
    browserReports: reportInputs.map(({ path, sha256, viewport, report }) => ({
      path, sha256, viewport, ids: report.requestedIds,
    })).sort((a, b) => a.viewport.localeCompare(b.viewport) || a.path.localeCompare(b.path)),
    levels: levels.map(({ id, rawLevelSha256, canonicalLevelSha256, difficulty, L, U,
      routeMoves, starMoves, starTimeSeconds, evidence }) => ({
      id, rawLevelSha256, canonicalLevelSha256, difficulty, L, U,
      routeMoves, starMoves, starTimeSeconds,
      evidence: { path: `${outputDir}/level-${id}.json`, pointer: evidence.pointer },
    })),
    productionCampaignIntegrated: false, productionBoundary: 200, releaseApproved: false,
  };
  return { aggregate, levels };
}
async function persist({ aggregate, levels }) {
  const files = new Map(levels.map(level => [
    `${outputDir}/level-${level.id}.json`, `${JSON.stringify(level, null, 2)}\n`,
  ]));
  files.set(`${outputDir}/aggregate.json`, `${JSON.stringify(aggregate, null, 2)}\n`);
  // Validate every existing output before writing any file. Re-runs are idempotent;
  // changed accepted evidence needs a new review instead of silent replacement.
  for (const [path, content] of files) {
    const previous = await readFile(localPath(path), 'utf8').catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    invariant(previous === null || previous === content, `Refusing to overwrite changed acceptance record: ${path}`);
  }
  for (const [path, content] of files) {
    await mkdir(dirname(localPath(path)), { recursive: true });
    await writeFile(localPath(path), content, { flag: 'wx' }).catch(async error => {
      if (error.code !== 'EEXIST') throw error;
      assert.equal(await readFile(localPath(path), 'utf8'), content,
        `Acceptance record changed during write: ${path}`);
    });
  }
}

try {
  const args = parseArgs(process.argv.slice(2));
  const accepted = await validate(args);
  if (!args.checkOnly) await persist(accepted);
  console.log(JSON.stringify({
    status: 'FORMAL_DATA_ACCEPTED', checkedOnly: args.checkOnly,
    levels: accepted.levels.length, output: args.checkOnly ? null : `${outputDir}/aggregate.json`,
    productionBoundary: 200, releaseApproved: false,
  }));
} catch (error) {
  console.error(`Formal 201–210 adoption refused: ${error.stack ?? error}`);
  process.exitCode = 1;
}
