import fs from 'node:fs/promises';
import { build } from 'esbuild';
import { createHash } from 'node:crypto';
import { loadRuntime, levelSha256, verifyCandidate } from './contract.mjs';
import { catalogProgress, expectedDailySlots } from './catalog-progress.mjs';
import { requireCompleteCatalog } from './emit-catalog.mjs';
import { verifyRulesLock } from '../../verify-rules-lock.mjs';

const [output]=process.argv.slice(2);
if(!output)throw Error('Usage: verify-runtime.mjs new-evidence-directory');
const lock=verifyRulesLock();if(!lock.ok)throw Error('Rules lock failed');
const built=await build({stdin:{resolveDir:process.cwd(),loader:'ts',contents:[
  'export * from "./src/core/dailyChallenge.ts";',
  'export * from "./src/core/formalDailyChallengeData.ts";',
  'export { LEVELS } from "./src/core/levels.ts";',
].join('\n')},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
if(api.FORMAL_DAILY_CHALLENGE_SCHEMA_VERSION!==2)throw Error('Explicit certified schema 2 registry is required');
const runtime=await loadRuntime(),expected=expectedDailySlots(runtime.MECHANISM_GUIDE);
const candidates=api.FORMAL_DAILY_CHALLENGE_CATALOG.flatMap(stage=>[1,2,3].flatMap(d=>stage.difficulties[d].candidates));
if(candidates.length!==450)throw Error('Production must contain exactly 450 candidates');
const evidence=await catalogProgress(runtime,candidates.map(c=>c.proofReport));requireCompleteCatalog(evidence);
const before=levelSha256(api.LEVELS),rows=[],files=[],bindings={...runtime.toolchainBindings};
for(const file of ['src/core/dailyChallenge.ts','src/core/formalDailyChallengeData.ts','tools/daily-challenge/formal-v2/verify-runtime.mjs']){
  bindings[file]=createHash('sha256').update(await fs.readFile(file)).digest('hex');
}
await fs.mkdir(output,{recursive:false});
for(const slot of expected){
  const candidate=api.getFormalDailyChallengeCandidate(slot.formalId);
  if(!candidate)throw Error(`Missing exact formal slot ${slot.formalId}`);
  const state=api.createDailyChallengeState('2026-10-07',slot.unlockLevel,api.LEVELS,11993);
  state.selected[slot.difficulty]=slot.slot-1;
  const assignment=api.getDailyChallengeAssignment(state,slot.difficulty);
  if(assignment?.id!==slot.formalId)throw Error('Production slot order changed');
  const level=api.cloneDailyChallengeLevel(assignment),bytes=await fs.readFile(candidate.proofReport),prior=JSON.parse(bytes);
  if(!level||levelSha256(level)!==candidate.layoutSha256||levelSha256(level)!==prior.levelSha256)throw Error(`Production clone/proof mismatch ${slot.formalId}`);
  if(createHash('sha256').update(bytes).digest('hex')!==candidate.proofReportSha256)throw Error(`Receipt file changed ${slot.formalId}`);
  for(const [key,value]of Object.entries({sourceLevelId:0,layoutSha256:'0'.repeat(64),catalogRevision:'stale',id:'absent'})){
    if(api.cloneDailyChallengeLevel({...assignment,[key]:value})!==undefined)throw Error(`Tampered ${key} was accepted`);
  }
  const result=await verifyCandidate(runtime,{...prior,level},{lowerBudget:{maxStates:250000,maxDragStates:2000,maxTransitions:3000000,maxMilliseconds:10000}});
  result.runtimeBinding={formalRegistryIdentity:true,catalogRevision:api.FORMAL_DAILY_CHALLENGE_REVISION,assignment,bindings,
    sourceRegistrySha256:before,previousReceipt:candidate.proofReport};
  const file=`${output}/${slot.formalId}.json`;await fs.writeFile(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});files.push(file);
  rows.push({formalId:slot.formalId,path:file,accepted:result.accepted,L:result.L,U:result.U,status:result.status});
  console.log(JSON.stringify({checked:rows.length,...rows.at(-1)}));
  await fs.writeFile(`${output}/index.json`,JSON.stringify({scope:450,formalReady:false,entries:rows,files},null,2)+'\n');
}
if(levelSha256(api.LEVELS)!==before)throw Error('Runtime daily loading mutated campaign data');
for(const [file,hash]of Object.entries(bindings))if(createHash('sha256').update(await fs.readFile(file)).digest('hex')!==hash)throw Error(`Source changed during formal verification ${file}`);
const progress=await catalogProgress(runtime,files);
let validationError;try{requireCompleteCatalog(progress);}catch(error){validationError=error;}
const report={scope:450,status:validationError?'FORMAL_RUNTIME_VERIFICATION_FAILED':'FORMAL_SPATIAL_RUNTIME_VERIFIED_AWAITING_POINTER_TIME',formalReady:false,ruleVersion:lock.activeVersion,
  bindings,catalogRevision:api.FORMAL_DAILY_CHALLENGE_REVISION,sourceRegistryUnchanged:true,progress};
await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});if(validationError)throw validationError;
console.log(JSON.stringify({scope:450,status:report.status,counts:progress.counts}));
