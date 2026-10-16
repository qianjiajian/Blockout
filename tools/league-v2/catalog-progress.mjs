import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {loadLeagueProofRuntime,levelSha256,routeSha256,leagueBand,RULE_VERSION,PROOF_VERSION} from './proof-contract.mjs';
import {auditCatalogDiversity,compareLayout,partitionKey,boardMaskKey} from './diversity-contract.mjs';
import {summarizeInventory} from './mechanism-policy.mjs';
import {ICE_LOWER_METHOD,ICE_CONTRACT_VERSION,inspectNativeIceLower} from './proof-ice-contract.mjs';
import {ICE_PROOF_VERSION} from './proof-ice-bounded.mjs';
import {SOURCE_ADAPTATION_VERSION,describeLeagueSourceAdaptation,inspectUnsearchedStaticRejection} from './proof-source-adaptation.mjs';
import {RENDER_REVALIDATION_VERSION,RENDER_REVALIDATION_TOOL,hasTimeSchedule,inspectRenderRevalidation} from './proof-render-revalidation.mjs';

const digest=b=>createHash('sha256').update(b).digest('hex');
const validCount=n=>Number.isSafeInteger(n)&&n>=0&&n<=10000;
const positiveCount=n=>validCount(n)&&n>=1;
const validSha=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
// Derive the required dependency set from the actual stable runtime. A receipt
// may extend it, but cannot remove a solver/model/rule dependency and rehash {}.
const REQUIRED_PROOF_BINDINGS=Object.freeze(Object.keys((await loadLeagueProofRuntime()).toolchainBindings));
const QUALIFIED_PLAIN_METHODS=new Set(['v3-plain','v3-static-bodies-constraint-erasure-v1',
 'v3-opening-outer-bodies-inventory-erasure-v1','v3-full-physical-shutter-early-materialization-v1']);
const sortedCells=cells=>[...(cells??[])].sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
const sourceBoard=l=>({width:l.width,height:l.height,playable:sortedCells(l.playable??Array.from({length:l.width*l.height},(_,i)=>[i%l.width,Math.floor(i/l.width)])),blocked:sortedCells(l.blocked),seams:sortedCells(l.seams)});
function inspectSourceAdaptation(report,source){
 const errors=[],a=report.sourceAdaptation,staticAudit=report.staticAudit,repair=report.staticSourceRepair;
 const changed=source&&!isDeepStrictEqual(sourceBoard(source),sourceBoard(report.level));
 if(!changed&&!a&&!report.sourceAdaptationVersion&&!staticAudit?.sourceAdaptation&&!repair&&!report.attempt?.staticSourceRepair)return errors;
 const expected=describeLeagueSourceAdaptation(source,report.level);
 if(!changed||!expected.passed||report.sourceAdaptationVersion!==SOURCE_ADAPTATION_VERSION||!isDeepStrictEqual(a,expected)||!isDeepStrictEqual(staticAudit?.sourceAdaptation,expected))errors.push('source-adaptation-not-bound');
 if(!isDeepStrictEqual(staticAudit?.removedInheritedIssues,['mainline-board-baseline-mismatch'])||!isDeepStrictEqual(staticAudit?.inheritedIssues,['mainline-board-baseline-mismatch'])||!isDeepStrictEqual(staticAudit?.issues,[]))errors.push('source-adaptation-removed-other-static-issues');
 if(!validSha(report.toolchainBindings?.['tools/league-v2/proof-source-adaptation.mjs']))errors.push('missing-source-adaptation-tool-binding');
 if(repair||report.attempt?.staticSourceRepair){
  if(!repair||!isDeepStrictEqual(repair,report.attempt?.staticSourceRepair)||repair.upperSearchStates!==0||repair.lowerSearchStates!==0||!validSha(repair.previousReceiptSha256)||typeof repair.previousReceipt!=='string'||!repair.previousReceipt.endsWith('.result.json')||!validSha(report.attempt?.redesignOf)||report.attempt.id!==report.attempt.redesignOf+'.static-source-repair-v1')errors.push('source-static-repair-not-bound');
 }
 return errors;
}
/** Checks existing evidence only. Never creates a lower proof, marks a partial
 * catalog formal, or treats model replay as actual Pointer/natural-clock QA. */
