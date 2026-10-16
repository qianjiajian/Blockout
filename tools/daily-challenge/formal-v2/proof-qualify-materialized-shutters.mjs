import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {loadRuntime,verifyCandidate} from './contract.mjs';

// Bounded qualification of existing immutable FAIL fixtures. Each fresh report
// goes to a new directory; original source, route, and old outcomes stay intact.
const runtime=await loadRuntime();
const output=resolve(process.argv[2]??'deliverables/daily-formal-v2-20261007/proof-contract/shutter-materialization-qualified');
await mkdir(output,{recursive:true});
const records=[];
for(let i=0;i<8;i++){
  const input=`deliverables/daily-formal-v2-20261007/mechanism-lab/shutter-closure-qualified-v1/candidate-${i}.json`;
  const old=JSON.parse(await readFile(input,'utf8'));
  const fresh=await verifyCandidate(runtime,old.decorated,{lowerBudget:{maxMilliseconds:5000,maxStates:160000,maxTransitions:900000}});
  const report={input,priorFailurePath:old.priorFailurePath,fixtureOnly:true,...fresh};
  await writeFile(resolve(output,`candidate-${i}.json`),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  const row={i,input,status:fresh.status,accepted:fresh.accepted,L:fresh.L,U:fresh.U,
    method:fresh.lowerBound?.method,termination:fresh.lowerBound?.result.termination,
    levelSha256:fresh.levelSha256,projectedLevelSha256:fresh.lowerBound?.projectedLevelSha256,
    states:fresh.lowerBound?.result.discoveredStates,transitions:fresh.lowerBound?.result.attemptedTransitions};
  records.push(row);console.log(JSON.stringify(row));
}
await writeFile(resolve(output,'summary.json'),JSON.stringify({toolchainSha256:runtime.toolchainSha256,
  toolchainBindings:runtime.toolchainBindings,fixtureOnly:true,productionChanged:false,formalReady:false,
  records},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({accepted:records.filter(x=>x.accepted).length,total:records.length,toolchainSha256:runtime.toolchainSha256,output}));
