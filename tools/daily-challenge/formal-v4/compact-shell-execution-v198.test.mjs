import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';
import {projectCompactShellHistoryV198,latestCompactFailedParentV198,assertCompactShellFreshV198,assertCompactHistoryMembersV198,assertCompactShellSelectionV198,appendCompactShellResultV198,VERSION} from './compact-shell-execution-v198.mjs';
const hash='a'.repeat(64),ref={path:'C:/fixture/source.json',sha256:hash};
function fixture(){
 const level={id:5,width:3,height:2,gates:[],blocks:[{id:'a',x:0,y:0,color:'red',shape:[[0,0],[1,0]]},{id:'b',x:2,y:0,color:'blue',shape:[[0,0]]}]};
 const f=sealedWorldIdentity(level),request={...f,id:f.designSha256,startedAt:'2026-10-15T00:00:00Z',redesignOf:null};
 const record={kind:'mathematical',namespace:'c:/fixture/public',request:{descriptor:{path:'C:/fixture/parent.request.json',sha256:hash},value:request},result:{descriptor:{path:'C:/fixture/parent.result.json',sha256:hash},value:{accepted:false,status:'UNKNOWN_UPPER',levelSha256:f.levelSha256}},blocked:[],lock:null};
 const roots=Array.from({length:7},(_,i)=>({id:String(i),physicalPath:`C:/fixture/r${i}`,aliases:[]}));
 const world={level,sourceLevelId:5,reference:ref},bundle={scope:{baseDirectory:'C:/fixture',roots},publicNamespace:record.namespace,files:[],terminalRecords:[record]};
 const state={bundle,headSha256:hash,fullWorlds:[world,world],retired:[],closedExperimentIds:[]};
 const index=projectCompactShellHistoryV198(state,{headSha256:hash});
 const next={id:5,width:3,height:2,gates:[],blocks:[{id:'a',x:0,y:0,color:'green',shape:[[0,0],[0,1]]},{id:'b',x:1,y:0,color:'pink',shape:[[0,0],[1,0]]}]};
 return{level,record,state,index,next,parentId:request.id};
}
test('compact projection preserves references, partitions and terminal facts without levels or solver snapshots',()=>{
 const {index}=fixture();assert.equal(index.exactWorldCount,2);assert.equal(index.worlds.length,1);assert.equal(index.worlds[0].level,undefined);assert.equal(index.records[0].result.value.accepted,false);assert.equal(index.formalReady,false);
});
test('genuinely new shape, colour and partition passes metadata only',()=>{
 const {index,next,parentId}=fixture();const result=assertCompactShellFreshV198(index,{level:next,sourceLevelId:5},ref,parentId);assert(result.freshIdentity);assert.equal(result.mathematicalAcceptance,false);
});
test('renaming level or bodies cannot turn an old physical world into fresh input',()=>{
 const {index,level,parentId}=fixture();const same=structuredClone(level);same.id=999;for(const b of same.blocks)b.id+='renamed';
 assert.throws(()=>assertCompactShellFreshV198(index,{level:same,sourceLevelId:5},ref,parentId),/physical|partition/);
});
test('same partition with changed colors or same source shape inventory is rejected',()=>{
 const {index,level,parentId}=fixture();const recolor=structuredClone(level);recolor.blocks[0].color='yellow';
 assert.throws(()=>assertCompactShellFreshV198(index,{level:recolor,sourceLevelId:5},ref,parentId),/partition/);
 const moved=structuredClone(recolor);moved.blocks[0].y=1;
 assert.throws(()=>assertCompactShellFreshV198(index,{level:moved,sourceLevelId:5},ref,parentId),/shape AND true colour/);
});
test('latest failed parent is source-specific, strict about timestamp ties and never accepts a stale selected parent',()=>{
 const {index,record,next,parentId}=fixture(),later=structuredClone(record);later.request.value.id='b'.repeat(64);later.request.value.startedAt='2026-10-15T01:00:00Z';index.records.push(later);
 assert.equal(latestCompactFailedParentV198(index,5).request.value.id,later.request.value.id);
 assert.throws(()=>assertCompactShellFreshV198(index,{level:next,sourceLevelId:5},ref,parentId),/not latest/);
 later.request.value.startedAt=record.request.value.startedAt;assert.throws(()=>latestCompactFailedParentV198(index,5),/Ambiguous/);
});
test('pending physical aliases and failed descendants keep parent blocked',()=>{
 const {index,record,next,parentId}=fixture(),pending=structuredClone(record);pending.result=null;pending.request.value.id='c'.repeat(64);index.records.push(pending);
 assert.throws(()=>assertCompactShellFreshV198(index,{level:next,sourceLevelId:5},ref,parentId),/Pending physical alias/);
 index.records.pop();const descendant=structuredClone(record);descendant.request.value.id='d'.repeat(64);descendant.request.value.levelSha256='e'.repeat(64);descendant.request.value.redesignOf=parentId;index.records.push(descendant);
 assert.throws(()=>assertCompactShellFreshV198(index,{level:next,sourceLevelId:5},ref,parentId),/descendant/);
});
test('retired exact designs and reference families remain protected',()=>{
 const {index,next,parentId}=fixture();index.retired=[{kind:'design',designSha256:sealedWorldIdentity(next).designSha256}];
 assert.throws(()=>assertCompactShellFreshV198(index,{level:next,sourceLevelId:5},ref,parentId),/Retired design/);
 index.retired=[{kind:'reference-family',references:[ref]}];assert.throws(()=>assertCompactShellFreshV198(index,{level:next,sourceLevelId:5},ref,parentId),/Retired reference/);
});
test('selection rejects supplied route before any gameplay API is loaded',()=>{
 const {next}=fixture();next.blocks[0].layers=['green','red'];const q={level:next,levelSha256:levelSha256(next),sourceLevelSha256:levelSha256(next),sourceLevelId:5,stageKey:'mechanisms-multilayer-shell-15',difficulty:2,slot:1,newestMechanism:'multilayer-shell',unlockLevel:15,formalId:'daily-mechanisms-multilayer-shell-15-d2-01',accepted:false,formalReady:false,drags:[]};
 assert.throws(()=>assertCompactShellSelectionV198(q,next,[],[]),/padded/);
});
test('membership rejects an unsealed writer; no existing history is modified',async()=>{
 if(process.platform!=='win32')return;
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'blockout-compact-history-test-'));
 const root={id:'public',physicalPath:dir,aliases:[]},index={version:VERSION,scope:{baseDirectory:dir,roots:[root]},files:[]};
 try{await assertCompactHistoryMembersV198(index);await fs.writeFile(path.join(dir,'unsealed.json'),'{}');await assert.rejects(()=>assertCompactHistoryMembersV198(index),/stale/);}
 finally{await fs.unlink(path.join(dir,'unsealed.json')).catch(()=>{});await fs.rmdir(dir);}
});
test('static rejection still seals the original world in a successor and never changes old index',()=>{
 const {index,next,parentId}=fixture(),before=JSON.stringify(index),completion={path:'C:/fixture/completion.json',sha256:'f'.repeat(64)};
 const successor=appendCompactShellResultV198(index,{input:{level:next,sourceLevelId:5},sourceReference:ref,result:{status:'BLOCKED_STATIC',accepted:false},files:[],completion,experimentId:'static-reject-test'});
 assert.equal(JSON.stringify(index),before);assert(successor.closedExperimentIds.includes('static-reject-test'));assert.equal(successor.headSha256,completion.sha256);
 assert.throws(()=>assertCompactShellFreshV198(successor,{level:next,sourceLevelId:5},ref,parentId),/physical/);
});
test('cross-namespace failed identity is blocked even when absent from full worlds',()=>{
 const {index,next,parentId}=fixture(),foreign=structuredClone(index.records[0]);foreign.namespace='c:/fixture/reverse';foreign.request.value={...sealedWorldIdentity(next),id:'e'.repeat(64),startedAt:'2026-10-15T01:00:00Z',redesignOf:null};index.records.push(foreign);
 assert.throws(()=>assertCompactShellFreshV198(index,{level:next,sourceLevelId:5},ref,parentId),/cross-namespace/);
});
test('retired visible skeleton remains rejected under fresh outer metadata',()=>{
 const {index,next,parentId}=fixture();index.retired=[{kind:'skeleton',gates:next.gates,anchors:[next.blocks[0]]}];
 assert.throws(()=>assertCompactShellFreshV198(index,{level:next,sourceLevelId:5},ref,parentId),/Retired visible skeleton/);
});
test('a saved relaxed projection enters successor identities without becoming original upper evidence',()=>{
 const {index,next,parentId}=fixture(),projection=structuredClone(next);projection.blocks[0].color='orange';projection.blocks[0].shape=[[0,0],[1,0],[2,0]];
 const result={accepted:false,lowerBound:{projection:{projectedLevel:projection}}};
 const successor=appendCompactShellResultV198(index,{input:{level:next,sourceLevelId:5},sourceReference:ref,result,files:[],completion:{path:'C:/fixture/completion.json',sha256:'f'.repeat(64)},experimentId:'projection-test'});
 assert(successor.worlds.some(w=>w.identity.levelSha256===levelSha256(projection)));assert.equal(successor.numericalEvidenceCreated,false);assert.equal(successor.semanticHistoryValidation,'base-v17-validated; compact-successor-metadata-append');
 assert.throws(()=>assertCompactShellFreshV198(successor,{level:projection,sourceLevelId:5},ref,parentId),/physical/);
});
