import test from 'node:test';
import assert from 'node:assert/strict';
import {
 NATIVE_ADMISSION_READY,NATIVE_QUALIFICATION_VERSION,NATIVE_QUALIFICATION_STATUS,
 assertNativeAdmissionQualificationV198,admitIncrementalShellNativeEntryV198,
} from './admit-incremental-shell-native-entry-v198.mjs';

// Pure metadata fixtures, never puzzle proofs. No model, replay, solver, player
// storage, history consumption or registration command runs in these tests.
const d=(path,c)=>({path,sha256:c.repeat(64)});
function fixture(){
 const candidate=d('private-native-candidate.json','a'),design=d('private-root-design.json','b'),runtime=d('private-pointer.json','c');
 const q={formalId:'daily-mechanisms-multilayer-shell-15-d1-01',levelSha256:'d'.repeat(64),routeSha256:'e'.repeat(64),L:13,U:23,sourceLevelId:2,stageKey:'mechanisms-multilayer-shell-15',difficulty:1,slot:1,toolchainSha256:'f'.repeat(64),drags:Array.from({length:25},()=>({})),band:{nominalLower:16,nominalUpper:20,lower:13,upper:23}};
 const row={...q,candidate,qualified:true,totalDrags:25,designAcceptance:{rootDisposition:design,status:'DESIGN_ACCEPTED_WITHIN_CURRENT_SELECTION'},difficultyPolicy:{version:'1.198.0',actualProofValuesUnchanged:true,band:q.band},mathematicalEvidence:{projectedLevelSha256:null,lowerTermination:'all-costs-below-floor-exhausted',proofInputLevelSha256:q.levelSha256}};
 const report={schemaVersion:1,version:NATIVE_QUALIFICATION_VERSION,status:NATIVE_QUALIFICATION_STATUS,activeRuleVersion:'1.198.0',proofKind:'native-full-layers',errors:[],rows:[row],formalReady:false,registrationPerformed:false,oldEvidenceChanged:false,newSearches:0,newModels:0,newReplays:0,newClaims:0,candidatePointer:runtime,fileBindings:{}};
 return{q,report,candidate,design,runtime};
}
const check=f=>assertNativeAdmissionQualificationV198(f.report,f.q,f.candidate,f.design,f.runtime);

test('native admission stays disabled before any argument or file IO',async()=>{
 assert.equal(NATIVE_ADMISSION_READY,false);
 await assert.rejects(admitIncrementalShellNativeEntryV198(null),/not independently enabled/);
 await assert.rejects(admitIncrementalShellNativeEntryV198(['absent','absent','absent','never-written','absent']),/not independently enabled/);
});

test('exact native qualifier metadata is accepted without mutation',()=>{
 const f=fixture(),before=structuredClone(f);assert.equal(check(f),f.report.rows[0]);assert.deepEqual(f,before);
});

test('projected reports, rewritten proof identity and unqualified metadata fail',()=>{
 const changes=[
  f=>f.report.version='shell-provided-original-evidence-current-ui-qualification-v198-history09-catalog-copy-01',
  f=>f.report.status='SHELL_PROVIDED_V198_ORIGINAL_EVIDENCE_CURRENT_POINTER_QUALIFIED',
  f=>f.report.proofKind='projected-plain',f=>f.report.activeRuleVersion='1.156.0',
  f=>f.report.rows[0].mathematicalEvidence.projectedLevelSha256='1'.repeat(64),
  f=>f.report.rows[0].mathematicalEvidence.lowerTermination='below-threshold-exhausted',
  f=>f.report.rows[0].mathematicalEvidence.proofInputLevelSha256='1'.repeat(64),
  f=>f.report.rows[0].qualified=false,f=>f.report.rows[0].L=16,
  f=>f.report.rows[0].difficultyPolicy.actualProofValuesUnchanged=false,
  f=>f.report.rows[0].difficultyPolicy.band={lower:16,upper:20},
 ];
 for(const change of changes){const f=fixture();change(f);assert.throws(()=>check(f));}
});

test('single-object, exact design/Pointer and no-new-work boundaries are mandatory',()=>{
 const changes=[
  f=>f.report.rows.push(structuredClone(f.report.rows[0])),f=>f.report.rows=[],
  f=>f.report.rows[0].candidate={...f.candidate,sha256:'0'.repeat(64)},
  f=>f.report.rows[0].designAcceptance.rootDisposition={...f.design,path:'different.json'},
  f=>f.report.candidatePointer={...f.runtime,sha256:'0'.repeat(64)},
  f=>f.report.errors=['unreviewed'],f=>f.report.fileBindings=null,
  ...['formalReady','registrationPerformed','oldEvidenceChanged'].map(k=>f=>f.report[k]=true),
  ...['newSearches','newModels','newReplays','newClaims'].map(k=>f=>f.report[k]=1),
 ];
 for(const change of changes){const f=fixture();change(f);assert.throws(()=>check(f));}
});
