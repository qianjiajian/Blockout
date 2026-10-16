import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {PACK_VERSION, MAX_CHUNK_BYTES, DEFAULT_CHUNK_BYTES, hashJsonStream, iterateJsonTokens,
  writeHistoryPack, readHistoryPack} from './plan-history-pack-v1.mjs';

// Small metadata only: no game imports, histories, worlds, models or ledgers.
const sha = b => createHash('sha256').update(b).digest('hex');
const canonicalJson = value => Array.isArray(value) ? value.map(canonicalJson)
  : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort()
    .filter(key => value[key] !== undefined).map(key => [key, canonicalJson(value[key])])) : value;
const cap = 1_000_000;
const fixture = () => JSON.parse('{"unknown":{"z":true,"10":"ten","2":"two","01":"leading","__proto__":{"preserved":"yes"},"a":null},"records":[{"owner":"a","failed":true},{"owner":"b","pending":true}],"namespace":"local-only"}');
async function temp(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'blockout-pack-metadata-'));
  // Resolve and verify the exact temporary directory before recursive cleanup.
  const resolved = path.resolve(directory), parent = path.resolve(os.tmpdir());
  assert.equal(path.dirname(resolved), parent); assert(path.basename(resolved).startsWith('blockout-pack-metadata-'));
  t.after(() => fs.rm(resolved, {recursive:true,force:true})); return resolved;
}
async function pack(t, value=fixture(), options={}) {
  const directory = path.join(await temp(t),'pack');
  return writeHistoryPack(value,{directory,maxTotalBytes:cap,chunkTargetBytes:128,...options});
}
async function virtual(p, changeManifest=()=>{}, changeFiles=()=>{}) {
  const files = new Map();
  for(const c of p.manifest.chunks) {const name=path.join(path.dirname(p.descriptor.path),c.file);files.set(name,await fs.readFile(name));}
  const m=structuredClone(p.manifest); changeManifest(m); changeFiles(files,m);
  const bytes=Buffer.from(JSON.stringify(m)); files.set(p.descriptor.path,bytes);
  const reads=[];
  return {descriptor:{path:p.descriptor.path,sha256:sha(bytes)},options:{maxTotalBytes:cap,readBytes:async name=>{
    reads.push(name); assert(files.has(name),'Missing chunk'); return files.get(name);}},files,reads};
}
function replaceEvents(files,m,events) {
  const bytes=Buffer.from(JSON.stringify(events)), c=m.chunks[0];
  for(const key of [...files.keys()])if(path.basename(key)===c.file)files.set(key,bytes);
  c.sha256=sha(bytes);c.bytes=bytes.length;c.eventCount=events.length;
  m.chunks=[c];m.totalChunkBytes=bytes.length;m.eventCount=events.length;
}

test('streamed ordinary/canonical hashes match frozen JSON semantics including integer keys and Unicode',()=>{
  const value=fixture();
  value.text='"\\\b\f\n\r\t\u0000\u001f/中文😀\ud800x\udfff\u2028\u2029'+'a'.repeat(16383)+'😀';
  value.numbers=[-0,0,1e-7,1e21,Number.MAX_SAFE_INTEGER,Number.MIN_VALUE];
  value.unknown['4294967295']='not-index';value.unknown['4294967294']='index';
  for(const canonical of [false,true]){
    const json=JSON.stringify(canonical?canonicalJson(value):value);
    assert.equal([...iterateJsonTokens(value,{canonical})].join(''),json);
    assert.deepEqual(hashJsonStream(value,{canonical}),{sha256:sha(json),bytes:Buffer.byteLength(json)});
  }
});

test('canonical optional undefined fields and sparse arrays exactly match old helper; storage rejects them',async t=>{
  const a=[undefined,,1];a.extra='ignored-by-map';
  const value={z:undefined,a,number:NaN,nested:{keep:null,omit:undefined},infinity:Infinity};
  assert.deepEqual(hashJsonStream(value,{canonical:true}),{sha256:sha(JSON.stringify(canonicalJson(value))),bytes:Buffer.byteLength(JSON.stringify(canonicalJson(value)))});
  assert.throws(()=>hashJsonStream(value),/Unsupported|Nonfinite|Sparse/);
  const directory=path.join(await temp(t),'invalid');
  await assert.rejects(writeHistoryPack(value,{directory,maxTotalBytes:cap}));
  await assert.rejects(fs.stat(directory),{code:'ENOENT'});
});

