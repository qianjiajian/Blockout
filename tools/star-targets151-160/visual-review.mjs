import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const root='deliverables/star-targets151-160-20260927/pointer-support',hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const small=root+'/pointer-1790523487609-320x568-14812',large=root+'/pointer-1790523669209-496x1078-62396',first=root+'/pointer-1790523486133-496x1078-57168';
const reports=[small,large,first].map(dir=>({dir,file:dir+'/report.json',report:JSON.parse(fs.readFileSync(dir+'/report.json'))}));
assert.equal(reports[0].report.status,'PASS');assert.equal(reports[1].report.status,'FAIL');assert.equal(reports[2].report.status,'FAIL');
for(const {report}of reports.slice(0,2)){assert.deepEqual(report.rows.map(r=>r.id),[157,158]);assert(report.rows.every(r=>r.status==='PASS'&&r.actualStars===3));}
assert.equal(reports[2].report.lastState.puzzle.remainingSeconds,0);assert(reports[2].report.lastState.puzzle.failed);assert.equal(reports[2].report.lastState.puzzle.moves,45);
assert(reports[1].report.error.includes('Source file set changed during input'));
const pictures=[small,large].flatMap(dir=>[157,158].map(id=>({path:dir+`/lv${id}-complete.png`,level:id,sha256:hash(dir+`/lv${id}-complete.png`),manuallyInspected:true,observations:{threeLitStars:true,moveText:id===157?'47次拖动内完成':'59次拖动内完成',timeText:id===157?'68秒内完成':'129秒内完成',checkedConditions:3,uncroppedDialog:true,noTextOverflow:true,noMissingImage:true}})));
const result={createdAt:new Date().toISOString(),ruleVersion:'1.110.0',status:'VISUAL_REVIEW_PASSED_REPORT_FAILURES_RETAINED',pictures,
 reports:reports.map(({file,report})=>({file,sha256:hash(file),overallStatus:report.status,rows:report.rows.map(r=>({id:r.id,status:r.status,drags:r.final?.moves,nonClearingDrags:r.nonClearingDrags,elapsedSeconds:r.settlement?.conditions.elapsedSeconds,actualStars:r.actualStars})),error:report.error})),
 firstLargeFailure:'Actual level157 total clock reached0 at drag45 of47; not a scoring/schema failure and not a successful full route. Original FAIL retained, no time or runtime changes.',
 secondLargeFailure:'Both157/158 rows, natural-event replays and actual3-star settlements passed. Overall FAIL remains because src/core/remake191to200.ts was added during input; the current source file-set guard correctly rejected continuity. Parent is independently auditing exact concurrent200 changes. This visual review does not waive that guard or re-sign the FAIL.',
 policy:'No subsequent Pointer rerun after root instruction. No original report/source snapshot/packet/production/old evidence changed. Not a phone test or human blind test.'};
const out=root+'/visual-and-status-review-'+Date.now()+'.json';fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(out);
