import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {createAttemptLedger,designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';
import {D2_KEY_CONSTRUCTION_VERSION} from './d2-key-route-construction.mjs';
import {assertLowBandBatchPrivateNamespace} from './low-band-advanced-batch-contract.mjs';
import {assertV4Runtime} from './runtime.mjs';
import {PUBLIC_ATTEMPT_LEDGER} from './bounded-qualify.mjs';
import {CONSTRUCTION_LEDGER,inspectHistoricalAttempt,inspectConstructionAccounting} from './capacity-construction-ledger.mjs';
export {CONSTRUCTION_LEDGER};
export const LOW_BAND_KEY_TASK_VERSION='planned-d2-key-same-shared-identity-once-v1';
const own='tools/daily-challenge/formal-v4/low-band-batch-key-attempt-guard.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const identity=level=>{const f=designFingerprints(level);return{...f,retryIdentitySha256:levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256})};};
const exists=async file=>fs.stat(file).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});

async function physicalPath(file){
 let cursor=path.resolve(file);const tail=[];
 for(;;){try{return path.resolve(await fs.realpath(cursor),...tail.toReversed());}
  catch(error){if(error.code!=='ENOENT')throw error;const parent=path.dirname(cursor);if(parent===cursor)throw error;tail.push(path.basename(cursor));cursor=parent;}}
}
export async function assertConstraintLedgerNamespace(qualificationOnly,ledgerDirectory,publicLedgerDirectory){
 if(typeof qualificationOnly!=='boolean')throw Error('qualificationOnly must be an explicit boolean');
 if(!qualificationOnly)return;
 const roots=await Promise.all([CONSTRUCTION_LEDGER,PUBLIC_ATTEMPT_LEDGER].map(physicalPath));
 for(const file of [ledgerDirectory,publicLedgerDirectory]){
  const actual=await physicalPath(file);
  if(roots.some(root=>{const r=path.relative(root,actual);return r===''||(!r.startsWith('..')&&!path.isAbsolute(r));}))
   throw Error('Qualification requires private ledgers outside both production namespaces, including junction aliases');
 }
}

