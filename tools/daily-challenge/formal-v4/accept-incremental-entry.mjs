import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';

const [registrationFile,pointerFile,visualFile,outputFile]=process.argv.slice(2);
assert(registrationFile&&pointerFile&&visualFile&&outputFile,'registration, formal dual Pointer, actual visual review, new acceptance path required');
const sha=b=>createHash('sha256').update(b).digest('hex');
const read=async(path,expected)=>{const b=await fs.readFile(path);if(expected)assert.equal(sha(b),expected,path);return{path,sha256:sha(b),value:JSON.parse(b)};};
const registration=await read(registrationFile),pointer=await read(pointerFile),visual=await read(visualFile);
const r=registration.value,p=pointer.value;
assert.equal(r.status,'WRITTEN_AWAITING_FORMAL_ENTRY_VERIFICATION');
assert.equal(sha(await fs.readFile(r.data.path)),r.data.sha256,'Catalogue changed since this registration');
assert.equal(p.status,'FORMAL_INCREMENTAL_CURRENT_POINTER_RUNS_PASS');assert.equal(p.passed,2);assert.equal(p.results.length,2);
assert.deepEqual(p.results.map(x=>x.viewport).sort((a,b)=>a.width-b.width),[{width:320,height:568},{width:496,height:1078}]);
for(const[file,hash]of Object.entries(p.bindings))assert.equal(sha(await fs.readFile(file)),hash,file);
const images=[],requiredVisuals=[];
for(const row of p.results){
 const {value:q}=await read(row.report.path,row.report.sha256);
 assert.equal(q.status,'FORMAL_CURRENT_UI_POINTER_NATURAL_TIME_PASS');assert.deepEqual(q.viewport,row.viewport);
 assert.equal(q.formalId,r.formalId);assert.equal(q.levelSha256,r.levelSha256);assert.equal(q.routeSha256,r.routeSha256);
 assert(q.formalRegistryIdentity&&!q.candidateInjection&&q.formalEntryDebitValidated);
 assert(q.pointerValidated&&q.timeValidated&&q.settlementValidated&&q.naturalClock&&!q.clockMocked);
 assert.equal(q.formalEntryPreparation.baseline.attemptsRemaining,5);assert.equal(q.formalEntry.attemptsRemaining,4);
 assert.equal(q.settlement.daily.attemptsRemaining,4);assert.equal(q.formalEntry.assignment.catalogKind,'formal300');
 assert.equal(q.formalEntry.assignment.catalogRevision,r.admittedInRevision);
 assert.equal(q.formalEntry.assignment.id,r.formalId);assert.equal(levelSha256(q.formalEntry.level),r.levelSha256);
 const reward={1:{coins:50,inspiration:20},2:{coins:100,inspiration:50},3:{coins:200,inspiration:100}}[r.difficulty];
 assert.equal(q.settlement.coins-q.entryBaseline.coins,reward.coins);assert.equal(q.settlement.inspiration-q.entryBaseline.inspiration,reward.inspiration);
 assert.equal(q.totalDrags,r.totalDrags);assert.equal(q.U,r.U);
 assert(q.finalPuzzle.complete&&!q.finalPuzzle.failed&&!q.finalPuzzle.blocks&&!q.finalPuzzle.queuedBlocks&&q.finalPuzzle.remainingSeconds>0);
 assert(q.drawAudit.calls>0&&!q.drawAudit.rotated&&!q.drawAudit.canvasRotationCalls);
 assert.deepEqual(q.errors,[]);assert.deepEqual(q.storageViolations,[]);
 for(const image of Object.values(q.screenshots)){assert.equal(sha(await fs.readFile(image.path)),image.sha256);images.push(image);}
 assert(q.screenshots.opening&&q.screenshots.complete);
 requiredVisuals.push(q.screenshots.opening,q.screenshots.complete);
}
assert.equal(visual.value.formalId,r.formalId);assert.equal(visual.value.pointerReportSha256,pointer.sha256);
assert(visual.value.passed&&visual.value.method==='view_image'&&visual.value.images.length>=4,'Actual opening/completion visual review on both sizes required');
assert.equal(new Set(visual.value.images.map(i=>i.path)).size,visual.value.images.length,'Duplicate visual review image');
for(const image of visual.value.images)assert(images.some(i=>i.path===image.path&&i.sha256===image.sha256),'Unbound visual review image');
for(const image of requiredVisuals)assert(visual.value.images.some(i=>i.path===image.path&&i.sha256===image.sha256),'Missing viewport opening/completion visual review');
const original=await read('deliverables/daily-formal-v4-20261008/selection/completed-basic-and-advanced-161-01/index.json');
assert.equal(original.value.files.length,161);
for(const file of original.value.files)assert.equal(sha(await fs.readFile(file)),original.value.fileBindings[file]);
const report={status:'FORMAL_DATA_ACCEPTED',createdAt:new Date().toISOString(),ruleVersion:r.ruleVersion,
 formalId:r.formalId,stageKey:r.stageKey,difficulty:r.difficulty,slot:r.slot,sourceLevelId:r.sourceLevelId,
 levelSha256:r.levelSha256,routeSha256:r.routeSha256,L:r.L,U:r.U,totalDrags:r.totalDrags,
 catalogRevision:r.catalogRevision,admittedInRevision:r.admittedInRevision,formalAcceptedCount:r.registeredCount,
 formalTargetCount:300,remainingFormalSlots:300-r.registeredCount,data:r.data,
 registration:{path:registration.path,sha256:registration.sha256},formalPointer:{path:pointer.path,sha256:pointer.sha256},
 visualReview:{path:visual.path,sha256:visual.sha256},original161Unchanged:true,old450CountedAsNew:false,
 exactCompiledObject:true,dualScreenPointer:true,realChallengeEntry:true,naturalClock:true,fullInventory:true,
 settlement:true,attemptsDebitedOnce:true,playerSaveTouched:false,mathematicalSearchRerun:false,
 oldEvidenceRewritten:false,webBundleRebuilt:false,wechatPackaged:false,published:false,
 scope:'This exact new entry only. Previous admitted entries remain unchanged; all remaining slots still require their own acceptance.'};
await fs.writeFile(outputFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:outputFile,sha256:sha(await fs.readFile(outputFile)),status:report.status,formalAccepted:r.registeredCount,target:300}));
