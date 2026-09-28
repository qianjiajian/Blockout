import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {loadApi, geometry} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditSpatial} from '../../remake91to100-v146.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

const root = 'deliverables/remake31-200-v145-20260924/batches/lv051-060';
const candidateFile = `${root}/root54/enriched54-1790316779122.json`;
const sourceFile = `${root}/root54/source-review54-1790316572356.json`;
const stageFile = `${root}/root54/stages-check54-1790316788241.json`;
const proofFile = `${root}/root54/continued-proof54-1790317873112-3.json`;
const pointerFile = `${root}/pointer-isolated-1790317916190/report.json`;
const baselineFile = `${root}/../../baseline.json`;
const truthFile = 'deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';

const lock = verifyRulesLock();
assert.equal(lock.ok, true, 'rules lock must pass before review');
assert.equal(lock.activeVersion, '1.51.0');
const {api} = await loadApi();
const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const candidate = read(candidateFile);
const source = read(sourceFile);
const stage = read(stageFile);
const proof = read(proofFile);
const pointer = read(pointerFile);
const baseline = read(baselineFile);
const baselineRow = baseline.levels.find(row => row.level.id === 54);
assert(baselineRow, 'baseline level 54 missing');

assert.equal(candidate.ruleVersion, '1.51.0');
assert.equal(candidate.sourceSha256, digest(source));
assert.deepEqual(candidate.sourceReview, source);
assert.equal(candidate.levelSha256, digest(candidate.level));
assert.equal(candidate.routeSha256, digest(candidate.drags));
assert.equal(digest(fs.readFileSync(truthFile)), source.truthSha256);
assert(fs.existsSync(source.video), `source video missing: ${source.video}`);
for (const frame of source.frames) {
  assert(fs.existsSync(frame.path), `source frame missing: ${frame.path}`);
  assert.equal(digest(fs.readFileSync(frame.path)), frame.sha256, `frame hash drift: ${frame.path}`);
}
assert.equal(source.unknowns.length, 0);

// Preserve the immutable geometry, identity, time, reward and actual star targets.
assert.deepEqual(geometry(candidate.level), baselineRow.geometry);
for (const key of ['id', 'name', 'timeSeconds', 'reward', 'mechanismRules']) {
  assert.deepEqual(candidate.level[key], baselineRow.level[key], `baseline field drift: ${key}`);
}
assert.deepEqual(api.levelStarTargets(candidate.level), baselineRow.starTargets);
assert.equal(candidate.level.parMoves, baselineRow.level.parMoves);
assert.equal(candidate.level.preservedMoveTarget, baselineRow.starTargets.moveTarget);

const areas = {SINGLE: 1, H2: 2, V2: 2, H3: 3, V3: 3, L3: 3, SQ2: 4, CROSS5: 5};
const expectedShape = {SINGLE: 1, H2: 8, V2: 2, H3: 9, V3: 3, L3: 4, SQ2: 7, CROSS5: 12};
const sourceStages = [['opening', source.opening], ['hidden5', source.hidden5], ['hidden8', source.hidden8], ['hidden13', source.hidden13], ['hidden21', source.hidden21]];
const changedSourceIds = new Set(['13-yellow', '13-green', '13-purple']);
const mappedIds = new Set();
const mappingRows = [];
for (const [stageName, entries] of sourceStages) {
  for (const item of entries) {
    const block = candidate.level.blocks.find(value => value.id === `s54-${item.sourceId}`);
    assert(block, `missing mapped block: ${item.sourceId}`);
    assert(!mappedIds.has(block.id), `duplicate mapping: ${block.id}`);
    mappedIds.add(block.id);
    assert.equal(block.color, item.color, `color drift: ${item.sourceId}`);
    assert.equal(block.shape.length, areas[item.kind], `area drift: ${item.sourceId}`);
    assert.equal(block.frozen ?? 0, item.frozen ?? 0, `ice value drift: ${item.sourceId}`);
    assert.deepEqual(block.layers ?? [block.color], item.layers ?? [item.color], `layer drift: ${item.sourceId}`);
    assert.equal(block.movementAxis ?? null, item.movementAxis ?? null, `axis drift: ${item.sourceId}`);
    const expectedShutter = stageName === 'opening' ? undefined : `s54-cover${stageName.slice('hidden'.length)}`;
    assert.equal(block.shutterId, expectedShutter, `shutter stage drift: ${item.sourceId}`);
    const match = api.matchFormalBlockShape(block.shape, 'native-only');
    assert(match && match.quarterTurns === 0, `non-native-or-rotated shape: ${item.sourceId}`);
    if (changedSourceIds.has(item.sourceId)) assert([3, 9].includes(match.shapeId), `unexpected adapted shape: ${item.sourceId}`);
    else assert.equal(match.shapeId, expectedShape[item.kind], `shape drift: ${item.sourceId}`);
    mappingRows.push({sourceId: item.sourceId, candidateId: block.id, stage: stageName, sourceKind: item.kind, shapeId: match.shapeId, area: block.shape.length, color: block.color, frozen: block.frozen ?? 0, layers: block.layers ?? [block.color], movementAxis: block.movementAxis ?? null});
  }
}
assert.equal(mappingRows.length, 26);
assert.equal(mappedIds.size, 26);
assert.equal(candidate.sourceAdaptation.sourceBodies, 26);
assert.equal(candidate.sourceAdaptation.designBodies, 30);
assert.equal(candidate.level.blocks.length, 30);
assert.equal(candidate.sourceAdaptation.sourceIrregularBodies, 6);
assert.equal(candidate.sourceAdaptation.designIrregularBodies, 3);

