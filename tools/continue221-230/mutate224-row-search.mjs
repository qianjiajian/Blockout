import fs from 'node:fs';
import {api,rng} from '../remake191-200/author194-196/common.mjs';
import {searchSpatial} from './author-hard20260930/grid-witness.mjs';
import {gridFloor} from './author-hard20260930/grid-floor224.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {runtimeNativeArtIssues} from './runtime-native-art.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
if(!verifyRulesLock().ok)throw Error('Rules lock');
const out='deliverables/continue221-230-20260930/224-row-search';fs.mkdirSync(out,{recursive:true});
const original=JSON.parse(fs.readFileSync(process.env.BASE??'deliverables/continue221-230-20260930/224-source-row/candidate-1790740831948-23.json'));
const R=rng(Number(process.argv[2]??224850001)),run=Date.now(),seen=new Set(),pool=[original.level],deadline=Date.now()+240000;
const colors=['red','blue','green','yellow','cyan','orange'];
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
let best=original.replay.nonClearingDrags;const counts={invalid:0,duplicate:0,search:0,witness:0};
for(let n=0;n<Number(process.argv[3]??600)&&Date.now()<deadline;n++){
  const level=structuredClone(pool[Math.floor(R.random()*pool.length)]),v=level.blocks.filter(b=>!b.frozen&&b.id!=='l224s-o3');
  for(let k=0;k<1+(n%3);k++){
    const mode=Math.floor(R.random()*4);
    if(mode===0){const a=R.shuffle(v)[0];a.color=R.shuffle(colors.filter(c=>c!==a.color))[0];}
    if(mode===1){const a=R.shuffle(v)[0],b=R.shuffle(v.filter(b=>b.color!==a.color))[0];if(b)[a.color,b.color]=[b.color,a.color];}
    if(mode===2){const a=R.shuffle(v)[0],b=R.shuffle(v.filter(b=>b.id!==a.id&&b.shutterId===a.shutterId&&JSON.stringify(b.shape)===JSON.stringify(a.shape)))[0];if(b){[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];}}
    if(mode===3){const g=R.shuffle(level.gates.filter(g=>g.color!=='orange'&&g.color!=='cyan'))[0],side=R.shuffle(['left','right','top','bottom'])[0],size=2+(R.random()<.5?0:1),max=(side==='left'||side==='right'?level.height:level.width)-size;Object.assign(g,{side,size,offset:Math.floor(R.random()*(max+1))});}
  }
  const sha=digest(level);if(seen.has(sha)){counts.duplicate++;continue;}seen.add(sha);
  const issues=api.auditRevisedCandidate(level).issues.filter(i=>!omit.has(i.code));
  if(issues.length||runtimeNativeArtIssues(level).length){counts.invalid++;continue;}counts.search++;
  let w,rep,proof,error;
  try{w=searchSpatial(level,api,{floor:21,maxMilliseconds:2000,maxStates:40000,maxTransitions:600000,symmetry:true});if(w.drags)rep=api.replayRevisedRoute(level,w.drags);if(rep?.valid&&rep.complete&&rep.nonClearingDrags>=16&&rep.nonClearingDrags<=20)proof=gridFloor(level,{floor:16,maxMilliseconds:8000,maxStates:1500000});}catch(e){error=e.message;}
  const row={n,sha,status:w?.status,U:rep?.nonClearingDrags,L:proof?.status,states:proof?.discoveredStates,relaxedU:proof?.relaxedNonClearingDrags,clears:w?.maxClearsSeen,error};
  fs.appendFileSync(out+`/attempts-${run}.jsonl`,JSON.stringify(row)+'\n');
  if(rep?.valid&&rep.complete){counts.witness++;const file=out+`/candidate-${run}-${n}.json`;fs.writeFileSync(file,JSON.stringify({level,drags:w.drags,replay:rep,proof,row},null,2));if(rep.nonClearingDrags>=best){best=rep.nonClearingDrags;pool.push(level);if(pool.length>10)pool.splice(1,1);}console.log(JSON.stringify({...row,file}));if(proof?.thresholdProven)break;}
  else if(counts.search%20===0)console.log(JSON.stringify(row));
}
console.log(JSON.stringify({counts,best,pool:pool.length}));
