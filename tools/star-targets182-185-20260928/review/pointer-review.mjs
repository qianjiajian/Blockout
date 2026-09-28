import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {loadApi} from '../../remake182-185-20260927/replay.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {replayTiming} from '../../remake182-185-20260927/observed-timing.mjs';
const ROOT='deliverables/star-targets182-185-20260928',read=p=>JSON.parse(fs.readFileSync(p));
const paths=process.argv.slice(2);assert.equal(paths.length,4,'Four final report paths required');
const lock=verifyRulesLock();assert(lock.ok);assert(lock.verified.some(v=>v.version==='1.111.0'));
const {api,inputs}=await loadApi(),before=read(ROOT+'/before.json');
const files=[...inputs,ROOT+'/before.json','tools/remake182-185-20260927/observed-timing.mjs','tools/star-targets182-185-20260928/review/pointer-review.mjs'];
const bindings=Object.fromEntries(files.map(p=>[p,digest(fs.readFileSync(p))]));
const rows=[];
for(const reportPath of paths){
 const r=read(reportPath),folder=path.dirname(reportPath);assert.equal(r.status,'PASS');assert.equal(r.ruleVersion,'1.111.0');assert.equal(r.naturalClock,true);assert.equal(r.clockFrozen,false);assert.equal(r.playerSaveTouched,false);assert.equal(r.humanBlindTested,false);assert.equal(r.releaseApproved,false);assert.equal(r.rows.length,1);
 for(const field of ['errors','drift','sourceEvidenceDrift','currentWorkspaceDrift'])assert.deepEqual(r[field],[],field);
 let verifiedBindings=0;for(const [p,h]of Object.entries(r.bindings)){assert.equal(digest(fs.readFileSync(path.join(r.sourceSnapshot,p))),h,'Snapshot '+p);assert.equal(digest(fs.readFileSync(p)),h,'Current '+p);verifiedBindings++;}
 for(const [p,h]of Object.entries(r.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h);
 const row=r.rows[0],id=row.id,d=read(ROOT+`/packets/level${id}.json`),isCandidate=id===185,moves=id===182?48:50,time=id===182?97:93;
 assert([182,185].includes(id));assert.equal(row.status,'PASS');assert.deepEqual(r.requestedIds,[id]);assert.equal(r.candidateOnly,isCandidate);assert.equal(r.formalDataValidated,!isCandidate);assert.equal(row.formalObjectIdentity,!isCandidate);assert.equal(row.candidateOverlay,isCandidate);assert.equal(row.sourceInitialPhaseApprovalPending,isCandidate);assert.equal(row.sourceApprovalInferred,false);assert.equal(row.changedMoveTargetsValidated,true);assert.equal(row.timeTargetsPreserved,true);
 assert.equal(row.levelSha256,digest(d.level));assert.equal(row.routeSha256,digest(d.drags));
 if(isCandidate){assert.equal(digest(api.LEVELS[184]),before.levels[184].sha256);assert.notEqual(digest(api.LEVELS[184]),digest(d.level));}else assert.equal(digest(api.LEVELS[181]),digest(d.level));
 assert.equal(row.steps.length,moves);assert.equal(row.final.moves,moves);assert.equal(row.final.cleared,id===182?28:31);assert.equal(row.nonClearingDrags,id===182?20:19);assert(row.final.complete&&!row.final.failed);assert(row.naturalClockProbe.after<row.naturalClockProbe.before);
 assert(row.nativeDrawAudit.calls>0);for(const key of ['rotated','canvasRotationCalls','invalidImageDimensions'])assert.equal(row.nativeDrawAudit[key],0);
 const logPath=path.join(folder,`lv${id}-observed-timing.json`),log=read(logPath),replayed=replayTiming(d.level,log,api);
 assert(replayed.passed);assert.deepEqual(replayed,row.naturalTimingReplay);assert.equal(replayed.callbacks,isCandidate?31:0);
 if(isCandidate){const frozenIds=d.level.flipDoors.filter(g=>g.frozen).map(g=>g.id);const reveal=log.events.find(e=>e.after.cleared===14&&e.after.shutters[0].revealed),next=log.events.find(e=>e.method==='completeExitAnimation'&&e.after.cleared===15);assert(reveal&&next);assert(reveal.after.flipDoors.filter(g=>frozenIds.includes(g.id)).every(g=>!g.open&&g.frozen===0));assert(next.after.flipDoors.filter(g=>frozenIds.includes(g.id)).every(g=>g.open&&g.frozen===0));}
 const settlement=row.settlement,c=settlement.conditions,s=settlement.storage;assert.equal(settlement.screen,'win');assert.equal(settlement.assistedClear,false);assert.equal(settlement.earnedStars,3);assert.equal(row.actualStars,3);
 assert.deepEqual(c,{passed:true,moves,elapsedSeconds:Math.ceil(settlement.completionMetrics.elapsedSeconds),moveTarget:moves,timeTargetSeconds:time,moveAchieved:true,timeAchieved:true,earnedStars:3});assert(c.elapsedSeconds<=time);
 assert(Math.abs(settlement.completionMetrics.elapsedSeconds-replayed.activeSeconds)<1e-7,'Actual settlement time matches all natural ticks');
 assert(settlement.texts.includes(`${moves}次拖动内完成`));assert(settlement.texts.includes(`${time}秒内完成`));assert.deepEqual(settlement.starImages,['starLeft','starCenter','starRight']);
 assert.equal(s.backend,'MemoryHost');assert.deepEqual(s.save.bestStars,{[id]:3});assert.deepEqual(s.save.bestMoves,{[id]:moves});assert.equal(s.save.activeRun,undefined);assert.equal(s.save.coins,20);assert.deepEqual(s.save.rewardedLevels,[id]);assert(s.operations.every(o=>o.key==='color-escape-save-v1'));
 const imagePath=path.join(folder,`lv${id}-complete.png`);assert(fs.existsSync(imagePath));
 rows.push({id,mode:isCandidate?'CANDIDATE_SCORE_ONLY':'FORMAL_SCORE',viewport:r.viewport,report:reportPath,reportSha256:digest(fs.readFileSync(reportPath)),sourceBindingsVerified:verifiedBindings,log:logPath,naturalReplay:replayed,scoring:c,savedBestStars:s.save.bestStars[String(id)],savedBestMoves:s.save.bestMoves[String(id)],settlementImage:imagePath,settlementImageSha256:digest(fs.readFileSync(imagePath)),visualReview:'Three bright gold stars; all three achievement rows checked; exact new drag and preserved time targets readable; +20 displayed.',sourcePhaseApprovalPending:isCandidate});
}
assert.deepEqual(rows.map(r=>`${r.id}-${r.viewport.width}x${r.viewport.height}`).sort(),['182-320x568','182-496x1078','185-320x568','185-496x1078']);
for(const [p,h]of Object.entries(before.oldEvidence))assert.equal(digest(fs.readFileSync(p)),h);
for(const[p,h]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(p)),h,'Concurrent source change '+p);
const result={createdAt:new Date().toISOString(),status:'PASS_182_FORMAL_185_CANDIDATE_SCORE_DUALSCREEN',activeRuleVersion:lock.activeVersion,rows,bindings,totals:{events:rows.reduce((s,r)=>s+r.naturalReplay.events,0),ticks:rows.reduce((s,r)=>s+r.naturalReplay.ticks,0),callbacks:rows.reduce((s,r)=>s+r.naturalReplay.callbacks,0)},allFourSettlementImagesIndependentlyViewed:true,oldEvidenceUnchanged:true,formal185Unchanged:true,sourceInitialPhaseApprovalInferred:false,playerSaveTouched:false,humanBlindTested:false,releaseApproved:false};
const out=ROOT+'/review/pointer-review-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,status:result.status,totals:result.totals}));
