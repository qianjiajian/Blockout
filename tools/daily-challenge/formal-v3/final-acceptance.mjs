import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {expectedDailySlots} from '../formal-v2/catalog-progress.mjs';
import {loadV3CatalogRuntime,auditV3Catalog,CATALOG_VERSION} from './catalog-contract.mjs';
import {requireCompleteCatalog,fileSha256} from './emit-catalog.mjs';
import {loadProductionDailyApi,assertRegistryBinding} from './verify-runtime.mjs';

export const VIEWPORTS=Object.freeze(['320x568','496x1078']);
export const POINTER_FILES=Object.freeze(['tools/daily-challenge/formal-v3/pointer.mjs','tools/daily-challenge/formal-v3/pointer-browser.mjs','tools/daily-challenge/formal-v3/pointer.html']);
const hashOK=x=>typeof x==='string'&&/^[a-f0-9]{64}$/.test(x);
const same=(a,b)=>levelSha256(a)===levelSha256(b);
const normalized=file=>file.replaceAll('\\','/');
const positive=value=>Number.isFinite(value)&&value>0;

export function validateFinalPointerEvidence(report,receipt,row,runtimeReport){
  const key=`${row.formalId}:${row.viewport}`;
  if(receipt?.schemaVersion!==3||receipt.catalogVersion!==CATALOG_VERSION||!receipt.accepted
    ||levelSha256(receipt.level)!==receipt.levelSha256||routeSha256(receipt.drags)!==receipt.routeSha256
    ||report.formalId!==row.formalId||report.levelSha256!==receipt.levelSha256||report.routeSha256!==receipt.routeSha256)
    throw Error(`Pointer receipt binding mismatch ${key}`);
  if(report.schemaVersion!==3||report.status!=='FORMAL_POINTER_NATURAL_TIME_PASS'||report.formalRegistryIdentity!==true||report.candidateInjection!==false
    ||report.pointerValidated!==true||report.timeValidated!==true||report.naturalClock!==true||report.clockMocked!==false||report.playerSaveTouched!==false
    ||!Array.isArray(report.errors)||report.errors.length||!Array.isArray(report.storageViolations)||report.storageViolations.length)
    throw Error(`Incomplete formal Pointer evidence ${key}`);
  const binding=receipt.runtimeBinding,assignment=report.assignment;
  if(!runtimeReport.catalogRevision||binding?.formalRegistryIdentity!==true||binding.runtimeSchemaVersion!==2||binding.proofReceiptSchemaVersion!==3
    ||binding.catalogRevision!==runtimeReport.catalogRevision||!same(binding.bindings,runtimeReport.bindings))throw Error(`Runtime receipt binding mismatch ${key}`);
  for(const [field,value]of Object.entries({id:receipt.formalId,sourceLevelId:receipt.sourceLevelId,layoutSha256:receipt.levelSha256,
    routeSha256:receipt.routeSha256,catalogRevision:runtimeReport.catalogRevision}))
    if(assignment?.[field]!==value||binding.assignment?.[field]!==value)throw Error(`Formal assignment ${field} mismatch ${key}`);
  if(!same(assignment,binding.assignment)||assignment.proofReport!==binding.previousReceipt
    ||assignment.proofReportSha256!==binding.previousReceiptSha256||!same(assignment.v3Evidence,binding.productionV3Evidence)
    ||assignment.v3Evidence?.receiptSchemaVersion!==3||assignment.v3Evidence.catalogVersion!==CATALOG_VERSION)
    throw Error(`Formal assignment quality binding mismatch ${key}`);
  if(!hashOK(row.receiptSha256)||report.files?.[normalized(row.file)]!==row.receiptSha256
    ||report.files?.[normalized(assignment.proofReport)]!==assignment.proofReportSha256)throw Error(`Pointer input receipt is not bound ${key}`);
  for(const file of [...POINTER_FILES,'src/core/dailyChallenge.ts','src/core/formalDailyChallengeData.ts','src/core/PuzzleModel.ts','src/game/ColorEscapeGame.ts'])
    if(!hashOK(report.files?.[file]))throw Error(`Missing Pointer implementation binding ${file}`);
  if(!VIEWPORTS.includes(row.viewport)||`${report.viewport?.width}x${report.viewport?.height}`!==row.viewport)throw Error(`Viewport mismatch ${key}`);
  if(report.U!==receipt.U||!Array.isArray(report.actions)||report.actions.length!==receipt.drags.length||report.totalDrags!==receipt.drags.length)
    throw Error(`Route counters differ ${key}`);
  const probe=report.naturalClockProbe;
  if(!probe||!positive(probe.beforeClock)||!positive(probe.afterClock)||probe.beforeClock>receipt.level.timeSeconds||probe.afterClock>=probe.beforeClock)
    throw Error(`Natural clock probe did not advance ${key}`);
  const trace=receipt.route?.independentReplay?.trace;
  if(!Array.isArray(trace)||trace.length!==report.actions.length)throw Error(`Missing authoritative action trace ${key}`);
  let previousSeconds=probe.afterClock,nonclearing=0,cleared=0;
  for(const [index,action]of report.actions.entries()){
    const expected=trace[index],drag=receipt.drags[index];
    if(action.index!==index||action.blockId!==drag.blockId||action.blockId!==expected.blockId||expected.index!==index
      ||!Number.isSafeInteger(action.clearDelta)||action.clearDelta<0||action.clearDelta!==expected.clearDelta
      ||action.moves!==index+1||action.moves!==expected.moves)throw Error(`Pointer action trace mismatch ${key}:${index}`);
    if(!positive(action.remainingSeconds)||action.remainingSeconds>previousSeconds)throw Error(`Pointer action clock mismatch ${key}:${index}`);
    previousSeconds=action.remainingSeconds;cleared+=action.clearDelta;if(action.clearDelta===0)nonclearing++;
  }
  if(nonclearing!==report.U||cleared!==receipt.route.independentReplay.clearEvents)throw Error(`Recomputed move/clear counters differ ${key}`);
  if(report.finalPuzzle?.complete!==true||report.finalPuzzle.failed!==false||report.finalPuzzle.blocks!==0||report.finalPuzzle.queuedBlocks!==0
    ||report.finalPuzzle.moves!==report.totalDrags||!positive(report.finalPuzzle.remainingSeconds)||report.finalPuzzle.remainingSeconds>previousSeconds)
    throw Error(`Natural route incomplete ${key}`);
  if(!positive(report.wallSeconds)||!positive(report.playableSeconds)
    ||Math.abs(report.playableSeconds-(probe.beforeClock-report.finalPuzzle.remainingSeconds))>0.00001)throw Error(`Natural elapsed time accounting mismatch ${key}`);
  const baseline=report.entryBaseline,settlement=report.settlement,reward={1:{coins:50,inspiration:20},2:{coins:100,inspiration:50},3:{coins:200,inspiration:100}}[receipt.difficulty];
  if(!baseline||!Number.isSafeInteger(baseline.coins)||!Number.isSafeInteger(baseline.inspiration)
    ||settlement?.coins-baseline.coins!==reward.coins||settlement?.inspiration-baseline.inspiration!==reward.inspiration
    ||!same(settlement?.win,{difficulty:receipt.difficulty,...reward}))throw Error(`Actual daily reward settlement mismatch ${key}`);
  for(const field of ['currentLevel','highestLevel','bestStars','bestMoves','rewardedLevels'])
    if(baseline[field]===undefined||!same(settlement[field],baseline[field]))throw Error(`Daily settlement changed campaign ${field} ${key}`);
  if(settlement.daily?.completed?.[receipt.difficulty]!==true||settlement.daily?.rewarded?.[receipt.difficulty]!==true
    ||settlement.daily.attemptsRemaining!==4||settlement.daily.catalogRevision!==runtimeReport.catalogRevision
    ||settlement.daily.stageKey!==receipt.stageKey||settlement.activeRun!==undefined&&settlement.activeRun!==null)
    throw Error(`Daily completion/session settlement missing ${key}`);
  if(!positive(report.drawAudit?.calls)||report.drawAudit.rotated!==0||report.drawAudit.canvasRotationCalls!==0)throw Error(`Original-orientation drawing failed ${key}`);
  for(const name of ['opening','complete']){
    if(!report.screenshots?.[name]?.path||!hashOK(report.screenshots[name].sha256))throw Error(`Unbound ${name} screenshot ${key}`);
    if(typeof row.report!=='string'||path.resolve(report.screenshots[name].path)!==path.resolve(path.dirname(row.report),`${name}.png`))
      throw Error(`Screenshot is not from this actual run ${key}`);
  }
  if(report.screenshots.opening.path===report.screenshots.complete.path||report.screenshots.opening.sha256===report.screenshots.complete.sha256)
    throw Error(`Opening and completion screenshots are not distinct ${key}`);
  return true;
}

