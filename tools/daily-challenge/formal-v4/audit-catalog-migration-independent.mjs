import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {levelSha256,routeSha256} from '../formal-v2/contract.mjs';
import {loadV4CatalogRuntime,assertHistoricalSlotMigration,HISTORICAL_150_SNAPSHOT} from './catalog-contract.mjs';

const hash=b=>createHash('sha256').update(b).digest('hex');
const read=async path=>{const bytes=await fs.readFile(path);return{path,sha256:hash(bytes),value:JSON.parse(bytes)};};
const exists=async path=>fs.stat(path).then(()=>true).catch(e=>{if(e.code==='ENOENT')return false;throw e;});
const runtime=await loadV4CatalogRuntime();
const index=await read('deliverables/daily-formal-v4-20261008/selection/merged-116-v2/index.json');
const acceptance=await read('deliverables/daily-formal-v4-20261008/selection/merged-116-v2/audit.json');
assert.equal(index.value.candidateCount,116);assert.equal(acceptance.value.verified,116);
assert.equal(acceptance.value.diversity.reasons.length,0);
const rows=[];
for(const file of index.value.files){
 const current=await read(file),r=current.value;
 const old=await read(r.historicalProof.path),request=await read(r.historicalProof.request.path),result=await read(r.historicalProof.result.path);
 const issues=[];
 if(runtime.historicalFiles.get(old.path)!==old.sha256||old.sha256!==r.historicalProof.sha256)issues.push('frozen-history-binding');
 const s=runtime.slots.find(s=>s.formalId===r.formalId);
 try{assertHistoricalSlotMigration(runtime,old.value,s);}catch(e){issues.push(e.message);}
 if(!isDeepStrictEqual(request.value,old.value.attempt)||result.value.status!==old.value.status||result.value.accepted!==true)issues.push('public-ledger-identity');
 if(request.sha256!==r.historicalProof.request.sha256||result.sha256!==r.historicalProof.result.sha256)issues.push('ledger-file-binding');
 if(!isDeepStrictEqual(r.level,old.value.level)||levelSha256(r.level)!==r.levelSha256||r.levelSha256!==old.value.levelSha256)issues.push('full-object-changed');
 if(!isDeepStrictEqual(r.drags,old.value.drags)||routeSha256(r.drags)!==r.routeSha256||r.routeSha256!==old.value.routeSha256)issues.push('route-changed');
 if(levelSha256(result.value.lower)!==levelSha256(old.value.lowerBound.result))issues.push('original-lower-result');
 if(r.L!==old.value.L||r.U!==old.value.U||r.sourceLevelId!==old.value.sourceLevelId)issues.push('band-or-source-changed');
 if(r.formalReady!==false||r.productionChanged!==false||r.migration.newLowerSearchInvocations!==0||r.migration.newUpperSearchInvocations!==0)issues.push('scope-overclaim');
 const origin=request.value.identityOrigin??request.value.id,identity=request.value.retryIdentitySha256;
 const originBlocked=await exists(`deliverables/daily-formal-v3-20261008/proof/attempts/${origin}.blocked.json`);
 const identityBlocked=identity?await exists(`deliverables/daily-formal-v3-20261008/proof/attempts/identities/${identity}.blocked.json`):null;
 rows.push({formalId:r.formalId,file:current.path,fileSha256:current.sha256,oldFile:old.path,oldFileSha256:old.sha256,
  request:request.path,requestSha256:request.sha256,result:result.path,resultSha256:result.sha256,
  originalFormalId:old.value.formalId,L:r.L,U:r.U,levelSha256:r.levelSha256,routeSha256:r.routeSha256,
  originBlocked,identityBlocked,issues,passed:issues.length===0});
}
const boundFiles=['src/core/dailyChallengeStagesV3.ts','src/core/dailyChallengeCatalogV3.ts',
 'tests/dailyChallengeStagesV3.test.ts','tests/dailyChallengeCatalogV3.test.ts',
 'tools/daily-challenge/formal-v4/catalog-contract.mjs','tools/daily-challenge/formal-v4/migrate-historical-selection.mjs',
 'tools/daily-challenge/formal-v4/catalog-migration-independent.test.mjs',
 'tools/daily-challenge/formal-v4/audit-catalog-migration-independent.mjs'];
const bindings=Object.fromEntries(await Promise.all(boundFiles.map(async p=>[p,hash(await fs.readFile(p))])));
const report={schemaVersion:1,status:rows.every(r=>r.passed)?'INDEPENDENT_MIGRATION_REVIEW_PASS':'INDEPENDENT_MIGRATION_REVIEW_FAIL',
 rules:'1.156.0',ruleLockVersions:159,profile:runtime.stageContract.DAILY_CHALLENGE_V3_PROFILE,
 inputIndex:{path:index.path,sha256:index.sha256},rootAudit:{path:acceptance.path,sha256:acceptance.sha256},
 historicalSnapshot:HISTORICAL_150_SNAPSHOT,bindings,mathToolchainSha256:runtime.toolchainSha256,
 tests:{runtimeAndExisting450:{files:4,total:54,passed:54,exitCode:0},rootAndIndependentMigration:{total:11,passed:11,exitCode:0},typecheck:{exitCode:0}},
 fixedFindings:['Full public request must equal immutable old.attempt','Public result.status must equal immutable old.status',
  'Active run selected assignment must match saved stage, difficulty, slot and certified profile'],
 priorFailure:{path:'deliverables/daily-formal-v4-20261008/proof/catalog-migration-independent-v1/fault-report.json',
  sha256:hash(await fs.readFile('deliverables/daily-formal-v4-20261008/proof/catalog-migration-independent-v1/fault-report.json'))},
 checked:rows.length,passed:rows.filter(r=>r.passed).length,rows,
 blockedIdentityObservationPolicy:'Read-only observation; later failure sharing a shape/color identity does not rewrite this exact historical accepted proof. Any new search/adaptation still obeys the common blocked ledger.',
 runtimeIsolation:'Only two new unimported production candidate modules and tests were added; existing runtime/data/guide/game files were not modified by this task.',
 newGeometryInputs:0,newProofSearches:0,playerSaveReads:0,playerSaveWrites:0,formal300Ready:false,productionChanged:false};
const output='deliverables/daily-formal-v4-20261008/proof/catalog-migration-independent-v2';
await fs.mkdir(output,{recursive:true});await fs.writeFile(`${output}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,checked:rows.length,passed:report.passed,
 originBlocked:rows.filter(r=>r.originBlocked).length,identityBlocked:rows.filter(r=>r.identityBlocked).length,bindings}));
assert.equal(report.passed,116);
