import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {CATALOG_VERSION} from './catalog-contract.mjs';
import {VIEWPORTS,POINTER_FILES,validateFinalPointerEvidence,validatePointerBatch,validateVisualReview,validateScreenshotFiles} from './final-acceptance.mjs';
import {planPointerJobs} from './pointer-batch.mjs';
import {fileSha256} from './emit-catalog.mjs';

const hash=value=>levelSha256(value),h=hash('unit-test-only');
// Synthetic transport fixture only. No file produced from this fixture is a
// puzzle proof, production run, visual review or final acceptance artifact.
function fixture(){
  const drags=[{blockId:'a',path:[[1,0]]},{blockId:'a',path:[[1,1]],exitSide:'bottom'}],level={timeSeconds:100};
  const formalId='synthetic-unit-fixture',stageKey='synthetic-stage',revision=hash('revision'),bindings={'synthetic-runtime':h};
  const evidence={receiptSchemaVersion:3,catalogVersion:CATALOG_VERSION};
  const assignment={id:formalId,sourceLevelId:18,layoutSha256:hash(level),routeSha256:routeSha256(drags),catalogRevision:revision,
    proofReport:'synthetic-selection.json',proofReportSha256:h,v3Evidence:evidence};
  const baseline={coins:0,inspiration:0,currentLevel:1,highestLevel:18,bestStars:{},bestMoves:{},rewardedLevels:[]};
  const receipt={schemaVersion:3,catalogVersion:CATALOG_VERSION,accepted:true,formalId,stageKey,sourceLevelId:18,difficulty:1,U:1,level,levelSha256:hash(level),drags,routeSha256:routeSha256(drags),
    route:{independentReplay:{clearEvents:1,trace:[{index:0,blockId:'a',clearDelta:0,moves:1},{index:1,blockId:'a',clearDelta:1,moves:2}]}},
    runtimeBinding:{formalRegistryIdentity:true,runtimeSchemaVersion:2,proofReceiptSchemaVersion:3,catalogRevision:revision,bindings,assignment,
      previousReceipt:assignment.proofReport,previousReceiptSha256:h,productionV3Evidence:evidence}};
  const row={formalId,viewport:'496x1078',file:'synthetic-runtime-receipt.json',receiptSha256:h,report:'unit/report.json'};
  const report={schemaVersion:3,formalId,levelSha256:receipt.levelSha256,routeSha256:receipt.routeSha256,viewport:{width:496,height:1078},
    status:'FORMAL_POINTER_NATURAL_TIME_PASS',formalRegistryIdentity:true,candidateInjection:false,pointerValidated:true,timeValidated:true,naturalClock:true,
    clockMocked:false,playerSaveTouched:false,errors:[],storageViolations:[],assignment:structuredClone(assignment),U:1,totalDrags:2,
    files:Object.fromEntries([...POINTER_FILES,'src/core/dailyChallenge.ts','src/core/formalDailyChallengeData.ts','src/core/PuzzleModel.ts',
      'src/game/ColorEscapeGame.ts',assignment.proofReport,row.file].map(file=>[file,h])),
    naturalClockProbe:{beforeClock:99,afterClock:98.8},actions:[{index:0,blockId:'a',clearDelta:0,moves:1,remainingSeconds:98},{index:1,blockId:'a',clearDelta:1,moves:2,remainingSeconds:97}],
    finalPuzzle:{complete:true,failed:false,blocks:0,queuedBlocks:0,moves:2,remainingSeconds:97},wallSeconds:1.8,playableSeconds:2,
    entryBaseline:baseline,settlement:{...baseline,coins:50,inspiration:20,win:{difficulty:1,coins:50,inspiration:20},
      daily:{completed:{1:true},rewarded:{1:true},attemptsRemaining:4,catalogRevision:revision,stageKey}},
    drawAudit:{calls:10,rotated:0,canvasRotationCalls:0},screenshots:{opening:{path:'unit/opening.png',sha256:hash('opening')},complete:{path:'unit/complete.png',sha256:hash('complete')}}};
  return{report,receipt,row,runtimeReport:{catalogRevision:revision,bindings}};
}
const check=x=>validateFinalPointerEvidence(x.report,x.receipt,x.row,x.runtimeReport);

