import assert from 'node:assert/strict';
import {digest} from '../../revised-preview-validation-v160.mjs';
export {replaySpatial} from '../../star-targets141-150/verification.mjs';
export const IDS=[78];
export const clean=v=>JSON.parse(JSON.stringify(v));
export const omitTarget=level=>{const l=clean(level);delete l.preservedMoveTarget;return l;};
const withoutBlocks=l=>{const v=clean(l);delete v.blocks;return v;};
const withoutPosition=b=>{const v=clean(b);delete v.x;delete v.y;return v;};
const inventory=blocks=>blocks.map(withoutPosition).sort((a,b)=>a.id.localeCompare(b.id));
export function validateRepair(before,route,levels,api){
 assert.equal(before.priorLevels.length,200);assert.equal(levels.length,200);assert.equal(digest(before.priorLevels),before.campaignSha256);
 assert.equal(route.id,78);assert.deepEqual(route.level,levels[77]);assert.equal(digest(route.drags),route.routeSha256);
 assert.deepEqual(before.level,before.priorLevels[77]);
 const old=before.level,current=levels[77],expected=clean(before.priorLevels);expected[77]=clean(current);
 assert.deepEqual(levels,expected,'Only the Level 78 object may change');
 assert.deepEqual(withoutBlocks(current),withoutBlocks(old),'All non-block metadata, map, gates, lift, scores and profile must be preserved');
 assert.deepEqual(current.blocks.filter(b=>!b.shutterId),old.blocks.filter(b=>!b.shutterId),'All 13 opening blocks must remain exact');
 const oldHidden=old.blocks.filter(b=>b.shutterId),hidden=current.blocks.filter(b=>b.shutterId),lift=current.shutters.find(s=>s.id==='lift');
 assert.equal(old.blocks.filter(b=>!b.shutterId).length,13);assert(lift);assert.equal(lift.width*lift.height,15);
 assert.deepEqual(inventory(hidden.filter(b=>b.frozen)),inventory(oldHidden.filter(b=>b.frozen)),'Two hidden frozen blocks and initial ice 3 must remain exact except position');
 const occupied=new Set();
 for(const b of hidden){assert.equal(b.shutterId,'lift');for(const [dx,dy]of b.shape){const x=b.x+dx,y=b.y+dy;assert(x>=lift.x&&x<lift.x+lift.width&&y>=lift.y&&y<lift.y+lift.height);const k=x+','+y;assert(!occupied.has(k),'Hidden blocks must not overlap');occupied.add(k);}}
 assert.equal(occupied.size,15,'The real hidden layer must fill all 15 cells');
 const rearrangementOnly=JSON.stringify(inventory(hidden))===JSON.stringify(inventory(oldHidden));
 if(!rearrangementOnly)assert(typeof route.hiddenAdaptationRationale==='string'&&route.hiddenAdaptationRationale.length>10,'Ordinary shape/color adaptation must explicitly state its differences and reason');
 const stars=api.levelStarTargets(current);assert.deepEqual(stars,{moveTarget:37,timeTargetSeconds:129});assert.equal(current.timeSeconds,180);
 assert(route.drags.length>0&&route.drags.every(d=>d.blockId&&Array.isArray(d.path)));
 return{passed:true,other199Preserved:true,opening13Preserved:true,nonBlockMetadataPreserved:true,scoringPreserved:true,hiddenCoverage:15,hiddenBlockCount:hidden.length,rearrangementOnly,levelSha256:digest(current),routeSha256:route.routeSha256,routeDragCount:route.drags.length,stars};
}

// Inspect the first actual reveal event, rather than only the end of a drag:
// a clear that happens after reveal must not be misclassified as zero external
// assistance to the newly visible ice.
export function inspectReveal(level,events,initial){
 const externalIds=level.blocks.filter(b=>!b.shutterId).map(b=>b.id),hiddenIds=level.blocks.filter(b=>b.shutterId==='lift').map(b=>b.id);
 assert(externalIds.includes('r147-78-open-12'));let previous=initial,proof;
 for(const [index,event]of events.entries()){
  const after=event.after,was=previous.shutters.find(s=>s.id==='lift')?.revealed,now=after.shutters.find(s=>s.id==='lift')?.revealed;
  if(!was&&now){assert(!proof,'The lift may reveal only once');proof={eventIndex:index,method:event.method,remainingExternalIds:after.blocks.filter(b=>externalIds.includes(b.id)).map(b=>b.id),hidden:after.blocks.filter(b=>hiddenIds.includes(b.id)).map(b=>({id:b.id,frozen:b.frozen??0})),cleared:after.cleared};}
  previous=after;
 }
 assert(proof,'Complete route must reveal the lift');
 assert.deepEqual(proof.hidden,level.blocks.filter(b=>hiddenIds.includes(b.id)).map(b=>({id:b.id,frozen:b.frozen??0})),'Hidden ice must retain its full initial count at first reveal');
 return proof;
}

export function spatialRevealProof(level,drags,api){
 const model=new api.PuzzleModel(clean(level)),initial=clean(model.snapshot()),events=[];
 model.startCountdown();
 const record=(method,args)=>{model[method](...args);events.push({method,after:clean(model.snapshot())});};
 for(const drag of drags){record('beginAction',[]);for(const p of drag.path)record('moveBlockStep',[drag.blockId,...p]);if(drag.exitSide)record('tryExit',[drag.blockId,drag.exitSide]);record('commitAction',[]);}
 return inspectReveal(level,events,initial);
}
