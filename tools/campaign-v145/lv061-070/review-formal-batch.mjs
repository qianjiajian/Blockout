import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {ruleGate} from './remake61to70-v146.mjs';

const ROOT='deliverables/remake31-200-v145-20260924/batches/lv061-070';
const IDS=Array.from({length:10},(_,i)=>61+i);
const summaryPath=ROOT+'/summary.json';
const beforeDirectory=process.argv[2]??ROOT+'/formal-integration-1790263006147';
const beforeFile=beforeDirectory+'/before-levels.json',preparedFile=beforeDirectory+'/prepared.json';
const checker='tools/campaign-v145/lv061-070/review-candidate.mjs';
const self='tools/campaign-v145/lv061-070/review-formal-batch.mjs';
const out=ROOT+'/formal-review/run-'+Date.now();
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const fileHash=p=>digest(fs.readFileSync(p));
const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});};
const clean=v=>JSON.parse(JSON.stringify(v));

async function currentStage(){
 const result=await build({stdin:{resolveDir:process.cwd(),contents:`
 export {LEVELS,LEVELS_BEFORE_61_70_REMAKE} from './src/core/levels.ts';
 export {REMADE_61_70_IDS,applyRemake61to70} from './src/core/remake61to70.ts';
 export {matchFormalBlockShape,matchFormalBlockShapeForLevel} from './src/game/formalBlockShapes.ts';
 `},bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
 const api=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 const inputs=Object.keys(result.metafile.inputs).filter(p=>p!=='<stdin>');
 return {api,inputs,bindings:Object.fromEntries(inputs.map(p=>[p,fileHash(p)]))};
}

const lock=ruleGate();assert.equal(lock.activeVersion,'1.47.0');
const summary=json(summaryPath),prepared=json(preparedFile),before=json(beforeFile);
assert.equal(fileHash(summaryPath),prepared.summarySha256);
assert.equal(digest(before),prepared.beforeLevelsSha256);
assert.equal(before.length,200);
const {api,inputs,bindings}=await currentStage();
assert.deepEqual([...api.REMADE_61_70_IDS],IDS);
assert.equal(api.LEVELS.length,200);assert.equal(api.LEVELS_BEFORE_61_70_REMAKE.length,200);
const stageRows=api.LEVELS.map((level,index)=>{
 const preceding=api.LEVELS_BEFORE_61_70_REMAKE[index];
 assert.equal(level.id,index+1);assert.equal(preceding.id,level.id);
 if(!IDS.includes(level.id)){
  assert.equal(level,preceding,'Every outside level keeps exact object identity at this stage');
  assert.equal(api.applyRemake61to70(preceding),preceding);
  assert.equal(digest(level),digest(preceding));
 }else assert.equal(api.applyRemake61to70(preceding),level);
 return {id:level.id,beforeStageSha256:digest(preceding),actualSha256:digest(level),sameObject:level===preceding};
});
const crossSnapshotChanges=api.LEVELS_BEFORE_61_70_REMAKE.filter((level,index)=>digest(level)!==digest(before[index])).map(level=>({id:level.id,capturedSha256:digest(before[level.id-1]),currentBeforeStageSha256:digest(level),classification:level.id===79?'Parent-confirmed concurrent 71-80 adoption of level 79':'Unreviewed external change'}));
assert(crossSnapshotChanges.every(row=>row.id===79),'Only parent-confirmed parallel level 79 changed between captured snapshot and current before-stage');
const protectedBaseline=json('deliverables/remake31-200-v145-20260924/baseline.json');
assert.equal(digest(api.LEVELS.slice(0,30)),digest(protectedBaseline.levels.slice(0,30).map(r=>r.level)));
const level5=api.LEVELS[4];
const level5Rotations=level5.blocks.map(b=>({id:b.id,legacy:api.matchFormalBlockShape(b.shape),actualPolicy:api.matchFormalBlockShapeForLevel(b.shape,5)})).filter(row=>row.legacy?.quarterTurns!==0);
assert.equal(level5Rotations.length,3);assert(level5Rotations.every(row=>row.actualPolicy?.quarterTurns===row.legacy.quarterTurns));
for(const level of api.LEVELS.filter(l=>IDS.includes(l.id)))for(const b of level.blocks)assert.equal(api.matchFormalBlockShapeForLevel(b.shape,level.id)?.quarterTurns,0);

const copiedFields=['drags','decisionCases','source','sourceReview','sourceAdaptation','sourceAdaptationRefinement','sourceBinding','sourceEvidence','adaptations','originality','design','curtainLocalChoices','axisLocalChoices','earlyIceChoice','generatorLocalEvidence','liftCausalCase','unitRevealEvents','hiddenIceTimingExplanation'];
const candidates=[],verificationInputs=[];
for(const id of IDS){
 const row=summary.rows.find(r=>r.id===id),candidatePath=row.candidate.path,candidate=json(candidatePath),actual=api.LEVELS.find(l=>l.id===id);
 assert.equal(fileHash(candidatePath),row.candidate.sha256);
 assert.equal(digest(candidate.level),row.candidate.levelSha256);assert.equal(digest(candidate.drags),row.candidate.routeSha256);
 assert.deepEqual(clean(actual),candidate.level,'Final actual LEVELS must exactly equal the accepted candidate');
 const retained=Object.fromEntries(copiedFields.filter(k=>Object.hasOwn(candidate,k)).map(k=>[k,candidate[k]]));
 const verificationInput=out+'/actual-level-'+id+'.json';
 write(verificationInput,{...retained,level:clean(actual),actualFormalBinding:{source:'src/core/levels.ts LEVELS',campaignSha256:digest(api.LEVELS),levelSha256:digest(actual),candidatePath,candidateFileSha256:fileHash(candidatePath),candidateEqualityVerified:true,previousProofResultsCopied:false,previousReplayResultsCopied:false,previousPointerResultsCopied:false}});
 verificationInputs.push(verificationInput);candidates.push({id,candidatePath,candidateFileSha256:fileHash(candidatePath),verificationInput,verificationInputSha256:fileHash(verificationInput),levelSha256:digest(actual),routeSha256:digest(candidate.drags)});
}
const beforeCampaignSha256=digest(api.LEVELS_BEFORE_61_70_REMAKE),actualCampaignSha256=digest(api.LEVELS);
const preservation={beforeFile,beforeFileSha256:fileHash(beforeFile),capturedCampaignSha256:digest(before),beforeStageCampaignSha256:beforeCampaignSha256,actualCampaignSha256,other190ReferenceIdentityPreserved:true,other190BeforeStageSha256:digest(api.LEVELS_BEFORE_61_70_REMAKE.filter(l=>!IDS.includes(l.id))),other190ActualSha256:digest(api.LEVELS.filter(l=>!IDS.includes(l.id))),first30Sha256:digest(api.LEVELS.slice(0,30)),first30Preserved:true,level5Sha256:digest(level5),level5Rotations,crossSnapshotChanges,stageRows};
const initialBindings={...bindings,[summaryPath]:fileHash(summaryPath),[preparedFile]:fileHash(preparedFile),[beforeFile]:fileHash(beforeFile),[self]:fileHash(self),[checker]:fileHash(checker)};
write(out+'/prepared-inputs.json',{status:'INPUTS_READY_NOT_YET_FRESH_REVIEWED',createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,candidates,preservation,initialBindings});
console.log(JSON.stringify({status:'FORMAL_INPUTS_READY',out,actualCampaignSha256,crossSnapshotChanges}));
let stdout='',stderr='';
const result=await new Promise((resolve,reject)=>{
 const child=spawn(process.execPath,[checker,...verificationInputs],{cwd:process.cwd(),windowsHide:true,stdio:['ignore','pipe','pipe']});
 child.stdout.on('data',chunk=>{stdout+=chunk.toString();process.stdout.write(chunk);});
 child.stderr.on('data',chunk=>{stderr+=chunk.toString();process.stderr.write(chunk);});
 child.on('error',reject);child.on('close',(code,signal)=>resolve({code,signal}));
});
fs.writeFileSync(out+'/fresh-review.stdout.log',stdout,{flag:'wx'});fs.writeFileSync(out+'/fresh-review.stderr.log',stderr,{flag:'wx'});
if(result.code!==0){write(out+'/failed.json',{status:'FAIL',result,scope:'Fresh checker did not finish successfully; no batch PASS.',preservation,initialBindings});throw Error('Fresh review failed; see '+out);}
const resultRows=stdout.trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
assert.deepEqual(resultRows.map(r=>r.id),IDS);
const reports=resultRows.map(row=>{
 const r=json(row.output),input=candidates.find(c=>c.id===row.id);
 assert.equal(r.status,'PASS');assert.equal(r.candidate,input.verificationInput);assert.equal(r.candidateFileSha256,input.verificationInputSha256);
 assert.equal(r.levelSha256,input.levelSha256);assert.equal(r.routeSha256,input.routeSha256);assert(r.proof.thresholdProven);
 return {id:row.id,path:row.output,sha256:fileHash(row.output),levelSha256:r.levelSha256,routeSha256:r.routeSha256,lowerBound:r.lowerBound,upperBound:r.upperBound,totalDrags:r.totalDrags,proof:r.proof,starAssessment:r.starAssessment,decisionCaseCount:r.decisions.length};
});
const drift=Object.entries(initialBindings).filter(([file,sha])=>fileHash(file)!==sha).map(([file,sha])=>({file,before:sha,after:fileHash(file)}));
assert.deepEqual(drift,[],'All production and tool inputs remain stable during the fresh review');
const final=await currentStage();assert.equal(digest(final.api.LEVELS),actualCampaignSha256);assert.equal(digest(final.api.LEVELS_BEFORE_61_70_REMAKE),beforeCampaignSha256);
ruleGate();
write(out+'/summary.json',{status:'PASS',checkedAt:new Date().toISOString(),scope:'Actual final LEVELS: exact candidate binding, complete fresh appropriate lower bounds, complete routes, recoverable decisions and stage isolation',ruleVersion:lock.activeVersion,designContract:'1.45.0',actualCampaignSha256,lowerBoundRecomputed:true,priorPassReused:false,candidates,reports,preservation,initialBindings,drift,formalDataIntegrated:true,sourceEvidenceMetadataCopiedOnly:true,sourceAlignmentRevalidated:false,mechanismCausalityRevalidated:false,pointerValidated:false,humanBlindTested:false,mobileTested:false,published:false});
console.log(JSON.stringify({status:'FORMAL_FRESH_BATCH_PASS',output:out+'/summary.json',actualCampaignSha256,rows:reports.map(r=>({id:r.id,L:r.lowerBound,U:r.upperBound,totalDrags:r.totalDrags}))}));
