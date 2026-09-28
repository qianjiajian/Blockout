import fs from 'node:fs';import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
const rawFile='.codex-temp/remaining98-v111/middle/lv97/source-review-97.json',rawHash='86a74735fc317b6447cfccf58dc07a65d919b4726d81857683b9b6af555b297f';
const shapes={S:[[0,0]],H2:[[0,0],[1,0]],H3:[[0,0],[1,0],[2,0]],V2:[[0,0],[0,1]],L3:[[0,0],[0,1],[1,1]],T4:[[1,0],[0,1],[1,1],[2,1]]};
const gateTable=[['upper-right-red','red',0,'red'],['upper-right-blue','blue',3,'blue'],['upper-left-yellow','yellow',4,'yellow'],['upper-left-purple','purple',3,'purple'],['lower-left-red','red',7,'orange'],['lower-right-green','green',7,'green'],['lower-bottom-blue','blue',7,'cyan'],['lower-right-yellow','yellow',7,'pink'],['lower-left-purple','purple',7,null],['lower-bottom-red','red',7,null]];
// Root viewed source608/625/713. In particular the source has three keys and
// three locks, and a genuine lift with two L3 bodies plus a T4 (ten cells).
export function verifySource97(data){
 const l=data.level;assert.equal(l.id,97);assert.equal(digest(fs.readFileSync(rawFile)),rawHash);const raw=JSON.parse(fs.readFileSync(rawFile));
 assert.equal(digest(fs.readFileSync(data.sourceReview)),data.sourceReviewSha256);const r=JSON.parse(fs.readFileSync(data.sourceReview));assert.equal(r.sourcePath,rawFile);assert.equal(r.sourceSha256,rawHash);assert.deepEqual(r.sourceFacts,raw.sourceFacts);
 const sources={[rawFile]:rawHash,[data.sourceReview]:data.sourceReviewSha256};for(const[p,h]of Object.entries(raw.bindings)){assert.equal(digest(fs.readFileSync(p)),h);sources[p]=h;}
 assert.equal(r.openingMappings.length,30);assert.equal(new Set(r.openingMappings.map(m=>m.sourceId)).size,30);const ids=new Set(),deleted=[];
 for(const cohort of ['openingUpper','openingLower'])for(const[i,[label,x,y]]of raw.sourceFacts.pieceLedger[cohort].entries()){
  const sourceId=cohort+'-'+i,m=r.openingMappings.find(m=>m.sourceId===sourceId);assert(m);assert.equal(m.label,label);assert.equal(m.cohort,cohort);assert.deepEqual(m.anchor,[x,y]);
  const kind=label.match(/(H2|H3|V2|L3|T4|S)$/)[0],color=label.match(/^[a-z]+/)[0];
  if(m.action==='capacity-removed'){assert.equal(kind,'S');assert(!label.includes('key')&&!label.includes('lock'));assert(!m.targetId&&!m.target);deleted.push(sourceId);continue;}
  assert.equal(m.action,'retained');const b=l.blocks.find(b=>b.id===m.targetId);assert(b);assert.deepEqual(m.target,b);assert(!ids.has(b.id));ids.add(b.id);
  assert.equal(b.color,cohort==='openingLower'?({red:'orange',blue:'cyan',yellow:'pink'}[color]??color):color);
  assert.deepEqual(b.shape,sourceId==='openingUpper-0'?shapes.S:shapes[kind]);assert.equal(b.shutterId,undefined);
  const key=label.match(/-(red|blue|green)-key/),lock=label.match(/-(red|blue|green)-lock1/);assert.equal(b.keyId,key?key[1]+'-key':undefined);assert.equal(b.lockedBy,lock?lock[1]+'-key':undefined);assert.equal(b.lockCount,lock?1:undefined);
  assert(Object.keys(b).every(k=>['id','color','x','y','shape','keyId','lockedBy','lockCount'].includes(k)));
 }
 assert.equal(deleted.length,11);assert.equal(ids.size,19);assert.equal(l.blocks.filter(b=>!b.shutterId).reduce((n,b)=>n+b.shape.length,0),42);
 assert.equal(r.hiddenMappings.length,3);assert.equal(new Set(r.hiddenMappings.map(m=>m.sourceId)).size,3);
 for(const[label,cells]of raw.sourceFacts.pieceLedger.lift){const color=label.match(/^[a-z]+/)[0],kind=label.match(/(L3|T4)$/)[0],m=r.hiddenMappings.find(m=>m.sourceId==='lift-'+color);assert(m);assert.equal(m.label,label);assert.deepEqual(m.sourceCells,cells);const b=l.blocks.find(b=>b.id===m.targetId);assert(b);assert.deepEqual(m.target,b);assert.equal(b.color,color);assert.deepEqual(b.shape,shapes[kind]);assert.equal(b.shutterId,'r147-97-lift');assert(Object.keys(b).every(k=>['id','color','x','y','shape','shutterId'].includes(k)));assert(!ids.has(b.id));ids.add(b.id);}
 const fill=l.blocks.filter(b=>!ids.has(b.id));assert.deepEqual(fill.slice().sort((a,b)=>a.id.localeCompare(b.id)),r.fillers.slice().sort((a,b)=>a.id.localeCompare(b.id)));assert.equal(fill.length,3);assert.deepEqual(fill.map(b=>b.shape.length).sort(),[1,1,3]);for(const b of fill){assert.equal(b.shutterId,'r147-97-lift');assert(Object.keys(b).every(k=>['id','color','x','y','shape','shutterId'].includes(k)));assert.deepEqual(b.shape,b.shape.length===3?shapes.H3:shapes.S);}
 assert.equal(l.blocks.length,25);assert.deepEqual(l.shutters,[{id:'r147-97-lift',x:1,y:3,width:5,height:3,count:0,skin:'lift'}]);
 assert.equal(l.gates.length,8);assert.equal(r.gateMappings.length,10);assert.equal(new Set(r.gateMappings.map(m=>m.sourceId)).size,10);
 for(const[id,color,count,to]of gateTable){const m=r.gateMappings.find(m=>m.sourceId===id);assert(m);assert.deepEqual(m.source,{color,frozen:count});if(to===null){assert.equal(m.action,'capacity-removed');assert(!m.targetId&&!m.target);continue;}assert.equal(m.action,'retained-and-relocated');const g=l.gates.find(g=>g.id===m.targetId);assert(g);assert.deepEqual(m.target,g);assert.equal(g.color,to);assert.equal(g.frozen??0,count);assert(Object.keys(g).every(k=>['id','color','side','offset','size','portals','frozen'].includes(k)));}
 for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length);
 return{sources,sourceBodies:33,sourceOpeningArea:54,candidateOpeningArea:42,deletedOrdinarySingles:deleted,redH2ReducedToSingle:true,sourceHiddenBodies:3,sourceHiddenArea:10,candidateHiddenBodies:6,candidateHiddenArea:15,keys:3,locks:[1,1,1],sourceGates:10,candidateGates:8,iceGateValues:[3,3,4,7,7,7,7],exactSourceCopy:false};
}
export function verifyMechanisms97(data,api){
 const{level,drags}=data,m=new api.PuzzleModel(level);m.startCountdown();const keys=[],reveals=[];let unitChecks=0;
 function observe(before,after){unitChecks++;for(const b of before.blocks.filter(b=>b.keyId&&!after.blocks.some(a=>a.id===b.id)))keys.push({id:b.id,keyId:b.keyId,clearEvent:after.cleared});for(const b of after.blocks.filter(b=>b.lockedBy)){const spec=level.blocks.find(a=>a.id===b.id);assert.equal(b.lockCount,Math.max(0,spec.lockCount-keys.filter(k=>k.keyId===b.lockedBy).length));}for(const s of after.shutters)if(s.revealed&&!before.shutters.find(a=>a.id===s.id).revealed){const region=level.shutters.find(a=>a.id===s.id);assert.equal(region.skin,'lift');assert(after.blocks.filter(b=>!b.shutterId).every(b=>b.shape.every(([dx,dy])=>b.x+dx<region.x||b.x+dx>=region.x+region.width||b.y+dy<region.y||b.y+dy>=region.y+region.height)));reveals.push({id:s.id,clearEvent:after.cleared,unitCheck:unitChecks});}}
 for(const d of drags){m.beginAction();for(const p of d.path){const before=m.snapshot();assert(m.moveBlockStep(d.blockId,...p));observe(before,m.snapshot());}if(d.exitSide){const before=m.snapshot();assert(m.tryExit(d.blockId,d.exitSide).ok);observe(before,m.snapshot());}assert(m.commitAction());}
 assert(m.snapshot().complete);assert.equal(keys.length,3);assert.equal(reveals.length,1);assert.equal(m.snapshot().cleared,25);
 const cases=data.mechanismEvidence;assert.equal(cases.lockCases.length,2);assert.equal(cases.iceGateCases.length,3);
 for(const [kind,rows]of [['lock',cases.lockCases],['gateIce',cases.iceGateCases]])for(const c of rows){
  assert(Number.isSafeInteger(c.afterDrags)&&c.afterDrags>=0);assert.deepEqual(c.prefix,drags.slice(0,c.afterDrags));assert.equal(c.action.blockId,c.blockId);const original=api.replayRevisedRoute(level,c.prefix);assert(original.valid);const copy=structuredClone(level);
  if(kind==='lock'){const b=copy.blocks.find(b=>b.id===c.blockId);assert.equal(b.lockedBy,c.keyGroup);assert.deepEqual(c.changedFields,['lockedBy','lockCount']);delete b.lockedBy;delete b.lockCount;}else{const g=copy.gates.find(g=>g.id===c.gateId);assert(g.frozen>0);delete g.frozen;}
  const prefix=api.replayRevisedRoute(copy,c.prefix);assert(prefix.valid);const expected=JSON.parse(original.finalStateKey),restored=JSON.parse(prefix.finalStateKey);
  if(kind==='lock'){const a=expected.blocks.find(b=>b.id===c.blockId),b=restored.blocks.find(b=>b.id===c.blockId);for(const k of ['lockedBy','lockCount'])b[k]=a[k];}else restored.gates.find(g=>g.id===c.gateId).frozen=expected.gates.find(g=>g.id===c.gateId).frozen;
  assert.deepEqual(restored,expected);assert(!api.replayRevisedRoute(level,[...c.prefix,c.action]).valid);const allowed=api.replayRevisedRoute(copy,[...c.prefix,c.action]);assert(allowed.valid,allowed.error);
 }
 return{keys,reveals,unitChecks,lockPairLocalCases:2,gateIceSingleFieldCases:3,allInventoryCompleted:true,globalDifficultyContributionClaimed:false};
}
