import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,OUTPUT,ruleGate,writeNew} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';

const sourceFile=`${OUTPUT}/source-audit/source-review69.json`;
const shapeEvidence=`${OUTPUT}/source-audit/source-footprints69-v3-1790254100010.json`;
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
const rectangles={SINGLE:rect(1,1),H2:rect(2,1),H3:rect(3,1),V2:rect(1,2),V3:rect(1,3),SQ2:rect(2,2)};
const norm=s=>JSON.stringify([...s].sort((a,b)=>a[1]-b[1]||a[0]-b[0]));
const hash=p=>digest(fs.readFileSync(p));
export function checkSource69(data,api){
 const {level}=data;assert.equal(level.id,69);const source=JSON.parse(fs.readFileSync(sourceFile)),shapes=JSON.parse(fs.readFileSync(shapeEvidence));
 if(data.sourceBinding){assert.equal(data.sourceBinding.sourceFile,sourceFile);assert.equal(data.sourceBinding.sourceFileSha256,hash(sourceFile));assert.equal(data.sourceBinding.footprintFileSha256,hash(data.sourceBinding.footprintFile));const finalShapes=JSON.parse(fs.readFileSync(data.sourceBinding.footprintFile));assert.equal(finalShapes.levelSha256,digest(level));}
 assert.deepEqual(source.sourceUnknown.requiredGameplayFields,[]);assert.deepEqual(shapes.unknown,[]);
 for(const [p,h] of Object.entries(source.evidenceBindings))assert.equal(hash(p),h);
 for(const f of shapes.frameBindings)assert.equal(hash(f.path),f.sha256);
 const remaining=new Map(level.blocks.map(b=>[b.id,b])),rows=[],assets={};
 for(const stage of [source.opening,...source.stages])for(const item of stage.items){
  const blockId=`v147-69-${item.sourceId}`,b=remaining.get(blockId),observed=shapes.rows.find(r=>r.sourceId===item.sourceId);assert(b,blockId);remaining.delete(blockId);
  assert.equal(b.color,item.color);assert.deepEqual(b.layers??[b.color],item.layers??[item.color]);assert.equal(b.frozen??0,item.frozen??0);assert.equal(b.movementAxis,item.movementAxis);assert.equal(b.shutterId,stage.id==='opening'?undefined:`v147-69-${stage.id}`);
  const sourceShape=observed?.sourceLocalCells??rectangles[item.kind];assert(sourceShape);
  const native=api.matchFormalBlockShape(b.shape,'native-only');assert.equal(native?.quarterTurns,0);const art=api.auditCandidateBlockArt({id:69,blocks:[b]});assert(art.passed);
  for(const a of art.requirements){const file='public/'+a.path.replace(/^\//,'');assert(fs.existsSync(file));assets[file]=hash(file);}
  if(item.sourceId==='opening-2'){assert.deepEqual(b.shape,[[0,0]]);assert.equal(sourceShape.length-b.shape.length,2);}
  else if(observed){const expected={L3:4,T4:6,L4:10}[item.kind];assert.equal(native.shapeId,expected);assert.equal(b.shape.length,sourceShape.length);}
  else assert.equal(norm(b.shape),norm(sourceShape));
  const sameFootprint=norm(sourceShape)===norm(b.shape),sourceNativeMatch=api.matchFormalBlockShape(sourceShape,'native-only')??null,sourceArt=api.auditCandidateBlockArt({id:69,blocks:[{...b,shape:sourceShape}]});
  if(!sameFootprint)assert(!sourceNativeMatch||!sourceArt.passed,'No unexplained source-compatible footprint change');
  rows.push({blockId,sourceStage:stage.id,sourceShape,candidateShape:b.shape,sameFootprint,sourceNativeMatch,candidateNativeMatch:native,sourceArt,adaptationReason:sameFootprint?null:item.sourceId==='opening-2'?'Source blue/cyan L3 shell lacks native whole-shell art; native single-cell shell removes exactly the two excess visible cells while keeping its layers and source identity.':'Source actual irregular orientation has no native complete art; use the same-family, same-area existing q0 footprint.'});
 }
 assert.equal(rows.length,34);assert.equal(level.blocks.length,35);assert.equal(remaining.size,1);const added=[...remaining.values()][0];assert.equal(added.id,'v147-69-cover6-fill-0');assert.equal(added.shutterId,'v147-69-cover6');assert.deepEqual(added.shape,[[0,0]]);assert(!added.frozen&&!added.layers&&!added.movementAxis);
 assert.equal(level.gates.length,6);assert.deepEqual(Object.fromEntries(level.gates.map(g=>[g.color,g.frozen??0])),{red:0,blue:3,green:6,yellow:9,cyan:24,purple:13});
 assert.equal(level.shutters.length,5);for(const s of source.stages){const actual=level.shutters.find(q=>q.id===`v147-69-${s.id}`);assert(actual);assert.equal(actual.width*actual.height,s.sourceOccupied+(s.id==='cover6'?1:0));if(s.kind==='lift')assert.equal(actual.skin,'lift');else{assert(!actual.skin||actual.skin==='shutter');assert.equal(actual.count,s.count);}}
 const cover=level.shutters.find(s=>s.id==='v147-69-cover18'),lift=level.shutters.find(s=>s.skin==='lift');for(const k of ['x','y','width','height'])assert.equal(lift[k],cover[k]);
 assert.equal(level.blocks.filter(b=>b.layers?.length===2).length,6);assert.equal(level.blocks.filter(b=>b.frozen).length,2);assert(!level.generators?.length);assert(level.blocks.every(b=>!b.keyId&&!b.lockedBy&&!b.lockCount&&!b.star&&!b.timedBombSeconds));
 assert.equal(level.blocks.filter(b=>!b.shutterId).reduce((n,b)=>n+b.shape.length,0),19);assert.equal(rows.filter(r=>!r.sameFootprint).length,5);
 return{levelId:69,status:'PASS',levelSha256:digest(level),unknown:[],sourceFile,sourceFileSha256:hash(sourceFile),sourceFootprintEvidence:shapeEvidence,sourceFootprintEvidenceSha256:hash(shapeEvidence),frameBindings:source.evidenceBindings,sourceBodies:34,authoredBodies:35,sourceFootprintChanges:5,rows,assets,scope:'Source inventory, per-body attributes, actual footprints and necessary native/capacity adaptations only; complete route, floor and Pointer are separate checks.'};
}
export function checkLift69(data,api){
 const{level,drags,liftCausalCase:c}=data;assert(c);assert.deepEqual(c.prefix,drags.slice(0,c.beforeDrag-1));assert.equal(c.stillOccupiedAction.blockId,c.regionVacatedAction.blockId);assert.deepEqual(c.regionVacatedAction.path.slice(0,-1),c.stillOccupiedAction.path);
 const a=api.replayRevisedRoute(level,[...c.prefix,c.stillOccupiedAction]),b=api.replayRevisedRoute(level,[...c.prefix,c.regionVacatedAction]);assert(a.valid&&b.valid);const sa=JSON.parse(a.finalStateKey),sb=JSON.parse(b.finalStateKey);assert.equal(sa.cleared,sb.cleared);
 for(const id of c.regionIds){const x=sa.shutters.find(s=>s.id===id),y=sb.shutters.find(s=>s.id===id);assert(x.skin==='lift'&&!x.revealed&&y.revealed);assert(sa.blocks.some(block=>(!block.shutterId||sa.shutters.find(q=>q.id===block.shutterId)?.revealed)&&block.shape.some(([dx,dy])=>block.x+dx>=x.x&&block.x+dx<x.x+x.width&&block.y+dy>=x.y&&block.y+dy<x.y+x.height)));}
 assert.deepEqual(c.completeRecoveryRoute.slice(0,c.prefix.length+1),[...c.prefix,c.stillOccupiedAction]);assert.deepEqual(c.completeReleaseRoute.slice(0,c.prefix.length+1),[...c.prefix,c.regionVacatedAction]);for(const route of [c.completeRecoveryRoute,c.completeReleaseRoute]){const r=api.replayRevisedRoute(level,route);assert(r.valid&&r.complete);}
 const m=new api.PuzzleModel(level);m.startCountdown();const unitRevealEvents=[];
 function observe(before,drag,phase){const after=m.snapshot();for(const co of after.shutters.filter(s=>s.revealed&&!before.shutters.find(x=>x.id===s.id)?.revealed)){const ice=level.blocks.filter(b=>b.shutterId===co.id&&b.frozen).map(spec=>{const actual=after.blocks.find(b=>b.id===spec.id);assert(actual);assert.equal(actual.frozen,spec.frozen,'Newly revealed hidden ice starts at its source initial value');return{blockId:spec.id,initial:spec.frozen,observed:actual.frozen};});unitRevealEvents.push({drag,phase,regionId:co.id,ice});}}
 for(const [i,d] of drags.entries()){m.beginAction();for(const [unit,p] of d.path.entries()){const before=m.snapshot();assert(m.moveBlockStep(d.blockId,...p));observe(before,i+1,`unit-${unit+1}`);}if(d.exitSide){const before=m.snapshot();assert(m.tryExit(d.blockId,d.exitSide).ok);observe(before,i+1,'exit');}assert(m.commitAction());}
 assert(m.snapshot().complete);assert.equal(unitRevealEvents.length,5);assert.deepEqual(unitRevealEvents.flatMap(e=>e.ice).map(x=>x.initial).sort((a,b)=>a-b),[3,5]);
 return{passed:true,beforeDrag:c.beforeDrag,regionIds:c.regionIds,sameClearCount:sa.cleared,completeBranches:2,unitRevealEvents};
}
if(process.argv[1]?.endsWith('check-source69.mjs')){ruleGate();const file=process.argv[2],data=JSON.parse(fs.readFileSync(file)),{api}=await loadApi(),source=checkSource69(data,api),liftCausalCase=data.liftCausalCase?checkLift69(data,api):null,out=`${OUTPUT}/checks/root-source69-${Date.now()}.json`;writeNew(out,{candidate:file,candidateSha256:hash(file),source,liftCausalCase});const footprints=`${OUTPUT}/checks/footprint-binding69-${Date.now()}.json`;writeNew(footprints,{...source,candidate:file,candidateSha256:hash(file)});console.log(JSON.stringify({out,footprints,status:source.status,rows:source.rows.length,lift:liftCausalCase?.passed??'NOT_RUN'}));}
