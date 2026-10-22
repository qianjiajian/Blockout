import fs from 'node:fs';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {ROOT,IDS,ruleGate,loadApi,audit,replay,digest,BANDS,writeNew} from './common.mjs';
ruleGate();const {api}=await loadApi();
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export * from './src/core/formal231to240Data.ts'"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const registry=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const before=JSON.parse(fs.readFileSync(ROOT+'/before.json'));
assert.equal(api.LEVELS.length,200);assert.equal(digest(api.LEVELS),before.productionSha256);
for(const [i,rows]of [api.FORMAL_201_210_LEVELS,api.FORMAL_211_220_LEVELS,api.FORMAL_221_230_LEVELS].entries())assert.equal(digest(rows),before.existingFormal[i].sha256);
const requested=process.argv.slice(2).map(Number);assert(requested.length);
const reports=fs.readdirSync(ROOT).filter(n=>n.startsWith('pointer-')).flatMap(n=>{const file=ROOT+'/'+n+'/report.json';return fs.existsSync(file)?[{file,data:JSON.parse(fs.readFileSync(file))}]:[];});
for(const id of requested){
 const evidence=registry.FORMAL_231_240_EVIDENCE.find(x=>x.id===id);assert(evidence);
 const packetFile=evidence.qualification,p=JSON.parse(fs.readFileSync(packetFile));
 const level=registry.getFormal231to240LevelStrict(id),L=p.L??p.certifiedLowerBound,U=p.U??p.witnessUpperBound,[lo,hi]=BANDS[level.difficulty];
 assert.deepEqual(level,p.level);assert.equal(digest(level),p.levelSha256);assert.equal(digest(p.drags),p.routeSha256);assert(L>=lo&&L<=U&&U<=hi);
 const spatial=audit(level,api),route=replay(level,p.drags,api,{complete:true,requirePointerCompatible:true});assert.equal(route.nonClearingDrags,U);assert.equal(route.effectiveDrags,level.preservedMoveTarget);
 const proofs=p.lower??p.proof;assert(proofs&&(proofs.thresholdProven||proofs.status==='threshold-proven'));
 assert(p.qualification&&(p.qualification.passed||p.qualification.status?.startsWith('PASS')));
 const accepted=[];
 for(const [width,height]of [[320,568],[496,1078]]){
  const match=reports.findLast(({data:r})=>r.status==='PASS'&&r.formalDataValidated&&r.viewport.width===width&&r.viewport.height===height&&r.rows.some(x=>x.id===id&&x.levelSha256===p.levelSha256&&x.routeSha256===p.routeSha256));
  assert(match,`Lv${id} missing formal Pointer ${width}x${height}`);const r=match.data,row=r.rows.find(x=>x.id===id);
  assert(r.naturalClock&&!r.clockFrozen&&!r.playerSaveTouched&&r.productionBoundary===200);assert(row.formalObjectIdentity&&!row.candidateOverlay);assert.equal(row.status,'PASS');assert.equal(row.settlement.earnedStars,3);assert.equal(row.settlement.status,'committed');assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
  // New independent registry entries and selector catalog updates are audited
  // separately; the actual simulation, controls, rendering and all art stay byte-identical.
  const excluded=new Set(['src/core/formal231to240Data.ts','src/game/temporaryTestLevelCatalog.ts']);
  const changed=Object.entries(r.bindings).filter(([f,h])=>(f.startsWith('src/')||f.startsWith('public/assets/art/'))&&!excluded.has(f)&&digest(fs.readFileSync(f))!==h);assert.deepEqual(changed,[]);
  accepted.push({file:match.file,sha256:digest(fs.readFileSync(match.file)),viewport:r.viewport,levelSha256:row.levelSha256,routeSha256:row.routeSha256,actualDrags:row.final.moves,nonClearingDrags:row.nonClearingDrags,elapsedSeconds:level.timeSeconds-row.final.remainingSeconds,earnedStars:row.settlement.earnedStars,naturalClock:true,formalObjectIdentity:true,sourceDataAdditionsOnly:true});
 }
 const record={status:'FORMAL_DATA_ACCEPTED',id,activeRule:'1.198.0',difficulty:level.difficulty,band:[lo,hi],L,U,starMoves:level.preservedMoveTarget,starTargets:api.levelStarTargets(level),levelSha256:p.levelSha256,routeSha256:p.routeSha256,qualification:{file:packetFile,sha256:digest(fs.readFileSync(packetFile))},source:{ledger:p.sourceLedger??null,ledgerSha256:p.sourceLedgerSha256??null,embeddedSourceReview:p.sourceAndAdaptation??null},staticAudit:spatial,strictReplay:route,pointer:accepted,productionBoundary:200,old1to230Preserved:true,testCampaignScaffold:true,productionCampaignValidated:false,playerSaveTouched:false,humanBlindTested:false,releaseApproved:false};
 if(p.schemaRebind){assert.equal(p.schemaRebind.status,'PASS_SCHEMA_ONLY_REBIND');assert.equal(p.schemaRebind.levelSha256,p.levelSha256);assert(p.schemaRebind.gameplayDeepEqual);record.schemaRebind=p.schemaRebind;record.independentSchemaReview=`${ROOT}/independent-review/schema-rebind-review-1792399520026.json`;assert(fs.existsSync(record.independentSchemaReview));}
 const file=evidence.evidence;if(fs.existsSync(file)){const old=JSON.parse(fs.readFileSync(file));assert.equal(old.levelSha256,record.levelSha256);assert.equal(old.routeSha256,record.routeSha256);}else writeNew(file,record);
 console.log(JSON.stringify({id,status:record.status,L,U,drags:record.starMoves}));
}
const rows=registry.FORMAL_231_240_EVIDENCE.flatMap(e=>{const {id,evidence:file}=e;return fs.existsSync(file)?[{id,file,...Object.fromEntries(Object.entries(JSON.parse(fs.readFileSync(file))).filter(([k])=>['status','L','U','starMoves','levelSha256','routeSha256'].includes(k)))}]:[];});
const aggregate={activeRule:'1.198.0',planned:IDS,accepted:rows.map(x=>x.id),pending:IDS.filter(id=>!rows.some(x=>x.id===id)),acceptedCount:rows.length,rows,baseline:ROOT+'/before.json',productionBoundary:200,productionSha256:digest(api.LEVELS),old1to230Preserved:true,playerSaveTouched:false,releaseApproved:false,hashConventions:{levelAndRoute:'SHA-256 of canonical JSON',fileBindings:'digest(Buffer): SHA-256 of raw file bytes',rawFileDigests:'file-digests-v2.json independently verifies raw SHA-256 equals digest(Buffer)',correction:'Earlier aggregate prose and the old legacyJsonBufferSha256 field name incorrectly described Buffer JSON hashing. The implementation has always hashed Buffer raw bytes; all recorded hash values remain valid. Original reports and file-digests.json are preserved.'}};
const boundFiles=new Set([ROOT+'/before.json']);for(const r of rows){boundFiles.add(r.file);const v=JSON.parse(fs.readFileSync(r.file));boundFiles.add(v.qualification.file);for(const p of v.pointer)boundFiles.add(p.file);if(v.source.ledger)boundFiles.add(v.source.ledger);if(v.schemaRebind)boundFiles.add(v.schemaRebind.originalFile);if(v.independentSchemaReview)boundFiles.add(v.independentSchemaReview);}
const fileDigests=[...boundFiles].map(file=>{const bytes=fs.readFileSync(file),rawSha256=createHash('sha256').update(bytes).digest('hex'),digestBufferSha256=digest(bytes);assert.equal(rawSha256,digestBufferSha256);return{file,rawSha256,digestBufferSha256};});
fs.writeFileSync(ROOT+'/file-digests-v2.json',JSON.stringify({convention:'Both columns hash the identical raw file bytes. The canonical JSON hash is used only for level and route objects.',preservedPriorMap:ROOT+'/file-digests.json',fileDigests},null,2)+'\n');
writeNew(`${ROOT}/formal-adoption/aggregate-${Date.now()}.json`,aggregate);fs.writeFileSync(`${ROOT}/status.json`,JSON.stringify(aggregate,null,2)+'\n');
