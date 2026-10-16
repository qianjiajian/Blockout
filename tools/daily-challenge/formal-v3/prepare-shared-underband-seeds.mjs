import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,designFingerprints,createAttemptLedger,importFailedAttempt} from './bounded-proof.mjs';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';

// Archival conversion only. This imports already completed failures, and never
// calls a solver or turns a historical primitive into an accepted certificate.
const [inspectionFile,output]=process.argv.slice(2);
assert(inspectionFile&&output,'Usage: prepare-shared-underband-seeds.mjs INSPECTION_REPORT NEW_OUTPUT_DIRECTORY');
assert(!fs.existsSync(output),'Preserve all earlier output');
const ledgerDirectory='deliverables/daily-formal-v3-20261008/proof/attempts';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const sha=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const bind=p=>({path:p.replaceAll('\\','/'),sha256:sha(p)});
const write=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
const inspection=read(inspectionFile),inspectionBinding=bind(inspectionFile);
assert(['THIRTY_OR_MORE_READ_ONLY_REDESIGN_REFERENCES','READ_ONLY_REFERENCE_BATCH_READY','READ_ONLY_REFERENCE_SHORTFALL'].includes(inspection.status));
assert.equal(inspection.safety.newSolverSearches,0);
const runtime=await loadBoundedRuntime();
assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
const core=bind('tools/daily-challenge/formal-v3/bounded-proof.mjs');

// Verify all existing bytes and identities before beginning the ledger import.
const prepared=inspection.selected.map(record=>{
  for(const b of [record,record.historicalFailedAttempt.request,record.historicalFailedAttempt.result])assert.equal(sha(b.path),b.sha256,`Changed historical file: ${b.path}`);
  const candidate=read(record.path),oldRequest=read(record.historicalFailedAttempt.request.path),oldResult=read(record.historicalFailedAttempt.result.path);
  assert.equal(candidate.accepted,false);assert.equal(candidate.proof.accepted,false);assert.equal(oldResult.accepted,false);
  assert.equal(levelSha256(candidate.level),record.levelSha256);
  assert.equal(levelSha256(oldResult.level),record.levelSha256);
  assert.equal(oldRequest.levelSha256,record.levelSha256);
  assert.equal(candidate.proof.attempt.id,oldRequest.id);assert.equal(oldResult.attempt.id,oldRequest.id);
  const drags=candidate.drags??candidate.proof.drags??oldResult.lower.drags;
  assert.equal(routeSha256(drags),record.routeSha256);
  assert.deepEqual(candidate.proof.lower,oldResult.lower,'Primitive must be the original completed search');
  assert.equal(oldResult.lower.cost,record.U);assert(record.U>=12&&record.U<=15);
  for(const key of ['discoveredStates','exploredStates','attemptedTransitions'])assert(Number.isSafeInteger(oldResult.lower[key]),`Original accounting required: ${key}`);
  for(const replay of [record.canonicalReplay,record.independentReplay]){
    assert(replay.valid&&replay.complete&&!replay.failed);assert.equal(replay.nonClearingDrags,record.U);
  }
  const fingerprints=designFingerprints(candidate.level);
  assert.deepEqual(fingerprints,record.currentDailyFingerprints);
  return{record,candidate,drags,oldRequest,oldResult,fingerprints,identity:levelSha256({shapeSha256:fingerprints.shapeSha256,colorSha256:fingerprints.colorSha256})};
});
assert(prepared.length<=30);
assert.equal(new Set(prepared.map(x=>x.record.sourceLevelId)).size,prepared.length);

