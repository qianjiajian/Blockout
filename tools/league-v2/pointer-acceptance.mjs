import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {isDeepStrictEqual} from 'node:util';
import {levelSha256, routeSha256, RULE_VERSION} from './proof-contract.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';

export const POINTER_ACCEPTANCE_VERSION = 'league-v2-pointer-acceptance-1';
export const REQUIRED_VIEWPORTS = Object.freeze(['320x568', '496x1078']);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DRIVER_FILES = ['tools/league-v2/pointer.mjs', 'tools/league-v2/pointer-browser.mjs', 'tools/league-v2/pointer.html'];
const sha = data => createHash('sha256').update(data).digest('hex');
const validSha = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const count = value => Number.isSafeInteger(value) && value >= 0;
const positive = value => Number.isFinite(value) && value > 0;
const approx = (a,b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) < 0.000001;
const withoutLeague = save => Object.fromEntries(Object.entries(save).filter(([key]) => key !== 'league'));
const error = (errors, condition, message) => { if (!condition) errors.push(message); };
const normalizedPath = file => file.replaceAll('\\', '/');

/** Validate observations rather than trusting the driver's PASS booleans. This
 * is only the Pointer/time/transaction gate, never the model/design gate. */
export function inspectPointerReport(report, proof, {index, viewport, identity = 'formal'} = {}) {
  const errors = [];
  if (!['candidate','formal'].includes(identity) || !REQUIRED_VIEWPORTS.includes(viewport)) return {passed:false, errors:['invalid-requested-identity-or-viewport']};
  if (!report || !proof?.level || !Array.isArray(proof.drags) || !Array.isArray(proof.specials)) return {passed:false, errors:['missing-report-or-proof']};
  error(errors, count(index) && index >= 1 && index <= 100 && report.index === index && proof.index === index && proof.level.id === 900000 + index, 'wrong-league-slot');
  error(errors, proof.accepted === true, 'model-proof-not-accepted');
  const levelHash = levelSha256(proof.level), routeHash = routeSha256(proof.drags);
  error(errors, proof.levelSha256 === levelHash && report.levelSha256 === levelHash, 'level-sha-mismatch');
  error(errors, proof.routeSha256 === routeHash && report.routeSha256 === routeHash, 'route-sha-mismatch');
  error(errors, report.schemaVersion >= 2 && report.mode === 'league', 'wrong-report-schema');
  const formal = identity === 'formal';
  error(errors, report.formalRegistryIdentity === formal && report.candidateInjection === !formal, 'candidate-formal-identity-mismatch');
  error(errors, report.status === (formal ? 'FORMAL_POINTER_NATURAL_TIME_PASS' : 'CANDIDATE_POINTER_NATURAL_TIME_PASS') && report.pointerValidated === true && report.timeValidated === true && !report.failure, 'driver-did-not-pass');
  error(errors, `${report.viewport?.width}x${report.viewport?.height}` === viewport, 'wrong-viewport');
  error(errors, report.naturalClock === true && report.clockMocked === false && report.playerSaveTouched === false, 'clock-or-player-save-policy');
  error(errors, Array.isArray(report.errors) && report.errors.length === 0, 'browser-errors-or-missing-error-audit');
  error(errors, Array.isArray(report.storageViolations) && report.storageViolations.length === 0, 'persistent-storage-access-or-missing-audit');

  const initial = report.initialPuzzle, final = report.finalPuzzle, probe = report.naturalClockProbe;
  error(errors, initial?.moves === 0 && initial?.cleared === 0 && positive(initial?.remainingSeconds) && initial.remainingSeconds <= proof.level.timeSeconds, 'missing-or-invalid-initial-puzzle');
  error(errors, positive(probe?.beforeClock) && positive(probe?.afterClock) && probe.afterClock < probe.beforeClock && approx(probe.beforeClock, initial?.remainingSeconds), 'natural-clock-probe-not-advanced');
  error(errors, positive(report.wallSeconds) && positive(report.playableSeconds) && approx(report.playableSeconds, initial?.remainingSeconds - final?.remainingSeconds), 'natural-clock-accounting');
  error(errors, final?.complete === true && final.failed === false && positive(final.remainingSeconds) && final.remainingSeconds < probe?.afterClock, 'not-complete-with-positive-natural-time');
  error(errors, final?.blocks === 0 && final?.queuedBlocks === 0, 'remaining-full-inventory');

  const canonical = proof.route?.canonicalReplay, replay = proof.route?.independentReplay;
  error(errors, canonical?.valid === true && canonical.complete === true && replay?.valid === true && replay.complete === true && replay.failed === false && replay.remainingBodies === 0 && replay.remainingQueued === 0, 'invalid-complete-model-route');
  const actions = Array.isArray(report.actions) ? report.actions : [], trace = Array.isArray(replay?.trace) ? replay.trace : [];
  error(errors, Array.isArray(report.actions) && actions.length === proof.drags.length && trace.length === proof.drags.length && proof.drags.length > 0, 'incomplete-pointer-actions');
  let previousSeconds = probe?.afterClock, clears = 0, nonClearingDrags = 0;
  for (let i = 0; i < actions.length; i++) {
    const action = actions[i], drag = proof.drags[i], expected = trace[i];
    error(errors, action?.index === i && action.blockId === drag?.blockId && action.blockId === expected?.blockId && expected?.index === i, `drag-${i}-identity`);
    error(errors, action?.moves === i + 1 && expected?.moves === i + 1, `drag-${i}-not-one-commit`);
    error(errors, count(action?.clearDelta) && action.clearDelta === expected?.clearDelta, `drag-${i}-clear-delta`);
    error(errors, positive(action?.remainingSeconds) && action.remainingSeconds <= previousSeconds, `drag-${i}-natural-clock`);
    if (count(action?.clearDelta)) { clears += action.clearDelta; if (action.clearDelta === 0) nonClearingDrags++; }
    previousSeconds = action?.remainingSeconds;
  }
  error(errors, final?.moves === actions.length && report.totalDrags === actions.length && canonical?.effectiveDrags === actions.length && replay?.effectiveDrags === actions.length, 'total-drag-count');
  error(errors, final?.cleared === clears && replay?.clearEvents === clears && canonical?.clearEvents === clears, 'actual-clear-total');
  error(errors, nonClearingDrags === proof.U && report.U === proof.U && canonical?.nonClearingDrags === proof.U && replay?.nonClearingDrags === proof.U, 'actual-non-clearing-drags');
  error(errors, approx(final?.remainingSeconds, actions.at(-1)?.remainingSeconds), 'final-clock-does-not-match-last-drag');

  const baseline = report.entryBaseline, settlement = report.settlement, memory = report.memoryPersistence;
  const save = settlement?.save, persisted = memory?.persistedSave;
  const specials = proof.specials, expectedPoints = specials.length * 10;
  error(errors, specials.length >= 1 && specials.length <= 3 && new Set(specials).size === specials.length && proof.scoring?.passed === true && proof.scoring.successPoints === expectedPoints, 'invalid-scoring-proof');
  error(errors, settlement?.result?.persistence === 'committed' && settlement.result.status === 'credited' && settlement.result.points === expectedPoints && settlement.points === expectedPoints, 'league-settlement-not-credited');
  error(errors, memory?.backend === 'MemoryHost' && Array.isArray(memory.operations) && memory.operations.some(op => op?.kind === 'write' && op.key === 'color-escape-save-v1'), 'missing-memory-host-write');
  error(errors, !!persisted && !!save && isDeepStrictEqual(persisted, save), 'persisted-save-missing-or-differs-from-game-cache');
  if (!baseline?.league?.season || !save?.league?.season || !persisted?.league?.season) errors.push('missing-entry-or-persisted-league-baseline');
  else {
    const before = baseline.league.season, after = save.league.season;
    error(errors, before.score === 0 && isDeepStrictEqual(before.cleared, Array.from({length:index - 1}, (_,i) => i+1)), 'wrong-entry-league-assignment');
    error(errors, after.score === before.score + expectedPoints && isDeepStrictEqual(after.cleared, [...before.cleared, index]), 'persisted-league-score-or-cleared');
    for (const key of ['index','startMs','endMs','joinedMs','tier','stars']) error(errors, Object.hasOwn(before,key) && isDeepStrictEqual(before[key], after[key]), `league-season-${key}-changed`);
    for (const key of ['coins','currentLevel','highestLevel','bestStars','bestMoves','rewardedLevels','lifeState','boosters']) error(errors, Object.hasOwn(baseline,key) && isDeepStrictEqual(baseline[key],save[key]) && isDeepStrictEqual(baseline[key],persisted[key]), `isolation-${key}`);
    error(errors, isDeepStrictEqual(withoutLeague(baseline),withoutLeague(save)) && isDeepStrictEqual(withoutLeague(baseline),withoutLeague(persisted)), 'non-league-save-changed');
  }
  error(errors, count(report.drawAudit?.calls) && report.drawAudit.calls > 0 && report.drawAudit.rotated === 0 && report.drawAudit.canvasRotationCalls === 0, 'whole-block-art-missing-or-rotated');
  return {passed:errors.length === 0, identity, errors, metrics:{totalDrags:actions.length, clearEvents:clears, nonClearingDrags, points:expectedPoints, remainingSeconds:final?.remainingSeconds ?? null}};
}

