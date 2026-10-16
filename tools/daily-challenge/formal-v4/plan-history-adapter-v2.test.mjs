import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {sha256,sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {PLAN_HISTORY_VERSION,PLAN_HISTORY_REVIEW_STATUS,planHistorySummary,consumePlanHistory,readDirectHistoryRole,assertFreshPlanHistoryInput,mergePlanHistoryDelta} from './plan-history-adapter-v2.mjs';
const out=process.env.PLAN_HISTORY_V2_TEST_OUT;assert(out);await fs.mkdir(out,{recursive:false});let passed=false;
test('only exact reviewed baseline private result failures may lack seals; permanent deny, no role or delta exemption',async()=>{
 const bytes=new Map(),scope={baseDirectory:'C:/snapshot',roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix'].map(id=>({id,physicalPath:'C:/shared/'+id,aliases:[]}))},files=[],archivedBindings={};
 const put=(p,q)=>{const raw=Buffer.from(JSON.stringify(q)),d={path:p,sha256:sha256(raw)};bytes.set(p,raw);files.push({...d,rootId:null,aliases:[p]});archivedBindings[p]=d.sha256;return d;};
 const board={id:10,width:2,height:1,gates:[],blocks:[{id:'a',x:0,y:0,shape:[[0,0]],color:'red'},{id:'b',x:1,y:0,shape:[[0,0]],color:'blue'}]},f=sealedWorldIdentity(board),namespace='c:/legacy/private';
 const request={id:f.designSha256,levelSha256:f.levelSha256,shapeSha256:f.shapeSha256,colorSha256:f.colorSha256,designSha256:f.designSha256,colorAssignments:f.colorAssignments,redesignOf:null};
 const result={accepted:false,status:'threshold-proven',levelSha256:f.levelSha256},packet={accepted:false,level:board,proof:{attempt:request}};
 const rd=put(namespace+'/'+request.id+'.request.json',request),resultd=put(namespace+'/'+request.id+'.result.json',result),pd=put('C:/legacy/packet.json',packet);
 const r={namespace,kind:'mathematical',request:{descriptor:rd,value:request},result:{descriptor:resultd,value:result},blocked:[],lock:null,
  legacyPrivateResultFailure:{baselineOnly:true,packet:{descriptor:pd,value:packet},missingBlockedFiles:[namespace+'/'+request.id+'.blocked.json',namespace+'/identities/'+f.retryIdentitySha256+'.blocked.json']}};
 const b={version:PLAN_HISTORY_VERSION,scope,baselinePlan:{path:'plan.json',sha256:sha256('p')},baselineActual:{path:'actual.json',sha256:sha256('a')},publicNamespace:'c:/shared/public',files,archivedBindings,
  publicStocks:[],nearPools:{selected:[],old450:[],history:[{descriptor:pd,level:board,sourceLevelId:10,reference:null}]},terminalRecords:[r],
  externalPrivate:[{namespace,id:request.id,packet:pd,request:rd,result:resultd}],retired:[],legacyReferences:[],closedCampaigns:[],closedExperimentIds:[],oldLiveByteIntegrityClaimed:false,
  baselineFields:{publicStocks:[],previousLateStocks:[],previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:[]}};
 const doc=(p,q)=>{const raw=Buffer.from(JSON.stringify(q));bytes.set(p,raw);return{path:p,sha256:sha256(raw)};},readBytes=async p=>{assert(bytes.has(p));return bytes.get(p);};
 const load=async q=>{const checkpoint=doc('checkpoint.json',q),review=doc('review.json',{status:PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:planHistorySummary(q),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});return consumePlanHistory({checkpoint,review,expectedScope:scope,readBytes});};
 const state=await load(b);assert.equal(state.terminalByAttempt[namespace+'|'+request.id].result.value.accepted,false);
 assert.throws(()=>assertFreshPlanHistoryInput(state,{...board,name:'renamed',id:99}),/Existing cross-namespace/);
 for(const role of ['reference','failed-parent'])await assert.rejects(readDirectHistoryRole(state,{namespace,attemptId:request.id,receipt:pd,role,readBytes}),/Legacy private failure cannot/);
 const wrong=structuredClone(b);wrong.externalPrivate[0].packet.sha256=sha256('wrong');await assert.rejects(load(wrong));
 const forged=structuredClone(b);forged.terminalRecords[0].legacyPrivateResultFailure.packet.value.accepted=true;await assert.rejects(load(forged));
 const undeclared=structuredClone(b);undeclared.externalPrivate=[];await assert.rejects(load(undeclared),/allowlist/);
 const owner={id:'new-math',namespace:'c:/shared/public',kind:'mathematical'},m={version:'plan-history-owner-v1',...owner,files:[],attemptIds:[request.id],closedCampaigns:[]};owner.definition=doc('owner.json',m);
 const delta={version:PLAN_HISTORY_VERSION,parentHeadSha256:state.headSha256,owner,files:[],terminalRecords:[r],fullWorlds:[],closedCampaigns:[]};
 await assert.rejects(mergePlanHistoryDelta(state,{descriptor:doc('delta.json',delta),declaredOwner:owner,listing:Object.fromEntries(scope.roots.map(x=>[x.id,[]])),readBytes}),/cannot manufacture legacy/);
 assert.equal(levelSha256(state.bundle.terminalRecords[0].request.value),levelSha256(request));passed=true;
});
test.after(async()=>{const fileBindings={};for(const p of ['tools/daily-challenge/formal-v4/plan-history-adapter-v2.mjs','tools/daily-challenge/formal-v4/plan-history-adapter-v2.test.mjs','tools/daily-challenge/formal-v4/plan-history-adapter.mjs'])fileBindings[p]=sha256(await fs.readFile(p));
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify({status:passed?'PLAN_HISTORY_ADAPTER_V2_LEGACY_PRIVATE_FIXTURE_PASS':'INCOMPLETE',tests:1,passed,errors:[],fileBindings,
  priorQualification:{path:'deliverables/daily-formal-v4-20261008/proof/plan-history-adapter-private-04/report.json',sha256:'066f4b4d14906fa16df2c7b935cc93d0fc30cfe30353b45acf0863026d6d5ccb'},
  newSearches:0,newConstructions:0,newLedgerClaims:0,newRealHistoryExports:0,newRealHistoryScans:0,privateSyntheticDataOnly:true,oldLiveByteIntegrityClaimed:false},null,2)+'\n',{flag:'wx'});});
