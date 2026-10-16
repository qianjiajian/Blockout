import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {physicalPartition} from './early-frozen-construction-contract.mjs';
import {SEALED_HISTORY_VERSION as V,SEALED_HISTORY_REVIEW_STATUS,sha256,canonicalHistoryPath,sealedWorldIdentity,
 assertSealedHistoryBundle,sealedHistorySummary,consumeReviewedHistory,assertHistoryMembership,mergeDeclaredHistoryDelta,
 assertHistoryReference,assertFreshHistoryInput,historyComparisonPools} from './sealed-history-contract.mjs';

const out=process.env.SEALED_HISTORY_TEST_OUT;assert(out,'Explicit private report directory required');
await fs.mkdir(out,{recursive:false});const evidence=[];
const scope={baseDirectory:'C:/snapshot',roots:[{id:'public',physicalPath:'C:/shared/public',aliases:['C:/work/ledger','C:/snapshot/ledger']},
 {id:'private',physicalPath:'C:/shared/private',aliases:['C:/work/private','C:/snapshot/private']}]};
const owner={id:'fixture-existing-owner',definitionSha256:sha256('fixture-existing-owner-v1')};
const nextOwner={id:'fixture-new-owner',definitionSha256:sha256('fixture-new-owner-v1')};
const level={id:7,width:2,height:2,blocks:[{id:'a',x:0,y:0,shape:[[0,0],[1,0]],color:'red'},
 {id:'b',x:0,y:1,shape:[[0,0],[1,0]],color:'blue'}],gates:[]};
const fresh={...level,blocks:[{id:'a',x:0,y:0,shape:[[0,0],[0,1]],color:'green'},
 {id:'b',x:1,y:0,shape:[[0,0],[0,1]],color:'pink'}]};
function item(name,board,status,own=owner,attemptId=name,parentAttemptId=null){
 const p='c:/shared/public/'+name+'.json',raw=Buffer.from(JSON.stringify({level:board,status,ownerId:own.id,attemptId,parentAttemptId}));
 const file={pathIdentity:p,aliases:[p,'C:/work/ledger/'+name+'.json','ledger/'+name+'.json'],sha256:sha256(raw),rootId:'public',ownerId:own.id};
 const world={level:structuredClone(board),identity:sealedWorldIdentity(board),sourceLevelId:board.id,reference:null,origins:[{pathIdentity:p,field:'level'}]};
 const event={id:name,attemptId,ownerId:own.id,kind:'mathematical',status,worldSha256:world.identity.levelSha256,sourceFile:p,parentAttemptId};
 return{file,world,event,raw};
}
function fixture(status='FAILED'){
 const a=item('old',level,status),bundle={version:V,scope:structuredClone(scope),owners:[owner],files:[a.file],worlds:[a.world],events:[a.event],
  campaigns:[{id:'closed-campaign',ownerId:owner.id,maximumInputs:4,consumedInputs:3,closed:true,restartAllowed:false,sourceFile:a.file.pathIdentity}],liveOldBytesRevalidated:false};
 const bytes=new Map([[a.file.pathIdentity,a.raw]]);return{bundle,bytes,a};
}
const descriptor=(bytes,name,obj)=>{const raw=Buffer.from(JSON.stringify(obj));bytes.set(name,raw);return{path:name,sha256:sha256(raw)};};
const reader=bytes=>async p=>{assert(bytes.has(p),'Unexpected read: '+p);return bytes.get(p);};
function reviewed(bundle,bytes){const d=descriptor(bytes,'bundle.json',bundle),r=descriptor(bytes,'review.json',{status:SEALED_HISTORY_REVIEW_STATUS,bundle:d,
 summary:sealedHistorySummary(bundle),errors:[],newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false});
 return{bundle:d,review:r,expectedScope:scope,readBytes:reader(bytes)};}
