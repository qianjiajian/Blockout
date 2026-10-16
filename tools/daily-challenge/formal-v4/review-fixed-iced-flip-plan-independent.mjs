import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {loadV4CatalogRuntime} from './catalog-contract.mjs';
import {assertFixedIcedFlipPlan} from './qualify-fixed-iced-flip.mjs';
import {ICED_FLIP_CONFIGURATION} from './fixed-iced-flip-construction.mjs';
import {prefixExecutionEnvironment,currentMainlineSourceBinding} from './prefix-execution-environment.mjs';
import {applyNativeDrag} from '../formal-v2/mechanism-decorate.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {mechanismInventory} from '../formal-v3/mechanism-intensity.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const [planPath,planSha,out]=process.argv.slice(2);assert(planPath&&planSha&&out);
const fileBindings={},read=async(d,json=true)=>{assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256));const raw=await fs.readFile(d.path);assert.equal(sha(raw),d.sha256,'Bound file drift: '+d.path);if(fileBindings[d.path])assert.equal(fileBindings[d.path],d.sha256);fileBindings[d.path]=d.sha256;return json?JSON.parse(raw):raw;};
const bind=async p=>read({path:p,sha256:sha(await fs.readFile(p))});
const publicRoot='deliverables/daily-formal-v3-20261008/proof/attempts';
const publicCount=async()=>(await fs.readdir(publicRoot)).filter(p=>p.endsWith('.request.json')).length;
const before=await publicCount(),report={status:'INDEPENDENT_FIXED_ICED_FLIP_PLAN_FAIL',plan:{path:planPath,sha256:planSha},errors:[],fileBindings,
 newSearches:0,newLedgerClaims:0,newActualAdaptations:0,newPublicClaims:0,newFinalObjects:0,qualificationOnly:true,formalReady:false,currentRuntimeValidationClaimed:false};
