import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';

const ROOT='deliverables/daily-formal-v4-20261008';
export const UI_SELECTION_EVIDENCE_PINS=Object.freeze({
 quick:{path:ROOT+'/proof/completed161-quick-independent-01.json',sha256:'91ced2f2d9d6db570fb0b149add08c437506c3218a5145eefa896c5a07443d82'},
 selection:{path:ROOT+'/selection/completed-basic-and-advanced-161-01/index.json',sha256:'faf2a840869b3ed1ae971df301e82a495981449bb6207a3e186c2961af2965d1'},
 pointer:{path:ROOT+'/proof/axis-iced-source18-current-pointer-02/report.json',sha256:'61e215b2c87eed0e7bb9ba8a76903d60565658538a9e7a14d9157bc388ab0068'},
 visual:{path:ROOT+'/proof/axis-iced-source18-current-pointer-02/root-visual-review.json',sha256:'4b36fd17bc311384ae26b1ec3dbe247d2be882e09276dd06d56ec3e29f12c4ae'},
 receipt:{path:ROOT+'/selection/axis-iced-source18-01/candidate.json',sha256:'bbe686b985107c38806ccc899eb750f0da0116962836bb633a17af16d2bca2d9'},
 actual:{path:ROOT+'/proof/axis-iced-source18-actual-independent-01/report.json',sha256:'b7f2560c1e7baacf503494269154ff33042b9dac07dc31a33fb0c79e1fdc03c6'},
 environment:{path:ROOT+'/frozen-workspace-4588/snapshot-environment.json',sha256:'8d52d96c73b87b9c95207757164d0e95876e3f434f3540750eb605d18d7e2583'},
});
const sha=b=>createHash('sha256').update(b).digest('hex');
const key=(root,p)=>path.win32.resolve(root,p).toLowerCase();
const UI_TOOLS=['tools/daily-challenge/formal-v4/pointer-current-selected-batch.mjs','tools/daily-challenge/formal-v3/pointer.html','tools/daily-challenge/formal-v3/pointer-browser.mjs'];
function add(bindings,p,h){assert(/^[a-f0-9]{64}$/.test(h));if(bindings[p])assert.equal(bindings[p],h,'Binding conflict '+p);bindings[p]=h;}

/** Pure split. Only absolute original-root UI paths already listed by the
 * exact Pointer report can be historical observations. Relative frozen-math
 * paths, archives, evidence, contracts, assets and other tools remain inputs. */
export function separateExactPointerUIBindings(quickBindings,pointerBindings,sourceWorkspace){
 assert(path.win32.isAbsolute(sourceWorkspace));
 const rootKey=key(sourceWorkspace,'.'),pointer=new Map(),seen=new Map();
 for(const[p,h]of Object.entries(pointerBindings)){assert(/^[a-f0-9]{64}$/.test(h));const k=key(sourceWorkspace,p);if(pointer.has(k))assert.equal(pointer.get(k).sha256,h,'Conflicting Pointer path');else pointer.set(k,{path:p,sha256:h});}
 const uiTools=new Set(UI_TOOLS.map(p=>key(sourceWorkspace,p))),manifest=key(sourceWorkspace,'docs/rules/manifest.json');
 const historicalBindings={},excludedUIBindings=[];
 for(const[p,h]of Object.entries(quickBindings)){
  assert(/^[a-f0-9]{64}$/.test(h));const k=key(sourceWorkspace,p);if(seen.has(k))assert.equal(seen.get(k),h,'Conflicting quick path');seen.set(k,h);
  const exact=pointer.get(k);if(exact)assert.equal(exact.sha256,h,'Quick/Pointer SHA mismatch '+p);
  const rootUI=path.win32.isAbsolute(p)&&(k.startsWith(rootKey+'\\src\\')||uiTools.has(k)||k===manifest);
  if(rootUI){assert(exact,'Unlisted root UI binding cannot be excluded: '+p);excludedUIBindings.push({path:p,sha256:h,pointerBindingPath:exact.path,
   reason:k===manifest?'historical-current-policy-observation':uiTools.has(k)?'historical-pointer-execution-tool':'historical-current-ui-source'});}
  else add(historicalBindings,p,h);
 }
 return{historicalBindings,excludedUIBindings};
}

/** Read immutable evidence only. Never open excluded current source bytes or
 * import them into mathematical bindings. The caller still binds its frozen
 * mathematics, current complete mainline source and live policy observation. */
