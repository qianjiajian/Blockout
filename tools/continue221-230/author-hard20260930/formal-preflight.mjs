import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';

const root='deliverables/continue221-230-20260930',output=root+'/formal-adoption/preflight.json';
const read=file=>JSON.parse(fs.readFileSync(file));
const hash=data=>createHash('sha256').update(data).digest('hex');
const fileHash=file=>hash(fs.readFileSync(file));
const jsonHash=obj=>hash(JSON.stringify(obj));
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.127.0');
const status=read(root+'/status.json'),qaNine=read(root+'/qa-nine.json'),qa224=read(root+'/qa-224.json');
assert(qaNine.passed&&qa224.passed);assert.equal(status.qualified,10);
const bundled=await build({stdin:{resolveDir:process.cwd(),contents:"export {QUALIFIED_221_230_LEVELS} from './src/core/remake221to230Data';"},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {QUALIFIED_221_230_LEVELS}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
assert.equal(QUALIFIED_221_230_LEVELS.length,10);
const rows=[];
const references={qaNine:{file:root+'/qa-nine.json',sha256:fileHash(root+'/qa-nine.json')},qa224:{file:root+'/qa-224.json',sha256:fileHash(root+'/qa-224.json')},status:{file:root+'/status.json',sha256:fileHash(root+'/status.json')},shellVisual:{file:root+'/qa-227-shell-visual.json',sha256:fileHash(root+'/qa-227-shell-visual.json')}};
const checkedAssets=new Map(),checkedEvidence=new Map();
function unchangedHash(file,expected){const current=checkedEvidence.get(file)??fileHash(file);checkedEvidence.set(file,current);assert.equal(current,expected,file+' drift');return current;}
function nativeArtifact(artifact){
 const sourceHash=fileHash(artifact.source),expectedSource=artifact.sourceHash??artifact.sourceSha256;assert.equal(sourceHash,expectedSource,'Native backend source drift');
 const input=read(artifact.input),output=read(artifact.output),inputBytesHash=fileHash(artifact.input);assert([inputBytesHash,digest(input),jsonHash(input)].includes(artifact.inputSha256),'Native input drift');
 if(artifact.rows){const normalized=rows=>rows.map(r=>({...r,successors:[...r.successors].sort()}));assert.equal(digest(normalized(artifact.rows)),digest(normalized(output.rows)),'Qualification output transition rows drift');}
 for(const key of ['status','floor','thresholdProven','termination','exploredStates','discoveredStates','attemptedTransitions','maxClearsSeen'])if(artifact[key]!==undefined)assert.equal(output[key],artifact[key],'Native output '+key+' drift');
 return{source:artifact.source,sourceSha256:sourceHash,input:artifact.input,inputSha256:inputBytesHash,output:artifact.output,outputSha256:fileHash(artifact.output),passed:true};
}
function scanFileHashes(value,out,seen=new Set()){
 if(!value||typeof value!=='object')return;
 if(!Array.isArray(value)){const file=value.file??value.path,expected=value.sha256;if(typeof file==='string'&&typeof expected==='string'&&expected.length===64&&fs.existsSync(file)&&!seen.has(file)){seen.add(file);out.push({file,sha256:unchangedHash(file,expected)});}}
 for(const value2 of Object.values(value))scanFileHashes(value2,out,seen);
}
const physicalFiles=['src/core/PuzzleModel.ts','src/core/types.ts','src/core/blockExitFrontier.ts','src/core/revisedMechanismContract.ts','src/game/continuousDrag.ts','src/game/formalBlockShapes.ts','src/game/artManifest.ts'];
for(const s of status.rows){
 const p=read(s.headlessPacket),id=p.level.id,qaFile=id===224?references.qa224.file:references.qaNine.file,qa=(id===224?qa224:qaNine).rows.find(r=>r.id===id),oldPacket=read(qa.file),row={id,passed:false,packet:s.headlessPacket,packetSha256:fileHash(s.headlessPacket),levelSha256:digest(p.level),routeSha256:digest(p.drags),qa:{file:qaFile,passed:qa.passed},issues:[],notes:[]};
 try{
  assert(qa.passed);assert.equal(fileHash(qa.file),qa.packetFileSha256,'Previously audited packet bytes drift');
  assert.deepEqual(p.level,oldPacket.level);assert.deepEqual(p.drags,oldPacket.drags);assert.deepEqual(p.proof,oldPacket.proof);
  for(const k of ['qualification','proofQualification'])if(id!==224)assert.deepEqual(p[k],oldPacket[k]);else if(k==='qualification')assert.deepEqual(p[k],oldPacket[k]);
  assert.equal(row.levelSha256,qa.levelSha256);assert.equal(row.routeSha256,qa.routeSha256);assert.equal(row.levelSha256,s.levelSha256);assert.equal(row.routeSha256,s.routeSha256);assert.deepEqual(QUALIFIED_221_230_LEVELS.find(l=>l.id===id),p.level);
  row.objectBinding={candidateDataExact:true,qaExact:true,statusExact:true,routeExact:true,proofArtifactExact:true};
  if(id===224){assert.equal(p.sourceLedgerPending,false);assert(p.sourceContractAudit.passed);assert.equal(p.sourceContract.fullBlockCount,27);assert.equal(p.sourceContract.openingBlockCount,17);row.notes.push('Final qualified224 adds source/acceptance metadata only; level, drags, proof and qualification exactly match audited headless224.');}
  const sourceFile=typeof p.sourceLedger==='string'?p.sourceLedger:p.sourceLedgerFile??(typeof p.sourceContract==='string'?p.sourceContract:null);const expectedSourceHash=p.sourceLedgerSha256??p.sourceContractSha256;
  row.source={adaptation:p.level.mechanismAdaptation,sourceFactsSha256:digest(p.source),sourceDifferencesSha256:p.sourceDifferences?digest(p.sourceDifferences):null,sourceContractSha256:p.sourceContract?digest(p.sourceContract):null,exactSourceCopyClaimed:false,evidence:[]};
  if(sourceFile){const obj=read(sourceFile),raw=fileHash(sourceFile);assert([raw,digest(obj),jsonHash(obj)].includes(expectedSourceHash),'Source ledger drift');row.source.ledger={file:sourceFile,sha256:raw,packetDeclaredSha256:expectedSourceHash};if(id===224)assert.deepEqual(obj,p.sourceLedger);scanFileHashes(obj,row.source.evidence);}
  scanFileHashes(p.source,row.source.evidence);scanFileHashes(p.sourceFrames,row.source.evidence);
  row.source.adaptationNotes=qa.notes.filter(n=>typeof n==='object');
  assert(row.source.adaptation?.change,'Source adaptation must remain explicit');
  row.proof={L:p.proof.floor,U:qa.difficulty.U,totalDrags:p.drags.length,band:qa.difficulty.band,reusedUnchangedSameObject:true,newSearchRun:false};
  assert.equal(s.lowerBound,row.proof.L);assert.equal(s.upperBound,row.proof.U);assert(p.proof.thresholdProven);assert.equal(p.proof.termination,'below-threshold-exhausted');
  if(id!==225){row.proof.native=nativeArtifact(p.proof);assert.equal(row.proof.native.inputSha256,qa.proofBinding.inputSha256);assert.equal(row.proof.native.sourceSha256,qa.proofBinding.backendSha256);}
  else{
   assert.equal(p.proofQualification.sourceLevelSha256,digest(p.level));assert.equal(p.proof.sourceLevelSha256,digest(p.proofQualification.projection));assert.equal(p.proofQualification.projectedLevelSha256,digest(p.proofQualification.projection));
   const solver='tools/remake111to120-spatial-floor-v147.mjs',gitStatus=execFileSync('git',['status','--porcelain','--',solver],{encoding:'utf8',windowsHide:true}).trim();assert.equal(gitStatus,'');const trackedBytes=execFileSync('git',['show','HEAD:'+solver],{windowsHide:true});assert.equal(hash(trackedBytes.toString().replaceAll('\r\n','\n')),hash(fs.readFileSync(solver,'utf8').replaceAll('\r\n','\n')));
   row.proof.standardSolver={file:solver,currentSha256:fileHash(solver),trackedHeadLfSha256:hash(trackedBytes.toString().replaceAll('\r\n','\n')),gitClean:true,historicalBackendSha256Recorded:false};row.notes.push('225 historical standard v147 JS proof stores exact projected-level binding but no separate historical solver SHA. It is supplemented for formal adoption by the new fixed-budget proof bound to the formal object and all34 current solver/model dependencies.');
   const freshFile=root+'/formal-adoption/fresh225-floor.json',fresh=read(freshFile);assert(fresh.passed&&fresh.proof.thresholdProven&&fresh.proof.floor===5);assert.equal(fresh.levelSha256,row.levelSha256);assert.equal(fresh.routeSha256,row.routeSha256);assert.deepEqual(fresh.projection,p.proofQualification.projection);assert.equal(fresh.projectionSha256,digest(fresh.projection));for(const d of fresh.solver.dependencies)unchangedHash(d.file,d.sha256);row.proof.adoptedEvidence={file:freshFile,sha256:fileHash(freshFile),floor:5,budget:fresh.budget,exploredStates:fresh.proof.exploredStates,elapsedMilliseconds:fresh.proof.elapsedMilliseconds,dependencyCount:fresh.solver.dependencies.length};
  }
  row.toolQualification={passed:true,artifactSha256:p.qualification?digest(p.qualification):digest(p.proofQualification),native:[]};
  if(p.qualification?.native)row.toolQualification.native.push(nativeArtifact(p.qualification.native));
  if(p.qualification?.referenceProof)row.toolQualification.native.push(nativeArtifact(p.qualification.referenceProof));
  if(id===227){assert(p.proofQualification.passed);assert.equal(p.proofQualification.comparisons,64);assert(p.proofQualification.rows.every(r=>r.fresh.sourceHash===p.proof.sourceHash));row.toolQualification.smallGraphComparisons=64;}
  row.assets={passed:true,uses:qa.assets.assets.length,shellPresentationFallback:qa.assets.shellPresentationFallback};for(const a of qa.assets.assets){const file='public/'+a.url;const actual=checkedAssets.get(file)??fileHash(file);checkedAssets.set(file,actual);assert.equal(actual,a.sha256,'Runtime art drift '+file);}
  row.priorPointer=s.pointer.map(pointer=>{const report=read(pointer.file),r=report.rows.find(x=>x.id===id),q=qa.pointerEvidence.find(x=>x.file===pointer.file);assert(q);assert.equal(fileHash(pointer.file),q.reportSha256,'Prior Pointer report drift');assert.equal(r.levelSha256,row.levelSha256);assert.equal(r.routeSha256,row.routeSha256);assert.equal(r.settlement.earnedStars,3);assert(r.naturalTimingReplay.passed);assert.equal(report.status,'PASS');const modelBindings=[];for(const file of physicalFiles){assert(report.bindings[file],'Missing historical gameplay binding '+file);if(file==='src/core/types.ts'&&fileHash(file)!==report.bindings[file]){const oldFile=path.join(report.sourceSnapshot,file);assert.equal(fileHash(oldFile),report.bindings[file]);const oldText=fs.readFileSync(oldFile,'utf8').replaceAll('\r\n','\n'),text=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');assert.equal(text,oldText.replace('    change: string;','    change: string;\n    /** Independent source observations supporting the authored differences. */\n    sourceFactsFile?: string;'));modelBindings.push({file,historicalSha256:report.bindings[file],currentSha256:fileHash(file),exactlyReviewedTypeOnlyDelta:'Adds optional mechanismAdaptation.sourceFactsFile:string and its documentation; all other text identical, no runtime implementation change.'});}else modelBindings.push({file,sha256:unchangedHash(file,report.bindings[file])});}return{file:pointer.file,sha256:q.reportSha256,viewport:report.viewport,levelSha256:r.levelSha256,routeSha256:r.routeSha256,earnedStars:3,gameplayRuntimeBindings:modelBindings,newFormalPointerStillRequired:true};});
  assert.deepEqual(row.priorPointer.map(p=>p.viewport.width).sort((a,b)=>a-b),[320,496]);
  assert.equal(fileHash(s.headlessPacket),row.packetSha256,'Candidate changed during preflight');row.passed=true;
 }catch(e){row.issues.push(e.message);}
 rows.push(row);console.log(JSON.stringify({id,passed:row.passed,issues:row.issues}));
}
const result={createdAt:new Date().toISOString(),activeRule:lock.activeVersion,ruleDocument:'docs/rules/mechanism-rules-v1.127.0.md',ruleDocumentSha256:fileHash('docs/rules/mechanism-rules-v1.127.0.md'),rulesLockPassed:true,scope:'Preflight identity/source/proof/qualification/assets/prior-Pointer drift check before independent formal221–230 registration. No repeated solving.',passed:rows.length===10&&rows.every(r=>r.passed),references,rows,uniqueRuntimeAssetsChecked:checkedAssets.size,proofSearchesRun:0,newFormalPointerRequired:true,formalAdoptedByThisCheck:false,productionBoundary:200,playerSaveTouched:false,releaseApproved:false};
fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,passed:result.passed,rows:rows.length}));
assert(result.passed);
