import test from 'node:test';
import assert from 'node:assert/strict';
import {READY,VERSION,HISTORY_RELEASE_PATH,assertAuthoredShellProvidedOnceConfigV198,
 runAuthoredShellProvidedOnceV198} from './run-authored-shell-provided-native-once-v198-history09.mjs';

// Configuration fixtures only: no physical world, runtime, history reader,
// model, replay, search or public ledger is created by this test file.
const descriptor=path=>({path,sha256:'a'.repeat(64)});
function config(){
 const c={version:VERSION,experimentId:'native-runner-schema-fixture',inputCorrection:null,
  target:{formalId:'daily-mechanisms-multilayer-shell-15-d1-10',stageKey:'mechanisms-multilayer-shell-15',difficulty:1,slot:10,sourceLevelId:2},
  outputDirectory:'deliverables/daily-formal-v4-20261008/design/schema-fixture-never-created'};
 for(const k of ['input','staticPreflight','staticVisualEvidence','staticIndependentReview','rootVisualReview',
  'runnerReview','sourceReference','failedParentReceipt','historyReport','formalRegistry','designPool','unsealedHistory'])c[k]=descriptor('fixture/'+k+'.json');
 c.historyRelease=descriptor(HISTORY_RELEASE_PATH);
 return c;
}

test('unqualified native runner rejects before attempting configuration IO',async()=>{
 assert.equal(READY,false);
 await assert.rejects(runAuthoredShellProvidedOnceV198(descriptor('missing-do-not-read.json')),
  /SOURCE ONLY: no IO, history, model or claim/);
});

test('native configuration preserves the full history and static evidence envelope',()=>{
 const c=config();assert.equal(assertAuthoredShellProvidedOnceConfigV198(c),c);
 for(const field of ['failedParentReceipt','historyReport','staticIndependentReview','rootVisualReview','designPool','unsealedHistory']){
  const absent=config();delete absent[field];assert.throws(()=>assertAuthoredShellProvidedOnceConfigV198(absent));
 }
});

test('projected runner version, undeclared fallback and replacement history trust anchor are rejected',()=>{
 for(const mutate of [
  c=>{c.version='single-authored-shell-provided-input-once-v198-history09';},
  c=>{c.fallbackAllowed=true;},
  c=>{c.historyRelease.path='fixture/other-checkpoint.json';},
  c=>{c.inputCorrection=descriptor('fixture/relabel.json');},
 ]){const c=config();mutate(c);assert.throws(()=>assertAuthoredShellProvidedOnceConfigV198(c));}
});

test('configuration cannot escape the output scope or silently change the target slot',()=>{
 for(const mutate of [
  c=>{c.outputDirectory='../outside';},
  c=>{c.outputDirectory='deliverables/daily-formal-v4-20261008/design/../other';},
  c=>{c.input.path=c.outputDirectory+'/input.json';},
  c=>{c.target.slot=9;},
  c=>{c.target.sourceLevelId=201;},
  c=>{c.target.stageKey='mechanisms-generator-35';},
 ]){const c=config();mutate(c);assert.throws(()=>assertAuthoredShellProvidedOnceConfigV198(c));}
});