// Isolated entry, SAME public and stage-independent construction namespaces.
// The original four-stage guard and its historical receipts are untouched.
export async function withLowBandKeyConstructionAttempt(runtime,base,slot,construct,{ledgerDirectory=CONSTRUCTION_LEDGER,
 publicLedgerDirectory=PUBLIC_ATTEMPT_LEDGER,redesignOf,qualificationOnly=false,configuration}={}){
 assertV4Runtime(runtime);
 await assertConstraintLedgerNamespace(qualificationOnly,ledgerDirectory,publicLedgerDirectory);
 await assertLowBandBatchPrivateNamespace(qualificationOnly,ledgerDirectory,publicLedgerDirectory);
 if(!qualificationOnly&&(path.resolve(ledgerDirectory)!==path.resolve(CONSTRUCTION_LEDGER)||path.resolve(publicLedgerDirectory)!==path.resolve(PUBLIC_ATTEMPT_LEDGER)))
  throw Error('Production requires shared historical and construction ledgers');
 if(slot.newestMechanism!=='key-lock'||slot.difficulty!==2||!runtime.slots.some(s=>levelSha256(s)===levelSha256(slot)))throw Error('Only an exact planned D2 key slot');
 if(!configuration||configuration.keyBlockIds?.length!==6||JSON.stringify(configuration.locks?.map(x=>x.count))!=='[5,6]')throw Error('Exact D2 key configuration required before claim');
 if(!base.accepted||!base.level||!Array.isArray(base.drags)||base.levelSha256!==levelSha256(base.level))throw Error('Intact accepted input base required');
 if(typeof construct!=='function')throw Error('Construction callback required');
 const historical=await inspectHistoricalAttempt(base.level,publicLedgerDirectory);
 if(historical.blocked)return{ok:false,status:'D2_KEY_HISTORICAL_INPUT_BLOCKED',terminalBlocked:true,constructionAttemptStarted:false,historical};
 const fingerprints=identity(base.level),directory=path.resolve(ledgerDirectory);
 await fs.mkdir(path.join(directory,'plans'),{recursive:true});await fs.mkdir(path.join(directory,'aliases'),{recursive:true});
 if(await exists(path.join(directory,'aliases',`${fingerprints.retryIdentitySha256}.json`)))return{
  ok:false,status:'D2_KEY_FINAL_OBJECT_ALREADY_CONSTRUCTED',terminalBlocked:true,constructionAttemptStarted:false};
 const bindings={};for(const file of [own,'tools/daily-challenge/formal-v4/d2-key-route-construction.mjs','tools/daily-challenge/formal-v4/capacity-construction-ledger.mjs','tools/daily-challenge/formal-v3/capacity-primary-adapter.mjs'])bindings[file]=sha(await fs.readFile(file));
 const inputSha=base.levelSha256,inputRouteSha=routeSha256(base.drags),plan={version:LOW_BAND_KEY_TASK_VERSION,inputLevelSha256:inputSha,
  inputRouteSha256:inputRouteSha,fingerprints,slot:structuredClone(slot),configuration:structuredClone(configuration),constructionVersion:D2_KEY_CONSTRUCTION_VERSION,hardWholeBoardLimit:10000,
  taskBoundary:'one-fixed-D2-key-configuration-before-first-final-object-proof',
  allFailuresTerminal:true,noStageOrMethodRetry:true,mathematicalLowerSearchInvocations:0,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,bindings,qualificationOnly};
 const planFile=path.join(directory,'plans',`${randomUUID()}.json`);await fs.writeFile(planFile,JSON.stringify(plan,null,2)+'\n',{flag:'wx'});
 const ledger=await createAttemptLedger(directory);let request;
 try{request=await ledger.claim(base.level,{redesignOf});}catch(error){return{ok:false,status:'D2_KEY_INPUT_ALREADY_ATTEMPTED',
  terminalBlocked:true,constructionAttemptStarted:false,reason:error.message,planFile,planSha256:levelSha256(plan)};}
 const report={ok:false,version:LOW_BAND_KEY_TASK_VERSION,status:'D2_KEY_CONSTRUCTION_PENDING',constructionAttempt:request,
  constructionAttemptStarted:true,terminalBlocked:false,accepted:false,mathematicalAcceptance:false,
  mathematicalLowerSearchInvocations:0,formalReady:false,qualificationOnly,planFile,planSha256:levelSha256(plan),inputLevelSha256:inputSha,inputRouteSha256:inputRouteSha};
 let adapted;
 try{
  // Recheck immediately before dynamic work, after owning the stage-free lock.
  const current=await inspectHistoricalAttempt(base.level,publicLedgerDirectory);if(current.blocked)throw Error('Public attempt became blocked or pending before construction');
  adapted=await construct({...base,level:structuredClone(base.level),drags:structuredClone(base.drags)});report.adaptation=adapted;
  const accounting=adapted?.constructionAccounting??adapted?.provenance?.constructionAccounting;
  report.constructionAccounting=accounting??null;
  if(!adapted?.ok){report.status='D2_KEY_CONSTRUCTION_FAILED';report.reason=adapted?.reason??adapted?.status??'no-complete-qualified-output';return report;}
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
  report.status='D2_KEY_CONSTRUCTION_COMPLETE_U_ONLY';report.accepted=true;report.U=independent.nonClearingDrags;
  return report;
 }catch(error){report.status='D2_KEY_CONSTRUCTION_EXCEPTION';report.reason=error.message;return report;}
 finally{
  if(levelSha256(base.level)!==inputSha||routeSha256(base.drags)!==inputRouteSha){report.accepted=false;report.status='D2_KEY_INPUT_MUTATED';}
  for(const [file,expected]of Object.entries(bindings))if(await fs.readFile(file).then(sha).catch(()=>null)!==expected){report.accepted=false;report.status='D2_KEY_TOOL_CHANGED';}
  report.terminalBlocked=!report.accepted;
  if(adapted?.level){
   try{
    const finalIdentity=identity(adapted.level),aliasFile=path.join(directory,'aliases',`${finalIdentity.retryIdentitySha256}.json`);
    await fs.writeFile(aliasFile,JSON.stringify({constructionAttempt:request.id,finalLevelSha256:levelSha256(adapted.level),fingerprints:finalIdentity},null,2)+'\n',{flag:'wx'});
   }catch(error){report.accepted=false;report.terminalBlocked=true;report.status=error.code==='EEXIST'?'D2_KEY_FINAL_ALIAS_ALREADY_EXISTS':'D2_KEY_FINAL_ALIAS_INVALID';report.aliasError=error.message;}
  }
  report.resultFile=path.join(directory,`${request.id}.construction-result.json`);
  report.ok=report.accepted;
  await fs.writeFile(report.resultFile,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  await ledger.finish(request,{accepted:report.accepted,status:report.status,levelSha256:inputSha});
 }
}
