import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {verifyFullGeneratorRouteProjection} from './campaign-generator-axis-floor-v146.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const {api}=await loadApi(),base=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json'));
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const area={SINGLE:1,H2:2,V2:2,H3:3,V3:3,SQ2:4,T4:4,SQ3:9};
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),native={SINGLE:rect(1,1),H2:rect(2,1),V2:rect(1,2),H3:rect(3,1),V3:rect(1,3),SQ2:rect(2,2),SQ3:rect(3,3),T4:[[1,0],[0,1],[1,1],[2,1]]};
const shapeKey=s=>s.map(p=>p.join(',')).sort().join(';');
for(const file of process.argv.slice(2)){
 const d=JSON.parse(fs.readFileSync(file)),l=d.level,src=JSON.parse(fs.readFileSync(d.sourceReview)),f=src.facts[l.id],old=base.levels[l.id-1];assert([58,59].includes(l.id));
 assert.equal(sha(fs.readFileSync(d.sourceReview)),d.sourceReviewSha256);for(const frame of src.frames)assert.equal(sha(fs.readFileSync(frame.path)),frame.sha256);assert.equal(sha(fs.readFileSync(src.sourceVideo)),src.videoSha256);
 assert.deepEqual(geometry(l),old.geometry);for(const k of ['id','name','timeSeconds','reward','mechanismRules'])assert.deepEqual(l[k],old.level[k]);assert.deepEqual(api.levelStarTargets(l),old.starTargets);
 const specs=[...f.opening,...(f.queue??[]),...(f.covers??[]).flatMap(c=>c.specs.map(b=>({...b,coverCount:c.count})))],carrierChecks=[];
 for(const s of specs){const b=l.blocks.find(b=>b.id===`v146-${l.id}-${s.sourceId}`);assert(b);assert.equal(b.shape.length,area[s.kind]);assert.equal(b.color,l.id===58&&s.sourceId==='q04'?'blue':s.color);assert.equal(b.frozen??0,s.frozen??0);assert.deepEqual(b.layers??[b.color],s.layers??[b.color]);assert.equal(api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns,0);assert(!b.keyId&&!b.lockedBy);if(s.coverCount)assert.equal(l.shutters.find(c=>c.id===b.shutterId)?.count,s.coverCount);else assert(!b.shutterId);carrierChecks.push({sourceId:s.sourceId,id:b.id,sourceKind:s.kind,sourceArea:area[s.kind],designShape:b.shape,sourceColor:s.color,designColor:b.color,frozen:b.frozen??0,layers:b.layers??[b.color],coverCount:s.coverCount??null});}
 const expectedGates=Object.entries(f.gates).sort(),actualGates=l.gates.map(g=>[g.color,g.frozen??0]).sort();assert.deepEqual(actualGates,expectedGates);
 if(l.id===58){assert.equal(l.generators.length,1);assert.deepEqual(l.generators[0].queueBlockIds,f.queue.map(b=>`v146-58-${b.sourceId}`));}else assert.equal(l.generators?.length??0,0);
 const additions=l.blocks.filter(b=>b.id.includes('-fill'));assert.equal(additions.reduce((n,b)=>n+b.shape.length,0),l.id===58?10:9);assert(additions.every(b=>!b.frozen&&!b.layers&&!b.shutterId));
 for(const s of specs)assert.equal(shapeKey(l.blocks.find(b=>b.id===`v146-${l.id}-${s.sourceId}`).shape),shapeKey(native[s.kind]));
 assert.deepEqual(d.sourceAdaptation.orientationAdaptations,src.orientationAdaptations.filter(a=>a.level===l.id));
 const replay=api.replayRevisedRoute(l,d.drags);assert(replay.valid&&replay.complete);const projection=l.id===58?verifyFullGeneratorRouteProjection(l,d.drags,api):undefined;if(projection)assert(projection.valid,projection.error);
 const report={activeRuleVersion:lock.activeVersion,checkedAt:new Date().toISOString(),candidate:file,candidateSha256:sha(fs.readFileSync(file)),sourceReview:d.sourceReview,sourceReviewSha256:d.sourceReviewSha256,sourceFramesVerified:src.frames.length,sourceVideoVerified:true,baselineGeometryAndMetadataPreserved:true,sourceCarrierChecks:carrierChecks,ordinaryAdditions:additions,gateCounts:{source:l.id===58?8:7,design:l.gates.length},nativeQ0:true,replay,projection,sourceContractPassed:true,lowerBoundProven:false,pointerValidated:false,formalAdopted:false};
 const out=file.replace(/[^/]+$/,`source-contract${l.id}-${Date.now()}.json`);fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,id:l.id,carriers:carrierChecks.length,additions:additions.length,projection:projection?.passed??projection?.status??null}));
}