test('transport validator accepts its complete unit fixture; real isolated v3 runs remain rejected',async()=>{
  assert.equal(check(fixture()),true);
  for(const name of ['pointer-lift-496','pointer-flip-320']){
    const report=JSON.parse(await fs.readFile(`deliverables/daily-formal-v3-20261008/${name}/report.json`,'utf8'));
    assert.equal(report.formalRegistryIdentity,false);assert.equal(report.candidateInjection,true);
    const x=fixture();x.report={...x.report,...report};assert.throws(()=>check(x));
  }
});

test('actual isolated screenshot bytes pass image integrity only, while wrong viewport or hash reject',async()=>{
  const root='deliverables/daily-formal-v3-20261008/pointer-lift-496',screenshots={};
  for(const name of ['opening','complete']){const path=`${root}/${name}.png`;screenshots[name]={path,sha256:fileSha256(await fs.readFile(path))};}
  const report={viewport:{width:496,height:1078},screenshots};await validateScreenshotFiles(report);
  await assert.rejects(()=>validateScreenshotFiles({...report,viewport:{width:320,height:568}}));
  const changed=structuredClone(report);changed.screenshots.opening.sha256=h;await assert.rejects(()=>validateScreenshotFiles(changed));
});

test('changed assignment, dataset, source receipt and v3 quality binding reject',()=>{
  for(const mutate of [x=>{x.report.assignment.id='wrong';},x=>{x.report.assignment.v3Evidence.receiptSchemaVersion=2;},
    x=>{x.report.assignment.catalogRevision='old';},x=>{x.receipt.runtimeBinding.bindings={};},
    x=>{delete x.report.files[x.row.file];},x=>{delete x.report.files[x.report.assignment.proofReport];},
    x=>{x.row.receiptSha256=hash('wrong-input');},x=>{delete x.report.files[POINTER_FILES[0]];},
    x=>{x.receipt.level.timeSeconds++;}]){const x=fixture();mutate(x);assert.throws(()=>check(x));}
});

test('per-drag mutation, recomputed cost, missing inventory and unnatural clock cannot pass top-level booleans',()=>{
  for(const mutate of [x=>{x.report.actions[0].blockId='wrong';},x=>{x.report.actions[0].clearDelta=2;},
    x=>{x.report.actions[0].moves=2;},x=>{x.report.actions[0].index=1;},x=>{x.report.U++;x.receipt.U++;},
    x=>{x.report.finalPuzzle.queuedBlocks=1;},x=>{x.report.finalPuzzle.blocks=1;},
    x=>{x.report.naturalClockProbe.afterClock=x.report.naturalClockProbe.beforeClock;},x=>{delete x.report.naturalClockProbe;},
    x=>{x.report.actions[1].remainingSeconds=99;},x=>{x.report.playableSeconds=0;},x=>{x.report.wallSeconds=NaN;},
    x=>{x.report.clockMocked=true;}]){const x=fixture();mutate(x);assert.throws(()=>check(x));}
});

test('actual reward, mainline invariance, completion flags and screenshots must be independently bound',()=>{
  for(const mutate of [x=>{delete x.report.entryBaseline;},x=>{x.report.settlement.coins++;},x=>{x.report.settlement.inspiration++;},
    x=>{x.report.settlement.highestLevel++;},x=>{x.report.settlement.win.coins++;},x=>{x.report.settlement.daily.rewarded[1]=false;},
    x=>{x.report.settlement.activeRun={daily:true};},x=>{x.report.drawAudit.rotated=1;},
    x=>{delete x.report.screenshots.opening;},x=>{x.report.screenshots.opening.path='other-run/opening.png';},x=>{x.report.screenshots.complete={...x.report.screenshots.opening};}]){
    const x=fixture();mutate(x);assert.throws(()=>check(x));
  }
});

