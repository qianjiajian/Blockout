import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {HISTORY_ROOTS} from './early-prefix-four-contract.mjs';
import {sha,readBound,realPathWithSuffix,walkJson,exists,mergeBindings,checkBindings} from './native-batch-io.mjs';
import {LOW_BAND_ADVANCED_BATCH_VERSION,LOW_BAND_ADVANCED_BATCH_REVIEW_STATUS,exactDescriptor} from './low-band-advanced-batch-contract.mjs';

export const LATEST_SEVEN_HISTORY_VERSION='readonly-seven-history-exact-own-stock-v1';
export const LATEST_SEVEN_HISTORY_PASS='LATEST_SEVEN_STATIC_HISTORY_PREFLIGHT_PASS';
const own='tools/daily-challenge/formal-v4/latest-seven-history-preflight.mjs';
const levelLike=q=>q&&Number.isSafeInteger(q.width)&&Number.isSafeInteger(q.height)&&Array.isArray(q.blocks)&&Array.isArray(q.gates);
const physical=level=>{const f=designFingerprints(level);return{retryIdentitySha256:levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256}),designSha256:f.designSha256};};
const inside=(a,b)=>{const rel=path.relative(b,a);return rel===''||(!rel.startsWith('..')&&!path.isAbsolute(rel));};

/** Deliberate field whitelist: embedded parent/reference levels are not newly
 * constructed stocks. Failed placeholders and plain-before-icing images are. */
export function latestHistoryStockImages(q){
 const entries=[['level',q.level],['placeholderWorld',q.placeholderWorld],['plain.level',q.plain?.level],
  ['built.level',q.built?.level],['built.placeholderWorld',q.built?.placeholderWorld],['built.plain.level',q.built?.plain?.level],
  ['constructionTemplateLevel',q.constructionTemplateLevel],['templateLevel',q.templateLevel],
  ['constructionTemplatePacket.level',q.constructionTemplatePacket?.level],['input.level',q.input?.level],['construction.level',q.construction?.level]];
 const seen=new Set();return entries.filter(([,level])=>levelLike(level)).flatMap(([field,level])=>{
  const h=levelSha256(level);if(seen.has(h))return[];seen.add(h);return[{field,level,levelSha256:h,...physical(level)}];});
}

export async function latestHistoryRoots({qualificationOnly=false,privateRoots}={}){
 assert.equal(typeof qualificationOnly,'boolean');
 if(!qualificationOnly){assert.equal(privateRoots,undefined);return [...HISTORY_ROOTS];}
 assert(Array.isArray(privateRoots)&&privateRoots.length===7,'Exactly seven private roots required');
 const actual=await Promise.all(privateRoots.map(realPathWithSuffix)),shared=await Promise.all(HISTORY_ROOTS.map(realPathWithSuffix));
 assert.equal(new Set(actual).size,7,'Distinct seven roots required');
 for(const a of actual)for(const b of shared)assert(!inside(a,b)&&!inside(b,a),'Private roots alias or contain shared history');
 for(let i=0;i<7;i++)for(let j=0;j<i;j++)assert(!inside(actual[i],actual[j])&&!inside(actual[j],actual[i]),'Private roots overlap');
 return [...privateRoots];
}

export async function captureLatestSevenHistory(options={},bindings={}){
 const directories=await latestHistoryRoots(options),roots=[];
 for(const directory of directories){
  assert(await exists(directory),`Missing history root: ${directory}`);const files=[];
  for(const file of await walkJson(directory)){const h=sha(await fs.readFile(file));mergeBindings(bindings,{[file]:h});files.push({path:file,sha256:h});}
  roots.push({directory,files});
 }
 return{version:LATEST_SEVEN_HISTORY_VERSION,qualificationOnly:options.qualificationOnly??false,capturedAt:new Date().toISOString(),roots};
}

export async function assertLatestSevenHistoryUnchanged(snapshot,options={}){
 const roots=await latestHistoryRoots(options);assert.equal(snapshot.qualificationOnly,options.qualificationOnly??false);
 assert.deepEqual(snapshot.roots.map(r=>path.resolve(r.directory)),roots.map(r=>path.resolve(r)));
 for(const root of snapshot.roots){
  const files=await walkJson(root.directory);assert.deepEqual(files.map(p=>path.resolve(p)),root.files.map(d=>path.resolve(d.path)),'History membership changed; recapture after terminal work');
  for(const d of root.files)await readBound(d);
 }
}

/** Only an exact, independently bound construction file may be exempt. A
 * second descriptor with the same physical identity is still a collision. */
export function evaluateLatestStockCollisions(base,stocks){
 const collisions=[],ownMatches=[];
 for(const stock of stocks){
  if(stock.retryIdentitySha256!==base.retryIdentitySha256&&stock.designSha256!==base.designSha256)continue;
  const exactOwn=stock.realPath===base.ownRealPath&&stock.evidence.sha256===base.ownEvidence.sha256&&stock.levelSha256===base.levelSha256;
  if(exactOwn)ownMatches.push(stock);else collisions.push(stock);
 }
 assert(ownMatches.length>0,'Exact own construction must exist in shared static history');
 return{ownMatches,collisions};
}

