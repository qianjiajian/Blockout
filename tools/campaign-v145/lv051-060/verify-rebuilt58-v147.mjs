import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {auditSpatial} from '../../remake91to100-v146.mjs';
import {measureRoute} from '../../remake21to30-quality.mjs';
import {observeMechanismProcess,verifyDecisions} from '../../review-remake31to40-decisions.mjs';
import {projectImmediateRoute} from './immediate-generator-floor56-v146.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.47.0');
const [file,proofFile,qualificationFile]=process.argv.slice(2),d=JSON.parse(fs.readFileSync(file)),l=d.level;
const baseFile='deliverables/remake31-200-v145-20260924/baseline.json',base=JSON.parse(fs.readFileSync(baseFile)).levels[57];
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:`
 export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';
 export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';
 export {auditRevisedCandidate} from './src/core/revisedCandidateAudit.ts';
 export {auditCandidateBlockArt} from './tools/revised-candidate-block-art.mjs';
 export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';
 export {levelStarTargets} from './src/core/levelStarConditions.ts';
`},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const meta=await build({entryPoints:[import.meta.filename],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
const inputs=[...new Set([...Object.keys(compiled.metafile.inputs),...Object.keys(meta.metafile.inputs),file,d.sourceReview,baseFile,'docs/rules/manifest.json','docs/mechanism-rules-v1.47.0.md',...(proofFile?[proofFile]:[]),...(qualificationFile?[qualificationFile,'deliverables/remake31-200-v145-20260924/batches/lv051-060/root58/TERMINAL-NORMALIZATION-REVIEW.md']:[])].filter(p=>p!=='<stdin>'))];
const bindings=Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))]));
assert.equal(l.id,58);assert.equal(l.difficulty,'normal');
const geometry=v=>Object.fromEntries(['width','height','playable','blocked','seams'].filter(k=>Object.hasOwn(v,k)).map(k=>[k,v[k]]));
assert.deepEqual(geometry(l),base.geometry);for(const k of ['id','name','timeSeconds','reward','mechanismRules'])assert.deepEqual(l[k],base.level[k]);assert.deepEqual(api.levelStarTargets(l),base.starTargets);
const source=JSON.parse(fs.readFileSync(d.sourceReview)),facts=source.facts[58];
assert.equal(digest(fs.readFileSync(d.sourceReview)),d.sourceReviewSha256);assert.equal(digest(fs.readFileSync(source.sourceVideo)),source.videoSha256);
for(const f of source.frames)assert.equal(digest(fs.readFileSync(f.path)),f.sha256);
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),shapeKey=s=>s.map(p=>p.join(',')).sort().join(';');
const native={SINGLE:rect(1,1),H2:rect(2,1),V2:rect(1,2),H3:rect(3,1),V3:rect(1,3),SQ2:rect(2,2),SQ3:rect(3,3),T4:[[1,0],[0,1],[1,1],[2,1]]};
assert.equal(facts.opening.length,18);assert.equal(facts.queue.length,5);
const specs=[...facts.opening,...facts.queue],carriers=[];
for(const s of specs){const b=l.blocks.find(b=>b.id===`r147-r58-${s.sourceId}`);assert(b);assert.equal(shapeKey(b.shape),shapeKey(native[s.kind]));assert.equal(b.color,s.sourceId==='q04'?'blue':s.color);assert.equal(b.frozen??0,s.frozen??0);assert.deepEqual(b.layers??[b.color],s.layers??[b.color]);carriers.push({sourceId:s.sourceId,id:b.id,shape:s.kind,color:b.color,frozen:b.frozen??0,layers:b.layers??[b.color]});}
for(const b of l.blocks){for(const k of ['movementAxis','timedBombSeconds','keyId','lockedBy','lockCount','shutterId','star','rotationBadge'])assert(b[k]===undefined,`Source-extraneous ${b.id}.${k}`);}
for(const k of ['shutters','flipDoors','coloredGrids','elevators','conveyors'])assert.equal(l[k]?.length??0,0);
assert(l.gates.every(g=>!g.star));assert.equal(l.blocks.length,25);assert.equal(l.blocks.reduce((n,b)=>n+(b.layers?.length??1),0),27);
const filler=l.blocks.filter(b=>!carriers.some(s=>s.id===b.id));assert.equal(filler.length,2);assert.equal(filler.reduce((n,b)=>n+b.shape.length,0),10);assert(filler.every(b=>!b.frozen&&!b.layers));
assert.deepEqual(l.gates.map(g=>[g.color,g.frozen??0]).sort(),Object.entries(facts.gates).sort());assert.equal(l.generators.length,1);assert.deepEqual(l.generators[0].queueBlockIds,facts.queue.map(s=>`r147-r58-${s.sourceId}`));
assert.deepEqual(d.sourceAdaptation.orientationAdaptations,source.orientationAdaptations.filter(r=>r.level===58));
const audit=auditSpatial(l,api);assert(audit.passed);const replay=api.replayRevisedRoute(l,d.drags);assert(replay.valid&&replay.complete);assert(replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15);
const measurement=measureRoute(l,d.drags,api),decisions=verifyDecisions(d,api),mechanismProcess=observeMechanismProcess(l,d.drags,api),projection=projectImmediateRoute(l,d.drags,api);
assert(measurement.multiCellDrags>measurement.singleCellDrags);assert.equal(mechanismProcess.peels.length,2);assert.equal(mechanismProcess.generatorEvents.flatMap(e=>e.spawned).length,5);
for(const b of l.blocks.filter(b=>b.frozen>0))assert(mechanismProcess.transitions.some(t=>t.thawedBlocks.includes(b.id)));
for(const g of l.gates.filter(g=>g.frozen>0))assert(mechanismProcess.transitions.some(t=>t.thawedGates.includes(g.id)));
assert.equal(d.iceLocalChoices.length,2);const iceChoices=d.iceLocalChoices.map(c=>{assert(['blocks','gates'].includes(c.collection));assert.deepEqual(c.prefix,d.drags.slice(0,c.beforeDrag-1));const before=api.replayRevisedRoute(l,c.prefix);assert(before.valid);assert.equal(c.relaxedCount,before.clearEvents);const original=l[c.collection].find(v=>v.id===c.id);assert.equal(original.frozen,c.originalCount);assert(original.frozen>c.relaxedCount);const contrast=structuredClone(l);contrast[c.collection].find(v=>v.id===c.id).frozen=c.relaxedCount;assert(!api.replayRevisedRoute(l,[...c.prefix,c.blockedAction]).valid);assert(api.replayRevisedRoute(contrast,[...c.prefix,c.blockedAction]).valid);return{collection:c.collection,id:c.id,passed:true};});
let proof=null,L=null,proofBinding=null,qualification=null,proofWitness=null;
if(proofFile){const p=JSON.parse(fs.readFileSync(proofFile));assert.equal(p.levelSha256,digest(l));assert.equal(p.proof.sourceLevelSha256,digest(l));assert.equal(p.proof.floor,11);
 // A lower bound is a property of the unchanged complete level. A newly
 // shortened upper witness must be replayed afresh, while retaining the exact
 // original proof/witness hashes instead of relabeling its historical report.
 const proofCandidate=p.candidate??p.file;assert(proofCandidate);const original=JSON.parse(fs.readFileSync(proofCandidate));assert.deepEqual(original.level,l);assert.equal(digest(original.drags),p.routeSha256);const proofReplay=api.replayRevisedRoute(original.level,original.drags);assert(proofReplay.valid&&proofReplay.complete);proofWitness={candidate:proofCandidate,routeSha256:p.routeSha256,sameLevelVerified:true,currentWitnessDifferent:p.routeSha256!==digest(d.drags)};
 const basic='single-fixed-generator-immediate-spawn-optional-contact-axis-v146',terminal=['single-fixed-generator-terminal-final-body-normalization-v147','single-fixed-generator-terminal-final-body-normalization-continuable-v147'];
 assert(p.proof.abstraction===basic||terminal.includes(p.proof.abstraction));
 if(terminal.includes(p.proof.abstraction)){assert(qualificationFile,'Terminal graph requires matching qualification evidence');const q=JSON.parse(fs.readFileSync(qualificationFile));assert.equal(q.status,'PASS');assert(q.rows.some(r=>r.levelSha256===digest(l)&&r.routeSha256===digest(d.drags)));assert.deepEqual(q.drift,[]);for(const[f,h]of Object.entries(q.bindings))assert.equal(digest(fs.readFileSync(f)),h,`Qualification input changed: ${f}`);qualification={file:qualificationFile,sha256:digest(fs.readFileSync(qualificationFile))};}
 assert.deepEqual(p.drift,[]);assert(p.projection.passed);for(const[f,h]of Object.entries(p.bindings))assert.equal(digest(fs.readFileSync(f)),h,`Proof input changed: ${f}`);proof=p.proof;proofBinding={file:proofFile,sha256:digest(fs.readFileSync(proofFile))};if(proof.thresholdProven){assert.equal(proof.status,'threshold-proven');L=11;}}
for(const[p,h]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(p)),h,`Validation input changed: ${p}`);
const status=L===11?'PASS':'STAGES_PASS_FLOOR_NOT_CHECKED';
const r={status,id:58,ruleVersion:lock.activeVersion,checkedAt:new Date().toISOString(),candidate:file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(l),routeSha256:digest(d.drags),L,U:replay.nonClearingDrags,totalDrags:d.drags.length,sourceContractPassed:true,source:{review:d.sourceReview,reviewSha256:d.sourceReviewSha256,videoVerified:true,framesVerified:source.frames.length,carriers,filler},audit,replay,measurement,decisions,process:mechanismProcess,iceChoices,projection,proof,proofBinding,proofWitness,qualification,bindings,pointerValidated:false,formalAdopted:false,humanBlindTested:false,preservedStars:base.starTargets};
const out=`deliverables/remake31-200-v145-20260924/batches/lv051-060/root58/independent-check58-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(r,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,status,L,U:r.U}));
