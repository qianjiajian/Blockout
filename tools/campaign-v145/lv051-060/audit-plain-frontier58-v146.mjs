import fs from 'node:fs';
import assert from 'node:assert/strict';
import {deserialize} from 'node:v8';
import {digest} from '../../revised-preview-validation-v160.mjs';
const file=process.argv[2],report=JSON.parse(fs.readFileSync(file)),bytes=fs.readFileSync(report.checkpointFile);assert.equal(digest(bytes),report.checkpointSha256);
const restored=deserialize(bytes);assert.deepEqual(restored.binding,report.binding);const q=restored.state;assert.equal(q.floor,11);assert.equal(q.levelSha256,report.binding.levelSha256);
const seen=new Uint8Array(q.nodes.length);let id=q.front,last=-1,count=0,valid=0,lowest=null,previousCost=-1;
while(id!==-1){assert(Number.isSafeInteger(id)&&id>=0&&id<q.nodes.length);assert.equal(seen[id],0,'queue cycle');seen[id]=1;const n=q.nodes[id];assert(n.state instanceof Uint8Array);assert(n.parent<id&&n.parent>=-1);assert(n.cost>=previousCost,'0-1 queue order');previousCost=n.cost;if(q.distances.get(n.key)===n.cost){valid++;lowest??=n.cost;}count++;last=id;id=n.next;}
assert.equal(last,q.back);assert.equal(count,q.pending);assert.equal(count,report.result.pendingQueueRecords);assert.equal(lowest,report.result.lowestQueuedCost);assert.equal(q.distances.size,report.result.discoveredStates);assert(q.distances.size<=q.nodes.length);
const out=file.replace(/[^/]+$/,`plain-frontier-storage-audit58-${Date.now()}.json`);fs.writeFileSync(out,JSON.stringify({checkedAt:new Date().toISOString(),checkpointFile:report.checkpointFile,checkpointSha256:report.checkpointSha256,reportFile:file,reportSha256:digest(fs.readFileSync(file)),storageRoundTripValid:true,bindingPreserved:true,queueAcyclic:true,queueCostNondecreasing:true,pendingQueueRecords:count,validQueuedRecords:valid,lowestQueuedCost:lowest,discoveredStates:q.distances.size,nodes:q.nodes.length,lowerBoundCertified:false},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,count,lowest,states:q.distances.size}));
