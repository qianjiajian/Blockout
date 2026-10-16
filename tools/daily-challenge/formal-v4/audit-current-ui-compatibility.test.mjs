import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {assertScrollClockOnlyChange,assertOnlyUiBindingChanged,currentStageStaticResult} from './audit-current-ui-compatibility.mjs';
import {loadV4StageContract} from './static-contract.mjs';
const before=await fs.readFile('deliverables/wechat-performance-fix-20261008/ColorEscapeGame.before.ts','utf8');
const current=await fs.readFile('src/game/ColorEscapeGame.ts','utf8');
test('exact five replacements accepted; extra physics/timing byte or omitted replacement rejected',()=>{
 assert.equal(assertScrollClockOnlyChange(before,current).replacementCount,5);
 assert.throws(()=>assertScrollClockOnlyChange(before,current.replace('GATE_EXIT_INGEST_DURATION = 0.26','GATE_EXIT_INGEST_DURATION = 0.27')));
 assert.throws(()=>assertScrollClockOnlyChange(before,current.replace('this.leagueScroll.move(point.id,point.y,monotonicGameTime())','this.leagueScroll.move(point.id,point.y,performance.now())')));
 assert.throws(()=>assertScrollClockOnlyChange(before,current+'\n'));
});
const receipt=JSON.parse(await fs.readFile('deliverables/daily-formal-v4-20261008/selection/capacity13-02/01-daily-mechanisms-axis-block-50-d1-08.json'));
test('binding comparison rejects any second dependency change or missing file',()=>{
 const old=receipt.toolchainBindings,next={...old,'src/game/ColorEscapeGame.ts':'a79eb13437413cdab9a53c1487ff2808fd1cf2c2defca296cabeb45d3b9ba664'};
 assert.deepEqual(assertOnlyUiBindingChanged(old,next),['src/game/ColorEscapeGame.ts']);
 assert.throws(()=>assertOnlyUiBindingChanged(old,{...next,'src/core/PuzzleModel.ts':'0'.repeat(64)}));
 const removed={...next};delete removed['src/core/PuzzleModel.ts'];assert.throws(()=>assertOnlyUiBindingChanged(old,removed));
});
const api=await loadV4StageContract(),slot=api.DAILY_CHALLENGE_V3_SLOTS.find(s=>s.stageKey==='basic-combined');
const q={formalId:slot.id,stageKey:slot.stageKey,difficulty:slot.difficulty,slot:slot.slot,newestMechanism:slot.newestMechanism,unlockLevel:slot.stageUnlockLevel};
test('base-six exception applies only to an authenticated real current slot',()=>{
 const g={issues:['stage-not-in-mechanism-guide'],mechanisms:['numeric-ice']};
 assert(currentStageStaticResult(g,q,api).passed);
 assert(!currentStageStaticResult(g,{...q,slot:9},api).passed);
 assert(!currentStageStaticResult(g,{...q,formalId:'daily-made-up'},api).passed);
});
test('base-six filtering never removes physical issues or unapproved advanced mechanisms',()=>{
 assert(!currentStageStaticResult({issues:['stage-not-in-mechanism-guide','construction:overlap'],mechanisms:['numeric-ice']},q,api).passed);
 assert(!currentStageStaticResult({issues:['stage-not-in-mechanism-guide'],mechanisms:['bomb']},q,api).passed);
});
