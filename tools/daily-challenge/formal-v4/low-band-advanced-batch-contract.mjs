import assert from 'node:assert/strict';
import path from 'node:path';
import {levelSha256} from '../formal-v2/contract.mjs';
import {HISTORY_LEDGER_ROOTS,realPathWithSuffix} from './native-batch-io.mjs';
import {EARLY_CONSTRUCTION_LEDGER} from './early-frozen-construction-contract.mjs';

export const LOW_BAND_ADVANCED_BATCH_VERSION='fixed-audited-low-band-advanced-batch-v1';
export const LOW_BAND_ADVANCED_BATCH_REVIEW_STATUS='INDEPENDENT_LOW_BAND_ADVANCED_BATCH_PLAN_PASS';
export const LOW_BAND_ADVANCED_BATCH_SLOT_VERSION='daily300-audited-low-band-plan-slot-once-v1';
export const CAPACITY_ADVANCED_STAGES=Object.freeze(['generator','axis-block','layered-lift','colored-grid']);
export const LOW_BAND_ADVANCED_ANCHOR={path:'deliverables/daily-formal-v4-20261008/selection/completed-basic-and-advanced-150-01/index.json',
 sha256:'ecb22b82c7a31575421df66369e8f4d22796d85ffb88ceff4c34abdd0d03ebdc'};
export const LOW_BAND_ADVANCED_ANCHOR_REVIEW={path:'deliverables/daily-formal-v4-20261008/proof/completed150-quick-independent-01.json',
 sha256:'673e83c4fc8f27b5bed40ddaa5c8f3cac034523878de2722ea6c4e611f22b3b3'};

