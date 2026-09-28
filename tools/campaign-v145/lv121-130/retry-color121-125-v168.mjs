import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {auditGeneratorQueueColors} from '../../revised-generator-queue-colors.mjs';

const lock=verifyRulesLock(); if(!lock.ok) throw new Error(lock.errors.join('\n'));
if(lock.activeVersion!=='1.68.0') throw new Error(`expected active 1.68.0, got ${lock.activeVersion}`);
const bundle=await build({stdin:{resolveDir:process.cwd(),sourcefile:'retry121-125-entry.ts',loader:'ts',contents:`
 export {LEVELS} from './src/core/levels.ts';
 export {validateLevel,PuzzleModel} from './src/core/PuzzleModel.ts';
 export {searchRevisedLevel,replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
`},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const OUT='deliverables/campaign121-130-v146-20260924/retry121-125'; fs.mkdirSync(OUT,{recursive:true});
const palette=['red','blue','orange','yellow','green','pink','purple','cyan'];
const hash=seed=>{let s=seed>>>0; return ()=>{s=(Math.imul(1664525,s)+1013904223)>>>0; return s/0x100000000;};};
const shuffle=(a,r)=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;};
function cells(b){return b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]);}
function recolor(level,seed){
 const r=hash(seed), out=structuredClone(level), map=new Map();
 out.blocks.forEach((b,i)=>cells(b).forEach(([x,y])=>map.set(`${x},${y}`,i)));
 const ns=Array.from({length:out.blocks.length},()=>new Set());
 for(const [k,i] of map){const [x,y]=k.split(',').map(Number);for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const j=map.get(`${x+dx},${y+dy}`);if(j!==undefined&&j!==i)ns[i].add(j);}}
 const order=[...out.blocks.keys()].sort((a,b)=>ns[b].size-ns[a].size), assigned=[];
 for(const i of order){const used=new Set([...ns[i]].map(j=>assigned[j]).filter(Boolean));const choices=shuffle(palette.filter(c=>!used.has(c)),r);assigned[i]=choices[0]??palette[Math.floor(r()*palette.length)];}
 out.blocks.forEach((b,i)=>{b.color=assigned[i]; if(Array.isArray(b.layers)&&b.layers.length){b.layers[0]=assigned[i]; if(b.layers.length>1 && b.layers[1]===assigned[i]) b.layers[1]=palette.find(c=>c!==assigned[i])??'blue';}});
 out.name=`v1.68 color retry Lv${out.id} seed ${seed}`; return out;
}
function audits(level){const snap=new api.PuzzleModel(level).snapshot();return {opening:auditOpeningCoverage(snap),hidden:auditHiddenCoverage(level),gates:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level)};}
const rows=[];
for(const id of [121,122,123,124,125]){
 const base=api.LEVELS.find(x=>x.id===id); const attempts=[]; let winner=null;
 for(let n=0;n<48&&!winner;n++){
  const seed=id*100000+n+1, level=recolor(base,seed); let search=null,replay=null,audit=null,error=null;
  try{api.validateLevel(level); audit=audits(level); if(!audit.opening.passed||!audit.hidden.passed||!audit.gates.passed||!audit.queue.passed) throw new Error('static audit failed');
   search=api.searchRevisedLevel(level,{maxStates:700000,maxDragStates:4096,maxTransitions:8000000,maxMilliseconds:4000});
   if(search.status==='witness'){replay=api.replayRevisedRoute(level,search.drags); if(replay.valid&&replay.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15) winner={seed,level,search,replay,audit};}
  }catch(e){error=String(e?.message||e);}
  attempts.push({seed,status:search?.status??'error',termination:search?.termination??null,exploredStates:search?.exploredStates??null,drags:search?.drags?.length??null,nonClearingDrags:replay?.nonClearingDrags??null,error});
 }
 const report={schemaVersion:1,activeRuleVersion:lock.activeVersion,levelId:id,generatedAt:new Date().toISOString(),variantPolicy:'preserve current geometry, gates and mechanisms; recolor only after fresh baseline/candidate search had no accepted route',attempts,winner:winner?{seed:winner.seed,level:winner.level,search:{status:winner.search.status,termination:winner.search.termination,exploredStates:winner.search.exploredStates,drags:winner.search.drags},replay:winner.replay,audit:winner.audit}:null,status:winner?'CANDIDATE_ROUTE_TARGET_FOUND':'NO_TARGET_ROUTE_IN_COLOR_BUDGET',lowerBoundCertified:false,pointerValidated:false,naturalClockValidated:false,formalAdopted:false,releaseApproved:false};
 fs.writeFileSync(path.join(OUT,`retry-color${id}-v168-${Date.now()}.json`),JSON.stringify(report,null,2)+'\n'); rows.push({id,status:report.status,winnerSeed:winner?.seed,attempts:attempts.length,maxNonClearing:Math.max(-1,...attempts.map(a=>a.nonClearingDrags??-1))});
}
console.log(JSON.stringify({activeRuleVersion:lock.activeVersion,rows},null,2));
