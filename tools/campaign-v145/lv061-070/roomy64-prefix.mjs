import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,OUTPUT,writeNew,ruleGate,auditStructure} from './remake61to70-v146.mjs';
import {search} from '../../../deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64/local-graph.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
ruleGate();const file=`${OUTPUT}/author61-64/partial64-147964-495-1790252592284.json`,data=JSON.parse(fs.readFileSync(file)),{api}=await loadApi(),level=structuredClone(data.level);
for(const[n,x,y]of [[9,4,0],[5,5,0],[1,5,1],[8,5,3],[11,4,3],[7,3,4],[6,6,4],[3,3,5],[2,4,2],[4,4,5],[10,0,2]])Object.assign(level.blocks.find(b=>b.id===`v146-64-opening-${n}`),{x,y});
auditStructure({...data,level},api);
const move=(n,path,exitSide)=>({blockId:`v146-64-opening-${n}`,path,...(exitSide?{exitSide}:{})}),drags=[move(2,[],'right'),move(8,[[5,2]]),move(11,[[4,2]]),move(6,[[6,3]]),move(4,[[4,4]],'right'),move(7,[[4,4],[5,4],[6,4]],'right'),move(9,[],'top'),move(11,[[4,3],[4,4]]),move(6,[[5,3],[4,3],[4,2],[4,1],[4,0]],'top')],replay=api.replayRevisedRoute(level,drags);assert(replay.valid,JSON.stringify(replay));assert.equal(replay.clearEvents,5);assert.equal(replay.nonClearingDrags,4);
const out=`${OUTPUT}/root64/roomy-prefix64-${Date.now()}.json`;writeNew(out,{...data,level,drags,replay,notComplete:true,construction:{base:file,kind:'explicit-opening-anchor-plan'},levelSha256:digest(level)});console.log(JSON.stringify({out,clears:5,U:4}));
const result=search(level,{floor:21,maxStates:1500000,maxMilliseconds:30000,orderSeed:0});if(result.status==='witness'){const replay=api.replayRevisedRoute(level,result.drags);assert(replay.valid&&replay.complete);const solved=`${OUTPUT}/root64/roomy64-${Date.now()}.json`;writeNew(solved,{...data,level,drags:result.drags,replay,notComplete:false,construction:{base:file,kind:'explicit-opening-anchor-plan'},levelSha256:digest(level)});console.log(JSON.stringify({solved,U:replay.nonClearingDrags}));}else{writeNew(`${OUTPUT}/root64/roomy-attempt-${Date.now()}.json`,{candidate:out,result});console.log(JSON.stringify(result));}
