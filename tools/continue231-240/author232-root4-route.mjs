import fs from 'node:fs';
import assert from 'node:assert/strict';
import {make} from './author232-root4-generator.mjs';
import {ROOT,loadApi,audit,digest,replay} from './common.mjs';
import {searchSpatial} from './author232-beam-v2-route.mjs';
const {api}=await loadApi(),start=Number(process.argv[2]??110001),count=Number(process.argv[3]??20);
const dir=ROOT+`/alternate232/root4-${start}-${Date.now()}`;fs.mkdirSync(dir,{recursive:true});
for(const file of ['author232-root4-generator.mjs','author232-root4-route.mjs'])fs.copyFileSync('tools/continue231-240/'+file,dir+'/'+file);
const rows=[];for(let seed=start;seed<start+count;seed++){
 const level=make(seed),row={seed};if(!level){row.status='CONSTRUCTION_CONSTRAINT';rows.push(row);continue;}
 try{row.audit=audit(level,api);row.levelSha256=digest(level);const cp=structuredClone(level);cp.mechanismRules='revised-2026-09-23-v1.4';
 row.route=searchSpatial(cp,api,{floor:16,maxMilliseconds:5500,maxStates:60000,maxTransitions:1000000,orderSeed:seed%19,beamWidth:100});
 row.status='ROUTE_'+row.route.status;
 if(row.route.status==='witness'){row.replay=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=row.replay.nonClearingDrags;assert(row.U<=15);row.status='FULL_ROUTE_PENDING_FIRST_PARKING_BOUND';}
 }catch(e){row.status='REJECTED';row.error=e.message;}
 fs.writeFileSync(dir+`/candidate-${seed}.json`,JSON.stringify({level,row},null,2));rows.push(row);
 console.log(JSON.stringify({seed,status:row.status,U:row.U,clears:row.route?.maxClearsSeen}));
}
fs.writeFileSync(dir+'/report.json',JSON.stringify({dir,rows},null,2));console.log(JSON.stringify({dir,attempted:rows.length,witnesses:rows.filter(r=>r.U!==undefined).length}));
