import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest, loadPreviewCore, measureDesignFacts} from './revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {replayTimedRoute, TIMED_ROUTE_CLOCK_ORIGIN, TIMED_ROUTE_POINTER_POLICY} from './revised-timed-route-v110.mjs';
import {GAMEPLAY_FIELDS} from './revised-continuation-batch.mjs';
import {emitContinuationSource} from './revised-continuation-batch-v111.mjs';

export const REMAKE_IDS = Object.freeze([32,35,43,70,90,108,111,115,121,122,125,129,130,136,137,142,144,150,151,153,156,159,162,163,181,185,189,190,191,196]);
export const DATA_PATH = 'src/core/revisedContinuationLayouts.generated.ts';
const INITIAL_DATA_SHA = 'f13232d3cb9b703de97d0aa4851813c9521b2f60e7bcbafd87266d76d488be6e';
const INITIAL_CAMPAIGN_SHA = 'ada489609e3fe6a0b62d9c0ded4cedcd0431cdb2d8470b83275e7c15be49a72d';
const ORIGIN = 'independent-original-remake';
const sha = p => digest(fs.readFileSync(p));
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const pick = level => Object.fromEntries(GAMEPLAY_FIELDS.filter(k=>Object.hasOwn(level,k)).map(k=>[k,level[k]]));
const write = (p, v) => fs.writeFileSync(p, typeof v === 'string' ? v : JSON.stringify(v,null,2)+'\n', {flag:'wx'});
const ruleGate = () => {
  const lock=verifyRulesLock(); assert(lock.ok,lock.errors.join('\n'));
  assert.equal(lock.activeVersion,'1.12.0'); return lock;
};

export function checkRemakeBindings(bindings,{appliedDataSha256}={}) {
  assert(bindings && Object.keys(bindings).length,'Candidate must bind construction/runtime inputs');
  const transitions=[];
  for(const [p,value]of Object.entries(bindings)) {
    const expected=typeof value==='string'?value:value.sha256;
    assert.match(expected,/^[a-f0-9]{64}$/i,`Invalid binding ${p}`);
    const actual=sha(p);
    if(p===DATA_PATH && appliedDataSha256 && expected.toLowerCase()===INITIAL_DATA_SHA && actual===appliedDataSha256) {
      transitions.push({path:p,from:expected.toLowerCase(),to:actual,reason:'This exact 30-level adoption; fresh final-runtime replay required'});
    } else assert.equal(actual,expected.toLowerCase(),`Candidate input drift ${p}`);
  }
  return transitions;
}

export function assertRemakeBaseline(baseline,api,{current=false}={}) {
  assert.equal(baseline.ruleVersion,'1.12.0');assert.deepEqual(baseline.scope,REMAKE_IDS);
  assert.equal(baseline.dataSha256,INITIAL_DATA_SHA);
  assert.equal(baseline.campaignSemanticSha256,INITIAL_CAMPAIGN_SHA);
  assert.deepEqual(baseline.levels.map(r=>r.level.id),Array.from({length:200},(_,i)=>i+1));
  assert.equal(digest(baseline.levels.map(r=>r.level)),INITIAL_CAMPAIGN_SHA,'Baseline levels were altered');
  for(const r of baseline.levels) {
    assert.equal(digest(r.level),r.sha256,'Baseline row SHA');
    assert.deepEqual(api.levelStarTargets(r.level),r.starTargets,'Baseline actual star targets');
  }
  if(current) {
    assert.deepEqual(baseline.levels.map(r=>r.level),JSON.parse(JSON.stringify(api.LEVELS)),'Baseline differs from current campaign');
    assert.deepEqual(baseline.layouts,api.REVISED_CONTINUATION_LAYOUTS,'Baseline layout table changed');
  }
}

