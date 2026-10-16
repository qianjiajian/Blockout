import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,createAttemptLedger,importFailedAttempt,verifyBoundedCandidate} from './bounded-proof.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

const output=process.argv[2]??'deliverables/daily-formal-v3-20261008/proof/ledger-canonicalization-v1';
await fs.mkdir(output,{recursive:false});
const directory='deliverables/daily-formal-v3-20261008/proof/attempts';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const oldNames=(await fs.readdir(directory)).filter(name=>name.endsWith('.json'));
const before=Object.fromEntries(await Promise.all(oldNames.map(async name=>[name,sha(await fs.readFile(`${directory}/${name}`))])));
const ledger=await createAttemptLedger(directory),runtime=await loadBoundedRuntime(),failures=[];
for(const name of oldNames)if(name.endsWith('.request.json')){
  const request=JSON.parse(await fs.readFile(`${directory}/${name}`,'utf8'));
  const result=await fs.readFile(`${directory}/${request.id}.result.json`,'utf8').then(JSON.parse).catch(()=>null);
  if(result?.accepted===false){
    const identity=levelSha256({shapeSha256:request.shapeSha256,colorSha256:request.colorSha256});
    const block=JSON.parse(await fs.readFile(`${directory}/identities/${identity}.blocked.json`,'utf8'));
    failures.push({attemptId:request.id,status:result.status,retryIdentitySha256:identity,blocked:!!block});
  }
}
const mechanismDir='deliverables/daily-formal-v3-20261008/mechanisms/bounded-qualified-v3-1';
const starFile=`${mechanismDir}/d3-star.json`,star=JSON.parse(await fs.readFile(starFile,'utf8'));
let imported;
try{imported=await importFailedAttempt(directory,{...star,proof:star.lowerBound.result},starFile);}
catch(error){if(!error.message.startsWith('INPUT_ALREADY_ATTEMPTED'))throw error;imported={alreadyBlocked:true};}
let retryRejected=false;
try{await ledger.claim({...star.level,id:999999,name:'renamed failed four-star input'},{allowRevalidation:true});}
catch(error){if(!error.message.startsWith('INPUT_ALREADY_ATTEMPTED'))throw error;retryRejected=true;}
if(!retryRejected)throw Error('Historical four-star failure retry was not rejected');
const passed=[];
for(const name of ['d1-bomb','d1-flip-door','d1-frozen-exit','d1-layered-lift','d1-shutter']){
  const inputFile=`${mechanismDir}/${name}.json`,old=JSON.parse(await fs.readFile(inputFile,'utf8'));
  if(!old.accepted)throw Error('Only already-passed inputs can receive a fresh successful revalidation');
  const report=await verifyBoundedCandidate(runtime,old,{ledgerDirectory:directory,allowRevalidation:true});
  await fs.writeFile(`${output}/${name}.json`,JSON.stringify({...report,qualificationOnly:true,inputFile},null,2)+'\n',{flag:'wx'});
  passed.push({inputFile,accepted:report.accepted,status:report.status,L:report.L,U:report.U,states:report.lowerBound?.result.discoveredStates,expanded:report.lowerBound?.result.exploredStates});
}
const changed=[];for(const [name,hash]of Object.entries(before))if(sha(await fs.readFile(`${directory}/${name}`))!==hash)changed.push(name);
if(changed.length)throw Error(`Old ledger bytes changed: ${changed.join(',')}`);
const report={toolchainSha256:runtime.toolchainSha256,ruleVersion:runtime.boundedRuleVersion,oldFiles:oldNames.length,oldFilesChanged:changed,
  priorFailedRequests:failures.length,priorFailuresStillBlocked:failures.filter(row=>row.blocked).length,failures,
  fourStarImport:imported,fourStarMetadataRetryRejected:retryRejected,successfulFreshRevalidations:passed,
  productionChanged:false,formalReady:false,qualified:passed.every(row=>row.accepted)};
await fs.writeFile(`${output}/summary.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({...report,failures:undefined}));
