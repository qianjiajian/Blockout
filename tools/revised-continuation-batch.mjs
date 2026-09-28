import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest, loadPreviewCore} from './revised-preview-validation-v160.mjs';
import {loadReviewedDesignSource, verifyReviewedDesign} from './revised-design-review-expanded-v190.mjs';
import * as liftAdapter from './revised-design-review-lifts-v110.mjs';
import * as starAdapter from './revised-design-review-stars-v110.mjs';
import * as starFlipAdapter from './revised-design-review-star-flip-v110.mjs';
import * as keyedIceAdapter from './revised-design-review-keyed-ice-v110.mjs';
import * as bombAdapter from './revised-design-review-bombs-v110.mjs';

export const GAMEPLAY_FIELDS = ['mechanismRules','width','height','playable','blocked','seams','gates','blocks',
  'flipDoors','coloredGrids','bombFailurePolicy','shutters','generators','elevators','conveyors'];
const INITIAL_IDS = [21,22,23,24,25,26,27,28,29,30,31,34,50,52,58,59,60,135,152];
const DATA = 'src/core/revisedContinuationLayouts.generated.ts';
const sha = p => digest(fs.readFileSync(p));
const read = (p, expected) => { if(expected)assert.equal(sha(p),expected.toLowerCase(),`Evidence drift ${p}`); return JSON.parse(fs.readFileSync(p)); };
const pick = level => Object.fromEntries(GAMEPLAY_FIELDS.filter(k => Object.hasOwn(level,k)).map(k=>[k,level[k]]));
const hashOf = value => (typeof value==='string'?value:value.sha256).toLowerCase();
const bind = (all,p,expected=sha(p)) => {
  assert.equal(sha(p),expected,`Evidence changed during verification ${p}`);
  if(all[p])assert.equal(all[p],expected,`Conflicting input snapshot ${p}`);
  all[p]=expected;
};
const tree = dir => fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>{
  const p=path.posix.join(dir,e.name);return e.isDirectory()?tree(p):[p];
});

export function checkHistoricalCandidateInputs(bindings) {
  const current={},historicalNonSourceDrift=[];
  for(const[p,b]of Object.entries(bindings??{})){
    const actual=sha(p),expected=hashOf(b);
    if(actual!==expected){
      // UI manifests are not competitor evidence. A new full art/model check and
      // new Pointer run are required; this never refreshes the archived proof.
      assert.equal(p,'src/game/artManifest.ts',`Candidate input changed ${p}`);
      historicalNonSourceDrift.push({path:p,expected,actual,revalidationRequired:true});
    }
    current[p]=actual;
  }
  return {current,historicalNonSourceDrift};
}

export async function continuationApi() {
  const helpers=await build({entryPoints:['tools/revised-continuation-batch.mjs'],bundle:true,write:false,
    format:'esm',platform:'node',packages:'external',metafile:true});
  const {api,inputs} = await loadPreviewCore();
  const bundle = await build({stdin:{contents:`export {LEVELS} from './src/core/levels.ts';
    export {levelStarTargets} from './src/core/levelStarConditions.ts';
    export {REVISED_CONTINUATION_LAYOUTS} from './src/core/revisedContinuationLayouts.generated.ts';`,resolveDir:process.cwd()},
    bundle:true,write:false,format:'esm',platform:'node',metafile:true});
  return {api, runtime:await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64')),
    inputs:[...new Set([...inputs,...Object.keys(bundle.metafile.inputs),...Object.keys(helpers.metafile.inputs),
      'docs/rules/manifest.json','docs/mechanism-rules-v1.10.0.md',...tree('public/assets/art')].filter(p=>p!=='<stdin>'))]};
}

export async function checkContinuationCandidate(item,api) {
  const raw = read(item.path,item.sha256);
  assert.equal(raw.level.id,item.levelId);
  assert(!INITIAL_IDS.includes(item.levelId) && item.levelId>=21 && item.levelId<=200 && item.levelId!==39);
  const {current,historicalNonSourceDrift}=checkHistoricalCandidateInputs(raw.bindings);
  const review=read(item.sourceReview.path,item.sourceReview.sha256);
  const adapter=reviewedSourceAdapter(review);
  const loaded=await adapter.loadReviewedDesignSource(item.sourceReview.path,item.sourceReview.sha256);
  const checked=adapter.verifyReviewedDesign(raw,loaded.source,api);
  checkCarrierRelations(raw.level,review);
  assert(checked.sourceAligned&&checked.outlineAligned&&checked.replay.complete&&checked.art.passed);
  const inputBindings={...current};bind(inputBindings,item.path,item.sha256.toLowerCase());
  for(const[p,b]of Object.entries(loaded.bindings))bind(inputBindings,p,hashOf(b));
  for(const[p,h]of Object.entries(inputBindings))bind(inputBindings,p,h);
  return {raw,loaded,checked,inputBindings,historicalNonSourceDrift,adapter};
}

