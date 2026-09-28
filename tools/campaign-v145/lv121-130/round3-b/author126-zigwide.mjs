import {api,source,hash,base,block,gate,SH,rngFor,shuffle,audit,save,packRegion} from './common.mjs';
import {search} from '../../lv051-060/campaign-generator-axis-search-v146.mjs';
export function make126(seed){
 const r=rngFor(seed),l=base(126,'super');
 l.shutters=[{id:'r3-126-a',x:0,y:5,width:2,height:4,count:12},{id:'r3-126-b',x:4,y:5,width:2,height:4,count:12}];
 gate(l,'red','right',0,3);gate(l,'blue','left',2,1,3);gate(l,'yellow','left',4,1,5);gate(l,'green','top',3,3,8);gate(l,'cyan','top',0,3,12);gate(l,'purple','bottom',0,3,14);gate(l,'pink','bottom',3,3,16);
 const colors=['red','blue','yellow','green','cyan','purple','pink'];
 for(let y=0;y<5;y++){const short=y%2===1;for(let x of(short?[0,2,4]:[0,3]))block(l,x,y,short?'H2':'H3','red');}
 for(let y of[5,6])block(l,2,y,'H2','blue',{frozen:5});
 for(let y of[7,8])block(l,2,y,'H2','yellow');
 const opening=[...l.blocks],cellMap=new Map();opening.forEach((b,i)=>b.shape.forEach(([dx,dy])=>cellMap.set(`${b.x+dx},${b.y+dy}`,i)));
 const ns=opening.map(()=>new Set());for(let[k,i]of cellMap){let[x,y]=k.split(',').map(Number);for(let[dx,dy]of[[1,0],[-1,0],[0,1],[0,-1]]){let j=cellMap.get(`${x+dx},${y+dy}`);if(j!==undefined&&j!==i)ns[i].add(j);}}
 let assigned=[];assigned[1]='red';assigned[6]='red';for(let i of shuffle([...opening.keys()].filter(i=>i!==1&&i!==6),r)){let used=new Set([...ns[i]].map(j=>assigned[j]));let c=shuffle(colors,r).find(c=>!used.has(c));assigned[i]=c;}opening.forEach((b,i)=>b.color=assigned[i]);
 // Exactly seven opening H3 shells: six across rows1–3, one in row4.
 for(let i of[2,3,4,5,7,8,9,12,13])opening[i].layers=[opening[i].color,shuffle(colors.filter(c=>c!==opening[i].color),r)[0]];
 for(let y of[5,7])block(l,0,y,'SQ',['green','cyan','purple','pink'][Math.floor(r()*4)],{shutterId:'r3-126-a'});
 const hidden=packRegion(4,5,2,4,['L3','S','SQ'],r);if(!hidden)return null;
 for(let p of hidden)block(l,p.x,p.y,p.type,['green','cyan','purple','pink'][Math.floor(r()*4)],{shutterId:'r3-126-b'}); return l;
}
const attempts=[],start=Number(process.argv[2]??126000),N=Number(process.argv[3]??100),budget=Number(process.argv[4]??1000);let best=null;
for(let seed=start;seed<start+N;seed++){
 let level=make126(seed),a,s,replay;try{a=audit(level);if(!a.passed){attempts.push({seed,error:'static',audit:a});continue;}s=search(level,{maxStates:250000,maxMilliseconds:budget,orderSeed:seed%level.blocks.length});if(s.status==='witness'){replay=api.replayRevisedRoute(level,s.drags);if(replay.valid&&replay.complete&&(!best||Math.abs(s.cost-24)<Math.abs(best.search.cost-24))){best={seed,level,levelSha256:hash(level),audit:a,search:s,replay};let file=save(`candidate126-zigwide-seed${seed}`,{levelId:126,sourceRecordSha256:hash(source.find(s=>s.level===126)),candidate:best,adaptations:['Preserve actual6x9 geometry and source two 2x4 covers12/12, seven H3 shells plus two ice5 V2 shells revealed atsec0353 (nine total).','Source visible opening has 35 cells plus16 covered=51; the free H3-sized void at x0,y4 is filled by an authored ordinary H3 to cover54.','The fully hidden 2x4 regions are source left2SQ, rightH2+rotatedL4+V2 minimally adapted to nativeS+L3+SQ; all layers cover the entire region.','Top6x5 retiled with alternating rows of H3 and H2 bars (six of each); keeps seven shell carriers with five plain instead of source void, creating changed spatial adjacencies. Two ice5 V2 shells adapted to native H2; blue/yellow side gates narrowed to one cell; ordinaryred remains three cells for two separated nonadjacent initial exits because all matching source carriers become horizontal bars. Hidden wide/tall bodies assigned to full-width top/bottom gates. Colors and horizontal bar relationships adapted under iterative authoring authorization; source shell/color anchors remain separate facts.'],lowerBoundCertified:false,pointerValidated:false,naturalClockValidated:false,formalAdopted:false});console.log(JSON.stringify({file,seed,cost:s.cost,drags:s.drags.length}));if(s.cost>=21&&s.cost<=30)break;}}}catch(e){attempts.push({seed,error:e.message});continue;}attempts.push({seed,status:s?.status,stop:s?.stop,cost:s?.cost,states:s?.states,replay});
}
console.log(JSON.stringify({file:save('search126-zigwide-attempts',{attempts,bestSeed:best?.seed,status:best?'FULL_MODEL_ROUTE':'NO_FULL_ROUTE'}),best:best&&{seed:best.seed,cost:best.search.cost}}));
