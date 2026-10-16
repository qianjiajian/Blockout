import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {PINS,SELF,VERSION,assertShellHistoryPinsReadyV198,runAuthoredShellOnceV198} from './run-authored-shell-once-v198-history08.mjs';
import {assertShellSource7Release,sealShellSource7Config} from '../../../.codex-temp/prepare-authored-shell-source7-history08-config-01.mjs';
import {launchSealedShellSource7} from '../../../.codex-temp/run-authored-shell-source7-history08-01.mjs';

// Bindings and source transformation only. No real world or history is loaded.
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
test('separate SELF and version identify the history08 entry',()=>{
 assert.equal(SELF,'tools/daily-challenge/formal-v4/run-authored-shell-once-v198-history08.mjs');
 assert.equal(VERSION,'single-authored-shell-input-once-v198-history08');
});
for(const k of ['adapter','adapterReview','checkpoint'])test('known '+k+' pin matches actual bytes',()=>{assert.match(PINS[k].sha256,/^[a-f0-9]{64}$/);assert.equal(hash(PINS[k].path),PINS[k].sha256);});
test('actual v17 independent review pins exact adapter and has no errors',()=>{const r=JSON.parse(fs.readFileSync(PINS.adapterReview.path));assert.equal(r.status,'INDEPENDENT_PLAN_HISTORY_ADAPTER_V17_PASS');assert.deepEqual(r.errors,[]);assert.equal(r.toolBindings[PINS.adapter.path],PINS.adapter.sha256);});
test('new entry mechanically equals immutable draft except identity and five pins',()=>{
 const old='tools/daily-challenge/formal-v4/run-authored-shell-once-v198.mjs';assert.equal(hash(old),'e842d3c35a589ad773c6f89884828b225046e9a9b9348e687c901b48f40a3978');
 let text=fs.readFileSync(SELF,'utf8').replaceAll('single-authored-shell-input-once-v198-history08','single-authored-shell-input-once-v198').replaceAll('run-authored-shell-once-v198-history08.mjs','run-authored-shell-once-v198.mjs');
 for(const k of ['adapter','adapterReview','checkpoint','checkpointReview','historyBridge'])text=text.replace(new RegExp(`(${k}:\\{path:[^\\n]+sha256:')[^']+('\\},)`),'$1PENDING$2');
 assert.equal(text,fs.readFileSync(old,'utf8'),'No administrative or mathematical gate may change during pin activation');
});
test('each unfinished history proof still blocks readiness',()=>{for(const k of ['checkpointReview','historyBridge']){const pins=structuredClone(PINS);pins[k].sha256='PENDING';assert.throws(()=>assertShellHistoryPinsReadyV198(pins),/PENDING/);}});
test('unready actual entry exits before attempting configuration IO',async()=>{
 if(Object.values(PINS).some(x=>x.sha256==='PENDING'))await assert.rejects(runAuthoredShellOnceV198(null),/PENDING/);
 else assert.equal(assertShellHistoryPinsReadyV198(),true); // Never invoke a ready runner in metadata tests.
});
test('completed proof pins, if supplied later, must bind real matching review/bridge',()=>{
 if(PINS.checkpointReview.sha256==='PENDING'||PINS.historyBridge.sha256==='PENDING')return;
 for(const k of ['checkpointReview','historyBridge'])assert.equal(hash(PINS[k].path),PINS[k].sha256);
 const r=JSON.parse(fs.readFileSync(PINS.checkpointReview.path)),b=JSON.parse(fs.readFileSync(PINS.historyBridge.path));
 assert.equal(r.status,'INDEPENDENT_PLAN_HISTORY_CHECKPOINT_PASS');assert.deepEqual(r.errors,[]);assert.deepEqual(r.checkpoint,PINS.checkpoint);
 assert.equal(b.status,'REVIEWED_PLAN_HISTORY_CHECKPOINT08_BRIDGE');assert.deepEqual(b.checkpoint,PINS.checkpoint);assert.deepEqual(b.checkpointReview,PINS.checkpointReview);
 const {checkpointReview,...rest}=b;assert.deepEqual(rest,r.expectedBridgeFields);assert.deepEqual(b.completeHistoryDeltas,[]);
});
const release=()=>({version:'shell-source7-history08-config-release-v1',runnerReview:{path:'private-review.json',sha256:'a'.repeat(64)},designPool:{path:'private-design.json',sha256:'b'.repeat(64)},unsealedHistory:{path:'private-stocks.json',sha256:'c'.repeat(64)}});
test('release metadata requires all three independently supplied descriptors',()=>assert.deepEqual(assertShellSource7Release(release()),release()));
test('release cannot silently inject a different input, parent or output',()=>{for(const k of ['input','failedParentReceipt','outputDirectory']){const r=release();r[k]='private-override';assert.throws(()=>assertShellSource7Release(r));}});
test('release rejects missing, unknown and malformed review descriptors',()=>{
 for(const k of ['runnerReview','designPool','unsealedHistory']){const r=release();delete r[k];assert.throws(()=>assertShellSource7Release(r));const bad=release();bad[k].sha256='PENDING';assert.throws(()=>assertShellSource7Release(bad));const extra=release();extra[k].accepted=true;assert.throws(()=>assertShellSource7Release(extra));}
});
test('unready seal helper rejects before release IO or frozen installation',async()=>{if(Object.values(PINS).some(x=>x.sha256==='PENDING'))await assert.rejects(sealShellSource7Config(null),/PENDING/);});
test('unready launcher rejects before sealed report IO or child creation',async()=>{if(Object.values(PINS).some(x=>x.sha256==='PENDING'))await assert.rejects(launchSealedShellSource7(null),/PENDING/);});
