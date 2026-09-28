import assert from 'node:assert/strict';
import {checkAxisPrefixFloor} from '../../lv131-140/agent139-140/axis128-masked-prefix-floor.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
export function project143(level,api){
 api.validateLevel(level);assert.equal(level.id,143);assert.equal(level.generators?.length,1);assert.equal(level.shutters?.length,1);
 const c=level.shutters[0],g=level.generators[0];assert.equal(c.count,19);assert(!c.skin||c.skin==='shutter');
 const queued=new Set(g.queueBlockIds);assert.equal(queued.size,2);
 for(const id of queued){const b=level.blocks.find(b=>b.id===id);assert(b&&!b.shutterId&&!b.frozen);assert(b.shape.every(([x,y])=>g.spawn[0]+x>=c.x&&g.spawn[0]+x<c.x+c.width&&g.spawn[1]+y>=c.y&&g.spawn[1]+y<c.y+c.height));}
 assert.equal(level.blocks.filter(b=>!b.shutterId&&!queued.has(b.id)).reduce((n,b)=>n+(b.layers?.length??1),0),19);
 const p=structuredClone(level);delete p.generators;p.blocks=p.blocks.filter(b=>!queued.has(b.id));api.validateLevel(p);
 return{level:p,queuedIds:[...queued],goalClears:19,sourceLevelSha256:digest(level),projectedLevelSha256:digest(p),argument:'Stop at clear19. Both fixed FIFO footprints are entirely inside the real closed curtain19 until the stopping event. The graph keeps this mask and all opening bodies, shells and ice thresholds. Every full solution has an equal-cost prefix; the inventory-deleted projection is not asserted to solve the full level.'};
}
export function check143Floor(level,api,options={}){const p=project143(level,api);return{...checkAxisPrefixFloor(p.level,api,{floor:16,maxStates:200000,maxMilliseconds:10000,...options,goalClears:19}),projection:{...p,level:undefined}};}
export function verify143Prefix(level,drags,api){
 const p=project143(level,api),a=new api.PuzzleModel(level),b=new api.PuzzleModel(p.level),queued=new Set(p.queuedIds);a.startCountdown();b.startCountdown();let unitSteps=0,dragsChecked=0;
 const compare=()=>{const x=a.snapshot(),y=b.snapshot();assert.equal(x.cleared,y.cleared);assert.deepEqual(x.gates,y.gates);assert.deepEqual(x.shutters,y.shutters);const facts=s=>s.blocks.filter(q=>!queued.has(q.id)).map(q=>[q.id,q.x,q.y,q.layers,q.frozen,q.shutterId]).sort((u,v)=>u[0].localeCompare(v[0]));assert.deepEqual(facts(x),facts(y));if(x.cleared<19){assert(!x.shutters[0].revealed);assert.equal(x.queuedBlocks.length,2);}};
 compare();for(const d of drags){assert(!queued.has(d.blockId));a.beginAction();b.beginAction();for(const q of d.path){assert(a.moveBlockStep(d.blockId,...q));assert(b.moveBlockStep(d.blockId,...q));unitSteps++;compare();}if(d.exitSide){assert(a.tryExit(d.blockId,d.exitSide).ok);assert(b.tryExit(d.blockId,d.exitSide).ok);}assert(a.commitAction());assert(b.commitAction());dragsChecked++;compare();if(a.snapshot().cleared===19)return{passed:true,unitSteps,dragsChecked,stopClears:19};}throw Error('Missing required prefix');
}
