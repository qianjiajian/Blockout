import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import * as old from './plan-history-adapter-v10.mjs';
import * as production from './plan-history-adapter-v11.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';

const T='tools/daily-challenge/formal-v4/',V='deliverables/daily-formal-v4-20261008/',SELF=T+'plan-history-adapter-v11.mjs',TEST=T+'plan-history-adapter-v11.test.mjs';
const OBS={path:V+'proof/star-source200-administrative-observation-01/observation.json',sha256:'7aa664b69de5e2227b02ce84e01f5faee86cfb0b8b2d72ed9bab7b8dc7917262'};
const OLD_ANCHORS=[{path:V+'proof/plain-reverse-source5-suffix-prefix-pilot-actual-independent-01/report.json',sha256:'f2d2496b0971878aef2248f6d5b6d69809e4c6ef36c63de21727f24937369c24'},{path:V+'proof/plain-reverse-source5-suffix-prefix-pilot-actual-independent-02/report.json',sha256:'a132d450e7be0da964f69c3cf85be500d8f6d3df50e0cf99d96e54416adacb0a'}];
const literal=d=>`Object.freeze({path:'${d.path}',sha256:'${d.sha256}'})`,copy=structuredClone;

export async function run(out){
 assert(path.resolve(out).startsWith(path.resolve(V+'proof')+path.sep));await fs.mkdir(out,{recursive:false});
 const bindings={},checks=[],substitutions=[];
 const read=async(p,h)=>{const b=await fs.readFile(p);if(h)assert.equal(sha256(b),h);bindings[p]=sha256(b);return b;};
 const json=async d=>JSON.parse(await read(d.path,d.sha256));
 const save=async(name,q)=>{const p=out+'/'+name+'.json',b=Buffer.from(JSON.stringify(q,null,2)+'\n');await fs.writeFile(p,b,{flag:'wx'});bindings[p]=sha256(b);return{path:p,sha256:sha256(b)};};
 try{
  const source=(await read(SELF)).toString(),prior=(await read(T+'plan-history-adapter-v10.mjs')).toString();
  const changes=[["import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';","import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';\nimport {assertSource200StarStock,assertStaticStarDomain} from './reverse-star-suffix-blueprint-v2.mjs';"],["consumed/merged by v10.","consumed/merged by v11."],["requires a v10-owned immutable state","requires a v11-owned immutable state"],[" // Re-check current evidence before publishing any per-bundle authorization."," const protocolArchives=await collectProtocolStarPartials(state,options,{raw,json,sameDescriptor,registered,claimedHashes,pending});summaries.push(...protocolArchives);\n // Re-check current evidence before publishing any per-bundle authorization."],["archives:summaries,fileBindings,onlySameReferenceShapeColourClauseSkipped","archives:summaries,protocolArchives,fileBindings,onlySameReferenceShapeColourClauseSkipped"]];
  const marker='\n// v11 protocol admission',index=source.indexOf(marker);assert(index>0);let restored=source.slice(0,index);for(const [a,b]of [...changes].reverse()){assert.equal(restored.split(b).length,2);restored=restored.replace(b,a);}assert.equal(restored,prior);
  checks.push({name:'exact-reversible-v10-diff',passed:true,evidence:await save('source-diff',{oldSha256:sha256(prior),newSha256:sha256(source),changes,appended:source.slice(index),allOldValidationMergeIdentityNearFailedParentAndLegacyAuthUnchanged:true})});
  // Reuse the original v9 SYNTHETIC metadata factory, not its test runner.
  const supportSource=(await read(T+'plan-history-adapter-v9.test.mjs')).toString()+'\nexport {fixture};\n';
  const supportBuild=await build({stdin:{contents:supportSource,resolveDir:path.resolve(T),sourcefile:'v9-fixture-support-only.mjs',loader:'js'},bundle:true,packages:'external',write:false,platform:'node',format:'esm',logLevel:'silent'});
  const supportPath=out+'/synthetic-support.mjs';await fs.writeFile(supportPath,supportBuild.outputFiles[0].contents,{flag:'wx'});await read(supportPath);const {fixture}=await import(pathToFileURL(path.resolve(supportPath)).href);

  // Read only the already saved small case documents. Their existing partial
  // geometries are reused as historical JSON; no new layout is authored.
  const o=await json(OBS),p0=await json(o.plan),q0=await json(o.candidate),done0=await json(o.completion),ix0=await json(o.originalIndex),review0=await json(o.strictFailureReview),fragment0=await json(o.coordinateFragmentEvidence),declaration0=await json(p0.declaration);
  const packet0=await Promise.all(o.saved.map(x=>json(x.descriptor)));
  let moduleCount=0;
  function make(mode='valid'){
   const f=fixture(),b=f.b,scope=b.scope,canonical=compileCanonicalHistoryPath(scope).canonical,dir='C:/v10-synthetic-only/star',namespace=canonical(scope.roots[1].physicalPath),experimentId='synthetic-star-closed';
   const doc=(file,value)=>{const bytes=Buffer.from(JSON.stringify(value));f.bytes.set(file,bytes);return{path:file,sha256:sha256(bytes)};};
   const file=(name,value)=>{const d=doc(name,value);b.files.push({...d,aliases:[d.path],rootId:scope.roots.find(r=>canonical(d.path).startsWith(canonical(r.physicalPath)+'/'))?.id??null});b.archivedBindings[d.path]=d.sha256;return d;};
   const ref=doc(dir+'/reference.json',{existingReferenceMetadata:true}),factory=doc(dir+'/factory.mjs',{syntheticMetadataFactory:true}),declaration=doc(dir+'/declaration.json',{sourceReference:ref});
   const p={...copy(p0),experimentId,declaration,bindings:{}},plan=doc(dir+'/plan.json',p),recipeIdentity=sha256('synthetic-star-recipe');
   const claim=file(namespace+'/synthetic-star.claim.json',{plan,failedPlanContinuationAllowed:false}),recipeLock=file(namespace+'/synthetic-star.recipe.json',{plan,recipeIdentity,experimentId,restartAllowed:false}),experimentLock=file(namespace+'/synthetic-star.experiment.json',{plan,experimentId,restartAllowed:false});
   const packets=packet0.map(z=>({...copy(z),reference:ref,factory}));if(mode==='full-flag')packets[4].creation.full=true;
   const worlds=packets.map((z,i)=>file(dir+'/world-'+i+'.json',z)),nonIdentity=[{...copy(q0.nonIdentityWorlds[0]),descriptor:worlds[0],factory}];
   const q={...copy(q0),experimentId,plan,formedWorlds:worlds,nonIdentityWorlds:nonIdentity,bindings:{}};
   q.construction.formed=packets.map(z=>({level:copy(z.level??z.emptyConstructionWorld),info:copy(z.creation)}));q.construction.session.formed=packets.map(z=>({label:z.creation.label,levelSha256:z.creation.levelSha256,full:z.creation.full}));
   if(mode==='claimed-candidate')q.attempt={id:'forbidden'};
   const candidate=file(dir+'/candidate.json',q),ix={...copy(ix0),receipt:candidate,formedWorldFiles:worlds,nonIdentityWorlds:nonIdentity},index=file(dir+'/index.json',ix),rawClosure={...ix,plan};
   const closureDescriptor=file(namespace+'/synthetic-star.result.json',rawClosure),closure={id:experimentId,descriptor:closureDescriptor,raw:rawClosure,closed:true,restartAllowed:false,consumedInputs:0,maximumInputs:1};if(mode==='wrong-closure')closure.consumedInputs=1;
   const owner=doc(dir+'/owner.json',{version:'plan-history-owner-v1',kind:'construction',namespace,id:experimentId,experimentId,parentPlan:plan,files:[claim,recipeLock,experimentLock,...worlds,closureDescriptor,index],attemptIds:[],closedCampaigns:[closure]});
   const math=doc(dir+'/math-owner.json',{version:'plan-history-owner-v1',kind:'mathematical',namespace:b.publicNamespace,id:experimentId+'-math',experimentId,parentPlan:plan,files:[candidate],attemptIds:[],closedCampaigns:[]});
   const done={...copy(done0),plan,receipt:candidate,index,constructionOwner:owner,mathOwner:math,nonIdentityWorlds:nonIdentity},completion=doc(dir+'/completion.json',done);
   const review={...copy(review0),plan,completion,receipt:candidate,constructionOwner:owner,mathOwner:math,constructionIndex:index,constructionClosure:closureDescriptor,constructionClaim:claim,recipeLock,experimentLock,stableRecipeIdentity:recipeIdentity,fileBindings:{},toolBindings:{[factory.path]:factory.sha256}};
   const reviewDescriptor=doc(dir+'/strict-review.json',review),fragment={...copy(fragment0),actualAudit:reviewDescriptor,candidate,seedArchive:worlds[4],fileBindings:{}},fragmentDescriptor=doc(dir+'/fragment.json',fragment);
   const observation={...copy(o),plan,completion,candidate,strictFailureReview:reviewDescriptor,coordinateFragmentEvidence:fragmentDescriptor,originalConstructorOwner:owner,originalMathOwner:math,originalIndex:index,originalClosure:closureDescriptor,saved:o.saved.map((z,i)=>({...copy(z),descriptor:worlds[i]})),fileBindings:{}};
   const observationDescriptor=file(dir+'/observation.json',observation);b.closedCampaigns.push(closure);b.closedExperimentIds.push(experimentId);
   const starRows=packets.slice(1).map((z,i)=>({descriptor:worlds[i+1],field:mode==='wrong-field'&&i===0?'placeholderWorld':'level',level:copy(z.level),sourceLevelId:200,reference:mode==='wrong-reference'&&i===0?{...ref,sha256:sha256('wrong ref')}:ref}));b.nearPools.history.push(...starRows);
   if(mode==='public-claim'){
    const fprint=sealedWorldIdentity(starRows[0].level),id=fprint.designSha256,request={id,identityOrigin:id,redesignOf:null,...fprint},result={accepted:false,status:'SYNTHETIC_FAILED',levelSha256:fprint.levelSha256};
    const requestD=file(b.publicNamespace+'/'+id+'.request.json',request),resultD=file(b.publicNamespace+'/'+id+'.result.json',result),blocked=[b.publicNamespace+'/'+id+'.blocked.json',b.publicNamespace+'/identities/'+fprint.retryIdentitySha256+'.blocked.json'].map(name=>{const value={attemptId:id};return{descriptor:file(name,value),value};});
    b.terminalRecords.push({kind:'mathematical',namespace:b.publicNamespace,request:{descriptor:requestD,value:request},result:{descriptor:resultD,value:result},blocked,lock:null});b.publicStocks.push({...request,...requestD});
   }
   if(mode==='missing-member'){b.files=b.files.filter(x=>x.path!==observationDescriptor.path);delete b.archivedBindings[observationDescriptor.path];}
   const checkpoint=doc(dir+'/checkpoint.json',b),checkpointReview=doc(dir+'/checkpoint-review.json',{status:old.PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:old.planHistorySummary(b),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});
   if(mode==='wrong-sha')f.bytes.set(worlds[2].path,Buffer.from('bad original bytes'));
   const readBytes=async name=>{assert(f.bytes.has(name),'Synthetic map only; no fallback filesystem reads');return f.bytes.get(name);};
   return{...f,args:{checkpoint,review:checkpointReview,expectedScope:scope,readBytes},readBytes,observationDescriptor,worlds,starRows,dir,namespace,doc,b};
  }
  async function moduleFor(f,label){let text=source;const replacements=[];for(const [a,d]of [...OLD_ANCHORS.map((a,i)=>[a,f.reviews[i]]),[OBS,f.observationDescriptor]]){assert.equal(text.split(literal(a)).length,2);text=text.replace(literal(a),literal(d));replacements.push({from:literal(a),to:literal(d)});}
   text+='\nexport const __testPartialGrant=isAuthenticatedReversePartial;\n';
   const result=await build({stdin:{contents:text,resolveDir:path.resolve(T),sourcefile:'v10-test-only.mjs',loader:'js'},bundle:true,write:false,packages:'external',platform:'node',format:'esm',logLevel:'silent'}),file=out+'/fixture-'+moduleCount+++'.mjs';await fs.writeFile(file,result.outputFiles[0].contents,{flag:'wx'});await read(file);substitutions.push({label,file,replacements,testOnlyReadOnlyGrantQuery:true});return import(pathToFileURL(path.resolve(file)).href);
  }
 function addProtocol(f,mode='valid'){
  const b=f.b,canonical=compileCanonicalHistoryPath(b.scope).canonical,dir='C:/v11-synthetic-only/protocol',experimentId='synthetic-protocol-closed',namespace=canonical(b.scope.roots[1].physicalPath);
  const doc=f.doc,file=(name,value)=>{const d=doc(name,value);b.files.push({...d,aliases:[d.path],rootId:b.scope.roots.find(r=>canonical(d.path).startsWith(canonical(r.physicalPath)+'/'))?.id??null});b.archivedBindings[d.path]=d.sha256;return d;};
  const version='single-star-double-exit-known-suffix-owned-task-v4',taskPath=T+'reverse-star-suffix-task-v4.mjs',factoryPath=T+'reverse-star-suffix-factory-v5.mjs';
  // Only metadata wrappers change. All five physical levels remain exact old
  // saved objects. Four unpositioned, absent inventory IDs are disambiguated.
  const recipeCore=copy(p0.recipe);delete recipeCore.recipeSha256;recipeCore.version='star-double-exit-known-suffix-new-prefix-first-full-reverse-v5';recipeCore.qualificationFixture=null;recipeCore.assetBindings={};
  const oldIds=new Set(recipeCore.board.gates.map(g=>g.id));for(const atom of recipeCore.inventory)if(oldIds.has(atom.id))atom.id='synthetic-unpositioned-'+atom.id;
  const ids=recipeCore.inventory.map(x=>x.id);recipeCore.insertionOrder=[...ids];recipeCore.parkingBodyIds=[...ids];recipeCore.recipeId='synthetic-protocol-stock';
  const recipe={...recipeCore,recipeSha256:levelSha256(recipeCore)},reference=doc(dir+'/reference.json',{unchangedPhysicalReference:true});
  const stock={recipeId:recipe.recipeId,sourceLevelId:200,targetDifficulty:1,inventory:recipe.inventory.map(({x,y,...atom})=>atom),gates:copy(recipe.board.gates),insertionOrder:ids,parkingBodyIds:ids,blueprint:{reference,cutAfterDrag:34}};
  const declaration=doc(dir+'/stock.json',{sourceReference:reference,recipes:[stock]});
  const task=doc(taskPath,{testOnlyQualifiedTaskMetadata:true}),factory=doc(factoryPath,{testOnlyQualifiedFactoryMetadata:true}),tools={[task.path]:task.sha256,[factory.path]:factory.sha256};
  const qualification=doc(dir+'/qualification.json',{status:'INDEPENDENT_REVERSE_STAR_SUFFIX_TASK_V4_PASS',closedProductionScopeReviewed:true,errors:[],newRealConstructions:0,newSearches:0,publicClaimsStarted:0,toolBindings:tools});
  const context=doc(dir+'/context.json',{version,experimentId,qualificationOnly:false,sourceLevelId:200,targetDifficulty:1,qualification,declaration,stockId:stock.recipeId});
  const planValue={version,qualificationOnly:false,experimentId,recipe,contextDescriptor:context,declaration,bindings:{...tools,[qualification.path]:qualification.sha256,[context.path]:context.sha256},maximumCompletePhysicalInputs:1,firstFullFailureIsTerminal:true,dualUpperReplayPairsMaximum:1,originalLowerCallsMaximum:1};
  if(mode==='unknown-producer')planValue.version='unqualified-producer';
  if(mode==='wrong-tool-binding')planValue.bindings[factoryPath]=sha256('wrong');
  const plan=doc(dir+'/plan.json',planValue),claim=file(namespace+'/protocol.claim.json',{plan,failedPlanContinuationAllowed:false}),recipeLock=file(namespace+'/protocol.recipe.json',{version:'fixed-reverse-physical-recipe-once-v1',plan,recipeIdentity:sha256('synthetic-protocol-recipe'),experimentId,maximumInputs:1,restartAllowed:false}),experimentLock=file(namespace+'/protocol.experiment.json',{plan,experimentId,maximumInputs:1,restartAllowed:false});
  const packets=packet0.map(z=>{const x=copy(z);x.reference=reference;x.factory=factory;x.recipeSha256=recipe.recipeSha256;x.creation.staticValidation='PENDING';x.creation.full=Object.hasOwn(x,'emptyConstructionWorld')?false:null;return x;});
  const worlds=packets.map((x,i)=>file(dir+'/world-'+i+'.json',x)),nonIdentity=[{descriptor:worlds[0],field:'emptyConstructionWorld',levelSha256:packets[0].levelSha256,ordinal:0,kind:packets[0].kind,factory}];
  const archiveValidation={valid:true,completeFormedWorldArchivalVerified:true,allStaticWorldsValid:true},formed=packets.map((x,i)=>({ordinal:i,level:copy(x.level??x.emptyConstructionWorld),info:copy(x.creation)})),sessionRows=packets.map(x=>({label:x.creation.label,levelSha256:x.levelSha256,full:x.creation.full,validation:{archiveCaptured:true,staticValidation:'PASSED',validatedFull:false,authorityGranted:true,error:null}}));
  if(mode==='static-failed')sessionRows.at(-1).validation={archiveCaptured:true,staticValidation:'FAILED',validatedFull:null,authorityGranted:false,error:'synthetic static failure'};
  if(mode==='full')sessionRows.at(-1).validation.validatedFull=true;
  if(mode==='not-captured')sessionRows.at(-1).validation.archiveCaptured=false;
  if(mode==='late-guard')sessionRows.at(-1).validation={archiveCaptured:true,staticValidation:'PASSED',validatedFull:false,authorityGranted:false,error:'synthetic deadline after validation'};
  const q={version,qualificationOnly:false,experimentId,sourceLevelId:200,targetDifficulty:1,plan,status:'REVERSE_CONSTRUCTION_TERMINAL',accepted:false,formalReady:false,catalogEligible:false,designAccepted:false,mathematicalEvidenceValidated:false,level:null,levelSha256:null,L:null,U:null,proof:null,route:null,attempt:null,upperConstruction:null,lowerBound:null,archiveValidation,adminClosureRequired:false,formedWorlds:worlds,nonIdentityWorlds:nonIdentity,construction:{phase:'terminal',firstComplete:null,completePhysicalInputs:0,completePhysicalInputsFullyClassified:true,unvalidatedWorlds:0,formed,session:{dualReplayStarted:false,counters:{canonicalReplays:0,independentReplays:0},rawAccounting:{active:false,recordTicketsIssued:5,recordTicketsConsumed:5},formed:sessionRows}}};
  if(mode==='missing-ticket')q.construction.session.rawAccounting.recordTicketsConsumed=6;
  if(mode==='claimed-candidate')q.attempt={id:'never-a-partial'};
  const receipt=file(dir+'/candidate.json',q),ix={status:'REVERSE_FIXED_STOCK_CONSTRUCTION_CLOSED',experimentId,closed:true,restartAllowed:false,maximumInputs:1,consumedInputs:0,completePhysicalInputs:0,formedWorldFiles:worlds,nonIdentityWorlds:nonIdentity,archiveValidation,adminClosureRequired:false,receipt,accepted:false,mathematicalAcceptance:false},index=file(dir+'/index.json',ix),rawClosure={...ix,plan,finishedAt:'2026-01-01T00:00:00.000Z'};
  const closureD=file(namespace+'/protocol.result.json',rawClosure),closure={id:experimentId,descriptor:closureD,raw:rawClosure,closed:true,restartAllowed:false,consumedInputs:0,maximumInputs:1};
  const ownerFiles=[claim,recipeLock,experimentLock,...worlds,closureD,index];if(mode==='owner-omission')ownerFiles.pop();
  const owner=doc(dir+'/owner.json',{version:'plan-history-owner-v1',id:experimentId,experimentId,kind:'construction',namespace,parentPlan:plan,files:ownerFiles,attemptIds:[],closedCampaigns:[closure]}),math=doc(dir+'/math-owner.json',{version:'plan-history-owner-v1',id:experimentId+'-math',experimentId,kind:'mathematical',namespace:b.publicNamespace,parentPlan:plan,files:[receipt],attemptIds:[],closedCampaigns:[]});
  const completion=doc(dir+'/completion.json',{version,status:'REVERSE_FIXED_STOCK_TASK_CLOSED',closed:true,maximumInputs:1,allFailuresTerminal:true,externalOwnerIndexOnly:true,accepted:0,publicClaimsStarted:0,adminClosureRequired:false,archiveValidation,plan,receipt,index,constructionOwner:owner,mathOwner:math,formedWorlds:5,nonIdentityWorlds:nonIdentity});
  b.closedCampaigns.push(closure);b.closedExperimentIds.push(experimentId);
  const rows=packets.slice(1).map((x,i)=>({descriptor:worlds[i+1],field:mode==='wrong-field'&&i===0?'templateLevel':'level',level:copy(x.level),sourceLevelId:200,reference}));b.nearPools.history.push(...rows);
  if(mode==='public-claim'){
   const identity=sealedWorldIdentity(rows[0].level),id=identity.designSha256,request={id,identityOrigin:id,redesignOf:null,...identity},result={accepted:false,status:'SYNTHETIC_FAILED',levelSha256:identity.levelSha256};
   const requestD=file(b.publicNamespace+'/'+id+'.request.json',request),resultD=file(b.publicNamespace+'/'+id+'.result.json',result),blocked=[b.publicNamespace+'/'+id+'.blocked.json',b.publicNamespace+'/identities/'+identity.retryIdentitySha256+'.blocked.json'].map(name=>{const value={attemptId:id};return{descriptor:file(name,value),value};});
   b.terminalRecords.push({kind:'mathematical',namespace:b.publicNamespace,request:{descriptor:requestD,value:request},result:{descriptor:resultD,value:result},blocked,lock:null});b.publicStocks.push({...request,...requestD});
  }
  if(mode==='missing-member'){b.files=b.files.filter(x=>x.path!==worlds[2].path);delete b.archivedBindings[worlds[2].path];}
  if(mode==='wrong-closure')closure.raw.plan={...plan,sha256:sha256('false-plan')};
  const checkpoint=doc(dir+'/checkpoint.json',b),review=doc(dir+'/checkpoint-review.json',{status:old.PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:old.planHistorySummary(b),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});
  if(mode==='bad-bytes')f.bytes.set(worlds[2].path,Buffer.from('wrong original bytes'));
  const options={readBytes:f.readBytes,additionalClosedArchives:[{completion,producerQualification:qualification}],trustedProducerQualifications:mode==='untrusted'?[]:[qualification]};
  f.args={checkpoint,review,expectedScope:b.scope,readBytes:f.readBytes};return{...f,protocol:{rows,worlds,completion,plan,qualification,options},options};
 }
  const f=addProtocol(make()),api=await moduleFor(f,'protocol-positive'),state=await api.consumePlanHistory(f.args),before=JSON.stringify(state),auth=await api.authenticateKnownReversePartials(state,f.options);
  assert.equal(auth.authenticatedPartialRecords,10);assert.equal(auth.archives.length,4);assert.deepEqual(auth.protocolArchives,auth.archives.slice(3));assert.equal(auth.protocolArchives[0].authenticatedPartialRecords,4);assert.deepEqual(auth.protocolArchives[0].plan,f.protocol.plan);assert.equal(JSON.stringify(state),before);
  for(const row of f.protocol.rows)assert(api.__testPartialGrant(state,row));assert.equal(api.__testPartialGrant(state,{...f.protocol.rows[0],field:'templateLevel'}),false);
  const alias={...f.protocol.rows[0],descriptor:{...f.protocol.rows[0].descriptor,path:f.protocol.rows[0].descriptor.path.replaceAll('/','\\').toUpperCase()}};assert(api.__testPartialGrant(state,alias));assert(api.__testPartialGrant({...state,fullWorlds:[...state.fullWorlds]},alias));
  assert.equal(api.__testPartialGrant(state,{descriptor:f.protocol.worlds[0],field:'emptyConstructionWorld',level:packet0[0].emptyConstructionWorld}),false);assert.equal(api.__testPartialGrant(copy(state),alias),false);
  const newState=await api.consumePlanHistory(f.args);assert.equal(api.__testPartialGrant(newState,alias),false);
  const metadataOwner={version:'plan-history-owner-v1',id:'synthetic-v11-empty-merge',namespace:f.namespace,kind:'construction',files:[],attemptIds:[],closedCampaigns:[]},ownerD=f.doc(f.dir+'/v11-owner.json',metadataOwner),declaredOwner={id:metadataOwner.id,namespace:metadataOwner.namespace,kind:metadataOwner.kind,definition:ownerD},delta=f.doc(f.dir+'/v11-delta.json',{version:api.PLAN_HISTORY_VERSION,parentHeadSha256:state.headSha256,owner:declaredOwner,files:[],terminalRecords:[],fullWorlds:[],closedCampaigns:[]}),listing=Object.fromEntries(f.b.scope.roots.map(r=>[r.id,f.b.files.filter(x=>x.rootId===r.id).map(x=>x.path)]));
  const merged=await api.mergePlanHistoryDelta(state,{descriptor:delta,declaredOwner,listing,readBytes:f.readBytes});assert.equal(api.__testPartialGrant(merged,alias),false);
  const guard=addProtocol(make(),'late-guard'),guardAPI=await moduleFor(guard,'late-guard'),guardState=await guardAPI.consumePlanHistory(guard.args);assert.equal((await guardAPI.authenticateKnownReversePartials(guardState,guard.options)).protocolArchives[0].authenticatedPartialRecords,4);
  checks.push({name:'complete-qualified-protocol-four-only-scope-and-late-guard',passed:true,evidence:await save('positive',{syntheticLegacy:6,protocol:4,total:10,archives:4,oldArchivalFailureNotReclassified:true,protocolAllStaticPassed:true,lateGuardPreservesOriginalValidPartial:true,emptyAndWrongFieldExcluded:true,canonicalAliasSameBundleOnly:true,cloneNewConsumeMergeDoNotInherit:true,summary:auth.protocolArchives})});
  const refusals=[];for(const mode of ['untrusted','unknown-producer','wrong-tool-binding','static-failed','full','not-captured','missing-ticket','claimed-candidate','owner-omission','wrong-field','public-claim','missing-member','wrong-closure','bad-bytes']){
   const x=addProtocol(make(),mode),a=await moduleFor(x,mode);let reason=null,s;try{s=await a.consumePlanHistory(x.args);await a.authenticateKnownReversePartials(s,x.options);}catch(e){reason=e.message;}assert(reason,mode);if(s)for(const w of s.fullWorlds)assert.equal(a.__testPartialGrant(s,w),false);refusals.push({mode,reason});
  }
  checks.push({name:'fourteen-integrity-producer-completeness-and-claim-refusals',passed:true,evidence:await save('refusals',{refusals,anyFailureRevokesAllLegacyAndProtocolGrants:true})});
  const counts=new Map();await assert.rejects(api.authenticateKnownReversePartials(state,{...f.options,readBytes:async name=>{const n=(counts.get(name)??0)+1;counts.set(name,n);if(name===f.protocol.worlds[1].path&&n===2)return Buffer.from('changed before publish');return f.readBytes(name);}}),/changed during authentication/);for(const w of state.fullWorlds)assert.equal(api.__testPartialGrant(state,w),false);
  await api.authenticateKnownReversePartials(state,f.options);await assert.rejects(api.authenticateKnownReversePartials(state,{...f.options,readBytes:undefined}));for(const w of state.fullWorlds)assert.equal(api.__testPartialGrant(state,w),false);
  // Slow earlier authentication cannot publish after a newer attempt revokes.
  let resume,entered;const enteredPromise=new Promise(r=>entered=r),pause=new Promise(r=>resume=r);let once=true;
  const pending=api.authenticateKnownReversePartials(state,{...f.options,readBytes:async name=>{if(once){once=false;entered();await pause;}return f.readBytes(name);}});const rejected=assert.rejects(pending,/superseded/);await enteredPromise;
  await assert.rejects(api.authenticateKnownReversePartials(state,{...f.options,readBytes:async()=>{throw Error('newer read failure');}}),/newer read failure/);resume();await rejected;for(const w of state.fullWorlds)assert.equal(api.__testPartialGrant(state,w),false);
  await api.authenticateKnownReversePartials(state,f.options);await assert.rejects(api.authenticateKnownReversePartials({...state},f.options),/v11-owned/);for(const w of state.fullWorlds)assert.equal(api.__testPartialGrant(state,w),false);
  checks.push({name:'atomic-final-reread-epoch-and-invalid-caller-revocation',passed:true,evidence:await save('atomic',{secondReadMutationRejected:true,missingReaderRevokes:true,earlierSlowAttemptCannotPublishAfterNewerFailure:true,sameBundleFakeStateRevokes:true,allGrantsRevokedTogether:true})});
  const baseline=make(),baselineAPI=await moduleFor(baseline,'legacy-only'),baselineState=await baselineAPI.consumePlanHistory(baseline.args),baselineAuth=await baselineAPI.authenticateKnownReversePartials(baselineState,{readBytes:baseline.readBytes});assert.equal(baselineAuth.authenticatedPartialRecords,6);assert.deepEqual(baselineAuth.protocolArchives,[]);
  const actualAPIState=await production.consumePlanHistory(make().args);let reads=0;await assert.rejects(production.authenticateKnownReversePartials(actualAPIState,{readBytes:async()=>{reads++;return Buffer.from('{}');},additionalClosedArchives:[],trustedProducerQualifications:[]}),/SHA mismatch/);assert.equal(reads,1);
  checks.push({name:'legacy-anchors-and-unmodified-admission-gates',passed:true,evidence:await save('legacy',{legacyOnlySyntheticCount:6,legacyThreeAnchorsUnchanged:true,productionCannotReplaceLegacyAnchors:true,allIdentityPartitionNearFailedParentAndMembersFunctionsExactPriorBytes:true,realArchiveAuthenticationPerformed:false})});
  await save('test-only-transformations',{substitutions,fixtureSource:'v9 fixture plus v10 make extracted into this separate metadata test; neither old runner invoked',physicalLevels:'Five original saved source200 packets reused byte-equivalent at the level field; only synthetic metadata wrappers and absent unpositioned inventory IDs differ',producerTrust:'Synthetic exact qualification descriptors are accepted only in test in-memory maps; production consumer supplies its fixed legacy and authenticated self descriptors',newRealWorlds:0});
  const closure=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const file of Object.keys(closure.metafile.inputs))toolBindings[file]=sha256(await read(file));await read(TEST);for(const[file,hash]of Object.entries(bindings))assert.equal(sha256(await fs.readFile(file)),hash);
  return{report:await save('report',{status:'PLAN_HISTORY_PROTOCOL_STAR_PARTIAL_AUTHENTICATION_METADATA_PASS',errors:[],checks,fileBindings:bindings,toolBindings,oldV10Unchanged:true,legacyAuthenticationPreserved:true,productionQualified:false,actualHistoryAuthenticationExecuted:false,newRealHistoryLoads:0,newRealHistoryMerges:0,newRealHistoryExports:0,newConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newLedgerClaims:0,limitations:['Synthetic metadata histories only; no actual checkpoint or delta consumed.','Producer trust list is the reviewed consumer authority boundary, not a context allow-list. Consumer must supply only fixed legacy qualification and its verified self qualification.','No new layout, original missing sixth object, model, route or mathematical proof was created.','Qualification of this tool does not authorize a new production input.']}),checks:checks.length};
 }catch(error){await save('failed-report',{status:'PLAN_HISTORY_PROTOCOL_STAR_PARTIAL_METADATA_FAIL',error:error.stack,checks,fileBindings:bindings});throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));
