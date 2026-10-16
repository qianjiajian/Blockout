import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import * as old from './plan-history-adapter-v8.mjs';
import * as production from './plan-history-adapter-v9.mjs';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';

// Historical JSON fixtures only. No PuzzleModel, route, runtime, constructor,
// solver or actual namespace/checkpoint is read. Only two review trust anchors
// are replaced in a SEPARATE test bundle; production has no anchor parameter.
const T='tools/daily-challenge/formal-v4/',SELF=T+'plan-history-adapter-v9.mjs',TEST=SELF.replace('.mjs','.test.mjs'),OLD=T+'plan-history-adapter-v8.mjs';
const clone=structuredClone,anchors=[
 {path:'deliverables/daily-formal-v4-20261008/proof/plain-reverse-source5-suffix-prefix-pilot-actual-independent-01/report.json',sha256:'f2d2496b0971878aef2248f6d5b6d69809e4c6ef36c63de21727f24937369c24'},
 {path:'deliverables/daily-formal-v4-20261008/proof/plain-reverse-source5-suffix-prefix-pilot-actual-independent-02/report.json',sha256:'a132d450e7be0da964f69c3cf85be500d8f6d3df50e0cf99d96e54416adacb0a'}
];
const literal=d=>`Object.freeze({path:'${d.path}',sha256:'${d.sha256}'})`;
function fixture(mode='valid'){
 const bytes=new Map(),prefix='C:/v9-synthetic-only',scope={baseDirectory:prefix,roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix'].map(id=>({id,physicalPath:prefix+'/roots/'+id,aliases:[prefix+'/alias/'+id]}))};
 const canonical=compileCanonicalHistoryPath(scope).canonical,files=[],pool=[],campaigns=[],terminalRecords=[],reviews=[],archivePaths=[];
 const doc=(p,value)=>{const raw=Buffer.from(JSON.stringify(value));bytes.set(p,raw);return{path:p,sha256:sha256(raw)};};
 const file=(p,value)=>{const d=doc(p,value);files.push({...d,rootId:scope.roots.find(r=>canonical(p).startsWith(canonical(r.physicalPath)+'/'))?.id??null,aliases:[p]});return d;};
 const factory=doc(prefix+'/factory.mjs',{syntheticFactory:true}),reference=doc(prefix+'/reference.json',{metadataOnly:true});
 const body=(id,color,shape,x=0,y=0)=>({id,color,shape,x,y});
 const inventory=[body('a','red',[[0,0]]),body('b','blue',[[0,0],[1,0]]),body('c','green',[[0,0]])];
 const board={id:5,width:2,height:2,gates:[],playable:[[0,0],[1,0],[0,1],[1,1]],blocked:[]};
 const candidate={...clone(board),blocks:[body('a','red',[[0,0]],0,0),body('b','blue',[[0,0],[1,0]],0,1),body('c','green',[[0,0]],1,0)]};
 function terminal(level,id){
  const namespace=canonical(scope.roots[0].physicalPath),f=sealedWorldIdentity(level),request={id,identityOrigin:id,redesignOf:null,...f},result={levelSha256:f.levelSha256,accepted:false,status:'SYNTHETIC_FAILED'};
  const req=file(namespace+'/'+id+'.request.json',request),res=file(namespace+'/'+id+'.result.json',result),blocks=[namespace+'/'+id+'.blocked.json',namespace+'/identities/'+f.retryIdentitySha256+'.blocked.json'].map(p=>{const value={attemptId:id,status:result.status};return{descriptor:file(p,value),value};});
  const r={kind:'mathematical',namespace,request:{descriptor:req,value:request},result:{descriptor:res,value:result},blocked:blocks,lock:null};terminalRecords.push(r);return{namespace,attemptId:id};
 }
 for(let batch=0;batch<2;batch++){
  const id='synthetic-closed-'+batch,dir=prefix+'/archive/'+batch,ctor=canonical(scope.roots[1].physicalPath),recipeCore={board:clone(board),inventory:clone(inventory),sourceLevelId:5,maximumCompletePhysicalInputs:1},recipe={...recipeCore,recipeSha256:levelSha256(recipeCore)};
  const planValue={version:'synthetic-review-contract',qualificationOnly:false,experimentId:id,recipe},plan=doc(dir+'/plan.json',planValue);
  const recipeIdentity=sha256('synthetic-recipe-'+batch),claim=file(ctor+'/'+id+'.claim.json',{plan,failedPlanContinuationAllowed:false}),recipeLock=file(ctor+'/'+id+'.recipe.json',{plan,recipeIdentity,experimentId:id,restartAllowed:false}),experimentLock=file(ctor+'/'+id+'.experiment.json',{plan,experimentId:id,restartAllowed:false});
  const seed=mode==='true-full'&&batch===0?clone(candidate):{...clone(board),blocks:[body('a','red',[[0,0]],0,0)]};
  if(mode==='renamed-partial'&&batch===0)seed.blocks[0].id='renamed-without-inventory';
  const packets=[{...clone(board),blocks:[]},seed].map((level,ordinal)=>{
   const creation={ordinal,label:ordinal?'saved-partial':'empty-normal-mask',levelSha256:levelSha256(level),full:mode==='wrong-full-flag'&&batch===0&&ordinal===1};
   return{levelSha256:creation.levelSha256,sourceLevelId:5,reference,recipeSha256:recipe.recipeSha256,creation,factory,...(ordinal?{level}:{emptyConstructionWorld:level,kind:'NON_IDENTITY_INITIAL_EMPTY_WORLD',identityEligible:false})};
  });
  const formedWorlds=packets.map((x,i)=>file(dir+'/world-'+i+'.json',x)),nonIdentityWorlds=[{descriptor:formedWorlds[0],field:'emptyConstructionWorld'}];archivePaths.push(formedWorlds[1].path);
  pool.push({descriptor:formedWorlds[1],field:mode==='wrong-field'&&batch===0?'placeholderWorld':'level',level:clone(seed),sourceLevelId:5,reference});
  const construction={phase:'terminal',firstComplete:null,completePhysicalInputs:0,formed:packets.map(x=>({level:clone(x.level??x.emptyConstructionWorld),info:clone(x.creation)})),session:{dualReplayStarted:false,formed:packets.map(x=>clone(x.creation))}};
  const q={version:planValue.version,qualificationOnly:false,plan,experimentId:id,sourceLevelId:5,status:'REVERSE_CONSTRUCTION_TERMINAL',accepted:false,formalReady:false,catalogEligible:false,designAccepted:false,mathematicalEvidenceValidated:false,level:null,levelSha256:null,L:null,U:null,proof:null,route:null,attempt:null,upperConstruction:null,lowerBound:null,archiveValidation:{valid:true},adminClosureRequired:false,construction,formedWorlds,nonIdentityWorlds};
  if(mode==='mathematical-input'&&batch===0)q.attempt={id:'unexpected-real-attempt'};
  const receipt=doc(dir+'/candidate.json',q),ix={closed:true,restartAllowed:false,maximumInputs:1,consumedInputs:0,completePhysicalInputs:0,receipt,formedWorldFiles:formedWorlds,nonIdentityWorlds};
  const index=file(dir+'/index.json',ix),rawClosure={...ix,plan},closureDescriptor=file(ctor+'/'+id+'.result.json',rawClosure),closure={id,descriptor:closureDescriptor,raw:rawClosure,closed:true,restartAllowed:false,consumedInputs:0,maximumInputs:1};campaigns.push(closure);
  const ownerFiles=[claim,recipeLock,experimentLock,...formedWorlds,closureDescriptor,index];if(mode==='altered-owner'&&batch===0)ownerFiles.pop();
  const owner=doc(dir+'/owner.json',{version:'plan-history-owner-v1',kind:'construction',id,namespace:ctor,experimentId:id,parentPlan:plan,attemptIds:[],files:ownerFiles,closedCampaigns:[closure]}),math=doc(dir+'/math-owner.json',{version:'plan-history-owner-v1',kind:'mathematical',id:id+'-math',namespace:canonical(scope.roots[0].physicalPath),experimentId:id,parentPlan:plan,attemptIds:[],files:[receipt],closedCampaigns:[]});
  const completion=doc(dir+'/completion.json',{version:planValue.version,status:'REVERSE_FIXED_STOCK_TASK_CLOSED',plan,receipt,index,constructionOwner:owner,mathOwner:math,closed:true,maximumInputs:1,allFailuresTerminal:true,accepted:0,publicClaimsStarted:0,adminClosureRequired:false,archiveValidation:{valid:true},formedWorlds:2,nonIdentityWorlds});
  reviews.push(doc(dir+'/independent.json',{status:'INDEPENDENT_REVERSE_SUFFIX_PREFIX_ACTUAL_PASS',errors:[],newConstructions:0,newSearches:0,newReplayCalls:0,newModels:0,newLedgerClaims:0,publicClaimsStarted:0,completePhysicalInputs:0,actualPublicClaimsStarted:0,actualOriginalLowerCalls:0,actualCanonicalReplayCalls:0,actualIndependentReplayCalls:0,accepted:false,closed:true,restartAllowed:false,originalOwnerDefinitionsPreserved:true,unclaimedMathOwnerReportBindingOnly:true,completion,plan,receipt,constructionOwner:owner,mathOwner:math,constructionIndex:index,constructionClosure:closureDescriptor,constructionClaim:claim,recipeLock,experimentLock,stableRecipeIdentity:recipeIdentity,recipeSha256:recipe.recipeSha256,archive:{totalFormedWorldRecords:2,physicalWorldRecords:1},toolBindings:{[factory.path]:factory.sha256}}));
 }
 let failedParent=null;
 if(mode==='terminal-input')terminal(pool[0].level,'existing-partial-math');
 if(mode==='failed-parent'){
  const parent={...clone(board),blocks:[body('a','red',[[0,0],[0,1]],0,0),body('z','blue',[[0,0]],1,0)]},d=file(prefix+'/parent-level.json',{level:parent});pool.push({descriptor:d,field:'level',level:parent,sourceLevelId:5,reference:null});failedParent=terminal(parent,'parent');
 }
 if(['complete-reference','renamed-complete','partition-collision'].includes(mode)){
  const complete=clone(candidate);if(mode==='complete-reference')complete.blocks=[body('a','red',[[0,0],[0,1]],0,0),body('b','blue',[[0,0],[0,1]],1,0)];
  const d=file(prefix+'/complete-level.json',{level:complete});pool.push({descriptor:d,field:'level',level:complete,sourceLevelId:5,reference});
 }
 const b={version:old.PLAN_HISTORY_VERSION,scope,baselinePlan:{path:'baseline-plan.json',sha256:sha256('p')},baselineActual:{path:'baseline-actual.json',sha256:sha256('a')},publicNamespace:canonical(scope.roots[0].physicalPath),files,archivedBindings:Object.fromEntries(files.map(d=>[d.path,d.sha256])),publicStocks:[],nearPools:{selected:[],old450:[],history:pool},terminalRecords,externalPrivate:[],retired:[],legacyReferences:[],closedCampaigns:campaigns,closedExperimentIds:campaigns.map(x=>x.id),oldLiveByteIntegrityClaimed:false,baselineFields:{publicStocks:[],previousLateStocks:[],previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:[]}};
 const checkpoint=doc(prefix+'/checkpoint.json',b),review=doc(prefix+'/checkpoint-review.json',{status:old.PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:old.planHistorySummary(b),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});
 if(mode==='wrong-sha')bytes.set(archivePaths[0],Buffer.from('wrong bytes'));
 if(mode==='renamed-complete')candidate.blocks.forEach((x,i)=>x.id='renamed-'+i);
 if(mode==='partition-collision')candidate.blocks.forEach(x=>x.color='pink');
 const readBytes=async p=>{assert(bytes.has(p),'Fixture map only: '+p);return bytes.get(p);};
 return{args:{checkpoint,review,expectedScope:scope,readBytes},readBytes,bytes,reviews,candidate,reference,failedParent,archivePaths,b};
}

export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve('deliverables/daily-formal-v4-20261008/proof')+path.sep));await fs.mkdir(out,{recursive:false});
 const fileBindings={},checks=[],read=async p=>{const b=await fs.readFile(p);fileBindings[p]=sha256(b);return b.toString();},save=async(name,value)=>{const p=out+'/'+name+'.json',b=Buffer.from(JSON.stringify(value,null,2)+'\n');await fs.writeFile(p,b,{flag:'wx'});fileBindings[p]=sha256(b);return{path:p,sha256:sha256(b)};};
 try{
  const source=await read(SELF),oldSource=await read(OLD),mark=source.indexOf('// v9\'s only admission');assert(mark>0);
  const before="sameReference(state.bundle,w.reference,reference))assert(changedHistoryShapeAndColour(old,f)",after="sameReference(state.bundle,w.reference,reference)&&!isAuthenticatedReversePartial(state,w))assert(changedHistoryShapeAndColour(old,f)";
  assert.equal(source.slice(0,mark),oldSource.replace(before,after)+'\n');assert.equal(source.split(after).length,2);
  checks.push({name:'exact-original-source-plus-one-conjunct-and-authenticator',passed:true,evidence:await save('source-diff',{oldSha256:sha256(oldSource),newSha256:sha256(source),substitution:{from:before,to:after},appendOnlyAuthenticationSource:source.slice(mark),allOtherOriginalBytesIdentical:true})});
  let counter=0;const instrumentations=[];
  async function moduleFor(f,label){let text=source;const substitutions=[];for(let i=0;i<2;i++){const a=literal(anchors[i]),b=literal(f.reviews[i]);assert.equal(text.split(a).length,2);text=text.replace(a,b);substitutions.push({from:a,to:b});}const compiled=await build({stdin:{contents:text,resolveDir:path.resolve(path.dirname(SELF)),sourcefile:'v9-test-only.mjs',loader:'js'},bundle:true,packages:'external',write:false,platform:'node',format:'esm',logLevel:'silent'});const p=out+'/fixture-'+counter+++'.mjs';await fs.writeFile(p,compiled.outputFiles[0].contents,{flag:'wx'});await read(p);instrumentations.push({label,path:p,productionSourceSha256:sha256(source),substitutions,onlyTwoTrustAnchorsReplaced:true});return import(pathToFileURL(path.resolve(p)).href);}
  const f=fixture(),api=await moduleFor(f,'positive-and-bundle-isolation'),state=await api.consumePlanHistory(f.args),oldState=await old.consumePlanHistory(f.args);assert.deepEqual(state,oldState);const frozen=JSON.stringify(state),options={sourceLevelId:5,reference:f.reference};
  assert.throws(()=>api.assertFreshPlanHistoryInput(state,f.candidate,options),/Branch requires/);assert.throws(()=>old.assertFreshPlanHistoryInput(oldState,f.candidate,options),/Branch requires/);
  const authentication=await api.authenticateKnownReversePartials(state,{readBytes:f.readBytes});assert.equal(authentication.authenticatedPartialRecords,2);assert.equal(JSON.stringify(state),frozen);assert.equal(api.assertFreshPlanHistoryInput(state,f.candidate,options).freshIdentity,true);assert.equal(api.assertFreshPlanHistoryInput({...state,fullWorlds:[...state.fullWorlds]},f.candidate,options).freshIdentity,true);
  const cloned=clone(state);await assert.rejects(api.authenticateKnownReversePartials(cloned,{readBytes:f.readBytes}),/v9-owned/);assert.throws(()=>api.assertFreshPlanHistoryInput(cloned,f.candidate,options),/Branch requires/);Object.freeze(cloned.bundle);await assert.rejects(api.authenticateKnownReversePartials(cloned,{readBytes:f.readBytes}),/v9-owned/);
  const nextState=await api.consumePlanHistory(f.args);assert.throws(()=>api.assertFreshPlanHistoryInput(nextState,f.candidate,options),/Branch requires/);
  f.bytes.set(f.archivePaths[0],Buffer.from('changed-after-success'));await assert.rejects(api.authenticateKnownReversePartials(state,{readBytes:f.readBytes}),/SHA mismatch/);assert.throws(()=>api.assertFreshPlanHistoryInput(state,f.candidate,options),/Branch requires/);
  checks.push({name:'authenticated-partial-only-bundle-identity-and-failure-atomicity',passed:true,evidence:await save('positive-and-isolation',{authenticated:2,unauthenticatedRejected:true,oldAdapterRejected:true,shallowFactoryComparisonViewAccepted:true,clonedOrCallerFrozenRejected:true,separateConsumedBundleNotAuthorized:true,failedReauthenticationRevokesGrant:true,bundleUnchanged:true})});
  const rejects=[];for(const mode of ['wrong-sha','wrong-full-flag','true-full','mathematical-input','terminal-input','altered-owner','renamed-partial','wrong-field']){const f=fixture(mode),a=await moduleFor(f,mode),s=await a.consumePlanHistory(f.args);let reason=null;try{await a.authenticateKnownReversePartials(s,{readBytes:f.readBytes});}catch(e){reason=e.message;}assert(reason,mode);assert.throws(()=>a.assertFreshPlanHistoryInput(s,f.candidate,{sourceLevelId:5,reference:f.reference}));rejects.push({mode,reason});}
  checks.push({name:'eight-metadata-corruption-and-ownership-rejections',passed:true,evidence:await save('rejected-authentication',{rejects})});
  const gateResults=[];for(const mode of ['failed-parent','complete-reference','renamed-complete','partition-collision']){const f=fixture(mode),a=await moduleFor(f,mode),s=await a.consumePlanHistory(f.args);await a.authenticateKnownReversePartials(s,{readBytes:f.readBytes});let reason=null;try{a.assertFreshPlanHistoryInput(s,f.candidate,{sourceLevelId:5,reference:f.reference,failedParent:f.failedParent});}catch(e){reason=e.message;}assert(reason,mode);if(mode==='failed-parent')assert.match(reason,/Failed parent requires/);if(mode==='complete-reference')assert.match(reason,/Branch requires/);if(mode==='renamed-complete')assert.match(reason,/physical\/design identity/);if(mode==='partition-collision')assert.match(reason,/Existing partition/);gateResults.push({mode,reason});}
  checks.push({name:'complete-parent-identity-and-partition-protections-retained',passed:true,evidence:await save('unchanged-gates',{gateResults,allNearPoolRowsRetained:true,nearThresholdsNotModified:true,closedCampaignsNotModified:true})});
  const productionState=await production.consumePlanHistory(fixture().args);let reads=0;await assert.rejects(production.authenticateKnownReversePartials(productionState,{readBytes:async p=>{reads++;assert.equal(p,anchors[0].path);return Buffer.from('{}');}}),/SHA mismatch/);assert.equal(reads,1);
  checks.push({name:'unmodified-production-hard-anchor-fails-closed',passed:true,evidence:await save('production-anchor',{firstAnchor:anchors[0],actualReadCount:reads,wrongBytesRejected:true,productionAllowsAnchorArgument:false,actualArchiveAuthorizationRun:false})});
  await save('test-only-anchor-substitutions',{instrumentations,productionSourceUnchanged:true,realHistoryRootsUsed:false});
  const c=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(c.metafile.inputs))toolBindings[p]=sha256(await read(p));await read(TEST);
  for(const[p,h]of Object.entries(fileBindings))assert.equal(sha256(await fs.readFile(p)),h);
  const report={status:'PLAN_HISTORY_KNOWN_REVERSE_PARTIAL_AUTHENTICATION_METADATA_PASS',errors:[],checks,fileBindings,toolBindings,oldAdapterUnchanged:true,onlySameReferenceClauseChanged:true,schemaChanged:false,oldHistoryChanged:false,productionQualified:false,actualArchiveAuthenticationExecuted:false,newRealHistoryLoads:0,newRealHistoryMerges:0,newRealHistoryExports:0,newConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newLedgerClaims:0,limitations:['Synthetic historical JSON only; separate test bundles replace exactly two anchor descriptors.','No actual checkpoint or complete production archive was authenticated by this test.','Actual future consumer must explicitly authenticate both exact closed archives after v9 consume/merge.','Neither source5 pilot is authorized to resume or repeat; all full/failed/near and owner/member controls remain required.']};return{report:await save('report',report),checks:checks.length};
 }catch(e){await save('failed-report',{status:'PLAN_HISTORY_KNOWN_REVERSE_PARTIAL_AUTHENTICATION_METADATA_FAIL',error:e.stack,checks,fileBindings});throw e;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));
