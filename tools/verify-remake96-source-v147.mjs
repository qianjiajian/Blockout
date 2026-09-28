import fs from 'node:fs';import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
const ledger='deliverables/remake91-100-v146-20260924/agent95-98/source96-coordinate-ledger-1790264929048.json';
const ledgerHash='97970a4cf5e7e1447ebfdcd240dc2148ce630a52a62d700b40bcd63de94a0fc9';
const L3=[[0,0],[0,1],[1,1]],SQ3=Array.from({length:9},(_,i)=>[i%3,Math.floor(i/3)]);
// Root directly reviewed the pristine screenshot and515 frame, including the
// full footprints of both V3 axes and the paired ice/gate colors.
export function verifySource96(data){
 const l=data.level;assert.equal(l.id,96);assert.equal(digest(fs.readFileSync(ledger)),ledgerHash);const raw=JSON.parse(fs.readFileSync(ledger)),r=JSON.parse(fs.readFileSync(data.sourceReview));
 assert.equal(digest(fs.readFileSync(data.sourceReview)),data.sourceReviewSha256);assert.equal(r.ledgerPath,ledger);assert.equal(r.ledgerSha256,ledgerHash);assert.deepEqual(r.opening,raw.opening);assert.deepEqual(r.gates,raw.gates);
 const sources={[ledger]:ledgerHash,[data.sourceReview]:data.sourceReviewSha256};for(const[p,h]of Object.entries(raw.evidenceBindings)){assert.equal(digest(fs.readFileSync(p)),h);sources[p]=h;}assert.equal(digest(fs.readFileSync(raw.sourceVideo)),raw.sourceVideoSha256);sources[raw.sourceVideo]=raw.sourceVideoSha256;
 assert.equal(l.blocks.length,31);assert.equal(r.mapping.length,31);assert.equal(new Set(r.mapping.map(m=>m.sourceId)).size,31);assert.equal(new Set(r.mapping.map(m=>m.candidateId)).size,31);
 let reoriented=0;for(const s of raw.opening){const m=r.mapping.find(m=>m.sourceId===s.sourceId),b=l.blocks.find(b=>b.id===m?.candidateId);assert(m&&b);assert.equal(m.sourceKind,s.kind);assert.deepEqual(m.sourceShape,s.shape);assert.deepEqual(m.sourceAnchor,[s.x,s.y]);assert.deepEqual(m.candidateShape,b.shape);assert.deepEqual(m.candidateAnchor,[b.x,b.y]);assert.equal(m.areaDifference,b.shape.length-s.shape.length);
  assert.equal(b.color,s.color);assert.equal(b.frozen,s.frozen);assert.equal(b.movementAxis,s.movementAxis);const shape=s.sourceId==='96-24'?SQ3:s.kind==='L3'?L3:s.shape;assert.deepEqual(b.shape,shape);
  if(s.kind==='L3'&&JSON.stringify(s.shape)!==JSON.stringify(shape))reoriented++;assert(Object.keys(b).every(k=>['id','color','x','y','shape','frozen','movementAxis'].includes(k)));
 }
 assert.equal(raw.opening.reduce((n,b)=>n+b.shape.length,0),56);assert.equal(l.blocks.reduce((n,b)=>n+b.shape.length,0),64);assert.equal(reoriented,3);
 assert.equal(l.gates.length,8);for(const s of raw.gates){const g=l.gates.find(g=>g.color===s.color);assert(g);assert.equal(g.frozen??0,s.frozen??0);assert(Object.keys(g).every(k=>['id','color','side','offset','size','portals','frozen'].includes(k)));}
 for(const k of ['shutters','generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length);
 return{sources,sourceBodies:31,candidateBodies:31,sourceArea:56,candidateArea:64,areaAdaptation:{sourceId:'96-24',from:'S',to:'SQ3',addedArea:8},nativeOrientationChanges:3,axisCarriers:4,ice:[3,5],gates:{purple:16,yellow:14,green:3,orange:12,red:10,cyan:8,blue:0,pink:0},exactSourceCopy:false};
}
const act=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
export function verifyMechanisms96(data,api){
 const{level,drags}=data,m=new api.PuzzleModel(level);m.startCountdown();const thaws=[],gateThaws=[];
 for(const[i,d]of drags.entries()){const before=m.snapshot();act(m,d);const after=m.snapshot();for(const b of after.blocks){const spec=level.blocks.find(s=>s.id===b.id);assert.equal(b.frozen,Math.max(0,(spec.frozen??0)-after.cleared));if(before.blocks.find(s=>s.id===b.id)?.frozen>0&&b.frozen===0)thaws.push({id:b.id,clearEvent:after.cleared,step:i+1});}for(const g of after.gates){const spec=level.gates.find(s=>s.id===g.id);assert.equal(g.frozen,Math.max(0,(spec.frozen??0)-after.cleared));if(before.gates.find(s=>s.id===g.id).frozen>0&&!g.frozen)gateThaws.push({id:g.id,clearEvent:after.cleared});}}
 assert(m.snapshot().complete);assert.equal(thaws.length,2);assert.deepEqual(thaws.map(t=>t.clearEvent).sort((a,b)=>a-b),[3,5]);assert.equal(gateThaws.length,6);
 const cases=data.axisLocalCases;assert.equal(cases.length,2);assert.equal(new Set(cases.map(c=>c.blockId)).size,2);
 for(const c of cases){assert.deepEqual(c.prefix,drags.slice(0,c.beforeDrag-1));const original=api.replayRevisedRoute(level,c.prefix);assert(original.valid);const copy=structuredClone(level),b=copy.blocks.find(b=>b.id===c.blockId),axis=b.movementAxis;assert(axis);assert.equal(axis,c.axis);delete b.movementAxis;const other=api.replayRevisedRoute(copy,c.prefix);assert(other.valid);const state=JSON.parse(other.finalStateKey);state.blocks.find(s=>s.id===b.id).movementAxis=axis;assert.deepEqual(state,JSON.parse(original.finalStateKey));assert(!api.replayRevisedRoute(level,[...c.prefix,c.blockedAction]).valid);const allowed=api.replayRevisedRoute(copy,[...c.prefix,c.blockedAction]);assert(allowed.valid,allowed.error);}
 return{thaws,gateThaws,axisSingleFieldCases:2,axisCarriers:4,iceCausalCases:0,iceGlobalDifficultyContributionClaimed:false,allInventoryCompleted:true};
}