export function reviewedSourceAdapter(review) {
  assert(!review.testFixtureOnly,'Synthetic fixture is not competitor source evidence');
  const m=review.sourceNormalizedFacts?.mechanisms;
  if(m?.bombs?.count>0)return bombAdapter;
  const keyedIceObservation=review.sourceInventory?.M14??review.sourceInventory?.numericIce;
  const explicitKeyedIce=(m?.keysLocks?.groups??[]).some(g=>g.frozenKeyValues?.length>0||g.frozenLockValues?.length>0)
    || keyedIceObservation?.keyedCount>0 || review.carrierRelations?.keyFrozenCount>0
    || (review.sourceFacts?.numericIce?.items??[]).some(i=>typeof i.keyGroup==='string');
  // Mixed positive families are intentionally rejected by this adapter's strict
  // base loader until their joint carrier metadata has a reviewed validator.
  if(explicitKeyedIce)return keyedIceAdapter;
  if(review.sourcePhysicalExits?.some(e=>e.kind==='flip'&&e.star))return starFlipAdapter;
  if(m?.starBlocks?.count>0 || m?.exits?.starCount>0)return starAdapter;
  return m?.elevators?.count>0
    ? liftAdapter : {loadReviewedDesignSource,verifyReviewedDesign};
}

export function checkCarrierRelations(level,review) {
  const relations=review.carrierRelations;
  if(!relations)return;
  assert(review.carrierRelationsEvidence?.reason&&review.carrierRelationsEvidence.paths?.length,'Carrier observations need explicit evidence');
  for(const p of review.carrierRelationsEvidence.paths)assert(review.bindings[p],'Unbound carrier evidence');
  const shell=b=>(b.layers?.length??0)>1;
  if(relations.lockedShellValues!==undefined)assert.deepEqual(level.blocks.filter(b=>shell(b)&&b.lockedBy)
    .map(b=>b.lockCount??1).sort((a,b)=>a-b),[...relations.lockedShellValues].sort((a,b)=>a-b),'Locked shell carrier association');
  if(relations.keyShellCount!==undefined)assert.equal(level.blocks.filter(b=>shell(b)&&b.keyId).length,relations.keyShellCount,'Key shell carrier association');
  for(const[key,predicate]of Object.entries({lockedFrozenCount:b=>b.lockedBy&&b.frozen>0,
    keyFrozenCount:b=>b.keyId&&b.frozen>0,axisFrozenCount:b=>b.movementAxis&&b.frozen>0})){
    if(relations[key]!==undefined)assert.equal(level.blocks.filter(predicate).length,relations[key],`Carrier association ${key}`);
  }
  if(relations.numericIceAxes!==undefined){
    const remaining=level.blocks.filter(b=>b.frozen>0).map(b=>({value:b.frozen,axis:b.movementAxis??'free'}));
    for(const pair of relations.numericIceAxes){
      const index=remaining.findIndex(actual=>actual.value===pair.value&&actual.axis===pair.axis);
      assert(index>=0,'Numeric ice axis carrier association');remaining.splice(index,1);
    }
  }
}

