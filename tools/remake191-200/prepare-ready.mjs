import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {ROOT,ruleGate,digest,writeNew,auditSpatial,TARGETS} from './common.mjs';
import {loadApi,replay} from './replay.mjs';import {replayTiming} from './observed-timing.mjs';
const planFile=process.argv[2],plan=JSON.parse(fs.readFileSync(planFile)),{api}=await loadApi();ruleGate();const rows=[];
for(const item of plan.rows){
 const d=JSON.parse(fs.readFileSync(item.file)),l=d.level,id=l.id,t=TARGETS[id];assert(id===item.id&&item.sourceReviewed&&item.proofReviewed);assert(item.L>=t.range[0]&&item.U<=t.range[1]);
 const route=replay(l,d.drags,api,{complete:true,requirePointerCompatible:true});assert.equal(route.nonClearingDrags,item.U);const spatial=auditSpatial(l,api);
 const reviews=item.reviews.map(file=>({file,sha256:digest(fs.readFileSync(file))}));assert(reviews.length);
 const sourceAcceptance={};
 if(item.sourceAcceptance){
  const file=item.sourceAcceptance.file,a=JSON.parse(fs.readFileSync(file));
  assert.equal(a.status,'USER_ACCEPTED_SPECIFIC_DISPLAYED_CANDIDATES');assert(a.sourceFactsRemainUnknown);
  assert(ruleGate().verified.some(v=>v.version===a.ruleVersion));
  const accepted=a.candidates.find(r=>r.id===id);assert(accepted);assert.equal(accepted.levelSha256,digest(l));assert.equal(accepted.routeSha256,digest(d.drags));
  const type=id===191?'USER_ACCEPTED_AUTHORED_OPENING':id===196?'USER_ACCEPTED_AUTHORED_SOURCE_FIELDS':null;assert(type);assert.equal(item.sourceAcceptance.type,type);
  Object.assign(sourceAcceptance,{sourceValidated:false,sourceStatus:type,sourceOriginVerified:false,sourceContractSatisfied:true,sourceValidationMeaning:'Specific authored candidate accepted by the user; missing original source facts remain UNKNOWN.',acceptance:{file,sha256:digest(fs.readFileSync(file)),ruleVersion:a.ruleVersion}});
 }
 const decisions=JSON.parse(fs.readFileSync(item.decisions));assert(decisions.passed);assert.equal(decisions.levelSha256,digest(l));assert.equal(decisions.routeSha256,digest(d.drags));assert(decisions.cases.length>=1);
 const pointer=item.reports.map(file=>{const p=JSON.parse(fs.readFileSync(file));assert.equal(p.status,'PASS');assert(p.candidateOnly&&p.naturalClock&&!p.clockFrozen&&!p.playerSaveTouched);const row=p.rows.find(r=>r.id===id);assert(row&&row.status==='PASS'&&row.candidateOverlay&&!row.formalObjectIdentity);assert.equal(row.levelSha256,digest(l));assert.equal(row.routeSha256,digest(d.drags));assert(row.final.complete&&!row.final.failed&&row.final.remainingSeconds>0);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);assert.equal(row.storage.backend,'MemoryHost');
  for(const[bindingPath,h]of Object.entries(p.bindings)){assert.equal(digest(fs.readFileSync(path.join(p.sourceSnapshot,bindingPath))),h,'Captured source binding '+bindingPath);}
  const observed=path.join(path.dirname(file),`lv${id}-observed-timing.json`),timing=replayTiming(l,JSON.parse(fs.readFileSync(observed)),api);return{file,sha256:digest(fs.readFileSync(file)),viewport:p.viewport,observed,observedSha256:digest(fs.readFileSync(observed)),timing};
 });assert.deepEqual(pointer.map(p=>p.viewport.width).sort((a,b)=>a-b),[320,496]);
 rows.push({id,file:item.file,candidateSha256:digest(fs.readFileSync(item.file)),levelSha256:digest(l),routeSha256:digest(d.drags),L:item.L,U:item.U,sourceValidated:sourceAcceptance.sourceValidated??true,...sourceAcceptance,lowerBoundCertified:true,candidatePointerValidated:true,mechanismReviewed:true,reviews,decisions:item.decisions,pointer,route,spatial});
}
const target=ROOT+'/ready-'+Date.now()+'.json';writeNew(target,{status:'READY_FOR_FORMAL_ADOPTION',planFile,planSha256:digest(fs.readFileSync(planFile)),rows});console.log(JSON.stringify({target,ids:rows.map(r=>r.id)}));
