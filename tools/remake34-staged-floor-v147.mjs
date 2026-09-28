// A cost-partitioned lower bound at the FIRST reveal of curtain12.
// Prefix retains the complete graph. At the cut exactly five of the seventeen
// single-layer opening bodies survive. Deleting those five and granting their
// five clears early yields the same fixed, easier fourteen-body suffix for
// EVERY entrance. No witness entrance is selected. The revealing clear costs
// zero repositions, so the separately proven prefix/suffix floors add.
import assert from 'node:assert/strict';
import {compileLevel} from './remake21to30-mask-floor.mjs';
import {prefixFloor} from '../deliverables/remake31-40-v146-20260924/agent38-40/assist34/prefix-floor.mjs';
import {checkResidualFloor} from '../deliverables/remake31-40-v146-20260924/agent31-34/residual-floor.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

export function qualifyStaged34(level){
 assert.equal(level.id,34);compileLevel(level);
 assert.equal(level.shutters?.length,2);assert.deepEqual(level.shutters.map(s=>s.count).sort((a,b)=>a-b),[12,22]);
 assert(!(level.generators??[]).length);
 const first=level.shutters.find(s=>s.count===12),second=level.shutters.find(s=>s.count===22);
 const opening=level.blocks.filter(b=>!b.shutterId),hidden=level.blocks.filter(b=>b.shutterId);
 assert.equal(opening.length,17);assert(opening.every(b=>!b.layers||b.layers.length===1));
 assert.equal(opening.filter(b=>b.color==='red').length,4);assert(opening.filter(b=>b.color!=='red').every(b=>b.shape.length===1));
 assert.equal(level.gates.find(g=>g.color==='red')?.frozen,14);
 assert.equal(hidden.length,14);assert.equal(hidden.filter(b=>b.layers?.length===2).length,7);
 assert(hidden.every(b=>(b.shutterId===first.id||b.shutterId===second.id)&&!b.frozen),'This qualified domain has no hidden ice');
 const suffix=structuredClone(level);
 suffix.blocks=suffix.blocks.filter(b=>b.shutterId).map(b=>{if(b.shutterId===first.id)delete b.shutterId;return b;});
 suffix.shutters=[{...second,count:5}];
 suffix.gates=suffix.gates.map(g=>{if(g.frozen>17)g.frozen-=17;else delete g.frozen;return g;});
 compileLevel(suffix);
 return {firstCut:12,openingBodies:17,deletedSurvivors:5,prepaidGlobalClears:17,suffix};
}
export function checkStaged34Floor(level,options={}){
 const base={status:'unknown',thresholdProven:false,floor:16,sourceLevelSha256:digest(level),abstraction:'staged-first-curtain-all-entrances-prefix13-suffix3-v147',solvabilityValidated:false,timeValidated:false,pointerReplayValidated:false};
 let q;try{q=qualifyStaged34(level);}catch(error){return {...base,status:'unsupported',reason:error.message};}
 const budget={maxStates:options.maxStates??2000000,maxMilliseconds:options.maxMilliseconds??180000};
 const prefix=prefixFloor(level,{...budget,floor:13,goal:12});
 if(!prefix.thresholdProven)return {...base,termination:'prefix-floor-not-proven',prefix};
 const suffix=checkResidualFloor(q.suffix,{...budget,floor:3});
 return {...base,status:suffix.thresholdProven?'threshold-proven':'unknown',thresholdProven:suffix.thresholdProven,
  termination:suffix.thresholdProven?'both-partitions-exhausted':'suffix-floor-not-proven',prefix,suffix,suffixLevel:q.suffix,suffixSha256:digest(q.suffix),
  firstCut:q.firstCut,deletedSurvivors:q.deletedSurvivors,prepaidGlobalClears:q.prepaidGlobalClears,
  exploredStates:prefix.explored+suffix.exploredStates,discoveredStates:prefix.states+suffix.discoveredStates};
}
