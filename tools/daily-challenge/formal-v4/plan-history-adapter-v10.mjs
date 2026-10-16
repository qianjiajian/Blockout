import assert from 'node:assert/strict';
import path from 'node:path';
import {levelSha256} from '../formal-v2/contract.mjs';
import {sha256,sealedWorldIdentity,changedHistoryShapeAndColour} from './sealed-history-contract.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';

// Consumer v7 (v6 sharing plus module-owned frozen world memoization): preserve the v2 checkpoint bytes/schema; a legacy private
// previous-attempt edge may point to an accepted result. It is not a failed parent.
// Archived facts are authoritative only after an independently pinned review.
// No walk, export, writer, ledger creation, model or solver is implemented here.
export const PLAN_HISTORY_VERSION='reviewed-plan-history-v2-legacy-private-failure';
export const PLAN_HISTORY_REVIEW_STATUS='INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS';
const clone=x=>structuredClone(x),hash=h=>assert(/^[a-f0-9]{64}$/.test(h??''),'Invalid SHA256');
const descriptor=d=>{assert(typeof d?.path==='string'&&d.path.length);hash(d.sha256);};
const unique=xs=>assert.equal(new Set(xs).size,xs.length,'Duplicate history identity');
const key=r=>r.namespace+'|'+r.request.value.id;
const at=(q,field)=>field.split('.').reduce((v,k)=>v?.[k],q);
const fields=new Set(['level','placeholderWorld','plain.level','built.level','built.placeholderWorld','built.plain.level','constructionTemplateLevel','templateLevel','constructionTemplatePacket.level','input.level','construction.level']);
const status=r=>r.result===null||r.lock!==null?'PENDING':r.result.value.accepted?'ACCEPTED':'FAILED';
// Scope is fixed within a validated operation. Replacement selects a new
// immutable compiler; validate always clears it before checking mutable data.
const canonicalCompilers=new WeakMap();
const canonical=(b,p)=>{let entry=canonicalCompilers.get(b);if(!entry||entry.scope!==b.scope){entry={scope:b.scope,compiler:compileCanonicalHistoryPath(b.scope)};canonicalCompilers.set(b,entry);}return entry.compiler.canonical(p);};
const fileIndexes=new WeakMap();
const files=b=>{if(!fileIndexes.has(b))fileIndexes.set(b,new Map(b.files.map(f=>[canonical(b,f.path),f])));return fileIndexes.get(b);};
const related=(a,b)=>a.designSha256===b.designSha256||levelSha256({shapeSha256:a.shapeSha256,colorSha256:a.colorSha256})===levelSha256({shapeSha256:b.shapeSha256,colorSha256:b.colorSha256});
const sameReference=(b,a,c)=>a?.path&&c?.path?canonical(b,a.path)===canonical(b,c.path)&&a.sha256===c.sha256:levelSha256(a)===levelSha256(c);
function bound(b,d){descriptor(d);assert.equal(files(b).get(canonical(b,d.path))?.sha256,d.sha256,'Unbound historical file');}
function rawRecord(b,r){
 assert(['mathematical','construction'].includes(r.kind));assert(path.win32.isAbsolute(r.namespace));assert.equal(r.namespace,canonical(b,r.namespace));
 const q=r.request.value;bound(b,r.request.descriptor);for(const k of ['levelSha256','shapeSha256','colorSha256','designSha256'])hash(q[k]);assert(Array.isArray(q.colorAssignments));
 const retry=levelSha256({shapeSha256:q.shapeSha256,colorSha256:q.colorSha256});if(q.retryIdentitySha256)assert.equal(q.retryIdentitySha256,retry);
 assert.equal(canonical(b,r.request.descriptor.path),r.namespace+'/'+q.id+'.request.json');assert(q.redesignOf===null||typeof q.redesignOf==='string');
 assert(Array.isArray(r.blocked));for(const x of r.blocked){bound(b,x.descriptor);const p=canonical(b,x.descriptor.path);
  assert([r.namespace+'/'+(q.identityOrigin??q.revalidates??q.id)+'.blocked.json',r.namespace+'/identities/'+retry+'.blocked.json'].includes(p));
  assert(typeof x.value.attemptId==='string'||Array.isArray(x.value.attemptIds),'Invalid blocked record');}
 if(r.result!==null){bound(b,r.result.descriptor);assert.equal(canonical(b,r.result.descriptor.path),r.namespace+'/'+q.id+'.result.json');
  assert.equal(r.result.value.levelSha256,q.levelSha256);assert.equal(typeof r.result.value.accepted,'boolean');assert.equal(typeof r.result.value.status,'string');
  if(!r.result.value.accepted&&!r.legacyPrivateResultFailure)assert.equal(new Set(r.blocked.map(x=>canonical(b,x.descriptor.path))).size,2,'FAILED requires both blocked aliases');}
 if(r.legacyPrivateResultFailure){const legacy=r.legacyPrivateResultFailure;assert.equal(legacy.baselineOnly,true);assert.equal(r.kind,'mathematical');assert.equal(r.result?.value.accepted,false);assert.deepEqual(r.blocked,[]);assert.equal(r.lock,null);
  assert(!b.scope.roots.some(root=>r.namespace===canonical(b,root.physicalPath)),'Legacy private exception cannot apply to seven shared roots');
  const node=b.externalPrivate.find(x=>x.namespace===r.namespace&&x.id===q.id);assert(node,'Legacy private failure must be in exact reviewed external allowlist');
  for(const k of ['request','result'])assert.deepEqual(node[k],r[k].descriptor);assert.deepEqual(node.packet,legacy.packet.descriptor);bound(b,legacy.packet.descriptor);
  const packet=legacy.packet.value;assert.equal(packet.accepted,false);assert.equal(levelSha256(packet.level),q.levelSha256);assert.deepEqual(packet.proof?.attempt??packet.attempt,q);
  assert.deepEqual(legacy.missingBlockedFiles,[r.namespace+'/'+(q.identityOrigin??q.revalidates??q.id)+'.blocked.json',r.namespace+'/identities/'+retry+'.blocked.json']);
  for(const p of legacy.missingBlockedFiles)assert(!files(b).has(canonical(b,p)),'Claimed absent seal is present');}
 if(r.lock!==null){bound(b,r.lock.descriptor);assert.equal(canonical(b,r.lock.descriptor.path),r.namespace+'/'+(q.revalidates??q.identityOrigin??q.id)+'.revalidation.lock');assert.equal(r.lock.value,q.id);}
 return r;
}
function legacyAcceptedPrevious(b,child,parent){
 if(!child.legacyPrivateResultFailure||child.kind!=='mathematical'||parent.kind!=='mathematical'||status(parent)!=='ACCEPTED'||child.namespace!==parent.namespace)return false;
 if(b.scope.roots.some(root=>child.namespace===canonical(b,root.physicalPath)))return false;
 const c=b.externalPrivate.find(x=>x.namespace===child.namespace&&x.id===child.request.value.id),p=b.externalPrivate.find(x=>x.namespace===parent.namespace&&x.id===parent.request.value.id);
 if(!c||!p)return false;
 for(const [node,r]of [[c,child],[p,parent]])for(const k of ['request','result'])if(levelSha256(node[k])!==levelSha256(r[k].descriptor))return false;
 return c.redesignOf===parent.request.value.id&&child.request.value.redesignOf===parent.request.value.id&&c.accepted===false&&p.accepted===true;
}
function validate(b,expectedScope){
 canonicalCompilers.delete(b);
 fileIndexes.delete(b);
 assert.equal(b.version,PLAN_HISTORY_VERSION);assert.deepEqual(b.scope,expectedScope);assert.equal(b.scope.roots.length,7);unique(b.scope.roots.map(r=>r.id));
 const roots=new Map(b.scope.roots.map(r=>[r.id,canonical(b,r.physicalPath)]));unique([...roots.values()]);
 for(const r of b.scope.roots){assert(path.win32.isAbsolute(r.physicalPath));assert(Array.isArray(r.aliases));for(const a of r.aliases)assert(path.win32.isAbsolute(a));}
 const prefixes=b.scope.roots.flatMap(r=>[r.physicalPath,...r.aliases].map(p=>[path.win32.normalize(p).toLowerCase(),roots.get(r.id)]));
 for(const [a,to]of prefixes)for(const [c,target]of prefixes)if(a===c)assert.equal(to,target,'Conflicting alias');
 for(const a of roots.values())for(const c of roots.values())if(a!==c)assert(!a.startsWith(c+'/'),'Overlapping canonical roots');
 descriptor(b.baselinePlan);descriptor(b.baselineActual);assert.equal(b.oldLiveByteIntegrityClaimed,false);
 for(const k of ['files','publicStocks','terminalRecords','externalPrivate','retired','legacyReferences','closedCampaigns','closedExperimentIds'])assert(Array.isArray(b[k]),k);
 for(const k of ['selected','old450','history'])assert(Array.isArray(b.nearPools?.[k]),k);
 assert(b.baselineFields&&typeof b.baselineFields==='object');assert.deepEqual(b.publicStocks.slice(0,b.baselineFields.publicStocks.length),b.baselineFields.publicStocks,'Original publicStocks prefix changed');
 for(const k of ['previousLateStocks','previousMacro','comparisonOnly','selected','old450','terminalHistory','closedExperimentIds'])assert(Array.isArray(b.baselineFields[k]),k);
 unique(b.files.map(f=>canonical(b,f.path)));for(const f of b.files){descriptor(f);assert(Array.isArray(f.aliases));
  for(const a of f.aliases)assert.equal(canonical(b,a),canonical(b,f.path),'Not an actual same-root alias');
  const containing=[...roots].filter(([,p])=>canonical(b,f.path).startsWith(p+'/'));assert.equal(containing[0]?.[0]??null,f.rootId,'Wrong root membership');
  for(const a of [f.path,...f.aliases])assert.equal(b.archivedBindings[a],f.sha256,'Archived alias SHA disagreement');}
 // Only actual levels already validated AND recursively sealed by this module
 // may reuse their hash/identity. New or mutable levels are recomputed. Every
 // descriptor and declared fingerprint is still checked on every validation.
 const validatedIdentities=new Map(),pendingWorlds=new Map();
 for(const pool of Object.values(b.nearPools))for(const w of pool){bound(b,w.descriptor);const cached=cachedWorld(w.level),actualLevelSha256=cached?.levelSha256??levelSha256(w.level);
  let f=validatedIdentities.get(actualLevelSha256);if(!f){f=cached?.identity??sealedWorldIdentity(w.level);validatedIdentities.set(actualLevelSha256,f);}
  if(w.fingerprints)for(const [k,v]of Object.entries(w.fingerprints))assert.deepEqual(f[k],v,'World fingerprint conflict');
  if(!cached)pendingWorlds.set(w.level,{levelSha256:actualLevelSha256,identity:f});}
 for(const r of b.retired){bound(b,r.descriptor);assert(['design','skeleton','reference-family'].includes(r.kind),'Unknown retirement classifier');
  if(r.kind==='design')hash(r.designSha256);else if(r.kind==='skeleton'){assert(r.anchors?.length);assert(Array.isArray(r.gates));}else{assert(r.references?.length);r.references.forEach(d=>bound(b,d));}}
 for(const r of b.legacyReferences){bound(b,r.receipt);bound(b,r.review);hash(r.levelSha256);assert.equal(r.referenceOnly,true);}
 unique(b.terminalRecords.map(key));for(const r of b.terminalRecords)rawRecord(b,r);
 const records=new Map(b.terminalRecords.map(r=>[key(r),r]));
 for(const r of b.terminalRecords){for(const x of r.blocked)for(const id of x.value.attemptIds??[x.value.attemptId]){
  const failed=records.get(r.namespace+'|'+id);assert(failed?.result?.value.accepted===false&&related(failed.request.value,r.request.value),'Blocked alias lacks exact failed identity');}
  const seen=new Set([r.request.value.id]);let current=r,q=r.request.value;while(q.redesignOf!==null){assert(!seen.has(q.redesignOf),'Parent cycle');seen.add(q.redesignOf);
   const parent=records.get(current.namespace+'|'+q.redesignOf);assert(parent&&(status(parent)==='FAILED'||legacyAcceptedPrevious(b,current,parent)),'Missing or nonfailed parent');current=parent;q=parent.request.value;}}
 assert([...roots.values()].includes(b.publicNamespace));for(const s of b.publicStocks){const {path:p,sha256:h,...q}=s,r=records.get(b.publicNamespace+'|'+q.id);
  assert(r?.kind==='mathematical','Public identity lacks mathematical terminal/pending classification');assert.deepEqual(r.request.value,q);assert.deepEqual(r.request.descriptor,{path:p,sha256:h});}
 unique(b.closedExperimentIds);unique(b.closedCampaigns.map(c=>c.id));for(const c of b.closedCampaigns){assert(b.closedExperimentIds.includes(c.id));assert.equal(c.closed,true);assert.equal(c.restartAllowed,false);
  bound(b,c.descriptor);assert(Number.isSafeInteger(c.consumedInputs)&&c.consumedInputs>=0&&c.consumedInputs<=c.maximumInputs);}
 pendingValidatedWorlds.set(b,pendingWorlds);
 return b;
}
function planHistoryMetadataSummary(b){return{baselinePlan:b.baselinePlan,baselineActual:b.baselineActual,scopeSha256:levelSha256(b.scope),
 publicStocks:b.publicStocks.length,nearPools:Object.fromEntries(Object.entries(b.nearPools).map(([k,v])=>[k,v.length])),files:b.files.length,
 terminalRecords:b.terminalRecords.length,externalPrivate:b.externalPrivate.length,closedCampaigns:b.closedCampaigns.length};}