const listing=b=>Object.fromEntries(b.scope.roots.map(r=>[r.id,b.files.filter(f=>f.rootId===r.id).map(f=>f.pathIdentity)]));
async function verifyFixtureOwner({owner:own,delta,newBytes}){
 for(const e of delta.events){const raw=JSON.parse(newBytes.get(e.sourceFile));assert.equal(raw.ownerId,own.id);assert.equal(raw.status,e.status);assert.equal(raw.attemptId,e.attemptId);assert.equal(raw.parentAttemptId,e.parentAttemptId);
  assert.equal(levelSha256(raw.level),e.worldSha256);}
 for(const w of delta.worlds)for(const o of w.origins){assert.equal(o.field,'level');assert.deepEqual(JSON.parse(newBytes.get(o.pathIdentity)).level,w.level);}return true;
}
function append(state,bytes,{status='FAILED',own=nextOwner,board=fresh,attempt='new',parent='old'}={}){
 const a=item('delta-'+attempt,board,status,own,attempt,parent);bytes.set(a.file.pathIdentity,a.raw);
 const delta={version:V,parentHeadSha256:state.headSha256,owner:own,files:[a.file],worlds:[a.world],events:[a.event],campaigns:[]};
 const d=descriptor(bytes,'delta-'+attempt+'.json',delta),ls=listing(state.bundle);ls.public.push(a.file.pathIdentity);
 return{delta,a,args:{descriptor:d,declaredOwner:own,listing:ls,readBytes:reader(bytes),validateOwnerFacts:verifyFixtureOwner}};
}
const check=(name,fn)=>test(name,async()=>{await fn();evidence.push({name,passed:true});});