assert.deepEqual(candidate.level.gates.map(g => [g.color, g.frozen ?? 0]).sort(), source.gates.toSorted());
assert.deepEqual(candidate.level.shutters.map(s => [s.count, s.width * s.height]).sort((a, b) => a[0] - b[0]), source.curtains.map(s => [s.count, s.area]).sort((a, b) => a[0] - b[0]));
const additions = candidate.level.blocks.filter(block => block.id.startsWith('s54-fill-'));
assert.equal(additions.length, 4);
assert(additions.every(block => block.shape.length === 1 && block.shutterId === 's54-cover21' && block.frozen === undefined && block.layers === undefined && block.movementAxis === undefined));
assert.deepEqual(additions.map(block => block.color).sort(), ['blue', 'purple', 'red', 'yellow']);

// Independently re-run the bounded native-art tiling check instead of trusting the old certificate.
const nativeTriominoes = api.FORMAL_BLOCK_SHAPES.filter(shape => shape.cells.length === 3);
assert.deepEqual(nativeTriominoes.map(shape => shape.shapeId), [3, 4, 9]);
const cells = id => api.FORMAL_BLOCK_SHAPES.find(shape => shape.shapeId === id).cells;
const variants = {L3: [cells(4)], BAR3: [cells(3), cells(9)], H3: [cells(9)], V2: [cells(2)], SINGLE: [cells(1)]};
const exactCover = (specs, width, height) => {
  const rows = [];
  for (let piece = 0; piece < specs.length; piece++) for (const shape of variants[specs[piece].kind]) {
    const sw = 1 + Math.max(...shape.map(point => point[0]));
    const sh = 1 + Math.max(...shape.map(point => point[1]));
    for (let y = 0; y + sh <= height; y++) for (let x = 0; x + sw <= width; x++) rows.push({piece, sourceId: specs[piece].sourceId, x, y, shape, cols: [width * height + piece, ...shape.map(([dx, dy]) => x + dx + (y + dy) * width)]});
  }
  let nodes = 0;
  const walk = (active, remaining) => {
    nodes++;
    if (!remaining.length) return [];
    let choice;
    for (const column of remaining) {
      const matching = active.filter(row => row.cols.includes(column));
      if (!choice || matching.length < choice.length) choice = matching;
      if (!choice.length) return null;
    }
    for (const row of choice) {
      const taken = new Set(row.cols);
      const rest = walk(active.filter(candidateRow => candidateRow.cols.every(column => !taken.has(column))), remaining.filter(column => !taken.has(column)));
      if (rest) return [row, ...rest];
    }
    return null;
  };
  const solution = walk(rows, Array.from({length: width * height + specs.length}, (_, index) => index));
  return {width, height, nodes, tilingExists: solution !== null, layout: solution?.map(({cols, piece, ...row}) => row) ?? null};
};
const source13 = source.hidden13.map(item => ({...item, kind: ['13-yellow', '13-green'].includes(item.sourceId) ? 'BAR3' : item.kind}));
const originalTiling = [[3, 7], [7, 3]].map(([width, height]) => exactCover(source13, width, height));
const adaptedTiling = [[3, 7], [7, 3]].map(([width, height]) => exactCover(source13.map(item => item.sourceId === '13-purple' ? {...item, kind: 'BAR3'} : item), width, height));
assert(originalTiling.every(result => !result.tilingExists));
assert(adaptedTiling.every(result => result.tilingExists));
const witness = source.nativeTilingCertificate.oneExtraSubstitution;
const witnessCells = witness.layout.flatMap(block => block.shape.map(([x, y]) => [x + block.x, y + block.y]));
assert.equal(new Set(witnessCells.map(point => point.join(','))).size, 21);
assert(witnessCells.every(([x, y]) => x >= 0 && x < witness.width && y >= 0 && y < witness.height));

const spatial = auditSpatial(candidate.level, api);
assert(spatial.passed && spatial.opening.passed && spatial.hidden.passed && spatial.spans.passed);
assert.equal(spatial.opening.coveredCells, spatial.opening.playableCells);
assert(spatial.hidden.regions.every(region => region.coveredCells === region.regionCells && region.missingCells === 0));
const art = api.auditCandidateBlockArt(candidate.level);
assert(art.passed && art.issues.length === 0);
const replay = api.replayRevisedRoute(candidate.level, candidate.drags);
assert(replay.valid && replay.complete);
assert.equal(replay.nonClearingDrags, 13);

