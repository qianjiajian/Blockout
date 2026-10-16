import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import * as previous from './plan-history-adapter-v16.mjs';
import * as next from './plan-history-adapter-v17.mjs';
import {writeHistoryPack, hashJsonStream} from './plan-history-pack-v1.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {levelSha256} from '../formal-v2/contract.mjs';

// Private synthetic historical metadata only. No LevelSpec, actual history,
// construction, model, replay, solver, public ledger or production entry runs.
const sha = b => createHash('sha256').update(b).digest('hex');
const copy = structuredClone;
const cap = 1_000_000;

function fixture() {
  const bytes = new Map(), reads = [];
  const scope = {baseDirectory:'C:/v17-private-metadata', roots:['public','late','reverse','vacancy','capacity','early','earlyPrefix']
    .map(id => ({id,physicalPath:'C:/v17-private-metadata/'+id,aliases:[]}))};
  const canonical = compileCanonicalHistoryPath(scope).canonical;
  const b = {version:next.PLAN_HISTORY_VERSION,scope,baselinePlan:{path:'original-plan.json',sha256:sha('plan')},
    baselineActual:{path:'original-actual.json',sha256:sha('actual')},publicNamespace:canonical(scope.roots[0].physicalPath),
    files:[],archivedBindings:{},publicStocks:[],nearPools:{selected:[],old450:[],history:[]},terminalRecords:[],
    externalPrivate:[],retired:[],legacyReferences:[],closedCampaigns:[],closedExperimentIds:[],oldLiveByteIntegrityClaimed:false,
    baselineFields:{publicStocks:[],previousLateStocks:[],previousMacro:[],comparisonOnly:[],selected:[],old450:[],terminalHistory:[],closedExperimentIds:[]},
    unknown:JSON.parse('{"z":true,"10":"ten","2":"two","01":"leading","__proto__":{"retained":true},"a":null}'),
    unknownArray:[null,{last:'end',first:'start'},false]};
  const doc = (p,q) => {const raw=Buffer.from(JSON.stringify(q));bytes.set(p,raw);return {path:p,sha256:sha(raw)};};
  const archive = (p,q,rootId) => {const d=doc(p,q);b.files.push({...d,rootId,aliases:[p]});b.archivedBindings[p]=d.sha256;return d;};
  for (const state of ['FAILED','ACCEPTED','PENDING']) {
    const id='synthetic-'+state.toLowerCase(), namespace=b.publicNamespace;
    const q={id,levelSha256:sha(id+'-opaque'),shapeSha256:sha(id+'-shape'),colorSha256:sha(id+'-colour'),
      designSha256:sha(id+'-design'),colorAssignments:[],redesignOf:null,unknown:{state,opaque:true}};
    q.retryIdentitySha256=levelSha256({shapeSha256:q.shapeSha256,colorSha256:q.colorSha256});
    const request={descriptor:archive(namespace+'/'+id+'.request.json',q,'public'),value:q};
    let result=null;const blocked=[];
    if(state!=='PENDING') {const value={levelSha256:q.levelSha256,accepted:state==='ACCEPTED',status:'PRIVATE_METADATA_'+state,unknown:[1,null,'retained']};
      result={descriptor:archive(namespace+'/'+id+'.result.json',value,'public'),value};}
    if(state==='FAILED')for(const p of [namespace+'/'+id+'.blocked.json',namespace+'/identities/'+q.retryIdentitySha256+'.blocked.json']) {
      const value={attemptId:id,unknown:'do-not-delete'};blocked.push({descriptor:archive(p,value,'public'),value});
    }
    b.terminalRecords.push({kind:'mathematical',namespace,request,result,blocked,lock:null,unknown:{terminalOrder:b.terminalRecords.length}});
    b.publicStocks.push({...copy(q),...copy(request.descriptor)});
  }
  b.baselineFields.publicStocks=copy(b.publicStocks);
  const c={id:'synthetic-closed',closed:true,restartAllowed:false,consumedInputs:1,maximumInputs:1,unknown:['all','fields']};
  b.closedCampaigns.push({...c,descriptor:archive(scope.roots[1].physicalPath+'/closed.json',c,'late'),raw:copy(c)});
  b.closedExperimentIds.push(c.id);
  const readBytes=async p=>{reads.push(p);assert(bytes.has(p),'Only private metadata map reads permitted: '+p);return bytes.get(p);};
  const reviewDoc=(checkpoint, edit=()=>{})=>{
    const r={status:next.PLAN_HISTORY_REVIEW_STATUS,checkpoint,summary:next.planHistorySummary(b),errors:[],
      newSearches:0,newConstructions:0,newLedgerClaims:0,oldLiveByteIntegrityClaimed:false,
      fullMergedBundleEquality:true,allFieldsPreserved:true,unknownFieldsAndOrderPreserved:true};edit(r);return r;
  };
  const raw=(editReview=()=>{})=>{const checkpoint=doc('checkpoint.json',b),review=doc('review.json',reviewDoc(checkpoint,editReview));
    return {checkpoint,review,expectedScope:scope,readBytes};};
  return {b,bytes,reads,scope,canonical,doc,readBytes,reviewDoc,raw};
}

