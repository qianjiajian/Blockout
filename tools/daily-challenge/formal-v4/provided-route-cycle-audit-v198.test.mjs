import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {auditProvidedRouteCyclesV198 as audit,auditProvidedRouteFileV198 as auditFile,routeAuditValueHash as valueHash} from './provided-route-cycle-audit-v198.mjs';

const root=fileURLToPath(new URL('../../../',import.meta.url));
const tool=fileURLToPath(new URL('./provided-route-cycle-audit-v198.mjs',import.meta.url));
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const seal=q=>({...q,levelSha256:valueHash(q.level),routeSha256:valueHash(q.drags)});
function fixture(drags=[{blockId:'s',path:[[1,1],[1,2]]}]) {
  return seal({level:{id:80,mechanismRules:'revised-2026-09-27-v1.5',width:4,height:4,timeSeconds:180,
    blocks:[{id:'s',x:1,y:2,shape:[[0,0]],color:'red',layers:['red','blue']}],
    gates:[{id:'r',side:'top',offset:0,size:4,color:'red'}]},drags});
}

test('final21 existing receipt has exactly 18 original closed gestures, without new replay or proof',async()=>{
  const file=path.join(root,'deliverables/daily-formal-v4-20261008/design/shell-d2-02-source80-new-06-routefast-final21-execution-01/candidate.json');
  const bytes=await fs.readFile(file),q=JSON.parse(bytes),before=structuredClone(q),r=audit(q,{sourceFile:{path:file,sha256:hash(bytes)}});
  assert.equal(r.status,'STATIC_AVOIDABLE_CLOSED_GESTURES_FOUND');assert.equal(r.avoidableParkingDrags,18);
  assert.deepEqual(r.findings.map(x=>x.dragIndex),Array.from({length:18},(_,i)=>i+5));
  for(const f of r.findings){assert.equal(f.blockId,'shell-d202-s80-n06-final21-E');assert.deepEqual(f.start,[2,2]);assert.deepEqual(f.endpoint,[2,2]);assert.equal(f.exitSide,null);}
  assert.deepEqual(r.findings.slice(0,4).map(x=>x.path.length),[4,4,4,4]);assert(r.findings.slice(4).every(x=>x.path.length===2));
  assert.equal(r.identity.routeEvidence.matchesCandidate,true);assert.equal(r.identity.lowerEvidence.matchesCandidate,true);
  assert.equal(r.identity.lowerEvidence.reportedTermination,'relaxed-completion');assert.equal(r.identity.routeEvidence.reportedNonClearingDrags,18);
  assert.equal(r.completeRouteValidated,false);assert.equal(r.newUpperBound,null);assert.equal(r.newLowerBound,null);assert.equal(r.accepted,false);
  assert.deepEqual(r.execution,{models:0,searches:0,replays:0,ledgerClaims:0,originalFilesWritten:0});
  assert.deepEqual(q,before);assert.equal(hash(await fs.readFile(file)),hash(bytes));
});

test('normal parking and a partial backtrack ending elsewhere are not closed gestures',()=>{
  const q=fixture([{blockId:'s',path:[[1,1],[2,1],[1,1]]},{blockId:'s',path:[[2,1]]}]),r=audit(q);
  assert.equal(r.status,'STATIC_NO_CLOSED_GESTURES_FOUND');assert.equal(r.avoidableParkingDrags,0);
  assert.equal(r.consecutiveParkingFusionAudited,false);assert.equal(r.accepted,false);
});

test('a loop is measured from the latest declared endpoint, including after a shell peel',()=>{
  const q=fixture([{blockId:'s',path:[[1,1]]},{blockId:'s',path:[[1,0]],exitSide:'top'},
    {blockId:'s',path:[[2,0],[1,0]]}]),r=audit(q);
  assert.equal(r.avoidableParkingDrags,1);assert.equal(r.findings[0].dragIndex,2);assert.deepEqual(r.findings[0].start,[1,0]);
  // An exit/peel gesture remains a clearing gesture even if its path returns.
  assert.equal(audit(fixture([{blockId:'s',path:[[1,1],[1,2]],exitSide:'top'}])).avoidableParkingDrags,0);
});