check('canonical aliases preserve all names; current and snapshot source files remain distinct',()=>{
 const {bundle}=fixture();assertSealedHistoryBundle(bundle);assert.equal(canonicalHistoryPath('ledger/OLD.json',scope),'c:/shared/public/old.json');
 assert.notEqual(canonicalHistoryPath('C:/work/src/game.ts',scope),canonicalHistoryPath('C:/snapshot/src/game.ts',scope));
 assert.equal(bundle.files[0].aliases.length,3);assert.equal(sealedWorldIdentity(level).partitionSha256,physicalPartition(level));
 const bad=structuredClone(bundle);bad.files[0].aliases.push('C:/work/src/game.ts');assert.throws(()=>assertSealedHistoryBundle(bad),/Alias/);
});
check('review pins bundle bytes, full scope and semantic summary; no old raw files are required',async()=>{
 const {bundle,bytes}=fixture(),args=reviewed(bundle,bytes);bytes.delete(bundle.files[0].pathIdentity);
 const state=await consumeReviewedHistory(args);assert.equal(state.liveOldBytesRevalidated,false);
 await assert.rejects(consumeReviewedHistory({...args,expectedScope:{...scope,roots:scope.roots.slice(0,1)}}));
 const old=bytes.get('bundle.json');bytes.set('bundle.json',Buffer.concat([old,Buffer.from(' ')]));await assert.rejects(consumeReviewedHistory(args),/Descriptor bytes/);bytes.set('bundle.json',old);
 const wrong=JSON.parse(bytes.get('review.json'));wrong.summary.events++;const rd=descriptor(bytes,'bad-review.json',wrong);await assert.rejects(consumeReviewedHistory({...args,review:rd}));
});
check('failed and pending exact identities stay blocked; unrelated pending does not block fresh input',()=>{
 for(const status of ['FAILED','PENDING']){const {bundle}=fixture(status);assert.throws(()=>assertFreshHistoryInput(bundle,{...level,id:99,name:'renamed'},{sourceLevelId:7}),/Existing physical/);
  assert.throws(()=>assertHistoryReference(bundle,'old'));
  if(status==='PENDING'){assert.throws(()=>assertFreshHistoryInput(bundle,fresh,{sourceLevelId:7,failedParentAttemptId:'old'}),/Parent/);assert.equal(assertFreshHistoryInput(bundle,fresh,{sourceLevelId:7}).freshIdentity,true);}}
 const {bundle}=fixture();const sameColour={...fresh,blocks:fresh.blocks.map((b,i)=>({...b,color:level.blocks[i].color}))};
 assert.throws(()=>assertFreshHistoryInput(bundle,sameColour,{sourceLevelId:7,failedParentAttemptId:'old'}),/actual colour/);
 assert.equal(assertFreshHistoryInput(bundle,fresh,{sourceLevelId:7,failedParentAttemptId:'old'}).nearChecksStillRequired,true);
});
check('same-reference shape AND colour guard and protected accepted/retired pools are retained',()=>{
 const {bundle}=fixture('ACCEPTED'),w=bundle.worlds[0];w.reference={pathIdentity:bundle.files[0].pathIdentity,sha256:bundle.files[0].sha256};
 assert.equal(assertHistoryReference(bundle,'old').identity.levelSha256,w.identity.levelSha256);
 const changedOnlyShape={...fresh,blocks:fresh.blocks.map((b,i)=>({...b,color:level.blocks[i].color}))};
 assert.throws(()=>assertFreshHistoryInput(bundle,changedOnlyShape,{sourceLevelId:7,reference:w.reference}),/actual colour/);
 assert.equal(historyComparisonPools(bundle).protectedNearWorlds.length,1);bundle.events[0].status='RETIRED';assert.throws(()=>assertHistoryReference(bundle,'old'));
 const pools=historyComparisonPools(bundle);assert.equal(pools.protectedNearWorlds.length,1);assert.equal(pools.allHistoricalWorlds.length,1);assert.equal(pools.nearExemptionsGranted,false);
});
check('declared delta hashes every new file, preserves baseline and rejects unknown owner/extra or missing members',async()=>{
 const {bundle,bytes}=fixture(),state=await consumeReviewedHistory(reviewed(bundle,bytes)),a=append(state,bytes);
 const before=JSON.stringify(state);const merged=await mergeDeclaredHistoryDelta(state,a.args);assert.equal(merged.bundle.worlds.length,2);assert.equal(JSON.stringify(state),before);
 await assert.rejects(mergeDeclaredHistoryDelta(state,{...a.args,declaredOwner:{...nextOwner,id:'unknown'}}),/owner/);
 await assert.rejects(mergeDeclaredHistoryDelta(state,{...a.args,listing:{public:[a.a.file.pathIdentity],private:[]}}),/deleted or renamed/);
 await assert.rejects(mergeDeclaredHistoryDelta(state,{...a.args,listing:{...a.args.listing,private:['C:/shared/private/unknown.json']}}),/Unknown writer/);
 await assert.rejects(mergeDeclaredHistoryDelta(state,{...a.args,validateOwnerFacts:undefined}),/decoder/);
 const raw=bytes.get(a.a.file.pathIdentity);bytes.set(a.a.file.pathIdentity,Buffer.from('{}'));await assert.rejects(mergeDeclaredHistoryDelta(state,a.args),/SHA/);bytes.set(a.a.file.pathIdentity,raw);
});
check('rewrites, stale heads, conflicting fingerprints and closed quota resets never overwrite facts',async()=>{
 const {bundle,bytes}=fixture(),state=await consumeReviewedHistory(reviewed(bundle,bytes)),a=append(state,bytes);
 const call=async delta=>mergeDeclaredHistoryDelta(state,{...a.args,descriptor:descriptor(bytes,'tampered-delta.json',delta)});
 const rewrite=structuredClone(a.delta);rewrite.files[0].pathIdentity=bundle.files[0].pathIdentity;await assert.rejects(call(rewrite),/rewritten/);
 const stale=structuredClone(a.delta);stale.parentHeadSha256=sha256('stale');await assert.rejects(call(stale),/Stale/);
 const wrong=structuredClone(a.delta);wrong.worlds[0].identity.shapeSha256=sha256('false');await assert.rejects(call(wrong),/fingerprints/);
 const quota=structuredClone(a.delta);quota.campaigns=[{...bundle.campaigns[0],ownerId:nextOwner.id,sourceFile:a.a.file.pathIdentity}];await assert.rejects(call(quota),/quota/);
 const falseFacts=structuredClone(a.delta);falseFacts.events[0].status='ACCEPTED';await assert.rejects(call(falseFacts));
});
check('pending resolution appends terminal facts and aliases; prior failure dominates any later accepted alias',async()=>{
 const {bundle,bytes}=fixture('PENDING'),state=await consumeReviewedHistory(reviewed(bundle,bytes));
 const a=append(state,bytes,{status:'ACCEPTED',own:owner,board:level,attempt:'old',parent:null});
 const next=await mergeDeclaredHistoryDelta(state,a.args);assert.equal(next.bundle.worlds.length,1);assert.equal(next.bundle.worlds[0].origins.length,2);assertHistoryReference(next.bundle,'old');
 const failed=fixture(),state2=await consumeReviewedHistory(reviewed(failed.bundle,failed.bytes));
 const b=append(state2,failed.bytes,{status:'ACCEPTED',own:nextOwner,board:level,attempt:'alias',parent:null});
 const denied=await mergeDeclaredHistoryDelta(state2,b.args);assert.throws(()=>assertHistoryReference(denied.bundle,'alias'),/failure/);
 assert.throws(()=>assertFreshHistoryInput(denied.bundle,level,{sourceLevelId:7}),/Existing physical/);
});
check('later failed/pending descendants disqualify stale parents; terminal replacement and orphan ancestry fail',async()=>{
 const {bundle,bytes}=fixture(),state=await consumeReviewedHistory(reviewed(bundle,bytes)),a=append(state,bytes),next=await mergeDeclaredHistoryDelta(state,a.args);
 const third={...level,width:3,blocks:[{id:'a',x:0,y:0,shape:[[0,0],[1,0],[2,0]],color:'yellow'},{id:'b',x:0,y:1,shape:[[0,0],[1,0],[2,0]],color:'purple'}]};
 assert.throws(()=>assertFreshHistoryInput(next.bundle,third,{sourceLevelId:7,failedParentAttemptId:'old'}),/later failed/);
 const orphan=structuredClone(bundle);orphan.events[0].parentAttemptId='missing';assert.throws(()=>assertSealedHistoryBundle(orphan),/Missing parent/);
 const conflict=structuredClone(bundle);conflict.events.push({...conflict.events[0],id:'fake-success',status:'ACCEPTED'});assert.throws(()=>assertSealedHistoryBundle(conflict),/Terminal fact/);
 assertHistoryMembership(bundle,listing(bundle));
});

