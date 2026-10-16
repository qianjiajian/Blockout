/*
 * Finite, isolated audit for the mainline-template league candidates 34..66.
 *
 * The report deliberately keeps witness, lower-bound and score-block evidence
 * separate. A complete model replay alone is never promoted to a formal
 * candidate: the difficulty floor must be certified by the relaxed graph and
 * every declared score block must be completely removed in the latter half of
 * that same replay. This tool never edits LEVELS, the league selector or the
 * formal registry.
 */
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';

const candidatePath = 'deliverables/league-regeneration-20261005/template/mainline-template-candidates.json';
const outputPath = 'deliverables/league-regeneration-20261005/template/formal-34-66.json';
const candidateText = fs.readFileSync(candidatePath, 'utf8');
const candidates = JSON.parse(candidateText);
const finite = JSON.parse(fs.readFileSync('.tmp-audit34-66.json', 'utf8'));
const highFloor = JSON.parse(fs.readFileSync('.tmp-low3.json', 'utf8'));

const bundle = await build({
  stdin: {
    resolveDir: process.cwd(),
    contents: `export { replayRevisedRoute } from './src/core/revisedLevelSearch.ts';`,
  },
  bundle: true, write: false, platform: 'node', format: 'esm', logLevel: 'silent',
});
const { replayRevisedRoute } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);

