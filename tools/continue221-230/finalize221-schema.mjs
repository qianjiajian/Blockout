import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {compile222,payload222} from '../../deliverables/continue221-230-20260929/domain221222.mjs';
import {loadApi,replay} from '../remake191-200/replay.mjs';
import {run226} from './floor226.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from '../revised-gate-span-limits.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {checkLevelSpecLiteral} from './levelspec-literal-check.mjs';

const lock=verifyRulesLock();assert(lock.ok);
const root='deliverables/continue221-230-20260930';
const previousFile=root+'/qualified221-art.json';
const old=JSON.parse(fs.readFileSync(previousFile)),level=structuredClone(old.level);
const artCorrection=level.mechanismAdaptation.artCorrection;
assert.equal(typeof artCorrection,'string');
level.mechanismAdaptation.change+=' '+artCorrection;
delete level.mechanismAdaptation.artCorrection;
const gameplay=x=>{const c=structuredClone(x);delete c.mechanismAdaptation;return c;};
assert.deepEqual(gameplay(level),gameplay(old.level));
const schema=checkLevelSpecLiteral(level,root+'/qualified221-final.satisfies.ts');
assert(schema.passed,JSON.stringify(schema.diagnostics));
const {api}=await loadApi();
const bundled=await build({stdin:{resolveDir:process.cwd(),contents:"export {GAME_ART} from './src/game/artManifest.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {GAME_ART}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const rawAssets=[];
for(const b of level.blocks){
  const shape=api.matchFormalBlockShape(b.shape,'native-only');assert.equal(shape?.quarterTurns,0);
  for(const [i,color]of (b.layers??[b.color]).entries()){
    const kind=b.layers&&i<b.layers.length-1?'shell':'solid';
    const url=GAME_ART.gameplay.formalBlocks[color]?.[kind]?.[shape.shapeId];
    assert(url,`${b.id}/${color}/${shape.shapeId}: missing registered image`);
    const file='public/'+url,bytes=fs.readFileSync(file);assert(bytes.length>24);
    rawAssets.push({blockId:b.id,color,kind,shapeId:shape.shapeId,quarterTurns:0,url,sha256:createHash('sha256').update(bytes).digest('hex')});
  }
}
const payload=payload222(compile222(level));
// This level has axis-limited blocks: keep labels, avoiding the source helper's
// shape/color groups which do not include the axis in their signature.
payload.groups=[];payload.floor=5;payload.maxMilliseconds=4000;payload.maxStates=600000;
const proof=run226(payload);assert(proof.thresholdProven);
const route=replay(level,old.drags,api,{complete:true,requirePointerCompatible:true});
delete route.final;delete route.finalStateKey;
assert.equal(route.nonClearingDrags,6);assert.equal(route.effectiveDrags,36);assert.equal(level.preservedMoveTarget,36);
const structural=api.auditRevisedCandidate({...level,mechanismRules:'revised-2026-09-21-v1.2'},old.sourceContract);
assert.deepEqual(structural.issues,[]);
const audit={structural,opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage({...level,mechanismRules:'revised-2026-09-23-v1.4'}),gates:auditGateSpanLimits(level),native:true,schema,actualArtManifest:{passed:true,rawAssets}};
assert(audit.opening.passed&&audit.hidden.passed&&audit.gates.passed);
const result={...old,level,levelSha256:digest(level),proof,proofQualification:{...old.proofQualification,sourceLevelSha256:digest(level),payload},replay:route,audit,
  schemaRepair:{previousFile,previousLevelSha256:old.levelSha256,artCorrection,change:'Move unsupported mechanismAdaptation.artCorrection text into supported change, retain original text in this external metadata. Gameplay fields unchanged.',gameplayUnchanged:true},
  starTargets:api.levelStarTargets(level),activeRule:lock.activeVersion,status:'HEADLESS_BOUNDS_STATIC_SCHEMA_PASS_POINTER_PENDING',pointerValidated:false,naturalClockValidated:false,formalAdopted:false,releaseApproved:false};
const file=root+'/qualified221-final.json';fs.writeFileSync(file,JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({file,sha:result.levelSha256,L:5,U:6,drags:36,schema:schema.passed,artRows:rawAssets.length,proof}));
