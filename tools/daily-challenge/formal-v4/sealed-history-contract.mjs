import assert from 'node:assert/strict';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {bodyFootprint} from '../formal-v3/diversity-layout-factory.mjs';

// No filesystem walk, writer, model, solver or ledger creation lives here.
// This authenticates previously reviewed facts, NOT current bytes of old files.
export const SEALED_HISTORY_VERSION='reviewed-sealed-history-v1';
export const SEALED_HISTORY_REVIEW_STATUS='INDEPENDENT_SEALED_HISTORY_PASS';
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
const digest=h=>assert(/^[a-f0-9]{64}$/.test(h??''),'Invalid SHA256');
const text=s=>assert(typeof s==='string'&&s.length>0,'Nonempty string required');
const unique=xs=>assert.equal(new Set(xs).size,xs.length,'Duplicate identity');
const inside=(p,r)=>p===r||p.startsWith(r+'/');
const absolute=p=>path.win32.normalize(p).replaceAll('\\','/').toLowerCase();
const states=new Set(['PENDING','FAILED','STATIC_REJECTED','ACCEPTED','RETIRED']);
const denied=s=>s==='FAILED'||s==='STATIC_REJECTED';
const clone=x=>structuredClone(x);

export function canonicalHistoryPath(file,scope){
 text(file);assert(path.win32.isAbsolute(scope.baseDirectory));
 const p=absolute(path.win32.resolve(scope.baseDirectory,file));
 const matches=scope.roots.flatMap(r=>[r.physicalPath,...r.aliases].map(a=>({from:absolute(a),to:absolute(r.physicalPath)})))
  .filter(x=>inside(p,x.from)).sort((a,b)=>b.from.length-a.from.length);
 if(!matches.length)return p;
 const m=matches[0];return m.to+p.slice(m.from.length);
}
function scopeCheck(scope){
 assert(path.win32.isAbsolute(scope.baseDirectory));assert(Array.isArray(scope.roots)&&scope.roots.length>0);
 unique(scope.roots.map(r=>r.id));const aliases=new Map();
 for(const r of scope.roots){text(r.id);assert(path.win32.isAbsolute(r.physicalPath));assert(Array.isArray(r.aliases));
  for(const a of [r.physicalPath,...r.aliases]){assert(path.win32.isAbsolute(a));const k=absolute(a),v=absolute(r.physicalPath);
   if(aliases.has(k))assert.equal(aliases.get(k),v,'Conflicting root alias');aliases.set(k,v);}}
 for(let i=0;i<scope.roots.length;i++)for(let j=0;j<i;j++){
  const a=absolute(scope.roots[i].physicalPath),b=absolute(scope.roots[j].physicalPath);
  assert(!inside(a,b)&&!inside(b,a),'History roots overlap');}
}
export function sealedWorldIdentity(level){
 assert(level&&Array.isArray(level.blocks)&&level.blocks.length>0);
 const fingerprints=designFingerprints(level);
 // Preserve the existing global partition key exactly; adding board metadata
 // here would quietly permit collisions rejected by the existing consumer.
 const partitionSha256=levelSha256(level.blocks.map(bodyFootprint).sort());
 return{levelSha256:levelSha256(level),...fingerprints,partitionSha256,
  retryIdentitySha256:levelSha256({shapeSha256:fingerprints.shapeSha256,colorSha256:fingerprints.colorSha256})};
}
function fileMap(bundle){return new Map(bundle.files.map(f=>[f.pathIdentity,f]));}
function groups(events){const map=new Map();for(const e of events){const xs=map.get(e.attemptId)??[];xs.push(e);map.set(e.attemptId,xs);}return map;}
function terminal(events){return events.find(e=>e.status!=='PENDING');}
export function assertSealedHistoryBundle(bundle,{expectedScope}={}){
 assert.equal(bundle.version,SEALED_HISTORY_VERSION);scopeCheck(bundle.scope);if(expectedScope)assert.deepEqual(bundle.scope,expectedScope);
 for(const k of ['files','worlds','events','owners','campaigns'])assert(Array.isArray(bundle[k]),k);
 unique(bundle.owners.map(o=>o.id));for(const o of bundle.owners){text(o.id);digest(o.definitionSha256);}
 const owners=new Set(bundle.owners.map(o=>o.id));unique(bundle.files.map(f=>f.pathIdentity));
 const roots=new Map(bundle.scope.roots.map(r=>[r.id,r]));const aliasOwners=new Map();
 for(const f of bundle.files){digest(f.sha256);assert(owners.has(f.ownerId),'Undeclared file owner');assert(f.aliases?.length);unique(f.aliases);
  assert.equal(f.pathIdentity,canonicalHistoryPath(f.pathIdentity,bundle.scope));
  if(f.rootId!==null){assert(roots.has(f.rootId));assert(inside(f.pathIdentity,absolute(roots.get(f.rootId).physicalPath)));}
  else assert(!bundle.scope.roots.some(r=>inside(f.pathIdentity,absolute(r.physicalPath))),'Ledger member mislabelled as external evidence');
  for(const a of f.aliases){assert.equal(canonicalHistoryPath(a,bundle.scope),f.pathIdentity,'Alias does not resolve to declared file');
   const k=absolute(path.win32.resolve(bundle.scope.baseDirectory,a));if(aliasOwners.has(k))assert.equal(aliasOwners.get(k),f.pathIdentity);aliasOwners.set(k,f.pathIdentity);}}
 const files=fileMap(bundle),worlds=new Map();unique(bundle.worlds.map(w=>w.identity.levelSha256));
 for(const w of bundle.worlds){assert.deepEqual(w.identity,sealedWorldIdentity(w.level),'Stored world fingerprints disagree');
  assert(Number.isSafeInteger(w.sourceLevelId)&&w.sourceLevelId>0);assert(w.reference===null||typeof w.reference==='object');
  if(w.reference){digest(w.reference.sha256);assert(files.has(w.reference.pathIdentity));assert.equal(files.get(w.reference.pathIdentity).sha256,w.reference.sha256);}
  assert(w.origins?.length);unique(w.origins.map(o=>o.pathIdentity+'|'+o.field));for(const o of w.origins){assert(files.has(o.pathIdentity),'Missing world origin');text(o.field);}
  worlds.set(w.identity.levelSha256,w);}
 unique(bundle.events.map(e=>e.id));for(const e of bundle.events){text(e.id);text(e.attemptId);assert(states.has(e.status));
  assert(['mathematical','construction','stock'].includes(e.kind));assert(owners.has(e.ownerId));assert(files.has(e.sourceFile));
  assert.equal(files.get(e.sourceFile).ownerId,e.ownerId,'Event owner differs from file owner');assert(worlds.has(e.worldSha256));
  assert(e.parentAttemptId===null||typeof e.parentAttemptId==='string');}
 const attempts=groups(bundle.events);
 for(const [id,events]of attempts){assert(events.length<=2,'An attempt has more than pending + terminal');unique(events.map(e=>e.status));
  assert(events.filter(e=>e.status!=='PENDING').length<=1,'Terminal fact cannot be replaced');
  for(const e of events){const first=events[0];for(const k of ['ownerId','kind','worldSha256','parentAttemptId'])assert.equal(e[k],first[k],'Attempt facts conflict');
   if(e.parentAttemptId!==null){assert.notEqual(e.parentAttemptId,id);const parent=attempts.get(e.parentAttemptId);assert(parent,'Missing parent attempt');assert(denied(terminal(parent)?.status),'Parent must be terminal failed');}}
  const visited=new Set([id]);let current=events[0];while(current.parentAttemptId!==null){assert(!visited.has(current.parentAttemptId),'Parent cycle');visited.add(current.parentAttemptId);current=attempts.get(current.parentAttemptId)[0];}}
 // Every stored world is classified. Unknown schema/image extraction cannot silently disappear.
 for(const h of worlds.keys())assert(bundle.events.some(e=>e.worldSha256===h),'Unclassified stored world');
 unique(bundle.campaigns.map(c=>c.id));for(const c of bundle.campaigns){text(c.id);assert(owners.has(c.ownerId));assert(files.has(c.sourceFile));
  assert(Number.isSafeInteger(c.maximumInputs)&&c.maximumInputs>=0);assert(Number.isSafeInteger(c.consumedInputs)&&c.consumedInputs>=0&&c.consumedInputs<=c.maximumInputs);
  assert.equal(c.closed,true,'Only final, closed quota facts may be sealed');assert.equal(c.restartAllowed,false);}
 assert.equal(bundle.liveOldBytesRevalidated,false);return true;
}
export function sealedHistorySummary(bundle){
 assertSealedHistoryBundle(bundle);return{scopeSha256:levelSha256(bundle.scope),files:bundle.files.length,
  aliases:bundle.files.reduce((n,f)=>n+f.aliases.length,0),worlds:bundle.worlds.length,events:bundle.events.length,
  owners:bundle.owners.length,campaigns:bundle.campaigns.length,
  statuses:Object.fromEntries([...states].map(s=>[s,bundle.events.filter(e=>e.status===s).length])),
  roots:bundle.scope.roots.map(r=>({id:r.id,members:bundle.files.filter(f=>f.rootId===r.id).length})),
  semanticSha256:levelSha256({files:bundle.files,worlds:bundle.worlds,events:bundle.events,owners:bundle.owners,campaigns:bundle.campaigns})};
}
async function readDescriptor(d,readBytes){text(d.path);digest(d.sha256);const b=await readBytes(d.path);assert.equal(sha256(b),d.sha256,'Descriptor bytes differ');return JSON.parse(b);}
/** The caller pins BOTH descriptors and the full expected root/alias scope.
 * An independent review is a trust anchor, not a signature invented here. */