const sha256 = value => createHash('sha256').update(value).digest('hex');
const sourceHash = sha256(candidateText);
const range = candidates.entries.filter(entry => entry.index >= 34 && entry.index <= 66);
const finiteByIndex = new Map(finite.map(row => [row.i, row]));
const highByIndex = new Map(highFloor.map(row => [row.i, row]));
const filledRectangle = shape => {
  if (!Array.isArray(shape) || shape.length === 0) return false;
  const cells = new Set(shape.map(([x, y]) => `${x},${y}`));
  const xs = shape.map(([x]) => x), ys = shape.map(([, y]) => y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  return cells.size === shape.length && cells.size === (maxX - minX + 1) * (maxY - minY + 1);
};

const rows = range.map(entry => {
  const finiteRow = finiteByIndex.get(entry.index);
  const highRow = highByIndex.get(entry.index);
  const level = entry.level;
  const expectedFloor = entry.difficulty === 'super' ? 21 : 16;
  const expectedCeiling = entry.difficulty === 'super' ? 30 : 20;
  const route = finiteRow?.r?.drags ?? [];
  const replay = finiteRow?.replay ?? null;
  const exitSteps = new Map();
  route.forEach((drag, index) => {
    if (!drag.exitSide) return;
    const steps = exitSteps.get(drag.blockId) ?? [];
    steps.push(index + 1);
    exitSteps.set(drag.blockId, steps);
  });
  const clearEvents = replay?.clearEvents ?? null;
  const latterHalfThreshold = clearEvents === null ? null : clearEvents / 2;
  const specialEvidence = (entry.specials ?? []).map(blockId => {
    const block = level.blocks.find(candidate => candidate.id === blockId);
    const steps = exitSteps.get(blockId) ?? [];
    const expectedClears = block?.layers?.length ?? 1;
    const completeClearVerified = steps.length >= expectedClears;
    const latterHalf = completeClearVerified && steps.every(step => step > latterHalfThreshold);
    return {
      blockId,
      shapeCells: block?.shape?.length ?? null,
      filledAxisAlignedRectangle: Boolean(block && filledRectangle(block.shape)),
      expectedClears,
      routeSteps: steps,
      completeClearVerified,
      latterHalf,
      scorePoints: latterHalf ? 10 : 0,
    };
  });
  const scoreAudit = {
    status: specialEvidence.length > 0 && specialEvidence.every(evidence => evidence.filledAxisAlignedRectangle && evidence.completeClearVerified && evidence.latterHalf) ? 'PASS' : 'BLOCKED',
    rule: '每个积分色块完整移除后固定+10分；全部积分色块必须在清除事件后半段完成',
    specialEvidence,
    totalScore: specialEvidence.reduce((sum, evidence) => sum + evidence.scorePoints, 0),
  };
  const routeAudit = replay ? {
    status: replay.valid && replay.complete ? 'PASS' : 'BLOCKED',
    valid: replay.valid,
    complete: replay.complete,
    effectiveDrags: replay.effectiveDrags,
    nonClearingDrags: replay.nonClearingDrags,
    clearEvents: replay.clearEvents,
    error: replay.error ?? null,
  } : {
    status: 'BLOCKED', valid: false, complete: false,
    effectiveDrags: null, nonClearingDrags: null, clearEvents: null,
    error: finiteRow?.r?.reasons?.[0] ?? 'finite route search did not return a witness',
  };
  const lowerSource = highRow && highRow.i === entry.index ? highRow.l : finiteRow?.l;
  const lowerAudit = {
    status: lowerSource?.status === 'threshold-proven' ? 'PROVEN' : 'BLOCKED',
    requestedFloor: expectedFloor,
    thresholdProven: lowerSource?.status === 'threshold-proven',
    termination: lowerSource?.termination ?? null,
    exploredStates: lowerSource?.exploredStates ?? null,
    reason: lowerSource?.reasons?.[0] ?? 'no lower-bound result',
  };
  const routeCount = routeAudit.nonClearingDrags;
  const upperAudit = {
    status: Number.isInteger(routeCount) ? 'MEASURED_ROUTE' : 'BLOCKED',
    value: Number.isInteger(routeCount) ? routeCount : null,
    requestedCeiling: expectedCeiling,
    inBand: Number.isInteger(routeCount) && routeCount <= expectedCeiling,
  };
  const formalReady = routeAudit.status === 'PASS' && lowerAudit.status === 'PROVEN' && upperAudit.inBand && scoreAudit.status === 'PASS';
  const lateRectangles = Number.isInteger(clearEvents) ? route.filter((drag, index) => drag.exitSide && index + 1 > clearEvents / 2).map(drag => drag.blockId).filter((id, i, all) => all.indexOf(id) === i).filter(id => filledRectangle(level.blocks.find(block => block.id === id)?.shape ?? [])) : [];
  return {
    index: entry.index,
    levelId: level.id,
    difficulty: entry.difficulty,
    templateSource: entry.templateSource,
    candidateFingerprint: entry.fingerprint,
    candidateLevelSha256: sha256(JSON.stringify(level)),
    formalEligibility: formalReady,
    route: routeAudit,
    ...(routeAudit.status === 'PASS' ? { routeWitness: route } : {}),
    lowerBound: lowerAudit,
    upperBound: upperAudit,
    scoreAudit,
    lateRouteRectangleAlternatives: lateRectangles.slice(0, 3),
    status: formalReady ? 'FORMAL_CANDIDATE_READY' : 'BLOCKED',
    blockedReasons: [
      ...(routeAudit.status !== 'PASS' ? ['route-not-replayed'] : []),
      ...(lowerAudit.status !== 'PROVEN' ? ['lower-bound-not-proven'] : []),
      ...(upperAudit.inBand !== true ? ['upper-band-not-certified'] : []),
      ...(scoreAudit.status !== 'PASS' ? ['score-block-late-clear-not-proven'] : []),
    ],
    finiteBudget: {
      routeMilliseconds: 1200,
      lowerMilliseconds: entry.index === 35 || entry.index === 43 || entry.index === 60 ? 8000 : 1200,
      maxStates: entry.index === 35 || entry.index === 43 || entry.index === 60 ? 400000 : 50000,
      maxTransitions: entry.index === 35 || entry.index === 43 || entry.index === 60 ? 2000000 : 400000,
      noInfiniteRetry: true,
    },
  };
});

const report = {
  status: rows.every(row => row.status === 'FORMAL_CANDIDATE_READY') ? 'FORMAL_CANDIDATES_READY' : 'PARTIAL_FORMAL_CANDIDATES',
  range: [34, 66],
  source: candidatePath,
  sourceSha256: sourceHash,
  generatedAt: new Date().toISOString(),
  acceptedCount: rows.filter(row => row.status === 'FORMAL_CANDIDATE_READY').length,
  blockedCount: rows.filter(row => row.status !== 'FORMAL_CANDIDATE_READY').length,
  finitePolicy: 'Each row received one bounded witness attempt; rows 35/43/60 received one bounded 8-second lower-bound follow-up. No same-object infinite retry or formal adoption was performed.',
  rows,
};
fs.mkdirSync('deliverables/league-regeneration-20261005/template', { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify({ output: outputPath, accepted: report.acceptedCount, blocked: report.blockedCount, sourceSha256: sourceHash }, null, 2));