test.after(async()=>{
 const entry='tools/daily-challenge/formal-v4/sealed-history-contract.mjs',testFile='tools/daily-challenge/formal-v4/sealed-history-contract.test.mjs';
 const compiled=await build({entryPoints:[entry],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'}),fileBindings={};
 for(const p of [...Object.keys(compiled.metafile.inputs),testFile])fileBindings[p.replaceAll('\\','/')]=sha256(await fs.readFile(p));
 const report={status:evidence.length===8?'SEALED_HISTORY_CONTRACT_PRIVATE_PASS':'SEALED_HISTORY_CONTRACT_PRIVATE_INCOMPLETE',evidence,errors:[],
  newRealHistoryExports:0,newRealHistoryScans:0,newRealCandidateSearches:0,newRealCandidateConstructions:0,publicLedgerClaims:0,
  privateSyntheticDataOnly:true,oldLiveByteIntegrityClaimed:false,actualExporterAndWriterIntegrationImplemented:false,
  limitations:['Caller-pinned independent review authenticates the sealed baseline. Scope/real junction equivalence must be independently checked by its future exporter.',
   'Complete listings and declared-owner decoder/review are caller responsibilities. This pure module supplies no filesystem lock, enumeration, historical exporter or production entry.',
   'Old members are checked for presence/name; old live bytes are not rehashed. Current sources, mathematics, candidate and direct reference/parent proof bytes remain future consumer checks.'],fileBindings};
 await fs.writeFile(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
});
