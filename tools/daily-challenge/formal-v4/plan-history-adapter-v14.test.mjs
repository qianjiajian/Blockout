import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import * as old from './plan-history-adapter-v13.mjs';
import * as production from './plan-history-adapter-v14.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';

const T='tools/daily-challenge/formal-v4/',V='deliverables/daily-formal-v4-20261008/',SELF=T+'plan-history-adapter-v14.mjs',TEST=T+'plan-history-adapter-v14.test.mjs';
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
  const source=(await read(SELF)).toString(),prior=(await read(T+'plan-history-adapter-v13.mjs')).toString();
  // First author attempt stopped at exact-diff validation before any fixture
  // or synthetic history was created: its old mapping literal was accidentally
  // copied as the new mapping. Preserve that failure and exact executed test.
  await read(V+'proof/plan-history-star-producer7-protocol-private-01/failed-report.json');
  await read(V+'proof/plan-history-star-producer7-protocol-private-01/test-executed.mjs','64f5cecba1bebc60e4fb7d01c1f416c6baf72f27ee707ebc3935d78e0ba57a87');
  const changes=[["consumed/merged by v13.","consumed/merged by v14."],["requires a v13-owned immutable state","requires a v14-owned immutable state"],["known-suffix-owned-task-v(4|5|6)$","known-suffix-owned-task-v(4|5|6|7)$"],["adapterNumber={4:10,5:12,6:13}[number]","adapterNumber={4:10,5:12,6:13,7:14}[number]"],["maxTransitions:number===6?30000000:10000000","maxTransitions:(number===6||number===7)?30000000:10000000"],["maxMilliseconds:number===6?45000:30000","maxMilliseconds:(number===6||number===7)?45000:30000"]];
  let restored=source;for(const[a,b]of [...changes].reverse()){assert.equal(restored.split(b).length,2);restored=restored.replace(b,a);}assert.equal(restored,prior);let forward=prior;for(const[a,b]of changes){assert.equal(forward.split(a).length,2);forward=forward.replace(a,b);}assert.equal(forward,source);
  checks.push({name:'six-exact-reversible-source-substitutions',passed:true,evidence:await save('source-diff',{old:{path:T+'plan-history-adapter-v13.mjs',sha256:sha256(prior)},next:{path:SELF,sha256:sha256(source)},changes,forwardAndInverseExact:true,allOtherProductionBytesUnchanged:true,lowerKernelChanged:false,completeWorldCapUnchanged:10000})});
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
 function addProtocol(f,mode='valid',producer=7){
  const b=f.b,canonical=compileCanonicalHistoryPath(b.scope).canonical,dir='C:/v11-synthetic-only/protocol',experimentId='synthetic-protocol-closed',namespace=canonical(b.scope.roots[1].physicalPath);
  const doc=f.doc,file=(name,value)=>{const d=doc(name,value);b.files.push({...d,aliases:[d.path],rootId:b.scope.roots.find(r=>canonical(d.path).startsWith(canonical(r.physicalPath)+'/'))?.id??null});b.archivedBindings[d.path]=d.sha256;return d;};
  const version='single-star-double-exit-known-suffix-owned-task-v'+producer,taskPath=T+'reverse-star-suffix-task-v'+producer+'.mjs',factoryPath=T+'reverse-star-suffix-factory-v'+(producer+1)+'.mjs',adapterPath=T+'plan-history-adapter-v'+({4:10,5:12,6:13,7:14}[producer]??99)+'.mjs';
  // Only metadata wrappers change. All five physical levels remain exact old
  // saved objects. Four unpositioned, absent inventory IDs are disambiguated.
  const recipeCore=copy(p0.recipe);delete recipeCore.recipeSha256;recipeCore.version='star-double-exit-known-suffix-new-prefix-first-full-reverse-v'+(producer+1);recipeCore.budget={maxStates:10000,maxTransitions:(producer===6||producer===7)?30000000:10000000,maxMicroStates:3000000,maxMilliseconds:(producer===6||producer===7)?45000:30000};if(mode==='raw-too-high')recipeCore.budget.maxStates++;if(mode==='micro-too-high')recipeCore.budget.maxMicroStates++;if(mode==='trans-too-high')recipeCore.budget.maxTransitions++;if(mode==='time-too-high')recipeCore.budget.maxMilliseconds++;if(mode==='wrong-producer-budget')Object.assign(recipeCore.budget,(producer===6||producer===7)?{maxTransitions:10000000,maxMilliseconds:30000}:{maxTransitions:30000000,maxMilliseconds:45000});recipeCore.qualificationFixture=null;recipeCore.assetBindings={};
  const oldIds=new Set(recipeCore.board.gates.map(g=>g.id));for(const atom of recipeCore.inventory)if(oldIds.has(atom.id))atom.id='synthetic-unpositioned-'+atom.id;
  const ids=recipeCore.inventory.map(x=>x.id);recipeCore.insertionOrder=[...ids];recipeCore.parkingBodyIds=[...ids];recipeCore.recipeId='synthetic-protocol-stock';
  const recipe={...recipeCore,recipeSha256:levelSha256(recipeCore)},reference=doc(dir+'/reference.json',{unchangedPhysicalReference:true});
  const stock={recipeId:recipe.recipeId,sourceLevelId:200,targetDifficulty:1,inventory:recipe.inventory.map(({x,y,...atom})=>atom),gates:copy(recipe.board.gates),insertionOrder:ids,parkingBodyIds:ids,blueprint:{reference,cutAfterDrag:34}};
  const declaration=doc(dir+'/stock.json',{sourceReference:reference,recipes:[stock]});
  const task=doc(taskPath,{testOnlyQualifiedTaskMetadata:true}),factory=doc(factoryPath,{testOnlyQualifiedFactoryMetadata:true}),adapter=doc(mode==='wrong-adapter'?T+'plan-history-adapter-v99.mjs':adapterPath,{testOnlyQualifiedAdapterMetadata:true}),tools={[task.path]:task.sha256,[factory.path]:factory.sha256,...(mode==='missing-adapter'?{}:{[adapter.path]:adapter.sha256})};
  const qualification=doc(dir+'/qualification.json',{status:'INDEPENDENT_REVERSE_STAR_SUFFIX_TASK_V'+producer+'_PASS',closedProductionScopeReviewed:true,errors:[],newRealConstructions:0,newSearches:0,publicClaimsStarted:0,toolBindings:tools});
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
  function externalCandidate(x){const done=JSON.parse(x.bytes.get(x.protocol.completion.path)),receipt=done.receipt;x.b.files=x.b.files.filter(d=>d.path!==receipt.path);delete x.b.archivedBindings[receipt.path];return receipt;}
  function reseal(x){const checkpoint=x.doc('C:/v14-synthetic-only/checkpoint.json',x.b),review=x.doc('C:/v14-synthetic-only/review.json',{status:old.PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:old.planHistorySummary(x.b),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});x.args={checkpoint,review,expectedScope:x.b.scope,readBytes:x.readBytes};}
  const positives=[];let chosen;
  for(const producer of [4,5,6,7]){
   const f=addProtocol(make(),'valid',producer),receipt=externalCandidate(f);reseal(f);const api=await moduleFor(f,'producer-'+producer),state=await api.consumePlanHistory(f.args),before=JSON.stringify(state),auth=await api.authenticateKnownReversePartials(state,f.options);assert.equal(auth.authenticatedPartialRecords,10);assert.equal(auth.protocolArchives[0].authenticatedPartialRecords,4);assert.deepEqual(auth.protocolArchives,auth.archives.slice(3));assert.equal(auth.fileBindings[receipt.path],receipt.sha256);assert(!state.bundle.files.some(d=>d.path===receipt.path));assert.equal(JSON.stringify(state),before);for(const row of f.protocol.rows)assert(api.__testPartialGrant(state,row));
   const p=JSON.parse(f.bytes.get(f.protocol.plan.path));positives.push({producer,adapter:{4:10,5:12,6:13,7:14}[producer],budget:p.recipe.budget,authenticatedProtocolPartials:4,externalReceiptExactClosureBound:true,historyUnchanged:true});if(producer===7)chosen={f,receipt,api,state};
  }
  checks.push({name:'exact-task4-task5-task6-task7-adapter-and-budget-profiles',passed:true,evidence:await save('positive',{positives,syntheticLegacyCount:6,syntheticTotalCount:10,actualLegacyScope:'original 10162 plus administrative four remains unchanged, not consumed here',newWorlds:0})});
  const profileRefusals=[];
  for(const[mode,producer]of [['unknown-producer',7],['valid',8],['untrusted',7],['wrong-tool-binding',7],['missing-adapter',7],['wrong-adapter',7],['raw-too-high',7],['micro-too-high',7],['trans-too-high',7],['time-too-high',7],['wrong-producer-budget',4],['wrong-producer-budget',5],['wrong-producer-budget',6],['wrong-producer-budget',7],['wrong-adapter',6]]){
   const x=addProtocol(make(),mode,producer);externalCandidate(x);reseal(x);const a=await moduleFor(x,mode+'-'+producer);let reason,st;try{st=await a.consumePlanHistory(x.args);await a.authenticateKnownReversePartials(st,x.options);}catch(e){reason=e.message;}assert(reason,mode+'-'+producer);if(st)for(const row of st.fullWorlds)assert.equal(a.__testPartialGrant(st,row),false);profileRefusals.push({mode,producer,reason});
  }
  checks.push({name:'unknown-untrusted-mismatched-adapter-and-budget-refusals',passed:true,evidence:await save('profile-refusals',{refusals:profileRefusals,noArbitraryProducerPassString:true,raw10000AndMicro3000000Exact:true,oldProducerBudgetNotRaised:true})});
  const archiveRefusals=[];
  for(const mode of ['full','claimed-candidate','static-failed','missing-member','wrong-field','owner-omission','different-candidate','math-owner-extra-file','candidate-bytes-change']){
   const x=addProtocol(make(),mode),receipt=externalCandidate(x),done=JSON.parse(x.bytes.get(x.protocol.completion.path));
   if(mode==='different-candidate'){const candidate=JSON.parse(x.bytes.get(receipt.path));done.receipt=x.doc('C:/v14-synthetic-only/unbound-other-candidate.json',{...candidate,untrustedReplacement:true});const cd=x.doc(x.protocol.completion.path,done);x.options.additionalClosedArchives[0].completion=cd;x.protocol.completion=cd;}
   if(mode==='math-owner-extra-file'){const owner=JSON.parse(x.bytes.get(done.mathOwner.path));owner.files.push(x.protocol.worlds[1]);done.mathOwner=x.doc(done.mathOwner.path,owner);const cd=x.doc(x.protocol.completion.path,done);x.options.additionalClosedArchives[0].completion=cd;x.protocol.completion=cd;}
   reseal(x);if(mode==='candidate-bytes-change')x.bytes.set(receipt.path,Buffer.from('changed original candidate bytes'));const a=await moduleFor(x,mode);let reason,st;try{st=await a.consumePlanHistory(x.args);await a.authenticateKnownReversePartials(st,x.options);}catch(e){reason=e.message;}assert(reason,mode);if(st)for(const row of st.fullWorlds)assert.equal(a.__testPartialGrant(st,row),false);archiveRefusals.push({mode,reason});
  }
  checks.push({name:'complete-world-claim-and-original-archive-boundaries-preserved',passed:true,evidence:await save('archive-refusals',{refusals:archiveRefusals,onlyOriginalNonemptyLevelFieldsEligible:true,emptyAndUnarchivedSixthNeverGranted:true,noNewArchivalFailureException:true})});
  const {f,receipt,api,state}=chosen,row=f.protocol.rows[0];assert.equal(api.__testPartialGrant(state,{...row,field:'templateLevel'}),false);assert.equal(api.__testPartialGrant(state,{descriptor:f.protocol.worlds[0],field:'emptyConstructionWorld',level:packet0[0].emptyConstructionWorld}),false);assert.equal(api.__testPartialGrant(copy(state),row),false);const newlyConsumed=await api.consumePlanHistory(f.args);assert.equal(api.__testPartialGrant(newlyConsumed,row),false);
  const seen=new Map();await assert.rejects(api.authenticateKnownReversePartials(state,{...f.options,readBytes:async name=>{const n=(seen.get(name)??0)+1;seen.set(name,n);if(name===receipt.path&&n===2)return Buffer.from('external original changed at final reread');return f.readBytes(name);}}),/changed during authentication/);for(const w of state.fullWorlds)assert.equal(api.__testPartialGrant(state,w),false);
  await api.authenticateKnownReversePartials(state,f.options);let resume,entered;const enteredPromise=new Promise(r=>entered=r),pause=new Promise(r=>resume=r);let once=true;const pending=api.authenticateKnownReversePartials(state,{...f.options,readBytes:async name=>{if(once){once=false;entered();await pause;}return f.readBytes(name);}}),reject=assert.rejects(pending,/superseded/);await enteredPromise;await assert.rejects(api.authenticateKnownReversePartials(state,{...f.options,readBytes:async()=>{throw Error('newer read failure');}}),/newer read failure/);resume();await reject;for(const w of state.fullWorlds)assert.equal(api.__testPartialGrant(state,w),false);
  const priorEvidence={path:V+'proof/plan-history-star-producer6-protocol-private-01/report.json',sha256:'aaefbe56102693afde06a0667ef4d479c9bfef4df096cc55ab9f8f868b105611'},priorReport=await json(priorEvidence);assert.equal(priorReport.fileBindings[T+'plan-history-adapter-v13.mjs'],sha256(prior));
  checks.push({name:'final-reread-epoch-revocation-and-bundle-grant-isolation',passed:true,evidence:await save('atomic',{externalCandidateSecondReadMandatory:true,olderSlowAttemptCannotPublishAfterNewerFailure:true,allGrantsRevokedTogether:true,cloneAndNewConsumeDoNotInherit:true,wrongFieldAndEmptyExcluded:true,legacyAndMergeImplementationByteIdentical:true,priorEvidence,priorTestsNotRerun:true})});
  await save('test-only-transformations',{substitutions,fixtureSource:'Prior v13 synthetic metadata wrapper builders reused; old test runner not invoked',physicalLevels:'Five saved old partial packets read without model or replay; no new physical placements',syntheticQualificationOnly:true,productionTrust:'Reviewed consumer fixed q4/q5/q6 plus verified current q7; no arbitrary context trust list',actualProducer7ArchiveExistsOrValidated:false,newRealWorlds:0});
  const closure=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const file of Object.keys(closure.metafile.inputs))toolBindings[file]=sha256(await read(file));await read(TEST);for(const[file,hash]of Object.entries(bindings))assert.equal(sha256(await fs.readFile(file)),hash);
  return{report:await save('report',{status:'PLAN_HISTORY_STAR_PRODUCER7_PROTOCOL_METADATA_PASS',errors:[],checks,fileBindings:bindings,toolBindings,priorEvidence,priorTestsNotRerun:true,oldV13Unchanged:true,productionQualified:false,actualHistoryAuthenticationExecuted:false,newRealHistoryLoads:0,newRealHistoryMerges:0,newRealHistoryExports:0,newConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newLedgerClaims:0,limitations:['Only synthetic metadata histories were consumed; no actual checkpoint/delta or live original campaign authenticated.','Only producer6/7 constructor/upper profiles are 30m transitions and 45s. All producers retain raw10000/micro3m; adapter never executes lower or changes its budget.','Source200/D1, original sealed external no-claim candidate, full/claim refusal and legacy archive distinctions remain unchanged.','No production task7 qualification or archive is fabricated; tests use explicitly synthetic tool bytes in an isolated test module.']}),checks:checks.length};
 }catch(error){await save('failed-report',{status:'PLAN_HISTORY_STAR_PRODUCER7_PROTOCOL_METADATA_FAIL',error:error.stack,checks,fileBindings:bindings});throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));