async function packed(t,f,editReview=()=>{},editManifest=()=>{}) {
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'blockout-v17-metadata-'));
  const resolved=path.resolve(dir);assert.equal(path.dirname(resolved),path.resolve(os.tmpdir()));assert(path.basename(resolved).startsWith('blockout-v17-metadata-'));
  t.after(()=>fs.rm(resolved,{recursive:true,force:true}));
  const p=await writeHistoryPack(f.b,{directory:path.join(dir,'pack'),maxTotalBytes:cap,chunkTargetBytes:128});
  for(const c of p.manifest.chunks) {const name=path.join(path.dirname(p.descriptor.path),c.file);f.bytes.set(name,await fs.readFile(name));}
  const m=copy(p.manifest);editManifest(m);const checkpoint=f.doc(p.descriptor.path,m),review=f.doc('packed-review.json',f.reviewDoc(checkpoint,editReview));
  return {base:{checkpoint,review,expectedScope:f.scope,readBytes:f.readBytes},manifest:m};
}

function normalizedState(s) {
  const {historyDescriptor,reviewDescriptor,headSha256,fileBindings,projectionSha256Recomputed,deltaDescriptors,...rest}=s;
  return rest;
}
function listing(f,extra=[]) {
  return Object.fromEntries(f.scope.roots.map(r=>[r.id,[...f.b.files,...extra].filter(x=>x.rootId===r.id).map(x=>x.path)]));
}
function delta(f,state,change=()=>{}) {
  const file=f.doc(f.scope.roots[1].physicalPath+'/append.json',{unknown:{order:['b','a'],value:null}});
  const files=[{...file,rootId:'late',aliases:[file.path]}];
  const owner={id:'synthetic-owner',namespace:f.canonical(f.scope.roots[1].physicalPath),kind:'construction'};
  const definition={version:'plan-history-owner-v1',...owner,files:files.map(({path,sha256})=>({path,sha256})),attemptIds:[],closedCampaigns:[]};
  const d={version:next.PLAN_HISTORY_VERSION,parentHeadSha256:state.headSha256,owner,files,terminalRecords:[],fullWorlds:[],closedCampaigns:[]};
  const names=listing(f,files);change({d,definition,names});
  owner.definition=f.doc('owner.json',definition);
  return {descriptor:f.doc('delta.json',d),declaredOwner:owner,listing:names,readBytes:f.readBytes};
}

