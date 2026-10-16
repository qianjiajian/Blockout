// One source200 star suffix input; original owner transport only. No mathematical execution.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import * as api from './reverse-star-suffix-task-v4.mjs';
import {consumePlanHistory,mergePlanHistoryDelta,assertPlanHistoryMembers,readDirectHistoryRole,PLAN_HISTORY_VERSION} from './plan-history-adapter-v10.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {PUBLIC_LEDGER} from './low-twenty-io.mjs';
import {observeExecutionPolicy} from './prefix-execution-environment-task.mjs';

// Original-owner transport only. No runtime/model/solver/claim calls. v10 has
// no exporter API: form its unchanged delta schema, then use its full merge.
const V='deliverables/daily-formal-v4-20261008/',P=V+'proof/';
export const SELF='tools/daily-challenge/formal-v4/export-reverse-star-suffix-history-v2.mjs';
export const QUALIFICATION=Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/reverse-star-suffix-task-v4-independent-01/report.json',sha256:'f5e556da24314e88c7e049c3194cc9c6802897cb3819766fab10906a7724f6a5'});
const sha=b=>createHash('sha256').update(b).digest('hex'),desc=d=>({path:d.path,sha256:d.sha256});
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256));
const fields=['level','placeholderWorld','plain.level','built.level','built.placeholderWorld','built.plain.level','constructionTemplateLevel','templateLevel','constructionTemplatePacket.level','input.level','construction.level'];
const at=(o,f)=>f.split('.').reduce((q,k)=>q?.[k],o);

// BEGIN PURE STAR LOWER TRANSPORT HELPERS
// No model, projection constructor, search, replay or owner writer. The task's
// pure envelope validator authenticates erase-star-only with all gate ordering.
export async function inspectStarLowerTransport({q,recipe,reference,actualDir,receipt,math,owned,json,canonical,taskApi=api}){
 const worlds=[],archives=[];
 if(!q.lowerBound){
  assert.equal(q.proof,null);assert.equal(q.lowerArchives,undefined);
  assert.equal(q.templateLevel,undefined);assert.equal(q.templateLevelRole,undefined);
  return{worlds,archives};
 }
 const lower=q.lowerBound;assert(q.attempt&&q.level&&q.route,'Lower belongs only to the one claimed original with its completed upper');
 taskApi.assertReverseLowerReceipt(lower,q.level,recipe.targetDifficulty);
 assert.deepEqual(q.proof,lower.result);assert.deepEqual(q.lowerArchives,lower.archives);
 assert.deepEqual(Object.keys(lower.archives).sort(),['original','projection']);
 assert.equal(lower.inputLevelSha256,q.levelSha256);
 for(const kind of ['original','projection']){
  const d=lower.archives[kind];if(!d)continue;descriptor(d);
  assert.equal(canonical(d.path),canonical(path.join(actualDir,'lower-'+kind+'.json')));
  assert.deepEqual(owned(math,d.path),d,'Exact original math-owner archive descriptor');
  const record=await json(d),expected=kind==='original'?q.level:lower.projection?.projectedLevel;
  assert(expected,'A projected archive must have its original saved projection envelope');
  assert.deepEqual(Object.keys(record).sort(),['version','sourceLevelId','reference','recipeSha256','kind','level','levelSha256','inputLevelSha256','upperBoundTransfer'].sort());
  assert.equal(record.version,lower.version);assert.equal(record.sourceLevelId,recipe.sourceLevelId);
  assert.deepEqual(record.reference,reference);assert.equal(record.recipeSha256,recipe.recipeSha256);
  assert.equal(record.kind,kind);assert.equal(record.inputLevelSha256,q.levelSha256);assert.equal(record.upperBoundTransfer,false);
  assert.deepEqual(record.level,expected);assert.equal(record.levelSha256,levelSha256(expected));
  if(kind==='projection')assert.equal(record.levelSha256,lower.projectedLevelSha256);
  archives.push({kind,descriptor:{path:d.path,sha256:d.sha256},levelSha256:record.levelSha256});
  worlds.push({descriptor:{path:d.path,sha256:d.sha256},field:'level',level:expected,levelSha256:record.levelSha256,role:kind});
 }
 if(lower.projection){
  assert(lower.archives.original&&lower.archives.projection,'Normal export requires both original persisted lower worlds');
  assert.deepEqual(q.templateLevel,lower.projection.projectedLevel);assert.equal(q.templateLevelRole,'LOWER_ONLY_STAR_ERASURE_NO_UPPER_TRANSFER');
  const sidecar=owned(math,path.join(PUBLIC_LEDGER,q.attempt.id+'.v4-reverse-fixed-stock-result.json'));
  for(const d of [receipt,sidecar]){
   assert.deepEqual(owned(math,d.path),d);
   worlds.push({descriptor:{path:d.path,sha256:d.sha256},field:'templateLevel',level:q.templateLevel,levelSha256:lower.projectedLevelSha256,role:'projection-copy'});
  }
 }else{assert.equal(q.templateLevel,undefined);assert.equal(q.templateLevelRole,undefined);assert.equal(lower.archives.projection,null);}
 return{worlds,archives};
}
export function assertStarHistoryWorldAllowed({descriptor:d,field,level,archiveHashes,lowerWorlds,canonical}){
 const actual=levelSha256(level);
 if(archiveHashes.has(actual))return'original-construction-archive';
 const matching=lowerWorlds.filter(row=>canonical(row.descriptor.path)===canonical(d.path)&&row.descriptor.sha256===d.sha256&&row.field===field);
 assert.equal(matching.length,1,'Only a precisely authenticated lower descriptor/field can extend construction history');
 assert.equal(actual,matching[0].levelSha256);assert.deepEqual(level,matching[0].level);return matching[0].role;
}
// END PURE STAR LOWER TRANSPORT HELPERS