export async function loadRemakeApi() {
  const core=await loadPreviewCore();
  const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`
    export {LEVELS} from './src/core/levels.ts';
    export {REVISED_CONTINUATION_LAYOUTS} from './src/core/revisedContinuationLayouts.generated.ts';
    export {levelStarTargets} from './src/core/levelStarConditions.ts';
    export {finalGeneratorPlacementIssues} from './src/core/finalGeneratorContracts.ts';
    export {validateGeneratorMouthSpawn} from './src/core/generatorMouthSpawnGeometry.ts';`},
    bundle:true,write:false,metafile:true,format:'esm',platform:'node'});
  const runtime=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
  return {api:{...core.api,...runtime},inputs:[...new Set([...core.inputs,...Object.keys(bundle.metafile.inputs)].filter(p=>p!=='<stdin>'))]};
}

// Only absence of competitor evidence is inapplicable to independently authored
// v1.12 designs. No fabricated source facts and no layout/mechanism suppression.
const SOURCE_NOT_APPLICABLE = new Set(['missing-source-reference','missing-source-hash','missing-seed',
  'missing-source-number','incomplete-source-inventory','originality-unverified']);
export function auditOriginalLayout(level, api) {
  assert(REMAKE_IDS.includes(level.id),'Level outside the explicit 30-level remake');
  const oldAudit=api.auditRevisedCandidate(level,undefined);
  const issues=oldAudit.issues.filter(i=>!(i.category==='source' && SOURCE_NOT_APPLICABLE.has(i.code)));
  const coverage=auditOpeningCoverage(new api.PuzzleModel(structuredClone(level)).snapshot());
  const spans=auditGateSpanLimits(level),art=api.auditCandidateBlockArt(level);
  const generators=api.finalGeneratorPlacementIssues(level);
  for(const g of level.generators??[]) for(const id of g.queueBlockIds) {
    const b=level.blocks.find(b=>b.id===id);
    assert(b,`Missing cargo ${id}`);
    const result=api.validateGeneratorMouthSpawn(g,g.spawn,b.shape,level);
    if(result.status!=='ok')generators.push(`${g.id}/${id}: ${result.reason}`);
  }
  const legacy=(level.shutters??[]).filter(s=>s.skin && !['shutter','lift'].includes(s.skin));
  if(legacy.length)issues.push({code:'legacy-staging'});
  if(level.elevators?.length || level.conveyors?.length)issues.push({code:'legacy-moving-geometry'});
  if((level.generators??[]).some(g=>g.trigger==='time' || g.trigger==='move'))issues.push({code:'legacy-generator-trigger'});
  if(level.blocks.some(b=>b.rotationBadge))issues.push({code:'legacy-rotation-badge'});
  return {passed:issues.length===0 && coverage.passed && spans.passed && art.passed && !generators.length,
    issues,coverage,spans,art,generators,measurements:oldAudit.measurements,
    competitorAlignment:'not-applicable-independent-original',releaseApproved:false};
}

/** A positive-time model schedule, not a human/animation duration certificate. */
export function makeTimedPlan(level,drags,{sampleSeconds=.12,betweenDragsSeconds=.65}={}) {
  let atSeconds=0;
  const events=[];
  const add=(type,dtSeconds,extra={})=>events.push({type,dtSeconds,atSeconds:atSeconds+=dtSeconds,...extra});
  for(const [index,drag] of drags.entries()) {
    add('down',sampleSeconds,{blockId:drag.blockId});
    for(const anchor of drag.path)add('move',sampleSeconds,{anchor});
    add('up',sampleSeconds);
    if(index<drags.length-1)add('wait',betweenDragsSeconds);
  }
  return {schemaVersion:1,levelSha256:digest(level),clockOrigin:TIMED_ROUTE_CLOCK_ORIGIN,
    pointerPolicy:TIMED_ROUTE_POINTER_POLICY,durationSeconds:atSeconds,events};
}

