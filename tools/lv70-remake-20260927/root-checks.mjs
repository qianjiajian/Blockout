import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {digest} from '../revised-preview-validation-v160.mjs';
const commands=[
 ['tests',['node_modules/vitest/vitest.mjs','run','tests/level70GeneratorRemake.test.ts','tests/level20OriginalRemake.test.ts','tests/frozenFlipDoorCampaign.test.ts','--reporter=dot']],
 ['typecheck',['node_modules/typescript/bin/tsc','--noEmit']],
 ['lock',['tools/verify-rules-lock.mjs']],
];
const report={createdAt:new Date().toISOString(),commands:{},bindings:{}};
for(const p of ['src/core/level70GeneratorRemake.ts','src/core/levels.ts','tests/level70GeneratorRemake.test.ts','tests/level20OriginalRemake.test.ts','tests/frozenFlipDoorCampaign.test.ts','tests/fixtures/level70-dual-generator-v193.json','docs/rules/manifest.json','tools/lv70-remake-20260927/root-checks.mjs'])report.bindings[p]=digest(fs.readFileSync(p));
for(const[name,args]of commands){const r=spawnSync(process.execPath,args,{encoding:'utf8',windowsHide:true,timeout:120000});report.commands[name]={command:[process.execPath,...args],exitCode:r.status,stdout:r.stdout,stderr:r.stderr,error:r.error?.message??null};}
report.drift=Object.entries(report.bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);
report.status=Object.values(report.commands).every(r=>r.exitCode===0)&&!report.drift.length?'PASS':'FAIL';
const out=`deliverables/lv70-remake-20260927/root-checks-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({out,status:report.status,exits:Object.fromEntries(Object.entries(report.commands).map(([k,v])=>[k,v.exitCode]))}));if(report.status!=='PASS')process.exitCode=1;
