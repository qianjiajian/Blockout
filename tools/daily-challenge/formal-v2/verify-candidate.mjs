import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { loadRuntime, verifyCandidate } from './contract.mjs';

try {
  const [input,output]=process.argv.slice(2);
  if(!input||!output)throw new Error('Usage: node tools/daily-challenge/formal-v2/verify-candidate.mjs candidate.json new-report.json');
  const candidate=JSON.parse(await readFile(input,'utf8'));
  const report=await verifyCandidate(await loadRuntime(),candidate,candidate.verificationBudgets??{});
  await mkdir(dirname(resolve(output)),{recursive:true});
  await writeFile(output,`${JSON.stringify(report,null,2)}\n`,{flag:'wx'});
  console.log(JSON.stringify({formalId:report.formalId,status:report.status,L:report.L,U:report.U,accepted:report.accepted,
    formalReady:report.formalReady,levelSha256:report.levelSha256,reasons:report.reasons,output}));
  if(!report.accepted)process.exitCode=2;
}catch(error){console.error(error.message);process.exitCode=1;}
