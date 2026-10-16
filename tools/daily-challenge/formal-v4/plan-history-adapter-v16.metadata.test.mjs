import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import * as previous from './plan-history-adapter-v15.mjs';
import * as next from './plan-history-adapter-v16.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
const T='tools/daily-challenge/formal-v4/',V='deliverables/daily-formal-v4-20261008',OLD=T+'plan-history-adapter-v15.mjs',SELF=T+'plan-history-adapter-v16.mjs',TEST=T+'plan-history-adapter-v16.metadata.test.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex'),copy=structuredClone;
// These are synthetic historical JSON records, not constructor/model inputs.
function fixture(mode){
 const bytes=new Map(),scope={baseDirectory:'C:/v16-metadata-fixture',roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix'].map(id=>({id,physicalPath:'C:/v16-metadata-fixture/'+id,aliases:[]}))},canonical=compileCanonicalHistoryPath(scope).canonical;
 const b={version:next.PLAN_HISTORY_VERSION,scope,baselinePlan:{path:'original-plan.json',sha256:sha('plan')},baselineActual:{path:'original-actual.json',sha256:sha('actual')},publicNamespace:canonical(scope.roots[0].physicalPath),files:[],archivedBindings:{},publicStocks:[],nearPools:{selected:[],old450:[],history:[]},terminalRecords:[],externalPrivate:[],retired:[],legacyReferences:[],closedCampaigns:[],closedExperimentIds:[],oldLiveByteIntegrityClaimed:false,baselineFields:{publicStocks:[],previousLateStocks:[],previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:[]}};
 const doc=(path,q)=>{const raw=Buffer.from(JSON.stringify(q));bytes.set(path,raw);return{path,sha256:sha(raw)};},readBytes=async p=>{assert(bytes.has(p),'Only synthetic metadata map reads permitted');return bytes.get(p);};
 const checkpoint=doc('checkpoint.json',b),review=doc('review.json',{status:next.PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:next.planHistorySummary(b),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});
 const level={id:997816,width:2,height:1,blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}],gates:[]};
 const projected={...copy(level),coloredGrids:[]},packet={level};if(mode!=='legacy-level-only')packet.lowerBound={projection:{projectedLevel:projected}};
 const d=doc(scope.roots[1].physicalPath+'/packet.json',packet),row={descriptor:d,field:'level',level:copy(level),sourceLevelId:level.id,reference:null},worlds=[row];
 if(mode!=='legacy-level-only'&&mode!=='omitted-projection')worlds.push({...copy(row),field:'lowerBound.projection.projectedLevel',level:copy(projected)});
 if(mode==='unknown-field')worlds[1].field='lowerBound.projectedLevel';
 if(mode==='wrong-projection')worlds[1].level.blocks[0].color='yellow';
 if(mode==='wrong-world-sha')worlds[1].descriptor.sha256='0'.repeat(64);
 const files=[{...d,aliases:[d.path],rootId:'late'}],owner={id:'v16-synthetic-owner',namespace:canonical(scope.roots[1].physicalPath),kind:'construction'};
 owner.definition=doc('owner.json',{version:'plan-history-owner-v1',...owner,files:mode==='owner-omits-original'?[]:files.map(({path,sha256})=>({path,sha256})),attemptIds:[],closedCampaigns:[]});
 const delta={version:next.PLAN_HISTORY_VERSION,parentHeadSha256:checkpoint.sha256,owner,files,terminalRecords:[],fullWorlds:worlds,closedCampaigns:[]};
 const listing=Object.fromEntries(scope.roots.map(r=>[r.id,r.id==='late'?[d.path]:[]]));if(mode==='missing-member')listing.late=[];
 return{base:{checkpoint,review,expectedScope:scope,readBytes},merge:{descriptor:doc('delta.json',delta),declaredOwner:owner,listing,readBytes}};
}
const out=process.argv[2];assert(out?.startsWith(V+'/proof/'));await fs.mkdir(out);const bindings={},checks=[];
const read=async(p,h)=>{const b=await fs.readFile(p);if(h)assert.equal(sha(b),h,p);bindings[p]=sha(b);return b;},save=async(name,q)=>{const p=out+'/'+name+'.json',b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});bindings[p]=sha(b);return{path:p,sha256:sha(b)};};
try{
 const a=(await read(OLD,'73c4082ac130806c9a260480c19d3be80f09e6b7e7bbd44e7e7ce78bb4092af0')).toString(),b=(await read(SELF)).toString();
 const diffDescriptor={path:V+'/proof/plan-history-lower-projection-field-v16-source-01/source-changes.json',sha256:'d840d1cd7910479f880a09844be93bce6e490f7f3e112825a7a374186410390c'},diff=JSON.parse(await read(diffDescriptor.path,diffDescriptor.sha256));
 assert.equal(diff.changes.length,1);const c=diff.changes[0];assert.equal(a.split(c.from).length,2);assert.equal(a.replace(c.from,c.to),b);assert.equal(b.replace(c.to,c.from),a);assert.equal(sha(b),diff.next.sha256);
 checks.push({name:'one-exact-field-addition-forward-and-reverse',passed:true,evidence:diffDescriptor});
 const outcomes=[];for(const mode of ['legacy-level-only','exact-saved-projection','unknown-field','wrong-projection','wrong-world-sha','omitted-projection','owner-omits-original','missing-member']){
  const f=fixture(mode),s=await next.consumePlanHistory(f.base),before=JSON.stringify(s);let outcome;
  try{const after=await next.mergePlanHistoryDelta(s,f.merge);outcome={mode,accepted:true,historyRows:after.nearPools.history.length};}catch(e){outcome={mode,accepted:false,error:e.message};}
  assert.equal(JSON.stringify(s),before,'Input state remains unchanged');assert.equal(outcome.accepted,['legacy-level-only','exact-saved-projection'].includes(mode),mode);if(outcome.accepted)assert.equal(outcome.historyRows,mode==='legacy-level-only'?1:2);
  if(mode==='exact-saved-projection'){const oldState=await previous.consumePlanHistory(f.base);await assert.rejects(previous.mergePlanHistoryDelta(oldState,f.merge),/Unknown stock field/);outcome.v15ReproducesOriginalRefusal=true;}
  if(mode==='legacy-level-only'){const oldState=await previous.consumePlanHistory(f.base);assert.deepEqual(await previous.mergePlanHistoryDelta(oldState,f.merge),await next.mergePlanHistoryDelta(s,f.merge));outcome.allOldReturnFieldsEqual=true;}
  outcomes.push(outcome);
 }
 checks.push({name:'full-metadata-api-two-positive-six-rejection-cases',passed:true,evidence:await save('projection-cases',{outcomes,realHistoryReads:0,onlyMapReads:true})});
 const receipt={path:V+'/design/colored-grid-source155-new-03/candidate.json',sha256:'a6bff8ff0430b4c80c9df6c36b4aec9754bfe59a0cdd1d3811cbcdae11a3b2f1'},q=JSON.parse(await read(receipt.path,receipt.sha256));assert(q.lowerBound.projection.projectedLevel.blocks.length>0);const original={...q.level};delete original.coloredGrids;assert.deepEqual(q.lowerBound.projection.projectedLevel,original);
 checks.push({name:'real-original-receipt-field-exists-without-reconstruction',passed:true,evidence:await save('original-field',{receipt,field:'lowerBound.projection.projectedLevel',originalMathematicalStatus:q.status,lowerProjectedLevelSha256:q.lowerBound.projectedLevelSha256,newModels:0,newReplayCalls:0,newSearches:0,actualHistoryNotLoaded:true})});
 const closure=await build({entryPoints:[SELF],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),toolBindings={};for(const p of Object.keys(closure.metafile.inputs)){toolBindings[p]=sha(await read(p));assert.equal(sha(await fs.readFile(V+'/frozen-workspace-4588/'+p)),toolBindings[p],p+' frozen');}await read(TEST);assert.equal(sha(await fs.readFile(V+'/frozen-workspace-4588/'+TEST)),bindings[TEST]);
 const inherited={path:V+'/proof/plan-history-adapter-v15-independent-01/report.json',sha256:'975277b8fb6e86828151c89f0cef8ee9dd4ba07f27e31cd32d2153003689857f'};await read(inherited.path,inherited.sha256);
 for(const[p,h]of Object.entries(bindings))assert.equal(sha(await fs.readFile(p)),h,p);
 const report=await save('report',{status:'PLAN_HISTORY_V16_SAVED_LOWER_PROJECTION_FIELD_METADATA_PASS',errors:[],checks,sourceChanges:diffDescriptor,inheritedQualification:inherited,toolBindings,fileBindings:bindings,bindingWorkingDirectory:process.cwd(),rootFrozenToolsEqual:true,newRealHistoryLoads:0,newRealHistoryMerges:0,newRealHistoryExports:0,newModels:0,newSearches:0,newReplayCalls:0,newLedgerClaims:0,newRealConstructions:0,oldFilesChanged:false,limits:'One field whitelist addition only. Metadata fixtures run original owner/member/SHA/field merge checks. No actual history, new gameplay world, model or mathematics is executed. Original pipeline60100 failure is retained.'});console.log(JSON.stringify({report,checks:checks.length,bindings:Object.keys(bindings).length,tools:Object.keys(toolBindings).length}));
}catch(e){await save('failed-report',{status:'PLAN_HISTORY_V16_METADATA_FAIL',error:e.stack,checks,fileBindings:bindings});throw e;}
