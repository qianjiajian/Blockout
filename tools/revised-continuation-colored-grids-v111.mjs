import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import ts from 'typescript';
import {replayTimedRoute} from './revised-timed-route-v110.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {continuationApi, formalTimedRoute, GAMEPLAY_FIELDS} from './revised-continuation-batch.mjs';
import {parsePreparedPatch, transformPreparedSource, diagnoseTypedSource} from './revised-continuation-typed-emission.mjs';

export const LEGACY_ANCESTOR = Object.freeze({
  path: '.codex-temp/remaining161-v110/adoption-cumulative63/adoption-typed.json',
  sha256: '8b52e5870280fcdd77666812c0954b6b3493a544bfe6a91e2391ce9656878fd1',
  ruleVersion: '1.10.0',
});
export const LEGACY_CAMPAIGN_SHA = 'ea7add7e7aa7d492caed3301e229f80bb058745d28c0eac4e5a577010309d7c9';
export const DATA_PATH = 'src/core/revisedContinuationLayouts.generated.ts';
const SELF = 'tools/revised-continuation-colored-grids-v111.mjs';
const POLICY = 'tools/revised-design-policy-colored-grids-v111.mjs';
const INITIAL_IDS = [21,22,23,24,25,26,27,28,29,30,31,34,50,52,58,59,60,135,152];
const sha = p => digest(fs.readFileSync(p));
const read = (p, expected) => {
  assert.match(expected ?? '', /^[a-f0-9]{64}$/i, `Pin evidence SHA: ${p}`);
  assert.equal(sha(p), expected.toLowerCase(), `Evidence drift: ${p}`);
  return JSON.parse(fs.readFileSync(p));
};
const bind = (bindings, p, expected = sha(p)) => {
  assert.equal(sha(p), expected, `Input drift: ${p}`);
  if (bindings[p]) assert.equal(bindings[p], expected, `Conflicting bindings: ${p}`);
  bindings[p] = expected;
};
const checkBindings = bindings => { for (const [p, h] of Object.entries(bindings)) assert.equal(sha(p), h, `Input drift: ${p}`); };
const pick = level => Object.fromEntries(GAMEPLAY_FIELDS.filter(k => Object.hasOwn(level, k)).map(k => [k, level[k]]));
const ascending = ids => [...ids].sort((a,b) => a-b);
const metadataFor = level => Object.fromEntries(['id','name','timeSeconds','reward','featureIntro']
  .filter(k => level[k] !== undefined && (k !== 'featureIntro' || level[k])).map(k => [k,level[k]]));
function rulesGate() {
  const lock = verifyRulesLock();
  assert(lock.ok && lock.activeVersion === '1.11.0', 'Active rules must be genuinely v1.11.0');
  return lock;
}

/** Preserve pinned old evidence under its actual version. No active-version spoof,
 * no old v1.10 verifier with its lock rewritten, and no claim of fresh old UI. */
