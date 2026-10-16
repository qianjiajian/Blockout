import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {HISTORY_ROOTS} from './early-prefix-four-contract.mjs';
import {sha} from './native-batch-io.mjs';
import {LOW_BAND_ADVANCED_BATCH_VERSION,LOW_BAND_ADVANCED_BATCH_REVIEW_STATUS} from './low-band-advanced-batch-contract.mjs';
import {auditLatestSevenHistory,captureLatestSevenHistory,assertLatestSevenHistoryUnchanged,latestHistoryRoots,LATEST_SEVEN_HISTORY_PASS} from './latest-seven-history-preflight.mjs';

const out=process.env.LATEST_SEVEN_HISTORY_TEST_OUT??'deliverables/daily-formal-v4-20261008/proof/latest-seven-history-private-01';
await fs.mkdir(out,{recursive:false});const evidence=[];
const put=async(file,value)=>{await fs.writeFile(file,JSON.stringify(value,null,2)+'\n',{flag:'wx'});return{path:file,sha256:sha(await fs.readFile(file))};};
const read=p=>fs.readFile(p).then(JSON.parse);
const run=(name,fn)=>test(name,async()=>{try{await fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.stack});throw e;}});
function toy(){return{id:999991,width:2,height:2,blocks:[{id:'a',x:0,y:0,color:'red',shape:[[0,0],[1,0]]},{id:'b',x:0,y:1,color:'blue',shape:[[0,0],[1,0]]}],gates:[{id:'r',color:'red',side:'left',offset:0,size:1},{id:'b',color:'blue',side:'right',offset:1,size:1}]};}
async function fixture(){
 const dir=await fs.mkdtemp(path.join(out,'fixture-')),roots=Array.from({length:7},(_,i)=>path.join(dir,'root-'+i));for(const r of roots)await fs.mkdir(r);
 const stockDir=path.join(dir,'static-output');await fs.mkdir(stockDir);const level=toy(),levelSHA=levelSha256(level),fingerprints=designFingerprints(level);
 const identity=levelSha256({shapeSha256:fingerprints.shapeSha256,colorSha256:fingerprints.colorSha256});
 const construction=await put(path.join(stockDir,'construction.json'),{level,levelSha256:levelSHA,sourceLevelId:86,placeholderWorld:{...toy(),blocks:toy().blocks.map(b=>({...b,color:'purple'}))}});
 const input=await put(path.join(stockDir,'candidate.json'),{level,levelSha256:levelSHA,constructionEvidence:construction});
 const constructionPlan=await put(path.join(dir,'construction-plan.json'),{version:'qualification-only-construction'});
 await put(path.join(stockDir,'index.json'),{plan:constructionPlan,attempts:[{constructionEvidence:construction}]});
 await put(path.join(roots[1],'batch.claim.json'),{plan:constructionPlan,outputDirectory:stockDir});
 await put(path.join(roots[1],'batch.result.json'),{plan:constructionPlan,outputDirectory:stockDir,constructionFiles:[construction]});
 const base=await put(path.join(dir,'base.json'),{accepted:true,sourceLevelId:86,level,levelSha256:levelSHA,attempt:{retryIdentitySha256:identity},input,plan:{constructionEvidence:construction}});
 const plan=await put(path.join(dir,'plan.json'),{version:LOW_BAND_ADVANCED_BATCH_VERSION,rows:[{index:0,base,sourceLevelId:86,baseLevelSha256:levelSHA,retryIdentitySha256:identity}]});
 const review=await put(path.join(dir,'review.json'),{status:LOW_BAND_ADVANCED_BATCH_REVIEW_STATUS,plan,errors:[],newSearches:0,newLedgerClaims:0,fileBindings:{[plan.path]:plan.sha256,[base.path]:base.sha256}});
 const options={qualificationOnly:true,privateRoots:roots};return{dir,roots,stockDir,construction,base,plan,review,options,level};
}