export async function readSeparated161SelectionEvidence(quickDescriptor,{bindings={}}={}){
 assert.deepEqual(quickDescriptor,UI_SELECTION_EVIDENCE_PINS.quick,'Only reviewed actual161 is supported');
 const evidenceBindings={};
 async function read(d,json=true){assert(d?.path&&/^[a-f0-9]{64}$/.test(d.sha256??''));const b=await fs.readFile(d.path);assert.equal(sha(b),d.sha256,'Changed evidence '+d.path);add(evidenceBindings,d.path,d.sha256);return json?JSON.parse(b):b;}
 const pins=UI_SELECTION_EVIDENCE_PINS,quick=await read(pins.quick),selection=await read(pins.selection),pointer=await read(pins.pointer),visual=await read(pins.visual),environment=await read(pins.environment);
 assert.equal(quick.status,'INDEPENDENT_161_MERGE_QUICK_CHECK_PASS');assert.deepEqual(quick.errors,[]);assert.equal(quick.candidates,161);assert.deepEqual(quick.selection,pins.selection);
 assert.deepEqual(quick.currentCandidatePointer,pins.pointer);assert.deepEqual(quick.actualImageReview,pins.visual);assert.deepEqual(quick.independentActualAudit,pins.actual);
 assert.equal(selection.files.length,161);assert.equal(selection.files[160],pins.receipt.path);assert.equal(selection.fileBindings[pins.receipt.path],pins.receipt.sha256);
 const actual=await read(pins.actual),receipt=await read(pins.receipt);assert.equal(actual.status,'INDEPENDENT_AXIS_ICED_TASK_ACTUAL_PASS');assert(actual.accepted&&receipt.accepted);assert.deepEqual(actual.receipt,pins.receipt);assert.deepEqual(actual.errors,[]);
 assert.equal(pointer.status,'SELECTED_CANDIDATES_CURRENT_POINTER_RUNS_PASS');assert.equal(pointer.passed,2);assert.equal(pointer.results.length,2);assert.equal(pointer.bindings[pins.receipt.path],pins.receipt.sha256);
 assert.equal(pointer.realPlayerSaveTouched,false);assert.equal(pointer.newGameplaySearches,0);assert.equal(pointer.newPublicClaims,0);
 assert.equal(visual.status,'ROOT_ACTUAL_SIX_AXIS_ICE_PNG_AND_POINTER_REVIEW_PASS');assert.deepEqual(visual.pointer,pins.pointer);assert.deepEqual(visual.receipt,pins.receipt);assert(visual.actualImagesOpenedByRoot);assert.equal(visual.images.length,6);
 const runs=[];for(const r of pointer.results){const run=await read(r.report);assert.equal(run.status,'CANDIDATE_CURRENT_UI_POINTER_NATURAL_TIME_PASS');assert.deepEqual(run.receipt,pins.receipt);assert.deepEqual(run.errors,[]);assert.equal(run.levelSha256,receipt.levelSha256);assert.equal(run.routeSha256,receipt.routeSha256);assert(run.pointerValidated&&run.timeValidated&&run.settlementValidated);assert.equal(run.playerSaveTouched,false);runs.push(r.report);}
 assert.deepEqual(pointer.results.map(r=>r.viewport),[{width:320,height:568},{width:496,height:1078}]);
 const imageKeys=new Set();for(const image of visual.images){assert(['opening','mechanism','complete'].includes(image.name));const imageKey=image.viewport.width+'x'+image.viewport.height+':'+image.name;assert(!imageKeys.has(imageKey));imageKeys.add(imageKey);await read(image,false);}
 assert.deepEqual([...imageKeys].sort(),['320x568:complete','320x568:mechanism','320x568:opening','496x1078:complete','496x1078:mechanism','496x1078:opening']);
 await read(pointer.selection);
 const separated=separateExactPointerUIBindings(quick.inputBindings,pointer.bindings,environment.sourceWorkspace);
 assert.equal(separated.excludedUIBindings.length,293,'Exact161 UI observation set changed');
 for(const d of [pins.receipt,pins.actual,pins.quick,pins.pointer,pins.visual,...runs,...visual.images]){
  if(d.path!==pins.quick.path){const matches=Object.entries(quick.inputBindings).filter(([p,h])=>key(environment.sourceWorkspace,p)===key(environment.sourceWorkspace,d.path)&&h===d.sha256);assert(matches.length,'Quick must bind evidence '+d.path);}
 }
 for(const [p,h]of Object.entries(evidenceBindings))add(bindings,p,h);
 return{version:'exact161-pointer02-ui-observation-separation-v1',quick:pins.quick,selection:pins.selection,pointer:pins.pointer,visual:pins.visual,runs,images:visual.images,
  ...separated,evidenceBindings,exclusionCount:293,excludedBindingOwner:pins.pointer,
  obligations:{frozenMathematicsMustBeBoundSeparately:true,currentCompleteMainlineSourceMustBeRecompiled:true,currentPolicyMustBeObserved:true},
  currentUIRevalidationClaimed:false,formal300Acceptance:false,newSearches:0,newConstructions:0,newLedgerClaims:0};
}
