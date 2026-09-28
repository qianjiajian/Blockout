import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { digest, measureDesignFacts, loadPreviewCore } from './revised-preview-validation-v160.mjs';
import { loadMechanismInventory, applyInventoryReview } from './revised-source-inventory.mjs';
import { auditSourceLevel, verifySourceReview } from './audit-revised-generation-inputs.mjs';
import { auditStrictBoardAlignment } from './strict-board-alignment-v170.mjs';
import { auditStrictMechanismAlignment, countIrregularBlockShapes } from './strict-mechanism-alignment-v170.mjs';
import { auditOpeningCoverage } from './revised-opening-coverage.mjs';
import { verifyRulesLock } from './verify-rules-lock.mjs';

export { loadPreviewCore };
export const BASELINE = 'deliverables/revised-preview-v160-2026-09-22T04-06-34-018Z/review.json';
export const BASELINE_SHA = 'ce869178232519ef17371e23695062814b89371249cecf8b67853581ef1f9ac1';
const TRUTH = 'deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';
const DIRECT = '.codex-temp/video-audit-21-30-independent/audit-lv021-030.json';
const MASK_REVIEW = 'docs/level-generation/source-review-lv021-030.json';
const rectangleShapes = new Set(['SINGLE','H2','V2','H3','V3','H4','V4','SQ2','SQ3','RECT2X3','RECT3X2']);
const irregularHistogram = histogram => Object.entries(histogram).reduce((n,[shape,count]) => n + (rectangleShapes.has(shape) ? 0 : count),0);

/** Only the independently reviewed 21–30 scope. Candidate data never supplies source counts. */
export async function loadStrict21to30Catalog(root = process.cwd(), { ruleVersion = '1.7.0' } = {}) {
  const lock = verifyRulesLock({readText:p=>readFileSync(path.resolve(root,p),'utf8')});
  assert(['1.7.0','1.8.0'].includes(ruleVersion), 'Unsupported strict catalog contract');
  assert(lock.ok && lock.activeVersion === ruleVersion, `Active v${ruleVersion} rules lock required`);
  const bindings = {};
  async function read(p, expected) {
    const bytes = await readFile(path.resolve(root,p)), sha256 = digest(bytes);
    if(expected) assert.equal(sha256,expected,`Source drift: ${p}`);
    bindings[p] = {sha256};
    return JSON.parse(bytes);
  }
  const truth = await read(TRUTH), direct = await read(DIRECT);
  assert(direct);
  const inventory = await loadMechanismInventory({root,truthSha256:bindings[TRUTH].sha256,directSha256:bindings[DIRECT].sha256});
  Object.assign(bindings,inventory.bindings);
  const masks = await verifySourceReview(await read(MASK_REVIEW),{root,truthSha256:bindings[TRUTH].sha256});
  for(const row of masks.values()) for(const e of row.evidence) bindings[e.path]={sha256:e.sha256};
  const baseline = await read(BASELINE,BASELINE_SHA);
  const levels=[];
  for(let id=21;id<=30;id++) {
    const record=truth.levels.find(r=>r.level===id), review=inventory.rows.get(id);
    const source=applyInventoryReview(record,review), audit=auditSourceLevel(source), f=audit.immutableSourceContract;
    assert.deepEqual(audit.evidenceGaps,[],`Unknown source Lv${id}`);
    assert.deepEqual(audit.hardConflicts,[],`Source conflict Lv${id}`);
    const board=masks.get(id)?.correctedReferenceBoard ?? record.board;
    const cells=board.source_playable_mask.flatMap((line,y)=>[...line].flatMap((c,x)=>c==='#'?[[x,y]]:[]));
    assert.equal(cells.length,board.playable_cell_count);
    // These zeros have explicit multi-stage video observations, not missing-key defaults.
    for(const family of ['generators','axisBlocks','keyLocks','starBlocks','flipDoors','coloredGrids','bombs','lifts'])
      assert.equal(review.mechanisms[family]?.count,0,`Positive/unknown ${family} requires a new reviewed mapping`);
    assert.equal(f.starExitCount,0); assert.equal(f.starFrozenExitCount,0); assert.equal(f.flipDoorCount,0);
    const facts={width:f.width,height:f.height,opening:f.openingCount,full:f.fullCount,mechanisms:{
      exits:{ordinaryCount:f.ordinaryExitCount,frozenCount:f.frozenExitCount,frozenValues:f.frozenExitValues,starCount:0,starFrozenCount:0,starFrozenValues:[],flipCount:0},
      generators:{count:0,queueLengths:[]},covers:{count:f.covers.count,values:f.covers.values,hiddenBatchCounts:f.covers.hidden_batch_counts},
      numericIce:{count:f.numericIce.count,values:f.numericIce.values,postMeltShellCount:f.numericIce.post_melt_shell ?? 0},shells:{count:f.shells.count},
      axisBlocks:{count:0,axes:[]},keysLocks:{keyCount:0,lockCount:0,lockValues:[]},starBlocks:{count:0},flipDoors:{count:0,initialStates:[]},
      coloredGrid:{cellCount:0,regionCount:0},bombs:{count:0,values:[]},elevators:{count:0,hiddenBatchCounts:[]},
      irregularBlocks:{openingCount:irregularHistogram(f.sourceOpeningShapeHistogram),fullCount:irregularHistogram(f.sourceFullShapeHistogram)},
    }};
    const original=baseline.rows.find(r=>r.levelId===id);
    assert(original?.previewComplete);
    assert.deepEqual(f,original.sourceFacts,`Independent review changed since baseline Lv${id}`);
    const sourceContract={levelId:id,referenceId:`${review.reviewPath}#Lv${id}`,sha256:digest({facts:f,cells,bindings:inventory.bindings}),seed:`strict-preview-v170-${id}`,
      width:f.width,height:f.height,openingBlockCount:f.openingCount,fullBlockCount:f.fullCount,originalMask:cells,
      mechanisms:{generatorQueueLengths:[],axisHorizontalBlocks:0,axisVerticalBlocks:0,keyGroups:[],starBlocks:0,flipDoorInitialOpen:[],coloredGridCellCounts:[],bombSeconds:[],liftCount:0,liftHiddenBatchCounts:[],
        shutterClearCounts:f.covers.values,shutterHiddenBatchCounts:f.covers.hidden_batch_counts,numericIceValues:f.numericIce.values,shellBlocks:f.shells.count,
        exits:[...Array.from({length:f.ordinaryExitCount},()=>({kind:'ordinary',frozen:0,star:false})),...f.frozenExitValues.map(frozen=>({kind:'ordinary',frozen,star:false}))]}};
    levels.push({levelId:id,facts,sourceFacts:f,sourceContract,board:{levelId:id,kind:cells.length===f.width*f.height?'normal':'irregular',width:f.width,height:f.height,cells,evidence:sourceContract.sha256},
      preservedIrregular:{...original.level,evidence:BASELINE_SHA},sourceFrames:review.evidence.filter(e=>/\.(jpg|png)$/.test(e.path)),sourceFrame:review.stableOpeningEvidence ?? review.evidence.find(e=>/\.(jpg|png)$/.test(e.path))?.path});
  }
  return {levels,bindings};
}

