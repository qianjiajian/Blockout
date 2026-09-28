import {floor141} from './prefix-floor141.mjs';
import {api,audit,rng,tile,recolor,searchSpatial,save,digest,baseline,sources,shapes} from './common.mjs';
const src=sources['141'],base=baseline.levels[140],R=rng(Number(process.env.SEED??141173));
const clean=(b,shutterId)=>({id:'s141-'+b.id,color:b.color,shape:structuredClone(b.shapeName.startsWith('L3')?shapes[4]:b.shape),...(b.layers?{layers:structuredClone(b.layers)}:{}),...(b.keyColor?{keyId:'s141-red-key'}:{}),...(b.lockCount?{lockedBy:'s141-red-key',lockCount:b.lockCount}:{}),...(shutterId?{shutterId}:{})});
const opening=src.opening.blocks.map(b=>clean(b));opening.find(b=>b.id==='s141-o3').shape=shapes[7];for(const id of ['s141-o1','s141-o10','s141-o13'])opening.find(b=>b.id===id).shape=shapes[14];
const hidden=src.hidden.firstCurtainBatch.blocks.map(b=>clean(b,'s141-curtain8'));
const lifted=src.hidden.refillObservation.bodies.map(b=>({...clean(b,'s141-lift'),x:b.x,y:b.y+1}));
const opCells=base.level.playable.filter(([,y])=>y===0||y>=6),hdCells=base.level.playable.filter(([,y])=>y>=1&&y<=5),rows=[];let best=-1,op,hd;
for(let attempt=0;attempt<Number(process.env.ATTEMPTS??25);attempt++){
 const seed=R.state();
 if(!op){
  for(let shapeAttempt=0;shapeAttempt<80&&!op;shapeAttempt++){
   const next=structuredClone(opening),irr=new Set(['s141-o4','s141-o7','s141-o9']);
   for(const b of next){if(['s141-o8','s141-o11','s141-o12'].includes(b.id))b.shape=shapes[8];else if(b.lockedBy)b.shape=shapes[7];else b.shape=shapes[R.shuffle(irr.has(b.id)?[4,5,6,10,11]:[1,2,3,7,8,9,13,14,21])[0]];}
   if(next.reduce((n,b)=>n+b.shape.length,0)!==54)continue;
   op=tile(next,opCells,{seed:R.state(),maxNodes:20000,preferLarge:false,pins:{'s141-o8':[1,0],'s141-o12':[3,0],'s141-o11':[5,0]}});
  }
 }
 if(!hd)hd=tile(hidden,hdCells,{seed,maxNodes:30000});
 if(!op||!hd){rows.push({attempt,seed,status:'packing-failed',op:!!op,hd:!!hd});R.random();continue;}
 const bs=structuredClone(op),eligible=bs.filter(b=>!b.lockedBy&&b.x===0&&b.y>=6&&Math.max(...b.shape.map(p=>p[1]))<=2),first=R.shuffle(eligible)[0];
 if(!first){op=null;R.random();continue;}
 const second=R.shuffle(bs.filter(b=>b!==first&&!b.lockedBy&&b.y+Math.max(...b.shape.map(p=>p[1]))===11&&Math.max(...b.shape.map(p=>p[0]))<=2))[0];if(!second){op=null;R.random();continue;}
 if(!recolor(bs,['orange','purple','green','cyan','yellow','pink','blue'],{seed,pins:{[first.id]:'orange',[second.id]:'green','s141-o12':'purple','s141-o8':'pink','s141-o11':'yellow','s141-o3':'blue'},filter:(b,c)=>b.y===0||b.lockedBy||['orange','green','cyan'].includes(c)})){op=null;R.random();continue;}
 if(bs.filter(b=>b.y>=6&&['orange','green'].includes(b.color)&&!b.lockedBy).length<5){op=null;R.random();continue;}
 const gates=[{id:'s141-orange',color:'orange',side:'left',offset:Math.min(9,first.y),size:3},
 {id:'s141-green',color:'green',side:'bottom',offset:Math.min(5,second.x),size:3,frozen:2},
 {id:'s141-purple',color:'purple',side:'top',offset:3,size:3,frozen:1},
 {id:'s141-cyan',color:'cyan',side:'right',offset:6,size:3,frozen:5},
 {id:'s141-yellow',color:'yellow',side:'right',offset:9,size:3,frozen:8},
 {id:'s141-red',color:'red',side:'right',offset:1,size:3,frozen:10},
 {id:'s141-blue',color:'blue',side:'left',offset:1,size:3,frozen:16},
 {id:'s141-pink',color:'pink',side:'top',offset:1,size:2,frozen:14}];
 const level={...structuredClone(base.level),difficulty:'easy',preservedMoveTarget:base.starTargets.moveTarget,blocks:[...bs,...structuredClone(hd),...structuredClone(lifted)],gates,shutters:[{id:'s141-curtain8',x:0,y:1,width:8,height:5,count:8},{id:'s141-lift',x:0,y:1,width:8,height:4,count:1,skin:'lift'}]};delete level.generators;delete level.flipDoors;
 let check,search,replay,error,proof;try{check=audit(level);if(check.passed){proof=floor141(level,{maxMilliseconds:1000,maxStates:50000});if(proof.status==='relaxed-shortcut'){rows.push({attempt,seed,status:'prefix-shortcut',cost:proof.relaxedNonClearingDrags});R.random();op=null;continue;}search=searchSpatial(level,api,{floor:11,maxMilliseconds:3000,maxStates:30000,maxTransitions:500000,diagnosticTrace:true,orderSeed:attempt});if(search.status==='witness')replay=api.replayRevisedRoute(level,search.drags);}}catch(e){error=e.message;}
 const row={attempt,seed,status:search?.status??'static-rejected',stop:search?.termination,clears:search?.maxClearsSeen,cost:search?.cost,replayValid:replay?.valid,replayComplete:replay?.complete,error,auditIssues:check&&!check.passed?check:undefined};rows.push(row);console.log(JSON.stringify({...row,auditIssues:undefined}));
 if((search?.maxClearsSeen??-1)>best||replay?.complete){best=Math.max(best,search?.maxClearsSeen??-1);row.candidate=save('candidate141',{activeRuleVersion:'1.73.0',level,levelSha256:digest(level),source:'source141-145/source-specs141-143-144.json',iteration:{attempt,seed,budget:{maxMilliseconds:3000,maxStates:30000,maxTransitions:500000}},audit:check,proof,search,replay,drags:search.drags??[],formalAdopted:false});console.log(row.candidate);}
 R.random();if(attempt%3===2)op=null;
}
console.log(save('attempts141-prefix',rows));

