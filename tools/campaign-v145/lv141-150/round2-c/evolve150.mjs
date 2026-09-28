import fs from 'node:fs';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {search150} from './search150.mjs';
import {nativeProof} from './native150.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
const {api}=await loadApi(),OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c',stamp=Date.now();
const base=JSON.parse(fs.readFileSync(OUT+'/candidate150-1790476173362-17.json')).level;
let seed=Number(process.env.SEED??273150),rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;},pick=a=>a[Math.floor(rnd()*a.length)];
const colors=['red','green','blue','yellow'],cells=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]),adj=(a,b)=>cells(a).some(([x,y])=>cells(b).some(([xx,yy])=>Math.abs(xx-x)+Math.abs(yy-y)===1));
let pool=[{level:base,rank:0}],best=0;
for(let i=0;i<Number(process.argv[2]??500);i++){
 const level=structuredClone(pick(pool).level),bs=level.blocks;
 for(let j=0;j<1+Math.floor(rnd()*3);j++){const b=pick(bs),opts=colors.filter(c=>!bs.some(a=>a!==b&&a.color===c&&adj(a,b))&&(!b.layers||b.layers[1]!==c));if(opts.length){b.color=pick(opts);if(b.layers)b.layers[0]=b.color;}if(b.layers&&rnd()<.5)b.layers[1]=pick(colors.filter(c=>c!==b.color));}
 if(rnd()<.3){const gates=[...level.gates,...level.flipDoors],g=pick(gates),used=new Set(gates.filter(a=>a!==g).flatMap(a=>Array.from({length:a.size},(_,i)=>a.side+':'+(a.offset+i)))),opts=[];for(const side of ['top','bottom','left','right'])for(let offset=0;offset<=(['top','bottom'].includes(side)?6:7)-3;offset++)if(Array.from({length:3},(_,i)=>side+':'+(offset+i)).every(k=>!used.has(k)))opts.push({side,offset});if(opts.length)Object.assign(g,pick(opts));}
 try{api.validateLevel(level);}catch{continue;}if(!api.auditCandidateBlockArt(level).passed)continue;
 const result=search150(level,api,250,10);let replay,proof,rank=(result.bestClears??0)*10;
 if(result.status==='witness'){replay=api.replayRevisedRoute(level,result.drags);if(!replay.valid||!replay.complete)continue;rank=500+replay.nonClearingDrags;if(replay.nonClearingDrags>=5){proof=nativeProof(level,api);rank=1000+(proof.relaxedNonClearingDrags??5)*20+replay.nonClearingDrags;const file=`${OUT}/candidate150-evolve-${stamp}-${i}.json`;fs.writeFileSync(file,JSON.stringify({ruleVersion:'1.73.0',level,drags:result.drags,replay,proof,sourcePhaseVerified:false,adoptionReady:false},null,2));console.log(JSON.stringify({i,file,U:replay.nonClearingDrags,proof:proof.status,Lrelaxed:proof.relaxedNonClearingDrags}));if(proof.thresholdProven)break;}}
 if(rank>=best||rnd()<.03){pool.push({level,rank});pool.sort((a,b)=>b.rank-a.rank);pool=pool.slice(0,12);}best=Math.max(best,rank);
 fs.appendFileSync(`${OUT}/evolve150-${stamp}.jsonl`,JSON.stringify({i,levelSha256:digest(level),status:result.status,bestClears:result.bestClears,U:replay?.nonClearingDrags,proof:proof?.status,rank})+'\n');
}