export function validatePointerBatch(batch,expected){
  if(batch?.schemaVersion!==3||batch.status!=='FORMAL_V3_POINTER_BATCH_COMPLETE'||batch.bindingFailure||batch.scope!==450||batch.requested!==900||batch.rows?.length!==900||batch.failed!==0||batch.passed!==900
    ||batch.playerSaveTouched!==false||batch.naturalClock!==true||!same(batch.viewports,VIEWPORTS))throw Error('All 450 formal slots on both viewports must pass');
  const wanted=new Set(expected.flatMap(slot=>VIEWPORTS.map(view=>`${slot.formalId}:${view}`)));
  for(const row of batch.rows){
    if(!wanted.delete(`${row.formalId}:${row.viewport}`)||row.status!=='FORMAL_POINTER_NATURAL_TIME_PASS'||row.code!==0||row.signal!==null
      ||!hashOK(row.reportSha256)||!hashOK(row.receiptSha256))throw Error('Duplicate, unexpected or failed Pointer batch row');
  }
  if(wanted.size)throw Error('Missing formal viewport runs');
}

/** Shape only. File bytes and image hashes are checked separately by the final
 * writer. Each review is an actual inspected sheet, not an inferred PASS from
 * solver results or a substitute for any of the 900 production runs. */
export function validateVisualReview(visual,receipts,pointerRows,catalogRevision){
  if(visual?.schemaVersion!==3||visual.scope!==450||visual.catalogRevision!==catalogRevision||visual.overviewViewport!=='496x1078'
    ||visual.status!=='FULL_V3_CONTACT_SHEETS_REVIEWED'||visual.groups?.length!==45)throw Error('All 45 contact sheets require actual review');
  const expectedGroups=new Set([...receipts.values()].map(r=>`${r.stageKey}:${r.difficulty}`)),seen=new Set(),sheets=new Set();
  for(const group of visual.groups){
    if(!expectedGroups.delete(`${group.stageKey}:${group.difficulty}`)||group.items?.length!==10||!group.contactSheet?.path
      ||!hashOK(group.contactSheet.sha256)||sheets.has(group.contactSheet.sha256))throw Error('Missing, duplicate or malformed contact sheet');
    sheets.add(group.contactSheet.sha256);const review=group.review;
    if(review?.method!=='actual-image-inspection'||typeof review.reviewer!=='string'||!review.reviewer.trim()
      ||!Number.isFinite(Date.parse(review.reviewedAt))||review.conclusion!=='PASS'||!Array.isArray(review.findings)||review.findings.length
      ||!Array.isArray(review.observations)||!review.observations.length||review.observations.some(note=>typeof note!=='string'||!note.trim()))
      throw Error('Contact sheet lacks a complete actual visual review');
    for(const item of group.items){
      const receipt=receipts.get(item.formalId),pointer=pointerRows.get(`${item.formalId}:${visual.overviewViewport}`);
      if(!receipt||seen.has(item.formalId)||receipt.stageKey!==group.stageKey||receipt.difficulty!==group.difficulty
        ||item.levelSha256!==receipt.levelSha256||!same(item.opening,pointer?.screenshots.opening))throw Error('Contact sheet uses a missing, stale or wrong opening image');
      seen.add(item.formalId);
    }
  }
  if(expectedGroups.size||seen.size!==450)throw Error('Incomplete visual coverage');return true;
}

