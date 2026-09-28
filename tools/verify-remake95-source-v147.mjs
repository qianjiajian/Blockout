import fs from 'node:fs';import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
const sourcePath='.codex-temp/remaining98-v111/late/migrated95b/source-review-95-v111.json',sourceHash='194cb1031a9141baaa09253a1b55dbd59372c21a8927491e499c7835101cc18b';
const shapes={H3:[[0,0],[1,0],[2,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],SINGLE:[[0,0]],L3:[[0,0],[0,1],[1,1]]};
export function verifySource95(data){
 const {level:l,sourceAdaptation:r}=data;assert.equal(l.id,95);assert.equal(r.sourceReview,sourcePath);assert.equal(r.sourceReviewSha256,sourceHash);assert.equal(digest(fs.readFileSync(sourcePath)),sourceHash);
 const old=JSON.parse(fs.readFileSync(sourcePath)),sources={[sourcePath]:sourceHash};for(const [p,h]of Object.entries(old.bindings)){assert.equal(digest(fs.readFileSync(p)),h);sources[p]=h;}
 // Root checked the stable opening and frame471: source yellow hidden bodies
 // are mapped to pink solely to separate their ordinary yellow exit from the
 // opening yellow lock's exit. Counts are not inferred from adapted labels.
 const spec=[];const add=(id,kind,color,cohort='opening',props={})=>spec.push({id,kind,color,cohort,...props});
 add('left-key','H3','cyan','opening',{keyId:'blue-key'});add('right-key','H3','cyan','opening',{keyId:'red-key'});add('long-green','V2','green');
 ['green','purple','orange','purple','orange','purple','orange','green','cyan','green','purple','cyan'].forEach((c,i)=>add('open-single-'+i,'SINGLE',c));
 add('left-lock','SINGLE','yellow','opening',{lockedBy:'blue-key',lockCount:1});add('right-lock','SINGLE','red','opening',{lockedBy:'red-key',lockCount:1});
 add('hidden-lock','H2','blue','cover17',{lockedBy:'green-key',lockCount:1});add('hidden-orange','H2','orange','cover17');
 ['green','red','yellow','green','red','green','green','cyan'].forEach((c,i)=>add('hidden-single-'+i,'SINGLE',c,'cover17'));
 add('hidden-yellow-key','L3','yellow','cover17',{keyId:'green-key'});add('hidden-cyan-key','L3','cyan','cover17',{keyId:'green-key'});
 assert.equal(spec.length,29);assert.equal(r.mapping.length,29);assert.equal(new Set(r.mapping.map(m=>m.candidateId)).size,29);assert.equal(new Set(r.mapping.map(m=>m.sourceId)).size,29);
 for(const s of spec){const m=r.mapping.find(m=>m.sourceId===s.id),b=l.blocks.find(b=>b.id===m?.candidateId);assert(m&&b);assert.equal(m.stage,s.cohort);assert.equal(m.sourceKind,s.kind);assert.equal(m.sourceColor,s.color);assert.deepEqual(b.shape,shapes[s.kind]);assert.equal(b.color,s.cohort==='cover17'&&s.color==='yellow'?'pink':s.color);assert.equal(Boolean(b.shutterId),s.cohort==='cover17');
  for(const k of ['keyId','lockedBy','lockCount'])assert.equal(b[k],s[k]);assert(Object.keys(b).every(k=>['id','x','y','shape','color','keyId','lockedBy','lockCount','shutterId'].includes(k)));}
 const mapped=new Set(r.mapping.map(m=>m.candidateId)),extra=l.blocks.filter(b=>!mapped.has(b.id));assert.equal(extra.length,8);assert.deepEqual(extra.map(b=>b.shape.length).sort((a,b)=>a-b),[4,6,6,6,6,6,6,6]);
 for(const b of extra)assert(Object.keys(b).every(k=>['id','x','y','shape','color','shutterId'].includes(k)));assert.equal(extra.reduce((n,b)=>n+b.shape.length,0),46);assert.equal(l.blocks.reduce((n,b)=>n+b.shape.length,0),86);
 assert.equal(extra.filter(b=>b.shutterId).length,1);assert.equal(extra.find(b=>b.shutterId).shape.length,6);assert.equal(l.blocks.length,37);assert.equal(l.blocks.filter(b=>b.shutterId).length,13);
 assert.equal(l.shutters.length,1);assert.equal(l.shutters[0].count,17);assert(!l.shutters[0].skin);assert.equal(l.shutters[0].width*l.shutters[0].height,24);
 assert.equal(l.gates.length,8);const colors=['red','blue','yellow','purple','orange','green','cyan','pink'];assert.deepEqual(l.gates.map(g=>g.color).sort(),colors.sort());for(const g of l.gates)assert.equal(g.frozen??0,g.color==='purple'?9:g.color==='orange'?14:0);
 for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length);
 return{sources,sourceBodies:29,sourceArea:40,addedOrdinaryArea:46,keyCount:4,lockCount:3,lockValues:[1,1,1],hiddenSourceBodies:12,hiddenCandidateBodies:13,sourcePhysicalExits:14,candidatePhysicalExits:8,iceValues:[9,14],sourceYellowToPink:['hidden-single-2','hidden-yellow-key']};
}
const act=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
export function verifyMechanisms95(data,api){
 const {level,drags}=data,m=new api.PuzzleModel(level);m.startCountdown();const events=[],reveal=[],keyRemovals=[];
 for(const [i,d]of drags.entries()){const before=m.snapshot(),b=before.blocks.find(b=>b.id===d.blockId);act(m,d);const after=m.snapshot();
  if(b.keyId&&!after.blocks.some(a=>a.id===b.id)){keyRemovals.push(b.id);for(const lock of before.blocks.filter(a=>a.lockedBy)){const n=after.blocks.find(a=>a.id===lock.id);assert(n);assert.equal(n.lockCount??0,Math.max(0,lock.lockCount-Number(lock.lockedBy===b.keyId)));if(lock.lockedBy===b.keyId)events.push({step:i+1,keyBodyId:b.id,group:b.keyId,lockedBodyId:lock.id,from:lock.lockCount,to:n.lockCount??0});}}
  for(const s of after.shutters)if(s.revealed&&!before.shutters.find(t=>t.id===s.id).revealed){assert.equal(after.cleared,17);reveal.push({step:i+1,id:s.id,clearEvent:17});}}
 assert.equal(events.length,3);assert.equal(keyRemovals.length,4);assert.equal(reveal.length,1);assert(m.snapshot().complete);
 assert.equal(data.keyLockLocalCases.length,3);for(const c of data.keyLockLocalCases){assert(Number.isSafeInteger(c.beforeDrag)&&c.beforeDrag>=1);const prefix=drags.slice(0,c.beforeDrag-1),original=api.replayRevisedRoute(level,prefix);assert(original.valid);const b=JSON.parse(original.finalStateKey).blocks.find(b=>b.id===c.lockedId);assert(b?.lockCount>0);assert.equal(b.lockedBy,c.keyGroup);const copy=structuredClone(level),target=copy.blocks.find(b=>b.id===c.lockedId);delete target.lockedBy;delete target.lockCount;assert(api.replayRevisedRoute(copy,prefix).valid);assert(!api.replayRevisedRoute(level,[...prefix,c.blockedAction]).valid);const alternative=api.replayRevisedRoute(copy,[...prefix,c.blockedAction]);assert(alternative.valid,alternative.error);}
 return{keyRemovals,unlockEvents:events,reveal,singleLockRemovalCases:3,globalOrderClaimed:false};
}
