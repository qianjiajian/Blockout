import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {checkPrefixFloor67} from './prefix-floor67.mjs';
import {searchLiftWitness} from './lift-witness-search.mjs';
import {compile} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {stateOf} from './lift-floor.mjs';
import {seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67',baseFile=process.argv[2]??root+'/prefix67-9-1790254872084.continue-1790254989284.json',base=JSON.parse(fs.readFileSync(baseFile)),prefix=base.search.best.drags,{api}=await loadApi(),seed=Number(process.env.SEED??1476741),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)],start=Date.now(),deadline=start+Number(process.env.SECONDS??120)*1000,seen=new Set(),counts={};
const source=fs.readFileSync(import.meta.filename),snapshot=`${root}/refine-milestone67-${Date.now()}.mjs.txt`;fs.writeFileSync(snapshot,source);
for(let attempt=0;Date.now()<deadline;attempt++){
 const level=structuredClone(base.level),colors=rng.shuffle(['red','cyan','blue','purple']),slots=[{side:'right',offset:2,size:3},{side:'right',offset:5,size:3},{side:'top',offset:2,size:3},{side:'bottom',offset:2,size:3}];
 slots.forEach((slot,i)=>Object.assign(level.gates.find(g=>g.color===colors[i]),slot));const sha=digest(level);if(seen.has(sha))continue;seen.add(sha);if(level.gates.some(g=>level.blocks.filter(b=>b.color===g.color).some(b=>1+Math.max(...b.shape.map(p=>['left','right'].includes(g.side)?p[1]:p[0]))>g.size)))continue;
 try{api.validateLevel(level);}catch{continue;}
 const m=new api.PuzzleModel(level);m.startCountdown();let valid=true;for(const d of prefix){m.beginAction();for(const p of d.path)if(!m.moveBlockStep(d.blockId,...p)){valid=false;break;}if(d.exitSide&&!m.tryExit(d.blockId,d.exitSide).ok)valid=false;if(!m.commitAction())valid=false;if(!valid)break;}if(!valid)throw Error('Changed closed gates modified prefix');
 const prefixReplay=api.replayRevisedRoute(level,prefix),cost=prefixReplay.nonClearingDrags,search=searchLiftWitness(level,{floor:16-cost,fastEdges:true,startState:stateOf(compile(level),m.snapshot()),maxMilliseconds:1000,maxStates:100000,orderSeed:attempt%level.blocks.length});counts[search.status]=(counts[search.status]??0)+1;
 if(search.status!=='witness')continue;const drags=[...prefix,...search.drags],replay=api.replayRevisedRoute(level,drags);if(!replay.valid||!replay.complete)throw Error('Bad full witness');const proof=checkPrefixFloor67(level,api,{floor:11,goalClears:4,maxMilliseconds:7000,maxStates:400000}),out=`${root}/draft67-milestone-${attempt}-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify({level,drags,replay,search,milestoneProof:proof,ruleVersion:'1.47.0',sourceStatus:'review-required',formalAdopted:false,reproduction:{baseFile,baseFileSha256:digest(fs.readFileSync(baseFile)),seed,attempt,colors,slots,snapshot,toolSha256:digest(source)}},null,2));console.log(JSON.stringify({out,U:replay.nonClearingDrags,proof:proof.status,cost:proof.milestoneReachedAtCost,frontier:proof.frontierCost,states:proof.states}));if(proof.thresholdProven)break;
}
console.log(JSON.stringify({seed,unique:seen.size,counts,ms:Date.now()-start}));
