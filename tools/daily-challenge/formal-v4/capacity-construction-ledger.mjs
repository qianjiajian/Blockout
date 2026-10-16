import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createAttemptLedger,designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {CAPACITY_STAGES} from '../formal-v3/capacity-intensity-policy.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';

export const CONSTRUCTION_LEDGER='deliverables/daily-formal-v4-20261008/proof/capacity-construction-attempts';
export const CONSTRUCTION_TASK_VERSION='capacity-stage-independent-once-v1';
const own='tools/daily-challenge/formal-v4/capacity-construction-ledger.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const identity=level=>{const f=designFingerprints(level);return{...f,retryIdentitySha256:levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256})};};
async function readOptional(file){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(e){if(e.code==='ENOENT')return null;throw e;}}
const exists=async file=>{try{await fs.stat(file);return true;}catch(e){if(e.code==='ENOENT')return false;throw e;}};

/** Read the canonical old public identity. Existing accepted mathematics is
 * not overwritten or disguised as a new revalidation. Any old failure or
 * pending owner blocks construction before the callback can run. */
export async function inspectHistoricalAttempt(level,directory=PUBLIC_ATTEMPT_LEDGER){
 // The original helper adds immutable aliases for legacy requests; it does
 // not claim, re-solve, relabel, or overwrite any historical result.
 await createAttemptLedger(directory);
 const f=identity(level),identityPath=path.join(directory,'identities',`${f.retryIdentitySha256}.json`);
 if(await exists(path.join(directory,'identities',`${f.retryIdentitySha256}.blocked.json`)))return{blocked:true,reason:'historical-physical-identity-blocked',fingerprints:f};
 const record=await readOptional(identityPath),origin=record?.origin??f.designSha256;
 if(await exists(path.join(directory,`${origin}.blocked.json`)))return{blocked:true,reason:'historical-attempt-blocked',origin,fingerprints:f};
 const request=await readOptional(path.join(directory,`${origin}.request.json`));
 if(record&&!request)throw Error('Historical identity is missing its bound request');
 if(request){
  if(request.shapeSha256!==f.shapeSha256||request.colorSha256!==f.colorSha256)throw Error('Historical retry identity mismatch');
  const result=await readOptional(path.join(directory,`${origin}.result.json`));
  if(!result||result.accepted!==true||await exists(path.join(directory,`${origin}.revalidation.lock`)))
   return{blocked:true,reason:result?'historical-failed-result':'historical-attempt-pending',origin,fingerprints:f};
  return{blocked:false,origin,acceptedHistoricalMathematics:true,fingerprints:f};
 }
 return{blocked:false,origin:null,acceptedHistoricalMathematics:false,fingerprints:f};
}

export function inspectConstructionAccounting(accounting){
 const bad=[],b=accounting,c=accounting;
 if(accounting?.version!=='capacity-world-reservations-v1'||accounting?.exactDistinctStateCountClaimed!==false)bad.push('accounting-version-or-count-meaning');
 if(!Number.isSafeInteger(b?.maxStates)||b.maxStates<1||b.maxStates>10000)bad.push('invalid-maximum');
 const n=c?.fullWorldReservations,e=c?.expanded;
 if(!Number.isSafeInteger(n)||n<1||n>b?.maxStates||accounting?.conservativeFullBoardStateUpperBound!==n)bad.push('invalid-reservations');
 if(!Number.isSafeInteger(e)||e<0||e>n)bad.push('invalid-expanded');
 const values=Object.values(c?.kinds??{});
 if(!values.length||values.some(v=>!Number.isSafeInteger(v)||v<0)||values.reduce((a,b)=>a+b,0)!==n)bad.push('inconsistent-reservation-kinds');
 return bad;
}

/** One adaptation task for this physical base, across every stage/count. Even
 * callback exceptions finish the claim. Sidecars preserve construction facts;
 * the generic ledger accepted flag here means ONLY complete construction U.
 * This namespace can never mint a lower bound or a catalogue acceptance. */
