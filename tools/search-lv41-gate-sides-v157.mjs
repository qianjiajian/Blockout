import fs from 'node:fs';
import {search as queueSearch} from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {loadApi} from './native-block-repair-v143.mjs';
import {checkFullGeneratorFloor} from './remake41to50-full-generator-floor-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const base=JSON.parse(fs.readFileSync('deliverables/remake41-v157-20260925/candidate41-normal-v157.json'));const {api}=await loadApi();
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const sides=['top','right','bottom','left'];let best={score:Infinity};
for(let seed=1;seed<=Number(process.env.COUNT??120);seed++){
 const r=rng(seed*199+41), level=structuredClone(base.level), gates=[];
 for(const old of level.gates){let placed=false;for(let attempt=0;attempt<50&&!placed;attempt++){const side=sides[Math.floor(r()*4)],max=side==='top'||side==='bottom'?level.width:level.height;const offset=Math.floor(r()*(max-old.size+1));const g={...old,side,offset};const trial=[...gates,g];const l={...level,gates:trial};try{api.validateLevel(l);gates.push(g);placed=true;}catch{}}if(!placed){gates.length=0;break;}}
 if(gates.length!==level.gates.length)continue; level.gates=gates;
 const found=queueSearch(level,{floor:16,maxStates:1_500_000,maxMilliseconds:5000,maxTransitions:12_000_000,weight:1000,orderSeed:seed%13});
 if(found.status!=='witness'||found.cost<11||found.cost>15)continue; const replay=api.replayRevisedRoute(level,found.drags);if(!replay.valid||!replay.complete||replay.nonClearingDrags<11||replay.nonClearingDrags>15)continue;
 const floor=checkFullGeneratorFloor(level,api,{floor:11,maxStates:800_000,maxMilliseconds:6000,maxTransitions:8_000_000});const score=(floor.status==='threshold-proven'?0:floor.status==='unknown'?1:2)*100+replay.nonClearingDrags;console.log({seed,U:replay.nonClearingDrags,floor:floor.status,lower:floor.relaxedNonClearingDrags??null,gates:gates.map(g=>[g.color,g.side,g.offset,g.size])});if(score<best.score){best={score,level,found,replay,floor};const out=`deliverables/remake41-v157-20260925/side-gate41-${seed}.json`;fs.writeFileSync(out,JSON.stringify({level,drags:found.drags,found,replay,floor,source:'candidate41-normal-v157.json',activeRuleVersion:'1.57.0',levelSha256:digest(level)},null,2)+'\n');}}
console.log({best:{score:best.score,U:best.replay?.nonClearingDrags,floor:best.floor?.status,lower:best.floor?.relaxedNonClearingDrags,gates:best.level?.gates.map(g=>[g.color,g.side,g.offset,g.size])}});