export function inspectLeagueReceipt(report,source,index){
 const errors=[],band=leagueBand(index),l=report?.level;
 if(!l||!Array.isArray(report.drags))return ['missing-level-or-route'];
 const hash=levelSha256(l),routeHash=routeSha256(report.drags);
 if(report.ruleVersion!==RULE_VERSION||report.contractVersion!==PROOF_VERSION)errors.push('wrong-proof-contract');
 if(report.index!==index||l.id!==900000+index)errors.push('wrong-league-slot');
 if(l.timeSeconds!==180||l.reward!==0||l.difficulty!==(band.difficulty===2?'super':'hard'))errors.push('changed-league-settings');
 if(report.levelSha256!==hash)errors.push('level-sha-mismatch');
 if(!source||source.id!==report.sourceLevelId||levelSha256(source)!==report.sourceLevelSha256)errors.push('source-sha-mismatch');
 if(report.routeSha256!==routeHash)errors.push('route-sha-mismatch');
 if(report.accepted!==true||report.status!=='LEAGUE_SPATIAL_SCORING_VERIFIED_AWAITING_DESIGN_POINTER')errors.push('not-proof-accepted');
 if(!report.staticAudit?.passed||report.staticAudit.levelSha256!==hash)errors.push('static-audit-not-bound');
 if(!Number.isSafeInteger(report.L)||!Number.isSafeInteger(report.U)||report.L<band.lower||report.L>report.U||report.U>band.upper)errors.push('difficulty-outside-band');
 if(report.route?.inputLevelSha256!==hash||report.route?.routeSha256!==routeHash)errors.push('route-input-not-bound');
 for(const k of ['canonicalReplay','independentReplay']){
  const r=report.route?.[k];if(!r?.valid||!r.complete||r.failed||r.nonClearingDrags!==report.U)errors.push('invalid-'+k);
 }
 const canonical=report.route?.canonicalReplay,independent=report.route?.independentReplay;
 if(canonical?.effectiveDrags!==report.drags.length||independent?.effectiveDrags!==report.drags.length||canonical?.clearEvents!==independent?.clearEvents||!Array.isArray(independent?.trace)||independent.trace.length!==report.drags.length)errors.push('replay-accounting-mismatch');
 const lower=report.lowerBound,r=lower?.result;
 if(lower?.inputLevelSha256!==hash||lower?.requiredFloor!==band.lower||r?.floor!==band.lower||r.status!=='threshold-proven'||r.thresholdProven!==true||r.termination!=='below-threshold-exhausted')errors.push('lower-input-or-result-not-bound');
 if(report.L!==lower?.requiredFloor)errors.push('reported-lower-exceeds-certified-floor');
 if(!positiveCount(r?.budget?.maxStates)||!positiveCount(r?.discoveredStates)||r.discoveredStates>r.budget.maxStates||!validCount(r?.exploredStates)||r.exploredStates>r.discoveredStates)errors.push('lower-board-budget');
 if(!positiveCount(r?.rawFullBoardStates)||r.rawFullBoardStates!==r.discoveredStates||r.rawFullBoardStates>r?.budget?.maxStates)errors.push('raw-full-board-budget-not-certified');
 if(lower?.method===ICE_LOWER_METHOD){
  errors.push(...inspectNativeIceLower(lower,l,band));
  const extension=report.proofExtension;
  if(extension?.version!==ICE_CONTRACT_VERSION||extension?.primitiveVersion!==ICE_PROOF_VERSION||extension?.searchInvocations!==1||extension?.projectionUsed!==false||extension?.domain!=='ordinary-static-single-layer-bodies-and-gates-with-only-ice-counters')errors.push('native-ice-extension-not-bound');
  for(const file of ['tools/league-v2/proof-ice-contract.mjs','tools/league-v2/proof-ice-bounded.mjs'])if(!validSha(report.toolchainBindings?.[file]))errors.push('missing-native-ice-tool-binding:'+file);
 }else if(!QUALIFIED_PLAIN_METHODS.has(lower?.method))errors.push('unsupported-lower-method');
 else if(lower.method==='v3-plain'){
  if(lower.projection!==null||lower.projectedLevelSha256!==null)errors.push('plain-lower-has-projection');
 }else if(!lower.projection||lower.method!=='v3-'+lower.projection.method||lower.projectedLevelSha256!==lower.projection.projectedLevelSha256)errors.push('lower-method-projection-mismatch');
 if(lower?.projection){
  const p=lower.projection;
  if(p.sourceLevelSha256!==hash||p.projectedLevelSha256!==levelSha256(p.projectedLevel)||r?.sourceLevelSha256!==p.projectedLevelSha256)errors.push('projection-not-bound');
 }else if(r?.sourceLevelSha256!==hash)errors.push('plain-lower-not-bound');
 const search=report.route?.search;
 if(search&&(!positiveCount(search.budget?.maxStates)||!positiveCount(search.discoveredStates)||search.discoveredStates>search.budget.maxStates||!validCount(search.exploredStates)||search.exploredStates>search.discoveredStates||search.sourceLevelSha256!==hash))errors.push('upper-board-budget-or-input');
 if(!report.toolchainBindings||levelSha256(report.toolchainBindings)!==report.toolchainSha256)errors.push('toolchain-sha-mismatch');
 for(const file of REQUIRED_PROOF_BINDINGS)if(!validSha(report.toolchainBindings?.[file]))errors.push('missing-required-tool-binding:'+file);
 for(const[file,sha]of Object.entries(report.toolchainBindings??{}))if(!validSha(sha))errors.push('invalid-tool-binding:'+file);
 errors.push(...inspectSourceAdaptation(report,source));
 if(report.renderRevalidation){
  const v=report.renderRevalidation;
  if(v.version!==RENDER_REVALIDATION_VERSION||v.searchInvocations!==0||v.newSearchStates!==0||v.lowerRecomputed!==false||v.untimedOnly!==true||hasTimeSchedule(report)||!validSha(v.previousReceiptSha256)||v.carriedLowerBoundSha256!==levelSha256(report.lowerBound)||!validSha(report.toolchainBindings?.[RENDER_REVALIDATION_TOOL]))errors.push('render-revalidation-not-bound');
 }
 const score=report.scoring,ids=report.specials;
 if(!Array.isArray(ids)||ids.length<1||ids.length>3||new Set(ids).size!==ids.length||!score?.passed||JSON.stringify(ids)!==JSON.stringify(score.specials)||score.successPoints!==ids.length*10||score.failurePoints!==0||score.discardPoints!==0)errors.push('scoring-evidence');
 if(score?.selected?.length!==ids?.length||score?.selected?.some(s=>!ids.includes(s.blockId)||s.dragIndex<=report.drags.length/2||s.opening?.canExit!==false))errors.push('late-scoring-evidence');
 if(!report.attempt?.id||report.attempt.levelSha256!==hash)errors.push('attempt-ledger-binding');
 return errors;
}

