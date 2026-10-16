import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {loadV3CatalogRuntime,auditV3Catalog} from './catalog-contract.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';
import {replayDecorated} from '../formal-v2/mechanism-decorate.mjs';

const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export const CAPACITY_MIGRATION_SNAPSHOT=Object.freeze({
  path:'deliverables/daily-formal-v3-20261008/proof/pre-capacity-contract-150/snapshot.json',
  sha256:'eff828cb91f9e9b769cd4523b0c4da6ee6ebacfc5a129e4e691cf555cbea2e51',
});
const changedFile='tools/daily-challenge/formal-v3/catalog-contract.mjs';
const addedFiles=['capacity-compose.mjs','capacity-intensity-policy.mjs','capacity-primary-adapter.mjs']
  .map(f=>`tools/daily-challenge/formal-v3/${f}`).sort();
const preservedFields=['level','drags','lowerBound','route','staticAudit','strength','toolchainBindings'];

export function assertCapacityDesignMigration(previous,runtime){
  assert(previous.accepted===true&&previous.status==='BOUNDED_SPATIAL_VERIFIED_AWAITING_V3_DESIGN_AND_POINTER');
  assert.equal(previous.levelSha256,levelSha256(previous.level),'No level changes');
  assert.equal(previous.routeSha256,routeSha256(previous.drags),'No witness changes');
  assert.equal(previous.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
  assert.equal(previous.toolchainSha256,runtime.toolchainSha256,'No proof implementation changes');
  assert.equal(levelSha256(previous.toolchainBindings),levelSha256(runtime.toolchainBindings));
  assert.notEqual(previous.strength?.kind,'capacity-active-mechanisms','Only original uniform/foundation receipts migrate');
  const before=previous.design.designBindings,after=runtime.designBindings;
  assert.equal(previous.design.designToolchainSha256,levelSha256(before));
  assert.equal(runtime.designToolchainSha256,levelSha256(after));
  assert.equal(before[changedFile],'655ca679a25f1903b4cbe4229ce37afc665c29ec3d9f3842f0deff3b0f008d00');
  assert.deepEqual(Object.keys(before).filter(f=>!(f in after)),[],'No dependency removals');
  assert.deepEqual(Object.keys(after).filter(f=>!(f in before)).sort(),addedFiles,'Only reviewed capacity dependencies');
  assert.deepEqual(Object.keys(before).filter(f=>before[f]!==after[f]),[changedFile],'Original intensity and diversity stay unchanged');
}

export function assertCapacitySnapshot(snapshot,input,bytes,entries){
  assert.equal(input,snapshot.index.path);assert.equal(sha(bytes),snapshot.index.sha256);
  assert.equal(snapshot.inputs.length,150);assert.equal(entries.length,150);
  assert.deepEqual(entries.map(e=>({path:e.path,sha256:e.sha256})),snapshot.inputs,'No membership or mathematical byte changes');
}

async function main(){
  const [label]=process.argv.slice(2);assert(/^[a-z0-9-]+$/.test(label??''),'new output label required');
  const snapshotBytes=await fs.readFile(CAPACITY_MIGRATION_SNAPSHOT.path);
  assert.equal(sha(snapshotBytes),CAPACITY_MIGRATION_SNAPSHOT.sha256);
  const snapshot=JSON.parse(snapshotBytes),input=snapshot.index.path,inputBytes=await fs.readFile(input),index=JSON.parse(inputBytes);
  const entries=await Promise.all(index.files.map(async path=>{const bytes=await fs.readFile(path);return{path,sha256:sha(bytes),receipt:JSON.parse(bytes)};}));
  assertCapacitySnapshot(snapshot,input,inputBytes,entries);
  const runtime=await loadV3CatalogRuntime(),reports=[],output=`deliverables/daily-formal-v3-20261008/selection/${label}`;
  // Do all read-only checks before creating any new candidate receipt.
  for(const entry of entries){
    const previous=entry.receipt;assertCapacityDesignMigration(previous,runtime);
    const canonical=replayDecorated(runtime,previous.level,previous.drags,previous.timeSchedule);
    const independent=independentReplay(runtime,previous.level,previous.drags,{timeSchedule:previous.timeSchedule});
    for(const r of [canonical,independent])assert(r.valid&&r.complete&&!r.failed&&r.nonClearingDrags===previous.U,'Actual witness replay changed');
    const next={...previous,design:{...previous.design,designBindings:runtime.designBindings,designToolchainSha256:runtime.designToolchainSha256},
      capacityDesignRevalidation:{method:'new-optional-design-policy-original-math-and-strength-unchanged',
        previousReceipt:entry.path,previousReceiptSha256:entry.sha256,snapshot:CAPACITY_MIGRATION_SNAPSHOT,
        levelUnchanged:true,routeUnchanged:true,originalUniformStrengthUnchanged:true,
        lowerBoundSha256:levelSha256(previous.lowerBound),upperEvidenceSha256:levelSha256(previous.route),
        newLowerSearchInvocations:0,newUpperSearchInvocations:0,canonicalReplay:canonical,independentReplay:independent},
      formalReady:false,productionChanged:false};
    for(const field of preservedFields)assert.equal(levelSha256(previous[field]),levelSha256(next[field]),`Changed original ${field}`);
    reports.push(next);
  }
  const audit=await auditV3Catalog(runtime,reports,{expectFull:false});
  assert.equal(audit.verified,150,'Current full object / actual source / material / original strength / math binding audit');
  assert.equal(audit.diversity.reasons.length,0);
  for(const entry of entries)assert.equal(sha(await fs.readFile(entry.path)),entry.sha256);
  await fs.mkdir(output,{recursive:false});const files=[];
  for(const report of reports){const file=`${output}/${report.formalId}.json`;files.push(file);await fs.writeFile(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});}
  const tool='tools/daily-challenge/formal-v3/revalidate-capacity-design-only.mjs';
  await fs.writeFile(`${output}/index.json`,JSON.stringify({schemaVersion:3,priorIndex:input,inputSha256:sha(inputBytes),files,
    status:'OPTIONAL_CAPACITY_DESIGN_BOUND_ORIGINAL_150_UNCHANGED',snapshot:CAPACITY_MIGRATION_SNAPSHOT,
    tool:{path:tool,sha256:sha(await fs.readFile(tool))},newLowerSearchInvocations:0,newUpperSearchInvocations:0,
    formalReady:false,productionChanged:false},null,2)+'\n',{flag:'wx'});
  await fs.writeFile(`${output}/audit.json`,JSON.stringify(audit,null,2)+'\n',{flag:'wx'});
  console.log(JSON.stringify({output,selected:150,verified:150,newSearches:0,formalReady:false}));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)await main();