// Exporters/reviewers may compute the original projection once. Consumers
// authenticate the full checkpoint bytes and the independently pinned review.
export function planHistorySummary(b){return{...planHistoryMetadataSummary(b),projectionSha256:levelSha256(b)};}
async function read(d,readBytes,bindings){descriptor(d);const bytes=await readBytes(d.path);assert.equal(sha256(bytes),d.sha256,'Descriptor bytes differ');
 if(bindings[d.path])assert.equal(bindings[d.path],d.sha256,'Binding conflict');bindings[d.path]=d.sha256;return bytes;}
// A v7 state owns its parsed JSON graph. Caller Object.freeze is never proof of
// validation. Cache keys are actual object identities, not declared hashes.
// Pending results become reusable only after ALL validation/member checks and
// recursive state sealing have succeeded. Failed operations publish nothing.
const sealedObjects=new WeakSet(),immutableStates=new WeakSet();
const validatedWorlds=new WeakMap(),pendingValidatedWorlds=new WeakMap();
const cachedWorld=level=>sealedObjects.has(level)?validatedWorlds.get(level):undefined;
const actualWorldHash=level=>cachedWorld(level)?.levelSha256??levelSha256(level);
const actualWorldIdentity=level=>cachedWorld(level)?.identity??sealedWorldIdentity(level);
function sealOwned(value){
 if(value===null||typeof value!=='object'||sealedObjects.has(value))return value;
 for(const child of Object.values(value))sealOwned(child);
 Object.freeze(value);sealedObjects.add(value);return value;
}
function shareForMerge(state){
 assert(immutableStates.has(state),'Merge requires a consumed/merged immutable v6 state');
 const b=state.bundle;
 // These are all containers written by the unchanged merge below. Old nested
 // records remain frozen and shared; pending updates replace a whole record.
 return{...b,files:[...b.files],publicStocks:[...b.publicStocks],
  terminalRecords:[...b.terminalRecords],archivedBindings:{...b.archivedBindings},
  nearPools:{...b.nearPools,history:[...b.nearPools.history]},
  closedCampaigns:[...b.closedCampaigns],closedExperimentIds:[...b.closedExperimentIds]};
}
function sealState(state){
 sealOwned(state);
 for(const [level,result]of pendingValidatedWorlds.get(state.bundle)??[]){
  assert(sealedObjects.has(level),'Validated world was not recursively sealed');
  sealOwned(result);validatedWorlds.set(level,result);
 }
 pendingValidatedWorlds.delete(state.bundle);immutableStates.add(state);return state;
}
function stateOf(b,extra){return sealState({...extra,bundle:b,baselinePlan:b.baselinePlan,baselineActual:b.baselineActual,publicStocks:b.publicStocks,nearPools:b.nearPools,
 fullWorlds:Object.values(b.nearPools).flat(),terminalByAttempt:Object.fromEntries(b.terminalRecords.map(r=>[key(r),r])),externalPrivate:b.externalPrivate,
 retired:b.retired,closedCampaigns:b.closedCampaigns,closedExperimentIds:b.closedExperimentIds,archivedBindings:b.archivedBindings,
 baselineFields:b.baselineFields,selectedDescriptors:b.baselineFields.selected,old450Descriptors:b.baselineFields.old450,oldLiveByteIntegrityClaimed:false});}