export async function assertCurrentBindings(bindings){
  if(!bindings||!Object.keys(bindings).length)throw Error('Missing implementation bindings');
  for(const [file,hash]of Object.entries(bindings))if(!hashOK(hash)||fileSha256(await fs.readFile(file))!==hash)throw Error(`Stale verification input ${file}`);
}
export async function validateScreenshotFiles(report){
  for(const image of Object.values(report.screenshots)){
    const bytes=await fs.readFile(image.path);
    if(fileSha256(bytes)!==image.sha256||bytes.length<24||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'
      ||bytes.readUInt32BE(16)!==report.viewport.width||bytes.readUInt32BE(20)!==report.viewport.height)
      throw Error('Actual screenshot bytes, PNG format or viewport size mismatch');
  }
}
export async function currentPointerBindings(){
  const bindings={};const visit=async dir=>{for(const entry of await fs.readdir(dir,{withFileTypes:true})){
    const file=normalized(path.join(dir,entry.name));if(entry.isDirectory())await visit(file);else bindings[file]=fileSha256(await fs.readFile(file));
  }};await visit('src');for(const file of POINTER_FILES)bindings[file]=fileSha256(await fs.readFile(file));return bindings;
}

export async function loadVerifiedRuntimeDataset(directory){
  const reportFile=`${directory}/report.json`,indexFile=`${directory}/index.json`;
  const reportBytes=await fs.readFile(reportFile),indexBytes=await fs.readFile(indexFile),report=JSON.parse(reportBytes),index=JSON.parse(indexBytes);
  if(report.schemaVersion!==3||report.catalogVersion!==CATALOG_VERSION||report.status!=='FORMAL_V3_RUNTIME_VERIFIED_AWAITING_POINTER_TIME'
    ||report.scope!==450||report.sourceRegistryUnchanged!==true||index.scope!==450||index.files?.length!==450||new Set(index.files).size!==450)
    throw Error('A complete actual v3 production runtime dataset is required');
  const runtime=await loadV3CatalogRuntime(),expected=expectedDailySlots(runtime.MECHANISM_GUIDE),{api,bindings:productionBindings}=await loadProductionDailyApi();
  if(report.ruleVersion!==runtime.boundedRuleVersion||api.FORMAL_DAILY_CHALLENGE_SCHEMA_VERSION!==2
    ||report.catalogRevision!==api.FORMAL_DAILY_CHALLENGE_REVISION||levelSha256(api.FORMAL_DAILY_CHALLENGE_CATALOG)!==report.catalogRevision)
    throw Error('Runtime dataset is not the current formal catalogue');
  const expectedBindings={...runtime.toolchainBindings,...runtime.designBindings,...productionBindings};
  for(const file of ['tools/daily-challenge/formal-v3/verify-runtime.mjs','tools/daily-challenge/formal-v3/emit-catalog.mjs','tools/daily-challenge/formal-v2/emit-catalog.mjs'])
    expectedBindings[file]=fileSha256(await fs.readFile(file));
  if(!same(expectedBindings,report.bindings))throw Error('Runtime verification omits or changes a required implementation binding');
  await assertCurrentBindings(report.bindings);
  const entries=new Map(),receipts=new Map();
  for(const file of index.files){const bytes=await fs.readFile(file),receipt=JSON.parse(bytes);
    if(receipts.has(receipt.formalId))throw Error('Duplicate runtime receipt');receipts.set(receipt.formalId,receipt);entries.set(receipt.formalId,{file:normalized(file),receiptSha256:fileSha256(bytes),receipt});}
  for(const slot of expected){
    const receipt=receipts.get(slot.formalId),candidate=api.getFormalDailyChallengeCandidate(slot.formalId);if(!receipt||!candidate)throw Error('Missing actual production slot');
    const priorBytes=await fs.readFile(candidate.proofReport),prior=JSON.parse(priorBytes);assertRegistryBinding(runtime,slot,candidate,prior,fileSha256(priorBytes));
    const state=api.createDailyChallengeState('2026-10-08',slot.unlockLevel,api.LEVELS,11993);state.selected[slot.difficulty]=slot.slot-1;
    const assignment=api.getDailyChallengeAssignment(state,slot.difficulty),level=assignment&&api.cloneDailyChallengeLevel(assignment),binding=receipt.runtimeBinding;
    if(!level||levelSha256(level)!==receipt.levelSha256||binding?.formalRegistryIdentity!==true||binding.runtimeSchemaVersion!==2||binding.proofReceiptSchemaVersion!==3
      ||!same(assignment,binding.assignment)||!same(binding.bindings,report.bindings)
      ||binding.previousReceipt!==candidate.proofReport||binding.previousReceiptSha256!==fileSha256(priorBytes)
      ||binding.sourceRegistrySha256!==levelSha256(api.LEVELS)||!same(binding.productionV3Evidence,candidate.v3Evidence))throw Error('Fresh dataset is detached from actual production cloning');
  }
  const audit=await auditV3Catalog(runtime,[...receipts.values()],{expectFull:true});requireCompleteCatalog(audit,expected);
  return{runtime,expected,report,reportFile,reportSha256:fileSha256(reportBytes),indexFile,indexSha256:fileSha256(indexBytes),entries,receipts,audit};
}

