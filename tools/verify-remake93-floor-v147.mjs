import assert from 'node:assert/strict';
import {compileSpatial,loadSpatialApi,NONE,settle,cleared,assertStateMatches,replayDomain} from '../deliverables/remake71-80-v146-20260924/floor-review/spatial-domain.mjs';
import {searchMilestone} from '../deliverables/remake91-100-v146-20260924/root93/milestone-floor.mjs';

// Every successful run has this exact spatial state at the first clear14.
// The interior states of either interval are NOT claimed to be unique.
export function deriveCut14(level,api){
 const c=compileSpatial(level,api),open=c.blocks.filter(b=>!b.cover);
 assert.equal(open.length,14);assert.equal(c.covers.length,2);
 assert.deepEqual(c.covers.map(s=>s.count).sort((a,b)=>a-b),[14,18]);
 assert(c.covers.every(s=>!s.skin||s.skin==='shutter'),'No occupancy-triggered lift may reveal early');
 assert(open.every(b=>b.layers.length===1),'Peel would permit an opening body to survive clear14');
 assert(c.blocks.every(b=>!b.ice&&!b.keyId&&!b.lockedBy),'Cut qualification excludes history-dependent effects');
 assert(c.covers.every(s=>c.initial[s.stateIndex]===NONE));
 const cut=c.initial.slice();for(let i=0;i<c.N;i++)if(!c.blocks[i].cover)cut[i]=NONE;settle(c,cut);
 assert.equal(cleared(c,cut),14);
 assert.equal(cut[c.covers.find(s=>s.count===14).stateIndex],14);
 assert.equal(cut[c.covers.find(s=>s.count===18).stateIndex],NONE);
 for(let i=0;i<c.N;i++)if(c.blocks[i].cover)assert.equal(cut[i],c.initial[i]);
 return{c,cut};
}

export async function verifyFloor93(data,api){
 const graph=await loadSpatialApi(),{c,cut}=deriveCut14(data.level,graph);
 const checkpoint=data.lowerBound.checkpoint14;assert.equal(checkpoint.afterDrags,22);
 assert.deepEqual(checkpoint.state,[...cut]);const replay=api.replayRevisedRoute(data.level,data.drags.slice(0,checkpoint.afterDrags));assert(replay.valid);
 const snapshot=JSON.parse(replay.finalStateKey);assertStateMatches(c,cut,snapshot);
 const limits={prove:true,maxStates:1000000,maxMilliseconds:240000,maxTransitions:20000000};
 const first=searchMilestone(data.level,graph,{...limits,floor:8,goalClears:14});assert(first.thresholdProven,JSON.stringify(first));
 const second=searchMilestone(data.level,graph,{...limits,floor:3,goalClears:18,initialState:[...cut]});assert(second.thresholdProven,JSON.stringify(second));
 const fullDomainReplay=replayDomain(c,data.drags,api);assert(fullDomainReplay.complete);assert.equal(fullDomainReplay.cost,12);
 return{floor:11,thresholdProven:true,method:'Add disjoint unavoidable full-inventory gesture intervals 0→14 and14→18',first,second,checkpoint:{afterDrags:22,state:[...cut],independentlyDerived:true,modelGraphExactlyMatched:true},fullDomainReplay};
}
