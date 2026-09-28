import {api,source,hash,base,block,gate,SH,rngFor,shuffle,audit,save,packRegion} from './common.mjs';
import {search} from '../../lv051-060/campaign-generator-axis-search-v146.mjs';
export function make126(seed){
 const r=rngFor(seed),l=base(126,'super');
 l.shutters=[{id:'r3-126-a',x:0,y:5,width:2,height:4,count:12},{id:'r3-126-b',x:4,y:5,width:2,height:4,count:12}];
 gate(l,'red','right',1,2);gate(l,'blue','left',1,2,3);gate(l,'yellow','left',3,2,5);gate(l,'green','top',3,3,8);gate(l,'cyan','top',0,3,12);gate(l,'purple','bottom',0,3,14);gate(l,'pink','bottom',3,3,16);
 const colors=['red','blue','yellow','green','cyan','purple','pink'];
 for(let y=0;y<5;y++)for(let x of[0,3])block(l,x,y,'H3','red');
 for(let x of[2,3])block(l,x,5,'V2','blue',{frozen:5});
 for(let y of[7,8])block(l,2,y,'H2','yellow');
 const opening=[...l.blocks],cellMap=new Map();opening.forEach((b,i)=>b.shape.forEach(([dx,dy])=>cellMap.set(`${b.x+dx},${b.y+dy}`,i)));
 const ns=opening.map(()=>new Set());for(let[k,i]of cellMap){let[x,y]=k.split(',').map(Number);for(let[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){let j=cellMap.get(`${x+dx},${y+dy}`);if(j!==undefined&&j!==i)ns[i].add(j);}}
 let assigned=[];assigned[5]='red';for(let i of shuffle([...opening.keys()].filter(i=>i!==5),r)){let used=new Set([...ns[i]].map(j=>assigned[j]));let c=shuffle(colors,r).find(c=>!used.has(c));assigned[i]=c;}opening.forEach((b,i)=>b.color=assigned[i]);
 // Exactly seven opening H3 shells: six across rows1–3, one in row4.
 for(let i of[0,2,3,4,6,7,9,10,11])opening[i].layers=[opening[i].color,shuffle(colors.filter(c=>c!==opening[i].color),r)[0]];
 for(let y of[5,7])block(l,0,y,'SQ',colors[Math.floor(r()*colors.length)],{shutterId:'r3-126-a'});
 const hidden=packRegion(4,5,2,4,['L3','S','SQ'],r);if(!hidden)return null;
 for(let p of hidden)block(l,p.x,p.y,p.type,colors[Math.floor(r()*colors.length)],{shutterId:'r3-126-b'}); return l;
}

import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';

const start=Number(process.argv[2]??129100),N=Number(process.argv[3]??200),attempts=[];
for(let seed=start;seed<start+N;seed++){
 const level=make126(seed),a=audit(level);if(!a.passed){attempts.push({seed,static:false});continue;}
 let result=search(level,{floor:31,maxMilliseconds:800,maxStates:120000,orderSeed:seed%level.blocks.length}),row={seed,status:result.status,stop:result.stop,cost:result.cost};
 if(result.status==='witness'&&result.cost>=21&&result.cost<=30){
  row.quickShortcuts=[];for(let i=0;i<4;i++){const r=search(level,{floor:21,maxMilliseconds:400,maxStates:100000,orderSeed:i*3,weight:i%2===0?20:1000});row.quickShortcuts.push({order:i*3,status:r.status,cost:r.cost,stop:r.stop});if(r.status==='witness'){row.rejectedByShortcut=r.cost;break;}}
  if(row.rejectedByShortcut===undefined){const proof=checkSymmetryFloor(level,{floor:21,maxStates:500000,maxMilliseconds:15000});row.proof={status:proof.status,termination:proof.termination,states:proof.discoveredStates,cost:proof.relaxedNonClearingDrags};const replay=api.replayRevisedRoute(level,result.drags);const file=save('candidate126-batch-seed'+seed,{candidate:{seed,level,levelSha256:hash(level),audit:a,search:result,replay},proof,adaptations:['Full source9shells,2ice5,cover12/12 and five known hidden bodies retained; hidden rotated L4+V2+H2 adapted to nativeL3+SQ+S. Source ordinaryred and frozen counts3/5/8/12/14/16 retained, source gate positions used. NativeH3 opening fills source3cell hole. Colors authored under171.'],lowerBoundCertified:proof.thresholdProven,pointerValidated:false,naturalClockValidated:false});row.file=file;console.log(JSON.stringify({file,seed,U:result.cost,proof:row.proof}));if(proof.thresholdProven&&replay.valid&&replay.complete){attempts.push(row);break;}}
 }
 attempts.push(row);
}
console.log(JSON.stringify({file:save('batch126-attempts',{attempts})}));