export function checkOriginalCandidate(raw,api,{level=raw.level,appliedDataSha256}={}) {
  assert.equal(raw.ruleVersion,'1.12.0'); assert.equal(raw.designOrigin,ORIGIN);
  const candidateInputTransitions=checkRemakeBindings(raw.bindings,{appliedDataSha256});
  assert(raw.designSpec && typeof raw.designSpec==='object','Missing authored design specification');
  const spec=raw.designSpec;
  assert(typeof (raw.seed??spec.seed)==='string','Missing construction seed');
  assert(typeof spec.theme==='string' && spec.theme.length>0,'Missing design theme');
  assert(Array.isArray(raw.drags) && raw.drags.length,'Missing full route');
  assert.equal(raw.level.id,level.id); assert.deepEqual(pick(raw.level),pick(level));
  const audit=auditOriginalLayout(level,api);
  assert(audit.passed,`Lv${level.id} invalid: ${JSON.stringify({issues:audit.issues,coverage:audit.coverage.issues,spans:audit.spans.issues,art:audit.art,generators:audit.generators})}`);
  assert.equal(spec.width,level.width,'Design width changed');assert.equal(spec.height,level.height,'Design height changed');
  assert.equal(spec.openingBlockCount??spec.openingCount,audit.measurements.openingBlockCount,'Design opening count changed');
  assert.equal(spec.fullBlockCount??spec.fullCount,level.blocks.length,'Design full count changed');
  const expectedInventory=spec.mechanisms?.generatorQueueLengths!==undefined
    ? api.measureRevisedMechanismInventory(level) : measureDesignFacts(level,api).mechanisms;
  assert.deepEqual(spec.mechanisms,expectedInventory,'Original authored mechanism specification changed');
  // Bombs must never be cleared/removed to pass the spatial-only verifier.
  const spatial=level.blocks.some(b=>b.timedBombSeconds!==undefined)?null:api.replayRevisedRoute(level,raw.drags);
  if(spatial)assert(spatial.valid && spatial.complete,`Lv${level.id} incomplete spatial route: ${JSON.stringify(spatial)}`);
  if(raw.timedRoute)assert.equal(raw.timedRoute.levelSha256,digest(raw.level),'Candidate timing identity changed');
  const timedRoute=raw.timedRoute?{...structuredClone(raw.timedRoute),levelSha256:digest(level)}:makeTimedPlan(level,raw.drags);
  const timed=replayTimedRoute(level,timedRoute,api,{expectedDrags:raw.drags});
  assert(timed.valid && timed.complete && timed.modelTimeValidated,`Lv${level.id} timed replay: ${timed.error}`);
  return {audit,spatial,timedRoute,timed,candidateInputTransitions,competitorAlignment:false,lowerBoundCertified:false,
    pointerValidated:false,naturalClockValidated:false,timeAndStarsCalibrated:false,releaseApproved:false};
}

export function formalFromOriginal(raw,old,api) {
  const position=old.id%10,stars=api.levelStarTargets(old);
  const formal={...pick(raw.level),id:old.id,name:old.name,
    difficulty:position===0?'super':[3,5,8].includes(position)?'hard':'normal',
    timeSeconds:old.timeSeconds,reward:old.reward,parMoves:stars.moveTarget};
  assert.deepEqual(api.levelStarTargets(formal),stars,`Lv${old.id} actual old star targets changed`);
  return formal;
}

export async function captureRemakeBaseline(output) {
  const lock=ruleGate(); assert.equal(sha(DATA_PATH),INITIAL_DATA_SHA,'Unexpected pre-remake data');
  const {api,inputs}=await loadRemakeApi();
  assert.equal(api.LEVELS.length,200);
  assert.equal(api.LEVELS.filter(l=>l.id>=21 && l.mechanismRules==='revised-2026-09-21-v1.2').length,150);
  assert.deepEqual(api.LEVELS.filter(l=>l.id>=21 && l.mechanismRules!=='revised-2026-09-21-v1.2').map(l=>l.id),REMAKE_IDS);
  const baseline={schemaVersion:1,ruleVersion:'1.12.0',createdAt:new Date().toISOString(),lock,
    scope:REMAKE_IDS,dataSha256:sha(DATA_PATH),campaignSemanticSha256:digest(api.LEVELS),
    levels:api.LEVELS.map(level=>({level,sha256:digest(level),starTargets:api.levelStarTargets(level)})),
    layouts:api.REVISED_CONTINUATION_LAYOUTS,inputs:Object.fromEntries(inputs.map(p=>[p,sha(p)]))};
  fs.mkdirSync(path.dirname(output),{recursive:true});write(output,baseline);
  return {path:output,sha256:sha(output),campaignSemanticSha256:baseline.campaignSemanticSha256};
}

