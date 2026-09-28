import assert from 'node:assert/strict';
import {checkAxisPrefixFloor} from '../../lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
export function project141(level,api){
 api.validateLevel(level);assert.equal(level.id,141);assert(!level.generators?.length&&!level.flipDoors?.length&&!level.coloredGrids?.length);
 const cover=level.shutters.find(s=>s.skin!=='lift'),lift=level.shutters.find(s=>s.skin==='lift');assert(cover&&lift);assert.equal(level.shutters.length,2);assert.equal(cover.count,8);
 assert(lift.x>=cover.x&&lift.y>=cover.y&&lift.x+lift.width<=cover.x+cover.width&&lift.y+lift.height<=cover.y+cover.height);
 const locks=level.blocks.filter(b=>b.lockedBy);assert.equal(locks.length,1);const lock=locks[0];assert(!lock.shutterId);assert.equal(lock.lockCount,4);assert(!lock.frozen);
 const keys=level.blocks.filter(b=>b.keyId);assert.equal(keys.length,4);assert(keys.every(b=>b.keyId===lock.lockedBy));assert.equal(keys.filter(b=>!b.shutterId).length,1);assert(keys.filter(b=>b.shutterId).every(b=>b.shutterId===cover.id));
 const p=structuredClone(level);p.shutters=p.shutters.filter(s=>s.id!==lift.id);p.blocks=p.blocks.filter(b=>b.shutterId!==lift.id);
 for(const b of p.blocks){if(b.lockedBy){delete b.lockedBy;delete b.lockCount;b.frozen=8;}delete b.keyId;}
 api.validateLevel(p);const original=new api.PuzzleModel(level).snapshot();assert(original.shutters.every(s=>!s.revealed));
 return{level:p,goalClears:8,sourceLevelSha256:digest(level),projectedLevelSha256:digest(p),argument:'Stop at clear8. Until then curtain8 physically excludes its whole region and nested lift, and all three hidden keys. One visible key cannot unlock lock4; ice8 substitutes the same immobile obstacle before the stopping event. Every original winning play has such an equal-or-cheaper prefix. This does not solve a stock-deleted full level.'};
}
export function check141Floor(level,api,options={}){const projection=project141(level,api),r=checkAxisPrefixFloor(projection.level,api,{floor:5,maxMilliseconds:15000,maxStates:200000,...options,goalClears:8});return{...r,projection:{...projection,level:undefined}};}
export function verify141Prefix(level,drags,api){
 const p=project141(level,api),a=new api.PuzzleModel(level),b=new api.PuzzleModel(p.level);a.startCountdown();b.startCountdown();let dragsChecked=0,unitSteps=0;
 const compare=()=>{const sa=a.snapshot(),sb=b.snapshot();assert.equal(sa.cleared,sb.cleared);if(sa.cleared>=8)return;assert(sa.shutters.every(c=>!c.revealed));
  for(const original of level.blocks.filter(x=>!x.shutterId)){const x=a.getBlock(original.id),y=b.getBlock(original.id);assert.equal(!!x,!!y);if(x){assert.deepEqual([x.x,x.y,x.layers],[y.x,y.y,y.layers]);assert.equal(a.isBlockActive(x),b.isBlockActive(y));}}
 };
 compare();for(const d of drags){a.beginAction();b.beginAction();for(const q of d.path){assert(a.moveBlockStep(d.blockId,...q));assert(b.moveBlockStep(d.blockId,...q));unitSteps++;compare();}if(d.exitSide){assert(a.tryExit(d.blockId,d.exitSide).ok);assert(b.tryExit(d.blockId,d.exitSide).ok);}assert(a.commitAction());assert(b.commitAction());dragsChecked++;compare();if(a.snapshot().cleared>=8)return{passed:true,dragsChecked,unitSteps,stoppedAtClears:8};}throw Error('Route never reached prefix goal');
}
