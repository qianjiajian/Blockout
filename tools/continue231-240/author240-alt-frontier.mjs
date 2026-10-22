import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,ruleGate,loadApi,audit,replay,digest,writeNew} from './common.mjs';
import {makeAltDoubleSquare240} from './author240-alt-double-square.mjs';
import {witnessWide240,directSweep240} from './author240-alt-frontier-native.mjs';
import {blockerBound240} from './author240-alt-blocker-bound-v2.mjs';
import {ordinarySweepPaths} from './author240-alt-sweep-paths.mjs';
import {compileSpatial,each,normalizeClears,cleared} from '../continuation211-colored-witness.mjs';
export function prefix(level,api){
 const c=compileSpatial(level,api),drags=[];let s=c.initial,cost=0;
 const normalize=()=>{const r=normalizeClears(c,s);s=r.s;drags.push(...r.drags);};normalize();
 for(const [x,y,tx,ty]of[[3,6,0,8],[4,6,1,8],[5,6,2,8],[3,5,1,7]]){
  const i=level.blocks.findIndex(b=>b.x===x&&b.y===y);assert(i>=0);let next,drag;
  each(c,s,(n,cost,get)=>{if(cost===1&&n[i]===ty*7+tx&&get().blockId===level.blocks[i].id){next=n;drag=get();return false;}});
  assert(next,'planned prefix');s=next;drags.push(drag);cost++;normalize();
 }
 assert.equal(cleared(c,s),3);return{state:[...s],drags,cost,replay:replay(level,drags,api,{requirePointerCompatible:true})};
}
ruleGate();const{api}=await loadApi(),start=Number(process.argv[2]??104000),count=Number(process.argv[3]??8),run=`${ROOT}/author240-alt/frontier-${start}-${Date.now()}`;
fs.mkdirSync(run,{recursive:true});fs.copyFileSync(new URL(import.meta.url),run+'/generator.mjs');const rows=[];
for(let seed=start;seed<start+count;seed++){
 const built=makeAltDoubleSquare240(seed,api);if(!built){rows.push({seed,status:'CONSTRUCTION_FAILED'});continue;}const{level,sourceChanges}=built,row={seed};
 try{
  row.audit=audit(level,api);row.lower=blockerBound240(level,api);assert(row.lower.thresholdProven);
  row.prefix=prefix(level,api);const c=compileSpatial(level,api),sweep=ordinarySweepPaths({...c,blocks:c.blocks.filter(b=>b.shape.length>=9)});assert.equal(sweep.status,'complete');const paths={...directSweep240(c),...Object.fromEntries(sweep.rows.map(r=>[r.blockId,r.sweepPaths]))};
  row.route=witnessWide240(level,api,paths,{initialState:row.prefix.state,floor:31-row.prefix.cost,goalClears:4,prefixShapeQuotient:true,maxStates:220000,maxMilliseconds:2200});row.status=row.route.status;
  if(row.route.drags){const drags=[...row.prefix.drags,...row.route.drags],rest=normalizeClears(c,Uint16Array.from(row.route.finalState));drags.push(...rest.drags);if(cleared(c,rest.s)<c.totalClears){row.tail=witnessWide240(level,api,paths,{initialState:[...rest.s],floor:31-row.prefix.cost-row.route.cost,maxStates:80000,maxMilliseconds:800});if(row.tail.drags)drags.push(...row.tail.drags);else row.status='tail-'+row.tail.status;}
   if(row.status==='witness'){row.replay=replay(level,drags,api,{complete:true,requirePointerCompatible:true});row.U=row.replay.nonClearingDrags;if(row.U>=21&&row.U<=30){level.parMoves=level.preservedMoveTarget=drags.length;row.status='BOUNDS_MET';writeNew(run+'/qualified240.json',{level,drags,sourceChanges,L:row.lower.provenLowerBound,U:row.U,levelSha256:digest(level),routeSha256:digest(drags),lower:row.lower,audit:row.audit,replay:row.replay,pointerValidated:false,formalAccepted:false});}}
  }
 }catch(e){row.status='REJECTED';row.error=e.message;}
 writeNew(run+`/candidate-${seed}.json`,{level,sourceChanges,row});rows.push(row);console.log(JSON.stringify({seed,status:row.status,L:row.lower?.provenLowerBound,U:row.U,clears:row.route?.maxClearsSeen,error:row.error}));if(row.status==='BOUNDS_MET')break;
}
writeNew(run+'/report.json',{run,rows});console.log(JSON.stringify({run}));
