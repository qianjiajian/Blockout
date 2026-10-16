import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import * as old from './plan-history-adapter-v9.mjs';
import * as production from './plan-history-adapter-v10.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';

const T='tools/daily-challenge/formal-v4/',V='deliverables/daily-formal-v4-20261008/',SELF=T+'plan-history-adapter-v10.mjs',TEST=T+'plan-history-adapter-v10.test.mjs';
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
  const source=(await read(SELF)).toString(),prior=(await read(T+'plan-history-adapter-v9.mjs')).toString();
  const marker='\n// v10 adds exactly FOUR',at=source.indexOf(marker);assert(at>0);
  const changes=[
   ['const authenticatedReversePartials=new WeakMap();','const authenticatedReversePartials=new WeakMap();\nconst reversePartialAuthenticationEpochs=new WeakMap();'],
   ['The ORIGINAL state must have been consumed/merged by v9.','The ORIGINAL state must have been consumed/merged by v10.'],
   ["export async function authenticateKnownReversePartials(state,{readBytes}){\n assert(immutableStates.has(state)&&sealedObjects.has(state.bundle),'Partial authentication requires a v9-owned immutable state');", "export async function authenticateKnownReversePartials(state,options={}){\n const authenticationBundle=state?.bundle,authenticationEpoch={};\n authenticatedReversePartials.delete(authenticationBundle);\n if(authenticationBundle&&typeof authenticationBundle==='object')reversePartialAuthenticationEpochs.set(authenticationBundle,authenticationEpoch);\n try{\n const readBytes=options?.readBytes;\n assert(immutableStates.has(state)&&sealedObjects.has(state.bundle),'Partial authentication requires a v10-owned immutable state');"],
   [' // Re-check current evidence before publishing any per-bundle authorization.', ' summaries.push(await collectKnownStarArchivalPartials(state,{raw,json,sameDescriptor,registered,claimedHashes,pending}));\n // Re-check current evidence before publishing any per-bundle authorization.'],
   [' authenticatedReversePartials.set(b,pending);', " assert.equal(reversePartialAuthenticationEpochs.get(b),authenticationEpoch,'Partial authentication was superseded');\n authenticatedReversePartials.set(b,pending);"],
   ['newReplayCalls:0,newLedgerClaims:0};\n}', 'newReplayCalls:0,newLedgerClaims:0};\n }catch(error){authenticatedReversePartials.delete(authenticationBundle);throw error;}\n}'],
  ];
  let restored=source.slice(0,at);for(const [before,after]of [...changes].reverse()){assert.equal(restored.split(after).length,2);restored=restored.replace(after,before);}assert.equal(restored,prior);
  checks.push({name:'exact-reversible-v9-diff-and-unchanged-freshness-merge-validation',passed:true,evidence:await save('source-diff',{oldSha256:sha256(prior),newSha256:sha256(source),changes,appended:source.slice(at),allPriorAuthenticationBodyChecksPreserved:true,allFreshnessGatesByteIdentical:true})});

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
  const f=make(),api=await moduleFor(f,'positive'),state=await api.consumePlanHistory(f.args),before=JSON.stringify(state),auth=await api.authenticateKnownReversePartials(state,{readBytes:f.readBytes});assert.equal(auth.authenticatedPartialRecords,6);assert.equal(auth.archives.length,3);assert.equal(auth.archives[2].authenticatedPartialRecords,4);assert.equal(auth.archives[2].completeFormedWorldArchivalVerified,false);assert.equal(JSON.stringify(state),before);
  for(const w of f.starRows)assert(api.__testPartialGrant(state,w));const alias={...f.starRows[0],descriptor:{...f.starRows[0].descriptor,path:f.starRows[0].descriptor.path.replaceAll('/','\\').toUpperCase()}};assert(api.__testPartialGrant(state,alias));assert(api.__testPartialGrant({...state,fullWorlds:[...state.fullWorlds]},f.starRows[0]));
  const empty={descriptor:f.worlds[0],field:'emptyConstructionWorld',level:packet0[0].emptyConstructionWorld};assert.equal(api.__testPartialGrant(state,empty),false);assert.equal(api.__testPartialGrant(state,{...f.starRows[0],descriptor:{...f.worlds[0],path:f.dir+'/missing-sixth.json'}}),false);assert.equal(api.__testPartialGrant(state,{...f.starRows[0],field:'templateLevel'}),false);
  const cloned=copy(state);assert.equal(api.__testPartialGrant(cloned,f.starRows[0]),false);await assert.rejects(api.authenticateKnownReversePartials(cloned,{readBytes:f.readBytes}),/v10-owned/);
  const separatelyConsumed=await api.consumePlanHistory(f.args);assert.equal(api.__testPartialGrant(separatelyConsumed,f.starRows[0]),false);
  const metadataOwner={version:'plan-history-owner-v1',id:'synthetic-empty-merge',namespace:f.namespace,kind:'construction',files:[],attemptIds:[],closedCampaigns:[]},ownerD=f.doc(f.dir+'/empty-owner.json',metadataOwner),declaredOwner={id:metadataOwner.id,namespace:metadataOwner.namespace,kind:metadataOwner.kind,definition:ownerD},delta=f.doc(f.dir+'/empty-delta.json',{version:api.PLAN_HISTORY_VERSION,parentHeadSha256:state.headSha256,owner:declaredOwner,files:[],terminalRecords:[],fullWorlds:[],closedCampaigns:[]});
  const listing=Object.fromEntries(f.b.scope.roots.map(r=>[r.id,f.b.files.filter(x=>x.rootId===r.id).map(x=>x.path)]));const merged=await api.mergePlanHistoryDelta(state,{descriptor:delta,declaredOwner,listing,readBytes:f.readBytes});assert.equal(api.__testPartialGrant(merged,f.starRows[0]),false);
  await assert.rejects(api.authenticateKnownReversePartials(state,{readBytes:async()=>{throw Error('read failed');}}),/read failed/);assert.equal(api.__testPartialGrant(state,f.starRows[0]),false);for(const w of state.fullWorlds)assert.equal(api.__testPartialGrant(state,w),false);
  checks.push({name:'four-only-scope-alias-clone-merge-and-all-grant-revocation',passed:true,evidence:await save('positive-scope',{syntheticOldPartialCount:2,starPartialCount:4,total:6,archives:3,emptyAndMissingAndWrongFieldExcluded:true,sameBundleViewAndCanonicalAliasWork:true,clonedAndNewlyConsumedAndMergedBundlesUnauthorized:true,failedRereadRevokesBothOldAndNewGrants:true,originalFailureNotReclassified:true,bundleUnchanged:true})});
  const refusals=[];for(const mode of ['wrong-sha','missing-member','wrong-field','full-flag','public-claim','claimed-candidate','wrong-closure','wrong-reference']){const f=make(mode),a=await moduleFor(f,mode),s=await a.consumePlanHistory(f.args);let reason=null;try{await a.authenticateKnownReversePartials(s,{readBytes:f.readBytes});}catch(e){reason=e.message;}assert(reason,mode);for(const w of s.fullWorlds)assert.equal(a.__testPartialGrant(s,w),false);refusals.push({mode,reason});}
  checks.push({name:'eight-original-record-integrity-and-scope-refusals',passed:true,evidence:await save('refusals',{refusals})});
  const f2=make(),a2=await moduleFor(f2,'second-read-failure'),s2=await a2.consumePlanHistory(f2.args),counts=new Map();await assert.rejects(a2.authenticateKnownReversePartials(s2,{readBytes:async name=>{const n=(counts.get(name)??0)+1;counts.set(name,n);if(name===f2.worlds[1].path&&n===2)return Buffer.from('changed on final read');return f2.readBytes(name);}}),/changed during authentication/);for(const w of s2.fullWorlds)assert.equal(a2.__testPartialGrant(s2,w),false);
  checks.push({name:'no-grant-until-final-byte-reread',passed:true,evidence:await save('atomic-publication',{secondReadChanged:true,allGrantsAbsent:true})});
  const rawState=await production.consumePlanHistory(make().args);let reads=0;await assert.rejects(production.authenticateKnownReversePartials(rawState,{readBytes:async()=>{reads++;return Buffer.from('{}');}}),/SHA mismatch/);assert.equal(reads,1);
  checks.push({name:'production-trust-anchors-not-configurable',passed:true,evidence:await save('hard-anchor',{firstBadBytesRejected:true,productionAnchorOverrides:false,actualHistoryAuthenticated:false})});
  await save('test-only-transformations',{substitutions,sourceFactory:'Original v9 fixture() exported only in a separate test bundle; original runner not called.',existingStarGeometries:'Five already saved packets only; no replacement world created.',productionSourceUnchanged:true});
  const closure=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const file of Object.keys(closure.metafile.inputs))toolBindings[file]=sha256(await read(file));await read(TEST);for(const[file,hash]of Object.entries(bindings))assert.equal(sha256(await fs.readFile(file)),hash);
  const report={status:'PLAN_HISTORY_STAR_ARCHIVAL_PARTIAL_AUTHENTICATION_METADATA_PASS',errors:[],checks,fileBindings:bindings,toolBindings,oldV9Unchanged:true,schemaChanged:false,productionQualified:false,actualArchiveAuthenticationExecuted:false,newRealHistoryLoads:0,newRealHistoryMerges:0,newRealHistoryExports:0,newConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newLedgerClaims:0,limitations:['Only synthetic metadata states were consumed/merged through an in-memory byte map. No actual checkpoint/delta was read.','Separate test bundles replace three immutable trust anchors and expose a read-only private grant query; production has neither test API nor caller-configurable anchor.','Star partial geometries are the five unchanged original packets; no full, sixth missing object, route or new physical layout is constructed.','Future production must independently consume and verify the administrative history before this module authenticates its four exact records.']};return{report:await save('report',report),checks:checks.length};
 }catch(error){await save('failed-report',{status:'PLAN_HISTORY_STAR_PARTIAL_METADATA_FAIL',error:error.stack,checks,fileBindings:bindings});throw error;}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))console.log(JSON.stringify(await run(process.argv[2])));