export function verifyStrict21to30Candidate(raw, source, api) {
  const level=raw.level,drags=raw.drags ?? raw.result?.drags;
  assert(level && level.id===source.levelId && level.id>=21 && level.id<=30,'Only21–30');
  assert.equal(level.mechanismRules,'revised-2026-09-21-v1.2');
  assert(Array.isArray(drags)&&drags.length,'Full route missing');
  const snapshot=new api.PuzzleModel(level).snapshot();
  const visible=snapshot.blocks.filter(b=>!b.shutterId||snapshot.shutters.find(s=>s.id===b.shutterId)?.revealed);
  const facts=measureDesignFacts(level,api);
  facts.mechanisms.irregularBlocks={openingCount:countIrregularBlockShapes(visible),fullCount:countIrregularBlockShapes(level.blocks)};
  const mechanismAlignment=auditStrictMechanismAlignment({levelId:level.id,facts:source.facts},facts);
  assert(mechanismAlignment.sourceAligned,`Strict mechanisms Lv${level.id}: ${JSON.stringify(mechanismAlignment)}`);
  const boardAlignment=auditStrictBoardAlignment({source:source.board,candidate:level,preservedIrregular:source.preservedIrregular});
  assert(boardAlignment.outlineAligned,`Strict outline Lv${level.id}: ${JSON.stringify(boardAlignment)}`);
  const originalAudit=api.auditRevisedCandidate(level,source.sourceContract);
  const issues=originalAudit.issues.filter(i=>!(source.board.kind==='normal'&&i.code==='source-mask-reused'));
  assert.deepEqual(issues,[],`Spatial/inventory Lv${level.id}`);
  const ice=source.sourceFacts.numericIce;
  let expectedIce;
  if(ice.items.every(i=>typeof i.post_melt_shell==='boolean')) expectedIce=ice.items.map(i=>`${i.value}:${i.post_melt_shell}`).sort();
  else {
    // Lv22/Lv24 have uniform ice values and an evidenced aggregate overlap;
    // their multiset is exact without assigning missing per-carrier booleans.
    assert(new Set(ice.values).size===1&&Number.isInteger(ice.post_melt_shell),'Unknown value/shell pairing');
    expectedIce=ice.values.map((value,i)=>`${value}:${i<ice.post_melt_shell}`).sort();
  }
  const actualIce=level.blocks.filter(b=>b.frozen>0).map(b=>`${b.frozen}:${(b.layers?.length??0)>1}`).sort();
  assert.deepEqual(actualIce,expectedIce,'Ice value/shell colocation');
  for(const g of level.gates) assert(level.blocks.some(b=>(b.layers??[b.color]).includes(g.color)),`Unused gate ${g.id}`);
  const coverage=auditOpeningCoverage(snapshot),art=api.auditCandidateBlockArt(level);
  assert(coverage.passed,`Opening coverage Lv${level.id}: ${JSON.stringify(coverage)}`);
  assert(art.passed,`Formal art Lv${level.id}: ${JSON.stringify(art.issues)}`);
  const replay=api.replayRevisedRoute(level,drags);
  assert(replay.valid&&replay.complete,`Fresh complete replay Lv${level.id}: ${JSON.stringify(replay)}`);
  return {levelId:level.id,title:level.name,level,drags,candidateSha256:digest(level),sourceFacts:source.sourceFacts,sourceContract:source.sourceContract,sourceBoard:source.board,
    sourceNormalizedFacts:source.facts,proposedFacts:facts,mechanismAlignment,boardAlignment,sourceFrame:source.sourceFrame,
    audit:{...originalAudit,issues,passed:true,originalAudit},coverage,art,replay,ruleVersion:'1.7.0',sourceAligned:true,outlineAligned:true,
    pointerReplayValidated:false,previewComplete:false,sourceFirstIntroductionCertified:false,lowerBoundCertified:false,timeValidated:false,releaseApproved:false};
}
