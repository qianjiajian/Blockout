import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,auditDraft,mechanismInventory,ruleGate} from '../../../remake141to150-v173.mjs';
import {verifyAcceptedSourceDesign} from '../../../remake141to150-source-acceptance-v174.mjs';
import {measureRoute} from '../../../remake21to30-quality.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';

const ROOT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-root';
const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-a';
const lock=ruleGate();assert.equal(lock.activeVersion,'1.74.0');
const {api,inputs}=await loadApi();
const read=p=>JSON.parse(fs.readFileSync(p));
const stable=m=>{const {moves,...s}=m.snapshot();return s;};
const cells=b=>new Set(b.shape.map(([x,y])=>[b.x+x,b.y+y].join(',')));
const apply=(m,r)=>{m.beginAction();for(const p of r.path)assert(m.moveBlockStep(r.blockId,...p));let e;if(r.exitSide){e=m.tryExit(r.blockId,r.exitSide);assert(e.ok);}assert(m.commitAction());return e;};
const newModel=l=>{const m=new api.PuzzleModel(structuredClone(l));m.startCountdown();return m;};
const replay=(l,rs)=>{const r=api.replayRevisedRoute(l,rs);assert(r.valid,JSON.stringify(r));return r;};
function timed(level,drags){
 const m=newModel(level);let seconds=0;
 const tick=t=>{seconds+=t;m.tick(t);assert(!m.snapshot().failed);};
 for(const r of drags){tick(.35);m.beginAction();tick(.08);for(const p of r.path){tick(.06);assert(m.moveBlockStep(r.blockId,...p));}if(r.exitSide)assert(m.tryExit(r.blockId,r.exitSide).ok);assert(m.commitAction());tick(.08);}
 assert(m.snapshot().complete);return{complete:true,simulatedSeconds:seconds,timeLimit:level.timeSeconds,naturalClockValidated:false};
}
function strictCases(data,file){
 const review=read(file),level=data.level;assert.equal(review.levelSha256,digest(level));assert.equal(review.routeSha256,digest(data.drags));assert(review.passed&&review.cases.length>=2);
 return review.cases.map(c=>{
  const index=c.beforeDrag-1,prefix=data.drags.slice(0,index),next=data.drags[index],wrong=c.wrongParking,back=c.recovery;
  assert.notEqual(wrong.blockId,next.blockId);assert(next.path.length);
  const m=newModel(level);for(const r of prefix)apply(m,r);const before=stable(m),block=structuredClone(m.getBlock(wrong.blockId));assert(block.shape.length>1);
  replay(level,[...prefix,wrong]);replay(level,[...prefix,next]);apply(m,wrong);const parked=m.getBlock(wrong.blockId);assert(parked.x!==block.x||parked.y!==block.y);
  const parkedState=stable(m),comp=structuredClone(parkedState),cb=comp.blocks.find(b=>b.id===block.id);cb.x=block.x;cb.y=block.y;assert.deepEqual(comp,before,'Only coordinates may change in the wrong parking');
  const occupied=cells(parked);let collision=null;m.beginAction();
  for(const [unit,p]of next.path.entries()){
   const b=m.getBlock(next.blockId);assert(!b.frozen&&!b.lockedBy);assert(!b.shutterId||m.snapshot().shutters.find(s=>s.id===b.shutterId)?.revealed);assert.equal(Math.abs(b.x-p[0])+Math.abs(b.y-p[1]),1);
   if(!m.moveBlockStep(b.id,...p)){const overlap=b.shape.map(([x,y])=>[p[0]+x,p[1]+y]).filter(q=>occupied.has(q.join(',')));assert(overlap.length);collision={unit,from:[b.x,b.y],to:p,overlap};break;}
  }
  assert.deepEqual(collision,c.physicalCollision);assert(collision);
  const recovered=newModel(level);for(const r of [...prefix,wrong,back])apply(recovered,r);assert.deepEqual(stable(recovered),before);
  const route=[...prefix,wrong,back,...data.drags.slice(index)];assert.deepEqual(route,c.completeRecoveredRoute);assert(replay(level,route).complete);
  return {beforeDrag:c.beforeDrag,wrongBlock:wrong.blockId,wrongBlockArea:block.shape.length,blockedOtherBlock:next.blockId,collision,exactRecovery:true,completeRouteSha256:digest(route),positiveTime:timed(level,route)};
 });
}
function negatives(data){
 const tests=[
  ['level-coordinate',d=>d.level.blocks[0].x++],
  ['level-color',d=>d.level.blocks[0].color='pink'],
  ['level-mechanism',d=>d.level.blocks[0].frozen=1],
  ['route-truncated',d=>d.drags.pop()],
  ['route-coordinate',d=>d.drags.find(r=>r.path.length).path[0][0]++],
  ['unknowns-deleted',d=>delete d.sourceReview.unknowns],
  ['unknowns-empty',d=>d.sourceReview.unknowns=[]],
  ['unknowns-expanded',d=>d.sourceReview.unknowns.push({field:'extra',source:null,design:1})],
  ['unknown-field-changed',d=>d.sourceReview.unknowns[0].field='extra'],
  ['acceptance-missing',d=>delete d.sourceReview.acceptance],
  ['acceptance-wrong-status',d=>d.sourceReview.acceptance.status='SOURCE_VERIFIED'],
  ['source-status-promoted',d=>d.sourceReview.acceptance.sourceFactsStatus='VERIFIED'],
  ['source-promoted-boolean',d=>d.sourceReview.acceptance.sourceFactsPromotedToVerified=true],
  ['accepted-field-changed',d=>d.sourceReview.acceptance.fields[0].design='wrong'],
  ['accepted-extra-field',d=>d.sourceReview.acceptance.fields.push({field:'extra',design:1})],
  ['prior-reference-changed',d=>d.sourceReview.acceptance.priorCandidate='elsewhere'],
  ['binding-deleted',d=>delete d.sourceReview.bindings[Object.keys(d.sourceReview.bindings)[0]]],
  ['review-unpassed',d=>d.sourceReview.passed=false],
 ];
 return tests.map(([name,mutate])=>{const copy=structuredClone(data);mutate(copy);let message;try{verifyAcceptedSourceDesign(copy);}catch(e){message=e.message.split('\n')[0];}assert(message,`Accepted negative control ${name}`);return{name,rejected:true,message};});
}
const source144=read('deliverables/remake31-200-v145-20260924/batches/lv141-150/source141-145/source-specs141-143-144.json').observations[144];
const source150=read('deliverables/remake31-200-v145-20260924/batches/lv141-150/source146-150/source150-review.json');
const rows=[];
for(const id of [144,150]){
 const file=ROOT+`/authorised${id}-v174.json`,data=read(file),l=data.level,s=data.sourceReview,acceptance=verifyAcceptedSourceDesign(data),prior=read(acceptance.priorCandidate);
 const changedKeys=[...new Set([...Object.keys(data),...Object.keys(prior)])].filter(k=>JSON.stringify(data[k])!==JSON.stringify(prior[k]));assert.deepEqual(changedKeys.sort(),['authorisedForFormalAdoption','sourceReview']);
 assert.deepEqual(l,prior.level);assert.deepEqual(data.drags,prior.drags);assert.deepEqual(s.unknowns,prior.sourceReview.unknowns);assert.equal(s.acceptance.sourceFactsStatus,'UNKNOWN');
 const bindings=Object.entries(s.bindings).map(([path,hash])=>{assert.equal(digest(fs.readFileSync(path)),hash,path);return{path,sha256:hash};});
 const audit=auditDraft(data,api),inventory=mechanismInventory(l);assert.deepEqual(inventory,s.expectedInventory);
 assert.equal(new Set(s.mapping.map(m=>m.designId)).size,l.blocks.length);assert.equal(s.mapping.length,l.blocks.length);
 const mappings=s.mapping.map(m=>{const b=l.blocks.find(b=>b.id===m.designId);assert(b);assert.deepEqual(b.shape,m.designShape);assert.deepEqual(b.layers??[b.color],m.designLayers??[m.designColor]);for(const k of ['keyId','lockedBy','lockCount','shutterId'])if(m[k]!==undefined)assert.deepEqual(b[k],m[k]);if(m.position)assert.deepEqual([b.x,b.y],m.position);return{sourceId:m.sourceId,designId:b.id,sourceArea:m.sourceShape?.length??null,designArea:b.shape.length,sourceLayers:m.sourceLayers??null,designLayers:b.layers??[b.color],shapeChanged:!!m.sourceShape&&JSON.stringify(m.sourceShape)!==JSON.stringify(b.shape)};});
 if(id===144){
  const sourceBodies=[...source144.opening.blocks,...source144.hidden.knownBatches.flatMap(x=>x.blocks)];assert.equal(sourceBodies.length,23);assert.equal(s.mapping.filter(m=>m.sourceId!==null).length,23);
  for(const src of sourceBodies){const m=s.mapping.find(m=>m.sourceId===src.id);assert(m);assert.deepEqual(m.sourceShape,src.shape);assert.deepEqual(m.sourceLayers,src.layers??[src.color]);const b=l.blocks.find(b=>b.id===m.designId);if(src.keyColor)assert.equal(b.keyId,'key-'+src.keyColor);if(src.lockColor){assert.equal(b.lockedBy,'key-'+src.lockColor);assert.equal(b.lockCount,src.lockCount);}}
  assert.equal(l.blocks.filter(b=>!b.shutterId).length,16);assert.equal(l.blocks.filter(b=>!b.shutterId).reduce((n,b)=>n+b.shape.length,0),28);
  for(const batch of source144.hidden.knownBatches){const curtain=l.shutters.find(x=>x.count===batch.count);assert(curtain);assert.equal(l.blocks.filter(b=>b.shutterId===curtain.id).length,batch.blocks.length);for(const src of batch.blocks)assert.equal(l.blocks.find(b=>b.id===s.mapping.find(m=>m.sourceId===src.id).designId).shutterId,curtain.id);}
  for(const gate of source144.gates){const local=l.gates.find(g=>(g.frozen??0)===gate.frozen);assert(local);if(gate.color)assert.equal(local.color,gate.color);}
  for(const [count,color]of [[15,'red'],[18,'green'],[23,'pink']])assert.equal(l.gates.find(g=>g.frozen===count).color,color);
 }else{
  assert.equal(s.mapping.filter(m=>m.sourceId).length,12);assert.equal(s.mapping.filter(m=>m.addedForGeometry).length,2);
  for(const m of s.mapping.filter(m=>m.sourceId)){const match=m.sourceId.match(/row(\d)-col(\d)/);assert(match);assert.deepEqual(m.sourceLayers,source150.opening.rows[+match[1]][+match[2]].split('->'));assert.deepEqual(m.sourceShape,[[0,0],[0,1]]);assert.equal(m.sourceLayers.length,m.designLayers.length);}
  for(const g of source150.mechanisms.gates){const local=(g.flip?l.flipDoors:l.gates).find(x=>x.color===g.color);assert(local);assert.equal(local.frozen??0,g.frozen??0);if(g.flip&&g.color!=='yellow')assert.equal(local.initiallyOpen,g.initiallyOpen);}
  assert.equal(s.sourcePhaseVerified,false);assert.equal(l.flipDoors.find(g=>g.color==='yellow').initiallyOpen,true);
 }
 const route=replay(l,data.drags);assert(route.complete);assert.equal(route.nonClearingDrags,id===144?6:10);assert.equal(data.drags.length,id===144?31:26);
 const measurements=measureRoute(l,data.drags,api);assert.equal(measurements.multiCellDrags,route.nonClearingDrags);assert.equal(measurements.singleCellDrags,0);
 const model=newModel(l),events=[],ports=new Set();
 for(const [i,r]of data.drags.entries()){
  const before=model.snapshot(),block=structuredClone(model.getBlock(r.blockId)),exit=apply(model,r),after=model.snapshot();if(exit?.gateId)ports.add(exit.gateId);
  const old=data.decisionReview.events[i];assert.equal(old.step,i+1);assert.equal(old.id??old.blockId,r.blockId);assert.equal(old.cleared,after.cleared);assert.equal(old.clears,after.cleared-before.cleared);
  const event={step:i+1,blockId:r.blockId,cleared:after.cleared,clears:after.cleared-before.cleared,exitGate:exit?.gateId??null};
  if(id===144){event.lockCounts=after.blocks.filter(b=>b.lockedBy).map(b=>[b.id,b.lockCount]);assert.deepEqual(event.lockCounts,old.lockCounts);}
  else{event.phaseBefore=before.flipDoors.map(g=>[g.color,g.open,g.frozen]);event.phaseAfter=after.flipDoors.map(g=>[g.color,g.open,g.frozen]);assert.deepEqual(event.phaseBefore,old.phaseBefore);assert.deepEqual(event.phaseAfter,old.phaseAfter);assert.equal(old.color,block.color);}
  events.push(event);
 }
 assert.deepEqual([...ports].sort(),[...l.gates,...(l.flipDoors??[])].map(g=>g.id).sort());
 if(id===150){const thaw=events.find(e=>e.cleared===7);assert.deepEqual(thaw.phaseAfter.find(x=>x[0]==='yellow'),['yellow',false,0]);}
 const decisionFile=ROOT+`/decisions${id}-${id===144?'1790477582086':'1790477582113'}.json`,decisions=strictCases(data,decisionFile);
 const controls=negatives(data);assert.equal(digest(fs.readFileSync(file)),digest(fs.readFileSync(file)));
 rows.push({id,candidate:file,candidateSha256:digest(fs.readFileSync(file)),priorCandidate:acceptance.priorCandidate,priorCandidateSha256:digest(fs.readFileSync(acceptance.priorCandidate)),changedTopLevelKeys:changedKeys,levelSha256:digest(l),routeSha256:digest(data.drags),acceptedSourceFields:acceptance.fields,sourceUnknownsUnchanged:true,bindings,inventory,mappings,audit,route:{valid:true,complete:true,drags:data.drags.length,clearEvents:route.clearEvents,nonClearingDrags:route.nonClearingDrags,multiCellDrags:measurements.multiCellDrags,singleCellDrags:0},positiveTime:timed(l,data.drags),events,allPortsUsed:[...ports],decisionFile,decisionFileSha256:digest(fs.readFileSync(decisionFile)),decisions,negativeControls:controls,lowerBoundRecomputed:false,newSolverSearch:false});
}
const file=OUT+'/review144150-v174-'+Date.now()+'.json';
const report={ruleVersion:lock.activeVersion,passed:true,method:'Read-only current-model source/space/native-art replay, immutable candidate comparison, strict multi-cell wrong-parking recovery, exact source-authorisation gate negative controls',scriptSha256:digest(fs.readFileSync(new URL(import.meta.url))),modelInputs:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))])),rows,naturalClockValidated:false,formalAdoptionValidated:false,sourceFactsPromotedToVerified:false,oldEvidenceModified:false};
fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:true,rows:rows.map(r=>({id:r.id,drags:r.route.drags,U:r.route.nonClearingDrags,allPorts:r.allPortsUsed.length,strictDecisions:r.decisions.length,negativeControls:r.negativeControls.length}))}));