export async function withCapacityConstructionAttempt(runtime,base,slot,construct,{ledgerDirectory=CONSTRUCTION_LEDGER,
 publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER,redesignOf,qualificationOnly=false}={}){
 assertV4Runtime(runtime);
 if(!qualificationOnly&&(path.resolve(ledgerDirectory)!==path.resolve(CONSTRUCTION_LEDGER)||path.resolve(publicLedgerDirectory)!==path.resolve(PUBLIC_ATTEMPT_LEDGER)))
  throw Error('Production requires shared historical and construction ledgers');
 if(!CAPACITY_STAGES.includes(slot.newestMechanism)||![1,2,3].includes(slot.difficulty))throw Error('Only reviewed spatial capacity tasks');
 if(!base.accepted||!base.level||!Array.isArray(base.drags)||base.levelSha256!==levelSha256(base.level))throw Error('Intact accepted input base required');
 if(typeof construct!=='function')throw Error('Construction callback required');
 const historical=await inspectHistoricalAttempt(base.level,publicLedgerDirectory);
 if(historical.blocked)return{ok:false,status:'CAPACITY_HISTORICAL_INPUT_BLOCKED',terminalBlocked:true,constructionAttemptStarted:false,historical};
 const fingerprints=identity(base.level),directory=path.resolve(ledgerDirectory);
 await fs.mkdir(path.join(directory,'plans'),{recursive:true});await fs.mkdir(path.join(directory,'aliases'),{recursive:true});
 if(await exists(path.join(directory,'aliases',`${fingerprints.retryIdentitySha256}.json`)))return{
  ok:false,status:'CAPACITY_FINAL_OBJECT_ALREADY_CONSTRUCTED',terminalBlocked:true,constructionAttemptStarted:false};
 const bindings={};for(const file of [own,'tools/daily-challenge/formal-v3/capacity-compose.mjs','tools/daily-challenge/formal-v3/capacity-primary-adapter.mjs',
  'tools/daily-challenge/formal-v3/capacity-intensity-policy.mjs'])bindings[file]=sha(await fs.readFile(file));
 const inputSha=base.levelSha256,inputRouteSha=routeSha256(base.drags),plan={version:CONSTRUCTION_TASK_VERSION,inputLevelSha256:inputSha,
  inputRouteSha256:inputRouteSha,fingerprints,slot:structuredClone(slot),hardWholeBoardLimit:10000,
  taskBoundary:'all-capacity-counts-and-attempts-before-first-final-object-proof',
  allFailuresTerminal:true,noStageOrMethodRetry:true,mathematicalLowerSearchInvocations:0,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,bindings,qualificationOnly};
 const planFile=path.join(directory,'plans',`${randomUUID()}.json`);await fs.writeFile(planFile,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
 const ledger=await createAttemptLedger(directory);let request;
 try{request=await ledger.claim(base.level,{redesignOf});}catch(error){return{ok:false,status:'CAPACITY_INPUT_ALREADY_ATTEMPTED',
  terminalBlocked:true,constructionAttemptStarted:false,reason:error.message,planFile,planSha256:levelSha256(plan)};}
 const report={ok:false,version:CONSTRUCTION_TASK_VERSION,status:'CAPACITY_CONSTRUCTION_PENDING',constructionAttempt:request,
  constructionAttemptStarted:true,terminalBlocked:false,accepted:false,mathematicalAcceptance:false,
  mathematicalLowerSearchInvocations:0,formalReady:false,qualificationOnly,planFile,planSha256:levelSha256(plan),inputLevelSha256:inputSha,inputRouteSha256:inputRouteSha};
 let adapted;
 try{
  // Recheck immediately before dynamic work, after owning the stage-free lock.
  const current=await inspectHistoricalAttempt(base.level,publicLedgerDirectory);if(current.blocked)throw Error('Public attempt became blocked or pending before construction');
  adapted=await construct({...base,level:structuredClone(base.level),drags:structuredClone(base.drags)});report.adaptation=adapted;
  const accounting=adapted?.constructionAccounting??adapted?.provenance?.constructionAccounting;
  report.constructionAccounting=accounting??null;
  if(!adapted?.ok){report.status='CAPACITY_CONSTRUCTION_FAILED';report.reason=adapted?.reason??adapted?.status??'no-complete-qualified-output';return report;}
  const issues=inspectConstructionAccounting(accounting);if(issues.length)throw Error(`Invalid construction accounting: ${issues.join(';')}`);
  if(adapted.provenance?.inputLevelSha256!==inputSha||adapted.provenance?.inputRouteSha256!==inputRouteSha
   ||adapted.provenance?.outputLevelSha256!==levelSha256(adapted.level)||adapted.provenance?.outputRouteSha256!==routeSha256(adapted.drags))throw Error('Construction input/output hashes mismatch');
  const canonical=replayDecorated(runtime,adapted.level,adapted.drags,adapted.timeSchedule);
  const independent=independentReplay(runtime,adapted.level,adapted.drags,{timeSchedule:adapted.timeSchedule});
  report.canonicalReplay=canonical;report.independentReplay=independent;
  if(!canonical.valid||!canonical.complete||canonical.failed||!independent.valid||!independent.complete||independent.failed
   ||canonical.nonClearingDrags!==independent.nonClearingDrags||canonical.effectiveDrags!==adapted.drags.length
   ||independent.effectiveDrags!==adapted.drags.length||independent.remainingBodies!==0||independent.remainingQueued!==0)throw Error('Construction did not produce a complete actual-model U');
  if(adapted.audit?.passed!==true)throw Error('Construction participation failed');
  for(const key of ['level','drags','levelSha256','routeSha256','targets','audit','provenance','primaryInstances','addedSupport'])if(adapted[key]!==undefined)report[key]=adapted[key];
  report.status='CAPACITY_CONSTRUCTION_COMPLETE_U_ONLY';report.accepted=true;report.U=independent.nonClearingDrags;
  return report;
 }catch(error){report.status='CAPACITY_CONSTRUCTION_EXCEPTION';report.reason=error.message;return report;}
 finally{
  if(levelSha256(base.level)!==inputSha||routeSha256(base.drags)!==inputRouteSha){report.accepted=false;report.status='CAPACITY_INPUT_MUTATED';}
  for(const [file,expected]of Object.entries(bindings))if(await fs.readFile(file).then(sha).catch(()=>null)!==expected){report.accepted=false;report.status='CAPACITY_TOOL_CHANGED';}
  report.terminalBlocked=!report.accepted;
  if(adapted?.level){
   try{
    const finalIdentity=identity(adapted.level),aliasFile=path.join(directory,'aliases',`${finalIdentity.retryIdentitySha256}.json`);
    await fs.writeFile(aliasFile,JSON.stringify({constructionAttempt:request.id,finalLevelSha256:levelSha256(adapted.level),fingerprints:finalIdentity},null,2)+'\n',{flag:'wx'});
   }catch(error){report.accepted=false;report.terminalBlocked=true;report.status=error.code==='EEXIST'?'CAPACITY_FINAL_ALIAS_ALREADY_EXISTS':'CAPACITY_FINAL_ALIAS_INVALID';report.aliasError=error.message;}
  }
  report.resultFile=path.join(directory,`${request.id}.construction-result.json`);
  report.ok=report.accepted;
  await fs.writeFile(report.resultFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  await ledger.finish(request,{accepted:report.accepted,status:report.status,levelSha256:inputSha});
 }
}
