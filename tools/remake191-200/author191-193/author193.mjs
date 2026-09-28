import fs from 'node:fs';import {api,base,shapes,tile,recolor,recolorBag,rng,rect,save,audit,searchSpatial,project,digest,OUT} from './common.mjs';
import {floorCountDown} from './floor-countdown.mjs';
import {compile,search as fastSearch} from './search193.mjs';
const R=rng(Number(process.env.SEED??108193)),max=Number(process.env.ATTEMPTS??200),rows=[],logfile=OUT+'/attempts193-'+Date.now()+'.jsonl';let best=100;
const source=JSON.parse(fs.readFileSync(OUT+'/'+fs.readdirSync(OUT).find(f=>f.startsWith('source193-'))));
const shapeids={S:1,V2:2,V3:3,L3:4,T4:6,H2:8,H3:9};
for(let attempt=0;attempt<max;attempt++){
 const seed=R.state(),l=base(193);l.shutters=[{id:'cover4',x:0,y:0,width:5,height:5,count:4}];
 for(const [group,pieces] of [['opening',source.opening],['hidden',source.hidden]]){const specs=pieces.map(p=>{const b={id:p.id,color:p.id==='h9'?'orange':p.color,shape:shapes[shapeids[p.shape]],...p.layers?{layers:[...p.layers]}:{},...p.frozen?{frozen:p.frozen}:{},...group==='hidden'?{shutterId:'cover4'}:{}};if(p.shape==='L3'&&R.random()<.5)b.shape=shapes[R.random()<.5?3:9];if(p.shape==='V2'&&R.random()<.3)b.shape=shapes[8];return b;});const bs=tile(specs,group==='hidden'?rect(0,0,5,5):rect(0,5,5,3),{seed:R.state(),maxNodes:3000,preferLarge:false,pins:group==='opening'?{o7:[1,7],o5:[0,5]}:{}});R.random();if(!bs)break;if(!recolorBag(bs,{seed:R.state(),pins:group==='opening'?{o7:'yellow',o5:'yellow',o2:'red',o4:'red'}:{}}))break;l.blocks.push(...bs);}
 if(l.blocks.length!==18)continue;
 const openingDesign=[['o7',0,5,9,'yellow'],['o5',3,5,8,'blue'],['o1',0,6,8,'blue'],['o2',2,6,8,'red','purple'],['o4',4,6,1,'yellow','blue'],['o6',0,7,1,'green'],['o3',1,7,9,'yellow'],['o8',4,7,1,'cyan']];
 for(const[id,x,y,sid,color,inner]of openingDesign){const b=l.blocks.find(b=>b.id===id);Object.assign(b,{x,y,shape:shapes[sid],color});if(inner)b.layers=[color,inner];}
 const occupied=new Set(),colors=['yellow','red','cyan','blue','purple','green','orange'],counts=[0,2,4,5,7,9,11];let gateFail=false;
 for(let k=0;k<colors.length;k++){const color=colors[k],bs=l.blocks.filter(b=>(b.layers??[b.color]).includes(color)),opts=[];if(!bs.length){gateFail=true;break;}for(const side of ['top','left','bottom','right']){const size=Math.max(...bs.map(b=>1+Math.max(...b.shape.map(p=>['top','bottom'].includes(side)?p[0]:p[1]))));if(size>3)continue;const lim=['top','bottom'].includes(side)?5:8;for(let off=0;off+size<=lim;off++)if(!Array.from({length:size},(_,j)=>side+':'+(off+j)).some(v=>occupied.has(v)))opts.push({side,size,offset:off});}if(!opts.length){gateFail=true;break;}const g={id:'g-'+color,color,...opts[Math.floor(R.random()*opts.length)],...counts[k]?{frozen:counts[k]}:{}};l.gates.push(g);for(let j=0;j<g.size;j++)occupied.add(g.side+':'+(g.offset+j));}
 if(gateFail)continue;l.gates=[['yellow','left',5,3,0],['red','bottom',2,3,2],['cyan','right',3,2,4],['blue','right',5,3,5],['purple','right',0,3,7],['green','top',0,3,9],['orange','left',1,3,11]].map(([color,side,offset,size,frozen])=>({id:'g-'+color,color,side,offset,size,...frozen?{frozen}:{}}));let spatial,search,replay,proof,error;try{spatial=audit(l);search=fastSearch(compile(l,api),{floor:16,maxMilliseconds:400,maxStates:20000});if(search.status==='witness'){replay=api.replayRevisedRoute(l,search.drags);if(replay.complete&&replay.valid&&replay.nonClearingDrags<=10){proof=floorCountDown(l,{floor:5,maxMilliseconds:600,maxStates:120000});}}}catch(e){error=e.message;}
 const row={attempt,seed,hash:digest(l),status:search?.status,U:replay?.nonClearingDrags,clears:search?.maxClears,proof:proof?.status,error,budget:{witnessMs:400,proofMs:600}};rows.push(row);fs.appendFileSync(logfile,JSON.stringify(row)+'\n');if(replay?.complete||attempt%20===0)console.log(JSON.stringify(row));
 if(attempt===0)console.log(save('diagnostic193',{level:l,search,spatial,error}));
 if(replay?.valid&&replay.complete){best=Math.min(best,replay.nonClearingDrags);const file=save('candidate193',{level:l,levelSha256:digest(l),drags:search.drags,search,replay,proof,spatial,source,iteration:{attempt,seed},activeRuleVersion:'1.108.0',formalAdopted:false});console.log(file);if(proof?.thresholdProven){console.log('READY '+file);break;}}
 R.random();
}
console.log(save('summary193',{rows,best}));



