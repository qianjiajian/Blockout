import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime} from './bounded-proof.mjs';
const label=process.env.DESIGN_COLOUR_QUALIFICATION_LABEL??'route-colour-qualification-v1';if(!/^[a-z0-9-]+$/.test(label))throw Error('Invalid qualification label');
const output=`deliverables/daily-formal-v3-20261008/design/${label}`;
if(fs.existsSync(output))throw Error('Preserve qualification evidence');fs.mkdirSync(output);
const base='tools/daily-challenge/formal-v3/',tests=['design-route-compatible-colouring.test.mjs','design-route-compatible-colouring-independent.test.mjs','reverse-construction-budget.test.mjs','reverse-construction-ledger.test.mjs'];
const log=execFileSync(process.execPath,['--test','--test-reporter=tap',...tests.map(x=>base+x)],{encoding:'utf8',maxBuffer:2000000});
fs.writeFileSync(`${output}/tests.tap`,log,{flag:'wx'});const count=Number(log.match(/^# tests (\d+)$/m)?.[1]),fail=Number(log.match(/^# fail (\d+)$/m)?.[1]);
if(!count||fail!==0)throw Error('Route colouring qualification failed');
const modules=[...tests,'design-route-compatible-colouring.mjs','design-reverse-construction-factory.mjs','design-reverse-construction-ledger.mjs','design-reverse-pool.mjs','design-reverse-interleaved.mjs','design-reverse-proof-plan.mjs','diversity.mjs','design-qualify-route-colouring.mjs'];
const runtime=await loadBoundedRuntime(),bindings=modules.map(x=>({path:base+x,sha256:createHash('sha256').update(fs.readFileSync(base+x)).digest('hex')}));
fs.writeFileSync(`${output}/report.json`,JSON.stringify({status:'ROUTE_COMPATIBLE_COLOURING_QUALIFICATION_PASS',tests:count,failed:0,
 newProductionCandidateSearches:0,fixtureOnly:true,proofToolchainSha256:runtime.toolchainSha256,bindings,
 verified:['Strict plain domain and complete inventory; unique used gate colours and actual q0 shape/colour asset bytes.',
 'Pointer-down, intermediate turning contact and endpoint contact forbid new colours on parking drags; idle unselected contact is permitted.',
 'Fixed commit geometry and removal schedule, exact colour counts and joint adjacency colouring, one complete selected assignment and both actual replays.',
 'Independent six-colour actual first-contact oracle and finite micro/CSP/combined raw negative tests.',
 'Parent fill+colour domains+final replays share one raw budget; state10001 stops and no layer/body/colour reset.',
 'Final recoloured stock alias remains blocked across ledger reload without changing original claim bytes.'],formalReady:false},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,tests:count,failed:fail,proof:runtime.toolchainSha256}));