test('multiple bounded chunks preserve unknown values, key ordering, proto property and negative zero',async t=>{
  const value=fixture();value.zero=-0;value.unknownLongKey='';
  value['🔑'.repeat(200)+'\ud800']='x\n😀\udfff'.repeat(300);
  const originalKeys=Object.keys(value), p=await pack(t,value), observed=[];
  assert(p.manifest.chunks.length>10);assert.equal(p.manifest.version,PACK_VERSION);
  const r=await readHistoryPack(p.descriptor,{maxTotalBytes:cap,readBytes:async name=>{const b=await fs.readFile(name);observed.push([name,b.length]);return b;}});
  assert.deepEqual(r.value,value);assert.deepEqual(Object.keys(r.value),originalKeys);
  assert(Object.is(r.value.zero,-0));assert.equal(Object.getPrototypeOf(r.value.unknown),Object.prototype);
  assert.equal(r.value.unknown.__proto__.preserved,'yes');assert.equal({}.preserved,undefined);
  assert.equal(observed.length,p.manifest.chunks.length+1);
  assert(observed.slice(1).every(([,n])=>n<=128));assert.equal(Object.keys(r.fileBindings).length,observed.length);
  assert.deepEqual(Object.keys(value),originalKeys);
});

test('scalar, empty containers and repeated references round trip without mutating input',async t=>{
  for(const value of [null,true,false,-0,1,'',[],{},Object.freeze({a:Object.freeze([1,null])})]){
    const p=await pack(t,value),r=await readHistoryPack(p.descriptor,{maxTotalBytes:cap});assert.deepEqual(r.value,value);
  }
  const x={unknown:1}, p=await pack(t,[x,x]),r=await readHistoryPack(p.descriptor,{maxTotalBytes:cap});
  assert.deepEqual(r.value,[x,x]);assert.notEqual(r.value[0],r.value[1]);
});

test('deep structures use iterative traversal and decoding',async t=>{
  let value=null;for(let i=0;i<15000;i++)value=[value];
  const p=await pack(t,value,{chunkTargetBytes:4096}),r=await readHistoryPack(p.descriptor,{maxTotalBytes:cap});
  let v=r.value;for(let i=0;i<15000;i++){assert.equal(v.length,1);v=v[0];}assert.equal(v,null);
  assert.equal(hashJsonStream(value).bytes,30004);
});

test('strict storage refuses cycles, accessors, non-JSON types, sparse/extended arrays',async t=>{
  const cycle={};cycle.self=cycle;const accessor={get secret(){throw Error('must not evaluate');}};
  const extended=[1];extended.extra=true;const symbolic={a:1};symbolic[Symbol('hidden')]=2;
  for(const value of [cycle,accessor,undefined,NaN,Infinity,1n,()=>1,Symbol('value'),new Date(),[,1],extended,symbolic]){
    const directory=path.join(await temp(t),'invalid');await assert.rejects(writeHistoryPack(value,{directory,maxTotalBytes:cap}));
    await assert.rejects(fs.stat(directory),{code:'ENOENT'});
  }
});

test('explicit limits, 500MB maximum and exclusive output directory fail closed',async t=>{
  assert.equal(MAX_CHUNK_BYTES,500_000_000);assert.equal(DEFAULT_CHUNK_BYTES,16*1024*1024);
  const directory=path.join(await temp(t),'pack');
  for(const options of [{},{maxTotalBytes:Infinity},{maxTotalBytes:cap,chunkTargetBytes:MAX_CHUNK_BYTES+1},{maxTotalBytes:cap,chunkTargetBytes:127}])
    await assert.rejects(writeHistoryPack({}, {directory,...options}));
  await assert.rejects(writeHistoryPack('longer-than-1',{directory,maxTotalBytes:1}),/Logical JSON/);
  await assert.rejects(fs.stat(directory),{code:'ENOENT'});
  await writeHistoryPack({}, {directory,maxTotalBytes:cap});
  await assert.rejects(writeHistoryPack({}, {directory,maxTotalBytes:cap}),{code:'EEXIST'});
});

test('encoded aggregate overflow leaves no manifest',async t=>{
  const directory=path.join(await temp(t),'partial');
  await assert.rejects(writeHistoryPack([1,2,3],{directory,maxTotalBytes:8,chunkTargetBytes:128}),/Encoded pack/);
  await assert.rejects(fs.stat(path.join(directory,'manifest.json')),{code:'ENOENT'});
});