export function inspectMechanismReceipt(receipt,report){
 const errors=[];
 if(!receipt?.ok||receipt.index!==report.index||receipt.levelSha256!==report.levelSha256||receipt.routeSha256!==report.routeSha256||!receipt.level||levelSha256(receipt.level)!==report.levelSha256||!Array.isArray(receipt.drags)||routeSha256(receipt.drags)!==report.routeSha256)errors.push('mechanism-input-not-bound');
 if(!receipt?.structure?.passed||!receipt?.participation?.passed)errors.push('mechanism-structure-or-participation');
 const c=receipt?.comparison,e=c?.capacityException;
 const capacity=report.index>=6&&report.index<=9&&e?.valid===true&&e.maximumPositiveIceGates===7&&e.requiredOpenGates===1
  &&c.previousTotal===7&&c.currentTotal===7&&c.previous?.['frozen-exit']?.instances===7&&c.current?.['frozen-exit']?.instances===7
  &&Array.isArray(e.oldValues)&&Array.isArray(e.newValues)&&e.oldValues.length===7&&e.newValues.length===7
  &&e.oldCounterSum===e.oldValues.reduce((a,b)=>a+b,0)&&e.newCounterSum===e.newValues.reduce((a,b)=>a+b,0)&&e.newCounterSum>e.oldCounterSum
  &&JSON.stringify(e.oldValues)===JSON.stringify(c.previous['frozen-exit'].values)&&JSON.stringify(e.newValues)===JSON.stringify(c.current['frozen-exit'].values)
  &&typeof e.reason==='string'&&e.reason.length>0;
 if(report.index>=6&&!(c?.totalIncreased===true&&c.instanceIncrease>0)&&!capacity)errors.push('mechanism-not-increased');
 if(!receipt?.plan||receipt.plan.index!==report.index)errors.push('mechanism-plan-not-bound');
 if(!receipt?.mechanismToolchainBindings||levelSha256(receipt.mechanismToolchainBindings)!==receipt.mechanismToolchainSha256)errors.push('mechanism-toolchain-sha');
 return errors;
}