// Run only the existing compatibility migration, before detecting aliases.
// It creates missing immutable identity sidecars; it does not claim candidates.
await createAttemptLedger(ledgerDirectory);
for(const item of prepared){
  const identityFile=`${ledgerDirectory}/identities/${item.identity}.json`;
  if(!fs.existsSync(identityFile))continue;
  const identity=read(identityFile),ids=[identity.origin,...(identity.legacyAttemptIds??[])];
  const matched=ids.map(id=>{
    const requestPath=`${ledgerDirectory}/${id}.request.json`,resultPath=`${ledgerDirectory}/${id}.result.json`;
    if(!fs.existsSync(requestPath)||!fs.existsSync(resultPath))return null;
    const request=read(requestPath),result=read(resultPath);
    if(result.accepted!==false||request.shapeSha256!==item.fingerprints.shapeSha256||request.colorSha256!==item.fingerprints.colorSha256)return null;
    return{id,requestPath,resultPath,request,result};
  }).filter(Boolean).sort((a,b)=>Number(b.request.levelSha256===item.record.levelSha256)-Number(a.request.levelSha256===item.record.levelSha256));
  assert(matched.length,'Existing identity has no reusable completed failure; do not reclaim or overwrite it');
  assert(fs.existsSync(`${ledgerDirectory}/identities/${item.identity}.blocked.json`),'Existing failure must retain its blocked identity');
  item.reuse=matched[0];
}