async function collectStocks(snapshot,bindings){
 const stocks=[],seen=new Set(),constructionFiles=[],summary=[];
 const bound=d=>readBound(d,bindings);
 async function add(q,d,origin){
  const realPath=await realPathWithSuffix(d.path);
  for(const image of latestHistoryStockImages(q)){
   const key=realPath+'|'+d.sha256+'|'+image.levelSha256;if(seen.has(key))continue;seen.add(key);
   const {level,...facts}=image;stocks.push({evidence:d,realPath,origin,...facts});
  }
 }
 for(const [i,root]of snapshot.roots.entries()){
  // Public mathematical records and capacity attempts are captured unchanged;
  // existing accepted-reader/constructor own their failure and reuse guards.
  if(i===0||i===4){summary.push({directory:root.directory,files:root.files.length,comparison:'captured-existing-entry-owns-public-and-capacity-guards'});continue;}
  let directImages=0,referencedFiles=0;
  for(const d of root.files){
   const q=await bound(d);const n=stocks.length;await add(q,d,'static-ledger-direct');directImages+=stocks.length-n;
   if(q.constructionFiles!==undefined){assert(Array.isArray(q.constructionFiles));
    for(const f of q.constructionFiles){exactDescriptor(f);const stock=await bound(f);await add(stock,f,'terminal-constructionFiles');constructionFiles.push(f);referencedFiles++;}
   }
   if(d.path.endsWith('.claim.json')&&q.outputDirectory){
    const resultFile=d.path.replace(/\.claim\.json$/,'.result.json');
    const resultDescriptor=root.files.find(f=>path.resolve(f.path)===path.resolve(resultFile));
    assert(resultDescriptor,`Unfinished static construction: ${d.path}`);
    const result=await bound(resultDescriptor);assert.deepEqual(result.plan,q.plan);assert.equal(await realPathWithSuffix(result.outputDirectory),await realPathWithSuffix(q.outputDirectory));
    assert(Array.isArray(result.constructionFiles),'Terminal batch must enumerate all construction files');
    const indexFile=path.join(q.outputDirectory,'index.json');assert(await exists(indexFile),'Terminal static index missing');
    const raw=await fs.readFile(indexFile),indexDescriptor={path:indexFile,sha256:sha(raw)},index=await bound(indexDescriptor);
    assert.deepEqual(index.plan,q.plan);assert(Array.isArray(index.attempts));
    const listed=new Map(result.constructionFiles.map(f=>[path.resolve(f.path).toLowerCase(),f.sha256]));
    assert.equal(listed.size,result.constructionFiles.length,'Duplicate construction evidence listing');
    for(const attempt of index.attempts){const f=attempt.constructionEvidence;exactDescriptor(f);assert.equal(listed.get(path.resolve(f.path).toLowerCase()),f.sha256,'Index stock missing from terminal history');}
    assert.equal(index.attempts.length,result.constructionFiles.length,'Terminal history omits attempted stock');
   }
  }
  summary.push({directory:root.directory,files:root.files.length,directImages,referencedFiles,comparison:'physical-paired-identity-and-exact-design'});
 }
 return{stocks,constructionFiles,summary};
}

async function sourceBase(row,bindings){
 const base=await readBound(row.base,bindings);assert.equal(base.accepted,true);assert.equal(base.sourceLevelId,row.sourceLevelId);
 assert.equal(base.levelSha256,row.baseLevelSha256);assert.equal(levelSha256(base.level),base.levelSha256);
 const fp=physical(base.level);assert.equal(fp.retryIdentitySha256,row.retryIdentitySha256);assert.equal(base.attempt.retryIdentitySha256,fp.retryIdentitySha256);
 const ownEvidence=base.plan.constructionEvidence;exactDescriptor(ownEvidence);
 const input=await readBound(base.input,bindings),stock=await readBound(ownEvidence,bindings);
 assert.deepEqual(input.constructionEvidence,ownEvidence);assert.equal(input.levelSha256,base.levelSha256);assert.equal(levelSha256(input.level),base.levelSha256);
 assert(latestHistoryStockImages(stock).some(s=>s.levelSha256===base.levelSha256),'Own evidence does not contain the exact accepted world');
 return{index:row.index,base:row.base,sourceLevelId:base.sourceLevelId,levelSha256:base.levelSha256,...fp,ownEvidence,ownRealPath:await realPathWithSuffix(ownEvidence.path)};
}

/** No constructors, solvers or ledger claims. The existing runner still must
 * perform its own public/capacity retry checks immediately before mutation. */
