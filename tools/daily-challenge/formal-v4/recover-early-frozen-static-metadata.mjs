import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {loadV4Runtime} from './runtime.mjs';
import {loadV4StageContract,auditV4StaticCandidate} from './static-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {compareLayouts,describeLayout} from '../formal-v3/diversity.mjs';
import {realShapeColourChange} from './early-frozen-construction-contract.mjs';
import {readBound,write,sha,exists,checkBindings,checkLedgerSnapshot} from './native-batch-io.mjs';

// Rebind existing, never-solved worlds to the correct STATIC slot schema.
// This file does not import a constructor, colourer, solver or claim function.
const originalD={path:'deliverables/daily-formal-v4-20261008/design/early-frozen-four-construct-01/index.json',sha256:'c1c2365e54c01437e5cfb4f795299d61377685c71404dd9557a6c0392f4b2c76'};
const output='deliverables/daily-formal-v4-20261008/design/early-frozen-four-static-repair-01';
assert(!(await exists(output)));
const bindings={},original=await readBound(originalD,bindings),plan=await readBound(original.plan,bindings);
assert.equal(original.candidates.length,0);assert.equal(original.fixedColourInputs,4);assert.equal(original.publicLedgerClaims,0);
assert.deepEqual(plan.staticSlot,{formalId:880000,stageKey:'basic-combined',difficulty:3});
await checkBindings(plan.bindings);await checkLedgerSnapshot(plan.ledgerSnapshot);
const rt=await loadV4Runtime(),api=await loadV4StageContract();
const s=api.DAILY_CHALLENGE_V3_SLOTS.find(x=>x.stageKey==='basic-combined'&&x.difficulty===3&&x.slot===1);assert(s);
const slot={formalId:s.id,stageKey:s.stageKey,difficulty:s.difficulty,slot:s.slot,newestMechanism:s.newestMechanism};
const correction={reason:'Numeric formalId 880000 plus absent slot/newestMechanism misidentified the static schema; no board field changes.',originalSlot:plan.staticSlot,correctedSlot:slot,sourceConstructionIndex:originalD,physicalWorldsChanged:0,newColourCalls:0,newGameplaySearches:0,newPublicClaims:0,notStageAdmission:true};
const rows=[],formed=new Map(),candidates=[],attempts=[];
await fs.mkdir(output,{recursive:false});
for(const a of original.attempts){
 const b=await readBound(a.constructionEvidence,bindings),bp=plan.blueprints.find(x=>x.recipeId===a.recipeId),attempt={...a};assert(bp);
 const previous=formed.get(bp.sourceLevelId)??[];
 if(b.plain?.level)formed.set(bp.sourceLevelId,[...previous,designFingerprints(b.plain.level)]);
 if(!b.ok){attempts.push(attempt);continue;}
 assert.equal(a.rejection,'full-static-original-ice');assert.deepEqual(a.staticAudit.issues.toSorted(),['unknown-daily-300-slot','formal-id-stage-difficulty-mismatch','stage-not-in-mechanism-guide'].toSorted());
 assert.equal(b.levelSha256,levelSha256(b.level));assert.equal(b.searchPerformed,false);assert.equal(b.prefixAudit.valid,true);
 const staticAudit=await auditV4StaticCandidate(rt,{...slot,sourceLevelId:bp.sourceLevelId,level:b.level});assert(staticAudit.passed,JSON.stringify(staticAudit.issues));
 const f=designFingerprints(b.level);assert(realShapeColourChange(bp.failedParent.fingerprints,f));for(const p of previous)assert(realShapeColourChange(p,f));
 const similarity=Math.max(0,...candidates.map(x=>compareLayouts(x.packet.level,b.level).footprintSimilarity));
 attempt.originalStaticAudit=a.staticAudit;attempt.originalRejection=a.rejection;attempt.staticAudit=staticAudit;
 if(similarity>.65+1e-12){attempt.rejection='recovery-pairwise-near';rows.push({construction:a.constructionEvidence,acceptedForFirstMath:false,reason:attempt.rejection,similarity});attempts.push(attempt);continue;}
 const packet={...b,recipeId:bp.recipeId,fixedBatchPlan:original.plan,constructionEvidence:a.constructionEvidence,sourceLevelSha256:levelSha256(rt.LEVELS.find(l=>l.id===bp.sourceLevelId)),
  executionEnvironment:plan.executionEnvironment.descriptor,inputStaticAudit:staticAudit,redesignOf:bp.failedParent.attemptId,
  branchProvenance:{reference:bp.reference,failedParent:bp.failedParent,previousNewFixedInputs:previous,changesFromAllPreviousSameSourceFixedInputs:true},
  predeclaredUpperStrategy:'original-ice-joint',gateGeometrySha256:describeLayout(b.level).gateGeometrySha256,
  status:'STATIC_EARLY_FROZEN_INPUT_AWAITING_FIRST_PUBLIC_CLAIM',staticMetadataCorrection:correction,
  accepted:false,catalogEligible:false,formalReady:false,mathematicalEvidenceValidated:false,mechanismStrengthValidated:false,designValidated:false,slotAssigned:false,currentRuntimeValidationClaimed:false,gameplaySearches:0};
 const file=output+'/candidate-'+String(candidates.length).padStart(3,'0')+'.json';await write(file,packet);
 const descriptor={path:file,sha256:sha(await fs.readFile(file)),recipeId:bp.recipeId,sourceLevelId:bp.sourceLevelId,levelSha256:b.levelSha256,prefixSha256:b.prefixSha256};
 candidates.push({packet,descriptor});attempt.candidate=descriptor;attempt.rejection=null;attempts.push(attempt);
 rows.push({construction:a.constructionEvidence,candidate:descriptor,acceptedForFirstMath:true,similarity,physicalLevelSha256:b.levelSha256});
}
assert.equal(rows.length,4);await checkBindings(plan.bindings);await checkLedgerSnapshot(plan.ledgerSnapshot);
await write(output+'/index.json',{...original,sourceConstructionIndex:originalD,staticMetadataCorrection:correction,attempts,candidates:candidates.map(x=>x.descriptor),eligibleInputs:candidates.length,
 originalRejections:original.rejections,rejections:Object.fromEntries(attempts.filter(a=>a.rejection).map(a=>[a.rejection,attempts.filter(b=>b.rejection===a.rejection).length])),
 recoveryAddsPhysicalInputs:false,originalFourColourInputsRetained:true,requiresIndependentStaticAudit:true});
await write(output+'/recovery.json',{status:'STATIC_SLOT_METADATA_RECOVERED_NOT_FORMAL',sourceConstructionIndex:originalD,correction,rows,fileBindings:bindings,
 newWorlds:0,newConstructionCalls:0,newSearches:0,newPublicClaims:0,originalConstructionInputs:4,eligibleInputs:candidates.length,formalReady:false});
console.log(JSON.stringify({index:output+'/index.json',sha256:sha(await fs.readFile(output+'/index.json')),eligible:candidates.length,newWorlds:0}));