function catalogueFixture(){
  const expected=[],receipts=new Map(),entries=new Map(),pointerRows=new Map(),groups=[];
  for(let stage=1;stage<=15;stage++)for(let difficulty=1;difficulty<=3;difficulty++){
    const stageKey=`test-stage-${stage}`,items=[];
    for(let slot=1;slot<=10;slot++){
      const formalId=`${stageKey}-d${difficulty}-${slot}`,receipt={formalId,stageKey,difficulty,levelSha256:hash(formalId)};
      expected.push({...receipt,slot});receipts.set(formalId,receipt);entries.set(formalId,{file:`${formalId}.json`,receiptSha256:h,receipt});
      for(const viewport of VIEWPORTS)pointerRows.set(`${formalId}:${viewport}`,{screenshots:{opening:{path:`${formalId}-${viewport}.png`,sha256:hash(`${formalId}-${viewport}`)}}});
      items.push({formalId,levelSha256:receipt.levelSha256,opening:pointerRows.get(`${formalId}:496x1078`).screenshots.opening});
    }
    groups.push({stageKey,difficulty,contactSheet:{path:`${stageKey}-${difficulty}.png`,sha256:hash(`${stageKey}-${difficulty}`)},
      review:{method:'actual-image-inspection',reviewer:'synthetic unit fixture',reviewedAt:'2026-10-08T00:00:00Z',conclusion:'PASS',findings:[],observations:['Synthetic unit fixture; not an actual production review.']},items});
  }
  return{expected,receipts,entries,pointerRows,visual:{schemaVersion:3,scope:450,catalogRevision:h,overviewViewport:'496x1078',status:'FULL_V3_CONTACT_SHEETS_REVIEWED',groups}};
}

test('batch planner and aggregate require all 900 exact production jobs without duplicates or process failures',()=>{
  const fixture=catalogueFixture(),jobs=planPointerJobs(fixture);assert.equal(jobs.length,900);
  const batch={schemaVersion:3,status:'FORMAL_V3_POINTER_BATCH_COMPLETE',scope:450,requested:900,passed:900,failed:0,viewports:VIEWPORTS,playerSaveTouched:false,naturalClock:true,
    rows:jobs.map(job=>({...job,status:'FORMAL_POINTER_NATURAL_TIME_PASS',code:0,signal:null,reportSha256:h}))};
  assert.doesNotThrow(()=>validatePointerBatch(batch,fixture.expected));
  for(const mutate of [b=>{b.rows.pop();},b=>{b.rows[1]={...b.rows[0]};},b=>{b.rows[0].code=1;},b=>{b.rows[0].signal='SIGTERM';},
    b=>{b.rows[0].status='CANDIDATE_POINTER_NATURAL_TIME_PASS';},b=>{b.bindingFailure='changed';}]){
    const changed=structuredClone(batch);mutate(changed);assert.throws(()=>validatePointerBatch(changed,fixture.expected));
  }
  fixture.entries.delete(jobs[0].formalId);assert.throws(()=>planPointerJobs(fixture));
});

test('visual review requires 45 inspected sheets with 450 exact original openings, not copied PASS flags',()=>{
  const fixture=catalogueFixture();assert.equal(validateVisualReview(fixture.visual,fixture.receipts,fixture.pointerRows,h),true);
  for(const mutate of [v=>{v.groups.pop();},v=>{v.groups[1]=structuredClone(v.groups[0]);},v=>{v.groups[0].items.pop();},
    v=>{v.groups[0].items[0].levelSha256=hash('old');},v=>{v.groups[0].items[0].opening.sha256=hash('wrong-screenshot');},
    v=>{v.groups[0].review={passed:true};},v=>{v.groups[0].review.reviewer='';},v=>{v.groups[0].review.findings=['still repetitive'];},
    v=>{v.groups[0].review.observations=[];},
    v=>{v.groups[0].review.reviewedAt='not a date';},v=>{v.groups[1].contactSheet.sha256=v.groups[0].contactSheet.sha256;}]){
    const visual=structuredClone(fixture.visual);mutate(visual);assert.throws(()=>validateVisualReview(visual,fixture.receipts,fixture.pointerRows,h));
  }
});
