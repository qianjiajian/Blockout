import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadRuntime,levelSha256} from '../formal-v2/contract.mjs';
import {FROZEN_BOUNDED_FILES,FROZEN_MATH_SHA} from './runtime.mjs';

// Read-only change-scope review, explicitly not a new math closure approval.
const beforePath='deliverables/wechat-performance-fix-20261008/ColorEscapeGame.before.ts';
const currentPath='src/game/ColorEscapeGame.ts';
const oldReceipt='deliverables/daily-formal-v4-20261008/proof/prefix-tail-independent-v1/report.json';
const out=process.env.CLOCK_DIFF_AUDIT_OUT??'deliverables/daily-formal-v4-20261008/proof/scroll-clock-diff-independent-01';
const hash=b=>createHash('sha256').update(b).digest('hex');
const [oldBytes,newBytes,oldEvidence]=await Promise.all([fs.readFile(beforePath),fs.readFile(currentPath),fs.readFile(oldReceipt)]);
assert.equal(hash(oldBytes),'2a59877eab3b89e5d599d34eacf7dcf797b588be29cdd49b9832ac0ec691b90a');
const oldLines=oldBytes.toString().split('\n'),newLines=newBytes.toString().split('\n');
assert.equal(oldLines.length,newLines.length);
const differences=oldLines.flatMap((line,i)=>line===newLines[i]?[]:[{line:i+1,before:line.trim(),after:newLines[i].trim()}]);
assert.equal(differences.length,5);
for(const difference of differences){
 const {before,after}=difference;
 const direct=before.replace('typeof performance !== "undefined" ? performance.now() : Date.now()','monotonicGameTime()');
 const league=before.replace('performance.now()','monotonicGameTime()');
 assert(after===direct||after===league,'Unexpected change beyond timestamp acquisition');
}
assert.deepEqual(differences.map(x=>x.line),[8550,8592,9520,10427,10617]);
const domains=['beginJourneyScroll: levels-screen scroll start','updateJourneyScroll: levels-screen scroll velocity',
 'handleDown: league-screen list gesture start','handleMove: active league list gesture sample','handleUp: active league list gesture release'];
differences.forEach((x,i)=>x.behavior=domains[i]);
const extractIngest=s=>s.match(/const GATE_EXIT_INGEST_DURATION = (\d+(?:\.\d+)?);/)?.[1];
assert(extractIngest(oldBytes.toString()));assert.equal(extractIngest(oldBytes.toString()),extractIngest(newBytes.toString()));
const runtime=await loadRuntime(),currentBindings={...runtime.toolchainBindings,...FROZEN_BOUNDED_FILES};
const oldBindings=JSON.parse(oldEvidence).evidence[0].report.toolchainBindings;
assert.equal(levelSha256(oldBindings),FROZEN_MATH_SHA);
const changedBindings=[...new Set([...Object.keys(currentBindings),...Object.keys(oldBindings)])]
 .filter(file=>currentBindings[file]!==oldBindings[file]).map(file=>({path:file,before:oldBindings[file],after:currentBindings[file]}));
assert.deepEqual(changedBindings.map(x=>x.path),[currentPath]);
const supporting=['src/game/playableClockSlices.ts','src/game/leagueScroll.ts','tools/daily-challenge/formal-v2/contract.mjs',
 'tools/daily-challenge/formal-v4/runtime.mjs','tools/daily-challenge/formal-v4/audit-scroll-clock-diff-independent.mjs'];
const report={status:'READ_ONLY_FIVE_SCROLL_TIMESTAMP_CHANGES_REVIEWED',before:{path:beforePath,sha256:hash(oldBytes)},
 current:{path:currentPath,sha256:hash(newBytes)},differences,changedMathClosureBindings:changedBindings,
 oldMathClosureSha256:FROZEN_MATH_SHA,currentMathClosureSha256:levelSha256(currentBindings),
 gateExitIngestSeconds:Number(extractIngest(newBytes.toString())),actualLoadedAnimationTiming:runtime.animationTiming,
 observations:[
  'All five replacements acquire timestamps for campaign-level-list or league-list scroll gestures. No block path, exit condition, move cost, inventory or PuzzleModel mutation line changed.',
  'The current monotonicGameTime helper only returns performance.now when callable, otherwise Date.now. It neither samples nor resets PlayableClockSlices.',
  'LeagueScroll.move/end return false without a matching active list gesture; the new timestamp expression does not itself mutate a puzzle or its clock.',
  'The frozen loader bundles PuzzleModel/revised replay/continuous-exit APIs separately. ColorEscapeGame is read for the unchanged gate-ingest constant and conservatively full-file hashed.',
  'All other frozen closure file hashes match the prior tested receipt, including the actual move/exit/replay code. This is change-scope evidence, not acceptance of the current different closure.'
 ],currentClosureFrozenCompatibility:false,snapshotQualificationNeeded:true,currentUiPointerVerificationSeparate:true,
 solverCalls:0,publicLedgerWrites:0,sourceChangedByAudit:false,formalReady:false,
 bindings:Object.fromEntries(await Promise.all(supporting.map(async file=>[file,hash(await fs.readFile(file))])))};
assert.equal(hash(await fs.readFile(beforePath)),report.before.sha256);assert.equal(hash(await fs.readFile(currentPath)),report.current.sha256);
await fs.mkdir(out,{recursive:false});await fs.writeFile(`${out}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({path:`${out}/report.json`,sha256:hash(await fs.readFile(`${out}/report.json`)),status:report.status,diffCount:differences.length,solverCalls:0}));
