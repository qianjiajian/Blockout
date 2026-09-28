import fs from 'node:fs';
import {loadApi,OUTPUT,writeNew} from './remake61to70-v146.mjs';
import {proveOpeningFloor} from './opening-projection.mjs';
import {search} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/lift-search.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const file=process.argv[2],d=JSON.parse(fs.readFileSync(file)),{api}=await loadApi();
const proof=proveOpeningFloor(d.level,api,{floor:11,maxStates:500000,maxMilliseconds:20000}),attempts=[];
console.log(JSON.stringify({openingProof:proof.status,states:proof.exploredStates,shortcut:proof.relaxedNonClearingDrags}));
if(!proof.thresholdProven)for(const weight of [5,20,100]){
 const searchResult=search(d.level,{floor:11,maxStates:300000,maxMilliseconds:25000,weight,orderSeed:weight%d.level.blocks.length});attempts.push({weight,...searchResult});console.log(JSON.stringify({weight,status:searchResult.status,cost:searchResult.cost,states:searchResult.states,ms:searchResult.ms}));
 if(searchResult.status==='witness'){
  const replay=api.replayRevisedRoute(d.level,searchResult.drags);if(replay.valid&&replay.complete){const out=`${OUTPUT}/root69/route69-${Date.now()}.json`;writeNew(out,{...d,drags:searchResult.drags,replay,search:searchResult,levelSha256:digest(d.level),routeSha256:digest(searchResult.drags)});console.log(JSON.stringify({out}));break;}
 }
}
writeNew(`${OUTPUT}/root69/optimization-${Date.now()}.json`,{candidate:file,levelSha256:digest(d.level),openingProof:proof,attempts});