test('v17 reverses exactly to pinned v16; all private functions and old exports are byte-preserved',async()=>{
  const old=await fs.readFile(new URL('./plan-history-adapter-v16.mjs',import.meta.url),'utf8');
  let source=await fs.readFile(new URL('./plan-history-adapter-v17.mjs',import.meta.url),'utf8');
  assert.equal(sha(old),'fd05219f45b8d10364c36aee1b1824b0b56b9439e9a03bcaef2646529c4a28ef');
  const edits=[[
    "import assert from 'node:assert/strict';\nimport {PACK_VERSION, readHistoryPack, hashJsonStream} from './plan-history-pack-v1.mjs';\n\n// v17 changes storage and the whole-bundle hash only. All identity, ownership,\n// membership, freshness and module-owned immutable-state rules remain v16.\nexport const MAX_HISTORY_PACK_BYTES=2_000_000_000;",
    "import assert from 'node:assert/strict';"],
    ['projectionSha256:hashJsonStream(b,{canonical:true}).sha256','projectionSha256:levelSha256(b)'],
    [" const fileBindings={},payload=JSON.parse(await read(checkpoint,readBytes,fileBindings));\n const packed=payload.version===PACK_VERSION;\n const decoded=packed?await readHistoryPack(checkpoint,{readBytes,maxTotalBytes:MAX_HISTORY_PACK_BYTES}):null;\n if(decoded)for(const[p,h]of Object.entries(decoded.fileBindings)){\n  if(fileBindings[p])assert.equal(fileBindings[p],h,'Pack binding conflict');fileBindings[p]=h;\n }\n const b=decoded?.value??payload,r=JSON.parse(await read(review,readBytes,fileBindings));\n if(packed){\n  for(const k of ['fullMergedBundleEquality','allFieldsPreserved','unknownFieldsAndOrderPreserved'])assert.equal(r[k],true,'Pack requires complete independent field/order reconstruction');\n  assert.equal(r.summary?.projectionSha256,decoded.manifest.canonicalProjectionSha256,'Pack projection differs from independent review');\n }",
    ' const fileBindings={},b=JSON.parse(await read(checkpoint,readBytes,fileBindings)),r=JSON.parse(await read(review,readBytes,fileBindings));'],
    ['projectionSha256Recomputed:packed,completeCheckpointBytesAuthenticated:true','projectionSha256Recomputed:false,completeCheckpointBytesAuthenticated:true']];
  for(const [from,to]of edits){assert.equal(source.split(from).length,2);source=source.replace(from,to);}
  assert.equal(source,old);assert.deepEqual(Object.keys(next).filter(k=>k!=='MAX_HISTORY_PACK_BYTES'),Object.keys(previous));
});

test('streamed complete summary matches old canonical hash including all unknown metadata',()=>{
  const f=fixture();assert.deepEqual(next.planHistorySummary(f.b),previous.planHistorySummary(f.b));
  const before=next.planHistorySummary(f.b);f.b.unknownArray[1].extra='new';assert.notEqual(next.planHistorySummary(f.b).projectionSha256,before.projectionSha256);
  const optional={...f.b,optional:undefined,legacySparse:[undefined,,NaN,Infinity]};
  assert.deepEqual(next.planHistorySummary(optional),previous.planHistorySummary(optional));
});

test('legacy v17 API returns every v16 field unchanged and preserves frozen state',async()=>{
  const f=fixture(),args=f.raw(),a=await previous.consumePlanHistory(args),b=await next.consumePlanHistory(args);
  assert.deepEqual(b,a);assert.equal(b.projectionSha256Recomputed,false);assert(Object.isFrozen(b.bundle.unknownArray[1]));
  assert.throws(()=>{b.bundle.unknownArray.push('alter');},TypeError);
});

test('pack returns all legacy fields and FAILED/PENDING/accepted facts, changing only exact storage metadata',async t=>{
  const f=fixture(),raw=await previous.consumePlanHistory(f.raw()),p=await packed(t,f),s=await next.consumePlanHistory(p.base);
  assert.deepEqual(normalizedState(s),normalizedState(raw));assert.equal(s.projectionSha256Recomputed,true);
  assert.equal(s.headSha256,p.base.checkpoint.sha256);assert.deepEqual(s.historyDescriptor,p.base.checkpoint);
  assert.equal(Object.keys(s.fileBindings).length,p.manifest.chunks.length+2);
  assert.deepEqual(Object.keys(s.bundle.unknown),Object.keys(f.b.unknown));assert.deepEqual(Object.keys(s.bundle),Object.keys(f.b));
  assert.equal(s.bundle.terminalRecords[0].blocked.length,2);assert.equal(s.bundle.terminalRecords[2].result,null);
  assert.equal(s.bundle.unknown.__proto__.retained,true);assert.equal({}.retained,undefined);
});

