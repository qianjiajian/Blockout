import fs from 'node:fs';import assert from 'node:assert/strict';import {createHash} from 'node:crypto';
import {sha256,modelBinding,loadContinuationRuntime} from './continuation211-runtime.mjs';
import {loadApi,replay} from './remake191-200/replay.mjs';
import {loadSpatialApi} from './continuation211-colored-witness.mjs';
import {fifoPayload} from './regeneration211-design/native-fifo214-potential.mjs';
import {staticPayload} from './regeneration211-design/native-static219.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditGeneratorQueueColors} from './revised-generator-queue-colors.mjs';
import {adjacency} from './regeneration212-design/design212.mjs';
const root='deliverables/continue211-220-20260930',file=root+'/design-new/qualified214.json',read=f=>JSON.parse(fs.readFileSync(f,'utf8')),raw=f=>createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const p=read(file),l=p.level,b=p.lowerBinding,lower=p.lower,api={...(await loadApi()).api,...await loadSpatialApi()},core=await loadContinuationRuntime();
assert.equal(sha256(l),p.levelSha256);assert.equal(b.levelSha256,p.levelSha256);assert.equal(b.modelBinding,modelBinding());
assert.equal(raw(p.sourceFile),p.sourceRawSha256);assert.equal(raw(b.sourceCertificate),b.sourceCertificateRawSha256);
const prior=read(b.sourceCertificate);assert.equal(sha256(prior.level),b.priorLevelSha256);assert.deepEqual(lower,prior.lower);
const withoutDescription=x=>{const q=structuredClone(x);delete q.mechanismAdaptation;return q;};assert.deepEqual(withoutDescription(l),withoutDescription(prior.level));
assert.equal(lower.status,'threshold-proven');assert.equal(lower.floor,16);assert.equal(lower.suffix.floor,3);assert.equal(lower.suffix.status,'threshold-proven');
for(const [f,h]of Object.entries(lower.codeSha256))assert.equal(raw(f),h);
for(const q of b.qualificationBindings){const record=read(q.file);assert.equal(raw(q.file),q.rawSha256);assert.equal(sha256(record),q.canonicalSha256);assert.equal(record.status,'PASS');for(const[f,h]of Object.entries(record.codeSha256??{}))assert.equal(raw(f),h);}
const payload=fifoPayload(l,api,{floor:16,maxMilliseconds:6000,maxStates:2000000}).p;payload.coverLowerBounds=payload.covers.map((_,i)=>i===0?3:0);
assert.deepEqual(payload,read(lower.input));assert.equal(raw(lower.input),b.sourceNativeInputRawSha256);assert.equal(raw(lower.output),b.sourceNativeOutputRawSha256);assert.equal(sha256(payload),lower.inputSha256);assert.equal(raw(lower.source),lower.sourceHash);
const projection=structuredClone(l);projection.blocks=projection.blocks.filter(v=>v.shutterId).map(v=>{delete v.shutterId;return v;});delete projection.shutters;delete projection.generators;projection.mechanismRules='revised-2026-09-23-v1.4';assert.deepEqual(projection,p.projection);
assert.deepEqual(staticPayload(projection,api,{floor:3,maxMilliseconds:2000,maxStates:250000}).p,read(lower.suffix.input));assert.equal(raw(lower.suffix.input),b.hiddenInputRawSha256);assert.equal(raw(lower.suffix.output),b.hiddenOutputRawSha256);
const audit=core.auditRevisedCandidate(l,p.sourceContract);assert.deepEqual(audit.issues.filter(x=>!['wrong-rule-profile','opening-count-mismatch','full-count-mismatch'].includes(x.code)),[]);assert.deepEqual(core.auditRevisedMechanismContract(l),[]);
const snapshot=new api.PuzzleModel(l).snapshot(),coverage=auditOpeningCoverage(snapshot),hiddenCoverage=auditHiddenCoverage(l),queueColors=auditGeneratorQueueColors(l);assert(coverage.passed&&hiddenCoverage.passed&&queueColors.passed);
// The frozen rule applies spatial adjacency to the visible opening. Queue
// templates are not simultaneous bodies; each machine has its own color rule.
// Check the authored hidden cohort independently as an additional design gate.
assert.deepEqual(adjacency(snapshot.blocks.filter(v=>!v.shutterId||snapshot.shutters.find(s=>s.id===v.shutterId)?.revealed)),[]);assert.deepEqual(adjacency(l.blocks.filter(v=>v.shutterId)),[]);assert(api.auditCandidateBlockArt(l).passed);assert(l.blocks.every(v=>core.matchFormalBlockShape(v.shape,'native-only')?.quarterTurns===0));
assert.deepEqual(l.generators,p.source.sourceLevel.generators);assert.deepEqual(l.shutters,p.source.sourceLevel.shutters);
for(const g of l.generators)for(const id of g.queueBlockIds){const v=l.blocks.find(x=>x.id===id),s=p.source.sourceLevel.blocks.find(x=>x.id===id);assert.equal(v.color,s.color);assert.equal(v.shape.length,s.shape.length);assert.deepEqual(v.layers,s.layers);}
assert.equal(l.blocks.filter(v=>v.layers).length,3);assert.deepEqual(l.blocks.filter(v=>v.frozen).map(v=>v.frozen).sort((a,b)=>a-b),[2,8]);assert.equal(l.blocks.filter(v=>v.movementAxis==='vertical').length,1);
const route=replay(l,p.drags,api,{timed:true,complete:true,requirePointerCompatible:true});assert(route.valid&&route.complete);assert.equal(route.nonClearingDrags,19);assert.equal(route.effectiveDrags,51);assert.equal(l.timeSeconds,105);assert.equal(core.timeTargetForLevel(l),75);
const report={status:'PASS_INDEPENDENT_PREFLIGHT',levelSha256:p.levelSha256,sourceEvidence:file,sourceEvidenceSha256:raw(file),L:16,U:19,starMoves:51,starTimeSeconds:75,totalSeconds:105,coverage,hiddenCoverage,queueColors,adjacencyScope:'Visible stable opening and independent authored hidden cohort. Queued templates are not superimposed on the board. docs/mechanism-rules-v1.2.1.md:88 and v1.40.0.md:231 exclude hidden/queue from opening and disallow cross-machine color restrictions.',route,proofRecompiledWithoutSearch:true,productionCampaignIntegrated:false};fs.writeFileSync(root+'/design-new/independent-review214.json',JSON.stringify(report,null,2),{flag:'wx'});console.log({status:report.status,levelSha256:p.levelSha256,L:16,U:19,drags:51});
