import fs from 'node:fs';import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
const file='.codex-temp/remaining98-v111/middle/lv92/source-review-92.json',hash='8c9d0b3abf09463aef06f153b58357d4017abce7fd8b721c24b0bdec61a46025';
const shapes={S:[[0,0]],H2:[[0,0],[1,0]],H3:[[0,0],[1,0],[2,0]],V2:[[0,0],[0,1]],V3:[[0,0],[0,1],[0,2]],SQ2:[[0,0],[1,0],[0,1],[1,1]],L3:[[0,0],[0,1],[1,1]]};
const gateSpec=[['upper-purple-4','purple',4,'purple'],['upper-blue-9','blue',9,'blue'],['upper-yellow-13','yellow',13,null],['upper-green-11','green',11,'green'],['upper-red-ordinary','red',0,'red'],['lower-purple-ordinary','purple',0,null],['lower-green-ordinary','green',0,null],['lower-yellow-10','yellow',10,'yellow'],['lower-red-10','red',10,'cyan'],['lower-blue-10','blue',10,'pink'],['lower-orange-10','orange',10,'orange']];
export function verifySource92(data){
 const {level:l,sourceAdaptation:r}=data;assert.equal(l.id,92);assert.equal(r.sourceReview,file);assert.equal(r.sourceReviewSha256,hash);assert.equal(digest(fs.readFileSync(file)),hash);
 const raw=JSON.parse(fs.readFileSync(file)),sources={[file]:hash};for(const[p,h]of Object.entries(raw.bindings)){assert.equal(digest(fs.readFileSync(p)),h);sources[p]=h;}
 assert.equal(l.blocks.length,35);assert.equal(r.sourceMapping.length,29);assert.equal(new Set(r.sourceMapping.map(m=>m.blockId)).size,29);
 for(const[cohort,ledger]of Object.entries(raw.sourceFacts.pieceLedger)){
  const maps=r.sourceMapping.filter(m=>m.sourceStage===cohort);assert.deepEqual(maps.map(m=>m.sourceLabel.replace(/-[ab]$/,'')).sort(),ledger.map(s=>s[0]).sort());
  for(const m of maps){const label=m.sourceLabel.replace(/-[ab]$/,''),b=l.blocks.find(b=>b.id===m.blockId);assert(b);const kind=label.match(/(SQ2|H3|H2|V3|V2|L3|S)$/)?.[0];assert(kind);assert.deepEqual(b.shape,shapes[kind]);const axis=label.includes('axis');assert.equal(b.color,axis?'cyan':label.match(/^[a-z]+/)[0]);assert.equal(b.movementAxis,axis?'horizontal':undefined);assert.deepEqual(b.layers,label.includes('shell')?['red','purple']:undefined);assert.equal(b.shutterId,cohort==='opening'?undefined:'r147-92-cover17');assert(Object.keys(b).every(k=>['id','x','y','shape','color','shutterId','layers','movementAxis'].includes(k)));}
 }
 const mapped=new Set(r.sourceMapping.map(m=>m.blockId)),fill=l.blocks.filter(b=>!mapped.has(b.id));assert.equal(fill.length,6);assert.equal(fill.reduce((n,b)=>n+b.shape.length,0),9);assert.equal(fill.filter(b=>b.shutterId).length,1);assert.equal(fill.find(b=>b.shutterId).shape.length,2);assert.equal(l.blocks.reduce((n,b)=>n+b.shape.length,0),68);
 assert.equal(r.addedOrdinaryBlocks.length,6);for(const b of fill){const a=r.addedOrdinaryBlocks.find(a=>a.id===b.id);assert(a);assert.equal(a.color,b.color);assert.deepEqual(a.shape,b.shape);assert(Object.keys(b).every(k=>['id','x','y','shape','color','shutterId'].includes(k)));}
 assert.equal(l.shutters.length,1);assert.equal(l.shutters[0].count,17);assert.equal(l.shutters[0].width*l.shutters[0].height,35);assert(!l.shutters[0].skin);assert.equal(l.blocks.filter(b=>b.shutterId).length,14);
 const bindings=r.exitAdaptation.gateBindings;assert.equal(bindings.length,11);assert.equal(new Set(bindings.map(m=>m.sourceId)).size,11);assert.equal(l.gates.length,8);
 for(const[id,color,frozen,to]of gateSpec){const m=bindings.find(m=>m.sourceId===id);assert(m);assert.equal(m.sourceColor,color);assert.equal(m.sourceFrozen,frozen);assert.equal(m.candidateColor,to);assert(sources[m.sourceFrame]);
  if(!to){assert.equal(m.candidateGate,null);assert.equal(m.candidateGateId,null);continue;}const g=l.gates.find(g=>g.id===m.candidateGateId);assert(g);assert.deepEqual(m.candidateGate,g);assert.equal(g.color,to);assert.equal(g.frozen??0,frozen);assert(Object.keys(g).every(k=>['id','color','side','offset','size','portals','frozen'].includes(k)));}
 for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length);
 return{sources,sourceBodies:29,sourceArea:59,candidateBodies:35,candidateArea:68,ordinaryAddedArea:9,sourceExits:11,candidateExits:8,removed:['lower-purple-ordinary','lower-green-ordinary','upper-yellow-13'],retainedIce:[4,9,10,10,10,10,11],necessaryGateColorSplits:2,axisCarriers:1,shells:1,exactSourceCopy:false};
}
const act=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
export function verifyMechanisms92(data,api){
 const{level,drags}=data,m=new api.PuzzleModel(level);m.startCountdown();const peels=[],reveals=[];
 for(const[i,d]of drags.entries()){const before=m.snapshot(),b=before.blocks.find(b=>b.id===d.blockId);act(m,d);const after=m.snapshot(),retained=after.blocks.find(b=>b.id===d.blockId);
  if(after.cleared>before.cleared&&retained){assert.deepEqual(b.layers,['red','purple']);assert.deepEqual(retained.layers,['purple']);peels.push({step:i+1,blockId:b.id,clearEvent:after.cleared});}
  for(const s of after.shutters)if(s.revealed&&!before.shutters.find(t=>t.id===s.id).revealed){assert.equal(after.cleared,17);reveals.push({id:s.id,step:i+1,clearEvent:17});}}
 assert.equal(peels.length,1);assert.equal(reveals.length,1);assert.equal(m.snapshot().cleared,36);assert(m.snapshot().complete);
 const c=data.mechanismReview.axisLocalCase;assert(c);assert.deepEqual(c.prefix,drags.slice(0,c.afterStep));const initial=api.replayRevisedRoute(level,c.prefix);assert(initial.valid);const copy=structuredClone(level),b=copy.blocks.find(b=>b.id===c.action.blockId);assert.equal(b.movementAxis,'horizontal');delete b.movementAxis;
 const relaxed=api.replayRevisedRoute(copy,c.prefix);assert(relaxed.valid);const snapshot=JSON.parse(relaxed.finalStateKey);snapshot.blocks.find(x=>x.id===b.id).movementAxis='horizontal';assert.deepEqual(snapshot,JSON.parse(initial.finalStateKey));assert(!api.replayRevisedRoute(level,[...c.prefix,c.action]).valid);const allowed=api.replayRevisedRoute(copy,[...c.prefix,c.action]);assert(allowed.valid,allowed.error);
 return{peels,reveals,axisSingleFieldCases:1,allInventoryCompleted:true,globalAxisOrderClaimed:false};
}