assert.equal(stage.candidate, candidateFile);
assert.equal(stage.levelSha256, candidate.levelSha256);
assert.equal(stage.routeSha256, candidate.routeSha256);
assert.equal(stage.sourceEvidenceHashesValid, true);
assert.equal(stage.audit.passed, true);
assert.equal(proof.candidate, candidateFile);
assert.equal(proof.candidateSha256, candidate.levelSha256 ? digest(fs.readFileSync(candidateFile)) : null);
assert.equal(proof.binding.levelSha256, candidate.levelSha256);
assert.equal(proof.result.status, 'threshold-proven');
assert.equal(proof.result.thresholdProven, true);
assert.equal(proof.result.floor, 11);
assert.equal(proof.result.pendingQueueRecords, 0);
assert.equal(proof.result.lowestQueuedCost, null);
assert.equal(proof.result.termination, 'below-threshold-exhausted');
assert.equal(pointer.status, 'PASS');
const pointerRow = pointer.rows.find(row => row.id === 54);
assert(pointerRow);
assert.equal(pointerRow.levelSha256, candidate.levelSha256);
assert.equal(pointerRow.routeSha256, candidate.routeSha256);
assert.equal(pointerRow.candidateObjectIdentity, true);
assert.equal(pointerRow.candidateInjected, true);
assert.equal(pointerRow.oldStarTargetsPreserved, true);
assert.equal(pointer.naturalClock, true);
assert.equal(pointer.clockFrozen, false);
assert.equal(pointer.playerSaveTouched, false);
assert.equal(pointer.releaseApproved, false);

const tilingEvidence = fs.existsSync(candidate.sourceAdaptation.changes[1].certificate)
  ? candidate.sourceAdaptation.changes[1].certificate
  : `${root}/${candidate.sourceAdaptation.changes[1].certificate}`;
assert(fs.existsSync(tilingEvidence), `tiling evidence missing: ${tilingEvidence}`);
const evidenceFiles = [candidateFile, sourceFile, stageFile, proofFile, pointerFile, truthFile, tilingEvidence];
const evidenceHashes = Object.fromEntries(evidenceFiles.map(file => [file, digest(fs.readFileSync(file))]));
const report = {
  status: 'SOURCE_CONTRACT_PASS',
  ruleVersion: '1.51.0',
  reviewedAt: new Date().toISOString(),
  scope: '独立复核54关新候选来源、原向形状/机制属性、隐藏满铺、原三星/棋盘基线及证据绑定；不执行正式LEVELS写入或发布。',
  candidate: candidateFile,
  sourceReview: sourceFile,
  stageProof: stageFile,
  lowerBoundProof: proofFile,
  pointer: pointerFile,
  checks: {
    rulesLock: 'PASS',
    sourceSemanticBinding: 'PASS',
    sourceFrames: {count: source.frames.length, allHashesMatch: true},
    sourceMechanismBodies: 26,
    designBodies: 30,
    numericIceBodies: mappingRows.filter(row => row.frozen > 0).length,
    shellBodies: mappingRows.filter(row => row.layers.length > 1).length,
    axisBodies: mappingRows.filter(row => row.movementAxis).length,
    mappingRows,
    additions: additions.map(block => ({id: block.id, color: block.color, shutterId: block.shutterId})),
    gatesMatch: true,
    shutterCountsAndAreasMatch: true,
    independentTiling: {original: originalTiling.map(({layout, ...result}) => result), adapted: adaptedTiling.map(({layout, ...result}) => result), witnessCells: witnessCells.length},
    spatial: {passed: spatial.passed, openingCovered: spatial.opening.coveredCells, openingPlayable: spatial.opening.playableCells, hiddenRegions: spatial.hidden.regions.map(region => ({id: region.shutterId, regionCells: region.regionCells, coveredCells: region.coveredCells, missingCells: region.missingCells}))},
    nativeArt: {passed: art.passed, issues: art.issues},
    route: {valid: replay.valid, complete: replay.complete, effectiveDrags: replay.effectiveDrags, nonClearingDrags: replay.nonClearingDrags},
    originalBaseline: {geometry: true, identityTimeReward: true, starTargets: baselineRow.starTargets},
    proof: {status: proof.result.status, floor: proof.result.floor, discoveredStates: proof.result.discoveredStates, exploredStates: proof.result.exploredStates, pendingQueueRecords: proof.result.pendingQueueRecords},
    pointer: {status: pointer.status, candidateObjectIdentity: pointerRow.candidateObjectIdentity, candidateInjected: pointerRow.candidateInjected, naturalClock: pointer.naturalClock, releaseApproved: pointer.releaseApproved}
  },
  evidenceHashes,
  conclusion: '54关来源契约与原向适配复核通过；结合L11下界、U13完整路线和隔离Pointer证据，可列入CANDIDATE_PASS，但formalAdopted仍为false且不代表已写入生产LEVELS。'
};
const outDir = `${root}/root54/review54-v151`;
fs.mkdirSync(outDir, {recursive: true});
const outFile = `${outDir}/report.json`;
fs.writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, {flag: 'wx'});
console.log(JSON.stringify({outFile, status: report.status, levelSha256: candidate.levelSha256, routeSha256: candidate.routeSha256, L: proof.result.floor, U: replay.nonClearingDrags, sourceBodies: 26, designBodies: 30}));
