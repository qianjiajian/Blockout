import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4StageContract} from './static-contract.mjs';

const [indexPath,output]=process.argv.slice(2);
assert(indexPath&&output,'Usage: node progress-report.mjs <verified index> <new output file>');
const bytes=await fs.readFile(indexPath),index=JSON.parse(bytes),contract=await loadV4StageContract();
assert.equal(index.scope,300);assert.equal(index.formalReady,false);
const records=await Promise.all(index.files.map(async file=>JSON.parse(await fs.readFile(file))));
const expected=new Map(contract.DAILY_CHALLENGE_V3_SLOTS.map(s=>[s.id,s]));
const ids=new Set();
for(const r of records){
 const slot=expected.get(r.formalId);
 assert(slot&&r.accepted&&!ids.has(r.formalId));ids.add(r.formalId);
 for(const key of ['stageKey','difficulty','slot','newestMechanism'])assert.equal(r[key],slot[key]);
}
const names={'basic-combined':'基础合并池（普通出口、异形色块、冰冻出口、异形棋盘、数字冰块、卷帘门）',
 'multilayer-shell':'外壳块',generator:'色块生成器','axis-block':'轴向块','key-lock':'钥匙与锁',
 'layered-lift':'升降台',star:'星标块与星门',bomb:'炸弹','flip-door':'翻转门','colored-grid':'彩色地格'};
const stages=contract.DAILY_CHALLENGE_STAGES_V3.map(s=>{
 const candidates=[1,2,3].map(d=>records.filter(r=>r.stageKey===s.key&&r.difficulty===d).length);
 return{stageKey:s.key,name:names[s.newestMechanism??s.key],unlockLevel:s.unlockLevel,
  acceptedCandidates:candidates,missing:candidates.map(n=>10-n),totalCandidates:candidates.reduce((n,a)=>n+a,0),formal:0};
});
await fs.writeFile(output,JSON.stringify({status:'PARTIAL_CANDIDATE_INVENTORY_NOT_FORMAL',scope:300,
 index:{path:indexPath,sha256:createHash('sha256').update(bytes).digest('hex')},
 candidates:records.length,missing:300-records.length,formal:0,stages,
 productionCatalog:'legacy-450-unchanged-until-complete-300-adoption',formalReady:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({candidates:records.length,missing:300-records.length,formal:0,output}));