fs.mkdirSync(output,{recursive:false});fs.mkdirSync(`${output}/archive`);fs.mkdirSync(`${output}/seeds`);
const mappings=[],seedFiles=[];
for(const [index,item]of prepared.entries()){
  const {record,candidate,drags,oldRequest,oldResult,fingerprints,identity}=item;
  const archive=`${output}/archive/source-${String(record.sourceLevelId).padStart(3,'0')}`;fs.mkdirSync(archive);
  const snapshots={};
  for(const [kind,original]of [['candidate',record.path],['request',record.historicalFailedAttempt.request.path],['result',record.historicalFailedAttempt.result.path]]){
    const destination=`${archive}/${kind}.json`;fs.copyFileSync(original,destination,fs.constants.COPYFILE_EXCL);
    assert.equal(sha(destination),sha(original));snapshots[kind]={original:bind(original),archive:bind(destination)};
  }
  let publicId=item.reuse?.id,imported=null;
  if(!item.reuse){
    imported=await importFailedAttempt(ledgerDirectory,{accepted:false,level:candidate.level,levelSha256:candidate.levelSha256,proof:oldResult.lower},snapshots.result.original.path);
    publicId=imported.id;
  }
  const requestPath=`${ledgerDirectory}/${publicId}.request.json`,resultPath=`${ledgerDirectory}/${publicId}.result.json`;
  const request=read(requestPath),result=read(resultPath);
  assert.equal(result.accepted,false);assert.equal(request.shapeSha256,fingerprints.shapeSha256);assert.equal(request.colorSha256,fingerprints.colorSha256);
  const identityPath=`${ledgerDirectory}/identities/${identity}.json`,blockedPath=`${ledgerDirectory}/identities/${identity}.blocked.json`;
  assert(fs.existsSync(blockedPath));
  if(imported){
    assert.equal(request.levelSha256,record.levelSha256);assert.equal(result.levelSha256,record.levelSha256);
    const {historicalSourceFile,...primitive}=result.lower;
    assert.equal(historicalSourceFile,snapshots.result.original.path);assert.deepEqual(primitive,oldResult.lower,'Preserve all old accounting, including missing raw fields');
    assert.equal(Object.hasOwn(primitive,'rawFullBoardStates'),Object.hasOwn(oldResult.lower,'rawFullBoardStates'));
  }
  const sourceLedger={originalAttemptId:oldRequest.id,originalLevelSha256:record.levelSha256,snapshots,
    publicRequest:bind(requestPath),publicResult:bind(resultPath),publicIdentity:bind(identityPath),publicBlocked:bind(blockedPath),
    publicParentId:publicId,mode:imported?'IMPORTED_EXISTING_HISTORICAL_FAILURE':'REUSED_COMPLETED_PUBLIC_FAILURE',
    primitiveAccountingSource:'original league result.lower, unchanged; no raw values inferred',originalRawAccountingAvailable:Object.hasOwn(oldResult.lower,'rawFullBoardStates')};
  const seed={schemaVersion:3,status:'ARCHIVED_UNDERBAND_REDESIGN_SEED_NOT_ACCEPTED',accepted:false,formalReady:false,
    sourceLevelId:record.sourceLevelId,sourceLevelSha256:candidate.sourceLevelSha256,
    level:candidate.level,levelSha256:record.levelSha256,drags,routeSha256:record.routeSha256,
    L:null,U:record.U,upperMeaning:'Known complete route upper bound only; not a certified lower bound or optimality claim.',
    proof:candidate.proof,historicalPrimitiveProof:oldResult.lower,
    replay:record.canonicalReplay,independentReplay:record.independentReplay,
    attempt:request,redesignParentId:publicId,currentDailyFingerprints:fingerprints,sourceLedger,
    provenance:{strategy:'archived-league-underband-reference-for-new-shapes-and-colours',originalCandidate:snapshots.candidate.original,
      inspection:inspectionBinding,originalProvenance:candidate.provenance},
    replayEvidenceFromInspection:true,newSearchInvocations:0,requiresActualNewShapesAndColours:true,originalInputMustNotBeSearchedAgain:true};
  const file=`${output}/seeds/candidate-${String(index).padStart(3,'0')}.json`;write(file,seed);seedFiles.push(file);
  assert.equal(levelSha256(seed.level),candidate.levelSha256);assert.deepEqual(seed.proof,candidate.proof);assert.deepEqual(seed.drags,drags);
  mappings.push({seed:bind(file),sourceLevelId:record.sourceLevelId,levelSha256:record.levelSha256,U:record.U,L:null,redesignParentId:publicId,...sourceLedger});
  console.log(JSON.stringify({source:record.sourceLevelId,U:record.U,parent:publicId,mode:sourceLedger.mode}));
}
for(const item of prepared)for(const b of [item.record,item.record.historicalFailedAttempt.request,item.record.historicalFailedAttempt.result])assert.equal(sha(b.path),b.sha256,'Original failure bytes changed');
assert.equal(sha(core.path),core.sha256);assert.equal(sha(inspectionFile),inspectionBinding.sha256);
const report={schemaVersion:1,status:'HISTORICAL_FAILURES_BLOCKED_AND_SEEDS_ARCHIVED',formalReady:false,
  inputInspection:inspectionBinding,script:bind('tools/daily-challenge/formal-v3/prepare-shared-underband-seeds.mjs'),proofCore:core,proofToolchainSha256:runtime.toolchainSha256,
  count:mappings.length,importedCount:mappings.filter(x=>x.mode==='IMPORTED_EXISTING_HISTORICAL_FAILURE').length,
  reusedCount:mappings.filter(x=>x.mode==='REUSED_COMPLETED_PUBLIC_FAILURE').length,originalRawUnavailable:mappings.filter(x=>!x.originalRawAccountingAvailable).map(x=>x.sourceLevelId),
  mappings,newSolverSearches:0,newLowerBoundsCertified:0,originalFailureBytesUnchanged:true,productionChanged:false,realSaveAccessed:false};
write(`${output}/archive-map.json`,report);
write(`${output}/index.json`,{schemaVersion:3,status:report.status,formalReady:false,accepted:false,
  archiveMap:bind(`${output}/archive-map.json`),files:seedFiles,count:seedFiles.length,
  sortingValue:'seed.U (complete actual upper bound 12–15 only)',parentField:'seed.redesignParentId',
  searchPolicy:'Original objects remain blocked. A new input must change both actual shape inventory and actual colours before claiming a bounded proof.',newSearchInvocations:0});
console.log(JSON.stringify({output,count:report.count,imported:report.importedCount,reused:report.reusedCount,rawUnknown:report.originalRawUnavailable,status:report.status}));
