import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {levelSha256} from '../formal-v2/contract.mjs';
import {loadV3CatalogRuntime} from './catalog-contract.mjs';
import {assertCapacityDesignMigration,assertCapacitySnapshot,CAPACITY_MIGRATION_SNAPSHOT} from './revalidate-capacity-design-only.mjs';
const runtime=await loadV3CatalogRuntime();
const bytes=fs.readFileSync(CAPACITY_MIGRATION_SNAPSHOT.path),snapshot=JSON.parse(bytes),input=snapshot.index.path,inputBytes=fs.readFileSync(input);
const sha=b=>createHash('sha256').update(b).digest('hex');
const entries=snapshot.inputs.map(e=>({...e,receipt:JSON.parse(fs.readFileSync(e.path))})),previous=entries[0].receipt;
test('only original accepted 150 bytes can migrate',()=>{
  assert.equal(sha(bytes),CAPACITY_MIGRATION_SNAPSHOT.sha256);
  assertCapacitySnapshot(snapshot,input,inputBytes,entries);
  assertCapacityDesignMigration(previous,runtime);
});
test('a changed proof, failed candidate or changed original strength dependency cannot migrate',()=>{
  for(const mutate of [p=>p.accepted=false,p=>p.level.blocks[0].x++,p=>p.drags.pop(),p=>p.toolchainSha256='a'.repeat(64)]){
    const p=structuredClone(previous);mutate(p);assert.throws(()=>assertCapacityDesignMigration(p,runtime));
  }
  const changed=structuredClone(runtime.designBindings);changed['tools/daily-challenge/formal-v3/mechanism-intensity.mjs']='b'.repeat(64);
  assert.throws(()=>assertCapacityDesignMigration(previous,{...runtime,designBindings:changed,designToolchainSha256:levelSha256(changed)}));
});
test('new members or lower evidence rewrites cannot be smuggled through the snapshot',()=>{
  assert.throws(()=>assertCapacitySnapshot(snapshot,input,inputBytes,entries.slice(1)));
  assert.throws(()=>assertCapacitySnapshot(snapshot,input,inputBytes,[...entries,entries[0]]));
  const changed=structuredClone(entries);changed[0].receipt.lowerBound.result.exploredStates++;
  changed[0].sha256=sha(JSON.stringify(changed[0].receipt));
  assert.throws(()=>assertCapacitySnapshot(snapshot,input,inputBytes,changed));
});