export function inspectLegacyAncestor() {
  rulesGate();
  const bindings = {}, archive = read(LEGACY_ANCESTOR.path, LEGACY_ANCESTOR.sha256);
  bind(bindings, LEGACY_ANCESTOR.path, LEGACY_ANCESTOR.sha256);
  assert.equal(archive.ruleVersion, '1.10.0');
  assert.equal(archive.rows.length, 63);
  const c = archive.emissionCompatibility;
  assert.equal(c.kind, 'lv138-authored-queue-metadata-type-emission');
  const original = read(c.originalArchive.path, c.originalArchive.sha256);
  bind(bindings, c.originalArchive.path, c.originalArchive.sha256);
  bind(bindings, c.originalPatch.path, c.originalPatch.sha256);
  bind(bindings, c.wrapper.path, c.wrapper.sha256);
  const source = parsePreparedPatch(fs.readFileSync(c.originalPatch.path, 'utf8')).source;
  // Pure historical type transformation, still explicitly given its original
  // v1.10 archive; this does not run or relabel historical rule acceptance.
  const typed = transformPreparedSource(source, original);
  assert.equal(digest(typed.source), archive.expectedDataSha256);
  assert.equal(digest(typed.layouts), c.layoutSemanticSha256);
  assert.deepEqual(archive.rows, original.rows);
  const manifest = JSON.parse(fs.readFileSync('docs/rules/manifest.json'));
  const oldRule = manifest.versions.find(v => v.version === '1.10.0');
  assert(oldRule && oldRule.status === 'frozen');
  bind(bindings, oldRule.document, oldRule.sha256);
  let pointer = LEGACY_ANCESTOR, child;
  const visited = new Set();
  while (pointer) {
    assert(!visited.has(path.resolve(pointer.path)), 'Historical archive cycle');
    visited.add(path.resolve(pointer.path));
    const node = read(pointer.path, pointer.sha256);
    bind(bindings, pointer.path, pointer.sha256);
    bind(bindings, node.batchPath, node.batchSha256);
    if (child) {
      assert.deepEqual(child.before, node.before, 'Historical baseline changed');
      for (const row of node.rows) assert.deepEqual(child.rows.find(r => r.levelId === row.levelId), row, 'Historical row changed');
    }
    child = node; pointer = node.previousArchive;
  }
  for (const row of archive.rows) {
    const raw = read(row.path, row.sha256);
    bind(bindings, row.path, row.sha256);
    bind(bindings, row.sourceReview.path, row.sourceReview.sha256);
    assert.deepEqual(pick(raw.level), typed.layouts[row.levelId]);
    assert.equal(digest(pick(raw.level)), row.layoutSha256);
  }
  checkBindings(bindings);
  return {archive, layouts: typed.layouts, bindings,
    evidenceStatus: 'pinned-historical-v1.10-artifacts-not-fresh-source-or-ui-certification'};
}

export async function continuationApiV111() {
  const result = await continuationApi();
  const bundles = await Promise.all([SELF, POLICY].map(entry => build({entryPoints:[entry],bundle:true,write:false,
    platform:'node',format:'esm',packages:'external',metafile:true})));
  return {...result, inputs:[...new Set([...result.inputs, ...bundles.flatMap(b => Object.keys(b.metafile.inputs)),
    'docs/rules/manifest.json', 'docs/mechanism-rules-v1.11.0.md'])]};
}

export function captureBaseline(runtime, legacy) {
  assert.deepEqual(runtime.LEVELS.map(l => l.id), Array.from({length:200}, (_,i) => i+1));
  assert.equal(digest(runtime.LEVELS), LEGACY_CAMPAIGN_SHA, 'Initial v1.11 baseline must be the pinned 82-level campaign');
  assert.equal(sha(DATA_PATH),legacy.archive.expectedDataSha256,'Initial generated-source bytes differ from typed63');
  assert.deepEqual(runtime.REVISED_CONTINUATION_LAYOUTS, legacy.layouts, 'Legacy layouts changed before transition');
  const formalIds = runtime.LEVELS.filter(l => l.mechanismRules).map(l => l.id);
  assert.deepEqual(formalIds, ascending([...INITIAL_IDS, ...legacy.archive.expectedContinuationIds]));
  return {ruleVersionAtCapture:'1.10.0', campaignSemanticSha256:LEGACY_CAMPAIGN_SHA,
    formalIds, levels:runtime.LEVELS.map(l => ({levelId:l.id, level:structuredClone(l), sha256:digest(l),
      starTargets:runtime.levelStarTargets(l), metadata:metadataFor(l)}))};
}

