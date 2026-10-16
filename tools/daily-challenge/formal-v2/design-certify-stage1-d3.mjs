import fs from 'node:fs';
import {loadRuntime,verifyCandidate,levelSha256} from './contract.mjs';
import {independentPartitionSha256} from './geometry.mjs';
const OUT='deliverables/daily-formal-v2-20261007/design-lab';
const runtime=await loadRuntime(),source=runtime.LEVELS.find(l=>l.id===198);
const report=JSON.parse(fs.readFileSync(`${OUT}/nearby-b0-report.json`));
const prior=new Set(),rows=[];
const budget={maxStates:160000,maxTransitions:900000,maxMilliseconds:8000};
for(const reference of report.candidates.filter(r=>r.difficulty===3)){
 if(rows.filter(r=>r.accepted).length>=10)break;
 const priorCandidate=JSON.parse(fs.readFileSync(reference.path)),level=structuredClone(priorCandidate.level);
 const partition=independentPartitionSha256(level);if(prior.has(partition))continue;
 const slot=rows.filter(r=>r.accepted).length+1,formalId=`daily-mechanisms-color-exit-1-d3-${String(slot).padStart(2,'0')}`;
 level.id=198;level.reward=0;level.name=`每日挑战·基础·超超难${slot}`;
 const changes=level.blocks.flatMap(b=>{const before=source.blocks.find(a=>a.id===b.id);if(!before)return[{id:b.id,added:true,after:b}];const diff=Object.fromEntries([...new Set([...Object.keys(before),...Object.keys(b)])].filter(k=>JSON.stringify(before[k])!==JSON.stringify(b[k])).map(k=>[k,{before:before[k]??null,after:b[k]??null}]));return Object.keys(diff).length?[{id:b.id,diff}]:[];});
 const candidate={formalId,stageKey:'mechanisms-color-exit-1',difficulty:3,sourceLevelId:198,sourceLevelSha256:levelSha256(source),level,drags:priorCandidate.drags};
 const evidence=await verifyCandidate(runtime,candidate,{lowerBudget:budget});
 evidence.provenance={baselinePath:reference.path,sourceLevelId:198,sourceLevelSha256:levelSha256(source),removedMechanisms:['frozen-exit','numeric-ice','multilayer-shell','key-lock'],blockChanges:changes,gateChanges:level.gates.map(g=>({id:g.id,before:source.gates.find(a=>a.id===g.id),after:g})),partitionSha256:partition,ruleVersion:'1.153.0'};
 const path=`${OUT}/stage1-d3-${String(slot).padStart(2,'0')}-${rows.length}.json`;
 fs.writeFileSync(path,JSON.stringify(evidence,null,2)+'\n');
 rows.push({formalId,path,accepted:evidence.accepted,L:evidence.L,U:evidence.U,status:evidence.status,reasons:evidence.reasons,partitionSha256:partition});
 if(evidence.accepted)prior.add(partition);
 fs.writeFileSync(`${OUT}/stage1-d3-certified.json`,JSON.stringify({ruleVersion:'1.153.0',productionChanged:false,rows,accepted:rows.filter(r=>r.accepted).length},null,2)+'\n');
 console.log(JSON.stringify(rows.at(-1)));
}
