import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {digest} from '../revised-preview-validation-v160.mjs';
import {IDS,TARGETS,BEFORE_WRITE_SHA} from './verification.mjs';

export const CONCURRENT9_FILE='deliverables/star-targets141-150-20260927/agent-c/concurrent-before-pointer.json';
export const CONCURRENT9_SHA='a706664c646604198bbc8737a8b28dfc9568660f75afcec0dc64da555c3a9320';
const PREFLIGHT='deliverables/star-targets141-150-20260927/agent-c/pointer-1790488059895-496x1078-42460/preflight.json';
const PREFLIGHT_SHA='6be3cf1c9f5a3fb4ea7567930cfa4dc26b132ca7c24e0992b6945eada84184eb';
const MODULE='src/core/level9OriginalRemake.ts';
const MODULE_SHA='449d4a3d3b7c6e6a919636bb6f8e6810589f198663caaac5de34317d84b780cf';
const WIRING='src/core/levels.ts';
const OLD_WIRING_SHA='833ec8e12ef506f7bda258ea246417dae0a723f0c9fec388bc76d08da241d076';
const NEW_WIRING_SHA='de657e9668e9f8bae69beb92e364ac9a87dab804e4fdde24728f95e053dcdf79';
const RULE9='docs/rules/mechanism-rules-v1.77.0.md';
const RULE9_SHA='a9bc50ca2912a374cae86aa19458addc47e53795063de5e79e6d1864513de11c';
const clone=v=>JSON.parse(JSON.stringify(v));

// This is one concrete, fully read concurrent change. It is not a generic
// permission for arbitrary modules, late stages, other IDs, or new rule text.
export function inspectConcurrent9(before,currentLevels){
  assert.equal(currentLevels.length,200);assert.deepEqual(currentLevels.map(l=>l.id),Array.from({length:200},(_,i)=>i+1));
  assert.equal(before.priorLevels.length,200);assert.deepEqual(before.priorLevels.map(l=>l.id),Array.from({length:200},(_,i)=>i+1));
  assert.equal(digest(fs.readFileSync(PREFLIGHT)),PREFLIGHT_SHA);
  assert.equal(digest(fs.readFileSync(RULE9)),RULE9_SHA);
  const prior=JSON.parse(fs.readFileSync(PREFLIGHT));assert.equal(prior.status,'PREFLIGHT_PASS');
  assert.equal(prior.beforeSha256,BEFORE_WRITE_SHA);assert.deepEqual(prior.requestedIds,IDS);
  assert.equal(digest(fs.readFileSync(MODULE)),MODULE_SHA,'Unreviewed level9 module');
  const wiring=fs.readFileSync(WIRING,'utf8');assert.equal(digest(wiring),NEW_WIRING_SHA,'Unreviewed level9 wiring');
  const removed=wiring.replace(/import \{ applyLevel9OriginalRemake \} from "\.\/level9OriginalRemake";\r?\n/,'')
    .replace(/export const LEVELS_BEFORE_LEVEL9_ORIGINAL_REMAKE: LevelSpec\[\] = LEVELS_BEFORE_LEVEL66_LATE_LIFT_REPAIR.map\(applyLevel66LateLiftRepair\);\r?\n\/\/ v1.77: only Lv9 adopts the original outline and its verified 26-drag star target\.\r?\nexport const LEVELS: LevelSpec\[\] = LEVELS_BEFORE_LEVEL9_ORIGINAL_REMAKE.map\(applyLevel9OriginalRemake\);/,
      'export const LEVELS: LevelSpec[] = LEVELS_BEFORE_LEVEL66_LATE_LIFT_REPAIR.map(applyLevel66LateLiftRepair);');
  assert.equal(prior.bindings[WIRING],OLD_WIRING_SHA);assert.equal(digest(removed),OLD_WIRING_SHA,'Every pre-existing wiring byte must remain exact');
  const coreKeys=Object.keys(prior.bindings).filter(p=>/^(src\/|public\/assets\/art\/)/.test(p));
  const drift=coreKeys.filter(p=>digest(fs.readFileSync(p))!==prior.bindings[p]);assert.deepEqual(drift,[WIRING],'Only reviewed level9 wiring may change; runtime and art remain byte-exact');
  const currentPaths=[];
  function tree(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())tree(p);else currentPaths.push(p.replaceAll('\\','/'));}}
  tree('src');tree('public/assets/art');
  const added=currentPaths.filter(p=>!coreKeys.includes(p)).sort();assert.deepEqual(added,[MODULE],'Only the reviewed new level9 data module may be added');
  for(const [p,h]of Object.entries(prior.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h,'Existing source/proof/runtime evidence '+p);
  for(const [p,h]of Object.entries(prior.bindings))if(p.startsWith('deliverables/')||p.startsWith('tests/fixtures/')||p.startsWith('docs/rules/'))assert.equal(digest(fs.readFileSync(p)),h,'Existing candidate/archive/fixture/rule evidence '+p);
  const expected=clone(before.priorLevels);for(const id of IDS)if(id!==142)expected[id-1].preservedMoveTarget=TARGETS[id];
  const changed=currentLevels.filter((l,i)=>digest(l)!==digest(expected[i])).map(l=>l.id);assert.deepEqual(changed,[9],`Unreviewed current level IDs: ${changed.join(',')}`);
  assert.equal(currentLevels[8].id,9);
  return{passed:true,kind:'exact-reviewed-concurrent-level9-data-and-wiring',beforeSha256:BEFORE_WRITE_SHA,
    preflight:{file:PREFLIGHT,sha256:PREFLIGHT_SHA},rule:{file:RULE9,sha256:RULE9_SHA},concurrentIds:[9],
    unmodifiedTargetIds:IDS,priorLevel9Sha256:digest(before.priorLevels[8]),currentLevel9:clone(currentLevels[8]),currentLevel9Sha256:digest(currentLevels[8]),
    source:{[MODULE]:MODULE_SHA,[WIRING]:NEW_WIRING_SHA},oldWiringSha256:OLD_WIRING_SHA,removedExactWiringSha256:digest(removed),
    unchangedPriorCoreAndArtFiles:coreKeys.length-1,addedCoreFiles:added,onlyWiringChanged:true,runtimeAndArtByteExact:true,
    sourceProofEvidenceUnchanged:true,all199OtherLevelsPreserved:true,certifiesLevel9Gameplay:false};
}

export function applyConcurrent9(before,currentLevels,file,sha){
  assert.equal(file.replaceAll('\\','/'),CONCURRENT9_FILE);assert.equal(sha,CONCURRENT9_SHA);
  assert.equal(digest(fs.readFileSync(file)),CONCURRENT9_SHA,'Reviewed supplemental bytes');
  const review=JSON.parse(fs.readFileSync(file)),actual=inspectConcurrent9(before,currentLevels);assert.deepEqual(actual,review);
  const adjusted=clone(before);adjusted.priorLevels[8]=clone(review.currentLevel9);adjusted.campaignSha256=digest(adjusted.priorLevels);
  return{before:adjusted,review,bindings:{[file]:sha,[PREFLIGHT]:PREFLIGHT_SHA,[RULE9]:RULE9_SHA}};
}
