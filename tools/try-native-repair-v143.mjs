import fs from 'node:fs';
import {loadApi,ruleGate,writeNew} from './native-block-repair-v143.mjs';

const {api}=await loadApi();
const replacements={
  23:{'r139-23-17':[
    {id:'v143-23-17-bar',x:1,y:2,shape:[[0,0],[1,0]],color:'green',shutterId:'cover-2'},
    {id:'v143-23-17-single',x:2,y:1,shape:[[0,0]],color:'green',shutterId:'cover-2'},
  ]},
  26:{'r139-26-h10':[
    {id:'v143-26-h10-bar',x:1,y:5,shape:[[0,0],[1,0]],color:'purple',shutterId:'r139-26-lower'},
    {id:'v143-26-h10-single',x:2,y:6,shape:[[0,0]],color:'purple',shutterId:'r139-26-lower'},
  ],'r139-26-h11':[
    {id:'v143-26-h11-bar',x:1,y:6,shape:[[0,0],[0,1],[0,2]],color:'red',shutterId:'r139-26-lower'},
    {id:'v143-26-h11-single',x:2,y:7,shape:[[0,0]],color:'red',shutterId:'r139-26-lower'},
  ]},
  28:{'s28-hidden-1-0':[
    {id:'v143-28-hidden-1-0-bar',x:0,y:8,shape:[[0,0],[1,0]],color:'cyan',shutterId:'s28-curtain-1'},
    {id:'v143-28-hidden-1-0-single',x:1,y:7,shape:[[0,0]],color:'cyan',shutterId:'s28-curtain-1'},
  ],'s28-hidden-1-1':[
    {id:'v143-28-hidden-1-1-bar',x:4,y:7,shape:[[0,0],[1,0]],color:'pink',shutterId:'s28-curtain-1'},
    {id:'v143-28-hidden-1-1-single',x:5,y:6,shape:[[0,0]],color:'pink',shutterId:'s28-curtain-1'},
  ],'s28-hidden-1-2':[
    {id:'v143-28-hidden-1-2-bar',x:0,y:6,shape:[[0,0],[1,0]],color:'yellow',shutterId:'s28-curtain-1'},
    {id:'v143-28-hidden-1-2-single',x:0,y:7,shape:[[0,0]],color:'yellow',shutterId:'s28-curtain-1'},
  ]},
  29:{'s29-open-red-1':[
    {id:'v143-29-open-red-1-bar',x:1,y:1,shape:[[0,0],[1,0]],color:'red'},
    {id:'v143-29-open-red-1-single',x:1,y:2,shape:[[0,0]],color:'purple'},
  ],'s29-open-red-2':[
    {id:'v143-29-open-red-2-bar',x:0,y:3,shape:[[0,0],[0,1],[0,2]],color:'red'},
    {id:'v143-29-open-red-2-single',x:1,y:4,shape:[[0,0]],color:'purple'},
  ],'s29-hidden-2-4':[
    {id:'v143-29-hidden-2-4-bar',x:5,y:0,shape:[[0,0],[0,1],[0,2]],color:'green',shutterId:'s29-curtain-2'},
    {id:'v143-29-hidden-2-4-single',x:6,y:2,shape:[[0,0]],color:'green',shutterId:'s29-curtain-2'},
  ]},
  30:{'s30-open-15':[
    {id:'v143-30-open-15-bar',x:0,y:6,shape:[[0,0],[1,0]],color:'red'},
    {id:'v143-30-open-15-single',x:1,y:7,shape:[[0,0]],color:'purple'},
  ],'s30-hidden-3':[
    {id:'v143-30-hidden-3-bar',x:5,y:3,shape:[[0,0],[0,1],[0,2]],color:'green',shutterId:'s30-curtain-1'},
    {id:'v143-30-hidden-3-single',x:6,y:5,shape:[[0,0]],color:'green',shutterId:'s30-curtain-1'},
  ],'s30-hidden-4':[
    {id:'v143-30-hidden-4-bar',x:6,y:2,shape:[[0,0],[0,1],[0,2]],color:'red',shutterId:'s30-curtain-1'},
    {id:'v143-30-hidden-4-single',x:5,y:2,shape:[[0,0]],color:'red',shutterId:'s30-curtain-1'},
  ]},
};
export function repairedLevel(id){const level=structuredClone(api.LEVELS[id-1]);level.blocks=level.blocks.flatMap(b=>replacements[id]?.[b.id]??[b]);return level;}
if(process.argv[1]?.endsWith('try-native-repair-v143.mjs')){
  ruleGate();
  const ids=process.argv.slice(2).map(Number);
  for(const id of ids){const level=repairedLevel(id);api.validateLevel(level);const result=api.searchRevisedLevel(level,{maxStates:200000,maxTransitions:5000000,maxDragStates:1024,maxMilliseconds:180000});console.log(JSON.stringify({id,status:result.status,termination:result.termination,drags:result.drags.length,replay:result.replay?.nonClearingDrags,states:result.discoveredStates,transitions:result.attemptedTransitions,reasons:result.reasons}));if(result.drags?.length)writeNew(`.codex-temp/native-block-repair-v143-lv${id}-search-${Date.now()}.json`,{level,drags:result.drags});}
}
