import fs from 'node:fs/promises';
import path from 'node:path';
import {loadBoundedRuntime,verifyBoundedCandidate,importFailedAttempt} from './bounded-proof.mjs';

const root='deliverables/daily-formal-v3-20261008/proof',runtime=await loadBoundedRuntime();
const output=process.argv[2]??`${root}/qualification-v1`;await fs.mkdir(output,{recursive:false});
const fixtures=[
  'deliverables/daily-formal-v2-20261007/final-qualified/daily-mechanisms-color-exit-1-d1-08.json',
  'deliverables/daily-formal-v2-20261007/final-qualified/daily-mechanisms-irregular-board-8-d2-03.json',
  'deliverables/daily-formal-v2-20261007/final-qualified/daily-mechanisms-layered-lift-65-d3-01.json',
  'deliverables/daily-formal-v3-20261008/design/global-pilot-02/candidate-0030.json',
];
const records=[];
for(const [index,file]of fixtures.entries()){
  const candidate=JSON.parse(await fs.readFile(file,'utf8'));
  if(!candidate.stageKey){
    const mechanisms=runtime.mechanismsUsedByDailyLevel(candidate.level);
    const stage=runtime.MECHANISM_GUIDE.filter(s=>mechanisms.includes(s.id)).at(-1);
    candidate.stageKey=`mechanisms-${stage.id}-${stage.unlockLevel}`;candidate.formalId=`daily-${candidate.stageKey}-d${candidate.difficulty}-qualification`;
  }
  const report=await verifyBoundedCandidate(runtime,candidate,{ledgerDirectory:`${output}/attempts`});
  report.qualificationOnly=true;report.inputFile=file;
  await fs.writeFile(`${output}/candidate-${index}.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  const row={file,status:report.status,L:report.L,U:report.U,accepted:report.accepted,method:report.lowerBound?.method,
    discovered:report.lowerBound?.result.discoveredStates,expanded:report.lowerBound?.result.exploredStates,
    transitions:report.lowerBound?.result.attemptedTransitions,micro:report.lowerBound?.result.microExploredStates,
    reasons:report.reasons};records.push(row);console.log(JSON.stringify(row));
}
const imports=[];
for(const pilot of ['global-pilot-01','global-pilot-02']){
  const dir=`deliverables/daily-formal-v3-20261008/design/${pilot}`;
  for(const file of await fs.readdir(dir))if(/^candidate-\d+\.json$/.test(file)){
    const sourceFile=path.join(dir,file).replaceAll('\\','/'),packet=JSON.parse(await fs.readFile(sourceFile,'utf8'));
    if(!packet.level||packet.accepted===true||!packet.proof)continue;
    try{imports.push(await importFailedAttempt(`${root}/attempts`,packet,sourceFile));}
    catch(error){if(!error.message.startsWith('INPUT_ALREADY_ATTEMPTED'))throw error;imports.push({sourceFile,alreadyBlocked:true});}
  }
}
await fs.writeFile(`${output}/summary.json`,JSON.stringify({qualificationOnly:true,toolchainSha256:runtime.toolchainSha256,
  records,importedFailures:imports,productionChanged:false,formalReady:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({qualified:records.filter(r=>r.accepted).length,total:records.length,importedFailures:imports.length,toolchainSha256:runtime.toolchainSha256}));