export async function finalAcceptance(runtimeDirectory,pointerDirectory,visualFile,output){
  const dataset=await loadVerifiedRuntimeDataset(runtimeDirectory),{runtime,expected,receipts,report:runtimeReport}=dataset;
  const batchFile=`${pointerDirectory}/report.json`,batchBytes=await fs.readFile(batchFile),batch=JSON.parse(batchBytes);
  validatePointerBatch(batch,expected);
  if(batch.catalogRevision!==runtimeReport.catalogRevision||batch.runtimeReportSha256!==dataset.reportSha256||batch.runtimeIndexSha256!==dataset.indexSha256)
    throw Error('Pointer batch is detached from final runtime dataset');
  const pointerBindings=await currentPointerBindings();if(!same(batch.pointerBindings,pointerBindings))throw Error('Pointer batch implementation is stale or incomplete');
  if(batch.batchToolSha256!==fileSha256(await fs.readFile('tools/daily-challenge/formal-v3/pointer-batch.mjs')))throw Error('Pointer batch driver changed');
  const inputs={[dataset.reportFile]:dataset.reportSha256,[dataset.indexFile]:dataset.indexSha256,[batchFile]:fileSha256(batchBytes)},rows=[],pointerRows=new Map();
  const checkFile=async(file,hash)=>{if(!hashOK(hash))throw Error('Missing file hash');const actual=fileSha256(await fs.readFile(file));if(actual!==hash)throw Error(`Evidence file changed ${file}`);inputs[file]=hash;};
  for(const row of batch.rows){
    const key=`${row.formalId}:${row.viewport}`,entry=dataset.entries.get(row.formalId);
    if(row.file!==entry.file||row.receiptSha256!==entry.receiptSha256)throw Error(`Pointer input is not the final fresh runtime receipt ${key}`);
    const bytes=await fs.readFile(row.report),report=JSON.parse(bytes);if(fileSha256(bytes)!==row.reportSha256)throw Error('Pointer report bytes changed');
    inputs[row.report]=row.reportSha256;inputs[entry.file]=entry.receiptSha256;
    validateFinalPointerEvidence(report,entry.receipt,row,runtimeReport);
    await validateScreenshotFiles(report);
    for(const [file,hash]of Object.entries(pointerBindings))if(report.files?.[file]!==hash)throw Error(`Missing/stale actual Pointer implementation ${file}`);
    for(const [file,hash]of Object.entries(report.files))if(inputs[file]!==hash)await checkFile(file,hash);
    for(const image of Object.values(report.screenshots))await checkFile(image.path,image.sha256);
    pointerRows.set(key,report);rows.push({formalId:row.formalId,viewport:row.viewport,report:row.report,reportSha256:row.reportSha256,
      levelSha256:report.levelSha256,routeSha256:report.routeSha256,U:report.U,screenshots:report.screenshots});
  }
  const visualBytes=await fs.readFile(visualFile),visual=JSON.parse(visualBytes);validateVisualReview(visual,receipts,pointerRows,runtimeReport.catalogRevision);
  for(const group of visual.groups)await checkFile(group.contactSheet.path,group.contactSheet.sha256);inputs[visualFile]=fileSha256(visualBytes);
  for(const [file,hash]of Object.entries({...runtimeReport.bindings,...pointerBindings,...inputs}))await checkFile(file,hash);
  for(const file of ['tools/daily-challenge/formal-v3/final-acceptance.mjs','tools/daily-challenge/formal-v3/pointer-batch.mjs'])inputs[file]=fileSha256(await fs.readFile(file));
  const byDifficulty=Object.fromEntries([1,2,3].map(d=>{const group=[...receipts.values()].filter(r=>r.difficulty===d);
    return[d,{count:group.length,LMin:Math.min(...group.map(r=>r.L)),LMax:Math.max(...group.map(r=>r.L)),UMin:Math.min(...group.map(r=>r.U)),UMax:Math.max(...group.map(r=>r.U))}];}));
  const result={schemaVersion:3,catalogVersion:CATALOG_VERSION,status:'FORMAL_V3_450_COMPLETE',scope:450,formalReady:true,
    ruleVersion:runtime.boundedRuleVersion,catalogRevision:runtimeReport.catalogRevision,producedAt:new Date().toISOString(),byDifficulty,
    actualRuntimeObjectsVerified:450,pointerNaturalClockRuns:900,reviewedContactSheets:45,visualReviewedObjects:450,
    diversity:dataset.audit.diversity,proofToolchainSha256:runtime.toolchainSha256,designToolchainSha256:runtime.designToolchainSha256,
    playerSaveTouched:false,published:false,runtimeReport:dataset.reportFile,pointerBatchReport:batchFile,visualReview:visualFile,
    acceptanceInputs:inputs,acceptanceInputsSha256:levelSha256(inputs),rows};
  await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});return result;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const args=process.argv.slice(2);if(args.length!==4)throw Error('Usage: final-acceptance.mjs runtime-directory pointer-directory visual-review.json new-report.json');
  const result=await finalAcceptance(...args);console.log(JSON.stringify({status:result.status,scope:result.scope}));
}