try{
 const rt=await loadV4CatalogRuntime(),plan=await read(report.plan),slot=assertFixedIcedFlipPlan(plan,rt.slots);
 const env=prefixExecutionEnvironment(rt);report.executionEnvironment=env;
 const author=await read({path:'deliverables/daily-formal-v4-20261008/proof/fixed-iced-flip-private-04/report.json',sha256:'237e8a90e10ff8ed0bd04227158b999952a127a9a2e0ca7143a7b071e1087ce8'});
 const rerunPath='deliverables/daily-formal-v4-20261008/proof/iced-flip-entry-independent-rerun-01/report.json',negativePath='deliverables/daily-formal-v4-20261008/proof/iced-flip-entry-independent-negatives-01/report.json';
 const rerun=await bind(rerunPath),negative=await bind(negativePath);
 for(const q of [author,rerun]){assert.equal(q.status,'FIXED_ICED_FLIP_PRIVATE_QUALIFICATION_PASS');assert.equal(q.testsPassed,11);assert.equal(q.expectedTests,11);assert.equal(q.publicRequests.before,q.publicRequests.after);assert.equal(q.publicClaimsStarted,0);}
 assert.equal(negative.status,'INDEPENDENT_FIXED_ICED_FLIP_NEGATIVES_PASS');assert.equal(negative.testsPassed,3);assert.equal(negative.publicRequests.before,negative.publicRequests.after);assert.equal(negative.newPublicClaims,0);
 assert.deepEqual(author.fileBindings,rerun.fileBindings);
 for(const q of [author,rerun,negative])for(const[p,h]of Object.entries(q.fileBindings)){
  await read({path:p,sha256:h},false);const rootPath=path.resolve(env.sourceWorkspace,p);await read({path:rootPath,sha256:h},false);
 }
 const contextEvidence=rerun.evidence.find(e=>e.test==='current-selection-actual-appends-and-negative-controls');assert(contextEvidence?.passed);
 const baseEvidence=rerun.evidence.find(e=>e.test==='real-readonly-base-and-linkage-negative-controls');assert(baseEvidence?.passed);
 for(const e of [contextEvidence,baseEvidence])for(const[p,h]of Object.entries(e.bindings))await read({path:p,sha256:h},false);
 assert.deepEqual(contextEvidence.selection,plan.inputSelection);assert(contextEvidence.check.passed&&contextEvidence.check.completeSelectedCount===152);
 assert.deepEqual(baseEvidence.base,plan.base);assert.deepEqual(baseEvidence.audit,plan.independentActualAudit);assert.equal(baseEvidence.facts.L,31);
 const base=await read(plan.base),prior=await read(plan.priorBaseline),selected=await read(plan.inputSelection);
 assert.equal(selected.files.length,152);assert.equal(base.levelSha256,levelSha256(base.level));assert.equal(base.routeSha256,routeSha256(base.drags));
 const old=rt.priorDailySlots.get(slot.formalId);assert.equal(old.sourceReport,plan.priorBaseline.path);assert.equal(old.sourceReportSha256,plan.priorBaseline.sha256);assert.equal(old.levelSha256,levelSha256(prior.level));
 assert.deepEqual(plan.configuration,ICED_FLIP_CONFIGURATION);
 report.currentSourceBinding=await currentMainlineSourceBinding(rt,env,base.sourceLevelId);
 const model=new rt.PuzzleModel(base.level);model.startCountdown();const first=new Map(),exitEvents=[];
 for(const[i,d]of base.drags.entries()){
  const before=model.snapshot();if(!first.has(d.blockId))first.set(d.blockId,{id:d.blockId,drag:i+1,clearsBeforeFirst:before.cleared});
  const original=model.tryExit;model.tryExit=function(id,side){const pre=this.snapshot(),q=original.call(this,id,side);if(q.ok)exitEvents.push({id,side,gateId:q.gateId,drag:i+1,clearedBefore:pre.cleared});return q;};
  try{applyNativeDrag(model,d);}finally{model.tryExit=original;}
 }
 const final=model.snapshot();assert(final.complete&&!final.failed&&final.blocks.length===0&&final.queuedBlocks.length===0);
 const doors=plan.configuration.flips.map(g=>{const events=exitEvents.filter(e=>e.gateId===g.id);assert(events.length,'Intended portal unused by original route');for(const e of events)assert.equal(e.clearedBefore%2===0,g.initiallyOpen,'Declared initial phase incompatible with exact prior clear count');return{...g,originalActualGateExits:events,finalParticipationNotClaimed:true};});
 const ice=plan.configuration.ice.map(x=>{const b=base.level.blocks.find(b=>b.id===x.id),f=first.get(x.id);assert(b?.frozen>0);assert.equal(f.clearsBeforeFirst,x.count);assert(x.count>=b.frozen);return{...x,previousCount:b.frozen,originalFirstAction:f,finalReleaseNotClaimed:true};});
 assert(ice.some(x=>x.count>x.previousCount));assert(new Set(ice.map(x=>x.count)).size>=2);
 const previous=mechanismInventory(prior.level);assert(previous['flip-door'].length<4);assert(Object.values(previous).reduce((n,a)=>n+a.length,0)<10);
 const privateFresh=rerun.evidence.find(e=>e.test==='fresh-original-final-ice-proof-private-counterexample').result;
 assert(privateFresh.finalProofStarted&&!privateFresh.accepted&&privateFresh.terminalBlocked);
 assert.equal(privateFresh.mathematicalProof.lowerBound.method,'v3-ice-preserving-constraints');assert.equal(privateFresh.mathematicalProof.route.search,null);
 assert.equal(privateFresh.mathematicalProof.lowerBound.result.thresholdProven,false);assert.equal(privateFresh.mathematicalProof.lowerBound.inputLevelSha256,privateFresh.levelSha256);
 report.qualification={author:{path:'deliverables/daily-formal-v4-20261008/proof/fixed-iced-flip-private-04/report.json',sha256:fileBindings['deliverables/daily-formal-v4-20261008/proof/fixed-iced-flip-private-04/report.json']},independentRerun:{path:rerunPath,sha256:fileBindings[rerunPath]},independentNegatives:{path:negativePath,sha256:fileBindings[negativePath]},testsPassed:14};
 report.knownReferenceFacts={sourceLevelId:base.sourceLevelId,L:base.L,U:base.U,drags:base.drags.length,doors,ice,previousMechanismInventory:previous};
 report.selectionCheck=contextEvidence.check;report.scope={preflightOnly:true,originalAcceptedBaseDoubleReplayQualified:true,originalRoutePrefixNotUsedAsNewLower:true,oneFixedFinalObject:true,noStageOrConfigurationFallback:true,
  futureConstructionWorldLimit:10000,futureLowerBudget:{maxStates:9999,guard:1,maxTransitions:10000000,maxMicroStates:3000000,maxMilliseconds:30000},futureUpper:'Provided unchanged complete route; no upper search',
  finalOriginalObjectLowerMustPreserveAllSixIce:true,finalUAndParticipationAndPointerStillPending:true};
 const compiled=await build({entryPoints:['tools/daily-challenge/formal-v4/qualify-fixed-iced-flip.mjs'],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
 for(const p of Object.keys(compiled.metafile.inputs))await read({path:p,sha256:sha(await fs.readFile(p))},false);
 for(const map of [rt.toolchainBindings,rt.designBindings,env.bindings,report.currentSourceBinding.bindings])for(const[p,h]of Object.entries(map))await read({path:p,sha256:h},false);
 const own='tools/daily-challenge/formal-v4/review-fixed-iced-flip-plan-independent.mjs';await read({path:own,sha256:sha(await fs.readFile(own))},false);
 // Verify every byte again at the end; earlier per-row verification cannot hide a late edit.
 for(const[p,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(p)),h,'Binding changed during review: '+p);
 assert.equal(await publicCount(),before);report.publicRequests={before,after:before};report.status='INDEPENDENT_FIXED_ICED_FLIP_PLAN_PASS';
}catch(e){report.errors.push(e.stack??e.message);report.publicRequests={before,after:await publicCount()};}
await fs.mkdir(path.dirname(out),{recursive:true});await fs.writeFile(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,errors:report.errors,plan:report.plan,bindings:Object.keys(fileBindings).length,report:{path:out,sha256:sha(await fs.readFile(out))}},null,2));
if(report.errors.length)process.exitCode=1;