export function assertBaselineUnchanged(runtime, baseline, newIds) {
  assert.equal(baseline.ruleVersionAtCapture, '1.10.0');
  assert.equal(baseline.campaignSemanticSha256, LEGACY_CAMPAIGN_SHA);
  assert.deepEqual(baseline.levels.map(l => l.levelId), Array.from({length:200}, (_,i) => i+1));
  assert.equal(digest(baseline.levels.map(l => l.level)), LEGACY_CAMPAIGN_SHA, 'Stored original levels do not match pinned legacy campaign');
  assert.deepEqual(baseline.formalIds, baseline.levels.filter(l => l.level.mechanismRules).map(l => l.levelId));
  for (const old of baseline.levels) {
    assert.equal(old.level.id, old.levelId);assert.equal(digest(old.level),old.sha256,'Stored baseline hash changed');
    assert.deepEqual(old.metadata,metadataFor(old.level),'Stored old metadata changed');
    assert.deepEqual(old.starTargets,runtime.levelStarTargets(old.level),'Stored old star targets changed');
  }
  assert.equal(new Set(newIds).size, newIds.length, 'Duplicate new ID');
  const allowed = new Set(newIds);
  for (const id of allowed) {
    assert(Number.isInteger(id) && id >= 21 && id <= 200, 'New ID outside 21-200');
    assert(!baseline.formalIds.includes(id), 'Previously formal level cannot be replaced');
  }
  for (const old of baseline.levels) if (!allowed.has(old.levelId)) {
    const level = runtime.LEVELS[old.levelId-1];
    assert.equal(digest(level), old.sha256, `Out-of-batch Lv${old.levelId} changed`);
    assert.deepEqual(runtime.levelStarTargets(level), old.starTargets, `Out-of-batch Lv${old.levelId} stars changed`);
  }
}

export function formalLevelFromBaseline(raw, baselineRow) {
  assert.equal(raw.level.id, baselineRow.levelId);
  const id = raw.level.id, p = id % 10, m = baselineRow.metadata;
  return {...pick(raw.level), id, name:m.name, difficulty:p===0?'super':[3,5,8].includes(p)?'hard':'normal',
    timeSeconds:m.timeSeconds, reward:m.reward, parMoves:baselineRow.starTargets.moveTarget,
    ...(m.featureIntro?{featureIntro:m.featureIntro}:{})};
}

/** New source emitter; old table values, including exactly two authored queue
 * metadata objects, survive unchanged. All runtime objects are compared. */
export function emitContinuationSource(layouts) {
  const variables = [], metadata = [];
  const rows = Object.entries(layouts).sort((a,b) => Number(a[0])-Number(b[0])).map(([id, level]) => {
    let text = JSON.stringify(level);
    for (const block of level.blocks) if (Object.hasOwn(block, 'generatorId')) {
      assert.equal(Number(id), 138, 'Only historical Lv138 metadata is supported');
      assert(['r138-q0','r138-q1'].includes(block.id));
      assert.equal(block.generatorId, 'r138-machine');
      const owners = (level.generators??[]).filter(g => g.queueBlockIds.includes(block.id));
      assert.equal(owners.length, 1); assert.equal(owners[0].id, block.generatorId);
      assert.equal(owners[0].queueBlockIds.filter(id => id===block.id).length, 1);
      const variable = `REVISED_LV138_QUEUE_${block.id.endsWith('0')?0:1}`, literal = JSON.stringify(block);
      assert.equal(text.split(literal).length-1, 1);
      text = text.replace(literal, variable);
      variables.push(`const ${variable} = ${literal} satisfies BlockSpec & { generatorId: "r138-machine" };`);
      metadata.push({levelId:138,blockId:block.id,generatorId:block.generatorId,objectSha256:digest(block)});
    }
    return `  ${id}: ${text},`;
  });
  assert.deepEqual(metadata.map(m => m.blockId), ['r138-q0','r138-q1']);
  const source = '// Generated from pinned v1.10 ancestry and independently reviewed v1.11 additions.\n' +
    "import type { RevisedLevelLayout } from './revisedReviewedLayouts.generated';\n" +
    "import type { BlockSpec } from './types';\n" + variables.join('\n') + '\n' +
    'export const REVISED_CONTINUATION_LAYOUTS: Record<number, RevisedLevelLayout> = {\n' + rows.join('\n') + '\n};\n';
  const typecheck = diagnoseTypedSource(source);
  assert.deepEqual(typecheck.diagnostics, [], 'Full generated source must typecheck');
  const js = ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const context={exports:{}};vm.runInNewContext(js,context,{timeout:2000});
  assert.deepEqual(JSON.parse(JSON.stringify(context.exports.REVISED_CONTINUATION_LAYOUTS)), layouts, 'Emission changed runtime values');
  return {source, metadata, typeInputs:typecheck.bindings, layoutSemanticSha256:digest(layouts), runtimeObjectsDeepEqual:true};
}

