import assert from 'node:assert/strict';
import {compile,each} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {stateOf} from './lift-floor.mjs';
import {searchLiftWitness} from './lift-witness-search.mjs';
import {liftCausalCase} from './check-source65.mjs';
export function findLiftCausalCase(level,drags,api){
 try{return liftCausalCase(level,drags,api);}catch{}
 const c=compile(level);
 for(let step=0;step<drags.length;step++){
  const prefix=drags.slice(0,step),before=api.replayRevisedRoute(level,prefix);assert(before.valid);const snapshot=JSON.parse(before.finalStateKey),s=stateOf(c,snapshot);let found;
  each(c,s,(next,cost,get)=>{
   if(cost!==1||!c.covers.some(co=>co.skin==='lift'&&next[2*c.N+co.j]&&!s[2*c.N+co.j]))return;
   const moved=get();if(moved.path.length<2)return;const after=api.replayRevisedRoute(level,[...prefix,moved]);if(!after.valid)return;
   const suffix=searchLiftWitness(level,{startState:next,floor:31,maxStates:100000,maxMilliseconds:1000});if(suffix.status!=='witness')return;
   for(let k=1;k<moved.path.length;k++){
    const wait={blockId:moved.blockId,path:moved.path.slice(0,k)},release={blockId:moved.blockId,path:moved.path.slice(0,k+1)},a=api.replayRevisedRoute(level,[...prefix,wait]),b=api.replayRevisedRoute(level,[...prefix,release]);if(!a.valid||!b.valid)continue;
    const sa=JSON.parse(a.finalStateKey),sb=JSON.parse(b.finalStateKey),changed=sb.shutters.filter(t=>t.skin==='lift'&&t.revealed&&!sa.shutters.find(q=>q.id===t.id)?.revealed);if(!changed.length||sa.cleared!==sb.cleared)continue;
    const tail=path=>path.length?[{blockId:moved.blockId,path}]:[],completeRecoveryRoute=[...prefix,wait,...tail(moved.path.slice(k)),...suffix.drags],completeReleaseRoute=[...prefix,release,...tail(moved.path.slice(k+1)),...suffix.drags],ra=api.replayRevisedRoute(level,completeRecoveryRoute),rb=api.replayRevisedRoute(level,completeReleaseRoute);if(!ra.valid||!ra.complete||!rb.valid||!rb.complete)continue;
    found={passed:true,beforeDrag:step+1,regionIds:changed.map(t=>t.id),prefix,stillOccupiedAction:wait,regionVacatedAction:release,sameClearCount:sa.cleared,waitingRevealed:false,vacatedRevealed:true,completeRecoveryRoute,completeReleaseRoute,conclusion:'相同前缀状态和清除计数，仅多移动一单位格离开升降区，后者立即揭层；两分支均附权威模型完整通关恢复路线。'};return false;
   }
  });if(found)return found;
 }
 throw Error('No verified off-route occupancy lift causal case');
}
