import fs from 'node:fs/promises';
import {loadLeagueProofRuntime,levelSha256} from './proof-contract.mjs';
import {composeLeagueMechanisms} from './mechanism-compose.mjs';
import {candidateDiversity} from './diversity-contract.mjs';

const runtime=await loadLeagueProofRuntime(),out='deliverables/league-v2-20261008/early';
const baseline=JSON.parse(await fs.readFile('deliverables/league-v2-20261008/mechanisms/old-formal100-mechanisms.json','utf8'));
const inputs=[
 [1,'deliverables/league-v2-20261008/design/compact-global-01/candidate-00189.json'],
 [2,'deliverables/league-v2-20261008/design/compact-global-01/candidate-00484.json'],
 [3,'deliverables/league-v2-20261008/design/compact-global-01/candidate-00505.json'],
];
await fs.mkdir(out,{recursive:true});const rows=[],accepted=[];
for(const[index,file]of inputs){
 const packet=JSON.parse(await fs.readFile(file,'utf8'));
 if(!packet.accepted||!packet.level||!packet.drags)throw Error('Need proven base candidate: '+file);
 const candidate=await composeLeagueMechanisms(packet,{index,runtime,sourceLevelId:packet.sourceLevelId,previousInventory:baseline.rows[index-1].inventory});
 if(!candidate.ok)throw Error('Early construction failed: '+candidate.reason);
 const design=candidateDiversity(candidate,accepted);if(!design.accepted)throw Error('Early geometry repeats: '+design.reasons);
 const destination=`${out}/index-${String(index).padStart(3,'0')}.mechanism.json`;
 await fs.writeFile(destination,JSON.stringify({...candidate,basePath:file,baseLevelSha256:levelSha256(packet.level),newRawBudgetProofPending:true},null,2)+'\n',{flag:'wx'});
 accepted.push(candidate);rows.push({index,sourceLevelId:candidate.sourceLevelId,baseFile:file,mechanismFile:destination,L:packet.L,U:packet.U,status:'CANDIDATE_PENDING_FINAL_OBJECT_PROOF',formalReady:false});
}
await fs.writeFile(`${out}/prepared.json`,JSON.stringify({status:'PREPARED_NOT_FORMAL',formalReady:false,rows},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({prepared:rows,formalReady:false}));
