import fs from 'node:fs';
import {search as queueSearch} from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {loadApi} from './native-block-repair-v143.mjs';
import {checkFullGeneratorFloor} from './remake41to50-full-generator-floor-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const base=JSON.parse(fs.readFileSync('deliverables/remake41-v157-20260925/candidate41-normal-v157.json'));
const {api}=await loadApi(); const seen=new Set(); let best={score:Infinity};
const choices={
 'purple':[3,4,5,6], 'cyan':[0,1,2,3], 'red':[6,7,8], 'blue':[0,1,2,3], 'yellow':[0,1,2,3], 'green':[6,7,8,9]
};
const gateOrder=['purple','cyan','red','blue','yellow','green'];
let tried=0, candidates=[]; for(const p of choices.purple)for(const c of choices.cyan)for(const r of choices.red)for(const b of choices.blue)for(const y of choices.yellow)for(const g of choices.green)candidates.push([p,c,r,b,y,g]);
for(let n=candidates.length-1;n;n--){const j=Math.floor(Math.random()*(n+1));[candidates[n],candidates[j]]=[candidates[j],candidates[n]];} candidates=candidates.slice(0,Number(process.env.COUNT??220));
for(const [p,c,r,b,y,g] of candidates){
 const key=[p,c,r,b,y,g].join(','); if(seen.has(key))continue; seen.add(key); const level=structuredClone(base.level);
 for(const [color,offset] of Object.entries({purple:p,cyan:c,red:r,blue:b,yellow:y,green:g}))level.gates.find(x=>x.color===color).offset=offset;
 try{api.validateLevel(level);}catch{continue;} tried++;
 const found=queueSearch(level,{floor:16,maxStates:1_500_000,maxMilliseconds:5000,maxTransitions:12_000_000,weight:1000,orderSeed:tried%11});
 if(found.status!=='witness'||found.cost<11||found.cost>15){if(tried%50===0)console.log({tried,key,status:found.status,cost:found.cost});continue;}
 const replay=api.replayRevisedRoute(level,found.drags); if(!replay.valid||!replay.complete||replay.nonClearingDrags<11||replay.nonClearingDrags>15)continue;
 const floor=checkFullGeneratorFloor(level,api,{floor:11,maxStates:800_000,maxMilliseconds:6000,maxTransitions:8_000_000});
 const score=(floor.status==='threshold-proven'?0:floor.status==='unknown'?1:2)*100+replay.nonClearingDrags;
 console.log({tried,key,U:replay.nonClearingDrags,floor:floor.status,lower:floor.relaxedNonClearingDrags??null,states:found.states});
 if(score<best.score){best={score,level,found,replay,floor,key}; const out=`deliverables/remake41-v157-20260925/gate-grid41-${key.replaceAll(',','_')}.json`;fs.writeFileSync(out,JSON.stringify({level,drags:found.drags,found,replay,floor,source:'candidate41-normal-v157.json',activeRuleVersion:'1.57.0',levelSha256:digest(level)},null,2)+'\n');}
}
console.log({tried,best:{score:best.score,key:best.key,U:best.replay?.nonClearingDrags,floor:best.floor?.status,lower:best.floor?.relaxedNonClearingDrags}});
