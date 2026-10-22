import fs from 'node:fs';import assert from 'node:assert/strict';
import {make} from './author232-root4-generator.mjs';
import {ROOT,loadApi,audit,digest,replay} from './common.mjs';
import {prefixBound232} from './author232-prefix-closure-bound.mjs';
import {searchSpatial as beam} from './author232-root-focus-route.mjs';
import {searchSpatial as guided} from './author232-guided-route.mjs';
const {api}=await loadApi(),start=Number(process.argv[2]??140001),count=Number(process.argv[3]??30);
const dir=ROOT+`/alternate232/root6-${start}-${Date.now()}`;fs.mkdirSync(dir,{recursive:true});
for(const file of ['author232-root4-generator.mjs','author232-root6-search.mjs'])fs.copyFileSync('tools/continue231-240/'+file,dir+'/'+file);
const rows=[];let accepted;for(let seed=start;seed<start+count;seed++){
 const level=make(seed),row={seed};if(!level){row.status='CONSTRUCTION_CONSTRAINT';rows.push(row);continue;}
 try{row.audit=audit(level,api);row.levelSha256=digest(level);row.lower=prefixBound232(level,api);row.status='LOWER_'+row.lower.status;
 if(row.lower.thresholdProven){
 const cp=structuredClone(level);cp.mechanismRules='revised-2026-09-23-v1.4';
 const opts={floor:16,maxMilliseconds:6000,maxStates:80000,maxTransitions:1500000,orderSeed:seed%19,beamWidth:100};
 row.route=beam(cp,api,opts);if(row.route.status!=='witness'){row.beam=row.route;row.route=guided(cp,api,{...opts,normalize:true,symmetry:true});}
 row.status='ROUTE_'+row.route.status;
 if(row.route.status==='witness'){row.replay=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=row.replay.nonClearingDrags;assert(row.U<=15&&row.U>=11);level.parMoves=row.replay.effectiveDrags;level.preservedMoveTarget=level.parMoves;row.status='BOUNDS_MET_QUALIFICATION_PENDING';accepted={level,drags:row.route.drags,row};}
 }
 }catch(e){row.status='REJECTED';row.error=e.message;}
 fs.writeFileSync(dir+`/candidate-${seed}.json`,JSON.stringify({level,row},null,2));rows.push(row);
 console.log(JSON.stringify({seed,status:row.status,L:row.lower?.provenLowerBound,U:row.U,clears:row.route?.maxClearsSeen,error:row.error?.slice(0,100)}));if(accepted)break;
}
fs.writeFileSync(dir+'/report.json',JSON.stringify({dir,accepted,rows},null,2));console.log(JSON.stringify({dir,attempted:rows.length,accepted:!!accepted}));