export async function consumeReviewedHistory({bundle:descriptor,review:reviewDescriptor,expectedScope,readBytes}){
 assert(expectedScope,'Explicit expected history scope required');const review=await readDescriptor(reviewDescriptor,readBytes);
 assert.equal(review.status,SEALED_HISTORY_REVIEW_STATUS);assert.deepEqual(review.bundle,descriptor);assert.deepEqual(review.errors,[]);
 for(const k of ['newSearches','newConstructions','newLedgerClaims'])assert.equal(review[k],0);
 const bundle=await readDescriptor(descriptor,readBytes);assertSealedHistoryBundle(bundle,{expectedScope});assert.deepEqual(review.summary,sealedHistorySummary(bundle));
 assert.equal(review.oldLiveByteIntegrityClaimed,false);
 return{bundle:clone(bundle),descriptor:clone(descriptor),review:clone(reviewDescriptor),headSha256:descriptor.sha256,liveOldBytesRevalidated:false};
}
/** Directory inventory is supplied by a complete, no-follow enumeration of each
 * declared root. It checks presence/names only; it is NOT a content-hash audit. */
export function assertHistoryMembership(bundle,listing,newFiles=[]){
 assert.deepEqual(Object.keys(listing).sort(),bundle.scope.roots.map(r=>r.id).sort(),'Missing or extra history root');
 const expected=new Map(bundle.files.filter(f=>f.rootId!==null).map(f=>[f.pathIdentity,f]));
 for(const f of newFiles)if(f.rootId!==null){assert(!expected.has(f.pathIdentity),'Old path cannot be rewritten');expected.set(f.pathIdentity,f);}
 const seen=new Set();for(const root of bundle.scope.roots){assert(Array.isArray(listing[root.id]));
  for(const name of listing[root.id]){const p=canonicalHistoryPath(name,bundle.scope);assert(!seen.has(p),'Duplicate/aliased inventory entry');seen.add(p);
   assert(expected.has(p),'Unknown writer or undeclared new file');assert.equal(expected.get(p).rootId,root.id);}}
 assert.deepEqual([...seen].sort(),[...expected.keys()].sort(),'Old member deleted or renamed');return true;
}
/** Append facts only. The caller declares the permitted owner and delta digest
 * before reading it; a delta cannot authorize itself. No old bytes are read. */
