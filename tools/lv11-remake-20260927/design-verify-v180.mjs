import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {build} from 'esbuild';
import {checkFastFloor, compileLevel, forEachGesture, stateFromSnapshot, stateKey} from '../remake21to30-mask-floor.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';

// Fresh evidence only. The selected level/route is read, never rewritten.
const candidatePath = 'deliverables/lv11-remake-20260927/design-structured-1790489811659/route-7681.json';
const qualificationPath = 'deliverables/lv11-remake-20260927/validation-qualification-1790489558478/report.json';
const sourcePath = 'deliverables/lv11-remake-20260927/source-ledger.json';
const outputPath = `deliverables/lv11-remake-20260927/design-proof-v180-${Date.now()}.json`;
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sha = value => createHash('sha256').update(value).digest('hex');
const digest = value => sha(JSON.stringify(canonical(value)));
const rawHash = file => sha(fs.readFileSync(file));
const raw = fs.readFileSync(candidatePath), candidate = JSON.parse(raw), {level,drags} = candidate;
const bindings = {};
const bind = file => bindings[file] = rawHash(file);
const manifest = JSON.parse(fs.readFileSync('docs/rules/manifest.json', 'utf8'));
assert.equal(manifest.activeVersion, '1.80.0');
for (const file of [candidatePath, qualificationPath, sourcePath, 'docs/rules/manifest.json',
  'docs/rules/mechanism-rules-v1.80.0.md', 'tools/lv11-remake-20260927/design-verify-v180.mjs',
  'tools/remake21to30-mask-floor.mjs', 'tools/remake21to30-symmetry-floor-v139.mjs',
  'tools/remake21to30-mask-floor.test.mjs', 'tools/remake21to30-symmetry-floor-v139.test.mjs']) bind(file);
assert.equal(digest(level), '925fb382290a389b30050d2d7544dc94fa2434c7f67cc55ec508116a963b09bc');
assert.equal(level.preservedMoveTarget, 36);
assert.equal(level.timeSeconds, 120);
assert.equal(level.reward, 40);
assert.equal(level.designTargets, undefined);
const lock = spawnSync(process.execPath, ['tools/verify-rules-lock.mjs'], {encoding:'utf8',timeout:30000});
assert.equal(lock.status, 0, lock.stderr);

const qualification = JSON.parse(fs.readFileSync(qualificationPath, 'utf8'));
assert.equal(qualification.status, 'PASS');
const qualificationDrift = Object.entries(qualification.bindings).flatMap(([file, expected]) => {
  const actual = rawHash(file); return actual === expected ? [] : [{file, expected, actual}];
});
// The rule manifest and production wiring legitimately changed after the v1.79
// fixture qualification. No qualified mechanism or solver implementation may drift.
const allowedRebinding = new Set(['docs/rules/manifest.json','src/core/levels.ts']);
assert.deepEqual(qualificationDrift.filter(row=>!allowedRebinding.has(row.file)), []);
const tests = spawnSync(process.execPath, ['--test', 'tools/remake21to30-mask-floor.test.mjs',
  'tools/remake21to30-symmetry-floor-v139.test.mjs'], {encoding:'utf8',timeout:60000,maxBuffer:8*1024*1024});
assert.equal(tests.status, 0, tests.stdout + tests.stderr);
const compiled = compileLevel(level);
const start = Date.now();
const quotient = checkSymmetryFloor(level,{floor:12,maxStates:1000000,maxMilliseconds:30000});
const quotientElapsedMs = Date.now() - start;
console.log(JSON.stringify({phase:'fresh-quotient',result:quotient,elapsedMs:quotientElapsedMs}));
const maskStart = Date.now();
const mask = checkFastFloor(level,{floor:12,maxStates:1000000,maxMilliseconds:2500});
const maskElapsedMs = Date.now() - maskStart;
console.log(JSON.stringify({phase:'fresh-unquotiented-mask',result:mask,elapsedMs:maskElapsedMs}));

const bundle = await build({stdin:{resolveDir:process.cwd(),contents:`
  export {PuzzleModel} from './src/core/PuzzleModel.ts';
  export {LEVELS} from './src/core/levels.ts';
  export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';`},
  bundle:true,write:false,platform:'node',format:'esm',metafile:true});