async function walkFiles(directory, workspaceRoot) {
  const files = [];
  for (const entry of await fs.readdir(directory, {withFileTypes:true})) {
    const file = path.join(directory,entry.name);
    if (entry.isDirectory()) files.push(...await walkFiles(file,workspaceRoot));
    else if (entry.isFile()) files.push(normalizedPath(path.relative(workspaceRoot,file)));
  }
  return files.sort();
}
function insideRoot(workspaceRoot, file) {
  if (typeof file !== 'string' || file.length === 0) throw Error('Missing file path');
  const resolved = path.resolve(workspaceRoot, file), relative = path.relative(workspaceRoot, resolved);
  if (relative.startsWith('..') || path.isAbsolute(relative)) throw Error('Evidence path outside workspace');
  return normalizedPath(relative);
}

/** All inputs in the report are checked against current bytes. Required inputs
 * cannot be omitted: every src file, actual sprites, proof and all three driver
 * files. reportSha256 is an external binding from the explicit report map. */
export async function inspectPointerFiles(report, proof, {proofFile, reportFile, reportSha256, workspaceRoot = ROOT, sourceFiles, hashFile} = {}) {
  const errors = [], hashes = hashFile ?? (async file => fs.readFile(path.resolve(workspaceRoot,file)).then(sha).catch(() => null));
  const check = (ok,message) => error(errors,ok,message);
  let proofKey, reportKey;
  try { proofKey=insideRoot(workspaceRoot,proofFile);reportKey=insideRoot(workspaceRoot,reportFile); }
  catch (e) { return ['invalid-input-path: '+e.message]; }
  check(validSha(reportSha256) && await hashes(reportKey) === reportSha256, 'pointer-report-file-sha-mismatch');
  const required = [...(sourceFiles ?? await walkFiles(path.join(workspaceRoot,'src'),workspaceRoot)), ...DRIVER_FILES, proofKey];
  const assets = proof?.staticAudit?.assetBindings;
  check(assets && Object.keys(assets).length > 0, 'missing-actual-sprite-bindings');
  const inputs = new Map();
  for (const [file,hash] of Object.entries(report?.files ?? {})) {
    let key;
    try { key=insideRoot(workspaceRoot,file); } catch { errors.push('invalid-input-file-path: '+file); continue; }
    check(!inputs.has(key),'duplicate-normalized-input-path: '+key);inputs.set(key,hash);
    check(validSha(hash) && await hashes(key) === hash,'stale-or-invalid-input-hash: '+key);
  }
  for (const file of new Set(required)) check(inputs.has(file),'missing-input-binding: '+file);
  for (const [file,hash] of Object.entries(assets ?? {})) {
    let key;try { key=insideRoot(workspaceRoot,path.join('public',file)); } catch { errors.push('invalid-sprite-path: '+file);continue; }
    check(validSha(hash) && inputs.get(key) === hash && await hashes(key) === hash,'sprite-file-hash-mismatch: '+key);
  }
  return errors;
}

