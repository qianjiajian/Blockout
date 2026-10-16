import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { loadRuntime, levelSha256, routeSha256, BANDS } from './contract.mjs';
import { auditIndependentLayouts } from './geometry.mjs';

const fileHash = bytes => createHash('sha256').update(bytes).digest('hex');
const slotId = (stage, difficulty, slot) => `daily-mechanisms-${stage.id}-${stage.unlockLevel}-d${difficulty}-${String(slot).padStart(2,'0')}`;

export const expectedDailySlots = guide => guide.flatMap(stage => [1,2,3].flatMap(difficulty =>
  Array.from({length:10}, (_,i) => ({ formalId:slotId(stage,difficulty,i+1),
    stageKey:`mechanisms-${stage.id}-${stage.unlockLevel}`, unlockLevel:stage.unlockLevel,
    newestMechanism:stage.id, difficulty, slot:i+1 }))));

/** Integrity inspection only. This does not manufacture a fresh proof or admit a level. */
export function inspectReceipt(report, source, expected) {
  const reasons = [], band = BANDS[expected.difficulty];
  if (!report?.level || !Array.isArray(report.drags)) return ['missing-level-or-route'];
  for (const key of ['formalId','stageKey','difficulty']) if (report[key] !== expected[key]) reasons.push(`slot-mismatch:${key}`);
  const actual = levelSha256(report.level);
  if (report.levelSha256 !== actual) reasons.push('level-hash-mismatch');
  if (!source || source.id !== report.sourceLevelId || levelSha256(source) !== report.sourceLevelSha256) reasons.push('source-hash-mismatch');
  if (report.routeSha256 !== routeSha256(report.drags)) reasons.push('route-hash-mismatch');
  if (!report.staticAudit?.passed || report.staticAudit.levelSha256 !== actual) reasons.push('static-audit-binding');
  if (report.accepted !== true || report.status !== 'SPATIAL_DIFFICULTY_VERIFIED_AWAITING_POINTER_TIME') reasons.push(`not-spatially-verified:${report.status}`);
  if (!Number.isSafeInteger(report.L) || !Number.isSafeInteger(report.U) || report.L < band.lower || report.L > report.U
    || (band.upper !== null && report.U > band.upper)) reasons.push('difficulty-band');
  const route = report.route;
  if (route?.inputLevelSha256 !== actual || route?.routeSha256 !== report.routeSha256) reasons.push('route-input-binding');
  for (const name of ['canonicalReplay','independentReplay']) {
    const replay = route?.[name];
    if (!replay?.valid || !replay.complete || replay.failed || replay.nonClearingDrags !== report.U) reasons.push(`incomplete-or-inconsistent:${name}`);
  }
  if (report.timeSchedule) {
    const scheduleHash=levelSha256(report.timeSchedule);
    if(report.timeScheduleSha256!==scheduleHash||route?.timeScheduleSha256!==scheduleHash)reasons.push('time-schedule-binding');
    for(const name of ['canonicalReplay','independentReplay'])if(!route?.[name]?.simulationTimeValidated)reasons.push(`schedule-not-replayed:${name}`);
  }
  const lower = report.lowerBound;
  if (lower?.inputLevelSha256 !== actual || lower?.requiredFloor !== band.lower || lower?.result?.status !== 'threshold-proven'
    || !lower.result.thresholdProven || lower.result.floor !== band.lower || lower.result.termination !== 'below-threshold-exhausted') reasons.push('lower-input-or-result-binding');
  if (!report.toolchainBindings || levelSha256(report.toolchainBindings) !== report.toolchainSha256
    || lower?.toolchainSha256 !== report.toolchainSha256) reasons.push('toolchain-binding');
  return reasons;
}

export async function catalogProgress(runtime, indexedFiles, root = process.cwd()) {
  const expected = expectedDailySlots(runtime.MECHANISM_GUIDE);
  if (expected.length !== 450) throw new Error(`Expected existing 15-stage/450-slot scope, got ${expected.length}`);
  const expectedById = new Map(expected.map(row => [row.formalId,row]));
  const byId = new Map(), rejectedIndex = [], fingerprints = new Map();
  const hashFile = async file => {
    if (!fingerprints.has(file)) fingerprints.set(file, await fs.readFile(path.resolve(root,file)).then(fileHash).catch(()=>null));
    return fingerprints.get(file);
  };
  for (const file of indexedFiles) {
    const report = JSON.parse(await fs.readFile(path.resolve(root,file),'utf8'));
    const slot = expectedById.get(report.formalId);
    if (!slot) { rejectedIndex.push({file,reason:'unrecognized-slot',formalId:report.formalId}); continue; }
    if (byId.has(report.formalId)) throw new Error(`Multiple candidate receipts selected for ${report.formalId}; choose one explicitly`);
    const source = runtime.LEVELS.find(level => level.id === report.sourceLevelId);
    const reasons = inspectReceipt(report,source,slot);
    const staleBindings = [];
    for (const [file,sha] of Object.entries(report.toolchainBindings ?? {})) if (await hashFile(file) !== sha) staleBindings.push(file);
    byId.set(report.formalId,{report,file,source,reasons,staleBindings});
  }
  const geometry = auditIndependentLayouts([...byId].filter(([,entry]) => entry.report.level).map(([formalId,entry]) =>
    ({formalId,level:entry.report.level,sourceLevel:entry.source})));
  const geometryById = new Map(geometry.rows.map(row=>[row.formalId,row]));
  const duplicateIds = new Set(geometry.duplicates.flatMap(group=>group.formalIds));
  const rows = expected.map(slot=>{
    const record=byId.get(slot.formalId);
    if(!record)return{...slot,status:'PENDING_CANDIDATE'};
    const {report,file,reasons,staleBindings}=record, spatial=geometryById.get(slot.formalId);
    if(!spatial?.retainsSourceBoard)reasons.push('source-board-baseline-changed');
    if(!spatial?.rearrangedSource)reasons.push('source-partition-not-rearranged');
    if(duplicateIds.has(slot.formalId))reasons.push('duplicate-partition-in-450');
    return{...slot,file,sourceLevelId:report.sourceLevelId,levelSha256:report.levelSha256,
      L:report.L,U:report.U,partitionSha256:spatial?.partitionSha256,
      status:reasons.length?'REJECTED_RECEIPT':staleBindings.length?'AWAITING_FRESH_TOOLCHAIN_REVALIDATION':'SPATIAL_VERIFIED_AWAITING_POINTER_TIME',
      reasons,staleBindings};
  });
  const counts=Object.fromEntries([...new Set(rows.map(row=>row.status))].map(status=>[status,rows.filter(row=>row.status===status).length]));
  return{schemaVersion:2,scope:450,producedAt:new Date().toISOString(),productionChanged:false,formalReady:false,
    notice:'Progress and integrity only. Final admission requires fresh validation of the actual runtime objects and Pointer/time evidence.',
    counts,rows,rejectedIndex,geometryDuplicates:geometry.duplicates};
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [indexFile,output] = process.argv.slice(2);
  if(!indexFile||!output)throw new Error('Usage: node catalog-progress.mjs <index.json: {files: string[]}> <new-report.json>');
  const index=JSON.parse(await fs.readFile(indexFile,'utf8'));
  if(!Array.isArray(index.files))throw new Error('Index must explicitly select one evidence file per slot');
  const report=await catalogProgress(await loadRuntime(),index.files);
  await fs.mkdir(path.dirname(output),{recursive:true});
  await fs.writeFile(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({scope:report.scope,counts:report.counts,duplicates:report.geometryDuplicates.length,formalReady:report.formalReady}));
}
