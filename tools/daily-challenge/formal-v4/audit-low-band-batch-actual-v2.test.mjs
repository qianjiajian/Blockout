import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {checkBoundMapOnce,recheckBoundBytes} from './audit-low-band-batch-actual-independent-v2.mjs';

const digest=b=>createHash('sha256').update(b).digest('hex');
async function fixture(){
 const directory=await fs.mkdtemp(path.join(os.tmpdir(),'blockout-readonly-audit-cache-'));
 const files=[path.join(directory,'a.txt'),path.join(directory,'b.txt')];
 await Promise.all(files.map((f,i)=>fs.writeFile(f,`original-${i}`)));
 const map=Object.fromEntries(await Promise.all(files.map(async f=>[f,digest(await fs.readFile(f))])));
 const bindings={},reads=new Map();
 const readBytes=async f=>{const key=path.resolve(f);reads.set(key,(reads.get(key)??0)+1);return fs.readFile(key);};
 const readAndBind=async(f,h)=>{const key=path.resolve(f),actual=digest(await readBytes(f));assert.equal(actual,h);bindings[key]=actual;};
 return{directory,files,map,bindings,reads,readBytes,readAndBind};
}

test('same physical path with conflicting expected SHA rejects without overriding the first binding',async()=>{
 const f=await fixture();await checkBoundMapOnce(f.map,f.bindings,f.readAndBind);
 const conflicting={[path.join(f.directory,'.','a.txt')]:digest('different')};
 await assert.rejects(()=>checkBoundMapOnce(conflicting,f.bindings,f.readAndBind),/Conflicting immutable binding/);
 assert.equal(f.bindings[f.files[0]],f.map[f.files[0]]);assert.equal(f.reads.get(f.files[0]),1);
});

test('intermediate mutation and deletion are rejected by the mandatory fresh final-byte pass',async()=>{
 const f=await fixture();await checkBoundMapOnce(f.map,f.bindings,f.readAndBind);
 await fs.writeFile(f.files[0],'changed after first validation');
 await checkBoundMapOnce(f.map,f.bindings,f.readAndBind);
 await assert.rejects(()=>recheckBoundBytes(f.bindings,f.readBytes),/Final immutable check/);
 await fs.writeFile(f.files[0],'original-0');await fs.unlink(f.files[1]);
 await assert.rejects(()=>recheckBoundBytes(f.bindings,f.readBytes),{code:'ENOENT'});
});

test('25 repeated row maps hash each path once at start and once at final verification',async()=>{
 const f=await fixture();
 for(let row=0;row<25;row++)await checkBoundMapOnce(f.map,f.bindings,f.readAndBind);
 for(const file of f.files)assert.equal(f.reads.get(file),1);
 await recheckBoundBytes(f.bindings,f.readBytes);
 for(const file of f.files)assert.equal(f.reads.get(file),2);
 assert.deepEqual(f.bindings,f.map);
});