export async function prepareContinuationBatch(batchPath, output) {
  assert(verifyRulesLock().ok && verifyRulesLock().activeVersion==='1.10.0');
  const relative=path.relative(process.cwd(),path.resolve(output)).replaceAll('\\','/');
  assert(relative.startsWith('.codex-temp/remaining161-v110/'),'Use an isolated continuation directory');
  const batch=read(batchPath);assert.equal(batch.ruleVersion,'1.10.0');assert(batch.rows.length);
  assert.equal(new Set(batch.rows.map(r=>r.levelId)).size,batch.rows.length);
  const {api,runtime,inputs}=await continuationApi(), bindings=Object.fromEntries(inputs.map(p=>[p,sha(p)]));
  bind(bindings,batchPath);
  let prior;
  if(batch.previousArchive){
    await verifyContinuationBatch(batch.previousArchive.path,batch.previousArchive.sha256);
    prior=read(batch.previousArchive.path,batch.previousArchive.sha256);
  }
  assert(prior||Object.keys(runtime.REVISED_CONTINUATION_LAYOUTS).length===0,'Existing batches require pinned history');
  const layouts=structuredClone(runtime.REVISED_CONTINUATION_LAYOUTS),rows=prior?structuredClone(prior.rows):[];
  for(const item of batch.rows){
    assert(!layouts[item.levelId],'Existing additions must not be silently replaced');
    const {raw,checked,inputBindings}=await checkContinuationCandidate(item,api),previous=runtime.LEVELS[item.levelId-1];
    for(const[p,h]of Object.entries(inputBindings))bind(bindings,p,h);
    layouts[item.levelId]=pick(raw.level);
    rows.push({...item,drags:raw.drags,...(raw.timedRoute?{timedRoute:raw.timedRoute,timedRouteSha256:digest(raw.timedRoute)}:{}),layoutSha256:digest(layouts[item.levelId]),
      previous:{sha256:digest(previous),name:previous.name,timeSeconds:previous.timeSeconds,reward:previous.reward,
        featureIntro:previous.featureIntro,starTargets:runtime.levelStarTargets(previous)},
      sourceAligned:checked.sourceAligned,outlineAligned:checked.outlineAligned});
  }
  rows.sort((a,b)=>a.levelId-b.levelId);
  const before=fs.readFileSync(DATA,'utf8');
  const source=`// Generated from independently reviewed v1.10 continuation batches; routes remain in evidence.\n`+
    `import type { RevisedLevelLayout } from './revisedReviewedLayouts.generated';\n`+
    `export const REVISED_CONTINUATION_LAYOUTS: Record<number, RevisedLevelLayout> = {\n`+
    Object.entries(layouts).map(([id,l])=>`  ${id}: ${JSON.stringify(l)},`).join('\n')+'\n};\n';
  fs.mkdirSync(output,{recursive:true});
  const archive={ruleVersion:'1.10.0',batchPath,batchSha256:sha(batchPath),rows,bindings,
    ...(batch.previousArchive?{previousArchive:batch.previousArchive}:{}),
    before:prior?.before??runtime.LEVELS.map(level=>({levelId:level.id,sha256:digest(level),starTargets:runtime.levelStarTargets(level)})),
    initialFormalIds:INITIAL_IDS,previousContinuationIds:Object.keys(runtime.REVISED_CONTINUATION_LAYOUTS).map(Number),
    expectedContinuationIds:Object.keys(layouts).map(Number),oldDataSha256:digest(before),expectedDataSha256:digest(source),
    lowerBoundCertified:false,timeAndStarsCalibrated:false,releaseApproved:false};
  fs.writeFileSync(path.join(output,'adoption.json'),JSON.stringify(archive,null,2)+'\n',{flag:'wx'});
  fs.writeFileSync(path.join(output,'data.patch'),'*** Begin Patch\n*** Update File: '+DATA+'\n@@\n'+
    before.trimEnd().split(/\r?\n/).map(line=>'-'+line).join('\n')+'\n'+source.trimEnd().split('\n').map(line=>'+'+line).join('\n')+'\n*** End Patch\n',{flag:'wx'});
  for(const [p,h]of Object.entries(bindings))assert.equal(sha(p),h,'Concurrent input drift '+p);
  return {ids:rows.map(r=>r.levelId),archive:path.join(output,'adoption.json'),archiveSha256:sha(path.join(output,'adoption.json')),patch:path.join(output,'data.patch')};
}