test('stateful or unknown mechanics are explicitly not audited, including zero flags',()=>{
  for(const key of ['generators','flipDoors','coloredGrids','shutters','seams','elevators','conveyors']){
    const q=fixture();q.level[key]=[{}];const r=audit(seal(q));assert.equal(r.status,'NOT_AUDITED_UNSUPPORTED_DOMAIN',key);assert.equal(r.avoidableParkingDrags,null);assert.deepEqual(r.findings,[]);
  }
  for(const key of ['timedBombSeconds','frozen','movementAxis','star','keyId','lockedBy','lockCount','shutterId']){
    const q=fixture();q.level.blocks[0][key]=0;assert.equal(audit(seal(q)).status,'NOT_AUDITED_UNSUPPORTED_DOMAIN',key);
  }
  for(const key of ['frozen','star']){const q=fixture();q.level.gates[0][key]=0;assert.equal(audit(seal(q)).status,'NOT_AUDITED_UNSUPPORTED_DOMAIN');}
  for(const key of ['pulseRescue','unknownMechanism']){const q=fixture();q.level[key]={};assert.equal(audit(seal(q)).status,'NOT_AUDITED_UNSUPPORTED_DOMAIN');}
  const scheduled=fixture();scheduled.timeSchedule=[];assert.equal(audit(scheduled).status,'NOT_AUDITED_UNSUPPORTED_DOMAIN');
  const legacy=fixture();legacy.level.mechanismRules='legacy';assert.equal(audit(seal(legacy)).status,'NOT_AUDITED_UNSUPPORTED_DOMAIN');
});

test('invalid path structure and identity mismatch cannot produce findings',()=>{
  for(const drags of [[{blockId:'s',path:[]}],[{blockId:'s',path:[[3,2],[1,2]]}],[{blockId:'missing',path:[[1,1]]}],
    [{blockId:'s',path:[[1,2]]}],[{blockId:'s',path:[[1,1]],exitSide:'diagonal'}]]){
    const r=audit(fixture(drags));assert.equal(r.status,'NOT_AUDITED_INVALID_INPUT');assert.equal(r.avoidableParkingDrags,null);assert.deepEqual(r.findings,[]);
  }
  const changed=fixture();changed.drags[0].path[0]=[2,2];assert.equal(audit(changed).status,'NOT_AUDITED_IDENTITY_MISMATCH');
  const unrelated=fixture();unrelated.route={inputLevelSha256:'f'.repeat(64),routeSha256:unrelated.routeSha256};assert.equal(audit(unrelated).status,'NOT_AUDITED_IDENTITY_MISMATCH');
  for(const q of [null,{level:3,drags:[]},{level:[],drags:[]},{level:{blocks:[null],gates:[]},drags:[]}]){
    const r=audit(q);assert.equal(r.status,'NOT_AUDITED_INVALID_INPUT');assert.deepEqual(r.findings,[]);
  }
  const invalidSuffix=fixture([{blockId:'s',path:[[1,1],[1,2]]},{blockId:'s',path:[[3,2]]}]);
  assert.deepEqual(audit(invalidSuffix).findings,[],'Invalid suffix must not expose a partial completed audit');
});

test('CLI binds exact input bytes and tool, writes only a new path, preserves existing files',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'provided-route-cycle-audit-'));
  const input=path.join(dir,'input.json'),output=path.join(dir,'report.json'),cliOutput=path.join(dir,'cli-report.json');
  try{
    await fs.writeFile(input,JSON.stringify(fixture())+'\n');const before=await fs.readFile(input);
    const r=await auditFile(input,output);assert.equal(r.sourceFile.sha256,hash(before));assert.equal(r.auditTool.sha256,hash(await fs.readFile(tool)));
    await assert.rejects(auditFile(input,input),/new output path/);await assert.rejects(auditFile(input,output),{code:'EEXIST'});
    assert.deepEqual(await fs.readFile(input),before);
    assert.throws(()=>execFileSync(process.execPath,[tool,input,cliOutput],{stdio:'pipe'}),error=>error.status===2);
    assert.equal(JSON.parse(await fs.readFile(cliOutput)).avoidableParkingDrags,1);
  }finally{
    // Only the three explicitly created files are removed; no recursive path.
    for(const file of [input,output,cliOutput])await fs.unlink(file).catch(error=>{if(error.code!=='ENOENT')throw error;});
    await fs.rmdir(dir);
  }
});
