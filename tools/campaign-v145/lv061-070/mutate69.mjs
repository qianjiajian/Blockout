import fs from 'node:fs';
import {loadApi,auditStructure,OUTPUT,writeNew,ruleGate} from './remake61to70-v146.mjs';
import {search} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const file=process.argv[2],seed=Number(process.env.SEED??14769001),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)],{api}=await loadApi(),lock=ruleGate();
let best=JSON.parse(fs.readFileSync(file)),attempts=0,valid=0,solved=0;const start=Date.now(),deadline=start+Number(process.env.SECONDS??180)*1000,outputs=[],failures={};
while(Date.now()<deadline){
 attempts++;const level=structuredClone(best.level),changes=[];
 if(rng.rand()<.8){
  const stage=rng.rand()<.75?undefined:pick(level.shutters).id,bs=level.blocks.filter(b=>b.shutterId===stage),pairs=[];
  for(let i=0;i<bs.length;i++)for(let j=0;j<i;j++)if(JSON.stringify(bs[i].shape)===JSON.stringify(bs[j].shape))pairs.push([bs[i],bs[j]]);
  if(!pairs.length)continue;for(let n=0;n<(rng.rand()<.2?2:1);n++){const[a,b]=pick(pairs);[a.x,b.x]=[b.x,a.x];[a.y,b.y]=[b.y,a.y];changes.push({swap:[a.id,b.id]});}
 }else{
  const g=pick(level.gates);if(rng.rand()<.65){g.offset+=pick([-2,-1,1,2]);changes.push({gate:g.id,offset:g.offset});}
  else{const h=pick(level.gates.filter(q=>q!==g));for(const k of ['side','offset','size'])[g[k],h[k]]=[h[k],g[k]];changes.push({gateGeometrySwap:[g.id,h.id]});}
 }
 try{auditStructure({level},api);}catch(e){failures[e.message.slice(0,60)]=(failures[e.message.slice(0,60)]??0)+1;continue;}valid++;
 const result=search(level,{floor:best.replay.nonClearingDrags+1,maxStates:50000,maxMilliseconds:450,weight:1000,orderSeed:attempts%level.blocks.length});
 if(result.status!=='witness')continue;const replay=api.replayRevisedRoute(level,result.drags);if(!replay.valid||!replay.complete)continue;solved++;
 if(replay.nonClearingDrags>best.replay.nonClearingDrags)continue;
 const parentLevelSha256=digest(best.level);best={...best,level,drags:result.drags,replay,search:result,levelSha256:digest(level),routeSha256:digest(result.drags),mutation:{seed,attempt:attempts,parentLevelSha256,changes},lowerBoundStatus:'NOT_RUN',pointerStatus:'NOT_RUN',formalAdopted:false};
 const out=`${OUTPUT}/root69/mutation69-${seed}-${attempts}-${Date.now()}.json`;writeNew(out,best);outputs.push(out);console.log(JSON.stringify({out,U:replay.nonClearingDrags,totalDrags:replay.effectiveDrags,attempts,valid,solved}));
 if(replay.nonClearingDrags<=10)break;
}
writeNew(`${OUTPUT}/root69/mutation-run-${Date.now()}.json`,{ruleVersion:lock.activeVersion,seed,base:file,attempts,valid,solved,ms:Date.now()-start,bestU:best.replay.nonClearingDrags,outputs,failures});console.log(JSON.stringify({attempts,valid,solved,bestU:best.replay.nonClearingDrags,ms:Date.now()-start}));
