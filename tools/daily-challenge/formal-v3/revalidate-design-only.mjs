import fs from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {loadV3CatalogRuntime,auditV3Catalog} from './catalog-contract.mjs';
import {auditDiversity,compareLayouts,DIVERSITY_POLICY} from './diversity.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';

const allowedDesignFile='tools/daily-challenge/formal-v3/diversity.mjs';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const reviewedSnapshot={path:'deliverables/daily-formal-v3-20261008/proof/diversity-symmetric-audit-134-v1/report.json',
 sha256:'693d1529edf6f6c8a9e4becaf571d71b7f82c85867ecea0d12b3d745142ef460'};
export function assertReviewedSnapshot(input,inputBytes,entries,snapshot){
 assert.equal(input,snapshot.index.path,'Index was not reviewed');
 assert.equal(sha(inputBytes),snapshot.index.sha256,'Reviewed index changed');
 assert.deepEqual(snapshot.proofToolchainSha256s,['45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804']);
 assert.deepEqual(entries.map(e=>e.path),snapshot.inputs.map(e=>e.path),'Reviewed membership changed');
 for(let i=0;i<entries.length;i++){
  const entry=entries[i],old=snapshot.inputs[i];
  assert.equal(entry.sha256,old.sha256,'Previously reviewed mathematical receipt changed');
  assert.equal(levelSha256(entry.receipt.lowerBound),old.lowerBoundSha256,'Reviewed lower evidence changed');
  assert.equal(entry.receipt.levelSha256,old.levelSha256);
  assert.equal(entry.receipt.routeSha256,old.routeSha256);
 }
}

// This migration cannot certify an unproved object or replace mathematical
// evidence. Only the comparison policy changed; all proof inputs stay bound.
export function assertDesignOnlyInputs(previous,runtime){
 assert(previous.accepted===true&&previous.status==='BOUNDED_SPATIAL_VERIFIED_AWAITING_V3_DESIGN_AND_POINTER','Previously accepted bounded receipt required');
 assert.equal(previous.levelSha256,levelSha256(previous.level),'Level changed');
 assert.equal(previous.routeSha256,routeSha256(previous.drags),'Route changed');
 assert.equal(previous.toolchainSha256,runtime.toolchainSha256,'Proof toolchain changed');
 assert.equal(levelSha256(previous.toolchainBindings),levelSha256(runtime.toolchainBindings),'Proof bindings changed');
 assert.equal(previous.design?.policy?.version,'daily-diversity-v3.1','Only the v3.1 comparison migration is allowed');
 const old=previous.design.designBindings,current=runtime.designBindings;
 assert.deepEqual(Object.keys(old).sort(),Object.keys(current).sort(),'Design file set changed');
 const changed=Object.keys(current).filter(p=>old[p]!==current[p]);
 assert.deepEqual(changed,[allowedDesignFile],'Only the reviewed comparison implementation may change');
 assert.equal(previous.design.designToolchainSha256,levelSha256(old),'Old design binding malformed');
 assert.equal(runtime.designToolchainSha256,levelSha256(current),'Current design binding malformed');
 return changed;
}

