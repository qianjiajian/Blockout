import fs from 'node:fs';
import assert from 'node:assert/strict';
import {search as queueSearch} from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {loadApi} from './native-block-repair-v143.mjs';
import {checkFullGeneratorFloor} from './remake41to50-full-generator-floor-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

const INPUT='deliverables/remake41-v157-20260925/candidate41-normal-v157.json';
const OUT='deliverables/remake41-v157-20260925';
const base=JSON.parse(fs.readFileSync(INPUT));
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function shuffle(a,r){for(let i=a.length-1;i;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
const {api}=await loadApi();let best={score:Infinity};
for(let seed=1;seed<=Number(process.env.COUNT??220);seed++){
 const r=rng(seed*7919+41),level=structuredClone(base.level);
 // Keep the source color mapping and gate widths, but move portals within their
 // existing sides. This changes the spatial bottleneck without changing any
 // mechanism kind/count or the board geometry.
 const bySide={left:[0,1,2,3,4,5,6,7,8],right:[0,1,2,3,4,5,6,7,8],bottom:[0,1,2,3,4,5,6]};
 for(const g of level.gates){const options=bySide[g.side].filter(o=>o+g.size<= (g.side==='bottom'?7:11));g.offset=options[Math.floor(r()*options.length)];}
 try{api.validateLevel(level);}catch{continue;}
 const found=queueSearch(level,{floor:16,maxStates:220_000,maxMilliseconds:850,maxTransitions:2_000_000,weight:1000,orderSeed:seed%13});
 if(found.status!=='witness'||found.cost<11||found.cost>15)continue;
 const replay=api.replayRevisedRoute(level,found.drags);if(!replay.valid||!replay.complete||replay.nonClearingDrags<11||replay.nonClearingDrags>15)continue;
 const floor=checkFullGeneratorFloor(level,api,{floor:11,maxStates:220_000,maxMilliseconds:2200,maxTransitions:2_000_000});
 const score=(floor.status==='threshold-proven'?0:floor.status==='unknown'?1:2)*100+replay.nonClearingDrags;
 if(score<(best.score??Infinity)){best={score,seed,level,found,replay,floor};const out=`${OUT}/gate-variant41-normal-${seed}.json`;fs.writeFileSync(out,JSON.stringify({level,drags:found.drags,replay,found,floor,source:INPUT,activeRuleVersion:'1.57.0',levelSha256:digest(level)},null,2)+'\n');console.log(JSON.stringify({seed,out,U:replay.nonClearingDrags,floor:floor.status,lower:floor.relaxedNonClearingDrags??null,states:found.states,gates:level.gates.map(g=>[g.color,g.side,g.offset,g.size])}));}
}
console.log(JSON.stringify({best:{seed:best.seed,score:best.score,U:best.replay?.nonClearingDrags,floor:best.floor?.status,lower:best.floor?.relaxedNonClearingDrags}}));