export function exactDescriptor(d){assert(d&&typeof d.path==='string'&&d.path.length>0&&/^[a-f0-9]{64}$/.test(d.sha256??''),'Exact path/SHA required');return d;}
export function lowBandAdvancedStrategy(slot){
 assert([1,2].includes(slot?.difficulty),'Only D1/D2 advanced bases are supported');
 if(CAPACITY_ADVANCED_STAGES.includes(slot.newestMechanism))return 'capacity';
 if(slot.difficulty===1&&['key-lock','flip-door'].includes(slot.newestMechanism))return 'd1-constraint';
 if(slot.difficulty===2&&slot.newestMechanism==='key-lock')return 'd2-key';
 throw Error('Advanced mechanism/band is outside the qualified adapters');
}
export function assertLowBandAdvancedBatchPlan(plan,slots){
 assert.equal(plan.version,LOW_BAND_ADVANCED_BATCH_VERSION);assert.equal(plan.schemaVersion,4);assert.equal(plan.scope,300);
 exactDescriptor(plan.inputSelection);exactDescriptor(plan.visualReview);exactDescriptor(plan.independentActualAudit);
 assert.deepEqual(plan.selectionAnchor,LOW_BAND_ADVANCED_ANCHOR);assert.deepEqual(plan.selectionAnchorReview,LOW_BAND_ADVANCED_ANCHOR_REVIEW);
 assert(Number.isSafeInteger(plan.inputSelectionCount)&&plan.inputSelectionCount>=150&&plan.inputSelectionCount<300);
 assert(Array.isArray(plan.rows)&&plan.rows.length>0&&plan.rows.length<=300-plan.inputSelectionCount);
 assert.equal(plan.maximumBaseAdaptations,plan.rows.length);assert.equal(plan.oneBaseOnePredeterminedSlot,true);
 assert.equal(plan.failedBaseFallbackAllowed,false);assert.equal(plan.bandChangeAfterFailureAllowed,false);
 assert.equal(plan.selectionModified,false);assert.equal(plan.formalReady,false);
 const seenBases=new Set(),seenLevels=new Set(),seenSlots=new Set(),families=new Set();
 for(const [index,row]of plan.rows.entries()){
  assert.equal(row.index,index);exactDescriptor(row.base);assert.deepEqual(row.independentActualAudit,plan.independentActualAudit);
  assert(Number.isSafeInteger(row.sourceLevelId)&&row.sourceLevelId>0);
  for(const k of ['baseLevelSha256','baseRouteSha256','retryIdentitySha256'])assert(/^[a-f0-9]{64}$/.test(row[k]??''),k);
  const expected=slots.find(s=>s.formalId===row.slot?.formalId);assert(expected,'Known exact slot required');assert.deepEqual(row.slot,expected);
  assert.equal(row.construction?.strategy,lowBandAdvancedStrategy(row.slot));
  const band=row.slot.difficulty===1?{lower:16,upper:20}:{lower:21,upper:30};
  assert.deepEqual(row.band,band);assert.equal(row.baseL,band.lower);assert(Number.isSafeInteger(row.baseU)&&row.baseU>=band.lower&&row.baseU<=band.upper);
  if(row.construction.strategy==='d2-key'){
   const c=row.construction.configuration;assert(c?.keyBlockIds?.length===6&&new Set(c.keyBlockIds).size===6);
   assert.deepEqual(c.locks?.map(l=>l.count),[5,6]);assert.equal(new Set(c.locks.map(l=>l.id)).size,2);
   assert(c.locks.every(l=>!c.keyBlockIds.includes(l.id)));
  }else assert.equal(row.construction.configuration,undefined,'Other frozen adapters choose their own finite configuration');
  assert.equal(row.construction.maximumWholeWorlds,10000);assert.equal(row.finalProof.maximumWholeWorlds,10000);
  assert.equal(row.finalProof.providedCompleteRouteRequired,true);assert.equal(row.finalProof.freshOriginalLowerRequired,true);
  assert.equal(row.finalProof.floor,band.lower);assert.equal(row.finalProof.upper,band.upper);
  exactDescriptor(row.priorBaseline);assert.equal(row.priorBaseline.formalId,row.slot.formalId);
  assert.deepEqual(row.visual.review,plan.visualReview);assert.equal(row.visual.decision,'ONE_FAMILY_REPRESENTATIVE');
  assert(typeof row.visual.familyId==='string'&&row.visual.familyId.length>0&&typeof row.visual.reason==='string'&&row.visual.reason.length>0);
  assert(!families.has(row.visual.familyId),'Two members of one visible family cannot silently be assigned');families.add(row.visual.familyId);
  const b=path.resolve(row.base.path);assert(!seenBases.has(b)&&!seenLevels.has(row.retryIdentitySha256)&&!seenSlots.has(row.slot.formalId),'Duplicate physical base or slot');
  seenBases.add(b);seenLevels.add(row.retryIdentitySha256);seenSlots.add(row.slot.formalId);
 }
 return plan;
}

// This check happens before any private fixture creates a directory. Old
// constructors remain unchanged; a junction must not turn a private test into
// a write in any public construction or mathematical namespace.
export async function assertLowBandBatchPrivateNamespace(qualificationOnly,...directories){
 assert.equal(typeof qualificationOnly,'boolean');if(!qualificationOnly)return;
 const roots=await Promise.all([...HISTORY_LEDGER_ROOTS,EARLY_CONSTRUCTION_LEDGER,
  'deliverables/daily-formal-v4-20261008/design/early-prefix-construction-ledger'].map(realPathWithSuffix));
 for(const d of directories){const actual=await realPathWithSuffix(d);
  assert(!roots.some(root=>{const rel=path.relative(root,actual);return rel===''||(!rel.startsWith('..')&&!path.isAbsolute(rel));}),
   'Qualification requires private ledgers outside every public namespace and junction alias');}
}
export function assertPlanRowMatchesBase(row,base){
 assert.equal(base.sourceLevelId,row.sourceLevelId);assert.equal(base.levelSha256,row.baseLevelSha256);
 assert.equal(base.routeSha256,row.baseRouteSha256);assert.equal(base.targetDifficulty,row.slot.difficulty);assert.equal(base.difficulty,row.slot.difficulty);
 assert.equal(base.L,row.baseL);assert.equal(base.U,row.baseU);assert.equal(base.attempt.retryIdentitySha256,row.retryIdentitySha256);
 assert.equal(levelSha256(base.level),row.baseLevelSha256);
}