function mergeInputs(bindings, inputs) { for(const[p,h]of Object.entries(inputs??{})) bind(bindings,p,typeof h==='string'?h:h.sha256); }
async function checkNewCandidate(item, api, bindings) {
  bind(bindings, POLICY);
  const policy = await import(pathToFileURL(path.resolve(POLICY)).href + '?sha=' + sha(POLICY));
  const checked = await policy.checkCandidate(item, api);
  assert.equal(checked.raw.ruleVersion, '1.11.0');
  assert.equal(checked.raw.level.id, item.levelId);
  assert(checked.checked.rulesPassed && checked.checked.sourceAligned, 'Unapproved design/source differences');
  assert(checked.checked.replay?.valid && checked.checked.replay?.complete && checked.checked.art?.passed, 'Candidate incomplete or art invalid');
  assert.equal(typeof checked.checked.exactMatch, 'boolean');
  assert(Array.isArray(checked.checked.approvedDifferences));
  assert.equal(checked.checked.exactMatch, checked.checked.approvedDifferences.length === 0, 'Exact-match label hides approved differences');
  if (checked.raw.level.blocks.some(b => b.timedBombSeconds !== undefined)) {
    assert(checked.raw.timedRoute && checked.checked.timedModelValidated && checked.checked.replay.modelTimeValidated, 'Bomb needs full positive-time proof');
  }
  mergeInputs(bindings, checked.inputBindings);
  bind(bindings, item.path, item.sha256.toLowerCase());
  bind(bindings, item.sourceReview.path, item.sourceReview.sha256.toLowerCase());
  return checked;
}
export function formalCandidateForValidation(raw, formal, archivedRow) {
  if (!raw.level.blocks.some(b => b.timedBombSeconds !== undefined)) return {...raw, level:formal};
  const row=archivedRow??{drags:raw.drags,timedRoute:raw.timedRoute,timedRouteSha256:digest(raw.timedRoute)};
  return {...raw,level:formal,timedRoute:formalTimedRoute(row,raw,formal)};
}
function assertFormal(raw, formal, baselineRow, runtime, api) {
  assert.deepEqual(pick(formal), pick(raw.level), 'Formal gameplay must equal candidate gameplay');
  assert.deepEqual(formal, formalLevelFromBaseline(raw, baselineRow), 'Unexpected formal metadata or leaked old gameplay');
  assert.deepEqual(runtime.levelStarTargets(formal), baselineRow.starTargets, 'Actual old star targets changed');
  const proof=formalCandidateForValidation(raw,formal);
  const replay = raw.level.blocks.some(b=>b.timedBombSeconds!==undefined)
    ? replayTimedRoute(formal,proof.timedRoute,api,{expectedDrags:raw.drags})
    : api.replayRevisedRoute(formal, raw.drags);
  assert(replay.valid && replay.complete, 'Fresh formal-level replay did not finish');
  return replay;
}
const patchFor = (before, after) => '*** Begin Patch\n*** Update File: '+DATA_PATH+'\n@@\n'+
  before.trimEnd().split(/\r?\n/).map(l=>'-'+l).join('\n')+'\n'+after.trimEnd().split('\n').map(l=>'+'+l).join('\n')+'\n*** End Patch\n';

