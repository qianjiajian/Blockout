import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,digest,writeNew,ruleGate,auditSpatial} from './common.mjs';
import {loadApi,replay} from './replay.mjs';
import {replayTiming} from './observed-timing.mjs';
import {starFloor} from './author161-163/star-floor.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {prefixFloor} from './author164-167/floor-countdown.mjs';
import {compile,search} from './author168-170/search.mjs';
import {loadSpatialApi} from '../remake111to120-spatial-floor-v147.mjs';
const specs=[
 [162,'author161-163/reviewed162-1790516150230.json',null,16,20,['pointer-1790516139619-320x568-58720','pointer-1790516139607-496x1078-31236']],
 [163,'author161-163/reviewed163-1790517175951.json',null,5,10,['pointer-1790517521241-320x568-25236','pointer-1790517521263-496x1078-11528']],
 [165,'author164-167/checked165-1790517242794.json',null,16,20,['pointer-1790516979020-320x568-58692','pointer-1790516979023-496x1078-55420']],
 [168,'author168-170/candidate168-1790516897134.json','author168-170/review168-1790517217871.json',21,30,['pointer-1790517521241-320x568-25236','pointer-1790517521263-496x1078-11528']],
 [169,'author168-170/candidate169-1790517122813.json','author168-170/review169-1790517360390.json',5,10,['pointer-1790517521241-320x568-25236','pointer-1790517521263-496x1078-11528']],
 [170,'author168-170/candidate170-1790516359807.json','author168-170/review170-1790517217741.json',11,15,['pointer-1790516413462-320x568-22912','pointer-1790516413470-496x1078-55464']],
];
const lock=ruleGate();assert(lock.verified.some(v=>v.version==='1.105.0'));
const {api,inputs}=await loadApi(),spatialApi=await loadSpatialApi(),rows=[];
for(const [id,rel,reviewRel,L,U,ps] of specs){
 const file=ROOT+'/'+rel,d=JSON.parse(fs.readFileSync(file)),l=d.level,reviewFile=ROOT+'/'+(reviewRel??rel),review=JSON.parse(fs.readFileSync(reviewFile));
 assert.equal(l.id,id);const spatial=auditSpatial(l,api),route=replay(l,d.drags,api,{complete:true,requirePointerCompatible:true});assert(route.nonClearingDrags<=U);
 let lower;
 if(id===162){const p=structuredClone(l);p.mechanismRules='revised-2026-09-23-v1.4';assert(p.flipDoors.every(g=>!g.frozen));p.gates.push(...p.flipDoors.map(({initiallyOpen,...g})=>g));p.flipDoors=[];assert.deepEqual(p,d.projection.level);lower=checkSymmetryFloor(p,{floor:L,maxMilliseconds:5000,maxStates:150000});assert.equal(l.blocks.filter(b=>b.layers?.length===2).length,2);assert.equal(l.flipDoors.length,5);}
 else if(id===163)lower=starFloor(l,{floor:L,maxMilliseconds:5000,maxStates:50000});
 else if(id===165)lower=prefixFloor(l,{goalClears:5,floor:L,maxMilliseconds:3000,maxStates:150000});
 else lower=search(compile(l,spatialApi),{prove:true,floor:L,maxMilliseconds:6000,maxStates:200000});
 assert(lower.thresholdProven,JSON.stringify({id,lower}));
 const decisions=review.decisions??review.wrongCases??[];
 for(const c of decisions){replay(l,c.fullRecoveredRoute,api,{complete:true,requirePointerCompatible:true});const at=c.atDrag??c.step;assert.throws(()=>replay(l,[...d.drags.slice(0,at-1),c.wrong,c.blockedNext],api,{requirePointerCompatible:true}));}
 const src=review.sourceReview??review.source?.file??review.source?.path;if(src){const expected=review.sourceReviewSha256??review.source.sha256;assert.equal(digest(fs.readFileSync(src)),expected);}
 if(id===163){assert(review.sourceValidated);assert.equal(l.blocks.length,30);assert.equal(l.blocks.filter(b=>b.star).length,2);assert.equal(l.blocks.filter(b=>b.timedBombSeconds===40).length,1);assert.equal(l.flipDoors.length,5);assert.equal([...l.gates,...l.flipDoors].filter(g=>g.frozen).length,6);assert.equal(review.bombClearedAtDrag,4);}
 if(id===165){assert.equal(l.blocks.length,21);assert.equal(review.source.inventory.length,20);assert.equal(l.blocks.filter(b=>b.keyId).length,2);assert.equal(l.blocks.filter(b=>b.lockedBy).length,2);assert.deepEqual(l.shutters.map(s=>s.count).sort((a,b)=>a-b),[5,7]);assert.equal(l.gates.filter(g=>g.frozen===7).length,5);}
 if(id>=168){assert.equal(review.candidate.levelSha256,digest(l));const mapped=review.source.sections.flatMap(s=>s.mapping);assert.equal(mapped.length,l.blocks.length);assert.equal(new Set(mapped.map(m=>m.candidate.id)).size,l.blocks.length);for(const r of mapped){const b=l.blocks.find(b=>b.id===r.candidate.id);assert(b);if(r.source.ice)assert.equal(b.frozen,r.source.ice);if(r.source.layers)assert.deepEqual(b.layers,r.source.layers);if(r.source.star)assert(b.star);}assert(decisions.length>=3);}
 const pointer=[];for(const name of ps){const path=ROOT+'/'+name,reportFile=path+'/report.json',report=JSON.parse(fs.readFileSync(reportFile)),r=report.rows.find(r=>r.id===id);assert.equal(report.status,'PASS');assert(report.candidateOnly&&!report.formalDataValidated);assert.equal(r.status,'PASS');assert.equal(r.levelSha256,digest(l));assert.equal(r.routeSha256,digest(d.drags));const timingFile=path+`/lv${id}-observed-timing.json`,timing=replayTiming(l,JSON.parse(fs.readFileSync(timingFile)),api);assert(r.final.complete&&r.final.remainingSeconds>0);assert.equal(r.nativeDrawAudit.rotated,0);assert.equal(r.nativeDrawAudit.canvasRotationCalls,0);pointer.push({reportFile,sha256:digest(fs.readFileSync(reportFile)),timingFile,timing,remainingSeconds:r.final.remainingSeconds});}
 rows.push({id,file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(l),routeSha256:digest(d.drags),reviewFile,reviewSha256:digest(fs.readFileSync(reviewFile)),L,U:route.nonClearingDrags,drags:d.drags.length,spatial,lower,route,decisionsVerified:decisions.length,pointer,sourceStatus:id===162?'USER_ACCEPTED_AUTHORED_OPENING; UNKNOWN_PRISTINE_OBSERVED_FIRST_FRAME_ONLY':'REVIEWED_KNOWN_FACTS_AND_AUTHORED_DIFFERENCES',score:api.levelStarTargets(l)});
 console.log(JSON.stringify({id,L,U:route.nonClearingDrags,drags:d.drags.length,status:'PASS'}));
}
const out=ROOT+'/root-ready-'+Date.now()+'.json';writeNew(out,{ruleVersion:lock.activeVersion,status:'READY_FOR_FORMAL_ADOPTION',rows,bindings:Object.fromEntries(inputs.map(f=>[f,digest(fs.readFileSync(f))])),formal:false,publication:false});console.log(out);
