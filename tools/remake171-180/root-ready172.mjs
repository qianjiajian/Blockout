import fs from 'node:fs';import assert from 'node:assert/strict';
import{ROOT,digest,writeNew,ruleGate,auditSpatial}from'./common.mjs';
import{loadApi,replay}from'./replay.mjs';import{replayTiming}from'./observed-timing.mjs';
import{prove}from'./assist172/prefix-quotient.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),sha=p=>digest(fs.readFileSync(p));
const file=ROOT+'/assist172/tail-candidate-1790529917717.json',d=read(file),l=d.level,{api,inputs}=await loadApi();ruleGate();
const reviewFile=ROOT+'/author175-177/assist172/review172-final-1790530040500.json',ind=read(reviewFile);
const sourceFile=ROOT+'/author178-180/assist172/source-review172-1790530143427.json',source=read(sourceFile);
const decisionFile=ROOT+'/author171-174/assist172/decisions-final172-1790530065184.json',dec=read(decisionFile);
const spatial=auditSpatial(l,api),route=replay(l,d.drags,api,{complete:true,requirePointerCompatible:true});
assert.equal(route.nonClearingDrags,20);assert.equal(d.drags.length,60);assert.equal(route.clearEvents,40);
assert.equal(l.blocks.length,34);assert.equal(l.blocks.filter(b=>!b.shutterId).length,23);assert.equal(l.blocks.filter(b=>b.layers?.length===2).length,6);assert.equal(l.blocks.filter(b=>b.movementAxis).length,4);
assert.equal(l.shutters.length,1);assert.equal(l.shutters[0].count,13);assert.equal(l.gates.length,8);assert.equal(l.gates.filter(g=>g.frozen).length,7);
assert.equal(source.status,'SOURCE_SPATIAL_MECHANISM_PRESERVATION_PASS');assert.equal(source.candidateHash,sha(file));assert.equal(source.levelSha256,digest(l));
assert.equal(sha(source.source.ledger),source.source.ledgerHash);assert.equal(sha(source.source.unoperatedFrame),source.source.unoperatedFrameHash);
const ledger=read(source.source.ledger);for(const[p,h]of Object.entries(ledger.evidence))assert.equal(sha(p),h);
for(const[p,h]of Object.entries(source.bindings))assert.equal(sha(p),h);
assert.equal(source.source.mapping.length,34);assert.equal(new Set(source.source.mapping.map(x=>x.candidate.id)).size,34);
const seen=new Set();for(const m of source.source.mapping){const b=l.blocks.find(b=>b.id===m.candidate.id),s=(m.phase==='opening'?ledger.opening:ledger.curtain.pieces)[m.sourceIndex];
 assert.deepEqual(b,m.candidate);assert(!seen.has(m.phase+':'+m.sourceIndex));seen.add(m.phase+':'+m.sourceIndex);assert.equal(b.layers?.length??1,s.layers?.length??1);assert.equal(b.movementAxis,s.movementAxis);assert.equal(Boolean(b.shutterId),m.phase==='hidden');
}
assert.deepEqual(l.gates.map(g=>[g.color,g.frozen??0]).sort(),ledger.gates.filter(g=>g.color!=='lime').map(g=>[g.color,g.frozen??0]).sort());
assert.equal(ind.status,'FINAL172_L16_U20_MODEL_SOURCE_STATIC_PASS_GUI_PENDING');assert.equal(ind.levelSha256,digest(l));
for(const[p,h]of Object.entries(ind.bindings))assert.equal(sha(p),h);
assert(ind.native.thresholdProven&&ind.raw.thresholdProven&&ind.raw.noCanonicalIdentityMerge&&ind.raw.noNativeTerminalPrune);
assert.equal(ind.projection.goalClears,3);assert.equal(ind.projection.activeBodies,23);assert.equal(ind.projection.frozenHiddenInventory.length,11);assert(ind.projection.future.every(b=>b.outerGate.frozen>=3));
assert.equal(ind.fullEvidence.rows.length,60);assert.equal(ind.fullEvidence.unitSteps,337);assert.equal(ind.fullEvidence.bodyRemovals,34);assert.equal(ind.fullEvidence.shellPeels,6);assert.equal(Object.keys(ind.fullEvidence.allEightPortsUsed).length,8);
const lower={...prove(l,api,{goalClears:3,floor:16,maxStates:300000,maxMilliseconds:3500}),goalClears:3,projection:ind.projection.argument};assert(lower.thresholdProven);
assert.equal(dec.status,'PASS');assert.equal(dec.inputSha256,sha(file));assert.equal(dec.routeSha256,digest(d.drags));assert.equal(dec.cases.length,3);
for(const c of dec.cases){const r=replay(l,[...d.drags.slice(0,c.prefixDrags),c.wrongPark,c.recoveryDrag,...c.completionRoute],api,{complete:true,requirePointerCompatible:true});assert.equal(r.nonClearingDrags,22);assert.throws(()=>replay(l,[...d.drags.slice(0,c.prefixDrags),c.wrongPark,c.blockedNextDrag],api,{requirePointerCompatible:true}));}
function modelAt(n){const m=new api.PuzzleModel(l);m.startCountdown();for(const a of d.drags.slice(0,n)){m.beginAction();for(const p of a.path)assert(m.moveBlockStep(a.blockId,...p));if(a.exitSide)assert(m.tryExit(a.blockId,a.exitSide).ok);assert(m.commitAction());}return m;}
assert.equal(dec.controls.length,3);for(const c of dec.controls){const m=modelAt(c.prefixDrags),control=m.clone();m.beginAction();control.beginAction();
 if(c.kind==='ice-door'){assert(!m.tryExit(c.blockId,c.side).ok);control.gates.find(g=>g.id===c.gateId).frozen=0;assert(control.tryExit(c.blockId,c.side).ok);}
 else if(c.kind==='axis'){assert(!m.moveBlockStep(c.blockId,...c.attempt));delete control.getBlock(c.blockId).movementAxis;assert(control.moveBlockStep(c.blockId,...c.attempt));}
 else{assert.equal(c.kind,'shell');assert.equal(m.getBlock(c.blockId).layers[0],c.retainedCoreColor);assert(!m.tryExit(c.blockId,c.peelingDrag.exitSide).ok);const b=control.getBlock(c.blockId);b.color=c.outerColor;b.layers=[c.outerColor];assert(control.tryExit(c.blockId,c.peelingDrag.exitSide).ok);}
}
const pointer=[];for(const dir of['pointer-1790529987540-320x568-50716','pointer-1790529987557-496x1078-46464']){const reportFile=ROOT+'/'+dir+'/report.json',r=read(reportFile),row=r.rows.find(x=>x.id===172);assert.equal(r.status,'PASS');assert(r.candidateOnly);assert.equal(row.levelSha256,digest(l));assert.equal(row.routeSha256,digest(d.drags));const timingFile=ROOT+'/'+dir+'/lv172-observed-timing.json',timing=replayTiming(l,read(timingFile),api);assert(row.final.complete&&!row.final.failed);pointer.push({reportFile,sha256:sha(reportFile),timingFile,timing});}
const qualification=ROOT+'/root-qualified172-'+Date.now()+'.json';writeNew(qualification,{passed:true,levelSha256:digest(l),lower,independentRaw:ind.raw,independentNative:ind.native,projection:ind.projection,reviewFile,reviewSha256:sha(reviewFile),sourceFile,sourceSha256:sha(sourceFile),decisionFile,decisionSha256:sha(decisionFile),qualificationFiles:Object.keys(ind.bindings).filter(p=>p.includes('qualification')),shellPruneQualification:ROOT+'/assist172/qualification-1790529041626.json',pointer});
const row={id:172,file,candidateSha256:sha(file),levelSha256:digest(l),routeSha256:digest(d.drags),reviewFile,reviewSha256:sha(reviewFile),L:16,U:20,drags:60,sourceValidated:true,sourceFile,sourceSha256:sha(sourceFile),spatial,route,lower,qualification,qualificationSha256:sha(qualification),decisionsVerified:3,pointer,score:api.levelStarTargets(l)};
const out=ROOT+'/root-ready172-'+Date.now()+'.json';writeNew(out,{status:'READY_FOR_FORMAL_ADOPTION',ruleVersion:ruleGate().activeVersion,rows:[row],bindings:Object.fromEntries(inputs.map(p=>[p,sha(p)])),formal:false,release:false});console.log(JSON.stringify({out}));
