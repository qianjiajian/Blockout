import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { comparePreviewDesignToSource } from './revised-preview-source-v160.mjs';
import { auditOpeningCoverage } from './revised-opening-coverage.mjs';

export const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
export const digest = value => createHash('sha256').update(typeof value === 'string' || Buffer.isBuffer(value) ? value : JSON.stringify(canonical(value))).digest('hex');
export async function loadPreviewCore() {
  const result = await build({ stdin: { resolveDir: process.cwd(), contents: `
    export {PuzzleModel} from './src/core/PuzzleModel.ts';
    export {auditRevisedCandidate,measureRevisedMechanismInventory} from './src/core/revisedCandidateAudit.ts';
    export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
    export {auditCandidateBlockArt} from './tools/revised-candidate-block-art.mjs';
    export {matchingContinuousExitPortals,choosePortalReleaseCandidate} from './src/game/continuousDrag.ts';` },
    bundle: true, write: false, platform: 'node', format: 'esm', metafile: true });
  const api = await import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
  return { api, inputs: Object.keys(result.metafile.inputs).filter(p => p !== '<stdin>') };
}
const sorted = a => [...a].sort((a,b) => typeof a === 'number' ? a-b : String(a).localeCompare(String(b)));
export function measureDesignFacts(level, api) {
  const m = api.measureRevisedMechanismInventory(level), snapshot = new api.PuzzleModel(level).snapshot();
  const visible = snapshot.blocks.filter(b => !b.shutterId || snapshot.shutters.find(s => s.id === b.shutterId)?.revealed);
  const plain = m.exits.filter(g => !g.star && g.kind !== 'flip');
  const covers = (level.shutters ?? []).filter(s => !s.skin || s.skin === 'shutter');
  const lifts = new Map();
  for(const lift of (level.shutters ?? []).filter(s => s.skin === 'lift')) {
    const key = [lift.x,lift.y,lift.width,lift.height].join(',');
    const batches = lifts.get(key) ?? [];
    batches.push(level.blocks.filter(b => b.shutterId === lift.id).length);
    lifts.set(key,batches);
  }
  return { width: level.width, height: level.height, opening: visible.length, full: level.blocks.length, mechanisms: {
    exits: { ordinaryCount: plain.filter(g => !g.frozen).length, frozenCount: plain.filter(g => g.frozen > 0).length,
      frozenValues: sorted(plain.filter(g => g.frozen > 0).map(g => g.frozen)), starCount: m.exits.filter(g => g.star).length,
      starFrozenCount: m.exits.filter(g => g.star && g.frozen > 0).length, starFrozenValues: sorted(m.exits.filter(g => g.star && g.frozen > 0).map(g => g.frozen)), flipCount: m.flipDoorInitialOpen.length },
    generators: { count: m.generatorQueueLengths.length, queueLengths: sorted(m.generatorQueueLengths) },
    covers: { count: covers.length, values: covers.map(s => s.count), hiddenBatchCounts: covers.map(s => level.blocks.filter(b => b.shutterId === s.id).length) },
    numericIce: { count: m.numericIceValues.length, values: sorted(m.numericIceValues), postMeltShellCount: level.blocks.filter(b => b.frozen > 0 && b.layers?.length > 1).length },
    shells: { count: m.shellBlocks }, axisBlocks: { count: m.axisHorizontalBlocks + m.axisVerticalBlocks,
      axes: sorted([...Array(m.axisHorizontalBlocks).fill('horizontal'), ...Array(m.axisVerticalBlocks).fill('vertical')]) },
    keysLocks: { keyCount: m.keyGroups.reduce((n,g) => n+g.keyCount,0), lockCount: m.keyGroups.reduce((n,g) => n+g.lockCounts.length,0), lockValues: sorted(m.keyGroups.flatMap(g => g.lockCounts)) },
    starBlocks: { count: m.starBlocks }, flipDoors: { count: m.flipDoorInitialOpen.length, initialStates: sorted(m.flipDoorInitialOpen.map(open => open ? 'open' : 'closed')) },
    coloredGrid: { cellCount: m.coloredGridCellCounts.reduce((a,b) => a+b,0), regionCount: m.coloredGridCellCounts.length },
    bombs: { count: m.bombSeconds.length, values: sorted(m.bombSeconds) }, elevators: { count: lifts.size, hiddenBatchCounts: [...lifts.values()] }
  }};
}
function sortableFacts(facts) {
  const result = structuredClone(facts);
  for(const [name,mechanism] of Object.entries(result.mechanisms)) for(const [key,value] of Object.entries(mechanism)) {
    if(name === 'covers' || name === 'elevators') continue;
    if(Array.isArray(value) && value.every(v => v !== null && typeof v !== 'object')) mechanism[key] = sorted(value);
  }
  const c = result.mechanisms.covers;
  if(Array.isArray(c.values) && Array.isArray(c.hiddenBatchCounts) && c.values.length === c.hiddenBatchCounts.length) {
    const pairs = c.values.map((v,i) => [v,c.hiddenBatchCounts[i]]).sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    c.values = pairs.map(p => p[0]); c.hiddenBatchCounts = pairs.map(p => p[1]);
  }
  if(Array.isArray(result.mechanisms.elevators.hiddenBatchCounts)) result.mechanisms.elevators.hiddenBatchCounts.sort((a,b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return result;
}
function sourceMask(source) {
  const rows = source.records.board?.source_playable_mask;
  return Array.isArray(rows) && rows.every(r => typeof r === 'string') ? rows.flatMap((r,y) => [...r].flatMap((c,x) => c === '#' ? [[x,y]] : [])) : undefined;
}

/** This is a preview verifier, not a source-parity or release certificate.
 * Runtime/layout checks stay strict. Source gaps and authorized design deltas
 * are kept separately, never filled from candidate measurements as evidence.
 */
export function verifyPreviewCandidate(raw, source, api) {
  const level = raw.level, drags = raw.drags ?? raw.result?.drags;
  assert(level && level.id === source.levelId && level.id >= 31 && level.id <= 200);
  assert.equal(level.mechanismRules, 'revised-2026-09-21-v1.2');
  assert(Array.isArray(drags) && drags.length, `No complete route Lv${level.id}`);
  const facts = sortableFacts(measureDesignFacts(level, api)), normalizedSource = { ...source, facts: sortableFacts(source.facts) };
  const initialComparison = comparePreviewDesignToSource(normalizedSource, facts);
  const reasons = { ...(raw.adjustmentReasons ?? {}) };
  for(const difference of initialComparison.differences) {
    if(!reasons[difference.field]) {
      const parent = Object.keys(raw.adjustmentReasons ?? {}).filter(key => difference.field.startsWith(`${key}.`) || difference.field.startsWith(`${key}[`)).sort((a,b) => b.length-a.length)[0];
      if(parent) reasons[difference.field] = raw.adjustmentReasons[parent];
    }
    if(difference.status === 'source-unknown' && difference.designValue !== null && !reasons[difference.field]) {
      reasons[difference.field] = '竞品此字段未核定；本轮预览设计假设，不作为竞品事实。';
    }
  }
  const comparison = comparePreviewDesignToSource(normalizedSource, facts, { adjustmentReasons: reasons });
  const missingMeasurements = comparison.missingDesignFields.filter(field => {
    const match = /^(.*)\[(\d+)\]$/.exec(field);
    if(!match) return true;
    const lengthChange = comparison.rows.find(d => d.field === `${match[1]}.length`);
    return !(lengthChange?.status === 'changed' && lengthChange.reason
      && Number.isInteger(lengthChange.designValue) && Number(match[2]) >= lengthChange.designValue
      && lengthChange.designValue < lengthChange.sourceValue && reasons[field]);
  });
  assert.deepEqual(missingMeasurements, [], `Incomplete proposed measurements Lv${level.id}`);
  assert.deepEqual(comparison.unexplainedFields, [], `Unexplained source changes Lv${level.id}`);
  if(source.facts.width !== null) assert.equal(level.width, source.facts.width, 'Known source width must remain');
  if(source.facts.height !== null) assert.equal(level.height, source.facts.height, 'Known source height must remain');
  // Feed only independently sourced known facts. Incomplete inventory is NOT
  // replaced by candidate-derived inventory: the result is explicitly partial.
  const audit = api.auditRevisedCandidate(level, { levelId: level.id,
    referenceId: `${source.bindings[0]?.path ?? 'source-unavailable'}#${level.id}`, sha256: source.bindings[0]?.sha256 ?? digest(source),
    seed: raw.seed ?? `preview-v160-${level.id}`, width: source.facts.width, height: source.facts.height,
    openingBlockCount: source.facts.opening, fullBlockCount: source.facts.full, originalMask: sourceMask(source) });
  const sourceScopeCodes = new Set(['incomplete-source-inventory','missing-source-number','originality-unverified']);
  const changedFields = new Set(comparison.differences.filter(d => d.status === 'changed' && d.reason).map(d => d.field));
  const layoutIssues = audit.issues.filter(issue => {
    if(sourceScopeCodes.has(issue.code)) return false;
    if(issue.code === 'opening-count-mismatch' && changedFields.has('opening')) return false;
    if(issue.code === 'full-count-mismatch' && changedFields.has('full')) return false;
    return true;
  });
  assert.deepEqual(layoutIssues, [], `Runtime/spatial hard gate Lv${level.id}`);
  const coverage = auditOpeningCoverage(new api.PuzzleModel(level).snapshot());
  assert(coverage.passed, `Opening fill Lv${level.id}: ${JSON.stringify(coverage)}`);
  const art = api.auditCandidateBlockArt(level);
  assert(art.passed, `Missing block art Lv${level.id}: ${JSON.stringify(art.issues)}`);
  const replay = api.replayRevisedRoute(level, drags);
  assert(replay.valid && replay.complete, `Full fresh replay Lv${level.id}: ${JSON.stringify(replay)}`);
  return { levelId: level.id, title: level.name, level, drags, candidateSha256: digest(level), source,
    proposedFacts: facts, comparison, designDifferences: raw.designDifferences ?? [],
    audit: { passed: true, scope: 'runtime + spatial safety; source parity reported separately', issues: layoutIssues,
      originalAudit: audit, unresolvedSourceChecks: audit.issues.filter(i => sourceScopeCodes.has(i.code)), measurements: audit.measurements },
    coverage, art, replay, ruleVersion:'1.6.0', sourceParityCertified:false, sourceFirstIntroductionCertified:false,
    lowerBoundCertified:false, difficultyAssessed:false, timeValidated:false, pointerReplayValidated:false, releaseApproved:false };
}
