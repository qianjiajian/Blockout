import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {ROOT,ruleGate,loadApi,digest,writeNew} from './common.mjs';
import {fifoPayload} from './author235-native.mjs';
ruleGate();
const {api}=await loadApi(), rows=[];
const raw=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const omitUnsupported=(s,id)=>{s=structuredClone(s);if(id===235)for(const g of s.generators??[])delete g.size;return s;};
for(const id of [231,233,234,235,236,237,238,239]){
 const original=`${ROOT}/author${id}/qualified${id}.json`, current=`${ROOT}/author${id}/qualified${id}-schema.json`;
 const old=JSON.parse(fs.readFileSync(original)), packet=JSON.parse(fs.readFileSync(current));
 assert.equal(old.levelSha256,digest(old.level));assert.equal(packet.levelSha256,digest(packet.level));
 assert.deepEqual(old.drags,packet.drags);assert.equal(packet.routeSha256,digest(packet.drags));
 const expected=structuredClone(old.level), originalMetadata=expected.mechanismAdaptation;
 expected.mechanismAdaptation={userAuthorized:'用户要求根据竞品关卡视频继续制作200关以后的关卡；按既有主线合同作必要适配与原创重排。',change:originalMetadata.change,sourceFactsFile:originalMetadata.sourceReference};
 if(id===235)for(const g of expected.generators){assert.equal(g.size,g.rimSpan);delete g.size;}
 assert.deepEqual(packet.level,expected);
 const revised=new Set(['level','levelSha256','audit','strictReplay','schemaRebind','pointerValidated','naturalClockValidated','formalAccepted','formalAdopted']);
 for(const k of Object.keys(old))if(!revised.has(k))assert.deepEqual(packet[k],old[k],`level ${id} retained ${k}`);
 assert.equal(packet.schemaRebind.originalFileJsonBufferSha256,digest(fs.readFileSync(original)));
 assert.equal(packet.schemaRebind.originalLevelSha256,old.levelSha256);
 assert.equal(packet.schemaRebind.levelSha256,packet.levelSha256);
 assert.equal(packet.formalAccepted,false);assert.equal(packet.pointerValidated,false);
 const before=new api.PuzzleModel(structuredClone(old.level)),after=new api.PuzzleModel(structuredClone(packet.level));before.startCountdown();after.startCountdown();
 assert.deepEqual(omitUnsupported(before.snapshot(),id),omitUnsupported(after.snapshot(),id));
 const states=[];
 for(const [i,drag] of packet.drags.entries()){
  for(const model of [before,after]){model.beginAction();for(const [x,y]of drag.path)assert(model.moveBlockStep(drag.blockId,x,y));if(drag.exitSide)assert(model.tryExit(drag.blockId,drag.exitSide).ok);assert(model.commitAction());}
  const a=omitUnsupported(before.snapshot(),id),b=omitUnsupported(after.snapshot(),id);assert.deepEqual(a,b,`level ${id} prefix ${i+1}`);states.push(digest(b));
 }
 assert(before.snapshot().complete&&after.snapshot().complete);
 let nativePayloadSha256=null;if(id===235){const a=fifoPayload(old.level,api).p,b=fifoPayload(packet.level,api).p;assert.deepEqual(a,b);nativePayloadSha256=digest(a);}
 rows.push({id,status:'PASS',original,current,originalRawSha256:raw(original),currentRawSha256:raw(current),originalJsonBufferSha256:digest(fs.readFileSync(original)),originalLevelSha256:old.levelSha256,currentLevelSha256:packet.levelSha256,routeSha256:digest(packet.drags),allMathematicalEvidenceRetained:true,exactAllowedMetadataChanges:true,initialStateEqualExceptUnsupportedGeneratorSize:true,allRoutePrefixesEqualExceptUnsupportedGeneratorSize:true,routePrefixCount:states.length,stateSha256s:states,nativePayloadSha256,complete:true});
}
const output=`${ROOT}/independent-review/schema-rebind-review-${Date.now()}.json`;
writeNew(output,{status:'PASS',rulesVersion:'1.198.0',reviewer:'video_facts',scriptRawSha256:raw(new URL(import.meta.url)),notes:['Only provenance metadata changes and, for235, removal of redundant unsupported generator.size were accepted.','The retained originalFileJsonBufferSha256 means SHA256(JSON.stringify(Node Buffer)), distinct from raw file SHA256; both encodings are recorded.','This review does not replace the required fresh formal Pointer and natural-clock acceptance.'],rows});
console.log(JSON.stringify({output,status:'PASS',levels:rows.map(r=>r.id),prefixStatesCompared:rows.reduce((n,r)=>n+r.routePrefixCount,0)}));
