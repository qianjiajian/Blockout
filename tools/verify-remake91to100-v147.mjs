import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {loadApi,BASELINE,OUTPUT,ruleGate,assertBaseline,assertProtected,auditSpatial,digest,writeNew,TARGETS} from './remake91to100-v146.mjs';
import {searchSpatial,loadSpatialApi} from './remake91to100-star-floor.mjs';
import {verifyDecisions,verifyEarlyIceChoices} from './review-remake91to100-decisions-v147.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {verifySource99,verifyMechanisms99} from './verify-remake99-source-v147.mjs';
import {loadSpatialApi as loadFullSpatial,searchSpatial as searchFullSpatial,compileSpatial,replayDomain} from '../deliverables/remake71-80-v146-20260924/floor-review/spatial-domain.mjs';
import {verifySource95,verifyMechanisms95} from './verify-remake95-source-v147.mjs';
import {checkAxisKeyFloor} from './campaign-v145/lv051-060/campaign-axis-key-floor-v146.mjs';
import {collectBindings} from './remake91to100-bindings.mjs';
import {inspectDisjointData} from './remake91to100-data-drift.mjs';
import {verifySource93,verifyMechanisms93} from './verify-remake93-source-v147.mjs';
import {verifyFloor93} from './verify-remake93-floor-v147.mjs';
import {verifySource92,verifyMechanisms92} from './verify-remake92-source-v147.mjs';
import {verifySource91,verifyMechanisms91} from './verify-remake91-source-v147.mjs';
import {verifySource96,verifyMechanisms96} from './verify-remake96-source-v147.mjs';
import {provePlain as provePlain96} from '../deliverables/remake91-100-v146-20260924/agent95-98/priority-plain-floor-lib.mjs';
import {verifySource97,verifyMechanisms97} from './verify-remake97-source-v147.mjs';
import {verifyFloor97} from './verify-remake97-floor-v147.mjs';
import {inspectDisjointWiring} from './remake91to100-wiring-drift.mjs';
import {verifySource94,verifyMechanisms94} from './verify-remake94-source-v147.mjs';
import {exactFloor94} from '../deliverables/remake91-100-v146-20260924/agent91-94/exact-static-floor94-v2.mjs';
import {verifySource98,verifyMechanisms98} from './verify-remake98-source-v147.mjs';
import {verifyFloor98Native} from '../deliverables/remake91-100-v146-20260924/agent97-review/cross-review98-native-wrapper.mjs';

