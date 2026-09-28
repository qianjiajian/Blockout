import assert from 'node:assert/strict';
import { digest, measureDesignFacts } from './revised-preview-validation-v160.mjs';
import { auditGateSpanLimits } from './revised-gate-span-limits.mjs';
import { auditOpeningCoverage } from './revised-opening-coverage.mjs';
import { auditStrictMechanismAlignment, countIrregularBlockShapes } from './strict-mechanism-alignment-v170.mjs';
import { auditStrictBoardAlignment } from './strict-board-alignment-v170.mjs';

export const EXIT_REPAIR_BASELINE='deliverables/revised-preview-v160-2026-09-22T04-06-34-018Z/review.json';
export const EXIT_REPAIR_BASELINE_SHA='ce869178232519ef17371e23695062814b89371249cecf8b67853581ef1f9ac1';
const withoutGateGeometry = level => ({...level,
  gates:level.gates.map(({side,offset,size,...rest})=>rest),
  flipDoors:(level.flipDoors??[]).map(({side,offset,size,...rest})=>rest)});

function localChecks(raw,api) {
  const {level}=raw,drags=raw.drags??raw.result?.drags;
  assert(level&&level.id>=31&&level.id<=200,'Only Lv31–200');
  assert.equal(level.mechanismRules,'revised-2026-09-21-v1.2');
  assert(Array.isArray(drags)&&drags.length,'Full route required');
  // This renderer replays spatial actions, not a wall-clock bomb witness.
  assert(!level.blocks.some(b=>b.timedBombSeconds!==undefined),'Timed bomb requires a dedicated timed witness');
  const gateSpanAudit=auditGateSpanLimits(level);assert(gateSpanAudit.passed,'Physical gate span cap');
  const originalAudit=api.auditRevisedCandidate(level,{});
  const spatialIssues=originalAudit.issues.filter(i=>i.category!=='source');
  assert.deepEqual(spatialIssues,[],'Runtime/spatial/physical-colour quota');
  const model=new api.PuzzleModel(level);model.start();
  const coverage=auditOpeningCoverage(model.snapshot()),art=api.auditCandidateBlockArt(level);
  assert(coverage.passed,'Stable opening coverage');assert(art.passed,'Formal block art');
  const replay=api.replayRevisedRoute(level,drags);
  assert(replay.valid&&replay.complete,'Fresh complete model replay');
  return{levelId:level.id,title:level.name,level,drags,candidateSha256:digest(level),
    gateSpanAudit,coverage,art,replay,spatialAudit:{issues:spatialIssues,passed:true},
    sourceChecksNotPerformed:originalAudit.issues.filter(i=>i.category==='source'),
    ruleVersion:'1.8.0',exitSubtaskPassed:true,sourceAligned:false,outlineAligned:false,qualifiedPreview:false,
    pointerReplayValidated:false,renderVerified:false,sourceFirstIntroductionCertified:false,
    lowerBoundCertified:false,timeValidated:false,releaseApproved:false};
}

/** Explicitly NOT a full v1.8 candidate certificate. No source issue is forgiven. */
export function verifyExitOnlyRepair(raw,baseline,api) {
  assert.equal(raw.level?.id,baseline.levelId,'Baseline level binding');
  assert.equal(raw.baseline?.path,EXIT_REPAIR_BASELINE);
  assert.equal(raw.baseline?.sha256,EXIT_REPAIR_BASELINE_SHA);
  assert.equal(raw.baseline?.candidateSha256,digest(baseline.level));
  assert.deepEqual(withoutGateGeometry(raw.level),withoutGateGeometry(baseline.level),'Only gate side/offset/size may change');
  for(const key of ['source','comparison','designDifferences'])assert.deepEqual(raw[key],baseline[key],`Preserve unresolved ${key}`);
  assert.equal(raw.qualifiedPreview,false,'Do not relabel an exit-only repair as fully qualified');
  const checked=localChecks(raw,api);
  return{...checked,scope:'exit-repair-only',baseline:raw.baseline,
    source:baseline.source,comparison:baseline.comparison,designDifferences:baseline.designDifferences,
    sourceParityCertified:false,preservation:{onlyGateGeometryChanged:true},
    changes:raw.level.gates.flatMap((g,i)=>digest(g)===digest(baseline.level.gates[i])?[]:[{before:baseline.level.gates[i],after:g}])};
}

/** Source is an independently reviewed, hash-bound input, never candidate-derived. */
export function verifyReviewedLayout(raw,source,api) {
  assert.equal(raw.level?.id,source.levelId,'Independent source level binding');
  assert(source.sourceFrames?.length&&source.sourceFrame,'Reviewed video frames required');
  const checked=localChecks(raw,api),level=raw.level;
  const snapshot=new api.PuzzleModel(level).snapshot();
  const visible=snapshot.blocks.filter(b=>!b.shutterId||snapshot.shutters.find(s=>s.id===b.shutterId)?.revealed);
  const facts=measureDesignFacts(level,api);
  for(const field of ['width','height','opening','full']) {
    assert(Number.isInteger(source.facts?.[field]),`Source ${field} must be known`);
    assert.equal(source.facts[field],facts[field],`Source ${field} mismatch`);
  }
  facts.mechanisms.irregularBlocks={openingCount:countIrregularBlockShapes(visible),fullCount:countIrregularBlockShapes(level.blocks)};
  const mechanismAlignment=auditStrictMechanismAlignment({levelId:level.id,facts:source.facts},facts);
  assert(mechanismAlignment.sourceAligned,`Unresolved/mismatched source: ${JSON.stringify(mechanismAlignment)}`);
  const boardAlignment=auditStrictBoardAlignment({source:source.board,candidate:level,preservedIrregular:source.preservedIrregular});
  assert(boardAlignment.outlineAligned,'Independent source outline');
  const inventoryAudit=api.auditRevisedCandidate(level,source.sourceContract);
  const issues=inventoryAudit.issues.filter(i=>!(source.board.kind==='normal'&&i.code==='source-mask-reused'));
  assert.deepEqual(issues,[],'Full independent source inventory/static checks');
  const ice=source.sourceFacts.numericIce;
  assert(Array.isArray(ice.items)&&ice.items.every(i=>typeof i.post_melt_shell==='boolean'),'Explicit ice/shell pairing');
  assert.deepEqual(level.blocks.filter(b=>b.frozen>0).map(b=>`${b.frozen}:${(b.layers?.length??0)>1}`).sort(),
    ice.items.map(i=>`${i.value}:${i.post_melt_shell}`).sort(),'Ice/shell colocation');
  for(const g of [...level.gates,...(level.flipDoors??[])])assert(level.blocks.some(b=>(b.layers??[b.color]).includes(g.color)),`Unused gate ${g.id}`);
  return{...checked,scope:'reviewed-source-layout',sourceAligned:true,outlineAligned:true,qualifiedPreview:true,
    sourceChecksNotPerformed:[],sourceNormalizedFacts:source.facts,sourceContract:source.sourceContract,
    sourceBoard:source.board,sourceFrame:source.sourceFrame,sourceFrames:source.sourceFrames,
    mechanismAlignment,boardAlignment,proposedFacts:facts,inventoryAudit:{...inventoryAudit,issues,passed:true}};
}
