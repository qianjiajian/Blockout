import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ROOT,ruleGate,loadApi,audit,digest,replay} from './common.mjs';
import {searchSpatial} from '../continuation211-colored-witness.mjs';
import {liftPayload,runNativeLift} from './author234-native.mjs';
ruleGate();const {api}=await loadApi();
const prior=JSON.parse(fs.readFileSync(ROOT+'/author234/run-201-1792395934056/report.json')).accepted;
const level=structuredClone(prior.level),shapes=Object.fromEntries(api.FORMAL_BLOCK_SHAPES.map(s=>[s.shapeId,s.cells]));
const cyan=level.blocks.find(b=>b.id==='l234-left-cyan'),green=level.blocks.find(b=>b.id==='l234-left-green');
cyan.shape=shapes[20];cyan.x=0;cyan.y=0;green.shape=shapes[1];green.x=2;green.y=2;
level.mechanismAdaptation.change+=' 为保留来源异形块机制，左帘两体改为q0青8格缺角方块+绿单格，保持2体、真实9格满铺；来源原两L4缺1格不能直接沿用。';
const out=ROOT+'/author234/shape-preserved-'+Date.now();fs.mkdirSync(out);fs.copyFileSync(new URL(import.meta.url),out+'/author-source.mjs');
const row={audit:audit(level,api),levelSha256:digest(level)};
row.route=searchSpatial(level,api,{floor:21,maxMilliseconds:8000,maxStates:180000,maxTransitions:2000000,normalize:true,orderSeed:6});
row.status='ROUTE_'+row.route.status;
let accepted=null;
if(row.route.status==='witness'){
 const rt=replay(level,row.route.drags,api,{complete:true,requirePointerCompatible:true});row.U=rt.nonClearingDrags;row.totalDrags=rt.effectiveDrags;
 if(row.U>=16&&row.U<=20){const{p}=liftPayload(level,api,{floor:16,maxMilliseconds:10000,maxStates:500000});row.lower=runNativeLift(p);row.status=row.lower.thresholdProven?'BOUNDS_MET_VALIDATION_PENDING':'LOWER_'+row.lower.status;if(row.lower.thresholdProven){level.preservedMoveTarget=rt.effectiveDrags;accepted={level,drags:row.route.drags,row};}}
}
fs.writeFileSync(out+'/report.json',JSON.stringify({accepted,level,row},null,2));console.log(JSON.stringify({out,status:row.status,U:row.U,drags:row.totalDrags,lower:row.lower}));