export async function verifyContinuationBatch(archivePath, expectedSha) {
  assert.match(expectedSha,/^[a-f0-9]{64}$/i,'Pin the pre-adoption archive independently');
  assert(verifyRulesLock().ok&&verifyRulesLock().activeVersion==='1.10.0');
  const archive=read(archivePath,expectedSha);read(archive.batchPath,archive.batchSha256);
  if(archive.previousArchive){
    const previous=read(archive.previousArchive.path,archive.previousArchive.sha256);
    assert.deepEqual(archive.before,previous.before,'Cumulative baseline must retain all original level hashes');
    for(const row of previous.rows)assert.deepEqual(archive.rows.find(r=>r.levelId===row.levelId),row,'Previous evidence must stay byte-semantically identical');
  }
  const {api,runtime,inputs}=await continuationApi();
  const fingerprints=Object.fromEntries(inputs.map(p=>[p,sha(p)])),ids=archive.rows.map(r=>r.levelId),rows=[];
  let chain={path:archivePath,sha256:expectedSha},child;
  const visited=new Set();
  while(chain){
    assert(!visited.has(chain.path),'Archive chain cycle');visited.add(chain.path);
    bind(fingerprints,chain.path,chain.sha256.toLowerCase());
    const node=read(chain.path,chain.sha256);bind(fingerprints,node.batchPath,node.batchSha256);
    if(child){
      assert.deepEqual(child.before,node.before,'Historical baseline changed');
      for(const row of node.rows)assert.deepEqual(child.rows.find(r=>r.levelId===row.levelId),row,'Historical adopted evidence changed');
    }
    child=node;
    chain=node.previousArchive;
  }
  assert.equal(sha(DATA),archive.expectedDataSha256,'Generated runtime table must equal the reviewed patch');
  assert.deepEqual(Object.keys(runtime.REVISED_CONTINUATION_LAYOUTS).map(Number),archive.expectedContinuationIds);
  for(const row of archive.rows){
    const {raw,loaded,inputBindings,historicalNonSourceDrift,adapter}=await checkContinuationCandidate(row,api),level=runtime.LEVELS[row.levelId-1];
    for(const[p,h]of Object.entries(inputBindings))bind(fingerprints,p,h);
    assert.deepEqual(pick(level),pick(raw.level));assert.equal(digest(pick(level)),row.layoutSha256);
    for(const key of ['name','timeSeconds','reward','featureIntro'])assert.deepEqual(level[key],row.previous[key],`Old metadata ${key}`);
    assert.deepEqual(runtime.levelStarTargets(level),row.previous.starTargets);
    const allowed=new Set([...GAMEPLAY_FIELDS,'id','name','difficulty','timeSeconds','reward','parMoves','featureIntro']);
    assert.deepEqual(Object.keys(level).filter(k=>!allowed.has(k)),[],'Retired geometry/certificates leaked');
    const position=level.id%10;assert.equal(level.difficulty,position===0?'super':[3,5,8].includes(position)?'hard':'normal');
    const timedRoute=formalTimedRoute(row,raw,level);
    const checked=adapter.verifyReviewedDesign({level,drags:row.drags,...(timedRoute?{timedRoute}:{})},loaded.source,api);
    rows.push({...checked,ruleVersion:'1.10.0',formalLevelSha256:digest(level),originalMetadataPreserved:true,historicalNonSourceDrift});
  }
  for(const old of archive.before)if(!ids.includes(old.levelId)){
    assert.equal(digest(runtime.LEVELS[old.levelId-1]),old.sha256,`Out-of-batch Lv${old.levelId} drift`);
    assert.deepEqual(runtime.levelStarTargets(runtime.LEVELS[old.levelId-1]),old.starTargets);
  }
  for(const [p,h]of Object.entries(fingerprints))assert.equal(sha(p),h,'Concurrent runtime input drift '+p);
  return {ruleVersion:'1.10.0',status:'passed-model-not-ui',archivePath,archiveSha256:expectedSha,rows,
    unchanged:200-ids.length,inputs:fingerprints,formalIds:runtime.LEVELS.filter(l=>l.mechanismRules).map(l=>l.id),
    campaignSemanticSha256:digest(runtime.LEVELS),pointerValidated:false,naturalClockValidated:false,
    lowerBoundCertified:false,timeAndStarsCalibrated:false,releaseApproved:false};
}

/** Only approved formal metadata changes the level hash. Preserve every timed
 * input and delay exactly, then independently replay against the OLD time limit. */
export function formalTimedRoute(row,raw,level){
  if(!raw.level.blocks.some(b=>b.timedBombSeconds!==undefined)){
    assert(!raw.timedRoute&&!row.timedRoute&&!row.timedRouteSha256,'Unexpected timed proof on an ordinary archive row');
    return undefined;
  }
  assert(raw.timedRoute&&row.timedRoute&&row.timedRouteSha256,'Bomb archive must preserve its full timing witness');
  assert.deepEqual(row.drags,raw.drags,'Archived spatial route changed');
  assert.deepEqual(row.timedRoute,raw.timedRoute,'Archived timing schedule changed');
  assert.equal(digest(row.timedRoute),row.timedRouteSha256,'Archived timing SHA changed');
  assert.equal(row.timedRoute.levelSha256,digest(raw.level),'Original timed level identity changed');
  assert.deepEqual(pick(level),pick(raw.level),'Formal timed geometry must remain identical');
  return{...structuredClone(row.timedRoute),levelSha256:digest(level)};
}

if(import.meta.url===pathToFileURL(process.argv[1]??'').href){
  const [command,p,arg]=process.argv.slice(2);
  if(command==='prepare')console.log(JSON.stringify(await prepareContinuationBatch(p,arg)));
  else if(command==='verify'){
    const report=await verifyContinuationBatch(p,arg),output=path.join(path.dirname(p),'verification-'+Date.now()+'.json');
    fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
    console.log(JSON.stringify({status:report.status,ids:report.rows.map(r=>r.levelId),formal:report.formalIds.length,output}));
  }else throw Error('Usage: prepare <batch.json> <isolated-output> | verify <archive.json> <archive-sha256>');
}
