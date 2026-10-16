import fs from 'node:fs/promises';
import path from 'node:path';
import {loadLeagueProofRuntime,revalidateSuccessfulReceipt,PROOF_ROOT} from './proof-contract.mjs';
const base='deliverables/league-v2-20261008/design';
const priority=['compact-global-01/candidate-00189.json','compact-global-01/candidate-00484.json','compact-global-01/candidate-00505.json'];
const files=[];
for(const folder of await fs.readdir(base,{withFileTypes:true}))if(folder.isDirectory()){
  for(const file of await fs.readdir(path.join(base,folder.name)))if(/^candidate-\d+\.json$/.test(file))files.push(`${folder.name}/${file}`);
}
files.sort((a,b)=>{const pa=priority.indexOf(a),pb=priority.indexOf(b);return(pa<0?999:pa)-(pb<0?999:pb)||a.localeCompare(b);});
const runtime=await loadLeagueProofRuntime(),rows=[];
const output=path.join(PROOF_ROOT,`successful-raw-revalidation-${Date.now()}.json`);
for(const file of files){
  const basePath=`${base}/${file}`,packet=JSON.parse(await fs.readFile(basePath,'utf8'));
  if(!packet.accepted||!packet.proof?.accepted||packet.proof?.lower?.rawFullBoardStates!==undefined)continue;
  const row={basePath,sourceLevelId:packet.sourceLevelId,previousReceipt:packet.proof.proofReceipt};
  try{
    const result=await revalidateSuccessfulReceipt(runtime,row.previousReceipt),proof=result.lower??result.lowerBound?.result;
    Object.assign(row,{status:result.status,accepted:result.accepted,proofReceipt:result.proofReceipt,L:result.L,U:result.U,
      levelSha256:result.levelSha256,rawFullBoardStates:proof?.rawFullBoardStates,quotientDiscoveredStates:proof?.quotientDiscoveredStates,termination:proof?.termination});
  }catch(error){row.status='REVALIDATION_ERROR';row.accepted=false;row.error=error.message;}
  rows.push(row);console.log(JSON.stringify(row));
  await fs.writeFile(output,JSON.stringify({status:'RAW_REVALIDATION_INDEX',formalReady:false,rows,accepted:rows.filter(r=>r.accepted).length,rejected:rows.filter(r=>!r.accepted).length},null,2)+'\n');
}
console.log(JSON.stringify({output,rows:rows.length,accepted:rows.filter(r=>r.accepted).length}));
