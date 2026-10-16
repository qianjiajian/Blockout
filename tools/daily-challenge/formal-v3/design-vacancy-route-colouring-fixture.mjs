// Independent four-body qualification fixture. This is not a daily candidate.
import assert from 'node:assert/strict';
import {singleVacancyGraph} from './design-single-vacancy.mjs';
import {auditCompleteReverseWitness} from './reverse-route-audit.mjs';
export function fullStockVacancyFixture(runtime){
 const level={id:999832,name:'Isolated complete zero-parking-tail fixture',width:4,height:2,timeSeconds:100,reward:0,difficulty:'hard',
  mechanismRules:'revised-2026-09-27-v1.5',blocks:[
   {id:'opening',x:0,y:0,shape:[[0,0],[0,1]],color:'red'},
   {id:'a',x:1,y:0,shape:[[0,0],[1,0]],color:'blue'},
   {id:'b',x:1,y:1,shape:[[0,0],[1,0]],color:'green'},
   {id:'c',x:3,y:0,shape:[[0,0],[0,1]],color:'yellow'}],
  gates:[{id:'go',side:'left',offset:0,size:2,color:'red'},{id:'ga',side:'right',offset:0,size:1,color:'blue'},
   {id:'gb',side:'right',offset:1,size:1,color:'green'},{id:'gc',side:'top',offset:2,size:1,color:'yellow'}]};
 const blocks=level.blocks.map(({color,...b})=>structuredClone(b)),result=singleVacancyGraph(level,blocks,{maxStates:100,maxDepth:8});
 const apertureIndex=result.apertures.findIndex(g=>g.side==='top'&&g.size===1&&g.offset===2);
 const nodeIndex=result.queue.findIndex(n=>n.depth===3&&n.positions[2][0]===2);
 assert.equal(result.rawGeometricStates,5);assert.equal(result.earliest[2][apertureIndex],3);assert(nodeIndex>=0);
 const drags=[{blockId:'opening',path:[],exitSide:'left'},{blockId:'a',path:[[0,0]]},{blockId:'b',path:[[0,1]]},
  {blockId:'c',path:[[2,0]],exitSide:'top'},{blockId:'a',path:[[1,0],[2,0]],exitSide:'right'},
  {blockId:'b',path:[[1,1],[2,1]],exitSide:'right'}];
 const actual=auditCompleteReverseWitness(runtime,level,drags);assert(actual.valid,actual.error);assert.equal(actual.U,2);
 assert.equal(actual.canonical.clearEvents,4);assert.equal(actual.independent.clearEvents,4);
 return{qualificationOnly:true,accepted:false,formalReady:false,level,source:structuredClone(level),
  geometry:{sourceLevelId:level.id,sourceBoard:{width:level.width,height:level.height,cells:Array.from({length:8},(_,i)=>[i%4,Math.floor(i/4)])},
   built:{ok:true,blocks,openingArea:2},result},
  target:{i:2,g:apertureIndex,depth:3,nodeIndex},qualificationFloor:2,palette:['red','blue','green','yellow'],
  drags,actual,tailDrags:drags.slice(4),originalBodyIds:level.blocks.map(b=>b.id),
  statement:'All four original bodies actually clear; two parking drags precede second clear and no parking occurs in the complete two-body tail. No daily L31 or formal qualification is claimed.'};
}