async function currentRegistry(workspaceRoot) {
  const result = await build({stdin:{contents:'export {getLeagueLevel} from "./src/core/leagueLevels.ts";',resolveDir:workspaceRoot,loader:'ts'},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
  return import(`data:text/javascript;base64,${Buffer.from(result.outputFiles[0].text).toString('base64')}`);
}

/** Input: selection {selections:[{index,proofFile,...}]}; map
 * {selectionFileSha256,reports:[{index,viewports:{'320x568':{file,sha256},
 * '496x1078':{file,sha256}}}]}. Never discovers/replaces a missing run itself.
 * Partial lists and candidate injection can never pass the final formal gate. */
export async function auditLeaguePointerAcceptance({selectionFile, mappingFile, identity = 'formal', workspaceRoot = ROOT}) {
  if (!['formal','candidate'].includes(identity)) throw Error('Identity must be formal or candidate');
  const errors = [], rows = [], inputHashes = {}, selections = new Map(), mappings = new Map(), usedReports = new Set();
  const selectionKey = insideRoot(workspaceRoot,selectionFile), mappingKey = insideRoot(workspaceRoot,mappingFile);
  const [selectionBytes,mappingBytes] = await Promise.all([fs.readFile(path.resolve(workspaceRoot,selectionKey)),fs.readFile(path.resolve(workspaceRoot,mappingKey))]);
  const selected = JSON.parse(selectionBytes), mapping = JSON.parse(mappingBytes);
  inputHashes[selectionKey]=sha(selectionBytes);inputHashes[mappingKey]=sha(mappingBytes);
  error(errors, mapping.selectionFileSha256 === inputHashes[selectionKey], 'mapping-selection-sha-mismatch');
  for (const [values,store,label] of [[selected.selections,selections,'selection'],[mapping.reports,mappings,'report-map']]) {
    if (!Array.isArray(values)) { errors.push('missing-'+label+'-array');continue; }
    for (const item of values) {
      if (!count(item?.index) || item.index < 1 || item.index > 100 || store.has(item.index)) { errors.push('invalid-or-duplicate-'+label+'-slot');continue; }
      store.set(item.index,item);
    }
  }
  for (const index of mappings.keys()) if (!selections.has(index)) errors.push('report-map-slot-not-selected: '+index);
  const sourceFiles = await walkFiles(path.join(workspaceRoot,'src'),workspaceRoot), current = new Map();
  const hashFile = async file => { if (!current.has(file)) current.set(file,await fs.readFile(path.resolve(workspaceRoot,file)).then(sha).catch(() => null));return current.get(file); };
  let registry;
  if (identity === 'formal') { try { registry=await currentRegistry(workspaceRoot); } catch (e) { errors.push('formal-registry-unreadable: '+e.message); } }
  for (let index=1; index<=100; index++) {
    const selection=selections.get(index), mapped=mappings.get(index), row={index,passed:false,errors:[],screens:[]};
    rows.push(row);
    if (!selection) { row.errors.push('missing-selected-slot');continue; }
    let proof,proofKey;
    try { proofKey=insideRoot(workspaceRoot,selection.proofFile);const bytes=await fs.readFile(path.resolve(workspaceRoot,proofKey));proof=JSON.parse(bytes);inputHashes[proofKey]=sha(bytes);row.proofFile=proofKey;row.levelSha256=proof.levelSha256;row.routeSha256=proof.routeSha256; }
    catch (e) { row.errors.push('proof-unreadable: '+e.message);continue; }
    if (identity === 'formal') {
      try { const registered=registry?.getLeagueLevel(index);error(row.errors, registered?.index === index && levelSha256(registered.level) === levelSha256(proof.level) && isDeepStrictEqual(registered.specials,proof.specials),'current-formal-registry-differs'); }
      catch (e) { row.errors.push('current-formal-registry-unavailable: '+e.message); }
    }
    if (mapped?.viewports && Object.keys(mapped.viewports).some(key => !REQUIRED_VIEWPORTS.includes(key))) row.errors.push('unexpected-viewport-in-map');
    for (const viewport of REQUIRED_VIEWPORTS) {
      const ref=mapped?.viewports?.[viewport], screen={viewport,passed:false,errors:[]};row.screens.push(screen);
      if (!ref?.file) { screen.errors.push('missing-viewport-report');continue; }
      let report,reportKey;
      try {
        reportKey=insideRoot(workspaceRoot,ref.file);screen.reportFile=reportKey;
        if (usedReports.has(reportKey)) screen.errors.push('report-reused-for-another-slot-or-viewport');
        usedReports.add(reportKey);const bytes=await fs.readFile(path.resolve(workspaceRoot,reportKey));inputHashes[reportKey]=sha(bytes);screen.reportSha256=inputHashes[reportKey];report=JSON.parse(bytes);
        const inspected=inspectPointerReport(report,proof,{index,viewport,identity});screen.errors.push(...inspected.errors);screen.metrics=inspected.metrics;
        screen.errors.push(...await inspectPointerFiles(report,proof,{proofFile:proofKey,reportFile:reportKey,reportSha256:ref.sha256,workspaceRoot,sourceFiles,hashFile}));
      } catch (e) { screen.errors.push('report-unreadable-or-malformed: '+e.message); }
      screen.passed=screen.errors.length===0;
    }
    row.passed=row.errors.length===0 && row.screens.length===2 && row.screens.every(screen=>screen.passed);
  }
  // No input may drift while this independent audit is reading it.
  for (const [file,hash] of Object.entries(inputHashes)) if (await fs.readFile(path.resolve(workspaceRoot,file)).then(sha).catch(()=>null)!==hash) errors.push('input-changed-during-audit: '+file);
  for (const [file,hash] of current) if (await fs.readFile(path.resolve(workspaceRoot,file)).then(sha).catch(()=>null)!==hash) errors.push('bound-runtime-changed-during-audit: '+file);
  const passedLevels=rows.filter(row=>row.passed).length, complete=errors.length===0 && selections.size===100 && mappings.size===100 && passedLevels===100;
  return {schemaVersion:1,contractVersion:POINTER_ACCEPTANCE_VERSION,ruleVersion:RULE_VERSION,createdAt:new Date().toISOString(),identity,
    status:complete?(identity==='formal'?'FORMAL_POINTER_GATE_PASS':'CANDIDATE_POINTER_COMPLETE_NOT_FORMAL'):'POINTER_GATE_INCOMPLETE_OR_REJECTED',
    accepted:complete&&identity==='formal',pointerGatePassed:complete,formalPointerAccepted:complete&&identity==='formal',formalReady:false,
    scope:'Pointer, natural clock, current input/art bindings, isolated actual league settlement only; design/model/catalog gates remain separate',
    expectedLevels:100,expectedScreens:200,selectedLevels:selections.size,passedLevels,passedScreens:rows.reduce((n,row)=>n+row.screens.filter(screen=>screen.passed).length,0),
    playerSaveTouched:false,productionChanged:false,errors,rows,inputHashes,
    checkerSha256:sha(await fs.readFile(fileURLToPath(import.meta.url)))};
}

if (process.argv[1] && import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
  const [selectionFile,mappingFile,output,identity='formal']=process.argv.slice(2);
  if (!selectionFile||!mappingFile||!output) throw Error('Usage: node tools/league-v2/pointer-acceptance.mjs selection.json reports-map.json new-output.json [formal|candidate]');
  const lock=verifyRulesLock();if (!lock.ok||lock.activeVersion!==RULE_VERSION) throw Error('Active rule lock required');
  const result=await auditLeaguePointerAcceptance({selectionFile,mappingFile,identity});
  const allowed=path.resolve(ROOT,'deliverables/league-v2-20261008/proof/pointer-audit');
  const target=path.resolve(ROOT,output),relative=path.relative(allowed,target);
  if (relative.startsWith('..')||path.isAbsolute(relative)||relative==='') throw Error('Output must stay in proof/pointer-audit');
  await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({status:result.status,accepted:result.accepted,passedLevels:result.passedLevels,passedScreens:result.passedScreens,output}));
  if (!result.pointerGatePassed) process.exitCode=1;
}