export async function mergeDeclaredHistoryDelta(state,{descriptor,declaredOwner,listing,readBytes,validateOwnerFacts}){
 assertSealedHistoryBundle(state.bundle);const delta=await readDescriptor(descriptor,readBytes);
 assert.equal(typeof validateOwnerFacts,'function','A caller-pinned owner decoder/review must verify raw file semantics');
 assert.equal(delta.version,SEALED_HISTORY_VERSION);assert.equal(delta.parentHeadSha256,state.headSha256,'Stale delta head');
 assert.deepEqual(delta.owner,declaredOwner,'Unknown delta owner');text(declaredOwner.id);digest(declaredOwner.definitionSha256);
 for(const k of ['files','worlds','events','campaigns'])assert(Array.isArray(delta[k]));
 const next=clone(state.bundle),owners=new Map(next.owners.map(o=>[o.id,o]));
 if(owners.has(declaredOwner.id))assert.deepEqual(owners.get(declaredOwner.id),declaredOwner);else next.owners.push(clone(declaredOwner));
 const files=fileMap(next),newBytes=new Map();for(const f of delta.files){assert.equal(f.ownerId,declaredOwner.id);assert(!files.has(f.pathIdentity),'Old path cannot be rewritten');
  // Validate every new file, including external construction outputs named by a terminal record.
  const raw=await readBytes(f.aliases[0]);assert.equal(sha256(raw),f.sha256,'Delta file SHA differs');newBytes.set(f.pathIdentity,raw);files.set(f.pathIdentity,f);next.files.push(clone(f));}
 // A digest alone cannot prove that a raw FAILED record was not projected as
 // ACCEPTED. The future integration supplies a pinned decoder for its declared
 // owner, or an independently bound delta review. Unknown schemas must throw.
 assert.equal(await validateOwnerFacts({owner:clone(declaredOwner),delta:clone(delta),newBytes}),true,'Delta owner facts not verified');
 const existingWorlds=new Map(next.worlds.map(w=>[w.identity.levelSha256,w]));
 for(const w of delta.worlds){for(const o of w.origins)assert(delta.files.some(f=>f.pathIdentity===o.pathIdentity),'Delta world origin not in new files');
  if(existingWorlds.has(w.identity.levelSha256)){const old=existingWorlds.get(w.identity.levelSha256);
   for(const k of ['level','identity','sourceLevelId','reference'])assert.deepEqual(w[k],old[k],'Conflicting world or family metadata');
   for(const o of w.origins){assert(!old.origins.some(x=>x.pathIdentity===o.pathIdentity&&x.field===o.field));old.origins.push(clone(o));}}
  else{next.worlds.push(clone(w));existingWorlds.set(w.identity.levelSha256,next.worlds.at(-1));}}
 for(const e of delta.events){assert.equal(e.ownerId,declaredOwner.id);assert(delta.files.some(f=>f.pathIdentity===e.sourceFile));next.events.push(clone(e));}
 for(const c of delta.campaigns){assert.equal(c.ownerId,declaredOwner.id);assert(!next.campaigns.some(x=>x.id===c.id),'Campaign quota cannot be overwritten or restarted');next.campaigns.push(clone(c));}
 assertSealedHistoryBundle(next);assertHistoryMembership(state.bundle,listing,delta.files);
 return{...state,bundle:next,headSha256:descriptor.sha256,deltaDescriptors:[...(state.deltaDescriptors??[]),clone(descriptor)],liveOldBytesRevalidated:false};
}
const identityEvents=(bundle,w)=>bundle.events.filter(e=>{
 const other=bundle.worlds.find(x=>x.identity.levelSha256===e.worldSha256);
 return other.identity.retryIdentitySha256===w.identity.retryIdentitySha256||other.identity.designSha256===w.identity.designSha256;});
