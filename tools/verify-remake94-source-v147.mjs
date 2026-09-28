import fs from 'node:fs';import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
const file='.codex-temp/remaining98-v111/middle/lv94/source-review-94.json',hash='5daecb7d024fd2b7afd78f9776cc057c87bc695f17b1d8308fd8fe3188cb3dda';
const shapes={S:[[0,0]],H2:[[0,0],[1,0]],H3:[[0,0],[1,0],[2,0]],V2:[[0,0],[0,1]],V3:[[0,0],[0,1],[0,2]],L3:[[0,0],[0,1],[1,1]],T4:[[1,0],[0,1],[1,1],[2,1]],SQ2:[[0,0],[1,0],[0,1],[1,1]]};
const altered={'cover5/cyanH3':'S','cover5/greenV3':'S','cover20/redH2':'S','cover8/redH2':'S','cover8/cyanH2':'S','cover8/redL4':'L3','cover16/blueH2':'V2'};
const gates={blue:0,yellow:3,green:5,red:9,purple:18,cyan:25};
// Root inspected263/295/372/385/394/400: all five ice colors and the actual
// six-body second lift layer, including its initially hidden greenV3 ice3.
export function verifySource94(data){
 const{level:l,sourceAdaptation:r}=data;assert.equal(l.id,94);assert.equal(r.sourceReview,file);assert.equal(digest(fs.readFileSync(file)),hash);const raw=JSON.parse(fs.readFileSync(file)),sources={[file]:hash};
 for(const[p,h]of Object.entries(raw.bindings)){assert.equal(digest(fs.readFileSync(p)),h);sources[p]=h;}
 assert.equal(l.blocks.length,40);assert.equal(r.sourceMapping.length,37);assert.equal(new Set(r.sourceMapping.map(m=>m.blockId)).size,37);
 const mapped=[],changes=[];for(const[cohort,ledger]of Object.entries(raw.sourceFacts.pieceLedger)){
  const stage=cohort==='opening'?'opening':cohort==='liftAfterCover20'?'r147-94-lift':`r147-94-c${cohort.slice(5)}`,maps=r.sourceMapping.filter(m=>m.sourceStage===stage);assert.deepEqual(maps.map(m=>m.sourceLabel).sort(),ledger.slice().sort());
  for(const label of ledger){const m=maps.find(m=>m.sourceLabel===label),b=l.blocks.find(b=>b.id===m?.blockId);assert(m&&b);const oldKind=label.replace(/-[ab]$/,'').match(/(SQ2|H3|H2|V3|V2|L4|L3|T4|S)$/)?.[0],kind=altered[cohort+'/'+label]??oldKind;assert(kind);assert.equal(m.candidateShape,kind);assert.deepEqual(b.shape,shapes[kind]);const color=label.replace(/^ice3-/,'').match(/^[a-z]+/)[0];assert.equal(b.color,color);
   const attrs=label.includes('-key')?{keyId:'r147-94-key'}:label.includes('-lock4')?{lockedBy:'r147-94-key',lockCount:4}:label.startsWith('ice3-')?{frozen:3}:{};assert.deepEqual(m.sourceAttributes,attrs);for(const k of ['keyId','lockedBy','lockCount','frozen'])assert.equal(b[k],attrs[k]);assert.equal(b.shutterId,cohort==='opening'?undefined:stage);assert(Object.keys(b).every(k=>['id','color','x','y','shape','shutterId','keyId','lockedBy','lockCount','frozen'].includes(k)));mapped.push(b);
   if(oldKind!==kind)changes.push({cohort,label,from:oldKind,to:kind,areaDelta:b.shape.length-(oldKind==='L4'?4:shapes[oldKind].length)});
  }
 }
 assert.equal(changes.length,7);assert.equal(changes.reduce((n,c)=>n+c.areaDelta,0),-8);assert.equal(mapped.reduce((n,b)=>n+b.shape.length,0),76);
 const fill=l.blocks.filter(b=>!mapped.includes(b));assert.equal(fill.length,3);assert.deepEqual(fill,r.addedOrdinaryBlocks);assert.deepEqual(fill.map(b=>b.color+':'+b.shape.length).sort(),['blue:2','red:1','red:1']);for(const b of fill)assert(Object.keys(b).every(k=>['id','color','x','y','shape'].includes(k)));
 assert.equal(l.blocks.reduce((n,b)=>n+b.shape.length,0),80);assert.equal(l.blocks.filter(b=>!b.shutterId).length,15);
 assert.deepEqual(l.shutters.map(s=>[s.count,s.width*s.height,s.skin??'shutter']),[[5,8,'shutter'],[20,15,'shutter'],[8,9,'shutter'],[16,12,'shutter'],[0,16,'lift']]);
 assert.equal(l.blocks.filter(b=>b.shutterId==='r147-94-lift').length,6);assert.equal(l.gates.length,6);assert.equal(r.gateBindings.length,6);
 for(const[color,count]of Object.entries(gates)){const b=l.gates.find(g=>g.color===color),m=r.gateBindings.find(m=>m.sourceColor===color);assert(b&&m);assert.equal(b.frozen??0,count);assert.equal(m.sourceFrozen,count);assert.equal(m.candidateGateId,b.id);assert.deepEqual(m.candidateGate,b);assert(Object.keys(b).every(k=>['id','color','side','offset','size','portals','frozen'].includes(k)));}
 for(const k of ['generators','flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length);
 return{sources,sourceBodies:37,sourceArea:84,mappedArea:76,candidateBodies:40,candidateArea:80,ordinaryFillArea:4,changes,keys:4,locks:[4],hiddenIce:[3],countShutters:[5,8,16,20],liftLayers:1,liftBodies:6,geometryAdaptation:'Lift advanced within the same level into a4×4 opening work region; source cyanV2 moved outside to avoid its ice25 exit blocking the lift. Covers repartitioned in fixed64 playable cells; no claim of globally minimal shape edits.',exactSourceCopy:false};
}
export function verifyMechanisms94(data,api){
 const{level,drags}=data,m=new api.PuzzleModel(level);m.startCountdown();const ice=level.blocks.find(b=>b.frozen),lift=level.shutters.find(s=>s.skin==='lift'),lock=level.blocks.find(b=>b.lockedBy),reveals=[],keys=[];let liftClear,checks=0;
 function observe(before,after){
  for(const s of after.shutters)if(s.revealed&&!before.shutters.find(z=>z.id===s.id).revealed){const spec=level.shutters.find(z=>z.id===s.id);if(spec.skin==='lift'){assert.equal(s.id,lift.id);assert.equal(liftClear,undefined);liftClear=after.cleared;}else assert.equal(after.cleared,spec.count);reveals.push({id:s.id,clearEvent:after.cleared,kind:spec.skin??'shutter'});}
  const b=after.blocks.find(b=>b.id===ice.id);if(b){assert.equal(b.frozen,liftClear===undefined?3:Math.max(0,3-(after.cleared-liftClear)));checks++;}
  const pre=before.blocks.find(b=>b.id===lock.id),post=after.blocks.find(b=>b.id===lock.id);const removed=before.blocks.filter(b=>b.keyId&&!after.blocks.some(z=>z.id===b.id));for(const key of removed)keys.push({id:key.id,clearEvent:after.cleared});if(pre&&post)assert.equal(post.lockCount??0,Math.max(0,(pre.lockCount??0)-removed.length));
 }
 for(const d of drags){m.beginAction();for(const p of d.path){const before=m.snapshot();assert(m.moveBlockStep(d.blockId,...p));observe(before,m.snapshot());}if(d.exitSide){const before=m.snapshot();assert(m.tryExit(d.blockId,d.exitSide).ok);observe(before,m.snapshot());}assert(m.commitAction());}
 assert(m.snapshot().complete);assert.equal(keys.length,4);assert.equal(reveals.length,5);assert(Number.isInteger(liftClear));assert(checks>0);assert.equal(m.snapshot().cleared,40);
 const local=[];for(const c of data.mechanismReview.localCases){assert.deepEqual(c.prefix,drags.slice(0,c.afterStep));assert(['frozen','lockedBy'].includes(c.field));const original=api.replayRevisedRoute(level,c.prefix);assert(original.valid);const copy=structuredClone(level),b=copy.blocks.find(b=>b.id===c.action.blockId);assert(b[c.field]);delete b[c.field];const fields=[c.field];if(c.field==='lockedBy'){delete b.lockCount;fields.push('lockCount');}assert(!api.replayRevisedRoute(level,[...c.prefix,c.action]).valid);const r=api.replayRevisedRoute(copy,[...c.prefix,c.action]);assert(r.valid,r.error);local.push({blockId:b.id,removedFields:fields,prefixLength:c.prefix.length});}
 assert.equal(local.length,2);return{keys,reveals,liftClear,hiddenIceChecksAtEveryUnitMove:checks,localConstraintCases:local,allInventoryCompleted:true,globalDifficultyContributionClaimed:false};
}
