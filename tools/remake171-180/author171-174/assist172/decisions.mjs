import fs from 'node:fs';import assert from 'node:assert/strict';
import {api,digest,ruleGate} from '../common.mjs';
ruleGate();const OUT='deliverables/remake171-180-20260927/author171-174/assist172',input='deliverables/remake171-180-20260927/assist172/tail-candidate-1790529917717.json',source='deliverables/remake171-180-20260927/author178-180/assist172/source172-pristine.json',d=JSON.parse(fs.readFileSync(input)),cases=[],used=new Set(),controls=[],trace=[];
const perform=(m,drag)=>{m.beginAction();for(const p of drag.path)if(!m.moveBlockStep(drag.blockId,...p))return false;if(drag.exitSide&&!m.tryExit(drag.blockId,drag.exitSide).ok)return false;return m.commitAction();};
const m=new api.PuzzleModel(d.level);m.startCountdown();
for(let i=0;i<d.drags.length;i++){
 const next=d.drags[i],before=m.snapshot();
 if(cases.length<3)for(const b of before.blocks){
  if(b.id===next.blockId||b.shape.length<2||!m.isBlockActive(m.getBlock(b.id))||used.has(b.id)||m.possibleExitSides(m.getBlock(b.id)).length)continue;
  for(const[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){const walk=m.clone(),path=[];walk.beginAction();for(let n=1;n<=4;n++){
   const p=[b.x+dx*n,b.y+dy*n];if(!walk.moveBlockStep(b.id,...p))break;path.push(p);if(walk.possibleExitSides(walk.getBlock(b.id)).length)break;
   const parked=m.clone();if(!perform(parked,{blockId:b.id,path:[...path]}))continue;const blocked=parked.clone();if(perform(blocked,next))continue;
   const recover={blockId:b.id,path:[...path.slice(0,-1).reverse(),[b.x,b.y]]};assert(perform(parked,recover));for(const drag of d.drags.slice(i))assert(perform(parked,drag));assert(parked.snapshot().complete);
   cases.push({prefixDrags:i,wrongPark:{blockId:b.id,shape:b.shape,from:[b.x,b.y],path:[...path]},initialPortalContact:false,wrongPathPortalContact:false,blockedNextDrag:next,recoveryDrag:recover,completionRoute:d.drags.slice(i),recoveredComplete:true,addedNonClearingDrags:2});used.add(b.id);break;
  }if(used.has(b.id)||cases.length>=3)break;}if(cases.length>=3)break;
 }
 for(const b of before.blocks.filter(b=>m.isBlockActive(m.getBlock(b.id)))){
  if(b.movementAxis&&!controls.some(c=>c.kind==='axis'))for(const[dx,dy]of b.movementAxis==='vertical'?[[1,0],[-1,0]]:[[0,1],[0,-1]]){
   const p=[b.x+dx,b.y+dy],actual=m.clone(),relaxed=m.clone();actual.beginAction();relaxed.beginAction();delete relaxed.getBlock(b.id).movementAxis;
   if(!relaxed.moveBlockStep(b.id,...p))continue;assert.equal(actual.moveBlockStep(b.id,...p),false);
   controls.push({kind:'axis',prefixDrags:i,blockId:b.id,axis:b.movementAxis,attempt:p,actualAccepted:false,singleVariableChange:'Delete only this block movementAxis in the cloned diagnostic state.',controlAccepted:true,meaning:'The same free geometric step is rejected in the real state because it crosses the preserved axis.'});break;
  }
  if(!controls.some(c=>c.kind==='ice-door'))for(const gate of before.gates.filter(g=>g.color===(b.layers[0]??b.color)&&g.frozen>0)){
   const actual=m.clone(),thawed=m.clone();actual.beginAction();thawed.beginAction();thawed.gates.find(g=>g.id===gate.id).frozen=0;const cr=thawed.tryExit(b.id,gate.side);if(!cr.ok)continue;const ar=actual.tryExit(b.id,gate.side);assert(!ar.ok);
   controls.push({kind:'ice-door',prefixDrags:i,blockId:b.id,gateId:gate.id,remainingIce:gate.frozen,side:gate.side,actual:ar,control:cr,singleVariableChange:'Set only the matched frozen gate remaining ice to0 in a cloned diagnostic state.',meaning:'Color, whole-shape span and empty sweep already fit; the real ice counter alone rejects this exit.'});break;
  }
 }
 const body=before.blocks.find(b=>b.id===next.blockId),outer=body?.layers[0];assert(perform(m,next));const after=m.snapshot();
 if(next.exitSide&&body.layers.length>1&&!controls.some(c=>c.kind==='shell')){
  const survivor=m.getBlock(body.id);assert(survivor);assert.equal(survivor.layers.length,body.layers.length-1);assert.notEqual(survivor.layers[0],outer);
  const actual=m.clone(),control=m.clone();actual.beginAction();control.beginAction();control.getBlock(body.id).layers[0]=outer;
  const ar=actual.tryExit(body.id,next.exitSide),cr=control.tryExit(body.id,next.exitSide);assert(!ar.ok);assert(cr.ok);
  controls.push({kind:'shell',prefixDrags:i+1,blockId:body.id,peelingDrag:next,outerColor:outer,retainedCoreColor:survivor.layers[0],bodySurvivesActualPeel:true,actualRetrySameDoor:ar,controlRetrySameDoor:cr,singleVariableChange:'Change only the surviving inner layer color back to its removed outer color in the cloned diagnostic state.',meaning:'The real shell event retains the same body with its inner color, requiring a later matching-color exit. Immediate reuse of the outer-color mouth fails; changing only that color permits it.'});
 }
 if(after.cleared!==before.cleared)trace.push({step:i+1,drag:next,cleared:after.cleared,shutters:after.shutters,gates:after.gates.map(g=>({id:g.id,color:g.color,frozen:g.frozen})),shellCore:body.layers.length>1?after.blocks.find(b=>b.id===body.id):null});
}
assert.equal(cases.length,3);assert.equal(new Set(cases.map(c=>c.wrongPark.blockId)).size,3);assert.equal(controls.length,3);assert(m.snapshot().complete);
const file=OUT+'/decisions-final172-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({status:'PASS',input,inputSha256:digest(fs.readFileSync(input)),levelSha256:digest(d.level),routeSha256:digest(d.drags),source,sourceSha256:digest(fs.readFileSync(source)),cases,controls,trace,final:m.snapshot(),limits:'Current-model diagnostics only. Three specific recoverable errors do not prove all states recoverable. Counterfactual controls are isolated clones, not adopted gameplay changes or difficulty certificates. Parent owns actual GUI/natural-clock verification.',playerSaveTouched:false,blindTested:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,cases:cases.map(c=>({prefix:c.prefixDrags,id:c.wrongPark.blockId,cells:c.wrongPark.shape.length})),controls:controls.map(c=>c.kind),complete:true}));
