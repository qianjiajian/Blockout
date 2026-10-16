import fs from 'node:fs';
import {api,tile,recolorBag,recolor,rng} from '../remake191-200/author194-196/common.mjs';
import {searchSpatial} from './author-hard20260930/grid-witness.mjs';
import {gridFloor} from './author-hard20260930/grid-floor224.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {runtimeNativeArtIssues} from './runtime-native-art.mjs';
if(!verifyRulesLock().ok)throw Error('Rules lock');
const out='deliverables/continue221-230-20260930/224-row-domino';fs.mkdirSync(out,{recursive:true});
const rect=(w,h,x=0,y=0)=>Array.from({length:w*h},(_,p)=>[x+p%w,y+Math.floor(p/w)]),H2=rect(2,1),V2=rect(1,2),H3=rect(3,1),Q=rect(2,2);
const base=JSON.parse(fs.readFileSync('deliverables/continue221-230-20260930/224-source-row/candidate-1790740831948-23.json')).level;
const hiddenBase=base.blocks.filter(b=>b.shutterId),top=base.blocks.filter(b=>b.y===0);
const R=rng(Number(process.argv[2]??224780001)),run=Date.now(),limit=Number(process.argv[3]??600),deadline=Date.now()+240000;
const omit=new Set(['missing-source-reference','missing-source-hash','missing-seed','missing-source-number','incomplete-source-inventory','originality-unverified','wrong-rule-profile']);
const counts={tile:0,color:0,hidden:0,audit:0,search:0};let best=0;
for(let n=0;n<limit&&Date.now()<deadline;n++){
  const seed=R.state();R.random();
  const spec=[{id:'o-green',shape:Q,color:'green',frozen:10},{id:'o-blue',shape:Q,color:'blue',frozen:10},{id:'o-red',shape:Q,color:'red',frozen:10},{id:'o-start',shape:H3,color:'orange'},...Array.from({length:10},(_,i)=>({id:'o-'+i,shape:R.random()<.5?H2:V2,color:['orange','orange','orange','cyan','cyan','cyan','cyan','red','blue','green'][i]}))];
  const lower=tile(spec,rect(7,5,0,5),{seed,maxNodes:5000,pins:{'o-green':[0,8],'o-blue':[2,8],'o-red':[5,8],'o-start':[0,5]},preferLarge:false});
  if(!lower){counts.tile++;continue;}
  if(!recolorBag(lower,{seed:seed+2,pins:{'o-green':'green','o-blue':'blue','o-red':'red','o-start':'orange'}})){counts.color++;continue;}
  const hidden=structuredClone(hiddenBase);
  if(n%3&&!recolor(hidden,['orange','yellow','cyan','blue','red','green'],{seed:seed+5,pins:{h1:'red'}})){counts.hidden++;continue;}
  const level=structuredClone(base);level.blocks=[...structuredClone(top),...lower,...hidden];
  if(n%2){const g=level.gates.find(g=>g.color==='red');Object.assign(g,{side:'right',offset:1,size:3});const q=level.gates.find(g=>g.color==='green');Object.assign(q,{side:'top',offset:4,size:3});}
  level.mechanismAdaptation.change+=' 本新图保持全27体/42开局格/28隐藏格：下侧3冰SQ2+1普通H3+10D2，上側H2/H2/H3。R6与旧S/V3作必要等面积换形，所有非清除搬运均多格；隐藏形状及数量不变，普通色原创适配。';
  const issues=api.auditRevisedCandidate(level).issues.filter(i=>!omit.has(i.code)),art=runtimeNativeArtIssues(level);
  if(issues.length||art.length){counts.audit++;if(counts.audit<3)console.log(JSON.stringify({reject:'audit',issues,art}));continue;}counts.search++;
  let w,rep,proof,error;
  try{w=searchSpatial(level,api,{floor:21,maxMilliseconds:2000,maxStates:40000,maxTransitions:500000,symmetry:true,diagnosticTrace:true});if(w.drags)rep=api.replayRevisedRoute(level,w.drags);if(rep?.valid&&rep.complete&&rep.nonClearingDrags>=16&&rep.nonClearingDrags<=20)proof=gridFloor(level,{floor:16,maxMilliseconds:8000,maxStates:1500000});}catch(e){error=e.message;}
  const row={n,seed,sha:digest(level),status:w?.status,clears:w?.maxClearsSeen,U:rep?.nonClearingDrags,L:proof?.status,error};
  fs.appendFileSync(out+`/attempts-${run}.jsonl`,JSON.stringify(row)+'\n');
  if((w?.maxClearsSeen??0)>best){best=w.maxClearsSeen;fs.writeFileSync(out+`/best-${run}.json`,JSON.stringify({level,w,row},null,2));console.log(JSON.stringify({...row,best:true}));}
  if(rep?.valid&&rep.complete){const file=out+`/candidate-${run}-${n}.json`;fs.writeFileSync(file,JSON.stringify({level,drags:w.drags,replay:rep,proof,row,status:'PENDING_QUALIFICATION'},null,2));console.log(JSON.stringify({...row,file}));if(proof?.thresholdProven)break;}
}
fs.writeFileSync(out+`/batch-${run}.json`,JSON.stringify({counts,best},null,2));console.log(JSON.stringify({counts,best}));