// BEGIN CAPTURED ARCHIVE AND SUCCESSOR METADATA
// A saved object and a valid gameplay object are independent facts. Classification
// comes from the original session result, never from creation.full (pending).
export function inspectStarCapturedArchive({recipe,rows,q,done,ownerFiles,taskApi=api}){
 const archive=taskApi.assertReverseFormedWorldArchive(recipe,rows,{accounting:q.construction,ownerFiles,terminalNonIdentityWorlds:q.nonIdentityWorlds});
 assert.equal(q.archiveValidation.valid,true);assert.equal(q.archiveValidation.completeFormedWorldArchivalVerified,true);assert.equal(q.archiveValidation.allStaticWorldsValid,archive.allStaticWorldsValid);assert.deepEqual(done.archiveValidation,q.archiveValidation);
 const a=q.construction;
 if(!a){
  assert.equal(rows.length,0);assert.equal(q.accepted,false);for(const k of ['level','levelSha256','L','U','proof','route','attempt','upperConstruction','lowerBound'])assert.equal(q[k],null);
  for(const k of ['formedWorlds','accepted','publicClaimsStarted'])assert.equal(done[k],0);assert.deepEqual(q.nonIdentityWorlds,[]);assert.equal(archive.allStaticWorldsValid,true);
  return{archive,originalPacket:null,classifiedFullRecords:[],staticFailedRecords:[],archiveHashes:new Set()};
 }
 const validFull=archive.validationResults.filter(v=>v.staticValidation==='PASSED'&&v.validatedFull===true),failed=archive.validationResults.filter(v=>v.staticValidation==='FAILED');
 assert.equal(a.completePhysicalInputsFullyClassified,archive.allStaticWorldsValid);assert.equal(a.unvalidatedWorlds,failed.length);
 assert.equal(a.completePhysicalInputs,validFull.length);assert(validFull.length<=1);assert.equal(Number(!!a.firstComplete),validFull.length);
 if(validFull.length){assert.equal(validFull[0].ordinal,rows.length-1,'First validated full terminates construction');assert.equal(validFull[0].levelSha256,a.firstComplete.levelSha256);}
 if(failed.length){assert.equal(q.accepted,false);assert.equal(q.attempt,null);assert.equal(q.level,null);assert.equal(q.route,null);assert.equal(q.lowerBound,null);}
 const packets=rows.map(r=>JSON.parse(r.bytes));let originalPacket=null;
 if(q.level){assert.equal(levelSha256(q.level),q.levelSha256);assert.equal(validFull.length,1);assert.equal(validFull[0].levelSha256,q.levelSha256);originalPacket=packets[validFull[0].ordinal];assert.deepEqual(originalPacket.level,q.level);}
 else{assert.equal(q.attempt,null);assert.equal(q.accepted,false);}
 return{archive,originalPacket,classifiedFullRecords:validFull,staticFailedRecords:failed,archiveHashes:new Set(packets.map(p=>p.levelSha256))};
}
// Only this exporter-created successor, not a relaxation of task input history.
// The original administrative prior is still authenticated by the task above.
export function assertStarExportSuccessor(c,p,{historyDeltas,headSha256}){
 assert.equal(p.status,'REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V10_VALIDATED');assert.deepEqual(p.errors,[]);
 for(const k of ['oldFilesChanged','checkpointReexported','mathematicalOwnerSynthesized','selectionWritten','formalAdoptionPerformed'])assert.equal(p[k],false);
 for(const k of ['newConstructions','newSearches','newLedgerClaims','newReplayCalls'])assert.equal(p[k],0);
 assert.deepEqual(p.checkpoint,c.history);assert.deepEqual(p.checkpointReview,c.historyReview);assert.deepEqual(p.historyScope,c.historyScope);assert.deepEqual(p.selection,c.selection);assert.deepEqual(p.designDisposition,c.designDisposition);assert.deepEqual(p.priorHistoryReport,c.priorHistoryReport);
 assert.equal(p.previousHeadSha256,c.historyHeadSha256);assert.deepEqual(p.priorHistoryDeltas,c.historyDeltas);assert.deepEqual(p.historyDeltas,historyDeltas);assert.deepEqual(p.completeHistoryDeltas,[...c.historyDeltas,...historyDeltas]);
 assert([1,2].includes(historyDeltas.length));assert.deepEqual(historyDeltas.map(x=>x.declaredOwner.kind),historyDeltas.length===1?['construction']:['construction','mathematical']);
 const seen=new Set();for(const x of p.completeHistoryDeltas){descriptor(x.descriptor);descriptor(x.declaredOwner.definition);assert(!seen.has(x.descriptor.path));seen.add(x.descriptor.path);}
 assert.equal(c.historyScope.roots.length,7);assert.equal(p.headSha256,headSha256);assert.equal(p.headSha256,p.completeHistoryDeltas.at(-1).descriptor.sha256);return true;
}
// END CAPTURED ARCHIVE AND SUCCESSOR METADATA

