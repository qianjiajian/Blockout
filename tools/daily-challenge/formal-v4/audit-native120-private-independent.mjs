import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadV4Runtime} from './runtime.mjs';

const out='deliverables/daily-formal-v4-20261008/proof/native120-counter-independent-v2-01';
const runtime=await loadV4Runtime(),fileBindings={};
const hash=b=>createHash('sha256').update(b).digest('hex');
async function read(p,expected){const b=await fs.readFile(p),h=hash(b);if(expected)assert.equal(h,expected,p);if(fileBindings[p])assert.equal(fileBindings[p],h,p);fileBindings[p]=h;return b;}
async function json(p,expected){return JSON.parse(await read(p,expected));}
async function bindReceipt(p,expected){const r=await json(p,expected);for(const [file,h]of Object.entries(r.toolBindings??r.fileBindings??{}))await read(file,h);return r;}
const expected={
 'tools/daily-challenge/formal-v4/native-120-upper.mjs':'5de29e5c8ff73af4952e6e929dbc350dd2b64fb948ec9f0191f4cfddffd521a1',
 'tools/daily-challenge/formal-v4/prefix-tail-native-120-v4.mjs':'e75d08c2f43ed54e0603603d276aa4bf3b0eef8bab0db2b85e1bf8029d9c3066',
 'tools/daily-challenge/formal-v4/prefix-tail-native-120-v4-v2.mjs':'7303abec3b7ecf788b1dec3e1d35c382ab4b8a10bf0e50a7e2515a67a496a940',
 'tools/daily-challenge/formal-v4/prefix-tail-native-120-v4-v2.test.mjs':'a64c2520015bf80c692ff27732ad53de9c0640fb36019d4e518cadd4f2716a89'};
const environment=await json('snapshot-environment.json');
for(const [file,h]of Object.entries({...runtime.toolchainBindings,...expected}))await read(file,h);
const root=path.resolve('../../..');for(const [file,h]of Object.entries(expected))assert.equal(hash(await fs.readFile(path.join(root,file))),h,`Root/snapshot discrepancy ${file}`);
const author=await bindReceipt('deliverables/daily-formal-v4-20261008/proof/native120-prefix-tail-v2-qualification-01/report.json','bdf689a8b9d042ee7cb9585b6e4542307635a18c8db97235223f22a1734e29fb');
const repeat=await bindReceipt(`${out}/author-rerun/report.json`),extra=await bindReceipt(`${out}/extra/report.json`);
assert.equal(author.status,'NATIVE120_PREFIX_TAIL_V4_V2_PRIVATE_QUALIFICATION_PASS');assert.equal(repeat.status,author.status);
assert.equal(repeat.evidence.length,15);assert(repeat.evidence.every(r=>r.passed));
assert.equal(extra.status,'NATIVE120_COUNTER_NEGATIVES_PASS');assert.equal(extra.evidence.length,3);assert(extra.evidence.every(r=>r.passed));
const oldFailPath='deliverables/daily-formal-v4-20261008/proof/native120-counter-independent-01/extra/report.json';
const oldFail=await json(oldFailPath,'80ccc712f9ef60686a0ef4a363dfce07c8230fb484fe4163b97480ec3c0c45bb');assert.equal(oldFail.status,'NATIVE120_COUNTER_NEGATIVES_FAIL');
assert.equal(repeat.publicRequestCountBefore,repeat.publicRequestCountAfter);assert.equal(extra.publicBefore,extra.publicAfter);assert.equal(extra.publicBefore,repeat.publicRequestCountAfter);
const publicPath='deliverables/daily-formal-v3-20261008/proof/attempts';
assert.equal((await fs.readdir(publicPath)).filter(p=>p.endsWith('.request.json')).length,extra.publicAfter);
const primitive=(await read('tools/daily-challenge/formal-v4/native-120-upper.mjs')).toString('utf8');
let original=(await read('tools/daily-challenge/formal-v3/bounded-proof.mjs')).toString('utf8');
original=original.slice(original.indexOf('export function boundedUpperSearch('),original.indexOf('\nexport async function loadBoundedRuntime')).replaceAll('\r\n','\n').trimEnd();
const derived=original.replace('export function boundedUpperSearch(','export function native120UpperSearch(')
 .replace('  const budget=boundedBudget(requested),started=Date.now(),','  assert.equal(runtime.toolchainSha256,FROZEN_PROOF_SHA);assertNative120RectangleDomain(level);\n  const budget=reservedNative120Budget(requested),started=Date.now(),')
 .replace("({status,termination,witnessFound:status==='witness',budget,","({upperEngine:NATIVE120_ENGINE_BINDING,status,termination,witnessFound:status==='witness',budget,")
 .replace('const witness=drags=>{const replay=runtime.replayRevisedRoute(level,drags);return','const witness=drags=>{guard();const replay=runtime.replayRevisedRoute(level,drags);guard();return');
