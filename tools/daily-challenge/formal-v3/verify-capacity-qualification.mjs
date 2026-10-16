import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {loadBoundedRuntime} from './bounded-proof.mjs';
const hash=p=>createHash('sha256').update(fs.readFileSync(p)).digest('hex');
const root='deliverables/daily-formal-v3-20261008/proof';
const output=process.argv[2]??`${root}/capacity-integration-qualified-v1`;
assert(!fs.existsSync(output));fs.mkdirSync(output);
const files=['capacity-intensity-policy.mjs','capacity-primary-adapter.mjs','capacity-compose.mjs','catalog-contract.mjs',
 'revalidate-capacity-design-only.mjs','mechanism-intensity.mjs','bounded-proof.mjs'].map(f=>'tools/daily-challenge/formal-v3/'+f);
const before=Object.fromEntries(files.map(p=>[p,hash(p)]));
assert.equal(before['tools/daily-challenge/formal-v3/mechanism-intensity.mjs'],'9593dd7d9362ab8aa819d04584700e4deaff8aadc277c781e19900a9e45e0faa');
const tests=['capacity-intensity-policy-independent.test.mjs','capacity-intensity-policy.test.mjs','capacity-compose.test.mjs',
 'capacity-accounting.test.mjs','catalog-contract.test.mjs','revalidate-capacity-design-only.test.mjs'].map(f=>'tools/daily-challenge/formal-v3/'+f);
const run=spawnSync(process.execPath,['--test',...tests],{encoding:'utf8',env:{...process.env,CAPACITY_POLICY_AUDIT_OUT:`${output}/fixture-evidence`}});
const log=run.stdout+'\n'+run.stderr;fs.writeFileSync(`${output}/tests.txt`,log,{flag:'wx'});
assert.equal(run.status,0,log.slice(-4000));
const count=Number(log.match(/(?:#|ℹ)\s+tests\s+(\d+)/)?.[1]);assert.equal(count,43);
const runtime=await loadBoundedRuntime();assert.equal(runtime.toolchainSha256,'45880664cab6fc33c34b86be252ae1eba4bd611185060de80b24af17d634e804');
assert.deepEqual(Object.fromEntries(files.map(p=>[p,hash(p)])),before,'Tools changed during qualification');
const report={status:'CAPACITY_OPTIONAL_DESIGN_INTEGRATION_QUALIFIED',tests:{count,passed:count,failed:0,exitCode:run.status,
  log:{path:`${output}/tests.txt`,sha256:hash(`${output}/tests.txt`)},files:Object.fromEntries(tests.map(p=>[p,hash(p)]))},
 toolBindings:before,proofToolchainSha256:runtime.toolchainSha256,
 fixtureEvidence:{path:`${output}/fixture-evidence/report.json`,sha256:hash(`${output}/fixture-evidence/report.json`)},
 fixedFindings:[
  'Actual tryExit gateId/portalIndex and exit-time colour/flip state bind frozen/flip participation; unused same-colour star-neighbor portals reject.',
  'Generator cargo counts complete entity removals and distinct remaining base entities; shell peels cannot impersonate multiple base bodies.',
  'Lift/shutter activity requires nonempty hidden inventory and complete removal of every hidden entity.',
  'Every present numeric/reveal mechanism combination needs at least two actual release drags; deterministic support may exceed the minimum total.',
  'One shared conservative world reservation budget covers all primary instance counts, attempts, full-model held moves, probes and support. Exhaustion stops composition before another mutation/count.',
  'Catalog capacity receipts bind the final level/route, predeclared construction task, finite accounting, per-kind sum and separate first-final-object proof boundary.'
 ],
 primaryAdapterDifferencesFromOriginal:[
  'Isolated version and single-primary permission only for generator/axis/lift/grid; per-type numeric/inventory targets preserved.',
  'Primary singleton reveal may defer staggering to the combined audit; final combined audit has no single-release exemption.',
  'Additional safety repair beyond the initial three-copy changes: shared conservative world reservations and immediate exhaustion propagation; unsupported primary kinds reject.'
 ],
 catalogAndMigrationReview:{
  explicitCapacityOptionRequired:true,defaultUniformPathUnchanged:true,
  exactPriorInventoryBoundToCurrent450Baseline:true,freshActualAllMechanismReplayRequired:true,
  constructionAndProofAreSeparateTasks:'Construction precedes the first proof of its new final physical object; a failed final proof never authorizes another composition on that same shape/colour input.',
  old150Migration:'Snapshot/index/all receipt bytes fixed; only catalog binding and three optional dependencies may change; actual level/routes/math/old strength retained, fresh full catalog audit required.',
  migrationExecuted:false,newLowerSolverInvocations:0,newUpperSolverInvocations:0
 },
 historicalEvidence:{retainedFalsePositiveReports:[`${root}/capacity-policy-independent-v1/report.json`,`${root}/capacity-policy-independent-v2/report.json`],
  testHarnessCorrection:'v4 intermediate aggregate was incomplete: one shell/grid fixture violated the runtime contract. Its CLI failed; final reports require all eight independent cases. Original file retained, not qualification evidence.'},
 limitations:['Real generator/lift/axis/grid examples here are qualification fixtures; none is a new formal slot.',
  'Construction reservations are an explicit conservative upper bound including duplicates, not exact unique BFS states.',
  'Current selected 150 were not re-solved or migrated by this verifier. Production and Pointer acceptance remain separate.'],
 formalReady:false,productionChanged:false,realSaveAccess:false};
fs.writeFileSync(`${output}/report.json`,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,reportSha256:hash(`${output}/report.json`),tests:count,toolBindings:before,formalReady:false}));