test('raw and pack merge identical metadata through preserved owner and membership checks',async t=>{
  const f=fixture(),raw=await next.consumePlanHistory(f.raw()),p=await packed(t,f),s=await next.consumePlanHistory(p.base);
  const before=hashJsonStream(s.bundle).sha256;
  const a=await next.mergePlanHistoryDelta(raw,delta(f,raw)),b=await next.mergePlanHistoryDelta(s,delta(f,s));
  assert.deepEqual(normalizedState(b),normalizedState(a));assert.equal(b.bundle.files.length,s.bundle.files.length+1);
  assert.equal(hashJsonStream(s.bundle).sha256,before);assert.equal(b.deltaDescriptors.length,1);
  assert.deepEqual(b.bundle.terminalRecords,s.bundle.terminalRecords);assert.deepEqual(b.bundle.unknown,s.bundle.unknown);
});

test('module-owned state cannot be borrowed from v16 or forged by caller freezing',async()=>{
  const f=fixture(),args=f.raw(),old=await previous.consumePlanHistory(args),current=await next.consumePlanHistory(args);
  await assert.rejects(next.mergePlanHistoryDelta(old,delta(f,old)),/consumed\/merged immutable/);
  await assert.rejects(previous.mergePlanHistoryDelta(current,delta(f,current)),/consumed\/merged immutable/);
  await assert.rejects(next.mergePlanHistoryDelta(Object.freeze({...current}),delta(f,current)),/consumed\/merged immutable/);
});

for(const [name,change,pattern]of [
  ['wrong-owner',({definition})=>{definition.id='other';},undefined],
  ['owner-omits-file',({definition})=>{definition.files=[];},undefined],
  ['stale-parent',({d})=>{d.parentHeadSha256='0'.repeat(64);},undefined],
  ['missing-member',({names})=>{names.public.pop();},/Deleted or renamed/],
  ['unknown-member',({names})=>{names.late.push('C:/v17-private-metadata/late/undeclared.json');},/Unknown owner\/member/],
  ['unknown-world-field',({d})=>{d.fullWorlds=[{field:'not-a-stock',level:{opaque:true}}];},/Unknown stock field/],
  ['new-legacy-exemption',({d,definition})=>{d.terminalRecords=[{request:{value:{id:'fake'}},legacyPrivateResultFailure:{baselineOnly:true}}];definition.attemptIds=['fake'];},/New delta cannot manufacture legacy/]
])test('pack merge rejects '+name,async t=>{
  const f=fixture(),p=await packed(t,f),s=await next.consumePlanHistory(p.base),before=hashJsonStream(s.bundle).sha256;
  await assert.rejects(next.mergePlanHistoryDelta(s,delta(f,s,change)),pattern);assert.equal(hashJsonStream(s.bundle).sha256,before);
});

for(const field of ['fullMergedBundleEquality','allFieldsPreserved','unknownFieldsAndOrderPreserved'])
  test('pack requires independent '+field,async t=>{
    const f=fixture(),p=await packed(t,f,r=>{delete r[field];});await assert.rejects(next.consumePlanHistory(p.base),/complete independent/);
  });