async function main(){
 const [input,label]=process.argv.slice(2);
 if(!input||!label||!/^[a-z0-9-]+$/.test(label))throw Error('selection-index new-label');
 const output=`deliverables/daily-formal-v3-20261008/selection/${label}`;
 await fs.mkdir(output,{recursive:false});
 const inputBytes=await fs.readFile(input),index=JSON.parse(inputBytes),runtime=await loadV3CatalogRuntime();
 const previous=await Promise.all(index.files.map(async path=>{const bytes=await fs.readFile(path);return{path,sha256:sha(bytes),receipt:JSON.parse(bytes)};}));
 const snapshotBytes=await fs.readFile(reviewedSnapshot.path);
 assert.equal(sha(snapshotBytes),reviewedSnapshot.sha256,'Independent review snapshot changed');
 assertReviewedSnapshot(input,inputBytes,previous,JSON.parse(snapshotBytes));
 // Capture the complete selection ancestry and retain reviewed exclusions.
 const selectionAncestry=[],visualExclusions=new Set(),seen=new Set();let ancestor=input;
 while(ancestor&&!seen.has(ancestor)){
  seen.add(ancestor);const bytes=await fs.readFile(ancestor),history=JSON.parse(bytes);
  selectionAncestry.push({path:ancestor,sha256:sha(bytes)});
  for(const removed of history.visualCuration?.removed??[])visualExclusions.add(removed.levelSha256);
  if(history.visualCuration){
   assert.equal(sha(await fs.readFile(history.visualCuration.reviewFile)),history.visualCuration.reviewSha256,'Visual review changed');
   assert.equal(sha(await fs.readFile(history.priorIndex)),history.visualCuration.inputSha256,'Reviewed selection changed');
  }
  ancestor=history.priorIndex;
 }
 assert(previous.every(e=>!visualExclusions.has(e.receipt.levelSha256)),'A visually removed object returned');
 const preflight=auditDiversity(previous.map(x=>x.receipt));
 await fs.writeFile(`${output}/new-comparison-preflight.json`,JSON.stringify(preflight,null,2)+'\n',{flag:'wx'});
 assert.equal(preflight.reasons.length,0,'Curate new diversity failures before migration');
 const reports=[],files=[];
 const tool={path:'tools/daily-challenge/formal-v3/revalidate-design-only.mjs'};tool.sha256=sha(await fs.readFile(tool.path));
 for(const entry of previous){
  const p=entry.receipt,changed=assertDesignOnlyInputs(p,runtime);
  const source=runtime.LEVELS.find(l=>l.id===p.sourceLevelId);
  const canonicalReplay=replayDecorated(runtime,p.level,p.drags,p.timeSchedule);
  const independent=independentReplay(runtime,p.level,p.drags,{timeSchedule:p.timeSchedule});
  for(const replay of [canonicalReplay,independent])assert(replay.valid&&replay.complete&&!replay.failed&&replay.nonClearingDrags===p.U,'Fresh complete known-route replay failed');
  const r={...p,design:{...p.design,policy:DIVERSITY_POLICY,passed:true,
   sourceComparison:compareLayouts(p.level,source),designBindings:runtime.designBindings,designToolchainSha256:runtime.designToolchainSha256},
   designRevalidation:{method:'unchanged-mathematical-object-new-symmetric-design-comparison',previousReceipt:entry.path,previousReceiptSha256:entry.sha256,
    allowedChangedDesignFiles:changed,tool,reviewedSnapshot,lowerBoundSha256:levelSha256(p.lowerBound),upperEvidenceSha256:levelSha256(p.route),
    levelUnchanged:true,routeUnchanged:true,mathematicalProofUnchanged:true,newLowerSearchInvocations:0,newUpperSearchInvocations:0,
    canonicalReplay,independentReplay:independent},formalReady:false};
  for(const field of ['level','drags','lowerBound','route','staticAudit','strength','toolchainBindings'])assert.equal(levelSha256(r[field]),levelSha256(p[field]),`Unexpected mutation of ${field}`);
  reports.push(r);files.push(`${output}/${p.formalId}.json`);
 }
 const audit=await auditV3Catalog(runtime,reports,{expectFull:false});
 assert.equal(audit.verified,reports.length,'Source/static/art/rules/proof/mechanism binding or replay failed');
 assert.equal(audit.diversity.reasons.length,0,'Symmetric diversity not passed');
 for(const binding of selectionAncestry)assert.equal(sha(await fs.readFile(binding.path)),binding.sha256,'Selection ancestry changed during audit');
 for(let i=0;i<files.length;i++)await fs.writeFile(files[i],JSON.stringify(reports[i],null,2)+'\n',{flag:'wx'});
 await fs.writeFile(`${output}/index.json`,JSON.stringify({schemaVersion:3,priorIndex:input,inputSha256:sha(inputBytes),files,
  status:'DESIGN_REVALIDATED_WITH_UNCHANGED_BOUNDED_MATHEMATICAL_EVIDENCE',reviewedSnapshot,selectionAncestry,visualExcludedLevelSha256s:[...visualExclusions],formalReady:false,productionChanged:false,newLowerSearchInvocations:0,newUpperSearchInvocations:0},null,2)+'\n',{flag:'wx'});
 await fs.writeFile(`${output}/audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({selected:files.length,verified:audit.verified,policy:DIVERSITY_POLICY.version,newSearches:0,formalReady:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