const sq2=[[0,0],[1,0],[0,1],[1,1]];
const act=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
export function verifySource100(data){
 const l=data.level,s=data.sourceReview;assert.equal(l.id,100);assert(s&&s.stableOpening&&s.truth);
 assert.equal(s.stableOpening.file,'.codex-temp/video-audit-71-100/91-100/samples1s/sec-01350.jpg');
 assert.equal(s.stableOpening.sha256,'ed168fc8f7d1ccf0c138bc6c7bcb517dbdc81a3baa1cc0340ae0ef9f78021ec4');
 const sources=Object.fromEntries([s.stableOpening,s.truth].map(r=>{assert.equal(digest(fs.readFileSync(r.file)),r.sha256);return[r.file,r.sha256];}));
 // Root visually re-read the stable screenshot. Fixed ledger prevents a
 // candidate from altering both its inventory and its claimed source.
 const original=['orange','green*','orange*','green*','orange*','green','orange','green*','orange*','green*','orange','green'];
 assert.equal(s.sourceBlocks.length,12);assert.equal(l.blocks.length,12);
 s.sourceBlocks.forEach((b,i)=>{assert.equal(b.color+(b.star?'*':''),original[i]);assert.equal(b.x,(i%3)*2);assert.equal(b.y,Math.floor(i/3)*2);assert.deepEqual(b.shape,sq2);});
 const inventory=blocks=>blocks.map(b=>{assert.deepEqual(b.shape,sq2);assert(Object.keys(b).every(k=>['id','x','y','shape','color','star'].includes(k)));return b.color+(b.star?'*':'');}).sort();
 assert.deepEqual(inventory(l.blocks),original.slice().sort());
 assert.equal(new Set(s.blockMapping.map(r=>r.sourceId)).size,12);assert.equal(new Set(s.blockMapping.map(r=>r.candidateId)).size,12);
 for(const r of s.blockMapping){const a=s.sourceBlocks.find(b=>b.id===r.sourceId),b=l.blocks.find(b=>b.id===r.candidateId);assert(a&&b);assert.equal(a.color,b.color);assert.equal(Boolean(a.star),Boolean(b.star));assert.deepEqual(a.shape,b.shape);assert.deepEqual([a.x,a.y],r.sourceAnchor);assert.deepEqual([b.x,b.y],r.candidateAnchor);}
 const sourceGates=[{id:'orange-ordinary',color:'orange',side:'bottom',offset:2,size:2},{id:'green-ordinary',color:'green',side:'top',offset:2,size:2,frozen:6},{id:'orange-star',color:'orange',side:'left',offset:2,size:2,frozen:3,star:true},{id:'green-star',color:'green',side:'right',offset:2,size:2,frozen:8,star:true}];
 assert.deepEqual(s.sourceGates,sourceGates);assert.equal(l.gates.length,4);assert.equal(s.gateBindings.length,4);
 for(const old of sourceGates){const g=l.gates.find(a=>a.id===old.id),m=s.gateBindings.find(a=>a.sourceId===old.id);assert(g&&m);assert.equal(g.color,old.color);assert.equal(Boolean(g.star),Boolean(old.star));assert.equal(g.frozen??0,old.frozen??0);assert.equal(g.size,2);assert.deepEqual(m.from,old);assert.deepEqual(m.to,g);}
 for(const k of ['generators','shutters','flipDoors','coloredGrids','elevators','conveyors'])assert(!l[k]?.length);
 assert.equal(l.featureIntro?.kind,'star');
 // A 6x8 rectangle filled with twelve SQ2s has one geometric tiling. Require
 // functional spatial rearrangement under every permitted whole-board flip,
 // retaining actual color and star roles (not just rename or mirror a source).
 const signature=(blocks,fx,fy)=>blocks.map(b=>`${fx?4-b.x:b.x},${fy?6-b.y:b.y}:${b.color}:${!!b.star}`).sort().join('|');
 const candidate=signature(l.blocks,false,false);
 for(const fx of [false,true])for(const fy of [false,true])assert.notEqual(candidate,signature(s.sourceBlocks,fx,fy));
 const roleChanges=l.blocks.filter(b=>{const old=s.sourceBlocks.find(a=>a.x===b.x&&a.y===b.y);return Boolean(old.star)!==Boolean(b.star);}).length;
 assert(roleChanges>=4);assert(l.gates.filter(g=>{const old=sourceGates.find(a=>a.id===g.id);return old.side!==g.side||old.offset!==g.offset;}).length>=3);
 return{sources,bodyCount:12,starCount:7,ice:[3,6,8],functionalPositionsChanged:roleChanges,geometryTilingOriginal:false,functionalAdjacencyOriginal:true,hiddenInventory:'none'};
}
export function verifyStarCases(data,api){
 const evidence=[];assert(data.mechanismEvidence?.starCases?.length);
 for(const c of data.mechanismEvidence.starCases){
  assert(Number.isSafeInteger(c.afterDrags)&&c.afterDrags>=0&&c.afterDrags<=data.drags.length);assert.deepEqual(c.prefix,data.drags.slice(0,c.afterDrags));
  const original=new api.PuzzleModel(data.level);original.startCountdown();c.prefix.forEach(d=>act(original,d));
  assert.equal(original.exitAttemptStatus(c.blockId,c.side),'star-gate-required');
  const copy=structuredClone(data.level),body=copy.blocks.find(b=>b.id===c.blockId);assert(body?.star);delete body.star;
  const relaxed=new api.PuzzleModel(copy);relaxed.startCountdown();c.prefix.forEach(d=>act(relaxed,d));
  const restored=relaxed.snapshot(),expected=original.snapshot();restored.blocks.find(b=>b.id===c.blockId).star=true;assert.deepEqual(restored,expected);
  assert.equal(relaxed.exitAttemptStatus(c.blockId,c.side),'ok');evidence.push({afterDrags:c.afterDrags,blockId:c.blockId,side:c.side,rejected:'star-gate-required',singleStarRemoval:'ok',sameSpatialPrefix:true});
 }
 return evidence;
}
export async function verifyCandidate(data,api,baseline){
 const {level,drags}=data;assertProtected(level,baseline,api);const spatial=auditSpatial(level,api);assert(spatial.passed,JSON.stringify(spatial));
 if(data.levelSha256)assert.equal(data.levelSha256,digest(level));const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete,replay.error);assert(replay.nonClearingDrags<=TARGETS[level.id].range[1]);
 if(level.id===91){
  const source=verifySource91(data),full=await loadFullSpatial(),floor=searchFullSpatial(level,full,{prove:true,floor:16,maxStates:1000000,maxMilliseconds:240000,maxTransitions:20000000});assert(floor.thresholdProven,JSON.stringify(floor));
  const fullDomainReplay=replayDomain(compileSpatial(level,full),drags,full);assert(fullDomainReplay.complete);
  return{id:91,status:'PASS',levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,floor,fullDomainReplay,decisions:verifyDecisions(data,api),mechanisms:verifyMechanisms91(data,api),measurement:measureRoute(level,drags,api),humanBlindTested:false};
 }
 if(level.id===92){
  const source=verifySource92(data),full=await loadFullSpatial(),floor=searchFullSpatial(level,full,{prove:true,floor:5,maxStates:1000000,maxMilliseconds:120000,maxTransitions:20000000});assert(floor.thresholdProven,JSON.stringify(floor));
  const fullDomainReplay=replayDomain(compileSpatial(level,full),drags,full);assert(fullDomainReplay.complete);
  return{id:92,status:'PASS',levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,floor,fullDomainReplay,decisions:verifyDecisions(data,api),mechanisms:verifyMechanisms92(data,api),measurement:measureRoute(level,drags,api),humanBlindTested:false};
 }
 if(level.id===93){
  const source=verifySource93(data),floor=await verifyFloor93(data,api);
  return{id:93,status:'PASS',levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,floor,decisions:verifyDecisions(data,api),mechanisms:verifyMechanisms93(data,api),measurement:measureRoute(level,drags,api),humanBlindTested:false};
 }
 if(level.id===94){
  const source=verifySource94(data),full=await loadFullSpatial();
  const floor=exactFloor94(level,full,{floor:21,maxStates:5000000,maxMilliseconds:900000,maxTransitions:150000000});assert(floor.thresholdProven,JSON.stringify(floor));
  const fullDomainReplay=replayDomain(compileSpatial(level,full),drags,full);assert(fullDomainReplay.complete);
  return{id:94,status:'PASS',levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,floor,fullDomainReplay,decisions:verifyDecisions(data,api),mechanisms:verifyMechanisms94(data,api),measurement:measureRoute(level,drags,api),humanBlindTested:false};
 }
 if(level.id===95){
  const source=verifySource95(data),floor=checkAxisKeyFloor(level,{floor:5,maxStates:1500000,maxMilliseconds:240000});assert(floor.thresholdProven,JSON.stringify(floor));
  return{id:95,status:'PASS',levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,floor,decisions:verifyDecisions(data,api),mechanisms:verifyMechanisms95(data,api),measurement:measureRoute(level,drags,api),humanBlindTested:false};
 }
 if(level.id===96){
  const source=verifySource96(data),floor=provePlain96(level,{floor:11,maxStates:3000000,maxMilliseconds:900000});assert(floor.thresholdProven,JSON.stringify(floor));
  return{id:96,status:'PASS',levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,floor,decisions:verifyDecisions(data,api),mechanisms:verifyMechanisms96(data,api),measurement:measureRoute(level,drags,api),humanBlindTested:false};
 }
 if(level.id===97){
  const source=verifySource97(data),floor=await verifyFloor97(data,api);
  return{id:97,status:'PASS',levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,floor,decisions:verifyDecisions(data,api),mechanisms:verifyMechanisms97(data,api),measurement:measureRoute(level,drags,api),humanBlindTested:false};
 }
 if(level.id===98){
  const source=verifySource98(data),decisions=verifyDecisions(data,api),mechanisms=verifyMechanisms98(data,api);
  assert(data.localIceCases?.length>=3);assert.equal(new Set(data.localIceCases.map(c=>c.blockId)).size,data.localIceCases.length);
  const localIceConstraints=data.localIceCases.flatMap(c=>verifyEarlyIceChoices({...data,earlyIceChoice:c},api));
  const floor=await verifyFloor98Native(data,{floor:15,maxStates:32000000,maxMilliseconds:900000});assert(floor.thresholdProven&&floor.floor===15);
  return{id:98,status:'PASS',levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,floor,decisions,mechanisms,localIceConstraints,measurement:measureRoute(level,drags,api),humanBlindTested:false};
 }
 if(level.id===99){
  const source=verifySource99(data,api),full=await loadFullSpatial(),floor=searchFullSpatial(level,full,{prove:true,floor:5,maxStates:1000000,maxMilliseconds:60000,maxTransitions:20000000});assert(floor.thresholdProven,JSON.stringify(floor));
  const fullDomainReplay=replayDomain(compileSpatial(level,full),drags,full);assert(fullDomainReplay.complete);
  return{id:99,status:'PASS',levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,floor,fullDomainReplay,decisions:verifyDecisions(data,api),mechanisms:verifyMechanisms99(data,api),measurement:measureRoute(level,drags,api),humanBlindTested:false};
 }
 assert.equal(level.id,100,'This level has no qualified source and floor branch yet');
 const source=verifySource100(data),starApi=await loadSpatialApi(),limits={prove:true,floor:5,maxStates:1000000,maxMilliseconds:60000,maxTransitions:20000000};
 const floor=searchSpatial(level,starApi,limits);assert(floor.thresholdProven,JSON.stringify(floor));
 const withoutNormalization=searchSpatial(level,starApi,{...limits,normalize:false});assert(withoutNormalization.thresholdProven,JSON.stringify(withoutNormalization));
 const decisions=verifyDecisions(data,api),starMechanism=verifyStarCases(data,api),measurement=measureRoute(level,drags,api);
 return{id:level.id,status:'PASS',levelSha256:digest(level),routeSha256:digest(drags),spatial,source,replay,floor,withoutNormalization,decisions,starMechanism,measurement,humanBlindTested:false};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){
 ruleGate();const {api,inputs}=await loadApi(),baseline=assertBaseline(JSON.parse(fs.readFileSync(BASELINE))),files=process.argv.slice(2);assert(files.length);
 const bindings=collectBindings([...inputs,...files,BASELINE,'docs/rules/manifest.json','docs/mechanism-rules-v1.47.0.md','tools/verify-remake91to100-v147.mjs','tools/remake91to100-star-floor.test.mjs','tests/campaign-v145/lv051-060/campaign-axis-key-floor-v146.test.mjs']);
 const wiringTexts=Object.fromEntries(['src/core/levels.ts','src/game/formalBlockShapes.ts'].map(p=>[p,fs.readFileSync(p,'utf8')]));
 const rows=[];for(const f of files){const data=JSON.parse(fs.readFileSync(f));rows.push({file:f,...await verifyCandidate(data,api,baseline)});}
 const disjointDataDrift=[];for(const [p,h]of Object.entries(bindings))if(digest(fs.readFileSync(p))!==h)disjointDataDrift.push(wiringTexts[p]?inspectDisjointWiring(p,rows.map(r=>r.id),wiringTexts[p]):inspectDisjointData(p,rows.map(r=>r.id)));
 const out=`${OUTPUT}/validation-${Date.now()}.json`;writeNew(out,{status:'PASS',activeVersion:ruleGate().activeVersion,bindings,disjointDataDrift,rows,pointerValidated:false,formalAdopted:false,releaseApproved:false});console.log(JSON.stringify({out,rows:rows.map(r=>({id:r.id,L:r.floor.floor,U:r.replay.nonClearingDrags,status:r.status}))}));
}
