import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,OUTPUT,ruleGate,writeNew} from './remake61to70-v146.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';

export function checkSource68(data,api){
 const {level,drags,sourceBinding:binding,liftCausalCase:c}=data;assert.equal(level.id,68);
 const source=JSON.parse(fs.readFileSync(binding.sourceFile));assert.equal(digest(fs.readFileSync(binding.sourceFile)),binding.sourceFileSha256);
 for(const [file,sha] of Object.entries(source.evidenceBindings))assert.equal(digest(fs.readFileSync(file)),sha,'Source frame changed: '+file);
 assert.deepEqual(source.sourceUnknown.requiredGameplayFields,[]);
 const kinds={1:'SINGLE',2:'V2',3:'V3',4:'L3',6:'T4',7:'SQ2',8:'H2',9:'H3',10:'L4'},remaining=new Map(level.blocks.map(b=>[b.id,b]));let checked=0;
 for(const stage of [source.opening,...source.stages])for(const item of stage.items){
  const id=`v147-68-${item.sourceId}`,b=remaining.get(id);assert(b,id);assert.equal(b.color,item.color);assert.deepEqual(b.layers??[b.color],item.layers??[item.color]);assert.equal(b.frozen??0,item.frozen??0);assert.equal(b.movementAxis,item.movementAxis);assert.equal(b.shutterId,stage.id==='opening'?undefined:`v147-68-${stage.id}`);
  const art=api.matchFormalBlockShape(b.shape,'native-only');assert(art&&art.quarterTurns===0);assert.equal(kinds[art.shapeId],item.sourceId==='lift2-7'?'V3':item.kind);remaining.delete(id);checked++;
 }
 assert.equal(checked,27);const added=[...remaining.values()];assert.equal(added.length,7);assert(added.every(b=>b.id.includes('fill')&&!b.frozen&&!b.layers&&!b.movementAxis));assert.equal(added.filter(b=>!b.shutterId).reduce((n,b)=>n+b.shape.length,0),12);assert.equal(added.filter(b=>b.shutterId).reduce((n,b)=>n+b.shape.length,0),4);
 assert.equal(level.gates.length,5);assert.deepEqual(Object.fromEntries(level.gates.map(g=>[g.color,g.frozen??0])),{red:0,purple:5,yellow:3,green:6,blue:6});
 assert.deepEqual(level.shutters,[{id:'v147-68-cover10',x:0,y:6,width:7,height:4,count:10},{id:'v147-68-lift2',x:0,y:6,width:7,height:4,count:1,skin:'lift'}]);
 assert(!level.generators?.length);assert(level.blocks.every(b=>!b.keyId&&!b.lockedBy&&!b.lockCount&&!b.star&&!b.timedBombSeconds));
 const packing=binding.nativeAdaptationEvidence;assert.equal(digest(fs.readFileSync(packing.file)),packing.sha256);const records=JSON.parse(fs.readFileSync(packing.file));assert(records.filter(r=>!r.adapt.length).every(r=>r.searchTerminatedNormally&&r.exhaustiveNoTiling));assert(records.some(r=>r.w===7&&r.h===4&&r.passed&&r.adapt.length===1&&r.adapt[0]==='lift2-7->V3'));
 assert.deepEqual(c.prefix,drags.slice(0,c.beforeDrag-1));assert.equal(c.stillOccupiedAction.blockId,c.regionVacatedAction.blockId);assert.deepEqual(c.regionVacatedAction.path.slice(0,-1),c.stillOccupiedAction.path);
 const a=api.replayRevisedRoute(level,[...c.prefix,c.stillOccupiedAction]),b=api.replayRevisedRoute(level,[...c.prefix,c.regionVacatedAction]);assert(a.valid&&b.valid);const sa=JSON.parse(a.finalStateKey),sb=JSON.parse(b.finalStateKey);assert.equal(sa.cleared,sb.cleared);
 for(const id of c.regionIds){const x=sa.shutters.find(s=>s.id===id),y=sb.shutters.find(s=>s.id===id);assert(x.skin==='lift'&&!x.revealed&&y.revealed);const occupied=s=>s.blocks.some(block=>(!block.shutterId||s.shutters.find(q=>q.id===block.shutterId)?.revealed)&&block.shape.some(([dx,dy])=>block.x+dx>=x.x&&block.x+dx<x.x+x.width&&block.y+dy>=x.y&&block.y+dy<x.y+x.height));assert(occupied(sa));}
 assert.deepEqual(c.completeRecoveryRoute.slice(0,c.prefix.length+1),[...c.prefix,c.stillOccupiedAction]);assert.deepEqual(c.completeReleaseRoute.slice(0,c.prefix.length+1),[...c.prefix,c.regionVacatedAction]);
 for(const route of [c.completeRecoveryRoute,c.completeReleaseRoute]){const r=api.replayRevisedRoute(level,route);assert(r.valid&&r.complete);}
 return{source:{passed:true,levelSha256:digest(level),sourceFile:binding.sourceFile,sourceFileSha256:binding.sourceFileSha256,sourceBodies:checked,authoredBodies:level.blocks.length,evidenceFrames:source.evidenceBindings,nativeAdaptationEvidence:packing},liftCausalCase:{passed:true,beforeDrag:c.beforeDrag,regionIds:c.regionIds,sameClearCount:sa.cleared,completeBranches:2}};
}
if(process.argv[1]?.endsWith('check-source68.mjs')){ruleGate();const file=process.argv[2],data=JSON.parse(fs.readFileSync(file)),{api}=await loadApi(),report=checkSource68(data,api),out=`${OUTPUT}/checks/root-source68-${Date.now()}.json`;writeNew(out,{candidate:file,candidateSha256:digest(fs.readFileSync(file)),...report});console.log(JSON.stringify({out,source:report.source.passed,lift:report.liftCausalCase.passed}));}
