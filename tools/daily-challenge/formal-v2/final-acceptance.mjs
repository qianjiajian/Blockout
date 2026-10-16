import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { loadRuntime, levelSha256 } from './contract.mjs';
import { catalogProgress, expectedDailySlots } from './catalog-progress.mjs';
import { requireCompleteCatalog } from './emit-catalog.mjs';
import { verifyRulesLock } from '../../verify-rules-lock.mjs';

/** Pure aggregation check. Never runs a puzzle or writes an acceptance report. */
export function validateFinalPointerEvidence(report,receipt,row,runtimeReport) {
  const key=`${row.formalId}:${row.viewport}`;
  if(!receipt||report.formalId!==row.formalId||report.levelSha256!==receipt.levelSha256||report.routeSha256!==receipt.routeSha256)throw Error(`Pointer receipt binding mismatch ${key}`);
  if(report.schemaVersion!==2||report.status!=='FORMAL_POINTER_NATURAL_TIME_PASS'||report.formalRegistryIdentity!==true||report.candidateInjection!==false
    ||report.pointerValidated!==true||report.timeValidated!==true||report.naturalClock!==true||report.clockMocked!==false||report.playerSaveTouched!==false
    ||!Array.isArray(report.errors)||report.errors.length||!Array.isArray(report.storageViolations)||report.storageViolations.length)throw Error(`Incomplete formal Pointer evidence ${key}`);
  const binding=receipt.runtimeBinding,assignment=report.assignment;
  if(!runtimeReport.catalogRevision||binding?.formalRegistryIdentity!==true||binding.catalogRevision!==runtimeReport.catalogRevision
    ||!binding.bindings||levelSha256(binding.bindings)!==levelSha256(runtimeReport.bindings))throw Error(`Runtime receipt binding mismatch ${key}`);
  const expectedAssignment={id:receipt.formalId,sourceLevelId:receipt.sourceLevelId,layoutSha256:receipt.levelSha256,
    routeSha256:receipt.routeSha256,catalogRevision:runtimeReport.catalogRevision};
  for(const [field,value]of Object.entries(expectedAssignment))if(assignment?.[field]!==value||binding.assignment?.[field]!==value)throw Error(`Formal assignment ${field} mismatch ${key}`);
  if(levelSha256(assignment)!==levelSha256(binding.assignment)||assignment.proofReport!==binding.previousReceipt
    ||report.files?.[assignment.proofReport]!==assignment.proofReportSha256)throw Error(`Formal assignment evidence mismatch ${key}`);
  for(const file of ['src/core/dailyChallenge.ts','src/core/formalDailyChallengeData.ts','src/core/PuzzleModel.ts','src/game/ColorEscapeGame.ts',
    'tools/daily-challenge/formal-v2/pointer.mjs','tools/daily-challenge/formal-v2/pointer-browser.mjs','tools/daily-challenge/formal-v2/pointer.html']){
    if(typeof report.files?.[file]!=='string'||!/^[a-f0-9]{64}$/.test(report.files[file]))throw Error(`Missing Pointer implementation binding ${file} ${key}`);
  }
  if(report.viewport?.width!==Number(row.viewport.split('x')[0])||report.viewport?.height!==Number(row.viewport.split('x')[1]))throw Error(`Viewport mismatch ${key}`);
  if(report.U!==receipt.U||!Array.isArray(report.actions)||report.actions.length!==receipt.drags.length||report.totalDrags!==receipt.drags.length)throw Error(`Route counters differ ${key}`);
  const probe=report.naturalClockProbe,positive=value=>Number.isFinite(value)&&value>0;
  if(!probe||!positive(probe.beforeClock)||!positive(probe.afterClock)||probe.beforeClock>receipt.level.timeSeconds
    ||probe.afterClock>=probe.beforeClock)throw Error(`Natural clock probe did not advance ${key}`);
  const trace=receipt.route?.independentReplay?.trace;
  if(!Array.isArray(trace)||trace.length!==report.actions.length)throw Error(`Missing authoritative action trace ${key}`);
  let previousSeconds=probe.afterClock,nonclearing=0;
  for(const [index,action]of report.actions.entries()){
    const expected=trace[index],drag=receipt.drags[index];
    if(action.index!==index||action.blockId!==drag.blockId||action.blockId!==expected.blockId||expected.index!==index
      ||!Number.isSafeInteger(action.clearDelta)||action.clearDelta<0||action.clearDelta!==expected.clearDelta
      ||action.moves!==index+1||action.moves!==expected.moves)throw Error(`Pointer action trace mismatch ${key} at ${index}`);
    if(!positive(action.remainingSeconds)||action.remainingSeconds>previousSeconds)throw Error(`Pointer action clock mismatch ${key} at ${index}`);
    previousSeconds=action.remainingSeconds;if(action.clearDelta===0)nonclearing++;
  }
  if(nonclearing!==report.U)throw Error(`Recomputed nonclearing drags differ ${key}`);
  if(report.finalPuzzle?.complete!==true||report.finalPuzzle.failed!==false||report.finalPuzzle.blocks!==0||report.finalPuzzle.queuedBlocks!==0
    ||report.finalPuzzle.moves!==report.totalDrags||!positive(report.finalPuzzle.remainingSeconds)||report.finalPuzzle.remainingSeconds>previousSeconds)throw Error(`Natural route incomplete ${key}`);
  if(report.settlement?.daily?.completed[receipt.difficulty]!==true||report.settlement.daily.attemptsRemaining!==4)throw Error(`Daily settlement missing ${key}`);
  if(!Number.isFinite(report.drawAudit?.calls)||report.drawAudit.calls<1||report.drawAudit.rotated!==0||report.drawAudit.canvasRotationCalls!==0)throw Error(`Original-orientation drawing failed ${key}`);
  return true;
}

