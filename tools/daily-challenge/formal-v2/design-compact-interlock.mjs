import fs from 'node:fs';
import {loadRuntime,verifyCandidate} from './contract.mjs';
import {checkPlainFloor} from './proof-plain.mjs';
import {openingAudit} from '../../league-regeneration/round3-contract.mjs';
import {independentPartitionSha256} from './geometry.mjs';
const OUT='deliverables/daily-formal-v2-20261007/design-lab';
const api=await loadRuntime(),source=api.LEVELS.find(l=>l.id===2);
const rect=(w,h)=>Array.from({length:w*h},(_,p)=>[p%w,Math.floor(p/w)]);
const b=(id,x,y,w,h,color)=>({id,x,y,shape:rect(w,h),color});
const base={id:2,name:'每日挑战紧凑空间互锁',difficulty:'super',reward:0,timeSeconds:source.timeSeconds,parMoves:source.parMoves,width:4,height:6,mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[b('target',1,0,2,2,'red'),b('v1',0,0,1,2,'purple'),b('v2',3,0,1,2,'orange'),b('v3',0,2,1,2,'orange'),b('v4',3,2,1,2,'purple'),b('bridge',1,2,2,1,'yellow'),b('single1',1,3,1,1,'red'),b('single2',2,3,1,1,'pink'),b('opening1',0,4,1,1,'pink'),b('opening2',3,4,1,1,'cyan'),b('bottombridge',1,4,2,1,'blue'),b('barrier',0,5,4,1,'green')],
 gates:[{id:'g1',color:'orange',side:'top',offset:0,size:1},{id:'g2',color:'purple',side:'top',offset:3,size:1},{id:'g3',color:'red',side:'right',offset:2,size:2},{id:'g4',color:'green',side:'right',offset:0,size:1},{id:'g5',color:'cyan',side:'right',offset:4,size:1},{id:'g6',color:'pink',side:'left',offset:4,size:1},{id:'g7',color:'blue',side:'left',offset:1,size:1},{id:'g8',color:'yellow',side:'left',offset:2,size:1}]};
const rows=[];
for(let i=0;i<16;i++){
 const level=structuredClone(base);level.name+=`·${i}`;
 if(i%4===1){level.blocks.find(b=>b.id==='single1').color='cyan';level.blocks.find(b=>b.id==='single2').color='red';}
 if(i%4===2){level.blocks.find(b=>b.id==='single1').color='blue';level.blocks.find(b=>b.id==='single2').color='yellow';}
 if(i%4===3){level.blocks.find(b=>b.id==='single1').color='green';level.blocks.find(b=>b.id==='single2').color='cyan';}
 if(i>=4&&i<8){[level.gates[0].color,level.gates[1].color]=[level.gates[1].color,level.gates[0].color];}
 if(i>=8&&i<12){level.blocks.find(b=>b.id==='v1').color='orange';level.blocks.find(b=>b.id==='v3').color='purple';level.blocks.find(b=>b.id==='v2').color='purple';level.blocks.find(b=>b.id==='v4').color='orange';}
 if(i>=12){[level.gates[6].color,level.gates[7].color]=[level.gates[7].color,level.gates[6].color];}
 const row={attempt:i,opening:openingAudit(level)};
 if(row.opening.status!=='PASS'){row.reason='adjacency';rows.push(row);continue;}
 const result=checkPlainFloor(level,api,{floor:16,searchUpper:50,maxStates:120000,maxTransitions:900000,maxMilliseconds:5000});
 row.proof={status:result.status,L:result.certifiedFloor,U:result.cost??null,termination:result.routeTermination??result.termination,states:result.discoveredStates};
 if(result.drags){const replay=api.replayRevisedRoute(level,result.drags);row.replay=replay;if(replay.complete&&replay.valid&&replay.nonClearingDrags>=16){
  const difficulty=result.cost<=20?1:result.cost<=30?2:3;
  const final=await verifyCandidate(api,{formalId:`daily-mechanisms-color-exit-1-d${difficulty}-compact-${i}`,stageKey:'mechanisms-color-exit-1',difficulty,sourceLevelId:2,level,drags:result.drags},{lowerBudget:{maxStates:120000,maxTransitions:900000,maxMilliseconds:5000}});
  row.accepted=final.accepted;row.finalStatus=final.status;row.file=`${OUT}/compact-interlock-${i}.json`;
  fs.writeFileSync(row.file,JSON.stringify({...final,partitionSha256:independentPartitionSha256(level),provenance:{ruleVersion:'1.153.0',sourceLevelId:2,changed:'Full normal 4x6 board retained, rectangular inventory retiled into interacting sliding blocks; no seams or repeated chambers.'}},null,2)+'\n');
 }}
 rows.push(row);fs.writeFileSync(`${OUT}/compact-interlock-report.json`,JSON.stringify({productionChanged:false,finiteBudget:{candidates:16,states:120000,transitions:900000,milliseconds:5000},rows},null,2)+'\n');
 console.log(JSON.stringify({i,...row.proof,accepted:row.accepted}));
}
