import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';
import {compileCanonicalHistoryPath} from './canonical-history-path-compiled.mjs';
import {sealedWorldIdentity} from './sealed-history-contract.mjs';

export const BATCH_PARENT_POLICY='latest-earlier-authenticated-mathematical-failure-v1';
const descriptor=d=>assert(d&&typeof d.path==='string'&&/^[a-f0-9]{64}$/.test(d.sha256),'Exact parent evidence descriptor');
const digest=b=>createHash('sha256').update(b).digest('hex');
const freeze=v=>{if(v&&typeof v==='object'&&!Object.isFrozen(v)){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};

/** Read-only evidence authentication. No ledger writes, new levels, models,
 * searches or history mutation. Files must already have been durably written. */
export async function authenticateBatchFailedParent(q,receipt,evidence,parent,scope,readBytes){
 const canonical=compileCanonicalHistoryPath(scope).canonical,bindings={};
 const read=async d=>{descriptor(d);const bytes=await readBytes(d.path);assert.equal(digest(bytes),d.sha256,'Parent evidence bytes differ: '+d.path);bindings[d.path]=d.sha256;return JSON.parse(bytes);};
 const original=await read(receipt);assert.deepEqual(original,q,'Complete candidate must be saved before parent advancement');
 assert.equal(q.accepted,false);assert(q.attempt&&q.level,'Only a claimed original full world can become a mathematical parent');
 assert.equal(q.levelSha256,levelSha256(q.level));assert.equal(q.attempt.levelSha256,q.levelSha256);
 assert.deepEqual(q.resolvedFailedParent,parent.evidence);assert.equal(q.attempt.redesignOf,parent.request.id);
 assert.equal(q.sourceLevelId,parent.sourceLevelId);assert.equal(q.level.id,q.sourceLevelId);
 assert.deepEqual(Object.keys(evidence).sort(),['blocked','identity','request','result','sidecar']);
 assert(Array.isArray(evidence.blocked)&&evidence.blocked.length===2);
 const namespace=canonical(parent.namespace),id=q.attempt.id,retry=q.attempt.retryIdentitySha256;
 assert(/^[a-f0-9]{64}$/.test(id));assert(/^[a-f0-9]{64}$/.test(retry));assert.equal(q.attempt.identityOrigin,id);
 for(const[k,suffix]of [['request',id+'.request.json'],['result',id+'.result.json'],['identity','identities/'+retry+'.json'],['sidecar',id+'.v4-wholeboard-result.json']])assert.equal(canonical(evidence[k].path),namespace+'/'+suffix);
 const blockPaths=evidence.blocked.map(d=>canonical(d.path));assert.equal(new Set(blockPaths).size,2);assert.deepEqual(blockPaths.slice().sort(),[namespace+'/'+id+'.blocked.json',namespace+'/identities/'+retry+'.blocked.json'].sort());
 const request=await read(evidence.request),result=await read(evidence.result),identity=await read(evidence.identity),sidecar=await read(evidence.sidecar),blocked=await Promise.all(evidence.blocked.map(read));
 assert.deepEqual(request,q.attempt);assert.equal(result.accepted,false);assert.equal(result.status,q.status);assert.equal(result.levelSha256,q.levelSha256);assert.deepEqual(result.lower,q.lowerBound?.result);assert.deepEqual(result.upper,q.route?.search);assert.deepEqual(sidecar,q);assert.equal(identity.origin,id);
 for(const b of blocked){assert.equal(b.attemptId,id);assert.equal(b.status,q.status);}
 assert(Number.isFinite(Date.parse(request.startedAt)));assert(Number.isFinite(Date.parse(result.finishedAt)));
 const physical=sealedWorldIdentity(q.level);for(const k of ['shapeSha256','colorSha256','colorAssignments','designSha256','retryIdentitySha256'])assert.deepEqual(request[k],physical[k],'Failed parent original fingerprint: '+k);
 return{sourceLevelId:q.sourceLevelId,namespace,request,receipt:q,evidence:{policy:BATCH_PARENT_POLICY,origin:'earlier-batch-terminal',sourceLevelId:q.sourceLevelId,recipeIndex:q.recipeIndex,recipeId:q.recipeId,namespace,attemptId:id,startedAt:request.startedAt,receipt,...evidence},fileBindings:bindings};
}

/** One fixed-order overlay, separate from the immutable v6 history. A caller
 * must stop on commit failure; no cursor or parent changes before all reads pass. */
export function createOrderedFailedParentOverlay(seeds,recipes,scope){
 assert(Array.isArray(recipes)&&recipes.length>=1&&recipes.length<=64);const wanted=new Set(recipes.map(r=>r.sourceLevelId)),parents=new Map(),events=[];let nextIndex=0,haltReason=null;
 assert(Array.isArray(seeds)&&seeds.length===wanted.size);
 for(const seed of seeds){assert(wanted.has(seed.sourceLevelId)&&!parents.has(seed.sourceLevelId));assert.equal(seed.receipt.accepted,false);assert.equal(seed.receipt.sourceLevelId??seed.receipt.level?.id,seed.sourceLevelId);assert.equal(seed.evidence.policy,BATCH_PARENT_POLICY);assert.equal(seed.evidence.origin,'sealed-history');assert.equal(seed.evidence.attemptId,seed.request.id);assert.equal(seed.evidence.startedAt,seed.request.startedAt);assert.equal(seed.evidence.sourceLevelId,seed.sourceLevelId);for(const k of ['receipt','request','result'])descriptor(seed.evidence[k]);assert(seed.evidence.blocked?.length===2);seed.evidence.blocked.forEach(descriptor);parents.set(seed.sourceLevelId,freeze(structuredClone(seed)));}
 const resolve=index=>{assert.equal(haltReason,null,'Parent overlay is terminal and cannot resume');assert.equal(index,nextIndex,'Parent resolution follows fixed recipe order');assert(index<recipes.length);return parents.get(recipes[index].sourceLevelId);};
 return{
  resolve,
  async commit(index,q,receipt,evidence,readBytes){
   try{
   const parent=resolve(index),recipe=recipes[index];assert.equal(q.recipeIndex,index);assert.equal(q.recipeId,recipe.recipeId);assert.equal(q.sourceLevelId,recipe.sourceLevelId);assert.deepEqual(q.resolvedFailedParent,parent.evidence);
   descriptor(receipt);const bytes=await readBytes(receipt.path);assert.equal(digest(bytes),receipt.sha256);assert.deepEqual(JSON.parse(bytes),q,'Candidate receipt must exist before commit');
   let advanced=null;
   if(q.attempt&&!q.accepted)advanced=await authenticateBatchFailedParent(q,receipt,evidence,parent,scope,readBytes);
   else assert.equal(evidence,null,'Non-failed inputs have no failure-parent publication');
   if(advanced)parents.set(q.sourceLevelId,freeze(advanced));
   events.push({recipeIndex:index,recipeId:q.recipeId,sourceLevelId:q.sourceLevelId,receipt,parent:parent.evidence,advanced:Boolean(advanced),newParent:advanced?.evidence??null});nextIndex++;
   return{advanced:Boolean(advanced),fileBindings:advanced?.fileBindings??{[receipt.path]:receipt.sha256}};
   }catch(e){haltReason??=e.message;throw e;}
  },
  report(){return{policy:BATCH_PARENT_POLICY,maximumInputs:recipes.length,committedInputs:nextIndex,halted:haltReason!==null,haltReason,events:structuredClone(events),historyStateMutated:false,dynamicRecipesAdded:0};}
 };
}
