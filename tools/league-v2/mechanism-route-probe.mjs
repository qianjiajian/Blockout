import fs from 'node:fs';
import path from 'node:path';
import {loadRuntime} from '../daily-challenge/formal-v2/contract.mjs';
import {composeLeagueMechanisms} from './mechanism-compose.mjs';
const [file,indicesText]=process.argv.slice(2);if(!file||!indicesText)throw Error('usage: mechanism-route-probe.mjs file index,index');
const indices=indicesText.split(',').map(Number),input=JSON.parse(fs.readFileSync(file)),runtime=await loadRuntime();
const baseline=JSON.parse(fs.readFileSync('deliverables/league-v2-20261008/mechanisms/old-formal100-mechanisms.json'));
const OUT=`deliverables/league-v2-20261008/mechanisms/route-probes/${Date.now()}`;fs.mkdirSync(OUT,{recursive:true});
for(const index of indices){const r=await composeLeagueMechanisms(input,{index,sourceLevelId:input.sourceLevelId,runtime,previousInventory:baseline.rows[index-1].inventory});
 const out=path.join(OUT,`index-${String(index).padStart(3,'0')}.json`),result={...r,basePath:file,mechanismReceipt:out.replaceAll('\\','/'),lowerProofNotRun:true};fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({out,index,primary:r.plan.primary,ok:r.ok,reason:r.reason,lastFailure:r.failedAttempts?.at(-1)?.error,U:r.replay?.nonClearingDrags,total:r.comparison?.currentTotal}));}
