import fs from 'node:fs';
import {loadRuntime,verifyCandidate,levelSha256} from './contract.mjs';
import {decorate} from './mechanism-decorate.mjs';
const OUT='deliverables/daily-formal-v2-20261007/mechanism-lab/generator-gatesearch-v1';fs.mkdirSync(OUT,{recursive:true});
const baseFile=process.env.MECHANISM_BASE??'deliverables/daily-formal-v2-20261007/design-lab/stage1-d1-10-seed.json';
const base=JSON.parse(fs.readFileSync(baseFile)),runtime=await loadRuntime(),rows=[],candidates=[];
const overlap=(a,b)=>a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size;
function usefulRim(level){return ['left','right','top'].some(side=>{
 const length=['left','right'].includes(side)?level.height:level.width;
 return Array.from({length:length-2},(_,i)=>i+1).some(offset=>!level.gates.some(g=>overlap(g,{side,offset:offset-1,size:3})));
});}
for(const gate of base.level.gates)for(const side of ['left','right','top','bottom']){
 const size=Math.max(...base.level.blocks.filter(b=>b.color===gate.color).map(b=>1+Math.max(...b.shape.map(p=>p[['left','right'].includes(side)?1:0]))));
 const length=['left','right'].includes(side)?base.level.height:base.level.width;
 for(let offset=0;offset<=length-size;offset++){
  if(gate.side===side&&gate.offset===offset&&gate.size===size)continue;
  const level=structuredClone(base.level),changed=level.gates.find(g=>g.id===gate.id);Object.assign(changed,{side,offset,size});
  if(level.gates.some(g=>g.id!==changed.id&&overlap(g,changed))||!usefulRim(level))continue;
  candidates.push({level,change:{before:gate,after:changed}});
 }
}
for(const [i,candidate]of candidates.slice(0,64).entries()){
 const row={i,change:candidate.change,levelSha256:levelSha256(candidate.level)};
 try{
  const search=runtime.checkPlainFloor(candidate.level,runtime,{floor:16,searchUpper:20,maxStates:60000,maxTransitions:500000,maxMilliseconds:2000});
  row.search={status:search.status,U:search.cost,termination:search.termination,states:search.exploredStates};
  if(search.drags&&search.cost>=16&&search.cost<=20){
   const decorated=await decorate(candidate.level,search.drags,'generator',{runtime,difficulty:1,sourceLevelId:2,maxAttempts:24});
   row.decorated=decorated.ok;row.decorationFailures=decorated.attempts;
   if(decorated.ok){const certified=await verifyCandidate(runtime,decorated,{lowerBudget:{maxStates:150000,maxTransitions:1000000,maxMilliseconds:15000}});row.accepted=certified.accepted;row.status=certified.status;row.U=certified.U;
    row.path=`${OUT}/candidate-${i}.json`;fs.writeFileSync(row.path,JSON.stringify({fixtureOnly:true,baseFile,change:candidate.change,search,decorated,certified},null,2)+'\n');
   }
  }
 }catch(error){row.error=error.message;}
 rows.push(row);fs.writeFileSync(`${OUT}/summary.json`,JSON.stringify({baseFile,candidateCount:candidates.length,maxCandidates:64,rows},null,2)+'\n');console.log(JSON.stringify(row));
}
