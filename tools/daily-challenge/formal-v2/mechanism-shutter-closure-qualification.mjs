import fs from 'node:fs';
import {loadRuntime,verifyCandidate} from './contract.mjs';
import {decorate} from './mechanism-decorate.mjs';
const ROOT='deliverables/daily-formal-v2-20261007',OUT=`${ROOT}/mechanism-lab/shutter-closure-qualified-v1`;fs.mkdirSync(OUT,{recursive:true});
const history=JSON.parse(fs.readFileSync(`${ROOT}/selected-v2/attempt-history.json`)),runtime=await loadRuntime(),rows=[];
const samples=[1,2,3].flatMap(difficulty=>history.filter(x=>x.difficulty===difficulty&&x.stageKey==='mechanisms-shutter-20'&&x.path&&!x.accepted).slice(0,3));
for(const [index,row]of samples.entries()){
 const base=JSON.parse(fs.readFileSync(row.baseFile));
 const decorated=await decorate(base.level,base.drags,'shutter',{runtime,difficulty:row.difficulty,sourceLevelId:base.sourceLevelId,maxAttempts:24,variant:9,idPrefix:`closure-fixture-${index}`});
 const certified=decorated.ok?await verifyCandidate(runtime,decorated,{lowerBudget:{maxStates:250000,maxTransitions:2000000,maxMilliseconds:15000}}):null;
 const file=`${OUT}/candidate-${index}.json`;fs.writeFileSync(file,JSON.stringify({fixtureOnly:true,baseFile:row.baseFile,priorFailurePath:row.path,decorated,certified},null,2)+'\n');
 const result={baseFile:row.baseFile,difficulty:row.difficulty,plan:decorated.provenance?.plan,status:certified?.status??decorated.reason,L:certified?.L,U:certified?.U,file};rows.push(result);fs.writeFileSync(`${OUT}/summary.json`,JSON.stringify(rows,null,2)+'\n');console.log(JSON.stringify(result));
}