test('reader authenticates manifest and caller aggregate authorization before chunks',async t=>{
  const p=await pack(t);await assert.rejects(readHistoryPack(p.descriptor),/maxTotalBytes/);
  await assert.rejects(readHistoryPack({...p.descriptor,sha256:'0'.repeat(64)},{maxTotalBytes:cap}),/Manifest SHA/);
  await assert.rejects(readHistoryPack(p.descriptor,{maxTotalBytes:cap-1}),/authorization/);
  for(const edit of [m=>{m.unknown=1;},m=>{m.version='wrong';},m=>{m.maxChunkBytes++;},m=>{m.totalChunkBytes=cap+1;},m=>{m.maxTotalBytes=1;}]){
    const v=await virtual(p,edit);await assert.rejects(readHistoryPack(v.descriptor,v.options));assert.equal(v.reads.length,1);
  }
});

test('missing, duplicated, reordered and unsafe shard names reject',async t=>{
  const p=await pack(t);
  for(const edit of [m=>{m.chunks.reverse();},m=>{m.chunks[1]=structuredClone(m.chunks[0]);},m=>{m.chunks.shift();},m=>{m.chunks[0].file='../chunk-000000.json';}]){
    const v=await virtual(p,edit);await assert.rejects(readHistoryPack(v.descriptor,v.options),/Missing\/reordered\/unsafe/);
  }
  const v=await virtual(p,()=>{},(files,m)=>files.delete(path.join(path.dirname(p.descriptor.path),m.chunks[0].file)));
  await assert.rejects(readHistoryPack(v.descriptor,v.options),/Missing chunk/);
});

test('shard bytes, SHA, truncation and event counts authenticate independently',async t=>{
  const p=await pack(t);
  for(const edit of [(files,m)=>{const k=path.join(path.dirname(p.descriptor.path),m.chunks[0].file);files.set(k,Buffer.concat([files.get(k),Buffer.from(' ')]));},
    (files,m)=>{const k=path.join(path.dirname(p.descriptor.path),m.chunks[0].file),b=Buffer.from(files.get(k));b[2]^=1;files.set(k,b);},
    (files,m)=>{const k=path.join(path.dirname(p.descriptor.path),m.chunks[0].file),b=files.get(k).subarray(0,-1);files.set(k,b);m.chunks[0].bytes=b.length;m.chunks[0].sha256=sha(b);},
    (_files,m)=>{m.chunks[0].eventCount++;}]){
    const v=await virtual(p,()=>{},edit);await assert.rejects(readHistoryPack(v.descriptor,v.options));
  }
});

test('authenticated malformed event grammar never yields a restored bundle',async t=>{
  const p=await pack(t,null,{chunkTargetBytes:512});
  const bad=[[['a']],[['v',1],['v',2]],[['o'],['k','x'],['v',1],['k','x'],['v',2],['O']],
    [['o'],['v',1],['O']],[['a'],['O']],[['o'],['k','x'],['O']],[['v','text']],
    [['S'],['t','x']],[['S'],['e']],[['t','x']],[['S'],['t','']],[['K'],['t','key'],['e']],[['unknown']]];
  for(const events of bad){const v=await virtual(p,()=>{},(files,m)=>replaceEvents(files,m,events));await assert.rejects(readHistoryPack(v.descriptor,v.options));}
});

test('valid but changed order/value or canonical digest does not pass end-to-end hashes',async t=>{
  const p=await pack(t,{b:1,a:2},{chunkTargetBytes:512});
  for(const events of [[['o'],['k','a'],['v',2],['k','b'],['v',1],['O']],[['o'],['k','b'],['v',2],['k','a'],['v',1],['O']]]){
    const v=await virtual(p,()=>{},(files,m)=>replaceEvents(files,m,events));await assert.rejects(readHistoryPack(v.descriptor,v.options),/Logical order\/value SHA/);
  }
  const v=await virtual(p,m=>{m.canonicalProjectionSha256='0'.repeat(64);});
  await assert.rejects(readHistoryPack(v.descriptor,v.options),/Canonical projection/);
});

test('authenticated invalid UTF8 is rejected before JSON decoding',async t=>{
  const p=await pack(t,'x',{chunkTargetBytes:512});
  const v=await virtual(p,()=>{},(files,m)=>{
    const bytes=Buffer.from([91,91,34,115,34,44,34,0xc3,0x28,34,93,93]),c=m.chunks[0];
    files.set(path.join(path.dirname(p.descriptor.path),c.file),bytes);c.bytes=bytes.length;c.sha256=sha(bytes);m.totalChunkBytes=bytes.length;
  });await assert.rejects(readHistoryPack(v.descriptor,v.options),/encoded data/);
});