for (const file of Object.keys(bundle.metafile.inputs).filter(file => file !== '<stdin>')) bind(file);
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
assert.equal(digest(api.LEVELS.find(item=>item.id===11)),digest(level));
const replay = api.replayRevisedRoute(level,drags);
assert.equal(replay.valid,true); assert.equal(replay.complete,true);
assert.equal(replay.effectiveDrags,34); assert.equal(replay.nonClearingDrags,12); assert.equal(replay.clearEvents,22);
const model = new api.PuzzleModel(level); model.startCountdown();
const steps=[];
for(const [index,drag] of drags.entries()) {
  const before=model.snapshot(), body=model.getBlock(drag.blockId), area=body.shape.length;
  const startAnchor=[body.x,body.y], beforeState=stateFromSnapshot(compiled,before);
  model.beginAction();
  for(const [x,y] of drag.path) assert.equal(model.moveBlockStep(drag.blockId,x,y),true);
  if(drag.exitSide) assert.equal(model.tryExit(drag.blockId,drag.exitSide).ok,true);
  assert.equal(model.commitAction(),true);
  const after=model.snapshot(), afterState=stateFromSnapshot(compiled,after), deltaClear=after.cleared-before.cleared;
  let projected=false;
  forEachGesture(compiled,beforeState,(i,value,cost) => {
    if(compiled.blocks[i].id!==drag.blockId || cost!==(deltaClear?0:1)) return;
    const next=beforeState.slice(); next[i]=value;
    if(stateKey(next)===stateKey(afterState)){projected=true;return false;}
  });
  assert.equal(projected,true,`Projection failed drag ${index+1}`);
  const iceChecks=level.blocks.filter(b=>b.frozen).map(b=>{
    const actual=after.blocks.find(x=>x.id===b.id);
    const expectedRemaining=Math.max(0,b.frozen-after.cleared);
    if(actual) assert.equal(actual.frozen,expectedRemaining);
    return {blockId:b.id,initialIce:b.frozen,remaining:actual?.frozen??null,expectedRemaining,cleared:!actual};
  });
  steps.push({drag:index+1,blockId:drag.blockId,color:body.color,area,startAnchor,path:drag.path,
    exitSide:drag.exitSide??null,clearBefore:before.cleared,clearAfter:after.cleared,
    nonClearing:deltaClear===0,projected,iceChecks});
}
const setup=steps.filter(s=>s.nonClearing), H3=setup.filter(s=>s.area===3), S=setup.filter(s=>s.area===1);
assert.equal(H3.length,4); assert.equal(S.length,8);
const source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
const tuples=blocks=>blocks.map(b=>JSON.stringify({shape:b.shape,color:b.color,frozen:b.frozen??0})).sort();
assert.deepEqual(tuples(level.blocks),tuples(source.blocks));
const gateTuples=gates=>gates.map(g=>JSON.stringify({color:g.color,frozen:g.frozen??0})).sort();
assert.deepEqual(gateTuples(level.gates),gateTuples(source.gates));
assert.equal(rawHash(candidatePath),sha(raw));
const drift=Object.entries(bindings).flatMap(([file,expected])=>rawHash(file)===expected?[]:[file]);
assert.deepEqual(drift,[]);
assert.equal(quotient.thresholdProven,true);
const report={generatedAt:new Date().toISOString(),status:'PASS',scope:'Fresh Lv11 v1.80 lower-bound and full authoritative spatial witness; not GUI/time or formal adoption',
  ruleVersion:manifest.activeVersion,candidatePath,candidateRawSha256:sha(raw),levelSemanticSha256:digest(level),candidateUnchanged:true,
  floor:12,excludedNonClearingCounts:[0,1,2,3,4,5,6,7,8,9,10,11],upperBound:12,actualMinimumNonClearingDrags:12,
  lowerBoundQualification:{path:qualificationPath,sha256:rawHash(qualificationPath),originalRuleVersion:qualification.ruleVersion,
    scope:qualification.scope,bindingsChecked:Object.keys(qualification.bindings).length,drift:qualificationDrift,
    explanation:'v1.80 changes only acceptance threshold. Qualified mechanism and solver sources remain byte-identical. The active rule manifest and production LEVELS wiring are explicitly rebound, with current formal Lv11 semantic equality checked. The v1.79 fixture report is not relabeled.'},
  freshQualificationTests:{command:'node --test tools/remake21to30-mask-floor.test.mjs tools/remake21to30-symmetry-floor-v139.test.mjs',exitCode:tests.status,stdout:tests.stdout,stderr:tests.stderr},
  lowerBounds:{quotient:{...quotient,elapsedMs:quotientElapsedMs},unquotientedMask:{...mask,elapsedMs:maskElapsedMs}},
  proofArgument:'The qualified optional-contact, unlimited-time mask graph contains every supported real gesture. Its identity quotient and monotone zero-cost final-body removal normalization preserve optimum in this fixed non-spawning countdown domain. Exhausting every quotient state of cost <12 therefore excludes every real solution of cost 0..11. Independent current PuzzleModel replay gives a complete cost-12 witness.',
  replay,sourceInventory:{blocksExactPaired:true,gatesExactColorCountPaired:true,blockCount:level.blocks.length,playableCells:level.playable.length},
  setupBreakdown:{H3:H3.length,S:S.length,H3Distinct:[...new Set(H3.map(s=>s.blockId))],SDistinct:[...new Set(S.map(s=>s.blockId))],
    note:'4 H3 moves and 8 S moves; H3 is not the numerical majority. Per-route necessity of a named gesture is not implied by the certified total minimum.'},
  steps,metadata:{difficulty:level.difficulty,name:level.name,timeSeconds:level.timeSeconds,reward:level.reward,parMoves:level.parMoves,preservedMoveTarget:level.preservedMoveTarget,timeStar:86},
  timeValidated:false,pointerReplayValidated:false,formalAdoptionValidated:false,formalLevelSemanticMatch:true,bindings,drift,
  lock:{exitCode:lock.status,summary:lock.stdout.split(/\r?\n/)[0]}};
fs.writeFileSync(outputPath,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({outputPath,status:report.status,minimum:12,totalDrags:34,H3:H3.length,S:S.length,
  quotient:quotient.status,mask:mask.status,candidateRawSha256:report.candidateRawSha256}));
