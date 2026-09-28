import fs from'node:fs';
import{api,base,shapes,tile,recolor,rng,save,audit,searchSpatial,project,digest}from'./common.mjs';
import{keyFloor}from'./key-floor.mjs';
import{replay}from'../replay.mjs';
const R=rng(Number(process.env.SEED??195108)),log=[],end=Date.now()+Number(process.env.SECONDS??100)*1000;
const source=[['yellow',8],['red',3,undefined,'pink'],['orange',3,undefined,'blue'],['cyan',8],['blue',2,'blue'],['pink',2,'pink'],['green',2],['pink',2,'pink'],['pink',2,'pink'],['blue',8,'blue'],['cyan',8],['red',3],['cyan',8],['green',7,'blue'],['blue',3],['pink',4],['green',7],['red',9]];
const prior=process.env.BASE?JSON.parse(fs.readFileSync(process.env.BASE)).level:null;
let best=0;const fingerprints=new Set();
for(let attempt=0;Date.now()<end;attempt++){
 const seed=R.state(),l=base(195),spec=source.map(([color,shapeId,key,lock],i)=>({id:'r108-195-s'+i,color,shape:shapes[shapeId],...key?{keyId:key}:{},...lock?{lockedBy:lock,lockCount:3}:{}}));
 const pieces=prior?structuredClone(prior.blocks):tile(spec,l.playable,{seed,maxNodes:2000,preferLarge:false});R.random();if(!pieces)continue;
 if(prior){const[a,b]=R.shuffle(pieces);[a.color,b.color]=[b.color,a.color];}
 if(!prior&&attempt%3===2){const pins={};for(const b of R.shuffle(pieces).slice(0,4))pins[b.id]=b.color;if(!recolor(pieces,['green','blue','pink','red','cyan','orange','purple','yellow'],{seed:R.state(),pins}))continue;}
 else {const adj=(a,b)=>a.shape.some(([x,y])=>b.shape.some(([u,v])=>Math.abs(a.x+x-b.x-u)+Math.abs(a.y+y-b.y-v)===1));if(pieces.some(a=>pieces.some(b=>a!==b&&a.color===b.color&&adj(a,b))))continue;}
 l.blocks=pieces;delete l.shutters;
 const ports=R.shuffle([['top',1,2],['top',3,2],['bottom',0,3],['bottom',3,3],['left',1,3],['left',5,3],['right',1,3],['right',5,3]]);
 l.gates=[['green',0],['blue',2],['pink',1],['red',5],['cyan',6],['orange',10],['purple',8],['yellow',12]].map(([color,frozen],i)=>{let[side,offset,size]=ports[i];return{id:'r108-195-g'+color,color,side,offset,size,...frozen?{frozen}:{}};});
 if(prior){l.gates=structuredClone(prior.gates);if(attempt%2){const[a,b]=R.shuffle(l.gates.filter(g=>g.size===3));const{side,offset}=a;a.side=b.side;a.offset=b.offset;b.side=side;b.offset=offset;}}
 const fingerprint=digest(l);if(fingerprints.has(fingerprint))continue;fingerprints.add(fingerprint);
 let spatial,s,rep,proof,error;try{spatial=audit(l);s=searchSpatial(project(l),api,{floor:21,maxMilliseconds:500,maxStates:12000,maxTransitions:120000,normalize:true,orderSeed:attempt,diagnosticTrace:true});if(s.status==='witness'){rep=replay(l,s.drags,api,{complete:true,requirePointerCompatible:true});if(rep.nonClearingDrags>=16)proof=keyFloor(l,{floor:16,maxMilliseconds:2500,maxStates:200000});}}catch(e){error=e.message;}
 const row={attempt,seed,hash:digest(l),status:s?.status,U:rep?.nonClearingDrags,clears:s?.maxClearsSeen,proof:proof?.status,relaxedCost:proof?.relaxedNonClearingDrags,error};log.push(row);
 if((s?.maxClearsSeen??-1)>best||rep){best=Math.max(best,s?.maxClearsSeen??-1);row.file=save(rep?'candidate195':'partial195',{ruleVersion:'1.108.0',level:l,spatial,search:s,drags:s?.drags??[],replay:rep,proof,source:'18 bodies (truth17 erroneous),2locks each3 and6keys; source lower blueL3->V3 and greenT4->SQ2 native adaptation,redS->H3 fills2 additional cells; color adaptation v108. All8doors preserved7ice1/2/5/6/8/10/12.',formalAdopted:false});console.log(JSON.stringify(row));if(proof?.thresholdProven&&rep?.nonClearingDrags<=20)break;}
}
console.log(save('attempts195',log));