export async function prepareOriginalBatch(baselinePath,candidatePaths,output) {
  ruleGate(); const baseline=json(baselinePath),{api,inputs}=await loadRemakeApi();
  assertRemakeBaseline(baseline,api,{current:true});
  assert.equal(sha(DATA_PATH),baseline.dataSha256,'Production changed since baseline');
  assert.equal(digest(api.LEVELS),baseline.campaignSemanticSha256,'Campaign changed since baseline');
  const records=candidatePaths.map(p=>({path:p,raw:json(p)})).sort((a,b)=>a.raw.level.id-b.raw.level.id);
  assert.deepEqual(records.map(r=>r.raw.level.id),REMAKE_IDS,'All 30 original designs required');
  const rows=[],layouts=structuredClone(baseline.layouts);
  for(const {path:p,raw} of records) {
    assert(!Object.hasOwn(layouts,raw.level.id),'Do not overwrite previous completed designs');
    const formal=formalFromOriginal(raw,baseline.levels[raw.level.id-1].level,api);
    const checked=checkOriginalCandidate(raw,api,{level:formal});
    layouts[formal.id]=pick(formal);
    rows.push({levelId:formal.id,path:p,candidateSha256:sha(p),formal,formalSha256:digest(formal),
      designSpec:raw.designSpec,drags:raw.drags,checked});
    console.log(`prepared Lv${formal.id}: ${raw.drags.length} drags, ${checked.timed.activeElapsedSeconds.toFixed(2)}s model`);
  }
  const emitted=emitContinuationSource(layouts); // Pure type-safe emitter; no old rule gate/certificates.
  const before=fs.readFileSync(DATA_PATH,'utf8'),eol=before.includes('\r\n')?'\r\n':'\n';
  const lines=before.trimEnd().split(/\r?\n/);
  assert.equal(lines.at(-1),'};');
  const newHeader='// Preserved v1.10/v1.11 designs plus 30 independent-original v1.12 remakes.';
  const additions=rows.map(r=>`  ${r.levelId}: ${JSON.stringify(layouts[r.levelId])},`);
  const source=[newHeader,...lines.slice(1,-1),...additions,'};',''].join(eol);
  const patch=`*** Begin Patch\n*** Update File: ${DATA_PATH}\n@@\n-${lines[0]}\n+${newHeader}\n@@\n-};\n${additions.map(l=>'+'+l).join('\n')}\n+};\n*** End Patch\n`;
  const predicted=baseline.levels.map(row=>rows.find(r=>r.levelId===row.level.id)?.formal??row.level);
  const archive={schemaVersion:1,ruleVersion:'1.12.0',designOrigin:ORIGIN,createdAt:new Date().toISOString(),
    baselinePath,baselineSha256:sha(baselinePath),beforeDataSha256:baseline.dataSha256,
    expectedDataSha256:digest(source),expectedCampaignSha256:digest(predicted),expectedLayoutSha256:emitted.layoutSemanticSha256,
    validationBindings:Object.fromEntries([...new Set([...inputs,'tools/revised-original-remake-v112.mjs',
      'tools/revised-timed-route-v110.mjs','tools/revised-preview-validation-v160.mjs',
      'tools/revised-opening-coverage.mjs','tools/revised-gate-span-limits.mjs',
      'tools/revised-continuation-batch-v111.mjs','tools/revised-continuation-batch.mjs','tools/verify-rules-lock.mjs',
      'docs/rules/manifest.json','docs/mechanism-rules-v1.12.0.md'])].filter(p=>p!==DATA_PATH).map(p=>[p,sha(p)])),
    rows,notRemadeLevelCount:170,lowerBoundCertified:false,pointerValidated:false,naturalClockValidated:false,
    timeAndStarsCalibrated:false,releaseApproved:false};
  fs.mkdirSync(output,{recursive:true}); write(path.join(output,'adoption.json'),archive);
  write(path.join(output,'apply.patch'),patch);write(path.join(output,'expected-source.ts'),source);
  return {path:path.join(output,'adoption.json'),sha256:sha(path.join(output,'adoption.json')),ids:REMAKE_IDS};
}

