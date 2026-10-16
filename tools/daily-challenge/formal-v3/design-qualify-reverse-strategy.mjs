import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
const label=process.env.DESIGN_REVERSE_QUALIFICATION_LABEL;
if(!label||!/^[a-z0-9-]+$/.test(label))throw Error('Explicit new qualification label required');
const root='deliverables/daily-formal-v3-20261008/design',directory=`${root}/${label}`;
if(fs.existsSync(directory))throw Error('Preserve previous qualification');
const base='tools/daily-challenge/formal-v3/',tests=['design-reverse-fill-first.test.mjs','design-reverse-large-prefix.test.mjs','reverse-construction-budget.test.mjs'].map(n=>base+n);
fs.mkdirSync(directory);
const command=['--test','--test-reporter=tap',...tests];let tap,status='REVERSE_CONSTRUCTION_STRATEGY_QUALIFICATION_PASS';
try{tap=execFileSync(process.execPath,command,{encoding:'utf8'});}catch(error){tap=String(error.stdout??'')+String(error.stderr??'');status='REVERSE_CONSTRUCTION_STRATEGY_QUALIFICATION_FAIL';}
fs.writeFileSync(`${directory}/tests.tap`,tap);
const runtime=await loadBoundedRuntime(),files=[...tests,...['design-reverse-blueprint.mjs','design-reverse-construction-factory.mjs','design-reverse-interleaved.mjs','design-reverse-pool.mjs','design-screen-large-prefix.mjs'].map(n=>base+n)];
const report={status,tests:Number(tap.match(/^# tests (\d+)$/m)?.[1]),failed:Number(tap.match(/^# fail (\d+)$/m)?.[1]),
 command:[process.execPath,...command],newCandidateSearches:0,independentlyReviewed:false,
 proofToolchainSha256:runtime.toolchainSha256,bindings:files.map(path=>({path,sha256:createHash('sha256').update(fs.readFileSync(path)).digest('hex')}))};
fs.writeFileSync(`${directory}/report.json`,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({directory,status,tests:report.tests,failed:report.failed}));
if(status.endsWith('_FAIL'))process.exitCode=1;
