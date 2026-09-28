import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../../native-block-repair-v143.mjs';
import {search} from '../../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
import {checkAxisFloor} from '../../../remake131to140-axis-floor-v172.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.73.0');
const {api}=await loadApi();
const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-root';fs.mkdirSync(OUT,{recursive:true});
const id=Number(process.argv[2]??142), count=Number(process.argv[3]??200), stamp=Date.now();
const paths={142:'round2-root/candidate142-173142013-1790476149086.json'};
const base=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/batches/lv141-150/'+paths[id])).level;
let seed=Number(process.env.SEED??17314299),rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}, pick=a=>a[Math.floor(rnd()*a.length)];
const clone=structuredClone, colors=base.gates.map(g=>g.color), cells=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]),adj=(a,b)=>cells(a).some(([x,y])=>cells(b).some(([xx,yy])=>Math.abs(xx-x)+Math.abs(yy-y)===1));
const legalArt=(b,c)=>api.auditCandidateBlockArt({...base,blocks:[{...b,color:c,...(b.layers?{layers:[c,...b.layers.slice(1)]}:{})}]}).passed;
const gateFits=(l,b,c)=>{const g=l.gates.find(g=>g.color===c);return g.size>=1+Math.max(...b.shape.map(p=>p[['top','bottom'].includes(g.side)?0:1]));};
const neighbors=base.blocks.map(b=>base.blocks.filter(a=>a!==b&&!a.shutterId&&!b.shutterId&&adj(a,b)).map(a=>a.id));
function recolor(l,all=false){
 for(let n=0;n<(all?l.blocks.length:1+Math.floor(rnd()*6));n++){
  const ix=all?n:Math.floor(rnd()*l.blocks.length), b=l.blocks[ix];if(b.movementAxis)continue;
  const forbidden=new Set(neighbors[ix].map(x=>l.blocks.find(b=>b.id===x).color));
  let opts=colors.filter(c=>!forbidden.has(c)&&legalArt(b,c)&&gateFits(l,b,c));
  if(b.layers&&rnd()<.65){const inn=pick(colors.filter(c=>c!==b.color&&gateFits(l,b,c)&&api.auditCandidateBlockArt({...base,blocks:[{...b,layers:[b.color,c]}]}).passed));if(inn)b.layers[1]=inn;}
  opts=opts.filter(c=>!b.layers||c!==b.layers[1]);if(!opts.length)continue;
  if(all){const reveal=l.shutters.find(s=>s.id===b.shutterId)?.count??0;const low=opts.filter(c=>(base.gates.find(g=>g.color===c).frozen??0)<reveal+8);if(low.length&&rnd()<.85)opts=low;}
  const color=pick(opts);b.color=color;if(b.layers)b.layers[0]=color;
 }
 return l;
}
const project=l=>{l=structuredClone(l);for(const b of l.blocks)delete b.timedBombSeconds;return l;};
let pool=[{level:base,score:-999}],best=-999,success=[];
if(process.env.BASE_FILE)pool=[{level:JSON.parse(fs.readFileSync(process.env.BASE_FILE)).level,score:-999}];
for(let i=0;i<count;i++){
 let level=i===0?clone(pool[0].level):recolor(clone(i%15===0?base:pick(pool).level),i%15===0);
 if(id===148&&rnd()<.5){const a=level.gates.find(g=>g.color==='red'),b=pick(level.gates.filter(g=>['yellow','orange'].includes(g.color)));const old={side:a.side,offset:a.offset,size:a.size};Object.assign(a,{side:b.side,offset:b.offset,size:b.size});Object.assign(b,old);}
 if(colors.some(c=>!level.blocks.some(b=>(b.layers??[b.color]).includes(c))))continue;
 try{api.validateLevel(level);}catch{continue;}
 const result=search(project(level),{floor:16,maxStates:35000,maxMilliseconds:Number(process.env.SEARCH_MS??350),orderSeed:i%level.blocks.length,weight:60});
 let replay,proof,score=(result.maxClears??0)*100;
 if(result.status==='witness'){
  replay=api.replayRevisedRoute(project(level),result.drags);if(!replay.valid||!replay.complete)continue;
  score=10000-replay.nonClearingDrags;
  if(replay.nonClearingDrags>=11)proof=checkAxisFloor(project(level),api,{floor:11,maxStates:50000,maxMilliseconds:1000});
  const file=`${OUT}/candidate${id}-${stamp}-${i}.json`;fs.writeFileSync(file,JSON.stringify({ruleVersion:lock.activeVersion,level,levelSha256:digest(level),drags:result.drags,replay,proof,searchBudget:{maxStates:35000,maxMilliseconds:Number(process.env.SEARCH_MS??350)},sourceBase:paths[id],colorChanges:level.blocks.flatMap((b,k)=>JSON.stringify([b.color,b.layers])===JSON.stringify([base.blocks[k].color,base.blocks[k].layers])?[]:[{id:b.id,source:[base.blocks[k].color,base.blocks[k].layers],design:[b.color,b.layers]}]),adoptionReady:false},null,2));success.push(file);
  console.log(JSON.stringify({i,file,U:replay.nonClearingDrags,proof:proof?.status}));if(proof?.thresholdProven)break;
 }
 if(score>=best||rnd()<.08){pool.push({level,score});pool.sort((a,b)=>b.score-a.score);pool=pool.slice(0,8);}
 if(score>best){best=score;const file=`${OUT}/best${id}-${stamp}-${i}.json`;fs.writeFileSync(file,JSON.stringify({level,search:result},null,2));console.log(JSON.stringify({i,best,file,status:result.status,maxClears:result.maxClears}));}
 fs.appendFileSync(`${OUT}/iterations${id}-${stamp}.jsonl`,JSON.stringify({i,levelSha256:digest(level),status:result.status,score,states:result.states,maxClears:result.maxClears,ms:result.ms,U:replay?.nonClearingDrags,proof:proof?.status})+'\n');
}
console.log(JSON.stringify({id,success,best}));
