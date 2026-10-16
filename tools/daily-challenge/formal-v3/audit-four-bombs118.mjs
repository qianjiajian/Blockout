import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {guardAllowanceFor} from './reserved-guard-budget.mjs';
const root='deliverables/daily-formal-v3-20261008',candidateFile=`${root}/selection/macro-opening02-selected/attempt-0008.json`;
const read=p=>JSON.parse(fs.readFileSync(p)),hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex'),p=read(candidateFile);
assert(p.accepted&&p.difficulty===3&&p.L>=31&&p.U===40);
assert.equal(levelSha256(p.level),p.levelSha256);assert.equal(routeSha256(p.drags),p.routeSha256);
const bombs=p.level.blocks.filter(b=>b.timedBombSeconds!==undefined);assert.equal(bombs.length,4);
const rows=[];
for(const width of [320,496]){
 const file=`${root}/pointer-four-bombs118-${width}/report.json`,r=read(file);
 assert.equal(r.status,'CANDIDATE_POINTER_NATURAL_TIME_PASS');assert(r.pointerValidated&&r.timeValidated&&r.naturalClock&&!r.clockMocked&&r.candidateInjection&&!r.formalRegistryIdentity);
 assert.equal(r.levelSha256,p.levelSha256);assert.equal(r.routeSha256,p.routeSha256);assert.equal(r.files[candidateFile],hash(candidateFile));
 assert.equal(r.actions.length,p.drags.length);assert.equal(r.U,40);assert.equal(r.totalDrags,60);
 let nonclear=0,clears=0;
 r.actions.forEach((a,i)=>{assert.equal(a.index,i);assert.equal(a.blockId,p.drags[i].blockId);assert.equal(a.clearDelta,p.route.independentReplay.trace[i].clearDelta);nonclear+=a.clearDelta===0;clears+=a.clearDelta;});
 assert.equal(nonclear,40);assert.equal(clears,20);assert.equal(r.errors.length,0);assert.equal(r.storageViolations.length,0);
 assert.equal(r.finalPuzzle.complete,true);assert.equal(r.finalPuzzle.failed,false);assert.equal(r.finalPuzzle.blocks+r.finalPuzzle.queuedBlocks,0);
 assert.equal(r.drawAudit.rotated+r.drawAudit.canvasRotationCalls,0);assert(r.naturalClockProbe.beforeClock>r.naturalClockProbe.afterClock&&r.finalPuzzle.remainingSeconds>0);
 const events=bombs.map(b=>{
  const a=r.actions.find(a=>a.blockId===b.id&&a.clearDelta>0);assert(a,'Every bomb must actually clear');
  const elapsed=p.level.timeSeconds-a.remainingSeconds,margin=b.timedBombSeconds-elapsed;assert(margin>0,'Bomb must clear before initial active deadline');
  return{blockId:b.id,initialSeconds:b.timedBombSeconds,actualClearDrag:a.index+1,elapsedGameSecondsAtClear:elapsed,deadlineMarginSeconds:margin};
 });
 for(const image of Object.values(r.screenshots))assert.equal(hash(image.path),image.sha256);
 rows.push({report:{path:file,sha256:hash(file)},viewport:r.viewport,remainingSeconds:r.finalPuzzle.remainingSeconds,U:r.U,totalDrags:r.totalDrags,clears,bombClears:events,screenshots:r.screenshots});
}
fs.writeFileSync(`${root}/proof/four-bombs118-pointer-audit-v1.json`,JSON.stringify({status:'CANDIDATE_TWO_SCREEN_NATURAL_POINTER_AUDIT_PASS',candidate:{path:candidateFile,sha256:hash(candidateFile)},
 levelSha256:p.levelSha256,L:p.L,U:p.U,rows,lowerGuardAllowance:guardAllowanceFor(p.lowerBound.result),openingActuallyViewedByRoot:true,
 formalRegistryIdentity:false,formalReady:false,playerSaveTouched:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({screens:2,drags:60,U:40,bombs:4,minimumBombMargin:Math.min(...rows.flatMap(r=>r.bombClears.map(x=>x.deadlineMarginSeconds))),formalReady:false}));