export function assertHistoryReference(bundle,attemptId){
 assertSealedHistoryBundle(bundle);const events=bundle.events.filter(e=>e.attemptId===attemptId),end=terminal(events);
 assert(end?.status==='ACCEPTED','Reference must be accepted, not failed/pending/retired');
 const w=bundle.worlds.find(w=>w.identity.levelSha256===end.worldSha256);
 const related=identityEvents(bundle,w),attempts=groups(related);
 assert(!related.some(e=>denied(e.status)||e.status==='RETIRED'),'Historical failure or retirement remains protected');
 assert(![...attempts.values()].some(es=>!terminal(es)),'Pending physical identity');return clone(w);
}
export function changedHistoryShapeAndColour(previous,next){
 if(previous.shapeSha256===next.shapeSha256||previous.colorSha256===next.colorSha256)return false;
 const before=new Map(previous.colorAssignments.map(b=>[b.id,JSON.stringify(b.colors)])),shared=next.colorAssignments.filter(b=>before.has(b.id));
 return shared.length?shared.some(b=>before.get(b.id)!==JSON.stringify(b.colors)):
  levelSha256(previous.colorAssignments.map(b=>b.colors).sort())!==levelSha256(next.colorAssignments.map(b=>b.colors).sort());
}
export function assertFreshHistoryInput(bundle,level,{sourceLevelId,reference=null,failedParentAttemptId=null}={}){
 assertSealedHistoryBundle(bundle);assert(Number.isSafeInteger(sourceLevelId));const f=sealedWorldIdentity(level);
 for(const w of bundle.worlds){assert(w.identity.retryIdentitySha256!==f.retryIdentitySha256&&w.identity.designSha256!==f.designSha256,'Existing physical/design identity');
  assert.notEqual(w.identity.partitionSha256,f.partitionSha256,'Existing physical partition');
  if(w.sourceLevelId===sourceLevelId&&reference!==null&&w.reference?.pathIdentity===reference.pathIdentity&&w.reference.sha256===reference.sha256)
   assert(changedHistoryShapeAndColour(w.identity,f),'Same source/reference requires changed shape AND actual colour');}
 if(failedParentAttemptId!==null){const events=bundle.events.filter(e=>e.attemptId===failedParentAttemptId),end=terminal(events);assert(end&&denied(end.status),'Parent must be terminal failed');
  const w=bundle.worlds.find(w=>w.identity.levelSha256===end.worldSha256);assert.equal(w.sourceLevelId,sourceLevelId);
  assert(changedHistoryShapeAndColour(w.identity,f),'Failed parent requires changed shape AND actual colour');
  const todo=[failedParentAttemptId],seen=new Set(todo),attempts=groups(bundle.events);while(todo.length){const id=todo.shift();for(const [child,es]of attempts){if(es[0].parentAttemptId!==id||seen.has(child))continue;
   seen.add(child);assert(terminal(es)?.status==='ACCEPTED','Parent has later failed, pending or retired descendant');todo.push(child);}}}
 return{freshIdentity:true,mathematicalAcceptance:false,nearChecksStillRequired:true};
}
export function historyComparisonPools(bundle){
 assertSealedHistoryBundle(bundle);return{allHistoricalWorlds:clone(bundle.worlds),protectedNearWorlds:clone(bundle.worlds.filter(w=>
  bundle.events.some(e=>e.worldSha256===w.identity.levelSha256&&['ACCEPTED','RETIRED','PENDING'].includes(e.status)))),
  thresholdsChanged:false,nearExemptionsGranted:false,liveOldBytesRevalidated:false};
}
