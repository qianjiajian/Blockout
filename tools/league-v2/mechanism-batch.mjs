import fs from 'node:fs';
import path from 'node:path';
import {loadLeagueProofRuntime,verifyLeagueCandidate} from './proof-contract.mjs';
import {composeLeagueMechanisms} from './mechanism-compose.mjs';
import {leagueMechanismPlan,mechanismInventory} from './mechanism-policy.mjs';

const ROOT='deliverables/league-v2-20261008',OUT=`${ROOT}/mechanisms/batch-${Date.now()}`;
fs.mkdirSync(OUT,{recursive:true});
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>d.isDirectory()?walk(path.join(dir,d.name)):[path.join(dir,d.name)]),read=f=>JSON.parse(fs.readFileSync(f));
const baseline=read(`${ROOT}/mechanisms/old-formal100-mechanisms.json`),runtime=await loadLeagueProofRuntime();
const inputs=new Map(),consumed=new Set(),assigned=new Set([1,2,3,4,38,59,100]);
for(const f of walk(`${ROOT}/design`).filter(f=>f.endsWith('report.json'))){const p=read(f);for(const row of p.accepted??[])if(row.path)inputs.set(row.path.replaceAll('\\','/'),row);}
const excluded=['global-02/candidate-00254.json','global-02/candidate-01277.json','compact-global-01/candidate-00373.json','refinement-01/candidate-00076.json','compact-global-01/candidate-00189.json','compact-global-01/candidate-00484.json','compact-global-01/candidate-00505.json','raw-compact-01/candidate-01410.json'];
for(const f of inputs.keys())if(excluded.some(x=>f.endsWith(x)))consumed.add(f);
const sourceRepair8=`${ROOT}/mechanisms/proof-attempts/49e67afe317c8fa9fff8116af28de5189116042828f1047207b77dc107a26ef9.static-source-repair-v1.result.json`;
const replaced=s=>s.index===15&&s.basePath?.endsWith('compact-global-01/candidate-00373.json')||s.index===13&&s.basePath?.endsWith('ice-inventory-01/candidate-00753.json')&&fs.existsSync(sourceRepair8)&&read(sourceRepair8).accepted;
for(const f of walk(`${ROOT}/mechanisms`).filter(f=>f.endsWith('.json')&&!f.endsWith('.mechanism.json'))){let p;try{p=read(f);}catch{continue;}if(p.proof&&p.basePath){consumed.add(p.basePath.replaceAll('\\','/'));if(p.proof.accepted&&!replaced({index:p.proof.index,basePath:p.basePath}))assigned.add(p.proof.index);}if(Array.isArray(p.selections))for(const s of p.selections){if(!replaced(s))assigned.add(s.index);if(s.basePath)consumed.add(s.basePath);}for(const input of p.consumed??[])consumed.add(input);}
if(fs.existsSync(sourceRepair8)&&read(sourceRepair8).accepted)assigned.add(8);
const priority=[35,36,37,43,48,53,65,66,67,50,51,52,60,61,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,32,33,34,...Array.from({length:100},(_,i)=>i+1)];
const targets=[...new Set(priority)].filter(i=>!assigned.has(i)),selections=[],attempts=[];
for(const [basePath,meta]of inputs){
 if(consumed.has(basePath))continue;
 const input=read(basePath),cost=input.U??input.proof?.cost??input.replay?.nonClearingDrags;if(!input.level||!input.drags||cost<16||cost>30)continue;
 // Direct native mechanism proofs are already final objects; they receive
 // read-only participation validation separately, never another solve here.
 if(Object.values(mechanismInventory(input.level)).some(items=>items.length))continue;
 const difficulty=cost>=21?'super':'hard';
 const eligible=targets.filter(i=>!assigned.has(i)&&(i%5===3?'super':'hard')===difficulty);
 let count=0;
 for(const index of eligible){
  if(index===8&&(input.level.playable?.length??input.level.width*input.level.height)===(input.level.width*input.level.height)&&!(input.level.blocked?.length))continue;
  const plan=leagueMechanismPlan(index),duplicateKey=plan.primary+':'+plan.primaryTargets.instances+':'+baseline.rows[index-1].blocks;
  // Only a few representative slot intensities per primary; identical pure
  // adaptation failures are not run against every slot of the same stage.
  if(attempts.some(a=>a.basePath===basePath&&a.duplicateKey===duplicateKey&&a.mechanismOk===false))continue;
  const mechanisms=await composeLeagueMechanisms(input,{index,sourceLevelId:input.sourceLevelId,runtime,previousInventory:baseline.rows[index-1].inventory});
  const serial=String(attempts.length+1).padStart(4,'0'),mechanismFile=`${OUT}/${serial}-index-${String(index).padStart(3,'0')}.mechanism.json`;
  fs.writeFileSync(mechanismFile,JSON.stringify({...mechanisms,basePath,mechanismReceipt:mechanismFile},null,2)+'\n',{flag:'wx'});
  const row={index,basePath,mechanismFile,duplicateKey,mechanismOk:mechanisms.ok,reason:mechanisms.reason};attempts.push(row);count++;
  if(mechanisms.ok){
   let proof;try{proof=await verifyLeagueCandidate(runtime,mechanisms,{ledgerDirectory:`${ROOT}/mechanisms/proof-attempts`,lowerBudget:{maxStates:10000,maxTransitions:3000000,maxMicroStates:1000000,maxMilliseconds:10000},attemptKey:`league-${index}`});}catch(e){row.proofError=e.message;}
   if(proof){Object.assign(row,{proofStatus:proof.status,proofFile:proof.proofReceipt,L:proof.L,U:proof.U});if(proof.accepted){assigned.add(index);selections.push({index,basePath,mechanismFile,proofFile:proof.proofReceipt});}}
   consumed.add(basePath);console.log(JSON.stringify(row));break;
  }
  if(count>=24)break;
 }
 fs.writeFileSync(`${OUT}/summary.json`,JSON.stringify({status:'FINITE_BATCH_CURRENT_RESULTS',selections,attempts,assigned:[...assigned],consumed:[...consumed]},null,2)+'\n');
}
console.log(JSON.stringify({out:`${OUT}/summary.json`,accepted:selections.length,attempts:attempts.length}));
