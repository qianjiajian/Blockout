import fs from 'node:fs';
import {api,audit,save,hash} from './common.mjs';
import {search} from '../../lv051-060/campaign-generator-axis-search-v146.mjs';
import {replayBomb} from './replay125-time.mjs';
import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';
const input=process.argv[2],old=JSON.parse(fs.readFileSync(input)),level=structuredClone(old.level??old.candidate.level),map={orange:'green',green:'orange'},swap=c=>map[c]??c;
for(const b of level.blocks){b.color=swap(b.color);if(b.layers)b.layers=b.layers.map(swap);delete b.timedBombSeconds;}
for(const g of level.gates)g.color=swap(g.color);
level.blocks.find(b=>b.id==='r3-125-0').timedBombSeconds=25;
level.blocks.find(b=>b.id==='r3-125-20').timedBombSeconds=25;
const left=level.blocks.find(b=>b.shutterId==='r3-125-a'),right=level.blocks.find(b=>b.shutterId==='r3-125-b');left.color='cyan';right.color='blue';left.timedBombSeconds=15;right.timedBombSeconds=15;
const a=audit(level),projected=structuredClone(level);projected.blocks.forEach(b=>delete b.timedBombSeconds);const attempts=[];
for(let orderSeed=0;orderSeed<level.blocks.length;orderSeed++){
 const result=search(projected,{floor:16,maxStates:1000000,maxMilliseconds:3000,orderSeed});
 const row={orderSeed,status:result.status,cost:result.cost,states:result.states,stop:result.stop};
 if(result.status==='witness'){const replay=api.replayRevisedRoute(projected,result.drags),timed=replayBomb(level,result.drags,api,true);row.timed=timed;if(replay.valid&&replay.complete&&result.cost>=11&&timed.valid&&timed.complete){const proof=checkSymmetryFloor(projected,{floor:11,maxStates:2000000,maxMilliseconds:30000});const file=save('candidate125-clock',{level,drags:result.drags,sourceReview:old.sourceReview,priorCandidate:input,levelSha256:hash(level),audit:a,result,replay,timed,proof,adaptations:['After slow-clock failure, swap ordinary orange/green assignment globally, place two25s bombs on early redS and greenH2 carriers; preserve actual source red/green bomb colors.','Restore hidden bomb colors to source cyan/blue so both can exit through ordinary gates promptly after reveal; retain15s nominal values, covers6/4, full inventory, native assets.']});console.log(JSON.stringify({file,cost:result.cost,timed:timed.valid,proof:proof.status}));if(proof.thresholdProven)break;}}
 attempts.push(row);
}
console.log(JSON.stringify({file:save('clock125-attempts',{input,attempts})}));
