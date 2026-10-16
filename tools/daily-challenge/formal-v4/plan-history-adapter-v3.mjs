import assert from 'node:assert/strict';
import path from 'node:path';
import {levelSha256} from '../formal-v2/contract.mjs';
import {canonicalHistoryPath,sha256,sealedWorldIdentity,changedHistoryShapeAndColour} from './sealed-history-contract.mjs';

// Consumer v3: preserve the v2 checkpoint bytes/schema; a legacy private
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
const canonical=(b,p)=>canonicalHistoryPath(p,b.scope);
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
 for(const pool of Object.values(b.nearPools))for(const w of pool){bound(b,w.descriptor);const f=sealedWorldIdentity(w.level);
  if(w.fingerprints)for(const [k,v]of Object.entries(w.fingerprints))assert.deepEqual(f[k],v,'World fingerprint conflict');}
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
function stateOf(b,extra){return{...extra,bundle:b,baselinePlan:b.baselinePlan,baselineActual:b.baselineActual,publicStocks:b.publicStocks,nearPools:b.nearPools,
 fullWorlds:Object.values(b.nearPools).flat(),terminalByAttempt:Object.fromEntries(b.terminalRecords.map(r=>[key(r),r])),externalPrivate:b.externalPrivate,
 retired:b.retired,closedCampaigns:b.closedCampaigns,closedExperimentIds:b.closedExperimentIds,archivedBindings:b.archivedBindings,
 baselineFields:b.baselineFields,selectedDescriptors:b.baselineFields.selected,old450Descriptors:b.baselineFields.old450,oldLiveByteIntegrityClaimed:false};}
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
 const b=clone(state.bundle),old=files(b),raw=new Map();assert(!b.closedExperimentIds.includes(owner.id),'Closed campaign cannot reopen');
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
 for(const w of d.fullWorlds){assert(fields.has(w.field),'Unknown stock field');const bytes=raw.get(canonical(b,w.descriptor.path));assert(bytes,'World not in delta files');assert.equal(sha256(bytes),w.descriptor.sha256);
  assert.deepEqual(at(JSON.parse(bytes),w.field),w.level,'Stock projection differs from original bytes');b.nearPools.history.push(clone(w));}
 for(const r of d.terminalRecords){const q=r.request.value,w=Object.values(b.nearPools).flat().find(w=>levelSha256(w.level)===q.levelSha256);assert(w,'New request needs its full original world');
  const actual=sealedWorldIdentity(w.level);for(const k of ['shapeSha256','colorSha256','colorAssignments','designSha256'])assert.deepEqual(q[k],actual[k],'Request fingerprint differs from original world');}
 for(const c of d.closedCampaigns){assert.equal(c.id,owner.id);assert(!b.closedExperimentIds.includes(c.id),'Quota reset');await rawJSON({descriptor:c.descriptor,value:c.raw});
  assert.equal(c.raw.closed,true);assert.equal(c.raw.consumedInputs,c.consumedInputs);assert.equal(c.raw.maximumInputs,c.maximumInputs);b.closedCampaigns.push(clone(c));b.closedExperimentIds.push(c.id);}
 for(const f of d.files){const p=canonical(b,f.path),bytes=raw.get(p);if(/\.(request|result|blocked)\.json$/.test(p))assert(used.has(p),'Unclassified request/result/blocked file');
  if(p.endsWith('.json')){const q=JSON.parse(bytes);for(const field of fields){const level=at(q,field);if(!level?.blocks)continue;
   assert(d.fullWorlds.some(w=>canonical(b,w.descriptor.path)===p&&w.field===field&&levelSha256(w.level)===levelSha256(level)),'Omitted formed world/placeholder');}
   if(/\/identities\/[a-f0-9]{64}\.json$/.test(p))assert(d.terminalRecords.some(r=>p===r.namespace+'/identities/'+sealedWorldIdentity(Object.values(b.nearPools).flat().find(w=>levelSha256(w.level)===r.request.value.levelSha256).level).retryIdentitySha256+'.json'&&q.origin===(r.request.value.identityOrigin??r.request.value.id)),'Unbound identity alias');}
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
 for(const w of state.fullWorlds){const old=sealedWorldIdentity(w.level);assert(!related(old,f),'Existing full-world physical/design identity');assert.notEqual(old.partitionSha256,f.partitionSha256,'Existing partition');
  if(w.sourceLevelId===sourceLevelId&&reference!==null&&sameReference(state.bundle,w.reference,reference))assert(changedHistoryShapeAndColour(old,f),'Branch requires changed shape AND true colour');}
 if(failedParent){const r=state.terminalByAttempt[canonical(state.bundle,failedParent.namespace)+'|'+failedParent.attemptId];assert(r);assertRole(state,r,'failed-parent');
  assert(changedHistoryShapeAndColour(r.request.value,f),'Failed parent requires changed shape AND true colour');}
 return{freshIdentity:true,nearChecksStillRequired:true,nearPoolsChanged:false,oldLiveByteIntegrityClaimed:false};
}