run('all seven roots captured, exact own terminal stock exempt; public math copies not static retries',async()=>{
 const f=await fixture();await put(path.join(f.roots[0],'public-result.json'),{level:f.level});await put(path.join(f.roots[4],'capacity-record.json'),{level:f.level});
 const result=await auditLatestSevenHistory(f.review,path.join(f.dir,'audit'),f.options),r=await read(result.path);
 assert.equal(result.status,LATEST_SEVEN_HISTORY_PASS);assert.equal(r.verifiedBases,1);assert.equal(r.historySummary.length,7);assert.equal(r.rows[0].ownMatches.length,1);
 assert.equal(r.newConstructions+r.newSearches+r.newLedgerClaims,0);assert.equal((await read(r.history.path)).roots.length,7);
});
run('same physical stock renamed or iced in seventh static root is rejected',async()=>{
 const f=await fixture(),copy=structuredClone(f.level);copy.id=12;copy.blocks.forEach((b,i)=>{b.id='renamed'+i;b.frozen=7;});
 await put(path.join(f.roots[6],'new-failed-placeholder.json'),{placeholderWorld:copy});
 const r=await auditLatestSevenHistory(f.review,path.join(f.dir,'audit'),f.options);assert.match(r.status,/FAIL/);assert.match(r.errors.join(),/collides with 1/);
});
run('same shape inventory alone or colour alone is not globally banned; embedded parents ignored',async()=>{
 const f=await fixture(),changed=structuredClone(f.level);changed.blocks[0].color='yellow';changed.blocks[1].color='green';
 await put(path.join(f.roots[6],'new-stock.json'),{level:changed,provenance:{reference:{level:f.level}}});
 const split=structuredClone(f.level);split.blocks=split.blocks.flatMap(b=>b.shape.map(([dx,dy],i)=>({...b,id:b.id+i,x:b.x+dx,y:b.y+dy,shape:[[0,0]]})));
 await put(path.join(f.roots[3],'new-shape.json'),{level:split});
 assert.equal((await auditLatestSevenHistory(f.review,path.join(f.dir,'audit'),f.options)).status,LATEST_SEVEN_HISTORY_PASS);
});
run('copied exact bytes at another construction path are not own evidence',async()=>{
 const f=await fixture();await fs.copyFile(f.construction.path,path.join(f.roots[2],'duplicate.json'));
 const r=await auditLatestSevenHistory(f.review,path.join(f.dir,'audit'),f.options);assert.match(r.status,/FAIL/);assert(r.errors.some(e=>e.includes('collides')));
});
run('own evidence must bind actual world and be listed in terminal constructor',async()=>{
 const f=await fixture();const resultFile=path.join(f.roots[1],'batch.result.json'),q=await read(resultFile);q.constructionFiles=[];
 await fs.writeFile(resultFile,JSON.stringify(q));const r=await auditLatestSevenHistory(f.review,path.join(f.dir,'audit'),f.options);
 assert.match(r.status,/FAIL/);assert.match(r.errors.join(),/missing from terminal history/);
 const g=await fixture();await fs.writeFile(g.construction.path,JSON.stringify({level:{...g.level,id:99}}));
 const s=await auditLatestSevenHistory(g.review,path.join(g.dir,'audit'),g.options);assert.match(s.status,/FAIL/);assert(s.errors.some(e=>e.includes('construction.json')));
});
run('membership, byte drift and unfinished shared constructor fail closed',async()=>{
 const f=await fixture(),snapshot=await captureLatestSevenHistory(f.options);await put(path.join(f.roots[6],'late.json'),{});
 await assert.rejects(()=>assertLatestSevenHistoryUnchanged(snapshot,f.options),/membership changed/);
 const g=await fixture(),s=await captureLatestSevenHistory(g.options);await fs.appendFile(path.join(g.roots[1],'batch.claim.json'),' ');
 await assert.rejects(()=>assertLatestSevenHistoryUnchanged(s,g.options));
 const h=await fixture();await put(path.join(h.roots[5],'unfinished.claim.json'),{outputDirectory:h.stockDir,plan:{path:'missing',sha256:'a'.repeat(64)}});
 const r=await auditLatestSevenHistory(h.review,path.join(h.dir,'audit'),h.options);assert.match(r.status,/FAIL/);assert.match(r.errors.join(),/Unfinished static construction/);
});
run('private roots reject real shared roots and junction descendants before any capture or write',async()=>{
 const f=await fixture();for(const root of HISTORY_ROOTS){const roots=[...f.roots];roots[6]=root;await assert.rejects(()=>latestHistoryRoots({qualificationOnly:true,privateRoots:roots}),/alias or contain/);}
 const real=await fs.realpath(HISTORY_ROOTS[6]),roots=[...f.roots];roots[6]=path.join(real,'not-created-private');
 await assert.rejects(()=>latestHistoryRoots({qualificationOnly:true,privateRoots:roots}),/alias or contain/);
 const alias=path.join(f.dir,'private-junction');await fs.symlink(path.resolve(f.roots[0]),alias,'junction');
 await assert.rejects(()=>latestHistoryRoots({qualificationOnly:true,privateRoots:[...f.roots.slice(0,6),alias]}),/Distinct/);
});

after(async()=>{
 const fileBindings={};for(const f of ['tools/daily-challenge/formal-v4/latest-seven-history-preflight.mjs','tools/daily-challenge/formal-v4/latest-seven-history-preflight.test.mjs'])fileBindings[f]=sha(await fs.readFile(f));
 await put(path.join(out,'report.json'),{status:evidence.length===7&&evidence.every(e=>e.passed)?'LATEST_SEVEN_HISTORY_PRIVATE_PASS':'LATEST_SEVEN_HISTORY_PRIVATE_FAIL',qualificationOnly:true,evidence,fileBindings,
  newRealHistoryScans:0,newRealConstructions:0,newSearches:0,newPublicClaims:0,formalReady:false});
});
