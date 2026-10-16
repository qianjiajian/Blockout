import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {VERSION,BUDGET,assertAuthoredBasicOnceConfigV198,assertPlainJointSelectionV198,assertAdministrativeEnvelopeCorrectionV198,assertAuthoredReservationV198,authoredBasicMathOptionsV198} from './run-authored-basic-once-v198.mjs';

// Metadata only: no runner call, runtime, model, history loader, ledger or file writes.
const desc={path:'private-metadata-fixture.json',sha256:'a'.repeat(64)};
const target={formalId:'daily-basic-combined-d3-08',stageKey:'basic-combined',difficulty:3,slot:8,sourceLevelId:120};
const config=()=>({version:VERSION,experimentId:'private-metadata-fixture',input:{...desc},inputCorrection:null,staticPreflight:{...desc},staticIndependentReview:{...desc},rootVisualReview:{...desc},runnerReview:{...desc},target:{...target},sourceReference:{...desc},failedParentReceipt:{...desc},historyReport:{...desc},formalRegistry:{...desc},designPool:{...desc},unsealedHistory:{...desc},outputDirectory:'deliverables/daily-formal-v4-20261008/design/private-metadata-fixture/run-01'});
test('configuration accepts exact basic slot; execution is not invoked',()=>assert.equal(assertAuthoredBasicOnceConfigV198(config()).target.slot,8));
for(const[field,value]of [['version','old'],['maxStates',10000],['fallbackAllowed',true],['searchUpper',256],['qualificationOnly',true],['ledgerDirectory','private']])test('configuration rejects '+field,()=>{const c=config();c[field]=value;assert.throws(()=>assertAuthoredBasicOnceConfigV198(c));});
for(const[field,value]of [['difficulty',4],['slot',0],['slot',11],['sourceLevelId',0],['sourceLevelId',201],['formalId','daily-basic-combined-d2-08'],['stageKey','mechanisms-bomb-120']])test('configuration rejects mismatched target '+field+' '+value,()=>{const c=config();c.target[field]=value;assert.throws(()=>assertAuthoredBasicOnceConfigV198(c));});
for(const output of ['../outside','deliverables/daily-formal-v4-20261008/design/a/../b','C:/outside','deliverables/daily-formal-v4-20261008/design/a\\b'])test('configuration rejects output '+output,()=>{const c=config();c.outputDirectory=output;assert.throws(()=>assertAuthoredBasicOnceConfigV198(c));});
test('configuration rejects missing review and malformed digest',()=>{const c=config();delete c.runnerReview;assert.throws(()=>assertAuthoredBasicOnceConfigV198(c));const d=config();d.historyReport.sha256='';assert.throws(()=>assertAuthoredBasicOnceConfigV198(d));});
test('configuration cannot reuse input directory as output latch',()=>{const c=config();c.input.path=c.outputDirectory+'/input.json';assert.throws(()=>assertAuthoredBasicOnceConfigV198(c));});

const dir='deliverables/daily-formal-v4-20261008/design/basic-d3-08-source120-new-01/';
const [original,corrected,correction,reservation]=await Promise.all(['input.json','input-envelope-02.json','envelope-correction-02.json','construction-reservation.json'].map(async p=>JSON.parse(await fs.readFile(dir+p))));
const strategy={route:'plain-joint',lower:'plain'};
test('real corrected source120 metadata is accepted without loading model',()=>assert.doesNotThrow(()=>assertPlainJointSelectionV198(corrected,target,strategy)));
test('real original erroneous newestMechanism is rejected',()=>assert.throws(()=>assertPlainJointSelectionV198(original,target,strategy)));
for(const[k,v]of [['drags',[]],['routeSha256','a'.repeat(64)],['timeSchedule',[]],['timeScheduleSha256','a'.repeat(64)],['L',28],['U',31],['proof',{}],['lowerBound',{}],['route',{}],['mathematicalEvidence',{}]])test('new input rejects pre-existing '+k,()=>assert.throws(()=>assertPlainJointSelectionV198({...corrected,[k]:v},target,strategy)));
for(const route of ['native','ice-joint','provided'])test('reject non-plain joint '+route,()=>assert.throws(()=>assertPlainJointSelectionV198(corrected,target,{route,lower:'plain'})));
test('reject projected lower even with joint label',()=>assert.throws(()=>assertPlainJointSelectionV198(corrected,target,{route:'plain-joint',lower:'projected-plain'})));
test('real administrative correction preserves every other field',()=>assert.doesNotThrow(()=>assertAdministrativeEnvelopeCorrectionV198(original,corrected,correction)));
test('administrative correction rejects changed opaque payload without constructing a LevelSpec',()=>{const before={newestMechanism:'basic-combined',level:{marker:'before'}},after={newestMechanism:null,level:{marker:'after'}};assert.throws(()=>assertAdministrativeEnvelopeCorrectionV198(before,after,correction));});
test('administrative correction cannot change slot',()=>assert.throws(()=>assertAdministrativeEnvelopeCorrectionV198(original,{...corrected,slot:9},correction)));
test('administrative correction cannot mint another physical attempt',()=>assert.throws(()=>assertAdministrativeEnvelopeCorrectionV198(original,corrected,{...correction,newPhysicalInputs:1})));
test('real reservation binds original experiment and slot',()=>assert.doesNotThrow(()=>assertAuthoredReservationV198(reservation,corrected,reservation.experimentId)));
test('renaming experiment does not recycle reservation',()=>assert.throws(()=>assertAuthoredReservationV198(reservation,corrected,reservation.experimentId+'-retry')));
for(const[k,v]of [['maximumFullWorldInputs',2],['newSearches',1],['newSharedLedgerClaims',1],['retryAllowed',true],['fallbackAllowed',true],['rebandAllowed',true],['slot',10]])test('reservation rejects '+k,()=>assert.throws(()=>assertAuthoredReservationV198({...reservation,[k]:v},corrected,reservation.experimentId)));
test('joint budget remains9999+1; no independent expanded caller budget',()=>{const options=authoredBasicMathOptionsV198('b'.repeat(64));assert.deepEqual(options.routeBudget,BUDGET);assert.deepEqual(options.lowerBudget,BUDGET);assert.equal(options.routeStrategy,'plain-minimum');assert.equal(options.searchUpper,128);options.routeBudget.maxStates=10000;assert.equal(authoredBasicMathOptionsV198('b'.repeat(64)).routeBudget.maxStates,9999);assert.equal(BUDGET.maxStates,9999);});
test('math options reject missing or fabricated parent id',()=>{assert.throws(()=>authoredBasicMathOptionsV198(''));assert.throws(()=>authoredBasicMathOptionsV198('old-revalidation-id'));});
