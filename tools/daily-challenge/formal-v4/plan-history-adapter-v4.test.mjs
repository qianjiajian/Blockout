import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import * as prior from './plan-history-adapter-v3.mjs';
import * as next from './plan-history-adapter-v4.mjs';
const {PLAN_HISTORY_VERSION,PLAN_HISTORY_REVIEW_STATUS,planHistorySummary}=next;
const pairedAsync=name=>async(...args)=>{const [a,b]=await Promise.allSettled([prior[name](...args),next[name](...args)]);assert.equal(a.status,b.status,name);if(a.status==='rejected'){assert.equal(a.reason.name,b.reason.name,name);assert.equal(a.reason.message,b.reason.message,name);throw b.reason;}assert.deepEqual(a.value,b.value,name);return b.value;};
const consumePlanHistory=pairedAsync('consumePlanHistory'),readDirectHistoryRole=pairedAsync('readDirectHistoryRole'),mergePlanHistoryDelta=pairedAsync('mergePlanHistoryDelta');
const assertFreshPlanHistoryInput=(...args)=>{const outcomes=[prior,next].map(api=>{try{return{value:api.assertFreshPlanHistoryInput(...args)};}catch(e){return{error:e.name,message:e.message};}});assert.deepEqual(outcomes[0],outcomes[1]);if(outcomes[1].error)throw new Error(outcomes[1].message);return outcomes[1].value;};
import {consumePlanHistory as oldConsume} from './plan-history-adapter-v2.mjs';
const out=process.env.PLAN_HISTORY_V4_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});let passed=false,diffPassed=false;
test('exact legacy private previous-accepted edge only; current-step validation, permanent deny, strict future delta',async()=>{
 const bytes=new Map(),scope={baseDirectory:'C:/snapshot',roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix'].map(id=>({id,physicalPath:'C:/shared/'+id,aliases:[]}))};
 const b={version:PLAN_HISTORY_VERSION,scope,baselinePlan:{path:'plan.json',sha256:sha256('p')},baselineActual:{path:'actual.json',sha256:sha256('a')},publicNamespace:'c:/shared/public',files:[],archivedBindings:{},publicStocks:[],nearPools:{selected:[],old450:[],history:[]},terminalRecords:[],externalPrivate:[],retired:[],legacyReferences:[],closedCampaigns:[],closedExperimentIds:[],oldLiveByteIntegrityClaimed:false};
 const doc=(p,q)=>{const raw=Buffer.from(JSON.stringify(q));bytes.set(p,raw);return{path:p,sha256:sha256(raw)};};
 const put=(p,q)=>{const d=doc(p,q),rootId=scope.roots.find(r=>p.startsWith(r.physicalPath.toLowerCase()+'/'))?.id??null;b.files.push({...d,rootId,aliases:[p]});b.archivedBindings[p]=d.sha256;return d;};
 const board=n=>({id:10,width:2+n,height:1,gates:[],blocks:[{id:'a',x:0,y:0,shape:Array.from({length:1+n},(_,i)=>[i,0]),color:['red','green','purple','yellow'][n]},{id:'b',x:1+n,y:0,shape:[[0,0]],color:'blue'}]});
 const add=(name,n,namespace,accepted,parent=null,legacy=false)=>{
  const level=board(n),f=sealedWorldIdentity(level),request={id:name,levelSha256:f.levelSha256,shapeSha256:f.shapeSha256,colorSha256:f.colorSha256,designSha256:f.designSha256,colorAssignments:f.colorAssignments,redesignOf:parent};
  const result={accepted,status:accepted?'PLAIN_EXACT_BAND_EVIDENCE':'relaxed-shortcut',levelSha256:f.levelSha256},packet={accepted,level,proof:{attempt:request}};
  const pd=put('C:/legacy/'+name+'.json',packet),r={namespace,kind:'mathematical',request:{descriptor:put(namespace+'/'+name+'.request.json',request),value:request},result:{descriptor:put(namespace+'/'+name+'.result.json',result),value:result},blocked:[],lock:null};
  if(!accepted){if(legacy)r.legacyPrivateResultFailure={baselineOnly:true,packet:{descriptor:pd,value:packet},missingBlockedFiles:[namespace+'/'+name+'.blocked.json',namespace+'/identities/'+f.retryIdentitySha256+'.blocked.json']};
   else for(const p of [namespace+'/'+name+'.blocked.json',namespace+'/identities/'+f.retryIdentitySha256+'.blocked.json']){const value={attemptId:name};r.blocked.push({descriptor:put(p,value),value});}}
  b.terminalRecords.push(r);b.nearPools.history.push({descriptor:pd,level,sourceLevelId:10,reference:null});
  if(namespace===b.publicNamespace)b.publicStocks.push({...request,...r.request.descriptor});else b.externalPrivate.push({namespace,id:name,redesignOf:parent,accepted,packet:pd,request:r.request.descriptor,result:r.result.descriptor});return{r,pd,level};
 };
 const ns='c:/legacy/private',parent=add('accepted-parent',0,ns,true),child=add('failed-child',1,ns,false,parent.r.request.value.id,true),grandparent=add('accepted-grandparent',2,ns,true),publicParent=add('public-accepted',2,b.publicNamespace,true),publicFailed=add('public-failed',0,b.publicNamespace,false);
 b.baselineFields={publicStocks:structuredClone(b.publicStocks),previousLateStocks:[],previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:[]};
 const readBytes=async p=>{assert(bytes.has(p));return bytes.get(p);};
 const args=q=>{const checkpoint=doc('checkpoint.json',q),review=doc('review.json',{status:PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:planHistorySummary(q),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});return{checkpoint,review,expectedScope:scope,readBytes};};
 await assert.rejects(oldConsume(args(b)),/Missing or nonfailed parent/);
 const state=await consumePlanHistory(args(b));assert.deepEqual(state.bundle.terminalRecords,b.terminalRecords);assert.equal(state.bundle.version,PLAN_HISTORY_VERSION);
 assert.equal(state.projectionSha256Recomputed,false);assert.equal(state.completeCheckpointBytesAuthenticated,true);assert.equal(state.reviewedProjectionSha256,planHistorySummary(b).projectionSha256);
 const wrongHash=args(b);wrongHash.checkpoint={...wrongHash.checkpoint,sha256:sha256('wrong-checkpoint')};await assert.rejects(consumePlanHistory(wrongHash),/Descriptor bytes differ/);
 const wrongReview=args(b),reviewValue=JSON.parse(bytes.get(wrongReview.review.path));reviewValue.checkpoint={...wrongReview.checkpoint,sha256:sha256('other-checkpoint')};wrongReview.review=doc('wrong-review.json',reviewValue);await assert.rejects(consumePlanHistory(wrongReview));
 const wrongCount=args(b),countValue=JSON.parse(bytes.get(wrongCount.review.path));countValue.summary.publicStocks++;wrongCount.review=doc('wrong-count.json',countValue);await assert.rejects(consumePlanHistory(wrongCount));
 assert.throws(()=>assertFreshPlanHistoryInput(state,child.level),/Existing cross-namespace/);
 for(const role of ['reference','failed-parent'])await assert.rejects(readDirectHistoryRole(state,{namespace:ns,attemptId:'failed-child',receipt:child.pd,role,readBytes}),/Legacy private failure cannot/);
 const reject=async mutate=>{const q=structuredClone(b);mutate(q);await assert.rejects(consumePlanHistory(args(q)));};
 await reject(q=>{q.externalPrivate=q.externalPrivate.filter(x=>x.id!=='accepted-parent');});
 await reject(q=>{q.externalPrivate.find(x=>x.id==='accepted-parent').request.sha256=sha256('wrong');});
 await reject(q=>{q.terminalRecords[0].result=null;});
 // The initial failed child's legacy marker must not authorize the next edge.
 const badAncestor=structuredClone(b);badAncestor.terminalRecords[0].request.value.redesignOf=grandparent.r.request.value.id;
 await assert.rejects(consumePlanHistory(args(badAncestor)),/Missing or nonfailed parent/);
 await reject(q=>{q.terminalRecords[0].request.value.redesignOf='failed-child';});
 // A genuinely new public delta cannot use an accepted parent even with valid raw files.
 const starts={files:b.files.length,worlds:b.nearPools.history.length},fresh=add('new-public',3,b.publicNamespace,false,'public-accepted',false);
 const newFiles=b.files.slice(starts.files),owner={id:'future-math',namespace:b.publicNamespace,kind:'mathematical'};
 owner.definition=doc('owner.json',{version:'plan-history-owner-v1',...owner,files:newFiles.map(({path,sha256})=>({path,sha256})),attemptIds:['new-public'],closedCampaigns:[]});
 const d={version:PLAN_HISTORY_VERSION,parentHeadSha256:state.headSha256,owner,files:newFiles,terminalRecords:[fresh.r],fullWorlds:b.nearPools.history.slice(starts.worlds).map(w=>({...w,field:'level'})),closedCampaigns:[]};
 const listing=Object.fromEntries(scope.roots.map(root=>[root.id,[...state.bundle.files,...newFiles].filter(f=>f.rootId===root.id).map(f=>f.path)]));
 await assert.rejects(mergePlanHistoryDelta(state,{descriptor:doc('delta.json',d),declaredOwner:owner,listing,readBytes}),/Missing or nonfailed parent/);
 // A fresh, correctly sealed public child of a failed parent merges identically.
 const startFiles=b.files.length,startWorlds=b.nearPools.history.length,good=add('new-good-public',3,b.publicNamespace,false,'public-failed',false),goodFiles=b.files.slice(startFiles);
 const goodOwner={id:'good-future-math',namespace:b.publicNamespace,kind:'mathematical'};
 goodOwner.definition=doc('good-owner.json',{version:'plan-history-owner-v1',...goodOwner,files:goodFiles.map(({path,sha256})=>({path,sha256})),attemptIds:['new-good-public'],closedCampaigns:[]});
 const goodDelta={version:PLAN_HISTORY_VERSION,parentHeadSha256:state.headSha256,owner:goodOwner,files:goodFiles,terminalRecords:[good.r],fullWorlds:b.nearPools.history.slice(startWorlds).map(w=>({...w,field:'level'})),closedCampaigns:[]};
 const goodListing=Object.fromEntries(scope.roots.map(root=>[root.id,[...state.bundle.files,...goodFiles].filter(f=>f.rootId===root.id).map(f=>f.path)]));
 const merged=await mergePlanHistoryDelta(state,{descriptor:doc('good-delta.json',goodDelta),declaredOwner:goodOwner,listing:goodListing,readBytes});assert.equal(merged.publicStocks.length,state.publicStocks.length+1);assert.equal(merged.bundle.terminalRecords.at(-1).result.value.accepted,false);
 passed=true;
});
test('entire implementation differs from frozen v3 only by compiled lookup and validation invalidation',async()=>{
 let expected=await fs.readFile('tools/daily-challenge/formal-v4/plan-history-adapter-v3.mjs','utf8');
 assert.equal(sha256(expected),'a1894d9b6540a5c7dad441d3a09bd309eae8f39e263a3acae0c01b0f5fe7cf57');
 expected=expected.replace("import {canonicalHistoryPath,sha256,sealedWorldIdentity,changedHistoryShapeAndColour} from './sealed-history-contract.mjs';","import {sha256,sealedWorldIdentity,changedHistoryShapeAndColour} from './sealed-history-contract.mjs';\nimport {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';")
  .replace('// Consumer v3:','// Consumer v4 (compiled path lookup only):')
  .replace('const canonical=(b,p)=>canonicalHistoryPath(p,b.scope);','// Scope is fixed within a validated operation. Replacement selects a new\n// immutable compiler; validate always clears it before checking mutable data.\nconst canonicalCompilers=new WeakMap();\nconst canonical=(b,p)=>{let entry=canonicalCompilers.get(b);if(!entry||entry.scope!==b.scope){entry={scope:b.scope,compiler:compileCanonicalHistoryPath(b.scope)};canonicalCompilers.set(b,entry);}return entry.compiler.canonical(p);};')
  .replace('function validate(b,expectedScope){\n fileIndexes.delete(b);','function validate(b,expectedScope){\n canonicalCompilers.delete(b);\n fileIndexes.delete(b);');
 assert.equal(await fs.readFile('tools/daily-challenge/formal-v4/plan-history-adapter-v4.mjs','utf8'),expected);diffPassed=true;
});
test.after(async()=>{const fileBindings={};for(const p of ['tools/daily-challenge/formal-v4/plan-history-adapter-v4.mjs','tools/daily-challenge/formal-v4/plan-history-adapter-v4.test.mjs','tools/daily-challenge/formal-v4/plan-history-adapter-v3.mjs','tools/daily-challenge/formal-v4/plan-history-adapter-v3.test.mjs','tools/daily-challenge/formal-v4/canonical-history-path-compiled.mjs','tools/daily-challenge/formal-v4/sealed-history-contract.mjs'])fileBindings[p]=sha256(await fs.readFile(p));
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:passed&&diffPassed?'PLAN_HISTORY_ADAPTER_V4_COMPILED_EQUIVALENCE_PASS':'INCOMPLETE',tests:2,pairedSmallObjectBehaviorPassed:passed,exactDeclaredDiffPassed:diffPassed,errors:[],fileBindings,
  priorQualification:{path:'deliverables/daily-formal-v4-20261008/proof/plan-history-adapter-v3-private-03/report.json',sha256:'c6089da531710dee9ec303e9a050ee1510c86483d5090fc15c19ecd51391dc90'},
  compiledPathIndependent:{path:'deliverables/daily-formal-v4-20261008/proof/canonical-history-path-compiled-independent-01/report.json',sha256:'2379dd22c16fd64c12fcf9154e392b1a7355f945f0e5feaa7d5d25720afd9be6'},
  checkpointSchemaChanged:false,newSearches:0,newConstructions:0,newLedgerClaims:0,newRealHistoryExports:0,newRealHistoryScans:0,largeCheckpointRead:false,privateSyntheticDataOnly:true,oldLiveByteIntegrityClaimed:false,
  limitations:['Scope path fields must remain fixed inside an operation. Every validate clears its compiler; replacing scope creates a new compiler.','No existing consumer, current batch, v3 file or qualification was changed. Integration awaits separate review.']},null,2)+'\n',{flag:'wx'});});