export async function exportReverseStockHistory(configuration){
 descriptor(QUALIFICATION);
 assert.equal(path.basename(process.cwd()),'frozen-workspace-4588');
 const fileBindings={},cache=new Map();
 const read=async d=>{descriptor(d);const real=await fs.realpath(d.path);let b=cache.get(real);if(!b){b=await fs.readFile(real);cache.set(real,b);}assert.equal(sha(b),d.sha256,d.path);fileBindings[d.path]=d.sha256;return b;};
 const json=async d=>JSON.parse(await read(d)),fd=async p=>({path:p,sha256:sha(await fs.readFile(p))});
 const absent=async p=>{try{await fs.lstat(p);}catch(e){if(e.code==='ENOENT')return;throw e;}throw Error('Unexpected existing path: '+p);};
 const bind=async m=>{for(const[p,h]of Object.entries(m))await read({path:p,sha256:h});};
 const cli=await json(configuration);assert.deepEqual(Object.keys(cli).sort(),['actualReview','completion','futureSourceLevelIds','outputDirectory','plan','planReview','priorHistoryReport']);
 for(const k of ['actualReview','completion','plan','planReview','priorHistoryReport'])descriptor(cli[k]);
 assert(Array.isArray(cli.futureSourceLevelIds)&&new Set(cli.futureSourceLevelIds).size===cli.futureSourceLevelIds.length);for(const id of cli.futureSourceLevelIds)assert(Number.isSafeInteger(id)&&id>=1&&id<=200);
 const OUT=cli.outputDirectory;assert(typeof OUT==='string'&&OUT.startsWith(P)&&path.posix.normalize(OUT)===OUT&&!OUT.includes('\\'));assert(path.resolve(OUT).startsWith(path.resolve(P)+path.sep));await absent(OUT);
 const p=await json(cli.plan),c=await json(p.contextDescriptor),prior=await json(cli.priorHistoryReport),pr=await json(cli.planReview),done=await json(cli.completion),ar=await json(cli.actualReview);
 assert.equal(p.version,api.VERSION);assert.equal(c.version,p.version);assert.equal(p.qualificationOnly,false);assert.equal(c.qualificationOnly,false);assert.deepEqual(c.priorHistoryReport,cli.priorHistoryReport);api.assertReverseProductionChoice(c);api.assertReversePriorHistory(c,prior);
 assert.equal(p.experimentId,c.experimentId);assert.equal(p.historyHeadSha256,c.historyHeadSha256);assert.deepEqual(p.priorHistoryReport,c.priorHistoryReport);assert.deepEqual(p.selection,c.selection);assert.deepEqual(p.designDisposition,c.designDisposition);assert.deepEqual(p.failedParent,c.failedParent);assert.equal(p.maximumCompletePhysicalInputs,1);assert.equal(p.firstFullFailureIsTerminal,true);assert.equal(p.originalLowerCallsMaximum,1);assert.equal(p.dualUpperReplayPairsMaximum,1);assert.deepEqual(p.lowerPolicy,api.LOWER_POLICY);assert.deepEqual(p.starDesignDeclaration,c.starDesignDeclaration);assert.deepEqual(p.starDesignDeclaration,api.STAR_DESIGN_DECLARATION);
 api.assertReverseDesignHolds(c,await json(c.designDisposition),await json(api.MINIMUM_DESIGN_HOLDS));assert.deepEqual(c.qualification,QUALIFICATION);const qualification=await json(QUALIFICATION);assert.equal(qualification.status,api.QUALIFICATION_STATUS);assert.deepEqual(qualification.errors,[]);assert.equal(qualification.closedProductionScopeReviewed,true);for(const k of ['newRealConstructions','newSearches','publicClaimsStarted'])assert.equal(qualification[k],0);await bind(qualification.toolBindings);await bind(p.bindings);
 assert.equal(pr.status,'INDEPENDENT_REVERSE_STAR_SUFFIX_PLAN_V4_PASS');assert.deepEqual(pr.plan,cli.plan);assert.deepEqual(pr.errors,[]);for(const k of ['newConstructions','newSearches'])assert.equal(pr[k],0);await bind(pr.toolBindings);
 assert.equal(ar.status,'INDEPENDENT_REVERSE_STAR_SUFFIX_ACTUAL_V4_PASS');assert.deepEqual(ar.plan,cli.plan);assert.deepEqual(ar.completion,cli.completion);assert.deepEqual(ar.receipt,done.receipt);assert.deepEqual(ar.errors,[]);for(const k of ['newConstructions','newSearches','newReplayCalls','publicClaimsStarted'])assert.equal(ar[k],0);await bind(ar.fileBindings);
 const policyObservation=observeExecutionPolicy(p.environment),canonical=compileCanonicalHistoryPath(c.historyScope).canonical;
 const rootFor=f=>c.historyScope.roots.find(r=>canonical(f).startsWith(canonical(r.physicalPath)+'/'))?.id??null;
 const pub=c.historyScope.roots.find(r=>r.id==='public').physicalPath,ctorRoot=c.historyScope.roots.find(r=>r.id===c.constructorRootId).physicalPath,actualDir=path.dirname(cli.completion.path);
 assert.equal(canonical(pub),canonical(PUBLIC_LEDGER));assert.equal(done.version,p.version);assert.equal(done.status,'REVERSE_FIXED_STOCK_TASK_CLOSED');assert.deepEqual(done.plan,cli.plan);assert.equal(done.closed,true);assert.equal(done.maximumInputs,1);assert.equal(done.allFailuresTerminal,true);assert.equal(done.externalOwnerIndexOnly,true);assert.equal(done.archiveValidation.valid,true);assert.equal(done.adminClosureRequired,false);
 for(const[k,f]of [['receipt','candidate.json'],['index','construction-index.json'],['constructionOwner','construction.owner.definition.json'],['mathOwner','math.owner.definition.json']])assert.equal(canonical(done[k].path),canonical(path.join(actualDir,f)));
 const q=await json(done.receipt),ix=await json(done.index),ctor=await json(done.constructionOwner),math=await json(done.mathOwner);
 assert.equal(q.version,p.version);assert.deepEqual(q.plan,cli.plan);assert.equal(q.sourceLevelId,p.recipe.sourceLevelId);assert.equal(q.targetDifficulty,p.recipe.targetDifficulty);assert.equal(q.historyHeadSha256,c.historyHeadSha256);assert.deepEqual(q.designDisposition,c.designDisposition);assert.equal(q.designAccepted,false);assert.equal(q.formalReady,false);assert.equal(q.catalogEligible,false);assert.equal(q.archiveValidation.valid,true);assert.equal(q.adminClosureRequired??false,false);assert.equal(done.accepted,Number(q.accepted));assert.equal(done.publicClaimsStarted,Number(!!q.attempt));assert.equal(done.formedWorlds,q.formedWorlds.length);
 assert.deepEqual(ix.receipt,done.receipt);assert.deepEqual(ix.formedWorldFiles,q.formedWorlds);assert.deepEqual(ix.nonIdentityWorlds,q.nonIdentityWorlds);assert.deepEqual(done.nonIdentityWorlds,q.nonIdentityWorlds);assert.equal(ix.closed,true);assert.equal(ix.restartAllowed,false);assert.equal(ix.maximumInputs,1);assert.equal(ix.consumedInputs,Number(!!q.construction?.firstComplete));assert.equal(ix.completePhysicalInputs,q.construction?.completePhysicalInputs??0);assert(ix.completePhysicalInputs<=1);
 const owned=(owner,f)=>{const matches=owner.files.filter(d=>canonical(d.path)===canonical(f));assert.equal(matches.length,1,'Exactly one original owner entry: '+f);return desc(matches[0]);};
 function checkOwner(o,d,kind,expected){assert.equal(o.version,'plan-history-owner-v1');assert.equal(o.kind,kind);assert.equal(o.id,p.experimentId+(kind==='mathematical'?'-math':''));assert.equal(o.namespace,canonical(kind==='mathematical'?pub:ctorRoot));assert.deepEqual(o.parentPlan,cli.plan);assert.equal(o.experimentId,p.experimentId);assert.deepEqual(o.attemptIds,kind==='mathematical'&&q.attempt?[q.attempt.id]:[]);assert.deepEqual(o.files.map(x=>canonical(x.path)).sort(),expected.map(canonical).sort());return{id:o.id,namespace:o.namespace,kind:o.kind,definition:d};}
 const recipeIdentity=api.reverseRecipeExecutionIdentity(p.recipe),ctorPaths=[path.join(ctorRoot,cli.plan.sha256+'.claim.json'),path.join(ctorRoot,'reverse-recipe-'+recipeIdentity+'.execution.json'),path.join(ctorRoot,'experiment-'+levelSha256({experimentId:p.experimentId})+'.execution.json'),...q.formedWorlds.map(d=>d.path),path.join(ctorRoot,cli.plan.sha256+'.result.json'),done.index.path];
 const mathPaths=[done.receipt.path];if(q.attempt){const id=q.attempt.id;assert(/^[a-f0-9]{64}$/.test(id));assert.equal(q.attempt.identityOrigin,id);assert.equal(q.attempt.redesignOf,c.failedParent.attemptId);mathPaths.push(...['.request.json','.result.json','.v4-reverse-fixed-stock-plan.json','.v4-reverse-fixed-stock-result.json'].map(s=>path.join(PUBLIC_LEDGER,id+s)),path.join(PUBLIC_LEDGER,'identities',q.attempt.retryIdentitySha256+'.json'));if(!q.accepted)mathPaths.push(path.join(PUBLIC_LEDGER,id+'.blocked.json'),path.join(PUBLIC_LEDGER,'identities',q.attempt.retryIdentitySha256+'.blocked.json'));}
 if(q.lowerBound)for(const d of Object.values(q.lowerBound.archives)){if(d){descriptor(d);mathPaths.push(d.path);}}
 const ctorDeclared=checkOwner(ctor,done.constructionOwner,'construction',ctorPaths),mathDeclared=checkOwner(math,done.mathOwner,'mathematical',mathPaths);for(const owner of [ctor,math])for(const d of owner.files)await read(d);assert.deepEqual(owned(math,done.receipt.path),done.receipt);
 assert.equal(ctor.closedCampaigns.length,1);assert.deepEqual(math.closedCampaigns,[]);const closure=ctor.closedCampaigns[0],raw=await json(closure.descriptor);assert.deepEqual(closure.raw,raw);assert.equal(closure.id,p.experimentId);assert.equal(closure.closed,true);assert.equal(closure.restartAllowed,false);assert.equal(closure.consumedInputs,ix.consumedInputs);assert.equal(closure.maximumInputs,1);assert.deepEqual(owned(ctor,closure.descriptor.path),closure.descriptor);assert.equal(canonical(closure.descriptor.path),canonical(path.join(ctorRoot,cli.plan.sha256+'.result.json')));for(const[k,v]of Object.entries(ix))assert.deepEqual(raw[k],v);assert.deepEqual(raw.plan,cli.plan);
 const rows=[];for(const d of q.formedWorlds){assert.deepEqual(owned(ctor,d.path),d);rows.push({descriptor:d,bytes:await read(d)});}const {archive,archiveHashes,originalPacket,classifiedFullRecords,staticFailedRecords}=inspectStarCapturedArchive({recipe:p.recipe,rows,q,done,ownerFiles:ctor.files});
 const lowerTransport=await inspectStarLowerTransport({q,recipe:p.recipe,reference:originalPacket?.reference??null,actualDir,receipt:done.receipt,math,owned,json,canonical});
 if(q.route){assert(q.attempt&&q.upperConstruction.ok);assert.equal(q.routeSha256,routeSha256(q.drags));assert.equal(q.route.inputLevelSha256,q.levelSha256);assert.equal(q.route.routeSha256,q.routeSha256);assert.equal(q.U,q.upperConstruction.U);assert.deepEqual(q.route.canonicalReplay,q.upperConstruction.canonical);assert.deepEqual(q.route.independentReplay,q.upperConstruction.independent);}
 if(q.accepted){const band=api.reverseTargetBand(q.targetDifficulty);assert.equal(q.status,'REVERSE_STAR_SUFFIX_ORIGINAL_U_PROJECTED_LOWER_VERIFIED');assert.equal(q.lowerBound.mathematicalLowerValidated,true);assert.equal(q.L,band.floor);assert(q.route&&q.proof.thresholdProven&&q.U>=q.L&&(band.upper===null||q.U<=band.upper));}
 const makeDelta=async(owner,declaredOwner,parentHeadSha256)=>{const files=[],fullWorlds=[],terminalRecords=[];
  for(const d of owner.files){const bytes=await read(d);files.push({...d,aliases:[d.path],rootId:rootFor(d.path)});if(!d.path.endsWith('.json'))continue;const value=JSON.parse(bytes);for(const field of fields){const level=at(value,field);if(!level?.blocks)continue;assert(level.blocks.length>0,'Empty identity must use its recorded nonidentity field');assertStarHistoryWorldAllowed({descriptor:desc(d),field,level,archiveHashes,lowerWorlds:lowerTransport.worlds,canonical});fullWorlds.push({descriptor:desc(d),field,level,sourceLevelId:p.recipe.sourceLevelId,reference:value.reference??null,fingerprints:sealedWorldIdentity(level)});}}
  for(const id of owner.attemptIds){const request=owned(owner,path.join(PUBLIC_LEDGER,id+'.request.json')),result=owned(owner,path.join(PUBLIC_LEDGER,id+'.result.json')),rv=await json(request),sv=await json(result);assert.deepEqual(rv,q.attempt);assert.equal(sv.accepted,q.accepted);assert.equal(sv.status,q.status);assert.equal(sv.levelSha256,q.levelSha256);assert.deepEqual(sv.lower,q.lowerBound?.result);assert.deepEqual(sv.upper,q.route?.search);
   assert.deepEqual(await json(owned(owner,path.join(PUBLIC_LEDGER,id+'.v4-reverse-fixed-stock-plan.json'))),{attempt:q.attempt,plan:cli.plan,recipeSha256:p.recipe.recipeSha256,levelSha256:q.levelSha256});assert.deepEqual(await json(owned(owner,path.join(PUBLIC_LEDGER,id+'.v4-reverse-fixed-stock-result.json'))),q);
   const blocked=[];for(const f of [path.join(PUBLIC_LEDGER,id+'.blocked.json'),path.join(PUBLIC_LEDGER,'identities',rv.retryIdentitySha256+'.blocked.json')]){if(q.accepted){await absent(f);continue;}const d=owned(owner,f),value=await json(d);assert.equal(value.attemptId,id);assert.equal(value.status,q.status);blocked.push({descriptor:d,value});}await absent(path.join(PUBLIC_LEDGER,id+'.revalidation.lock'));terminalRecords.push({kind:'mathematical',namespace:owner.namespace,request:{descriptor:request,value:rv},result:{descriptor:result,value:sv},blocked,lock:null});}
  return{version:PLAN_HISTORY_VERSION,parentHeadSha256,owner:declaredOwner,files,terminalRecords,fullWorlds,closedCampaigns:owner.closedCampaigns};};
 const summary=s=>({publicStocks:s.publicStocks.length,historyWorlds:s.nearPools.history.length,terminalRecords:s.bundle.terminalRecords.length,closedCampaigns:s.closedCampaigns.length});
 const declaredListing=(s,d)=>{const out=Object.fromEntries(c.historyScope.roots.map(r=>[r.id,[]])),seen=new Set();for(const f of [...s.bundle.files,...d.files])if(f.rootId!==null){const k=canonical(f.path);assert(!seen.has(k));seen.add(k);out[f.rootId].push(f.path);}return out;};
 const listing=async()=>{const out={};for(const r of c.historyScope.roots){const todo=[r.physicalPath],names=[];while(todo.length){const dir=todo.pop();for(const e of await fs.readdir(dir,{withFileTypes:true})){assert(!e.isSymbolicLink(),'No nested history aliases');const f=path.join(dir,e.name);if(e.isDirectory())todo.push(f);else{assert(e.isFile());names.push(f);}}}out[r.id]=names;}return out;};
 let state=await consumePlanHistory({checkpoint:c.history,review:c.historyReview,expectedScope:c.historyScope,readBytes:fs.readFile});for(const priorDelta of c.historyDeltas){const d=await json(priorDelta.descriptor);await read(priorDelta.declaredOwner.definition);state=await mergePlanHistoryDelta(state,{...priorDelta,listing:declaredListing(state,d),readBytes:fs.readFile});}assert.equal(state.headSha256,c.historyHeadSha256);const before=summary(state);assert.deepEqual(before,Object.fromEntries(Object.keys(before).map(k=>[k,prior.summary[k]])));
 const latest=api.latestReverseFailedAttempt(state,c.sourceLevelId);assert.equal(latest.namespace,c.failedParent.namespace);assert.equal(latest.request.value.id,c.failedParent.attemptId);const parent=await readDirectHistoryRole(state,{...c.failedParent,role:'failed-parent',readBytes:fs.readFile});assert.equal(parent.blocked.length,2);await bind(parent.fileBindings);
 const ctorDelta=await makeDelta(ctor,ctorDeclared,c.historyHeadSha256),ctorBytes=Buffer.from(JSON.stringify(ctorDelta)),ctorDesc={path:OUT+'/construction.delta.json',sha256:sha(ctorBytes)};assert.equal(ctorDelta.fullWorlds.length,archive.physicalWorldRecords);
 const mathDelta=q.attempt?await makeDelta(math,mathDeclared,ctorDesc.sha256):null,mathBytes=mathDelta?Buffer.from(JSON.stringify(mathDelta)):null,mathDesc=mathBytes?{path:OUT+'/mathematical.delta.json',sha256:sha(mathBytes)}:null;if(!mathDelta){assert.equal(math.files.length,1);assert.equal(rootFor(math.files[0].path),null);}
 const initialListing=await listing();assertPlanHistoryMembers(state,initialListing,[...ctorDelta.files,...mathDelta?.files??[]].filter(f=>f.rootId!==null));const virtual=new Map([[ctorDesc.path,ctorBytes],...mathDesc?[[mathDesc.path,mathBytes]]:[]]),readBytes=f=>virtual.get(f)??fs.readFile(f),historyDeltas=[{descriptor:ctorDesc,declaredOwner:ctorDeclared}];
 state=await mergePlanHistoryDelta(state,{...historyDeltas[0],listing:declaredListing(state,ctorDelta),readBytes});if(mathDelta){const row={descriptor:mathDesc,declaredOwner:mathDeclared};state=await mergePlanHistoryDelta(state,{...row,listing:declaredListing(state,mathDelta),readBytes});historyDeltas.push(row);}const finalListing=await listing();assertPlanHistoryMembers(state,finalListing);for(const id of Object.keys(finalListing))assert.deepEqual(finalListing[id].map(canonical).sort(),initialListing[id].map(canonical).sort());const after=summary(state);assert.equal(after.publicStocks,before.publicStocks+done.publicClaimsStarted);assert.equal(after.terminalRecords,before.terminalRecords+done.publicClaimsStarted);assert.equal(after.closedCampaigns,before.closedCampaigns+1);assert.equal(after.historyWorlds,before.historyWorlds+ctorDelta.fullWorlds.length+(mathDelta?.fullWorlds.length??0));
 const futureParents={historyHeadSha256:state.headSha256,requestedSourceLevelIds:cli.futureSourceLevelIds,resolved:[],unresolved:[],newHistoryTraversal:false,mathematicalProofRevalidated:false};
 for(const sourceLevelId of cli.futureSourceLevelIds){try{const latest=api.latestReverseFailedAttempt(state,sourceLevelId),id=latest.request.value.id,target=latest.request.value.levelSha256,seen=new Set(),choices=state.fullWorlds.filter(w=>w.field==='level'&&(w.sourceLevelId===sourceLevelId||w.level?.id===sourceLevelId)&&levelSha256(w.level)===target).map(w=>w.descriptor).filter(d=>{const k=canonical(d.path);if(seen.has(k))return false;seen.add(k);return true;}).sort((a,b)=>Number(!a.path.includes(id))-Number(!b.path.includes(id))||canonical(a.path).localeCompare(canonical(b.path)));let resolved=null;for(const receipt of choices){const raw=await json(receipt);if(raw.accepted!==false||(raw.attempt??raw.proof?.attempt)?.id!==id)continue;const role=await readDirectHistoryRole(state,{namespace:latest.namespace,attemptId:id,receipt,role:'failed-parent',readBytes:fs.readFile});assert.equal(role.blocked.length,2);await bind(role.fileBindings);resolved={sourceLevelId,status:'RESOLVED_ORIGINAL_FAILED_PARENT',receipt:desc(receipt),attemptId:id,startedAt:role.request.startedAt,namespace:latest.namespace,blocked:role.blocked.map(x=>x.descriptor),readDirectHistoryRolePassed:true,mathematicalProofRevalidated:false};break;}assert(resolved,'No authentic original failed receipt');futureParents.resolved.push(resolved);}catch(e){futureParents.unresolved.push({sourceLevelId,status:'UNRESOLVED',reason:e.message});}}
 for(const[f,h]of Object.entries(fileBindings))assert.equal(sha(await fs.readFile(f)),h,'Evidence drift '+f);assert.equal(await fs.realpath(SELF),await fs.realpath(fileURLToPath(import.meta.url)));const exportScript=await fd(SELF);
 const report={status:'REVERSE_STAR_SUFFIX_HISTORY_DELTAS_EXPORTED_AND_V10_VALIDATED',checkpoint:c.history,checkpointReview:c.historyReview,historyScope:c.historyScope,context:p.contextDescriptor,plan:cli.plan,planAudit:cli.planReview,actualAudit:cli.actualReview,completion:cli.completion,candidate:done.receipt,constructorOwner:done.constructionOwner,mathOwner:done.mathOwner,qualification:QUALIFICATION,selection:c.selection,designDisposition:c.designDisposition,priorHistoryReport:cli.priorHistoryReport,priorHistoryDeltas:c.historyDeltas,historyDeltas,completeHistoryDeltas:[...c.historyDeltas,...historyDeltas],previousHeadSha256:c.historyHeadSha256,headSha256:state.headSha256,comparisonEvidence:p.comparisonEvidence,before,summary:{...after,constructorFiles:ctorDelta.files.length,constructorFullWorlds:ctorDelta.fullWorlds.length,mathematicalFiles:mathDelta?.files.length??0,mathematicalFullWorlds:mathDelta?.fullWorlds.length??0,newPublicClaims:done.publicClaimsStarted,newAccepted:done.accepted,consumedInputs:ix.consumedInputs,maximumInputs:1},futureParents,nonIdentityWorlds:q.nonIdentityWorlds,archiveValidation:q.archiveValidation,staticWorldClassification:{classifiedFullRecords,staticFailedRecords,pendingCreationFieldsPreserved:true,missingOrUnclassifiedArchiveAllowed:false},lowerTransport:{archives:lowerTransport.archives,projectedWorldRole:'LOWER_ONLY_STAR_ERASURE_NO_UPPER_TRANSFER',newPublicClaimsForProjection:0,upperBoundTransferred:false},originalOwnerDefinitionsPreserved:true,unclaimedMathOwnerReportBindingOnly:!q.attempt,mathematicalOwnerSynthesized:false,checkpointReexported:false,oldFilesChanged:false,oldLiveByteIntegrityClaimed:false,newConstructions:0,newSearches:0,newLedgerClaims:0,newReplayCalls:0,automaticDesignAcceptance:false,selectionWritten:false,formalAdoptionPerformed:false,policyObservation,exportScript,configuration,fileBindings:{...fileBindings,[c.history.path]:c.history.sha256,[c.historyReview.path]:c.historyReview.sha256,[exportScript.path]:exportScript.sha256},errors:[]};
 assertStarExportSuccessor(c,report,{historyDeltas,headSha256:state.headSha256});
 await fs.mkdir(OUT);await fs.writeFile(ctorDesc.path,ctorBytes,{flag:'wx'});if(mathDesc)await fs.writeFile(mathDesc.path,mathBytes,{flag:'wx'});const bytes=Buffer.from(JSON.stringify(report,null,2)+'\n');await fs.writeFile(OUT+'/report.json',bytes,{flag:'wx'});console.log(JSON.stringify({report:{path:OUT+'/report.json',sha256:sha(bytes)},headSha256:state.headSha256,summary:report.summary}));return report;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){assert.equal(process.argv.length,4,'Usage: node export-reverse-star-suffix-history-v2.mjs CONFIG.json CONFIG_SHA256');await exportReverseStockHistory({path:process.argv[2],sha256:process.argv[3]});}