for(const [name,edit]of [
  ['projection',r=>{r.summary.projectionSha256='0'.repeat(64);}],['metadata',r=>{r.summary.terminalRecords++;}],
  ['errors',r=>{r.errors=['not-reviewed'];}],['status',r=>{r.status='not-qualified';}],
  ['different-checkpoint',r=>{r.checkpoint={...r.checkpoint,sha256:'0'.repeat(64)};}],
  ['search-claim',r=>{r.newSearches=1;}],['construction-claim',r=>{r.newConstructions=1;}],
  ['ledger-claim',r=>{r.newLedgerClaims=1;}],['live-byte-claim',r=>{r.oldLiveByteIntegrityClaimed=true;}]
])test('pack refuses altered review '+name,async t=>{
  const f=fixture(),p=await packed(t,f,edit);await assert.rejects(next.consumePlanHistory(p.base));
});

test('pack keeps original failed double-blocked and complete root scope guards',async t=>{
  for(const kind of ['blocked','scope']){const f=fixture();if(kind==='blocked')f.b.terminalRecords[0].blocked.pop();else f.b.scope.roots.pop();
    const p=await packed(t,f);await assert.rejects(next.consumePlanHistory(p.base));}
});

for(const [name,edit,pattern]of [
  ['shard-order',m=>{m.chunks.reverse();},/Missing\/reordered\/unsafe/],
  ['missing-shard',m=>{m.chunks.shift();},/Missing\/reordered\/unsafe/],
  ['aggregate-limit',m=>{m.maxTotalBytes=next.MAX_HISTORY_PACK_BYTES+1;},/authorization/],
  ['unknown-schema',m=>{m.extra='not-a-history-field';},/Unexpected storage schema/],
  ['ordered-value-hash',m=>{m.jsonSha256='0'.repeat(64);},/Logical order\/value SHA/]
])test('v17 propagates pack rejection '+name,async t=>{
  const f=fixture(),p=await packed(t,f,()=>{},edit);await assert.rejects(next.consumePlanHistory(p.base),pattern);
});

test('manifest and shard bytes cannot change after descriptors are pinned',async t=>{
  for(const target of ['manifest','shard']){const f=fixture(),p=await packed(t,f);
    const name=target==='manifest'?p.base.checkpoint.path:path.join(path.dirname(p.base.checkpoint.path),p.manifest.chunks[0].file);
    f.bytes.set(name,Buffer.concat([f.bytes.get(name),Buffer.from(' ')]));await assert.rejects(next.consumePlanHistory(p.base),/Descriptor bytes differ|Chunk byte mismatch/);}
});

for(const mutation of ['unknown-value','object-key-order'])test('valid rewritten '+mutation+' remains rejected even with renewed shard SHA',async t=>{
  const f=fixture(),p=await packed(t,f),m=copy(p.manifest),values=[];
  for(const c of m.chunks){const name=path.join(path.dirname(p.base.checkpoint.path),c.file);values.push(...JSON.parse(f.bytes.get(name)));}
  const from=values.findIndex(e=>e[0]==='k'&&e[1]==='unknownArray');assert(from>0);
  // Re-authenticated shards cannot hide unknown-value or object-order drift.
  if(mutation==='unknown-value') {const event=values.find(e=>e[0]==='s'&&e[1]==='start');assert(event);event[1]='start-altered';}
  else {const i=values.findIndex((e,i)=>i>from&&e[0]==='k'&&e[1]==='last');assert(i>from);
    assert.deepEqual(values.slice(i,i+4),[['k','last'],['s','end'],['k','first'],['s','start']]);
    values.splice(i,4,...values.slice(i+2,i+4),...values.slice(i,i+2));}
  const raw=Buffer.from(JSON.stringify(values));m.chunkTargetBytes=raw.length+2;
  m.chunks=[{file:'chunk-000000.json',sha256:sha(raw),bytes:raw.length,eventCount:values.length}];m.totalChunkBytes=raw.length;
  f.bytes.set(path.join(path.dirname(p.base.checkpoint.path),'chunk-000000.json'),raw);
  p.base.checkpoint=f.doc(p.base.checkpoint.path,m);p.base.review=f.doc('packed-review.json',f.reviewDoc(p.base.checkpoint));
  await assert.rejects(next.consumePlanHistory(p.base),/Logical order\/value SHA/);
});