export async function leagueCatalogProgress(runtime,selections){
 const chosen=new Map(),rows=[],allLevels=[];
 const hashCache=new Map(),hashFile=async file=>{if(!hashCache.has(file))hashCache.set(file,await fs.readFile(file).then(digest).catch(()=>null));return hashCache.get(file);};
 for(const selected of selections){
  if(!Number.isSafeInteger(selected.index)||selected.index<1||selected.index>100||chosen.has(selected.index))throw Error('Invalid or duplicate explicit league slot selection');
  chosen.set(selected.index,selected);
 }
 for(let index=1;index<=100;index++){
  const s=chosen.get(index),band=leagueBand(index);
  if(!s){rows.push({index,band,status:'PENDING_CANDIDATE'});continue;}
  const report=JSON.parse(await fs.readFile(s.proofFile,'utf8'));
  const source=runtime.LEVELS.find(l=>l.id===report.sourceLevelId),errors=inspectLeagueReceipt(report,source,index),staleBindings=[];
  const sourceEvidenceBindings={},renderEvidenceBindings={};
  if(report.renderRevalidation){
   try{
    const v=report.renderRevalidation,bytes=await fs.readFile(v.previousReceipt),previous=JSON.parse(bytes);
    renderEvidenceBindings[v.previousReceipt]=digest(bytes);
    if(digest(bytes)!==v.previousReceiptSha256)errors.push('render-revalidation-prior-file-sha');
    errors.push(...inspectRenderRevalidation(report,previous));
    errors.push(...inspectLeagueReceipt(previous,source,index).map(e=>'render-revalidation-original:'+e));
   }catch(error){errors.push('render-revalidation-evidence-unreadable:'+error.message);}
  }
  if(report.staticSourceRepair){
   try{
    const repair=report.staticSourceRepair,file=repair.previousReceipt,bytes=await fs.readFile(file),previous=JSON.parse(bytes);
    sourceEvidenceBindings[file]=digest(bytes);
    if(digest(bytes)!==repair.previousReceiptSha256)errors.push('source-static-repair-prior-file-sha');
    errors.push(...inspectUnsearchedStaticRejection(previous,report,source).map(e=>'source-static-repair:'+e));
    if(previous.attempt?.id!==report.attempt?.redesignOf||previous.toolchainBindings?.['tools/league-v2/proof-contract.mjs']!==report.toolchainBindings?.['tools/league-v2/proof-contract.mjs'])errors.push('source-static-repair-prior-attempt');
    for(const attempt of [previous.attempt,report.attempt]){
     const requestFile=path.join(path.dirname(file),attempt.id+'.request.json'),requestBytes=await fs.readFile(requestFile);
     sourceEvidenceBindings[requestFile.replaceAll('\\','/')]=digest(requestBytes);
     if(!isDeepStrictEqual(JSON.parse(requestBytes),attempt))errors.push('source-static-repair-request-mismatch');
    }
   }catch(error){errors.push('source-static-repair-evidence-unreadable:'+error.message);}
  }
  for(const[file,hash]of Object.entries(report.toolchainBindings??{}))if(await hashFile(file)!==hash)staleBindings.push(file);
  if(!report.staticAudit?.assetBindings||!Object.keys(report.staticAudit.assetBindings).length)errors.push('missing-actual-asset-bindings');
  for(const[file,hash]of Object.entries(report.staticAudit?.assetBindings??{}))if(await hashFile(path.join('public',file))!==hash)staleBindings.push('public/'+file);
  if(s.mechanismFile){
   const packet=JSON.parse(await fs.readFile(s.mechanismFile,'utf8')),m=packet.mechanisms??packet;
   errors.push(...inspectMechanismReceipt(m,report));
   const old=JSON.parse(await fs.readFile(`deliverables/league-v2-20261008/baseline/slots/${String(index).padStart(3,'0')}.json`,'utf8'));
   const previous=summarizeInventory(old.level),current=summarizeInventory(report.level);
   if(levelSha256(previous)!==levelSha256(m.comparison?.previous)||levelSha256(current)!==levelSha256(m.comparison?.current))errors.push('mechanism-counts-do-not-match-real-old-new-objects');
   for(const[file,hash]of Object.entries(m.mechanismToolchainBindings??{}))if(await hashFile(file)!==hash)staleBindings.push(file);
  }
  else errors.push('missing-mechanism-receipt');
  if(source&&report.level&&!compareLayout(source,report.level).accepted)errors.push('source-layout-too-similar');
  if(report.level)allLevels.push({index,level:report.level,sourceLevelId:report.sourceLevelId});
  rows.push({index,band,sourceLevelId:report.sourceLevelId,levelSha256:report.levelSha256,routeSha256:report.routeSha256,
   proofFile:s.proofFile,proofFileSha256:await hashFile(s.proofFile),mechanismFile:s.mechanismFile,mechanismFileSha256:s.mechanismFile?await hashFile(s.mechanismFile):null,
   L:report.L,U:report.U,specials:report.specials,errors,staleBindings,sourceEvidenceBindings,renderEvidenceBindings,
   partitionKey:report.level?partitionKey(report.level):null,boardMaskKey:report.level?boardMaskKey(report.level):null,
   status:errors.length?'REJECTED_RECEIPT':staleBindings.length?'STALE_TOOLCHAIN':'MODEL_VERIFIED_AWAITING_POINTER_VISUAL'});
 }
 const diversity=auditCatalogDiversity(allLevels);
 for(const failure of diversity.failures){const row=rows.find(r=>r.index===failure.index);if(row){row.errors.push(...failure.reasons??[failure.reason]);row.status='REJECTED_RECEIPT';}}
 return {status:'PROGRESS_ONLY_NOT_FORMAL_ACCEPTANCE',ruleVersion:RULE_VERSION,formalReady:false,productionChanged:false,expected:100,
  createdAt:new Date().toISOString(),counts:rows.reduce((c,r)=>(c[r.status]=(c[r.status]??0)+1,c),{}),rows,diversity,
  remainingAcceptance:['final same-object tool bindings','all 100 slots complete','mechanism strength and layout visual review','100 × two viewports actual Pointer and natural clock','actual league score settlement','formal registry verification']};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const[indexFile,output]=process.argv.slice(2);if(!indexFile||!output)throw Error('Usage: node catalog-progress.mjs <{selections:[{index,proofFile,mechanismFile}]}> <new-output.json>');
 const input=JSON.parse(await fs.readFile(indexFile,'utf8'));if(!Array.isArray(input.selections))throw Error('Explicit selections required');
 const result=await leagueCatalogProgress(await loadLeagueProofRuntime(),input.selections);
 await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({status:result.status,counts:result.counts,formalReady:result.formalReady}));
}
