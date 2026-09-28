import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,replay} from '../replay.mjs';
import {auditSpatial,digest,ruleGate} from '../common.mjs';
import {save} from './common.mjs';

ruleGate();
const file='deliverables/remake191-200-20260927/author194-196/family195-1790525599528.json';
const sourceFile='deliverables/remake191-200-20260927/author194-196/source195-1790524450141.json';
const independentFloorFile='deliverables/remake191-200-20260927/model-floor195-1790525873800.json';
const d=JSON.parse(fs.readFileSync(file)),l=d.level,source=JSON.parse(fs.readFileSync(sourceFile)),floor=JSON.parse(fs.readFileSync(independentFloorFile)),{api,inputs}=await loadApi();
assert.equal(l.id,195);assert.equal(l.blocks.length,18);assert.equal(l.blocks.reduce((a,b)=>a+b.shape.length,0),46);
assert.deepEqual(source.sourceUnknownFields,[]);
for(const e of source.frames)assert.equal(digest(fs.readFileSync(e.file)),e.sha256);
const mapping=source.pieces.map(s=>{
 const b=l.blocks.find(b=>b.id==='r108-195-'+s.sourceId);assert(b);
 assert.equal(b.keyId,s.keyGroup);assert.equal(b.lockedBy,s.lockGroup);assert.equal(b.lockCount,s.lockCount);
 return {source:s,designed:b,colorChanged:s.color!==b.color,shapeChanged:JSON.stringify(s.shape)!==JSON.stringify(b.shape),positionChanged:s.x!==b.x||s.y!==b.y};
});
assert.equal(new Set(mapping.map(x=>x.designed.id)).size,18);
const doors=source.doors.map(s=>{const color=s.color==='lime'?'orange':s.color,g=l.gates.find(g=>g.color===color);assert(g);assert.equal(g.frozen??0,s.ice);return{source:s,designed:g,colorChanged:s.color!==color,geometryChanged:s.side!==g.side||s.offset!==g.offset||s.size!==g.size};});
assert.equal(l.gates.length,8);assert.equal(l.blocks.filter(b=>b.keyId).length,6);assert.equal(l.blocks.filter(b=>b.lockedBy).length,2);
for(const k of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length);
for(const b of l.blocks)for(const k of ['frozen','timedBombSeconds','movementAxis','star','rotationBadge','layers'])assert.equal(b[k],undefined);
const actual=replay(l,d.drags,api,{complete:true,requirePointerCompatible:true,timed:true});
assert.equal(actual.effectiveDrags,38);assert.equal(actual.nonClearingDrags,20);assert.equal(actual.clearEvents,18);
const model=new api.PuzzleModel(structuredClone(l));model.startCountdown();
const snapshots=[],unlocks=[],iceControls=[],lockControls=[],used=new Map(),saved=[];
for(let step=0;step<=d.drags.length;step++){
 const snap=model.snapshot();saved.push(model.clone());
 const remaining={};for(const b of l.blocks.filter(b=>b.lockedBy)){
  const keys=l.blocks.filter(k=>k.keyId===b.lockedBy),collected=keys.filter(k=>!model.getBlock(k.id)).length,body=model.getBlock(b.id),want=Math.max(0,3-collected);
  remaining[b.id]={collected,remaining:want};
  if(body){assert.equal(body.lockedBy,want?b.lockedBy:undefined);assert.equal(body.lockCount,want||undefined);if(want)assert(!model.isBlockActive(body));}
  if(want===0&&!unlocks.some(x=>x.blockId===b.id))unlocks.push({step,blockId:b.id,group:b.lockedBy,keys:keys.map(k=>k.id)});
  if(body&&want&&!lockControls.some(x=>x.blockId===b.id))for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const x=body.x+dx,y=body.y+dy,unlocked=model.clone(),probe=unlocked.getBlock(b.id);probe.lockedBy=undefined;probe.lockCount=undefined;
   if(unlocked.moveBlockStep(b.id,x,y)){assert(!model.clone().moveBlockStep(b.id,x,y));lockControls.push({step,blockId:b.id,remaining:want,target:[x,y],lockedRejected:true,isolatedUnlockedAccepted:true});break;}
  }
 }
 for(const g of snap.gates)assert.equal(g.frozen,Math.max(0,(l.gates.find(x=>x.id===g.id).frozen??0)-snap.cleared));
 snapshots.push({step,cleared:snap.cleared,remaining,gateIce:snap.gates.map(g=>({id:g.id,frozen:g.frozen}))});
 if(step===d.drags.length)break;
 const drag=d.drags[step];model.beginAction();for(const p of drag.path)assert(model.moveBlockStep(drag.blockId,...p));
 if(drag.exitSide){
  const b=model.getBlock(drag.blockId),g=l.gates.find(g=>g.color===b.layers[0]);assert(g);used.set(g.id,(used.get(g.id)??0)+1);
  if(g.frozen&&!iceControls.some(x=>x.gateId===g.id)){const blocked=model.clone();blocked.gates.find(x=>x.id===g.id).frozen=1;assert.notEqual(blocked.exitAttemptStatus(b.id,drag.exitSide),'ok');assert.equal(model.exitAttemptStatus(b.id,drag.exitSide),'ok');iceControls.push({step:step+1,gateId:g.id,sourceIce:g.frozen,reFrozen1Rejected:true,actualThawedAccepted:true});}
  assert(model.tryExit(drag.blockId,drag.exitSide).ok);
 }
 assert(model.commitAction());
}
assert.equal(unlocks.length,2);assert.equal(lockControls.length,2);assert.equal(iceControls.length,7);assert.equal(used.size,8);
const recoveries=[];
for(let step=1;step<saved.length-1&&recoveries.length<2;step++){
 const m=saved[step];for(const b of m.snapshot().blocks){
  if(!m.isBlockActive(b)||b.shape.length<2)continue;
  for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
   const first={blockId:b.id,path:[[b.x+dx,b.y+dy]]},back={blockId:b.id,path:[[b.x,b.y]]},route=[...d.drags.slice(0,step),first,back,...d.drags.slice(step)];
   try{const r=replay(l,route,api,{complete:true,requirePointerCompatible:true});assert.equal(r.effectiveDrags,40);recoveries.push({afterStep:step,blockId:b.id,out:first.path,back:back.path,replay:r,drags:route});break;}catch{}
  }
  if(recoveries.at(-1)?.afterStep===step)break;
 }
}
assert.equal(recoveries.length,2);
const report={status:'SOURCE_AND_MODEL_REVIEW_PASS',ruleVersion:'1.108.0',candidate:file,level:l,drags:d.drags,levelSha256:digest(l),routeSha256:digest(d.drags),sourceFile,sourceFileHash:digest(fs.readFileSync(sourceFile)),mapping,doors,adaptation:'v1.108 bounded regeneration retains all18 source identities, both lock3 bodies and their original three-key groups, ordinary green plus all seven frozen door counts. Known shapes/colors/positions adapted:44 source cells become46 baseline cells; source blueL3 and greenT4 become H2/SQ2 while source pinkL3 retains native shape. Lime mapsorange; other color reassignment and every footprint change listed per body. Eighteen source bodies retained, none added or omitted. No exact-layout or source-color-copy claim.',spatial:auditSpatial(l,api),replay:actual,independentFloor:{file:independentFloorFile,sha256:digest(fs.readFileSync(independentFloorFile)),report:floor},oldPrefixProof:d.proof,mechanism:{snapshots,unlocks,lockControls,iceControls,usedGates:[...used],recoveries},difficulty:{L:16,U:20,completeDrags:38,minTotalDrags:34,method:'Independent root authoritative PuzzleModel whole-world0/1BFS; no prefix stop, no normalization, no quotient. Old native key-prefix proof retained as secondary only.'},starTargets:api.levelStarTargets(l),scoringLimitation:'Original26 moves/82seconds retained. Eighteen removals plus L16 imply at least34drags; original26-move star is impossible under the preserved hard band. No score change authorized.',sourceUnknownFields:[],inputs:Object.fromEntries([...new Set([...inputs,'tools/remake191-200/author194-196/review195.mjs'])].map(f=>[f,digest(fs.readFileSync(f))])),naturalClockValidated:false,pointerValidated:false,formalAdopted:false};
console.log(save('review195',report));