export async function finalAcceptance(runtimeDirectory,pointerDirectory,output) {
if(!runtimeDirectory||!pointerDirectory||!output)throw Error('Usage: final-acceptance.mjs runtime-evidence-directory full-pointer-directory new-report.json');
const lock=verifyRulesLock();if(!lock.ok)throw Error('Rule lock failed');
const runtime=await loadRuntime(),index=JSON.parse(await fs.readFile(`${runtimeDirectory}/index.json`,'utf8'));
const runtimeReport=JSON.parse(await fs.readFile(`${runtimeDirectory}/report.json`,'utf8'));
if(runtimeReport.status!=='FORMAL_SPATIAL_RUNTIME_VERIFIED_AWAITING_POINTER_TIME'||runtimeReport.scope!==450
  ||runtimeReport.ruleVersion!==lock.activeVersion||runtimeReport.sourceRegistryUnchanged!==true)throw Error('Formal runtime verification is incomplete');
const progress=await catalogProgress(runtime,index.files);requireCompleteCatalog(progress);
const sha=bytes=>createHash('sha256').update(bytes).digest('hex'),hashes=new Map();
async function assertBindings(bindings){
  if(!bindings||!Object.keys(bindings).length)throw Error('Missing implementation bindings');
  for(const [file,expected]of Object.entries(bindings)){
    if(!hashes.has(file))hashes.set(file,sha(await fs.readFile(file)));
    if(hashes.get(file)!==expected)throw Error(`Stale verification input ${file}`);
  }
}
await assertBindings(runtimeReport.bindings);
const receipts=new Map();for(const file of index.files){const r=JSON.parse(await fs.readFile(file,'utf8'));receipts.set(r.formalId,r);}
const batch=JSON.parse(await fs.readFile(`${pointerDirectory}/report.json`,'utf8'));
const expected=expectedDailySlots(runtime.MECHANISM_GUIDE),views=['320x568','496x1078'];
const wanted=new Set(expected.flatMap(slot=>views.map(view=>`${slot.formalId}:${view}`))),rows=[];
if(batch.requested!==900||batch.rows?.length!==900||batch.failed!==0||batch.passed!==900)throw Error('All 450 slots on both viewports must pass');
for(const row of batch.rows){
  const key=`${row.formalId}:${row.viewport}`;if(!wanted.delete(key))throw Error(`Duplicate/unexpected Pointer row ${key}`);
  const bytes=await fs.readFile(row.report),report=JSON.parse(bytes),receipt=receipts.get(row.formalId);
  validateFinalPointerEvidence(report,receipt,row,runtimeReport);
  await assertBindings(report.files);
  rows.push({formalId:row.formalId,viewport:row.viewport,report:row.report,reportSha256:sha(bytes),levelSha256:report.levelSha256,routeSha256:report.routeSha256,U:report.U});
}
if(wanted.size)throw Error('Missing formal viewport runs');
const byDifficulty=Object.fromEntries([1,2,3].map(difficulty=>{
  const group=[...receipts.values()].filter(r=>r.difficulty===difficulty);
  return[difficulty,{count:group.length,lowerBoundMin:Math.min(...group.map(r=>r.L)),lowerBoundMax:Math.max(...group.map(r=>r.L)),
    completeRouteUMin:Math.min(...group.map(r=>r.U)),completeRouteUMax:Math.max(...group.map(r=>r.U))}];
}));
const report={schemaVersion:2,status:'FORMAL_450_COMPLETE',formalReady:true,scope:450,ruleVersion:lock.activeVersion,
  catalogRevision:runtimeReport.catalogRevision,producedAt:new Date().toISOString(),byDifficulty,
  independentLayouts:450,geometryDuplicates:0,actualRuntimeObjectsVerified:450,pointerNaturalClockRuns:900,
  playerSaveTouched:false,published:false,proofToolchainSha256:runtime.toolchainSha256,
  runtimeReport:`${runtimeDirectory}/report.json`,pointerBatchReport:`${pointerDirectory}/report.json`,
  acceptanceInputsSha256:levelSha256(Object.fromEntries(hashes)),rows};
await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,byDifficulty}));
return report;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  await finalAcceptance(...process.argv.slice(2));
}
