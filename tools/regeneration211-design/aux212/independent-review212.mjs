import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {sha256} from '../../continuation211-runtime.mjs';
import {loadSpatialApi} from '../../continuation211-optional-lift-domain.mjs';
import {liftPayload} from '../../continuation211-native-lift.mjs';
import {loadApi,replay} from '../../remake191-200/replay.mjs';
import {stationaryPayload} from './stationary-prefix.mjs';
import {hiddenPartitionProjection,auditPartitionCertificates} from './partition-audit.mjs';
import {adjacency} from '../../regeneration212-design/design212.mjs';
import {auditOpeningCoverage} from '../../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../../revised-hidden-coverage.mjs';

const base='deliverables/continue211-220-20260930/';
const file=process.argv[2]??base+'root212-combined35-yellow/candidate-0.json';
const output=process.argv[3]??base+'design-new/aux212/independent-review212-original.json';
const read=f=>JSON.parse(fs.readFileSync(f));
const raw=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const candidate=read(file),originalFile=base+'root212-combined35-yellow/candidate-0.json',original=read(originalFile);
const level=candidate.level,coverId='root212-top35',hiddenFile=original.hiddenFile,hidden=read(hiddenFile);
const drags=candidate.drags??original.drags;
assert.equal(candidate.levelSha256,sha256(level));
const api=await loadSpatialApi(),runtime=await loadApi();
const projection=hiddenPartitionProjection(level,coverId);
const prefixInput=stationaryPayload(level,api,{goalClears:10});
const withoutMetadata=p=>{const q=structuredClone(p);delete q.sourceLevelSha256;delete q.projectionLevelSha256;return q;};
assert.deepEqual(withoutMetadata(prefixInput),withoutMetadata(original.prefixInput));
assert.equal(original.prefixInput.sourceLevelSha256,sha256(original.level));
assert.deepEqual(original.prefixInput,stationaryPayload(original.level,api,{goalClears:10}));
assert.equal(original.prefix.thresholdProven,true);
const hiddenInput=read(hidden.bound.input);
assert.equal(hidden.bound.inputSha256,sha256(hiddenInput));
const freshHiddenInput=liftPayload(projection.level,api,{floor:hiddenInput.floor,maxMilliseconds:hiddenInput.maxMilliseconds,maxStates:hiddenInput.maxStates}).p;
assert.deepEqual(freshHiddenInput,hiddenInput);
const hiddenRawOutput=read(hidden.bound.output);
for(const [k,v] of Object.entries(hiddenRawOutput))assert.deepEqual(hidden.bound[k],v);
assert.equal(hidden.bound.thresholdProven,true);assert.equal(hidden.bound.floor,7);
assert.equal(raw(hidden.bound.source),hidden.bound.sourceHash);
const partition=auditPartitionCertificates({level,coverId,prefixBound:{...original.prefix,goalClears:10},hiddenBound:hidden.bound,hiddenProjection:projection.level});
const qualificationFiles=[base+'design-new/aux212/stationary-prefix-qualification.json',base+'design-new/aux212/partition-qualification-v2.json',base+'native-lift-qualification.json'];
const qualifications=qualificationFiles.map(f=>{const q=read(f);assert.equal(q.status,'PASS');if(q.sourceSha256)assert.equal(sha256(fs.readFileSync(q.source)),q.sourceSha256);for(const [s,h]of Object.entries(q.codeSha256??{}))assert.equal(raw(s),h);return{file:f,rawSha256:raw(f),source:q.source,sourceRawSha256:raw(q.source),recordedSourceHashAlgorithm:q.sourceSha256?'sha256(canonical-json(Buffer-numeric-keys))':'sha256(raw-bytes)',cases:q.cases??q.rows.length,comparisons:q.modelComparisons??q.actualCompleteSmallGraphComparisons??q.rows.reduce((n,r)=>n+r.statesCompared,0)};});
assert.equal(sha256(fs.readFileSync('tools/regeneration211-design/aux212/qualify-stationary-prefix.mjs')),read(qualificationFiles[0]).qualificationSourceSha256);
assert.equal(sha256(fs.readFileSync('tools/regeneration211-design/aux212/qualify-partition-v2.mjs')),read(qualificationFiles[1]).qualificationSourceSha256);
const replayed=replay(level,drags,runtime.api,{timed:true,complete:true,requirePointerCompatible:true});
assert.equal(replayed.nonClearingDrags,14);assert.equal(replayed.effectiveDrags,50);assert.equal(replayed.clearEvents,36);
const m=new runtime.api.PuzzleModel(level);m.startCountdown();const trace=[];let prefixCost=0,split;
for(const [i,d] of drags.entries()){
 const before=m.snapshot();m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());const after=m.snapshot();
 if(before.cleared<10)prefixCost+=Number(after.cleared===before.cleared);
 trace.push({step:i+1,blockId:d.blockId,clearEvents:after.cleared,parking:after.cleared===before.cleared});
 if(before.cleared<10&&after.cleared>=10){
  assert.equal(after.cleared,10);for(const b of level.blocks.filter(b=>b.shutterId===coverId)){const a=after.blocks.find(a=>a.id===b.id);assert(a);assert.equal(a.x,b.x);assert.equal(a.y,b.y);}
  split={afterDrag:i+1,clearEvents:after.cleared,prefixParking:prefixCost,all13HiddenStillAtOriginalPoses:true};
 }
}
assert(split);
const opening=auditOpeningCoverage(new runtime.api.PuzzleModel(level).snapshot()),hiddenCoverage=auditHiddenCoverage(level);assert(opening.passed&&hiddenCoverage.passed);
const cohorts=[['opening',level.blocks.filter(b=>!b.shutterId)],...level.shutters.map(c=>[c.id,level.blocks.filter(b=>b.shutterId===c.id)])].map(([id,blocks])=>({id,bodies:blocks.length,area:blocks.reduce((n,b)=>n+b.shape.length,0),adjacency:adjacency(blocks)}));
assert(cohorts.every(c=>!c.adjacency.length));
const native=level.blocks.map(b=>({id:b.id,match:api.matchFormalBlockShape(b.shape,'native-only')}));assert(native.every(b=>b.match?.quarterTurns===0));
const irre=level.blocks.filter(b=>b.shape.length!==(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1])))).length;assert(irre/level.blocks.length<=.3);
const report={status:'PASS_BOUNDS_AND_STRICT_ROUTE',file,fileRawSha256:raw(file),levelSha256:sha256(level),activeVersion:read('docs/rules/manifest.json').activeVersion,scope:'Independent proof-input, qualification hash, structural cohort and strict Pointer-compatible model replay audit. This is not natural-clock browser validation or formal adoption.',prefix:{source:originalFile,sourceFileRawSha256:raw(originalFile),inputSha256:sha256(prefixInput),originalInputSha256:sha256(original.prefixInput),mechanicalInputDeepEqual:true,sourceMetadataMayDiffer:file!==originalFile,certificate:original.prefix},hidden:{source:hiddenFile,sourceFileRawSha256:raw(hiddenFile),originalProjectionSha256:hidden.levelSha256,finalProjectionSha256:projection.sha256,compiledNativeInputDeepEqual:true,nativeInput: hidden.bound.input,nativeInputRawSha256:raw(hidden.bound.input),nativeInputCanonicalSha256:sha256(hiddenInput),nativeOutput:hidden.bound.output,nativeOutputRawSha256:raw(hidden.bound.output),certificate:hidden.bound},partition,qualifications,replay:replayed,split,trace,structure:{opening,hiddenCoverage,cohorts,native,irregularBodies:irre,fullBodies:level.blocks.length,irreRatio:irre/level.blocks.length,allTemplateCrossCohortDiagnostic:adjacency(level.blocks),crossCohortDiagnosticScope:'One static cross-curtain pair does not violate visible-opening adjacency. v1.2.1 line88 explicitly excludes hidden and queued bodies; each true hidden cohort is independently clean. This is not a claim of all-template adjacency zero.'},dependencies:Object.fromEntries([...runtime.inputs,'tools/regeneration211-design/aux212/independent-review212.mjs','tools/regeneration211-design/aux212/stationary-prefix.mjs','tools/regeneration211-design/aux212/partition-audit.mjs','tools/continuation211-native-lift.cs','tools/continuation211-native-lift.mjs','tools/continuation211-optional-lift-domain.mjs'].map(f=>[f,raw(f)])),searchRepeated:false,pointerValidated:false,naturalClockValidated:false};
fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,sha:report.levelSha256,L:partition.lowerBound,U:replayed.nonClearingDrags,total:replayed.effectiveDrags,split,cohorts:cohorts.map(c=>({id:c.id,bodies:c.bodies,area:c.area,adj:c.adjacency.length}))}));
