import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest} from './revised-preview-validation-v160.mjs';
const sourcePath='deliverables/remake91-100-v146-20260924/agent99-100/source99-rechecked-1790263737218.json';
const sourceHash='87a8d8a79881e33e36fea180c825794ad01160e8f51dd65ba8ea7b256a98bc31';
const area=bs=>bs.reduce((n,b)=>n+b.shape.length,0);
export function verifySource99(data,api){
 const {level:l,sourceReview:r}=data;assert.equal(l.id,99);assert.equal(r.file,sourcePath);assert.equal(r.sha256,sourceHash);assert.equal(digest(fs.readFileSync(sourcePath)),sourceHash);
 const source=JSON.parse(fs.readFileSync(sourcePath)),bindings={[sourcePath]:sourceHash};
 for(const row of [source.sourceTruth,source.priorDetailedLedger,...source.observedFrames]){assert.equal(digest(fs.readFileSync(row.file)),row.sha256);bindings[row.file]=row.sha256;}
 const sourceBodies=Object.entries(source.sourceCohorts).flatMap(([cohort,bs])=>bs.map((b,i)=>({sourceId:`${cohort}-${i}`,b,cohort})));
 assert.equal(sourceBodies.length,26);assert.equal(area(sourceBodies.map(x=>x.b)),54);assert.equal(l.blocks.length,32);assert.equal(area(l.blocks),68);
 assert.equal(r.blockMapping.length,26);assert.equal(new Set(r.blockMapping.map(m=>m.sourceId)).size,26);assert.equal(new Set(r.blockMapping.map(m=>m.candidateId)).size,26);
 let changedShapes=0,changedColors=0;
 for(const {sourceId,b:s,cohort}of sourceBodies){
  const m=r.blockMapping.find(m=>m.sourceId===sourceId),b=l.blocks.find(b=>b.id===m?.candidateId);assert(m&&b);assert.deepEqual(m.source,s);assert.deepEqual(m.candidate,b);
  for(const k of new Set([...Object.keys(s),...Object.keys(b)])){
   if(['id','x','y','shape','color','shutterId'].includes(k))continue;assert.deepEqual(b[k],s[k],`Preserve source mechanic ${sourceId}.${k}`);
  }
  assert.equal(Boolean(b.shutterId),cohort!=='opening');if(b.shutterId)assert.equal(l.shutters.find(s=>s.id===b.shutterId)?.count,3);
  if(JSON.stringify(s.shape)!==JSON.stringify(b.shape)){assert(['opening-1','opening-5','joint3-10'].includes(sourceId));assert.equal(s.shape.length,b.shape.length);assert.equal(api.matchFormalBlockShape(s.shape,'native-only'),undefined);assert.equal(api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns,0);assert(m.shapeAdaptation);changedShapes++;}
  if(s.color!==b.color){assert.equal(sourceId,'opening-10');assert.equal(s.color,'green');assert.equal(b.color,'cyan');assert.equal(b.movementAxis,'vertical');assert(m.colorAdaptation);changedColors++;}
 }
 assert.equal(changedShapes,3);assert.equal(changedColors,1);
 const mapped=new Set(r.blockMapping.map(m=>m.candidateId)),fill=l.blocks.filter(b=>!mapped.has(b.id));assert.equal(fill.length,6);assert.equal(area(fill),14);assert.deepEqual(fill,r.ordinaryFillers);
 assert.deepEqual(fill.map(b=>b.shape.length).sort((a,b)=>a-b),[1,1,3,3,3,3]);for(const b of fill)assert(Object.keys(b).every(k=>['id','x','y','shape','color','shutterId'].includes(k)),'Only ordinary fill is authorized');
 assert.equal(l.blocks.filter(b=>!b.shutterId).length,17);assert.equal(l.blocks.filter(b=>b.shutterId).length,15);
 assert.equal(l.shutters.length,3);assert(l.shutters.every(s=>s.count===3&&!s.skin));assert.deepEqual(l.shutters,r.candidateCoverRegions);assert.deepEqual(source.sourceCoverRegions,r.sourceCoverRegions);
 assert.equal(l.gates.length,8);assert.equal(r.gateBindings.length,8);assert.equal(new Set(r.gateBindings.map(m=>m.gateId)).size,8);
 for(const s of source.sourceGates){const m=r.gateBindings.find(m=>m.sourceId===s.id),g=l.gates.find(g=>g.id===m?.gateId);assert(m&&g);assert.deepEqual(m.source,s);assert.deepEqual(m.candidate,g);assert.equal(g.color,s.id==='source-99-g1'?'cyan':s.color);assert.equal(g.frozen??0,s.frozen);assert(!g.star);assert(Object.keys(g).every(k=>['id','color','side','offset','size','portals','frozen'].includes(k)));}
 for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length);
 assert.equal(l.blocks.filter(b=>b.keyId).length,7);assert.deepEqual(l.blocks.filter(b=>b.lockedBy).map(b=>b.lockCount).sort(),[3,4]);assert.equal(l.blocks.filter(b=>b.movementAxis).length,1);
 return{sources:bindings,sourceBodies:26,sourceArea:54,knownHiddenBodies:14,candidateBodies:32,ordinaryAddedArea:14,nativeShapeAdaptations:changedShapes,necessaryColorSplits:changedColors,sourceMechanicsPreserved:true};
}
const act=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
export function verifyMechanisms99(data,api){
 const {level,drags}=data,m=new api.PuzzleModel(level);m.startCountdown();const keyEvents=[],reveals=[];
 for(const[i,d]of drags.entries()){
  const before=m.snapshot(),body=before.blocks.find(b=>b.id===d.blockId);act(m,d);const after=m.snapshot();
  if(body.keyId&&!after.blocks.some(b=>b.id===body.id)){
   const locks=[];for(const b of before.blocks.filter(b=>b.lockedBy)){const n=after.blocks.find(a=>a.id===b.id);assert(n);const wanted=Math.max(0,b.lockCount-Number(b.lockedBy===body.keyId));assert.equal(n.lockCount??0,wanted);locks.push({id:b.id,group:b.lockedBy,before:b.lockCount,after:n.lockCount??0});}
   keyEvents.push({step:i+1,keyId:body.id,keyGroup:body.keyId,locks});
  }
  for(const s of after.shutters)if(s.revealed&&!before.shutters.find(t=>t.id===s.id).revealed){assert.equal(after.cleared,3);reveals.push({id:s.id,step:i+1,clearEvent:3});}
 }
 assert.equal(keyEvents.length,7);assert.deepEqual(keyEvents,data.mechanismEvidence.keyEvents);assert.equal(reveals.length,3);assert(m.snapshot().complete);
 const axes=data.mechanismEvidence.axisCases;assert(axes.length);
 for(const c of axes){
  assert.deepEqual(c.prefix.slice(0,c.afterDrags),drags.slice(0,c.afterDrags));assert.equal(c.prefix.length,c.afterDrags+1);
  const extra=c.prefix.at(-1);assert.equal(extra.blockId,c.blockId);assert(!extra.exitSide&&extra.path.length);const planned=drags[c.afterDrags];assert.deepEqual(extra.path,planned.path.slice(0,extra.path.length));
  const original=api.replayRevisedRoute(level,c.prefix);assert(original.valid);const copy=structuredClone(level),b=copy.blocks.find(b=>b.id===c.blockId);assert.equal(b.movementAxis,'vertical');delete b.movementAxis;
  const relaxed=api.replayRevisedRoute(copy,c.prefix);assert(relaxed.valid);const restored=JSON.parse(relaxed.finalStateKey);restored.blocks.find(b=>b.id===c.blockId).movementAxis='vertical';assert.deepEqual(restored,JSON.parse(original.finalStateKey));
  assert(!api.replayRevisedRoute(level,[...c.prefix,c.action]).valid);assert(api.replayRevisedRoute(copy,[...c.prefix,c.action]).valid);
 }
 const curtains=data.mechanismEvidence.curtainCases;assert(curtains.length);
 for(const c of curtains){assert.deepEqual(c.prefix,drags.slice(0,c.afterDrags));const copy=structuredClone(level),s=copy.shutters.find(s=>s.id===c.curtainId);assert.equal(s.count,3);assert.equal(c.originalCount,3);assert.equal(c.relaxedCount,1);s.count=1;assert(api.replayRevisedRoute(level,c.prefix).valid);assert(!api.replayRevisedRoute(level,[...c.prefix,c.action]).valid);assert(api.replayRevisedRoute(copy,[...c.prefix,c.action]).valid);}
 return{keyEvents,reveals,axisSingleFieldCases:axes.length,curtainSingleFieldCases:curtains.length,allInventoryCompleted:true,globalOrderClaimed:false};
}
