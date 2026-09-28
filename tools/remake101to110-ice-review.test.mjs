import fs from 'node:fs';
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadApi} from './remake101to110-v146.mjs';
import {verifyEarlyIceChoices} from './review-remake101to110-decisions-v147.mjs';
test('109 ice comparison preserves the exact main prefix plus executable non-clearing approach',async()=>{
 const {api}=await loadApi(),d=JSON.parse(fs.readFileSync('deliverables/remake101-110-v146-20260924/pipeline109/enriched109-final-1790272457695.json'));
 const r=verifyEarlyIceChoices(d,api);assert.equal(r.length,1);assert.equal(r[0].approachDrags.length,3);assert.equal(r[0].remainingIce,3);assert(!r[0].provesGlobalOrder);
 const omitted=structuredClone(d);delete omitted.earlyGateChoice.approachDrags;assert.throws(()=>verifyEarlyIceChoices(omitted,api));
 const illegal=structuredClone(d);illegal.earlyGateChoice.approachDrags[0].path=[[99,99]];assert.throws(()=>verifyEarlyIceChoices(illegal,api));
 const clear=structuredClone(d);clear.earlyGateChoice.approachDrags[0].exitSide='bottom';assert.throws(()=>verifyEarlyIceChoices(clear,api));
 const changedCount=structuredClone(d);changedCount.earlyGateChoice.remainingIce=2;assert.throws(()=>verifyEarlyIceChoices(changedCount,api));
});