export async function consumePlanHistory({checkpoint,review,expectedScope,readBytes}){
 const fileBindings={},b=JSON.parse(await read(checkpoint,readBytes,fileBindings)),r=JSON.parse(await read(review,readBytes,fileBindings));
 validate(b,expectedScope);assert.equal(r.status,PLAN_HISTORY_REVIEW_STATUS);assert.deepEqual(r.checkpoint,checkpoint);
 const {projectionSha256,...metadata}=r.summary;hash(projectionSha256);assert.deepEqual(metadata,planHistoryMetadataSummary(b));assert.deepEqual(r.errors,[]);
 for(const k of ['newSearches','newConstructions','newLedgerClaims'])assert.equal(r[k],0);assert.equal(r.oldLiveByteIntegrityClaimed,false);
 return stateOf(b,{historyDescriptor:clone(checkpoint),reviewDescriptor:clone(review),headSha256:checkpoint.sha256,fileBindings,
  reviewedProjectionSha256:projectionSha256,projectionSha256Recomputed:false,completeCheckpointBytesAuthenticated:true});
}
// Caller supplies COMPLETE no-follow enumeration, including non-JSON locks.
// Presence is checked; unchanged names do not prove unchanged live old bytes.
export function assertPlanHistoryMembers(state,listing,allowedNewFiles=[]){
 const b=state.bundle,expected=new Map(b.files.filter(f=>f.rootId!==null).map(f=>[canonical(b,f.path),f.rootId]));
 assert.deepEqual(Object.keys(listing).sort(),b.scope.roots.map(r=>r.id).sort());
 for(const f of allowedNewFiles){assert(!expected.has(canonical(b,f.path)),'Old member cannot be overwritten');assert(b.scope.roots.some(r=>r.id===f.rootId));
  const root=b.scope.roots.find(r=>r.id===f.rootId);assert(canonical(b,f.path).startsWith(canonical(b,root.physicalPath)+'/'));expected.set(canonical(b,f.path),f.rootId);}
 const seen=new Set();for(const [rootId,names]of Object.entries(listing)){assert(Array.isArray(names));for(const p of names){const c=canonical(b,p);assert(!seen.has(c),'Duplicate membership alias');seen.add(c);assert.equal(expected.get(c),rootId,'Unknown owner/member');}}
 assert.deepEqual([...seen].sort(),[...expected.keys()].sort(),'Deleted or renamed sealed member');return true;
}
// A predeclared owner definition explicitly enumerates every output and attempt.
// It is an output manifest, NOT a new identity ledger. Unknown owner schemas fail.
export async function mergePlanHistoryDelta(state,{descriptor:deltaDescriptor,declaredOwner,listing,readBytes}){
 const bindings={...state.fileBindings},d=JSON.parse(await read(deltaDescriptor,readBytes,bindings)),owner=JSON.parse(await read(declaredOwner.definition,readBytes,bindings));
 assert.equal(d.version,PLAN_HISTORY_VERSION);assert.equal(d.parentHeadSha256,state.headSha256);assert.deepEqual(d.owner,declaredOwner);
 assert.equal(owner.version,'plan-history-owner-v1');for(const k of ['id','namespace','kind'])assert.equal(owner[k],declaredOwner[k]);assert(['mathematical','construction'].includes(owner.kind));
 assert(state.bundle.scope.roots.some(r=>canonical(state.bundle,r.physicalPath)===owner.namespace),'New namespace outside seven roots');
 assert.equal(owner.namespace===state.bundle.publicNamespace,owner.kind==='mathematical','Public math and construction ownership differ');
 assert.deepEqual(owner.files,d.files.map(({path,sha256})=>({path,sha256})));assert.deepEqual(owner.attemptIds,d.terminalRecords.map(r=>r.request.value.id));assert.deepEqual(owner.closedCampaigns,d.closedCampaigns);
 const b=shareForMerge(state),old=files(b),raw=new Map();assert(!b.closedExperimentIds.includes(owner.id),'Closed campaign cannot reopen');
 for(const f of d.files){assert(!old.has(canonical(b,f.path)),'Old canonical path rewrite');assert(!raw.has(canonical(b,f.path)),'Duplicate delta path');
  const bytes=await read(f,readBytes,bindings);raw.set(canonical(b,f.path),bytes);b.files.push(clone(f));for(const p of new Set([f.path,...f.aliases])){assert(!(p in b.archivedBindings),'Archived alias rewrite');b.archivedBindings[p]=f.sha256;}}
 fileIndexes.delete(b);const used=new Set();
 const rawJSON=async(x)=>{const p=canonical(b,x.descriptor.path);let bytes=raw.get(p);used.add(p);
  if(!bytes){bound(state.bundle,x.descriptor);bytes=await read(x.descriptor,readBytes,bindings);}
  assert.equal(sha256(bytes),x.descriptor.sha256);assert.deepEqual(JSON.parse(bytes),x.value);};
 for(const r of d.terminalRecords){assert(!r.legacyPrivateResultFailure,'New delta cannot manufacture legacy private exceptions');assert.equal(r.namespace,owner.namespace);assert.equal(r.kind,owner.kind);await rawJSON(r.request);if(r.result)await rawJSON(r.result);for(const x of r.blocked)await rawJSON(x);
  if(r.lock){const bytes=raw.get(canonical(b,r.lock.descriptor.path));assert(bytes);assert.equal(bytes.toString(),r.lock.value);}
  const oldIndex=b.terminalRecords.findIndex(x=>key(x)===key(r));if(oldIndex>=0){const previous=b.terminalRecords[oldIndex];
   assert.equal(previous.result,null,'Immutable terminal cannot be overwritten');assert.equal(previous.lock,null,'Sealed active lock needs a new independently reviewed baseline');
   for(const k of ['kind','namespace','request'])assert.deepEqual(previous[k],r[k]);assert(r.result,'Pending update must terminate');b.terminalRecords[oldIndex]=clone(r);
  }else{b.terminalRecords.push(clone(r));if(r.namespace===b.publicNamespace){assert.equal(r.kind,'mathematical');b.publicStocks.push({...clone(r.request.value),...clone(r.request.descriptor)});}}}
 // Delta-local index: every row still passes the original byte/field/projection checks.
 const deltaWorldHashes=new Map();
 for(const w of d.fullWorlds){assert(fields.has(w.field),'Unknown stock field');const canonicalPath=canonical(b,w.descriptor.path),bytes=raw.get(canonicalPath);assert(bytes,'World not in delta files');assert.equal(sha256(bytes),w.descriptor.sha256);
  assert.deepEqual(at(JSON.parse(bytes),w.field),w.level,'Stock projection differs from original bytes');b.nearPools.history.push(clone(w));
  let byField=deltaWorldHashes.get(canonicalPath);if(!byField)deltaWorldHashes.set(canonicalPath,byField=new Map());
  let hashes=byField.get(w.field);if(!hashes)byField.set(w.field,hashes=new Set());hashes.add(levelSha256(w.level));}
 // Preserve the original flat/find traversal order and first-match behavior.
 // This index is local to this merge and hashes actual full levels, not metadata.
 const firstWorldByLevelSha256=new Map();
 for(const w of Object.values(b.nearPools).flat()){const digest=actualWorldHash(w.level);if(!firstWorldByLevelSha256.has(digest))firstWorldByLevelSha256.set(digest,w);}
 for(const r of d.terminalRecords){const q=r.request.value,w=firstWorldByLevelSha256.get(q.levelSha256);assert(w,'New request needs its full original world');
  const actual=actualWorldIdentity(w.level);for(const k of ['shapeSha256','colorSha256','colorAssignments','designSha256'])assert.deepEqual(q[k],actual[k],'Request fingerprint differs from original world');}
 for(const c of d.closedCampaigns){assert.equal(c.id,owner.id);assert(!b.closedExperimentIds.includes(c.id),'Quota reset');await rawJSON({descriptor:c.descriptor,value:c.raw});
  assert.equal(c.raw.closed,true);assert.equal(c.raw.consumedInputs,c.consumedInputs);assert.equal(c.raw.maximumInputs,c.maximumInputs);b.closedCampaigns.push(clone(c));b.closedExperimentIds.push(c.id);}
 for(const f of d.files){const p=canonical(b,f.path),bytes=raw.get(p);if(/\.(request|result|blocked)\.json$/.test(p))assert(used.has(p),'Unclassified request/result/blocked file');
  if(p.endsWith('.json')){const q=JSON.parse(bytes);for(const field of fields){const level=at(q,field);if(!level?.blocks)continue;
   assert(deltaWorldHashes.get(p)?.get(field)?.has(levelSha256(level)),'Omitted formed world/placeholder');}
   if(/\/identities\/[a-f0-9]{64}\.json$/.test(p))assert(d.terminalRecords.some(r=>p===r.namespace+'/identities/'+actualWorldIdentity(firstWorldByLevelSha256.get(r.request.value.levelSha256).level).retryIdentitySha256+'.json'&&q.origin===(r.request.value.identityOrigin??r.request.value.id)),'Unbound identity alias');}
  if(p.endsWith('.revalidation.lock'))assert(d.terminalRecords.some(r=>r.lock&&canonical(b,r.lock.descriptor.path)===p&&r.lock.value===bytes.toString()),'Unbound pending lock');}
 validate(b,state.bundle.scope);assertPlanHistoryMembers(state,listing,d.files.filter(f=>f.rootId!==null));
 return stateOf(b,{...state,headSha256:deltaDescriptor.sha256,fileBindings:bindings,deltaDescriptors:[...(state.deltaDescriptors??[]),clone(deltaDescriptor)]});
}
function assertRole(state,r,role){
 assert(!r.legacyPrivateResultFailure,'Legacy private failure cannot serve as reference or failed parent');
 assert.equal(r.kind,'mathematical','Construction accepted is not mathematical accepted');const rows=state.bundle.terminalRecords.filter(x=>related(x.request.value,r.request.value));
 assert(!rows.some(x=>status(x)==='PENDING'),'Pending identity cannot be reference or parent');
 if(role==='reference'){assert.equal(status(r),'ACCEPTED');assert(!rows.some(x=>status(x)==='FAILED'||x.blocked.length),'Failed identity remains sealed');}
 else{assert.equal(role,'failed-parent');assert.equal(status(r),'FAILED');const todo=[r.request.value.id],seen=new Set(todo);
  while(todo.length){const parent=todo.shift();for(const x of state.bundle.terminalRecords)if(x.namespace===r.namespace&&x.request.value.redesignOf===parent&&!seen.has(x.request.value.id)){
   assert.equal(status(x),'ACCEPTED','Later failed/pending descendant makes parent stale');seen.add(x.request.value.id);todo.push(x.request.value.id);}}}
}
const anchor=b=>JSON.stringify({color:b.layers?.[0]??b.color,cells:b.shape.map(([x,y])=>[b.x+x,b.y+y]).sort((a,b)=>a[1]-b[1]||a[0]-b[0])});
const gateKey=gs=>JSON.stringify(gs.map(g=>({side:g.side,offset:g.offset,size:g.size,color:g.color})).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
function assertNotRetired(state,level,reference){
 const f=sealedWorldIdentity(level),anchors=new Set(level.blocks.map(anchor)),gates=gateKey([...(level.gates??[]),...(level.flipDoors??[])]);
 for(const r of state.retired){if(r.kind==='design')assert.notEqual(r.designSha256,f.designSha256,'Retired design');
  if(r.kind==='skeleton')assert(!(gateKey(r.gates)===gates&&r.anchors.every(b=>anchors.has(anchor(b)))),'Retired visible skeleton');
  if(r.kind==='reference-family'&&reference)assert(!r.references.some(d=>canonical(state.bundle,d.path)===canonical(state.bundle,reference.path)&&d.sha256===reference.sha256),'Retired reference family');}
}
// Direct use re-reads original evidence. This is identity/terminal readiness,
// not a fresh L/U theorem; the mathematical consumer still verifies the proof.
export async function readDirectHistoryRole(state,{namespace,attemptId,receipt,role,readBytes}){
 const r=state.terminalByAttempt[canonical(state.bundle,namespace)+'|'+attemptId];assert(r,'Unknown historical attempt');assertRole(state,r,role);
 const fileBindings={},q=JSON.parse(await read(receipt,readBytes,fileBindings));bound(state.bundle,receipt);assert.equal(levelSha256(q.level),r.request.value.levelSha256);assert.equal(q.accepted,role==='reference');
 if(role==='reference')assertNotRetired(state,q.level,receipt);
 for(const x of [r.request,r.result,...r.blocked].filter(Boolean))assert.deepEqual(JSON.parse(await read(x.descriptor,readBytes,fileBindings)),x.value);
 if(q.attempt)assert.deepEqual(q.attempt,r.request.value);if(q.proof?.attempt)assert.deepEqual(q.proof.attempt,r.request.value);
 return{receipt:q,request:clone(r.request.value),result:clone(r.result.value),blocked:clone(r.blocked),fileBindings,mathematicalProofRevalidated:false};
}
// Explicit reviewed legacy source, never a fallback or an invented public attempt.
export async function readLegacyPlanHistoryReference(state,{legacyReference,readBytes}){
 assert(state.bundle.legacyReferences.some(r=>levelSha256(r)===levelSha256(legacyReference)),'Unreviewed legacy source');
 const fileBindings={},q=JSON.parse(await read(legacyReference.receipt,readBytes,fileBindings));await read(legacyReference.review,readBytes,fileBindings);
 assert.equal(q.accepted,true);assert.equal(levelSha256(q.level),legacyReference.levelSha256);assertNotRetired(state,q.level,legacyReference.receipt);
 const f=sealedWorldIdentity(q.level);assert(!state.bundle.terminalRecords.some(r=>related(r.request.value,f)&&(status(r)!=='ACCEPTED'||r.blocked.length)),'Legacy source has failed/pending physical alias');
 return{receipt:q,fileBindings,referenceOnly:true,mathematicalProofRevalidated:false,lowerBoundBorrowed:false,completeDualReplayRequired:true,prefixReplayRequired:true};
}
export function assertFreshPlanHistoryInput(state,level,{sourceLevelId,reference=null,failedParent=null}={}){
 assertNotRetired(state,level,reference);const f=sealedWorldIdentity(level);for(const q of state.publicStocks)assert(!related(q,f),'Existing public physical/design identity');
 for(const r of state.bundle.terminalRecords)assert(!related(r.request.value,f),'Existing cross-namespace physical/design identity');
 for(const w of state.fullWorlds){const old=actualWorldIdentity(w.level);assert(!related(old,f),'Existing full-world physical/design identity');assert.notEqual(old.partitionSha256,f.partitionSha256,'Existing partition');
  if(w.sourceLevelId===sourceLevelId&&reference!==null&&sameReference(state.bundle,w.reference,reference)&&!isAuthenticatedReversePartial(state,w))assert(changedHistoryShapeAndColour(old,f),'Branch requires changed shape AND true colour');}
 if(failedParent){const r=state.terminalByAttempt[canonical(state.bundle,failedParent.namespace)+'|'+failedParent.attemptId];assert(r);assertRole(state,r,'failed-parent');
  assert(changedHistoryShapeAndColour(r.request.value,f),'Failed parent requires changed shape AND true colour');}
 return{freshIdentity:true,nearChecksStillRequired:true,nearPoolsChanged:false,oldLiveByteIntegrityClaimed:false};
}

// v9's only admission change is the same-reference colour conjunct above.
// These two immutable reviews authorize re-reading named CLOSED, no-full
// archives, not caller classifications or a general partial-world exemption.
const KNOWN_REVERSE_PARTIAL_REVIEWS=Object.freeze([
 Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/plain-reverse-source5-suffix-prefix-pilot-actual-independent-01/report.json',sha256:'f2d2496b0971878aef2248f6d5b6d69809e4c6ef36c63de21727f24937369c24'}),
 Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/plain-reverse-source5-suffix-prefix-pilot-actual-independent-02/report.json',sha256:'a132d450e7be0da964f69c3cf85be500d8f6d3df50e0cf99d96e54416adacb0a'})
]);
const authenticatedReversePartials=new WeakMap();
const reversePartialAuthenticationEpochs=new WeakMap();
const reversePartialKey=(bundle,w)=>JSON.stringify([canonical(bundle,w.descriptor.path),w.descriptor.sha256,w.field,actualWorldHash(w.level)]);
function isAuthenticatedReversePartial(state,w){
 return sealedObjects.has(state.bundle)&&authenticatedReversePartials.get(state.bundle)?.has(reversePartialKey(state.bundle,w))===true;
}

/** Metadata only. The ORIGINAL state must have been consumed/merged by v10.
 * A factory's later {...state,fullWorlds:comparison} retains the same bundle.
 * A new merge or a cloned/frozen caller object inherits no authorization.
 * No old delta, checkpoint, owner, row, near pool or ledger is rewritten. */
export async function authenticateKnownReversePartials(state,options={}){
 const authenticationBundle=state?.bundle,authenticationEpoch={};
 authenticatedReversePartials.delete(authenticationBundle);
 if(authenticationBundle&&typeof authenticationBundle==='object')reversePartialAuthenticationEpochs.set(authenticationBundle,authenticationEpoch);
 try{
 const readBytes=options?.readBytes;
 assert(immutableStates.has(state)&&sealedObjects.has(state.bundle),'Partial authentication requires a v10-owned immutable state');
 assert.equal(typeof readBytes,'function');
 const b=state.bundle,pending=new Set(),fileBindings={},loaded=new Map(),summaries=[];
 authenticatedReversePartials.delete(b); // A failed re-read must fail closed.
 async function raw(d){descriptor(d);const k=canonical(b,d.path);let x=loaded.get(k);
  if(x){assert.equal(x.sha256,d.sha256,'Conflicting partial evidence alias');fileBindings[d.path]=d.sha256;return x.bytes;}
  const bytes=await readBytes(d.path);assert.equal(sha256(bytes),d.sha256,'Partial evidence SHA mismatch');loaded.set(k,{sha256:d.sha256,bytes});fileBindings[d.path]=d.sha256;return bytes;}
 const json=async d=>JSON.parse(await raw(d));
 const sameDescriptor=(a,c)=>{descriptor(a);descriptor(c);assert.equal(canonical(b,a.path),canonical(b,c.path));assert.equal(a.sha256,c.sha256);};
 const registered=new Map();for(const w of state.fullWorlds){const k=reversePartialKey(b,w),xs=registered.get(k)??[];xs.push(w);registered.set(k,xs);}
 const claimedHashes=new Set([...b.publicStocks.map(x=>x.levelSha256),...b.terminalRecords.map(x=>x.request.value.levelSha256)]);
 for(const anchor of KNOWN_REVERSE_PARTIAL_REVIEWS){
  const review=await json(anchor);assert.equal(review.status,'INDEPENDENT_REVERSE_SUFFIX_PREFIX_ACTUAL_PASS');assert.deepEqual(review.errors,[]);
  for(const k of ['newConstructions','newSearches','newReplayCalls','newModels','newLedgerClaims','publicClaimsStarted','completePhysicalInputs','actualPublicClaimsStarted','actualOriginalLowerCalls','actualCanonicalReplayCalls','actualIndependentReplayCalls'])assert.equal(review[k],0,k);
  assert.equal(review.accepted,false);assert.equal(review.closed,true);assert.equal(review.restartAllowed,false);assert.equal(review.originalOwnerDefinitionsPreserved,true);assert.equal(review.unclaimedMathOwnerReportBindingOnly,true);
  const done=await json(review.completion),p=await json(review.plan),q=await json(done.receipt),owner=await json(done.constructionOwner),math=await json(done.mathOwner),ix=await json(done.index);
  sameDescriptor(done.plan,review.plan);sameDescriptor(q.plan,review.plan);sameDescriptor(done.receipt,review.receipt);sameDescriptor(done.constructionOwner,review.constructionOwner);sameDescriptor(done.mathOwner,review.mathOwner);sameDescriptor(done.index,review.constructionIndex);
  assert.equal(done.status,'REVERSE_FIXED_STOCK_TASK_CLOSED');assert.equal(done.closed,true);assert.equal(done.maximumInputs,1);assert.equal(done.allFailuresTerminal,true);assert.equal(done.accepted,0);assert.equal(done.publicClaimsStarted,0);assert.equal(done.adminClosureRequired,false);assert.equal(done.archiveValidation.valid,true);
  assert.equal(p.qualificationOnly,false);assert.equal(q.qualificationOnly,false);assert.equal(q.version,p.version);assert.equal(done.version,p.version);assert.equal(q.status,'REVERSE_CONSTRUCTION_TERMINAL');assert.equal(q.sourceLevelId,p.recipe.sourceLevelId);assert.equal(q.experimentId,p.experimentId);
  for(const k of ['accepted','formalReady','catalogEligible','designAccepted','mathematicalEvidenceValidated'])assert.equal(q[k],false,k);
  for(const k of ['level','levelSha256','L','U','proof','route','attempt','upperConstruction','lowerBound'])assert.equal(q[k],null,k);
  assert.equal(q.archiveValidation.valid,true);assert.equal(q.adminClosureRequired??false,false);assert.equal(q.construction.phase,'terminal');assert.equal(q.construction.firstComplete,null);assert.equal(q.construction.completePhysicalInputs,0);assert.equal(q.construction.session.dualReplayStarted,false);
  assert.equal(ix.closed,true);assert.equal(ix.restartAllowed,false);assert.equal(ix.maximumInputs,1);assert.equal(ix.consumedInputs,0);assert.equal(ix.completePhysicalInputs,0);sameDescriptor(ix.receipt,done.receipt);assert.deepEqual(ix.formedWorldFiles,q.formedWorlds);assert.deepEqual(ix.nonIdentityWorlds,q.nonIdentityWorlds);assert.deepEqual(done.nonIdentityWorlds,q.nonIdentityWorlds);
  assert.equal(done.formedWorlds,q.formedWorlds.length);assert(q.formedWorlds.length>1);assert.equal(review.archive.totalFormedWorldRecords,q.formedWorlds.length);assert.equal(review.archive.physicalWorldRecords,q.formedWorlds.length-1);
  for(const [o,kind]of [[owner,'construction'],[math,'mathematical']]){assert.equal(o.version,'plan-history-owner-v1');assert.equal(o.kind,kind);assert.equal(o.id,p.experimentId+(kind==='mathematical'?'-math':''));assert.equal(o.experimentId,p.experimentId);sameDescriptor(o.parentPlan,review.plan);assert.deepEqual(o.attemptIds,[]);unique(o.files.map(d=>canonical(b,d.path)));}
  assert.deepEqual(math.files,[done.receipt]);assert.deepEqual(math.closedCampaigns,[]);assert.equal(math.namespace,b.publicNamespace);assert.equal(owner.closedCampaigns.length,1);assert(b.scope.roots.some(r=>canonical(b,r.physicalPath)===owner.namespace));assert(b.closedExperimentIds.includes(p.experimentId));
  const closure=owner.closedCampaigns[0];assert.equal(closure.id,p.experimentId);assert.equal(closure.closed,true);assert.equal(closure.restartAllowed,false);assert.equal(closure.consumedInputs,0);assert.equal(closure.maximumInputs,1);sameDescriptor(closure.descriptor,review.constructionClosure);
  assert.deepEqual(b.closedCampaigns.find(x=>x.id===p.experimentId),closure);assert.deepEqual(await json(closure.descriptor),closure.raw);for(const[k,v]of Object.entries(ix))assert.deepEqual(closure.raw[k],v);sameDescriptor(closure.raw.plan,review.plan);
  const expected=[review.constructionClaim,review.recipeLock,review.experimentLock,...q.formedWorlds,review.constructionClosure,done.index],own=new Map(owner.files.map(d=>[canonical(b,d.path),d]));
  assert.deepEqual([...own.keys()].sort(),expected.map(d=>canonical(b,d.path)).sort());for(const d of expected){sameDescriptor(own.get(canonical(b,d.path)),d);bound(b,d);await raw(d);}
  const claim=await json(review.constructionClaim),recipeLock=await json(review.recipeLock),experimentLock=await json(review.experimentLock);sameDescriptor(claim.plan,review.plan);sameDescriptor(recipeLock.plan,review.plan);sameDescriptor(experimentLock.plan,review.plan);assert.equal(claim.failedPlanContinuationAllowed,false);assert.equal(recipeLock.recipeIdentity,review.stableRecipeIdentity);assert.equal(recipeLock.restartAllowed,false);assert.equal(experimentLock.restartAllowed,false);assert.equal(recipeLock.experimentId,p.experimentId);assert.equal(experimentLock.experimentId,p.experimentId);
  const recipe=p.recipe,{recipeSha256,...recipeCore}=recipe;assert.equal(levelSha256(recipeCore),recipeSha256);assert.equal(recipeSha256,review.recipeSha256);assert.equal(recipe.maximumCompletePhysicalInputs,1);
  assert(!recipe.board.blocks);for(const k of ['shutters','generators','elevators','flipDoors','coloredGrids'])assert.equal((recipe.board[k]??[]).length,0,'No hidden/queued/dynamic stock');
  const inventory=new Map(recipe.inventory.map(x=>[x.id,x]));assert.equal(inventory.size,recipe.inventory.length);for(const atom of inventory.values())assert.deepEqual(Object.keys(atom).sort(),['color','id','shape','x','y']);
  const mask=new Set((recipe.board.playable??Array.from({length:recipe.board.width*recipe.board.height},(_,i)=>[i%recipe.board.width,Math.floor(i/recipe.board.width)])).map(p=>p.join(',')));for(const p of recipe.board.blocked??[])mask.delete(p.join(','));assert.equal(recipe.inventory.reduce((n,x)=>n+x.shape.length,0),mask.size);
  assert.equal(q.construction.formed.length,q.formedWorlds.length);assert.equal(q.construction.session.formed.length,q.formedWorlds.length);let nonempty=0;
  for(const [ordinal,d]of q.formedWorlds.entries()){
   const packet=await json(d),empty=Object.hasOwn(packet,'emptyConstructionWorld'),level=empty?packet.emptyConstructionWorld:packet.level;
   assert.equal(empty,ordinal===0);assert.equal(Object.hasOwn(packet,'level'),!empty);assert.equal(packet.creation.full,false);assert.equal(packet.creation.ordinal,ordinal);assert.equal(packet.sourceLevelId,recipe.sourceLevelId);assert.equal(packet.recipeSha256,recipeSha256);assert.equal(packet.levelSha256,levelSha256(level));assert.equal(packet.creation.levelSha256,packet.levelSha256);
   descriptor(packet.factory);assert.equal(review.toolBindings[packet.factory.path],packet.factory.sha256,'Factory absent from exact original review');await raw(packet.factory);
   assert.deepEqual({...level,blocks:undefined},{...recipe.board,blocks:undefined});assert.deepEqual(q.construction.formed[ordinal].level,level);assert.deepEqual(q.construction.formed[ordinal].info,packet.creation);for(const k of ['label','levelSha256','full'])assert.deepEqual(q.construction.session.formed[ordinal][k],packet.creation[k]);
   const cells=new Set();unique(level.blocks.map(x=>x.id));for(const atom of level.blocks){assert.deepEqual({...atom,x:0,y:0},inventory.get(atom.id));assert(Number.isSafeInteger(atom.x)&&Number.isSafeInteger(atom.y));for(const[dx,dy]of atom.shape){assert(Number.isSafeInteger(dx)&&Number.isSafeInteger(dy));const cell=[atom.x+dx,atom.y+dy].join(',');assert(mask.has(cell)&&!cells.has(cell),'Partial overlap or out-of-mask cell');cells.add(cell);}}
   assert(level.blocks.length<inventory.size&&cells.size<mask.size,'A complete physical candidate is never a partial exemption');
   if(empty){assert.equal(level.blocks.length,0);assert.equal(packet.kind,'NON_IDENTITY_INITIAL_EMPTY_WORLD');assert.equal(packet.identityEligible,false);assert.equal(packet.creation.label,'empty-normal-mask');continue;}
   assert(level.blocks.length>0);assert(!claimedHashes.has(packet.levelSha256),'Mathematical/terminal input is never a partial exemption');
   const k=reversePartialKey(b,{descriptor:d,field:'level',level}),matches=registered.get(k);assert(matches?.length,'Original partial field absent from consumed history');
   for(const w of matches){assert.deepEqual(w.level,level);assert.equal(w.sourceLevelId,recipe.sourceLevelId);assert(sameReference(b,w.reference,packet.reference),'Historical partial reference mismatch');}
   pending.add(k);nonempty++;
  }
  assert.equal(nonempty,review.archive.physicalWorldRecords);summaries.push({review:clone(anchor),completion:clone(review.completion),plan:clone(review.plan),constructionOwner:clone(done.constructionOwner),authenticatedPartialRecords:nonempty,completePhysicalInputs:0});
 }
 summaries.push(await collectKnownStarArchivalPartials(state,{raw,json,sameDescriptor,registered,claimedHashes,pending}));
 // Re-check current evidence before publishing any per-bundle authorization.
 for(const[p,h]of Object.entries(fileBindings))assert.equal(sha256(await readBytes(p)),h,'Partial evidence changed during authentication');
 assert.equal(reversePartialAuthenticationEpochs.get(b),authenticationEpoch,'Partial authentication was superseded');
 authenticatedReversePartials.set(b,pending);
 return{authenticatedPartialRecords:pending.size,archives:summaries,fileBindings,onlySameReferenceShapeColourClauseSkipped:true,nearPoolsChanged:false,historyChanged:false,newConstructions:0,newModels:0,newSearches:0,newReplayCalls:0,newLedgerClaims:0};
 }catch(error){authenticatedReversePartials.delete(authenticationBundle);throw error;}
}

// v10 adds exactly FOUR original, nonempty source200 partial records. The
// missing sixth object is never reconstructed or authorized. Its administrative
// observation must already be bound in this module-owned history, alongside
// the original closed campaign and exact persisted records. No future export
// digest, caller-supplied classifier or success reinterpretation is accepted.
const KNOWN_STAR_ARCHIVAL_OBSERVATION=Object.freeze({path:'deliverables/daily-formal-v4-20261008/proof/star-source200-administrative-observation-01/observation.json',sha256:'7aa664b69de5e2227b02ce84e01f5faee86cfb0b8b2d72ed9bab7b8dc7917262'});
async function collectKnownStarArchivalPartials(state,{raw,json,sameDescriptor,registered,claimedHashes,pending}){
 const b=state.bundle;bound(b,KNOWN_STAR_ARCHIVAL_OBSERVATION);
 const o=await json(KNOWN_STAR_ARCHIVAL_OBSERVATION);
 assert.equal(o.status,'SOURCE200_ORIGINAL_ARCHIVAL_FAILURE_ADMINISTRATIVE_OBSERVATION');assert.equal(o.caseId,'star-source200-dual-exit-pilot-01');
 assert.equal(o.archivalIntegrity,'FAILED');assert.deepEqual(o.archivalErrors,['PREPAID_RECORD_NOT_ARCHIVED_AFTER_STATIC_VALIDATION_THROW']);
 for(const k of ['normalActualReviewPassed','normalExportAllowed','completeFormedWorldArchivalVerified'])assert.equal(o[k],false,k);
 for(const[k,n]of Object.entries({recordTicketsIssued:6,recordTicketsConsumed:6,savedOriginalRecords:5,unarchivedRecordCount:1,savedNonemptyPartials:4,emptyNonIdentityRecords:1,completePhysicalInputs:0,publicClaimsStarted:0}))assert.equal(o[k],n,k);
 assert.deepEqual(o.recipeDisposition,{closed:true,restartAllowed:false,originalConsumedCompleteInputs:0,originalMaximumInputs:1,productionRecipeMayResume:false});
 for(const k of ['originalBytesAvailable','originalDescriptorAvailable','originalLevelSha256Available','recoveredWorldCreated','insertedIntoHistoryWorlds'])assert.equal(o.missingOriginalRecord[k],false,k);
 const review=await json(o.strictFailureReview),fragment=await json(o.coordinateFragmentEvidence),done=await json(o.completion),p=await json(o.plan),q=await json(o.candidate),owner=await json(o.originalConstructorOwner),math=await json(o.originalMathOwner),ix=await json(o.originalIndex);
 assert.equal(review.status,'INDEPENDENT_REVERSE_STAR_SUFFIX_ACTUAL_V2_ARCHIVAL_FAILURE_CONFIRMED');assert.deepEqual(review.errors,o.archivalErrors);assert.equal(review.normalExportAllowed,false);assert.equal(review.completeFormedWorldArchivalVerified,false);
 for(const k of ['newConstructions','newSearches','newReplayCalls','newModels','newLedgerClaims','publicClaimsStarted','completePhysicalInputs','actualPublicClaimsStarted','actualOriginalLowerCalls','actualProjectionCalls','actualCanonicalReplayCalls','actualIndependentReplayCalls'])assert.equal(review[k],0,k);
 for(const [a,c]of [[review.plan,o.plan],[review.completion,o.completion],[review.receipt,o.candidate],[review.constructionOwner,o.originalConstructorOwner],[review.mathOwner,o.originalMathOwner],[review.constructionIndex,o.originalIndex],[review.constructionClosure,o.originalClosure],[done.plan,o.plan],[q.plan,o.plan],[done.receipt,o.candidate],[done.constructionOwner,o.originalConstructorOwner],[done.mathOwner,o.originalMathOwner],[done.index,o.originalIndex]])sameDescriptor(a,c);
 assert.equal(fragment.status,'READONLY_UNARCHIVED_COORDINATE_FRAGMENT_HASH_MATCHED_NOT_WORLD_RECOVERY');sameDescriptor(fragment.actualAudit,o.strictFailureReview);sameDescriptor(fragment.candidate,o.candidate);assert.equal(fragment.normalExportAllowed,false);
 assert.equal(fragment.lastRawEvent.keySha256,o.missingOriginalRecord.rawKeySha256);assert.equal(fragment.coordinateFragment.keySha256,o.missingOriginalRecord.rawKeySha256);
 assert.equal(o.missingOriginalRecord.inferredBodyCount,3);assert.equal(o.missingOriginalRecord.inferredArea,12);
 for(const k of ['newLevelSpecsCreated','newModels','newSearches','newReplayCalls','newClaims'])assert.equal(fragment[k],0,k);
 assert.equal(done.status,'REVERSE_FIXED_STOCK_TASK_CLOSED');assert.equal(done.closed,true);assert.equal(done.maximumInputs,1);assert.equal(done.allFailuresTerminal,true);assert.equal(done.accepted,0);assert.equal(done.publicClaimsStarted,0);
 // These incorrect original archive flags are evidence, not a PASS premise.
 assert.deepEqual(done.archiveValidation,o.originalErroneousFieldsPreserved.completionArchiveValidation);assert.equal(done.adminClosureRequired,o.originalErroneousFieldsPreserved.completionAdminClosureRequired);
 assert.deepEqual(q.archiveValidation,o.originalErroneousFieldsPreserved.candidateArchiveValidation);assert.deepEqual(ix.archiveValidation,o.originalErroneousFieldsPreserved.indexArchiveValidation);assert.equal(ix.adminClosureRequired,o.originalErroneousFieldsPreserved.indexAdminClosureRequired);
 assert.equal(p.qualificationOnly,false);assert.equal(q.qualificationOnly,false);assert.equal(q.version,p.version);assert.equal(done.version,p.version);assert.equal(q.status,'REVERSE_CONSTRUCTION_TERMINAL');assert.equal(q.sourceLevelId,200);assert.equal(q.experimentId,p.experimentId);
 assert.deepEqual(q.errors,['Level 200: duplicate id star200-pink-normal']);
 for(const k of ['accepted','formalReady','catalogEligible','designAccepted','mathematicalEvidenceValidated'])assert.equal(q[k],false,k);
 for(const k of ['level','levelSha256','L','U','proof','route','attempt','upperConstruction','lowerBound'])assert.equal(q[k],null,k);
 const construction=q.construction,session=construction.session;
 assert.equal(construction.phase,'terminal');assert.equal(construction.firstComplete,null);assert.equal(construction.completePhysicalInputs,0);assert.equal(session.dualReplayStarted,false);assert.equal(session.terminal,q.errors[0]);
 assert.equal(session.rawAccounting.recordTicketsIssued,6);assert.equal(session.rawAccounting.recordTicketsConsumed,6);assert.deepEqual(session.rawAccounting.events.at(-1),fragment.lastRawEvent);
 for(const k of ['canonicalReplays','independentReplays'])assert.equal(session.counters[k],0);
 assert.equal(ix.closed,true);assert.equal(ix.restartAllowed,false);assert.equal(ix.maximumInputs,1);assert.equal(ix.consumedInputs,0);assert.equal(ix.completePhysicalInputs,0);sameDescriptor(ix.receipt,o.candidate);
 assert.deepEqual(ix.formedWorldFiles,q.formedWorlds);assert.deepEqual(ix.nonIdentityWorlds,q.nonIdentityWorlds);assert.deepEqual(done.nonIdentityWorlds,q.nonIdentityWorlds);assert.equal(done.formedWorlds,5);assert.equal(q.formedWorlds.length,5);assert.equal(o.saved.length,5);
 for(const [ownerValue,kind]of [[owner,'construction'],[math,'mathematical']]){assert.equal(ownerValue.version,'plan-history-owner-v1');assert.equal(ownerValue.kind,kind);assert.equal(ownerValue.id,p.experimentId+(kind==='mathematical'?'-math':''));assert.equal(ownerValue.experimentId,p.experimentId);sameDescriptor(ownerValue.parentPlan,o.plan);assert.deepEqual(ownerValue.attemptIds,[]);unique(ownerValue.files.map(d=>canonical(b,d.path)));}
 assert.equal(owner.namespace===b.publicNamespace,false);assert(b.scope.roots.some(r=>canonical(b,r.physicalPath)===owner.namespace));assert.equal(math.namespace,b.publicNamespace);assert.deepEqual(math.files,[o.candidate]);assert.deepEqual(math.closedCampaigns,[]);bound(b,o.candidate);
 assert.equal(owner.closedCampaigns.length,1);const closure=owner.closedCampaigns[0];sameDescriptor(closure.descriptor,o.originalClosure);assert.equal(closure.id,p.experimentId);assert.equal(closure.closed,true);assert.equal(closure.restartAllowed,false);assert.equal(closure.consumedInputs,0);assert.equal(closure.maximumInputs,1);
 assert(b.closedExperimentIds.includes(p.experimentId));assert.deepEqual(b.closedCampaigns.find(x=>x.id===p.experimentId),closure);assert.deepEqual(await json(closure.descriptor),closure.raw);for(const[k,v]of Object.entries(ix))assert.deepEqual(closure.raw[k],v);sameDescriptor(closure.raw.plan,o.plan);assert.deepEqual(closure.raw.archiveValidation,o.originalErroneousFieldsPreserved.closureArchiveValidation);
 const expected=[review.constructionClaim,review.recipeLock,review.experimentLock,...q.formedWorlds,o.originalClosure,o.originalIndex],owned=new Map(owner.files.map(d=>[canonical(b,d.path),d]));assert.equal(owned.size,10);assert.deepEqual([...owned.keys()].sort(),expected.map(d=>canonical(b,d.path)).sort());
 for(const d of expected){sameDescriptor(owned.get(canonical(b,d.path)),d);bound(b,d);await raw(d);}
 const claim=await json(review.constructionClaim),recipeLock=await json(review.recipeLock),experimentLock=await json(review.experimentLock);for(const lock of [claim,recipeLock,experimentLock])sameDescriptor(lock.plan,o.plan);assert.equal(claim.failedPlanContinuationAllowed,false);assert.equal(recipeLock.recipeIdentity,review.stableRecipeIdentity);for(const lock of [recipeLock,experimentLock]){assert.equal(lock.restartAllowed,false);assert.equal(lock.experimentId,p.experimentId);}
 const recipe=p.recipe,{recipeSha256,...recipeCore}=recipe;assert.equal(levelSha256(recipeCore),recipeSha256);assert.equal(review.recipeSha256,recipeSha256);assert.equal(recipe.sourceLevelId,200);assert.equal(recipe.maximumCompletePhysicalInputs,1);assert.equal(recipe.board.width,6);assert.equal(recipe.board.height,8);assert(!recipe.board.blocks);assert.equal(recipe.inventory.length,17);assert.equal(recipe.board.gates.length,10);
 for(const k of ['blocked','seams','shutters','generators','elevators','conveyors','flipDoors','coloredGrids'])assert.equal((recipe.board[k]??[]).length,0,k);
 const inventory=new Map(recipe.inventory.map(x=>[x.id,x]));assert.equal(inventory.size,17);for(const atom of inventory.values())assert.deepEqual(Object.keys(atom).sort(),['color','id','shape','star','x','y']);
 const mask=new Set((recipe.board.playable??Array.from({length:48},(_,i)=>[i%6,Math.floor(i/6)])).map(p=>p.join(',')));assert.equal(mask.size,48);assert.equal(recipe.inventory.reduce((n,x)=>n+x.shape.length,0),48);
 const declaration=await json(p.declaration),reference=declaration.sourceReference;descriptor(reference);assert.equal(construction.formed.length,5);assert.equal(session.formed.length,5);let nonempty=0;
 for(const [ordinal,d]of q.formedWorlds.entries()){
  const saved=o.saved[ordinal];sameDescriptor(saved.descriptor,d);assert.equal(saved.full,false);const packet=await json(d),empty=Object.hasOwn(packet,'emptyConstructionWorld'),level=empty?packet.emptyConstructionWorld:packet.level;
  assert.equal(empty,ordinal===0);assert.equal(Object.hasOwn(packet,'level'),!empty);assert.equal(saved.field,empty?'emptyConstructionWorld':'level');assert.equal(packet.creation.full,false);assert.equal(packet.creation.ordinal,ordinal);assert.equal(packet.sourceLevelId,200);sameDescriptor(packet.reference,reference);assert.equal(packet.recipeSha256,recipeSha256);assert.equal(packet.levelSha256,levelSha256(level));assert.equal(packet.levelSha256,saved.levelSha256);assert.equal(packet.creation.levelSha256,packet.levelSha256);
  descriptor(packet.factory);assert.equal(review.toolBindings[packet.factory.path],packet.factory.sha256);await raw(packet.factory);assert.deepEqual({...level,blocks:undefined},{...recipe.board,blocks:undefined});assert.deepEqual(construction.formed[ordinal].level,level);assert.deepEqual(construction.formed[ordinal].info,packet.creation);for(const k of ['label','levelSha256','full'])assert.deepEqual(session.formed[ordinal][k],packet.creation[k]);
  const cells=new Set();unique(level.blocks.map(x=>x.id));for(const atom of level.blocks){assert.deepEqual({...atom,x:0,y:0},inventory.get(atom.id));assert(Number.isSafeInteger(atom.x)&&Number.isSafeInteger(atom.y));for(const[dx,dy]of atom.shape){assert(Number.isSafeInteger(dx)&&Number.isSafeInteger(dy));const cell=[atom.x+dx,atom.y+dy].join(',');assert(mask.has(cell)&&!cells.has(cell),'Partial overlap or out-of-mask cell');cells.add(cell);}}
  assert.equal(saved.bodyCount,level.blocks.length);assert.equal(saved.area,cells.size);assert(level.blocks.length<17&&cells.size<48,'A complete physical candidate is never a partial exemption');
  if(empty){assert.equal(level.blocks.length,0);assert.equal(packet.kind,'NON_IDENTITY_INITIAL_EMPTY_WORLD');assert.equal(packet.identityEligible,false);assert.equal(packet.creation.label,'empty-normal-mask');continue;}
  assert(level.blocks.length>0);assert(!claimedHashes.has(packet.levelSha256),'Mathematical/terminal input is never a partial exemption');const k=reversePartialKey(b,{descriptor:d,field:'level',level}),matches=registered.get(k);assert(matches?.length,'Original star partial field absent from consumed history');
  for(const w of matches){assert.deepEqual(w.level,level);assert.equal(w.sourceLevelId,200);assert(sameReference(b,w.reference,packet.reference),'Historical partial reference mismatch');}pending.add(k);nonempty++;
 }
 assert.equal(nonempty,4);
 return{observation:clone(KNOWN_STAR_ARCHIVAL_OBSERVATION),review:clone(o.strictFailureReview),completion:clone(o.completion),plan:clone(o.plan),constructionOwner:clone(o.originalConstructorOwner),authenticatedPartialRecords:4,completePhysicalInputs:0,originalArchivalFailurePreserved:true,completeFormedWorldArchivalVerified:false,unarchivedRecordAuthorized:false,normalActualReviewPassed:false};
}
