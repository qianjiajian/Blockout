// Read existing small evidence only. No history entry point/model/replay.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {CASE,SELF,readSource200Case,assertSource200ArchivalFailure,makeAdministrativeObservation,assertMetadataOnlyObservation,makeObservationOwner,assertThreeDeltaEffects} from './seal-star-source200-archival-failure-v1.mjs';
const self='tools/daily-challenge/formal-v4/seal-star-source200-archival-failure-v1.metadata.test.mjs';
const OUT='deliverables/daily-formal-v4-20261008/proof/star-source200-administrative-seal-private-01';
const sha=b=>createHash('sha256').update(b).digest('hex'),evidence=[],errors=[];
const e=await readSource200Case(),facts=assertSource200ArchivalFailure(e),observation=makeAdministrativeObservation(e,facts);
async function check(name,fn){try{evidence.push({name,passed:true,detail:await fn()});}catch(e){evidence.push({name,passed:false,error:e.stack});errors.push(name);}}
await check('fixed-original-evidence-and-observation',async()=>{
 const bytes=await fs.readFile(CASE.observation.path);assert.equal(sha(bytes),CASE.observation.sha256);assert.deepEqual(JSON.parse(bytes),observation);
 assert.equal(facts.savedNonemptyPartials,4);assert.equal(facts.emptyNonIdentityRecords,1);assert.equal(facts.unarchivedRecordCount,1);return{originalRecordCount:5,originalNonemptyPartialCount:4,originalPartialAreas:[4,4,10,10],originalMissingBytesStillMissing:true};
});
await check('normal-pass-and-ticket-gap-rewriting-rejected',()=>{
 for(const altered of [
  {...e,failureReview:{...e.failureReview,status:'INDEPENDENT_REVERSE_STAR_SUFFIX_ACTUAL_V2_PASS'}},
  {...e,failureReview:{...e.failureReview,normalExportAllowed:true}},
  {...e,candidate:{...e.candidate,construction:{...e.candidate.construction,session:{...e.candidate.construction.session,rawAccounting:{...e.candidate.construction.session.rawAccounting,recordTicketsConsumed:5}}}}},
  {...e,completion:{...e.completion,archiveValidation:{valid:false}}}
 ])assert.throws(()=>assertSource200ArchivalFailure(altered));return{rejections:4,originalErroneousTrueFieldsMustRemain:true};
});
await check('original-owner-members-cannot-be-added-removed-or-rehashed',()=>{
 for(const altered of [
  {...e,constructorOwner:{...e.constructorOwner,files:e.constructorOwner.files.slice(1)}},
  {...e,constructorOwner:{...e.constructorOwner,files:[...e.constructorOwner.files,e.constructorOwner.files[0]]}},
  {...e,mathOwner:{...e.mathOwner,files:[{...CASE.candidate,sha256:'f'.repeat(64)}]}},
  {...e,mathOwner:{...e.mathOwner,attemptIds:['synthetic-false-claim']}}
 ])assert.throws(()=>assertSource200ArchivalFailure(altered));return{rejections:4,originalTwoOwnerBytesUnchanged:true};
});
await check('full-claim-lower-or-template-cannot-enter-single-case',()=>{
 const row=e.rows[1];const badRow={...row,value:{...row.value,creation:{...row.value.creation,full:true}}};
 for(const altered of [
  {...e,rows:[e.rows[0],badRow,...e.rows.slice(2)]},
  {...e,candidate:{...e.candidate,attempt:{id:'not-a-real-attempt'}}},
  {...e,candidate:{...e.candidate,lowerBound:{status:'invented'}}},
  {...e,candidate:{...e.candidate,templateLevel:{}}}
 ])assert.throws(()=>assertSource200ArchivalFailure(altered));return{rejections:4,noNewLevelSpecCreated:true};
});
await check('coordinate-fragment-keeps-only-original-key-certainty',()=>{
 assert.equal(observation.missingOriginalRecord.rawKeySha256,CASE.rawKey);assert.equal(observation.missingOriginalRecord.originalLevelSha256Available,false);
 assert.throws(()=>assertSource200ArchivalFailure({...e,fragment:{...e.fragment,coordinateFragment:{...e.fragment.coordinateFragment,keySha256:'0'.repeat(64)}}}));
 assert.throws(()=>assertSource200ArchivalFailure({...e,fragment:{...e.fragment,deduction:{...e.fragment.deduction,inferredPartialArea:48}}}));return{rejections:2,onlyPosesAndScalarsHashed:true,newWorldArchive:false};
});
await check('metadata-only-observation-owner-has-no-physical-or-terminal-role',()=>{
 const owner=makeObservationOwner(e.constructorOwner.namespace,CASE.observation);assert.equal(owner.namespace,e.constructorOwner.namespace);assert.equal(owner.kind,'construction');assert.notEqual(owner.id,e.constructorOwner.id);assert.deepEqual(owner.parentPlan,CASE.plan);assert.deepEqual(owner.files,[CASE.observation]);assert.deepEqual(owner.attemptIds,[]);assert.deepEqual(owner.closedCampaigns,[]);
 assert.throws(()=>assertMetadataOnlyObservation({...observation,hidden:{blocks:[]}}));assert.throws(()=>assertMetadataOnlyObservation({...observation,normalExportAllowed:true}));assert.throws(()=>assertMetadataOnlyObservation({...observation,missingOriginalRecord:{...observation.missingOriginalRecord,recoveredWorldCreated:true}}));return{thirdOwnerOnlyObservation:true,rejections:3};
});
await check('three-delta-count-contract-no-missing-record-identity',()=>{
 // Count tokens only, not actual delta payloads or levels.
 const ds=[{owner:{id:CASE.experimentId},files:Array(10).fill(null),fullWorlds:Array(4).fill(null),terminalRecords:[],closedCampaigns:[null]},{owner:{id:CASE.experimentId+'-math'},files:[null],fullWorlds:[],terminalRecords:[],closedCampaigns:[]},{owner:{id:CASE.experimentId+'-archival-observation'},files:[null],fullWorlds:[],terminalRecords:[],closedCampaigns:[]}];
 assertThreeDeltaEffects(ds);for(const [index,key]of [[0,'fullWorlds'],[1,'terminalRecords'],[2,'fullWorlds'],[2,'closedCampaigns']]){const altered=ds.map((d,i)=>i===index?{...d,[key]:[...d[key],null]}:d);assert.throws(()=>assertThreeDeltaEffects(altered));}
 return{files:[10,1,1],historyRows:[4,0,0],terminals:[0,0,0],closedCampaigns:[1,0,0],rejections:4,actualDeltasCreated:false};
});
await check('fixed-anchor-byte-corruption-refused-before-parsing',async()=>{
 await assert.rejects(()=>readSource200Case(async p=>{const b=await fs.readFile(p);return p===CASE.plan.path?Buffer.concat([b,Buffer.from(' ')]):b;}),/Evidence bytes/);return{rejections:1,anchorReplacementNotSupported:true};
});
const compile=await build({entryPoints:[SELF],bundle:true,platform:'node',format:'esm',packages:'external',write:false,metafile:true,logLevel:'silent'});
const toolBindings={};for(const p of Object.keys(compile.metafile.inputs))toolBindings[p]=sha(await fs.readFile(p));
const proposal='deliverables/daily-formal-v4-20261008/proof/star-source200-administrative-seal-preparation-01/proposal.json';
const fileBindings={...e.fileBindings,...toolBindings,[self]:sha(await fs.readFile(self)),[proposal]:sha(await fs.readFile(proposal)),[CASE.observation.path]:CASE.observation.sha256};
const report={status:errors.length?'SOURCE200_ADMINISTRATIVE_SEAL_METADATA_FAIL':'SOURCE200_ADMINISTRATIVE_SEAL_METADATA_PASS',subject:{path:SELF,sha256:toolBindings[SELF]},test:{path:self,sha256:fileBindings[self]},observation:CASE.observation,evidence,fileBindings,toolBindings,bindingWorkingDirectory:process.cwd(),
 limitations:['Only fixed saved metadata and pure rejection branches were checked. Actual consume/merge/member enumeration/export entry point was never invoked.','No missing original world bytes or original level SHA were recreated.','The v9 schema/merge remains unmodified; actual three-delta validation must still run after independent review.','No new partial freshness permission is issued.'],
 draftCheckFailure:{path:'C:/Users/Administrator/Documents/ChatGPT/Block Out!/.codex-temp/source200-admin-draft-check-01-failure.txt',reason:'Draft compared compact session.formed summary against the full construction.formed wrapper. Corrected to original three summary fields; original records unchanged.',sourceAtFailure:'C:/Users/Administrator/Documents/ChatGPT/Block Out!/.codex-temp/source200-admin-draft-at-check01.mjs'},
 newLevelSpecsCreated:0,newRealConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,publicClaimsStarted:0,newHistoryLoads:0,newExports:0,errors};
for(const p of [report.draftCheckFailure.path,report.draftCheckFailure.sourceAtFailure])report.fileBindings[p]=sha(await fs.readFile(p));
for(const[p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h,p);
await fs.mkdir(OUT);const bytes=JSON.stringify(report,null,2)+'\n';await fs.writeFile(OUT+'/report.json',bytes,{flag:'wx'});console.log(JSON.stringify({report:{path:OUT+'/report.json',sha256:sha(bytes)},passed:evidence.filter(x=>x.passed).length,failed:errors.length}));if(errors.length)process.exitCode=1;
