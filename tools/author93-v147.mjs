import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,BASELINE,auditSpatial,assertProtected,digest,ruleGate} from './remake91to100-v146.mjs';
import {loadSpatialApi,searchSpatial} from '../deliverables/remake71-80-v146-20260924/floor-review/spatial-domain.mjs';
const OUT='deliverables/remake91-100-v146-20260924/root93';fs.mkdirSync(OUT,{recursive:true});
const baseline=JSON.parse(fs.readFileSync(BASELINE)),old=baseline.levels[92].level;
const S=[[0,0]],V2=[[0,0],[0,1]],H2=[[0,0],[1,0]],SQ2=[[0,0],[1,0],[0,1],[1,1]],L3=[[0,0],[0,1],[1,1]];
let seed=93147;const random=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296),shuffle=a=>a.map(v=>[v,random()]).sort((a,b)=>a[1]-b[1]).map(a=>a[0]);
const pkey=p=>p.join(','),rect=(x,y,w,h)=>Array.from({length:w*h},(_,i)=>[x+i%w,y+Math.floor(i/w)]);
const save=(kind,data)=>{const file=`${OUT}/${kind}-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return file;};
const body=(id,color,shape,attrs={})=>({id:`r147-93-${id}`,color,shape,...attrs});
function pack(cells,bodies,allow=()=>true){
 const vacant=new Set(cells.map(pkey)),out=[],remaining=bodies.slice();let visits=0;
 function go(){if(!remaining.length)return !vacant.size;if(++visits>5000)return false;const [x,y]=[...vacant].map(p=>p.split(',').map(Number)).sort((a,b)=>a[1]-b[1]||a[0]-b[0])[0];
  for(const b of shuffle(remaining)){for(const[dx,dy]of shuffle(b.shape)){const at={...b,x:x-dx,y:y-dy};if(!allow(at))continue;const cells=b.shape.map(([a,c])=>[at.x+a,at.y+c]);if(!cells.every(p=>vacant.has(pkey(p))))continue;
   if(out.some(a=>a.color===at.color&&a.shape.some(([xx,yy])=>cells.some(([cx,cy])=>Math.abs(a.x+xx-cx)+Math.abs(a.y+yy-cy)===1))))continue;
   const i=remaining.indexOf(b);remaining.splice(i,1);cells.forEach(p=>vacant.delete(pkey(p)));out.push(at);if(go())return true;out.pop();cells.forEach(p=>vacant.add(pkey(p)));remaining.splice(i,0,b);
  }}return false;
 }return go()?out:null;
}
function make(n){seed=9314700+n;
 const c14={id:'r147-93-c14',x:0,y:3,width:5,height:3,count:14},c18={id:'r147-93-c18',x:2,y:0,width:4,height:3,count:18};
 const hidden14=[body('h14-green-v2','green',V2),body('h14-cyan-axis','cyan',SQ2,{movementAxis:'horizontal'}),body('h14-cyan-s','cyan',S),body('h14-red-s','red',S),body('h14-purple-s','purple',S),body('h14-shell','green',SQ2,{layers:['green','purple']}),body('h14-red-h2','red',H2)];
 const a=pack(rect(0,3,5,3),hidden14,b=>b.movementAxis!=='horizontal'||b.y<=4),b=[{...body('h18-red-axis','red',SQ2,{movementAxis:'vertical'}),x:2,y:0},{...body('h18-purple-square','purple',SQ2),x:4,y:0},{...body('h18-cyan-axis','pink',H2,{movementAxis:'vertical'}),x:2,y:2},{...body('h18-red-v2','red',H2),x:4,y:2}];if(!a)return null;
 const blocked=new Set([...rect(0,3,5,3),...rect(2,0,4,3)].map(pkey)),openingCells=old.playable.filter(p=>!blocked.has(pkey(p)));
 const opening=[body('o-red-h2-adapt','orange',S),body('o-yellow-axis1','yellow',V2,{movementAxis:'vertical'}),body('o-yellow-v2','yellow',V2),body('o-blue-v2','blue',V2),body('o-red-s1','orange',S),body('o-blue-s','blue',S),body('o-red-s2','orange',S),body('o-yellow-axis2','yellow',S,{movementAxis:'vertical'}),body('o-yellow-s1','yellow',S),body('o-blue-l3','blue',L3),body('o-red-l3','orange',L3),body('o-yellow-s2','yellow',S),body('o-blue-h2-adapt','blue',S),body('o-yellow-s3','yellow',S)];
 const fixed=[['o-blue-l3',6,3],['o-red-l3',5,4],['o-yellow-axis2',5,3],['o-red-s1',7,3],['o-yellow-s3',7,5]].map(([id,x,y])=>({...opening.find(b=>b.id==='r147-93-'+id),x,y})); const rest=opening.filter(b=>!fixed.some(f=>f.id===b.id)); const filled=pack(rect(2,6,4,3),rest,z=>!z.movementAxis||z.x>=4);if(!filled)return null; const o=[...fixed,...filled];
 const gates=[{color:'yellow',side:'bottom',offset:4,size:2},{color:'blue',side:'right',offset:3,size:3,frozen:4},{color:'red',side:'top',offset:2,size:2,frozen:6},{color:'orange',side:'top',offset:6,size:2,portals:[{side:'top',origin:[6,3],size:2}],frozen:6},{color:'green',side:'bottom',offset:0,size:2,portals:[{side:'bottom',origin:[0,5],size:2}],frozen:14},{color:'cyan',side:'left',offset:3,size:3,frozen:14},{color:'purple',side:'top',offset:0,size:2,portals:[{side:'top',origin:[0,3],size:2}],frozen:18},{color:'pink',side:'bottom',offset:2,size:2,frozen:18}].map((g,i)=>({...g,id:`r147-93-g${i}`}));
 return {...old,difficulty:'normal',blocks:[...o,...a.map(z=>({...z,shutterId:c14.id})),...b.map(z=>({...z,shutterId:c18.id}))],gates,shutters:[c14,c18]};
}
ruleGate();const {api}=await loadApi(),spatialApi=await loadSpatialApi();let made=0,valid=0,best=Infinity;
const start=Number(process.argv[2]??0),count=Number(process.argv[3]??1000);
for(let n=start;n<start+count;n++){
 if(n%50===0)console.log(JSON.stringify({n,made,valid,best}));const level=make(n);if(!level)continue;made++;
 let audit;try{assertProtected(level,baseline,api);audit=auditSpatial(level,api);if(!audit.passed){if(made===1)console.log(JSON.stringify(audit));continue;}}catch(e){if(made===1)console.log(e.message);continue;}valid++;
 const search=searchSpatial(level,spatialApi,{floor:16,maxStates:50000,maxMilliseconds:15000,diagnosticTrace:true});
 if(valid===1)console.log(save('diagnostic',{level,audit,search}));if(search.status!=='witness')continue;
 const replay=api.replayRevisedRoute(level,search.drags);assert(replay.valid&&replay.complete,replay.error);if(search.cost<best){best=search.cost;console.log(save('witness',{seed:n,level,drags:search.drags,search,replay,audit}));}
 if(search.cost<11)continue;const proof=searchSpatial(level,spatialApi,{prove:true,floor:11,maxStates:500000,maxMilliseconds:6000});if(!proof.thresholdProven)continue;
 console.log(save('candidate',{activeRuleVersion:'1.47.0',seed:n,level,levelSha256:digest(level),drags:search.drags,replay,audit,proof,pointerValidated:false,sourceValidated:false,releaseApproved:false}));break;
}
console.log(JSON.stringify({done:true,start,count,made,valid,best}));