assert.equal(primitive.slice(primitive.indexOf('export function native120UpperSearch('),primitive.indexOf('// END DERIVED NATIVE LOOP')).trimEnd(),derived);
const wrapper=(await read('tools/daily-challenge/formal-v4/prefix-tail-native-120-v4-v2.mjs')).toString('utf8');
for(const token of ['maxMilliseconds:120000','maxStates:9999,maxMilliseconds:30000','const lower=guardedPlainTask(level,runtime,{floor:plan.floor,...plan.lowerBudget})','allowRevalidation:false'])assert(wrapper.includes(token),token);
assert(wrapper.indexOf("assert.equal(bindings[NATIVE120_WRAPPER_BINDING.path]")<wrapper.indexOf('const ledger=await createAttemptLedger'));
assert(wrapper.indexOf('assert.equal(bindings[NATIVE120_ENGINE_BINDING.tool.path]')<wrapper.indexOf('const ledger=await createAttemptLedger'));
await read('tools/daily-challenge/formal-v4/audit-native120-private-independent.mjs');
const report={status:'INDEPENDENT_NATIVE120_PREFIX_TAIL_PRIVATE_PASS',version:'native120-counter-review-v2-1',
 reviewed:{primitive:{path:Object.keys(expected)[0],sha256:expected[Object.keys(expected)[0]]},wrapper:{path:Object.keys(expected)[2],sha256:expected[Object.keys(expected)[2]]}},
 authorQualification:{path:'deliverables/daily-formal-v4-20261008/proof/native120-prefix-tail-v2-qualification-01/report.json',sha256:fileBindings['deliverables/daily-formal-v4-20261008/proof/native120-prefix-tail-v2-qualification-01/report.json']},
 independentRerun:{path:`${out}/author-rerun/report.json`,sha256:fileBindings[`${out}/author-rerun/report.json`],testsPassed:15},
 independentNewNegatives:{path:`${out}/extra/report.json`,sha256:fileBindings[`${out}/extra/report.json`],testsPassed:3},
 historicalFailure:{path:oldFailPath,sha256:fileBindings[oldFailPath],status:'FAIL_PRESERVED',finding:'Import-time native engine SHA could disagree with compiled binding and still return accepted in the old wrapper.'},
 review:{fullOld30WrapperTo120DiffRead:true,full120v1ToV2DiffRead:true,derivedNativeLoopExactAfterFourDeclaredChanges:true,
  onlyNewInputs:true,oneTailOnly:true,priorPrefixTailAndTerminalWorldCap:10000,originalLowerClosure:runtime.toolchainSha256,originalLowerMaxMilliseconds:30000,
  primitiveAndWrapperImportBytesAnchoredBeforeClaim:true,secondDeferredFullReplayLateRejectedBeforeLower:true,oldFailureNotRetriedBy120OrRename:true,
  junctionPrivateNamespaceGuard:true,upperPriorityNotOptimality:true,actualOriginalDoubleURequired:true,originalLowerNeverTailLower:true},
 environmentDescriptor:{path:'snapshot-environment.json',sha256:fileBindings['snapshot-environment.json']},environment,fileBindings,
 publicRequestCountBefore:extra.publicBefore,publicRequestCountAfter:extra.publicAfter,newRealCandidateConstructions:0,newRealCandidateSearches:0,publicClaimsStarted:0,
 privateTestsOnly:true,qualificationCodeChangedByReviewer:false,sourceFilesModified:false,currentUIValidationClaimed:false,formalReady:false,
 limitations:['PASS applies to the new rectangle private tool qualification, not any new real puzzle or plan.',
  '120 seconds is only the predeclared constructive U resource ceiling for a genuinely new input; original lower remains 30 seconds and frozen 4588.',
  'No old failed stock may switch tools or budgets and be retried. No production factory or native120 runner is enabled by this report.']};
await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({status:report.status,path:`${out}/report.json`,sha256:hash(await fs.readFile(`${out}/report.json`)),testsPassed:18,publicRequests:extra.publicAfter}));
