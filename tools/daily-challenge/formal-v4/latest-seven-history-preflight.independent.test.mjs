import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {levelSha256} from '../formal-v2/contract.mjs';
import {designFingerprints} from '../formal-v3/bounded-proof.mjs';
import {sha} from './native-batch-io.mjs';
import {auditLatestSevenHistory,evaluateLatestStockCollisions,latestHistoryStockImages} from './latest-seven-history-preflight.mjs';
import {LOW_BAND_ADVANCED_BATCH_VERSION,LOW_BAND_ADVANCED_BATCH_REVIEW_STATUS} from './low-band-advanced-batch-contract.mjs';
const out=process.env.LATEST_SEVEN_INDEPENDENT_OUT;assert(out);await fs.mkdir(out,{recursive:false});
const evidence=[];
const put=async(p,q)=>{const b=JSON.stringify(q,null,2)+'\n';await fs.writeFile(p,b,{flag:'wx'});return{path:p,sha256:sha(b)};};
const check=(name,fn)=>test(name,async()=>{try{await fn();evidence.push({name,passed:true});}catch(e){evidence.push({name,passed:false,error:e.stack});throw e;}});
const toy=()=>({id:999987,width:2,height:2,blocks:[{id:'a',color:'red',x:0,y:0,shape:[[0,0],[1,0]]},{id:'b',color:'blue',x:0,y:1,shape:[[0,0],[1,0]]}],
 gates:[{id:'r',color:'red',side:'top',offset:0,size:2},{id:'b',color:'blue',side:'bottom',offset:0,size:2}]});
const identity=l=>{const f=designFingerprints(l);return{retryIdentitySha256:levelSha256({shapeSha256:f.shapeSha256,colorSha256:f.colorSha256}),designSha256:f.designSha256};};

check('own-file exception requires the exact complete world, not just paired physical identity or path/SHA',()=>{
 const level=toy(),fp=identity(level),ownEvidence={path:'private/own.json',sha256:'1'.repeat(64)},ownRealPath=path.resolve(ownEvidence.path),base={...fp,ownEvidence,ownRealPath,levelSha256:levelSha256(level)};
 const own={...fp,evidence:ownEvidence,realPath:ownRealPath,levelSha256:base.levelSha256};
 assert.equal(evaluateLatestStockCollisions(base,[own]).collisions.length,0);
 const changed=toy();changed.blocks[0].frozen=7;const other={...own,...identity(changed),levelSha256:levelSha256(changed)};
 assert.equal(other.retryIdentitySha256,base.retryIdentitySha256);assert.throws(()=>evaluateLatestStockCollisions(base,[other]),/Exact own construction/);
 assert.equal(evaluateLatestStockCollisions(base,[own,other]).collisions.length,1);
 assert.equal(evaluateLatestStockCollisions(base,[own,{...own,evidence:{...ownEvidence,sha256:'2'.repeat(64)}}]).collisions.length,1);
});

check('a seventh-root terminal reference to a renamed plain-before-mechanism world outside the ledger still collides',async()=>{
 const dir=path.join(out,'private-case');await fs.mkdir(dir);const roots=Array.from({length:7},(_,i)=>path.join(dir,`root-${i}`));for(const r of roots)await fs.mkdir(r);
 const ownOutput=path.join(dir,'own-output'),otherOutput=path.join(dir,'other-output');await fs.mkdir(ownOutput);await fs.mkdir(otherOutput);
 const level=toy(),fp=identity(level),levelSHA=levelSha256(level),stock=await put(path.join(ownOutput,'stock.json'),{level});
 const input=await put(path.join(ownOutput,'candidate.json'),{level,levelSha256:levelSHA,constructionEvidence:stock});
 const constructionPlan=await put(path.join(dir,'construction-plan.json'),{qualificationOnly:true});
 await put(path.join(ownOutput,'index.json'),{plan:constructionPlan,attempts:[{constructionEvidence:stock}]});
 await put(path.join(roots[1],'own.claim.json'),{plan:constructionPlan,outputDirectory:ownOutput});
 await put(path.join(roots[1],'own.result.json'),{plan:constructionPlan,outputDirectory:ownOutput,constructionFiles:[stock]});
 const base=await put(path.join(dir,'base.json'),{accepted:true,sourceLevelId:86,level,levelSha256:levelSHA,attempt:fp,input,plan:{constructionEvidence:stock}});
 const plan=await put(path.join(dir,'plan.json'),{version:LOW_BAND_ADVANCED_BATCH_VERSION,rows:[{index:0,base,sourceLevelId:86,baseLevelSha256:levelSHA,...fp}]});
 const review=await put(path.join(dir,'review.json'),{status:LOW_BAND_ADVANCED_BATCH_REVIEW_STATUS,plan,errors:[],newSearches:0,newLedgerClaims:0,fileBindings:{[plan.path]:plan.sha256}});
 const changed=toy();changed.id=999988;changed.blocks.forEach((b,i)=>b.id='other-'+i);
 const foreign=await put(path.join(otherOutput,'failed-plain.json'),{accepted:false,plain:{level:changed},provenance:{reference:{level}}});
 assert.equal(latestHistoryStockImages(JSON.parse(await fs.readFile(foreign.path))).length,1,'Parent references must not become extra new stocks');
 await put(path.join(otherOutput,'index.json'),{plan:constructionPlan,attempts:[{constructionEvidence:foreign}]});
 await put(path.join(roots[6],'other.claim.json'),{plan:constructionPlan,outputDirectory:otherOutput});
 await put(path.join(roots[6],'other.result.json'),{plan:constructionPlan,outputDirectory:otherOutput,constructionFiles:[foreign]});
 const result=await auditLatestSevenHistory(review,path.join(dir,'audit'),{qualificationOnly:true,privateRoots:roots});
 assert.equal(result.status,'LATEST_SEVEN_STATIC_HISTORY_PREFLIGHT_FAIL');assert(result.errors.some(e=>e.includes('collides with 1')));
 const report=JSON.parse(await fs.readFile(result.path));assert.equal(report.rows[0].ownMatches.length,1);assert.equal(report.rows[0].collisions[0].origin,'terminal-constructionFiles');
});

after(async()=>{
 const fileBindings={};for(const p of ['latest-seven-history-preflight.mjs','latest-seven-history-preflight.independent.test.mjs']){
  const f='tools/daily-challenge/formal-v4/'+p;fileBindings[f]=sha(await fs.readFile(f));}
 await put(out+'/report.json',{status:evidence.length===2&&evidence.every(e=>e.passed)?'INDEPENDENT_LATEST_SEVEN_HISTORY_NEGATIVES_PASS':'FAIL',evidence,fileBindings,
  qualificationOnly:true,newRealHistoryScans:0,newActualAdaptations:0,newSearches:0,newLedgerClaims:0,newPublicClaims:0,formalReady:false});
});