export async function auditLatestSevenHistory(planReviewDescriptor,output,{qualificationOnly=false,privateRoots}={}){
 const options={qualificationOnly,privateRoots};await latestHistoryRoots(options);
 const destination=await realPathWithSuffix(output);
 for(const root of HISTORY_ROOTS)assert(!inside(destination,await realPathWithSuffix(root)),'Report cannot be written in shared history');
 assert(!(await exists(output)),'Immutable output directory already exists');await fs.mkdir(output,{recursive:false});
 const bindings={},errors=[],rows=[];let planDescriptor,history,scan,environment;
 try{
  const review=await readBound(planReviewDescriptor,bindings);assert.equal(review.status,LOW_BAND_ADVANCED_BATCH_REVIEW_STATUS);assert.deepEqual(review.errors,[]);
  assert.equal(review.newSearches,0);assert.equal(review.newLedgerClaims,0);
  planDescriptor=review.plan;const plan=await readBound(planDescriptor,bindings);assert.equal(plan.version,LOW_BAND_ADVANCED_BATCH_VERSION);
  assert(Array.isArray(plan.rows)&&plan.rows.length>0);mergeBindings(bindings,review.fileBindings);await checkBindings(review.fileBindings);
  if(!qualificationOnly){
   const file=path.resolve('snapshot-environment.json'),raw=await fs.readFile(file),e=JSON.parse(raw);
   assert.equal(e.status,'EXPLICIT_HISTORICAL_MATH_WORKSPACE');assert.equal(path.resolve(e.workspace).toLowerCase(),path.resolve('.').toLowerCase());
   assert.equal(e.currentRuntimeValidationClaimed,false);assert.equal(e.frozenMath,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
   assert.equal(sha(await fs.readFile('src/game/ColorEscapeGame.ts')),e.historicalUI.sha256);mergeBindings(bindings,{[file]:sha(raw),['src/game/ColorEscapeGame.ts']:e.historicalUI.sha256});
   environment={descriptor:{path:file,sha256:sha(raw)},executionWorkspace:path.resolve('.'),historicalUI:e.historicalUI,currentRuntimeValidationClaimed:false};
  }
  const bases=[];for(const row of plan.rows)bases.push(await sourceBase(row,bindings));
  assert.equal(new Set(bases.map(b=>b.retryIdentitySha256)).size,bases.length,'Duplicate base identity');
  history=await captureLatestSevenHistory(options,bindings);scan=await collectStocks(history,bindings);
  for(const base of bases){
   const result=evaluateLatestStockCollisions(base,scan.stocks);
   const ownedInTerminal=scan.constructionFiles.some(f=>path.resolve(f.path).toLowerCase()===path.resolve(base.ownEvidence.path).toLowerCase()&&f.sha256===base.ownEvidence.sha256);
   assert(ownedInTerminal,'Own evidence must be enumerated by a terminal constructor');
   rows.push({...base,...result,passed:result.collisions.length===0});
   if(result.collisions.length)errors.push(`Base ${base.index} collides with ${result.collisions.length} other static world(s)`);
  }
  const compiled=await build({entryPoints:[own],bundle:true,packages:'external',write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
  for(const file of Object.keys(compiled.metafile.inputs))mergeBindings(bindings,{[file]:sha(await fs.readFile(file))});
  await checkBindings(bindings);await assertLatestSevenHistoryUnchanged(history,options);
 }catch(e){errors.push(e.stack??e.message);}
 let snapshotDescriptor=null;
 if(history){const file=path.join(output,'history-snapshot.json');await fs.writeFile(file,JSON.stringify(history,null,2)+'\n',{flag:'wx'});snapshotDescriptor={path:file,sha256:sha(await fs.readFile(file))};bindings[file]=snapshotDescriptor.sha256;}
 const report={version:LATEST_SEVEN_HISTORY_VERSION,status:errors.length?'LATEST_SEVEN_STATIC_HISTORY_PREFLIGHT_FAIL':LATEST_SEVEN_HISTORY_PASS,
  planReview:planReviewDescriptor,plan:planDescriptor??null,qualificationOnly,rows,verifiedBases:rows.filter(r=>r.passed).length,errors,
  history:snapshotDescriptor,historySummary:scan?.summary??[],staticWorldImagesCompared:scan?.stocks.length??0,fileBindings:bindings,executionEnvironment:environment??null,
  scope:'Seven current roots captured; static worlds checked; public/capacity failure and final-object checks remain owned by existing entry',
  exemptions:'Only exact own construction evidence path/SHA and exact original level SHA',
  validity:'Snapshot point-in-time only; new history requires a fresh readonly audit before runner, never a gameplay retry',
  newConstructions:0,newSearches:0,newLedgerClaims:0,publicClaimsStarted:0,formalReady:false,currentRuntimeValidationClaimed:false};
 const file=path.join(output,'report.json');await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 return{path:file,sha256:sha(await fs.readFile(file)),status:report.status,verifiedBases:report.verifiedBases,errors};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 const[p,h,out]=process.argv.slice(2);assert(p&&h&&out);const r=await auditLatestSevenHistory({path:p,sha256:h},out);console.log(JSON.stringify(r));if(r.errors.length)process.exitCode=1;
}