export async function verifyOriginalBatch(archivePath,expectedSha) {
  ruleGate();assert.equal(sha(archivePath),expectedSha,'Adoption evidence changed');
  const archive=json(archivePath),baseline=json(archive.baselinePath);
  assert.equal(archive.ruleVersion,'1.12.0');assert.equal(sha(archive.baselinePath),archive.baselineSha256);
  assert.equal(sha(DATA_PATH),archive.expectedDataSha256,'Applied source differs');
  checkRemakeBindings(archive.validationBindings);
  const {api,inputs}=await loadRemakeApi();
  assertRemakeBaseline(baseline,api);
  assert.equal(digest(api.LEVELS),archive.expectedCampaignSha256,'Final LEVELS differ');
  assert.equal(digest(api.REVISED_CONTINUATION_LAYOUTS),archive.expectedLayoutSha256);
  assert.deepEqual(archive.rows.map(r=>r.levelId),REMAKE_IDS);
  for(const old of baseline.levels)if(!REMAKE_IDS.includes(old.level.id)) {
    assert.equal(digest(api.LEVELS[old.level.id-1]),old.sha256,`Unrelated Lv${old.level.id} changed`);
    assert.deepEqual(api.levelStarTargets(api.LEVELS[old.level.id-1]),old.starTargets);
  }
  const rows=[];
  for(const row of archive.rows) {
    assert.equal(sha(row.path),row.candidateSha256);
    const raw=json(row.path),formal=api.LEVELS[row.levelId-1];
    assert.deepEqual(formal,row.formal);
    assert.deepEqual(api.levelStarTargets(formal),baseline.levels[row.levelId-1].starTargets);
    const checked=checkOriginalCandidate(raw,api,{level:formal,appliedDataSha256:archive.expectedDataSha256});
    rows.push({levelId:row.levelId,formalSha256:digest(formal),...checked});
  }
  return {status:'PASS',ruleVersion:'1.12.0',campaignLevels:200,revisedLevels:180,newFormalLevels:30,
    unrelatedLevelsUnchanged:170,campaignSemanticSha256:digest(api.LEVELS),dataSha256:sha(DATA_PATH),
    bindings:Object.fromEntries(inputs.map(p=>[p,sha(p)])),rows,lowerBoundCertified:false,
    pointerValidated:false,naturalClockValidated:false,timeAndStarsCalibrated:false,releaseApproved:false};
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href) {
  const [command,p,arg,out]=process.argv.slice(2);
  if(command==='baseline')console.log(JSON.stringify(await captureRemakeBaseline(p)));
  else if(command==='check') {
    const {api}=await loadRemakeApi(),result=checkOriginalCandidate(json(p),api);
    console.log(JSON.stringify({passed:true,id:json(p).level.id,drags:result.timed.effectiveDrags,seconds:result.timed.activeElapsedSeconds}));
  } else if(command==='prepare')console.log(JSON.stringify(await prepareOriginalBatch(p,json(arg),out)));
  else if(command==='verify') {
    const report=await verifyOriginalBatch(p,arg),target=out??path.join(path.dirname(p),'verification.json');
    write(target,report);console.log(JSON.stringify({status:report.status,formal:report.revisedLevels,new:30,unchanged:170,path:target}));
  } else throw Error('Usage: baseline output | check candidate | prepare baseline paths.json output-dir | verify archive sha [report]');
}
