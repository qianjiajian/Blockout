import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {auditStaticCandidate,levelSha256} from '../formal-v2/contract.mjs';
import {assertV4Runtime} from './runtime.mjs';

export const V4_STATIC_VERSION='daily-300-static-policy-v1';
const stageFile='src/core/dailyChallengeStagesV3.ts';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
export async function loadV4StageContract(){
 const built=await build({entryPoints:[stageFile],bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
 const api=await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0].text).toString('base64')}`);
 const bindings={};for(const file of Object.keys(built.metafile.inputs))bindings[file.replaceAll('\\','/')]=hash(await fs.readFile(file));
 bindings['tools/daily-challenge/formal-v4/static-contract.mjs']=hash(await fs.readFile('tools/daily-challenge/formal-v4/static-contract.mjs'));
 if(api.DAILY_CHALLENGE_STAGES_V3?.length!==10||api.DAILY_CHALLENGE_V3_SLOTS?.length!==300)throw Error('Exact current 10-stage/300-slot contract required');
 return{...api,bindings,sha256:levelSha256(bindings)};
}

/** Reuses every original structural/material check with the REAL level and
 * REAL campaign guide. Only the explicitly superseded daily stage findings
 * are removed, and only after the new external slot has been authenticated.
 * Both unfiltered evidence and the exact removals are retained. */
export async function auditV4StaticCandidate(runtime,candidate){
 assertV4Runtime(runtime);
 const api=await loadV4StageContract(),slot=api.DAILY_CHALLENGE_V3_SLOTS.find(s=>s.id===candidate.formalId);
 const stage=slot&&api.getDailyChallengeStageV3(slot.stageKey),issues=[];
 if(!slot||!stage)issues.push('unknown-daily-300-slot');
 else{
  for(const [field,expected]of Object.entries({stageKey:slot.stageKey,difficulty:slot.difficulty,slot:slot.slot,newestMechanism:slot.newestMechanism}))
   if(candidate[field]!==expected)issues.push(`slot-mismatch:${field}`);
  if(candidate.unlockLevel!==undefined&&candidate.unlockLevel!==slot.stageUnlockLevel)issues.push('slot-mismatch:unlockLevel');
 }
 if(!candidate.level||!Array.isArray(candidate.level.blocks)||!Array.isArray(candidate.level.gates))return{
  passed:false,issues:[...issues,'missing-level-bodies-or-gates'],version:V4_STATIC_VERSION,policyBindings:api.bindings};
 const generic=await auditStaticCandidate(runtime,candidate),filtered=[];
 const basic=api.getDailyChallengeStageV3('basic-combined');
 if(!basic||basic.allowedMechanisms.length!==6)throw Error('Reviewed base-six stage required');
 const baseSet=new Set(basic.allowedMechanisms);
 for(const issue of generic.issues){
  const oldUnlock=issue.startsWith('mechanism-before-unlock:')?issue.slice('mechanism-before-unlock:'.length):null;
  const superseded=issues.length===0&&((issue==='stage-not-in-mechanism-guide'&&stage.key==='basic-combined')
   ||(oldUnlock&&baseSet.has(oldUnlock)&&stage.allowedMechanisms.includes(oldUnlock)));
  if(superseded)filtered.push(issue);else issues.push(issue);
 }
 if(stage){
  for(const used of generic.mechanisms??[])if(!stage.allowedMechanisms.includes(used))issues.push(`mechanism-outside-current-daily-stage:${used}`);
  if(stage.newestMechanism&&!(generic.mechanisms??[]).includes(stage.newestMechanism))issues.push(`missing-current-stage-mechanism:${stage.newestMechanism}`);
 }
 return{...generic,passed:issues.length===0,issues:[...new Set(issues)],version:V4_STATIC_VERSION,
  policyRuleVersion:runtime.policyRuleVersion,policyRuleSha256:runtime.policyRuleSha256,
  stage:stage??null,slot:slot??null,policyBindings:api.bindings,policyToolchainSha256:api.sha256,
  legacyGenericAudit:generic,supersededStageFindings:filtered,
  filteringPolicy:'only-authenticated-basic-stage-and-explicit-six-mechanism-before-unlock-exceptions'};
}