export async function prepareContinuationBatchV111(batchPath, output) {
  rulesGate();
  const relative = path.relative(process.cwd(),path.resolve(output)).replaceAll('\\','/');
  assert(relative.startsWith('.codex-temp/remaining98-v111/'), 'Use an isolated remaining98-v111 output directory');
  const batchHash=sha(batchPath),batch=read(batchPath,batchHash);
  assert.equal(batch.ruleVersion,'1.11.0');assert(batch.rows?.length);
  assert.equal(new Set(batch.rows.map(r=>r.levelId)).size,batch.rows.length);
  if(batch.legacyAncestor)assert.deepEqual(batch.legacyAncestor,LEGACY_ANCESTOR);
  const legacy=inspectLegacyAncestor(),{api,runtime,inputs}=await continuationApiV111();
  const bindings=Object.fromEntries(inputs.map(p=>[p,sha(p)]));mergeInputs(bindings,legacy.bindings);bind(bindings,batchPath,batchHash);
  let prior;
  if(batch.previousArchive){
    await verifyContinuationBatchV111(batch.previousArchive.path,batch.previousArchive.sha256);
    prior=read(batch.previousArchive.path,batch.previousArchive.sha256);
  }
  const baseline=prior?structuredClone(prior.baseline):captureBaseline(runtime,legacy);
  const rows=prior?structuredClone(prior.rows):[],layouts=structuredClone(runtime.REVISED_CONTINUATION_LAYOUTS);
  assertBaselineUnchanged(runtime,baseline,rows.map(r=>r.levelId));
  for(const item of batch.rows){
    assert(!layouts[item.levelId]&&!baseline.formalIds.includes(item.levelId),'Cannot replace an existing formal level');
    assert(Number.isInteger(item.levelId)&&item.levelId>=21&&item.levelId<=200,'New level outside scope');
    const {raw,checked,loaded,adapter}=await checkNewCandidate(item,api,bindings),old=baseline.levels[item.levelId-1];
    const formal=formalLevelFromBaseline(raw,old),replay=assertFormal(raw,formal,old,runtime,api);
    const formalPolicy=adapter.verifyReviewedDesign(formalCandidateForValidation(raw,formal),loaded.source,api);
    assert(formalPolicy.rulesPassed&&formalPolicy.sourceAligned&&formalPolicy.replay.complete);
    assert.deepEqual(formalPolicy.approvedDifferences,checked.approvedDifferences);
    layouts[item.levelId]=pick(raw.level);
    rows.push({...item,ruleVersion:'1.11.0',drags:raw.drags,
      ...(raw.level.blocks.some(b=>b.timedBombSeconds!==undefined)?{timedRoute:raw.timedRoute,timedRouteSha256:digest(raw.timedRoute)}:{}),layoutSha256:digest(layouts[item.levelId]),
      formalLevelSha256:digest(formal),previous:old,designPolicy:raw.designPolicy,
      rulesPassed:true,sourceAligned:true,exactMatch:checked.exactMatch,approvedDifferences:checked.approvedDifferences,
      formalReplay:{valid:replay.valid,complete:replay.complete}});
  }
  rows.sort((a,b)=>a.levelId-b.levelId);
  const emitted=emitContinuationSource(layouts),before=fs.readFileSync(DATA_PATH,'utf8');
  const patchText=patchFor(before,emitted.source),archivePath=path.join(output,'adoption.json'),patchPath=path.join(output,'data.patch');
  mergeInputs(bindings,emitted.typeInputs);
  const archive={schemaVersion:2,ruleVersion:'1.11.0',legacyAncestor:LEGACY_ANCESTOR,
    inheritedRows:legacy.archive.rows,legacyEvidenceStatus:legacy.evidenceStatus,baseline,rows,
    ...(batch.previousArchive?{previousArchive:batch.previousArchive}:{}),batchPath,batchSha256:batchHash,bindings,
    initialFormalIds:INITIAL_IDS,expectedContinuationIds:Object.keys(layouts).map(Number),
    oldDataSha256:digest(before),expectedDataSha256:digest(emitted.source),
    patch:{path:patchPath,sha256:digest(patchText)},
    emission:{wrapper:{path:SELF,sha256:sha(SELF)},metadata:emitted.metadata,typeInputs:emitted.typeInputs,
      layoutSemanticSha256:emitted.layoutSemanticSha256,runtimeObjectsDeepEqual:true},
    pointerValidated:false,naturalClockValidated:false,lowerBoundCertified:false,timeAndStarsCalibrated:false,releaseApproved:false};
  checkBindings(bindings);fs.mkdirSync(output,{recursive:true});
  assert(!fs.existsSync(archivePath)&&!fs.existsSync(patchPath),'Never overwrite archives or patches');
  fs.writeFileSync(archivePath,JSON.stringify(archive,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(patchPath,patchText,{flag:'wx'});checkBindings(bindings);
  return {archivePath,archiveSha256:sha(archivePath),patchPath,patchSha256:sha(patchPath),
    addedIds:batch.rows.map(r=>r.levelId),cumulativeNewIds:rows.map(r=>r.levelId),formalCount:82+rows.length};
}

export async function verifyContinuationBatchV111(archivePath, expectedSha, {applied=true}={}) {
  rulesGate();
  const archive=read(archivePath,expectedSha);assert.equal(archive.schemaVersion,2);assert.equal(archive.ruleVersion,'1.11.0');
  assert.deepEqual(archive.legacyAncestor,LEGACY_ANCESTOR);
  const legacy=inspectLegacyAncestor();assert.deepEqual(archive.inheritedRows,legacy.archive.rows);
  assert.deepEqual(archive.initialFormalIds,INITIAL_IDS);assert.equal(archive.legacyEvidenceStatus,legacy.evidenceStatus);
  for(const flag of ['pointerValidated','naturalClockValidated','lowerBoundCertified','timeAndStarsCalibrated','releaseApproved'])assert.equal(archive[flag],false,'Model archive cannot mint downstream approval');
  const {api,runtime,inputs}=await continuationApiV111(),bindings=Object.fromEntries(inputs.map(p=>[p,sha(p)]));
  mergeInputs(bindings,legacy.bindings);bind(bindings,archivePath,expectedSha.toLowerCase());
  assert.equal(sha(DATA_PATH),applied?archive.expectedDataSha256:archive.oldDataSha256,'Current table does not equal the expected applied/before source');
  let chain={path:archivePath,sha256:expectedSha},child;const seen=new Set();
  while(chain){
    assert(!seen.has(path.resolve(chain.path)),'New archive cycle');seen.add(path.resolve(chain.path));
    const node=read(chain.path,chain.sha256);assert.equal(node.schemaVersion,2);assert.equal(node.ruleVersion,'1.11.0');
    bind(bindings,chain.path,chain.sha256.toLowerCase());bind(bindings,node.batchPath,node.batchSha256);
    const batch=read(node.batchPath,node.batchSha256);assert.equal(batch.ruleVersion,'1.11.0');
    assert(batch.rows.length&&new Set(batch.rows.map(r=>r.levelId)).size===batch.rows.length,'Invalid batch member list');
    assert.deepEqual(node.previousArchive,batch.previousArchive,'Archive predecessor differs from input batch');
    const previous=node.previousArchive?read(node.previousArchive.path,node.previousArchive.sha256):undefined;
    const previousIds=previous?.rows.map(r=>r.levelId)??[];
    assert(batch.rows.every(r=>!previousIds.includes(r.levelId)),'Input batch replaces prior new evidence');
    assert.deepEqual(node.rows.map(r=>r.levelId),ascending([...previousIds,...batch.rows.map(r=>r.levelId)]),'Archive rows differ from exact batch union');
    for(const item of batch.rows){
      const row=node.rows.find(r=>r.levelId===item.levelId);
      for(const key of Object.keys(item))assert.deepEqual(row[key],item[key],`Archive changed batch input ${key}`);
    }
    assert.equal(node.oldDataSha256,previous?.expectedDataSha256??legacy.archive.expectedDataSha256,'Prepared BEFORE source is not its predecessor');
    bind(bindings,node.patch.path,node.patch.sha256);
    const parsed=parsePreparedPatch(fs.readFileSync(node.patch.path,'utf8'));
    assert.equal(digest(parsed.source),node.expectedDataSha256,'Archived patch added wrong source');
    assert.equal(digest(parsed.oldLines.join('\n')+'\n'),node.oldDataSha256,'Archived patch removed wrong source');
    assert.deepEqual(node.legacyAncestor,LEGACY_ANCESTOR);assert.deepEqual(node.inheritedRows,legacy.archive.rows);
    if(child){assert.deepEqual(child.baseline,node.baseline,'Transition baseline changed');
      for(const row of node.rows)assert.deepEqual(child.rows.find(r=>r.levelId===row.levelId),row,'Prior new evidence changed');}
    child=node;chain=node.previousArchive;
  }
  const ids=archive.rows.map(r=>r.levelId);assert.deepEqual(ids,ascending(ids));
  assertBaselineUnchanged(runtime,archive.baseline,ids);
  const layouts=structuredClone(legacy.layouts),rows=[];
  for(const row of archive.rows){
    assert.equal(row.ruleVersion,'1.11.0');const{raw,checked,loaded,adapter,historicalNonSourceDrift}=await checkNewCandidate(row,api,bindings);
    if(raw.level.blocks.some(b=>b.timedBombSeconds!==undefined))formalCandidateForValidation(raw,raw.level,row);
    assert.deepEqual(row.drags,raw.drags,'Archived route changed');assert.deepEqual(row.designPolicy,raw.designPolicy);
    assert.deepEqual(row.approvedDifferences,checked.approvedDifferences);assert.equal(row.exactMatch,checked.exactMatch);
    assert.equal(row.sourceAligned,true);assert.equal(row.rulesPassed,true);
    const old=archive.baseline.levels[row.levelId-1];assert.deepEqual(row.previous,old);
    const formal=applied?runtime.LEVELS[row.levelId-1]:formalLevelFromBaseline(raw,old),replay=assertFormal(raw,formal,old,runtime,api);
    assert.deepEqual(row.formalReplay,{valid:replay.valid,complete:replay.complete},'Archived model result differs from fresh replay');
    const formalPolicy=adapter.verifyReviewedDesign(formalCandidateForValidation(raw,formal),loaded.source,api);
    assert(formalPolicy.rulesPassed&&formalPolicy.sourceAligned&&formalPolicy.replay.complete);
    assert.deepEqual(formalPolicy.approvedDifferences,checked.approvedDifferences);
    assert.equal(digest(formal),row.formalLevelSha256);layouts[row.levelId]=pick(raw.level);
    assert.equal(digest(layouts[row.levelId]),row.layoutSha256);
    rows.push({...checked,ruleVersion:'1.11.0',formalLevelSha256:digest(formal),formalReplay:replay,
      originalMetadataPreserved:true,historicalNonSourceDrift});
  }
  if(applied)assert.deepEqual(runtime.REVISED_CONTINUATION_LAYOUTS,layouts,'Unexpected or changed inherited layouts');
  else {
    const priorRows=archive.previousArchive?read(archive.previousArchive.path,archive.previousArchive.sha256).rows:[];
    const previousLayouts=structuredClone(legacy.layouts);
    for(const row of priorRows)previousLayouts[row.levelId]=pick(read(row.path,row.sha256).level);
    assert.deepEqual(runtime.REVISED_CONTINUATION_LAYOUTS,previousLayouts,'Prepared before-layouts differ from prior batch');
    for(const row of priorRows)assert.equal(digest(runtime.LEVELS[row.levelId-1]),row.formalLevelSha256,'Prior adopted level changed');
  }
  assert.deepEqual(archive.expectedContinuationIds,Object.keys(layouts).map(Number));
  const emitted=emitContinuationSource(layouts);assert.equal(digest(emitted.source),archive.expectedDataSha256);
  const wrapper=archive.emission.wrapper;
  // Older family-zero archives remain immutable. Only this exact released
  // wrapper hash may serve as the historical emitter; new archives bind SELF.
  const oldWrapper='tools/revised-continuation-batch-v111.mjs';
  const familyWrapper='tools/revised-continuation-families-v111.mjs';
  const bombWrapper='tools/revised-continuation-bombs-v111.mjs';
  const jointWrapper='tools/revised-continuation-joint-curtains-v111.mjs';
  const jointStarWrapper='tools/revised-continuation-joint-stars-v111.mjs';
  assert(wrapper.path===SELF||wrapper.path===jointStarWrapper||wrapper.path===jointWrapper||wrapper.path===oldWrapper||wrapper.path===familyWrapper||wrapper.path===bombWrapper,'Unrecognized typed emitter');
  if(wrapper.path===jointStarWrapper)assert.equal(wrapper.sha256,'f09c018982b734c20e5c070bd146ce36ce57c1224bab88982c9d93c84a851973');
  if(wrapper.path===jointWrapper)assert.equal(wrapper.sha256,'8b8aabe78a80fb8184bd09377261dddca887caf3e36cbbb787a6bf6c268a2aaf');
  if(wrapper.path===bombWrapper)assert.equal(wrapper.sha256,'766274c14eb7532617121f6fb8d4a809feb27eb13dbeeed7d8c0eb8212617d54');
  if(wrapper.path===familyWrapper)assert.equal(wrapper.sha256,'bc2e6656abcc1f0c4a1969503801703aedb7be8c8c4beb302ad9d4193aa0070c');
  if(wrapper.path===oldWrapper)assert.equal(wrapper.sha256,'3cfcf5893318f478e715fa5d6f39e352588826fbcdfb2e7c096db81b683bb00c');
  bind(bindings,wrapper.path,wrapper.sha256);
  assert.deepEqual(archive.emission,{wrapper,metadata:emitted.metadata,
    typeInputs:emitted.typeInputs,layoutSemanticSha256:emitted.layoutSemanticSha256,runtimeObjectsDeepEqual:true});
  const formalIds=runtime.LEVELS.filter(l=>l.mechanismRules).map(l=>l.id);
  if(applied)assert.deepEqual(formalIds,ascending([...archive.baseline.formalIds,...ids]));
  checkBindings(bindings);
  return {ruleVersion:'1.11.0',status:applied?'passed-model-not-ui':'passed-prepared-not-applied',applied,archivePath,archiveSha256:expectedSha,rows,
    inheritedFormalCount:82,inheritedEvidenceVersion:'1.10.0',inheritedFreshUiValidated:false,
    unchanged:200-ids.length,formalIds,inputs:bindings,campaignSemanticSha256:digest(runtime.LEVELS),
    pointerValidated:false,naturalClockValidated:false,lowerBoundCertified:false,timeAndStarsCalibrated:false,releaseApproved:false};
}

if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const [command,p,arg]=process.argv.slice(2);
  if(command==='prepare')console.log(JSON.stringify(await prepareContinuationBatchV111(p,arg),null,2));
  else if(command==='verify'||command==='verify-prepared'){
    const report=await verifyContinuationBatchV111(p,arg,{applied:command==='verify'}),output=path.join(path.dirname(p),'verification-v111-'+Date.now()+'.json');
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({status:report.status,output,formal:report.formalIds.length}));
  }else throw Error('Usage: prepare BATCH OUTPUT | verify[-prepared] ARCHIVE SHA');
}
