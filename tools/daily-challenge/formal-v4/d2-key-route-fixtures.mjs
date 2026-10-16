import {levelSha256} from '../formal-v2/contract.mjs';

/** Synthetic private qualification fixture; not a mainline/daily candidate. */
export function d2KeyRouteFixture(){
 const colors=['red','blue','green','yellow','purple','orange','cyan','pink'];
 const level={id:999983,name:'synthetic D2 key route fixture',difficulty:'super',reward:0,timeSeconds:120,parMoves:40,
  mechanismRules:'revised-2026-09-27-v1.5',width:4,height:2,
  blocks:colors.map((color,i)=>({id:`b${i}`,color,x:i%4,y:Math.floor(i/4),shape:[[0,0]]})),
  gates:[['red','top',0],['blue','top',1],['green','top',2],['yellow','top',3],
   ['purple','bottom',0],['orange','bottom',1],['cyan','left',0],['pink','right',1]]
   .map(([color,side,offset],i)=>({id:`g${i}`,color,side,offset,size:1}))};
 const drags=[0,1,2,3].map(i=>({blockId:`b${i}`,path:[],exitSide:'top'}));
 drags.push({blockId:'b4',path:[],exitSide:'bottom'},{blockId:'b5',path:[],exitSide:'bottom'});
 for(let i=0;i<21;i++)drags.push({blockId:'b6',path:[[2,i%2===0?0:1]]});
 drags.push({blockId:'b6',path:[[1,0],[0,0]],exitSide:'left'},{blockId:'b7',path:[],exitSide:'right'});
 const priorLevel=structuredClone(level);priorLevel.blocks[0].keyId='old';priorLevel.blocks[6].lockedBy='old';priorLevel.blocks[6].lockCount=1;
 return{qualificationOnly:true,base:{accepted:true,qualificationOnly:true,sourceLevelId:level.id,level,drags,levelSha256:levelSha256(level)},priorLevel,
  slot:{formalId:'daily-mechanisms-key-lock-59-d2-03',stageKey:'mechanisms-key-lock-59',unlockLevel:59,newestMechanism:'key-lock',difficulty:2,slot:3},
  configuration:{keyBlockIds:['b0','b1','b2','b3','b4','b5'],locks:[{id:'b6',count:5},{id:'b7',count:6}]}};
}
