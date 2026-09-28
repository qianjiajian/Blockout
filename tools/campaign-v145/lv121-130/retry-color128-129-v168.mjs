import fs from 'node:fs';
import path from 'node:path';
import {build} from 'esbuild';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditGateSpanLimits} from '../../revised-gate-span-limits.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';
import {auditGeneratorQueueColors} from '../../revised-generator-queue-colors.mjs';

const lock=verifyRulesLock(); if(!lock.ok) throw new Error(lock.errors.join('\n'));
const bundle=await build({stdin:{resolveDir:process.cwd(),sourcefile:'retry-color128-129-entry.ts',loader:'ts',contents:`
 export {validateLevel,PuzzleModel} from './src/core/PuzzleModel.ts';
 export {searchRevisedLevel,replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
`},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const root='deliverables/campaign121-130-v146-20260924/agent128-130';
const palette=['red','blue','orange','yellow','green','pink','purple','cyan'];
const files={128:'candidate128-v166-draft.json',129:'candidate129-v166-draft.json'};
const hash=(seed)=>{let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return s/0x100000000;};};
const shuffle=(a,rng)=>{const x=[...a];for(let i=x.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[x[i],x[j]]=[x[j],x[i]];}return x;};
function cells(b){return b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy]);}
function colorVariant(level,seed){
  const rng=hash(seed), out=structuredClone(level);
  const edge=(b)=>cells(b).some(([x,y])=>x===0||y===0||x===out.width-1||y===out.height-1);
  const interior=out.blocks.map((b,i)=>({b,i})).filter(x=>!edge(x.b)).map(x=>x.i);
  const swaps=Math.min(8,1+(seed%8));
  for(let n=0;n<swaps&&interior.length>1;n++){
    const a=interior[Math.floor(rng()*interior.length)], choices=interior.filter(i=>i!==a);const b=choices[Math.floor(rng()*choices.length)];
    [out.blocks[a].color,out.blocks[b].color]=[out.blocks[b].color,out.blocks[a].color];
  }
  out.blocks.forEach(b=>{if(Array.isArray(b.layers)&&b.layers.length)b.layers[0]=b.color;});
  out.name=`v1.68 color retry Lv${out.id} seed ${seed}`;out.mechanismRules='revised-2026-09-23-v1.4';return out;
}
function audit(level){const snap=new api.PuzzleModel(level).snapshot();return {opening:auditOpeningCoverage(snap),hidden:auditHiddenCoverage(level),gates:auditGateSpanLimits(level),queue:auditGeneratorQueueColors(level)};}
const rows=[];
for(const id of [128,129]){
  const input=JSON.parse(fs.readFileSync(path.join(root,files[id]),'utf8'));const base=input.level;const attempts=[];let winner=null;
  for(let n=0;n<24&&!winner;n++){
    const seed=id*100000+n+1, level=colorVariant(base,seed);let search=null,replay=null,error=null,auditResult=null;
    try{api.validateLevel(level);auditResult=audit(level);if(!auditResult.opening.passed||!auditResult.hidden.passed||!auditResult.gates.passed||!auditResult.queue.passed)throw new Error('static audit failed');search=api.searchRevisedLevel(level,{maxStates:400000,maxDragStates:4096,maxTransitions:5000000,maxMilliseconds:1500});if(search.status==='witness'){replay=api.replayRevisedRoute(level,search.drags);if(replay.valid&&replay.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15)winner={seed,level,search,replay,audit:auditResult};}}
    catch(e){error=String(e?.message||e);}
    attempts.push({seed,status:search?.status??'error',termination:search?.termination??null,exploredStates:search?.exploredStates??null,nonClearingDrags:replay?.nonClearingDrags??null,error});
  }
  const report={schemaVersion:1,activeRuleVersion:lock.activeVersion,sourceCandidate:files[id],levelId:id,generatedAt:new Date().toISOString(),variantPolicy:'preserve geometry/mechanisms; recolor only after baseline route remained below target',attempts,winner:winner?{seed:winner.seed,level:winner.level,search:{status:winner.search.status,termination:winner.search.termination,exploredStates:winner.search.exploredStates,drags:winner.search.drags},replay:winner.replay,audit:winner.audit}:null,status:winner?'CANDIDATE_ROUTE_TARGET_FOUND':'NO_TARGET_ROUTE_IN_COLOR_BUDGET',lowerBoundCertified:false,pointerValidated:false,naturalClockValidated:false,formalAdopted:false,releaseApproved:false};
  fs.writeFileSync(path.join(root,`retry-color${id}-v168-${Date.now()}.json`),JSON.stringify(report,null,2)+'\n');rows.push({id,status:report.status,winnerSeed:winner?.seed,attempts:attempts.length,maxNonClearing:Math.max(-1,...attempts.map(a=>a.nonClearingDrags??-1))});
}
console.log(JSON.stringify({activeRuleVersion:lock.activeVersion,rows},null,2));
