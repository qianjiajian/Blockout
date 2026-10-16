import fs from 'node:fs';
import path from 'node:path';
import {loadLeagueProofRuntime} from './proof-contract.mjs';
import {composeLeagueMechanisms} from './mechanism-compose.mjs';
const root='deliverables/league-v2-20261008',out=`${root}/mechanisms/generator-scan-${Date.now()}`;fs.mkdirSync(out,{recursive:true});
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]),read=f=>JSON.parse(fs.readFileSync(f));
const inputs=new Set();for(const file of walk(`${root}/design`).filter(f=>f.endsWith('report.json')))for(const row of read(file).accepted??[])if(row.path)inputs.add(row.path.replaceAll('\\','/'));
const runtime=await loadLeagueProofRuntime(),baseline=read(`${root}/mechanisms/old-formal100-mechanisms.json`),attempts=[],successes=[];
for(const basePath of inputs){
 if(basePath.includes('nearband-generator-01/candidate-00112')||basePath.includes('compact-global-01/candidate-00124'))continue;
 const input=read(basePath),u=input.U??input.proof?.cost??input.replay?.nonClearingDrags;if(u<16||u>30)continue;
 const index=u>=21?43:35;
 const result=await composeLeagueMechanisms(input,{index,sourceLevelId:input.sourceLevelId,runtime,previousInventory:baseline.rows[index-1].inventory});
 const row={basePath,index,ok:result.ok,reason:result.reason,failures:result.failedAttempts?.map(f=>f.error)};attempts.push(row);
 if(result.ok){const file=`${out}/success-${successes.length+1}.json`;fs.writeFileSync(file,JSON.stringify({...result,basePath},null,2)+'\n');successes.push({...row,file,U:result.replay.nonClearingDrags});console.log(JSON.stringify(successes.at(-1)));}
}
fs.writeFileSync(`${out}/report.json`,JSON.stringify({attempts,successes,fullBoardSearches:0},null,2)+'\n');console.log(JSON.stringify({out,attempts:attempts.length,successes:successes.length}));
