import fs from 'node:fs';
import path from 'node:path';
import {loadRuntime} from '../daily-challenge/formal-v2/contract.mjs';
import {composeLeagueMechanisms} from './mechanism-compose.mjs';
const OUT=`deliverables/league-v2-20261008/mechanisms/pilot-${Date.now()}`;fs.mkdirSync(OUT,{recursive:true});
const runtime=await loadRuntime(),baseline=JSON.parse(fs.readFileSync('deliverables/league-v2-20261008/mechanisms/old-formal100-mechanisms.json'));
const supplied=process.argv.slice(2),files=supplied.length?supplied:['deliverables/daily-formal-v3-20261008/design/global-pilot-02/candidate-0030.json','deliverables/daily-formal-v3-20261008/design/global-pilot-02/candidate-0218.json'];
const rows=[];
for(const [fi,file]of files.entries()){
 const packet=JSON.parse(fs.readFileSync(file)),input=typeof packet.accepted==='object'?packet.accepted:packet;
 const drags=input.drags??input.route?.drags??input.proof?.drags??input.proof?.route?.drags;
 if(!input.level||!drags)throw Error(`no level/route in ${file}: ${Object.keys(input)}`);
 for(const index of [6,10,15,20,35,50,59,65,100]){
  const result=await composeLeagueMechanisms({level:input.level,drags},{index,sourceLevelId:input.sourceLevelId??input.level.id,runtime,previousInventory:baseline.rows[index-1].inventory});
  const out=path.join(OUT,`source-${fi}-index-${String(index).padStart(3,'0')}.json`);fs.writeFileSync(out,JSON.stringify({...result,fixtureOnly:true,basePath:file},null,2)+'\n');
  const row={index,basePath:file,file:out,ok:result.ok,reason:result.reason,lastFailure:result.failedAttempts?.at(-1)?.error,U:result.replay?.nonClearingDrags,comparison:result.comparison&&{old:result.comparison.previousTotal,new:result.comparison.currentTotal}};rows.push(row);console.log(JSON.stringify(row));
  fs.writeFileSync(path.join(OUT,'summary.json'),JSON.stringify({status:'FIXTURE_ONLY_NOT_FORMAL_CANDIDATES',rows},null,2)+'\n');
 }
}
