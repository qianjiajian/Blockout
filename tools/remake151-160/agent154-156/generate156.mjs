import {base,shapes,tile,color,attempt,write,rng,adjacent} from './common.mjs';
const start=Number(process.argv[2]??1),count=Number(process.argv[3]??12),rows=[];
for(let seed=start;seed<start+count;seed++){
 const l=base(156,'easy'),R=rng(seed);
 l.flipDoors=[{id:'yellow',color:'yellow',side:'left',offset:0,size:3,initiallyOpen:false},{id:'green',color:'green',side:'left',offset:3,size:3,initiallyOpen:true},{id:'red',color:'red',side:'right',offset:0,size:3,initiallyOpen:true},{id:'cyan',color:'cyan',side:'right',offset:3,size:2,initiallyOpen:true},{id:'orange',color:'orange',side:'right',offset:5,size:2,initiallyOpen:true}];
 const specs=[2,2,9,8,7,7,7,...Array(7).fill(9)].map((s,i)=>({id:'r102-156-o'+i,shape:shapes[s],color:'red',...(i===2||i===3?{frozen:1}:{})}));
 const cells=Array.from({length:42},(_,i)=>[i%6,Math.floor(i/6)]),fixed=[{...specs[0],x:0,y:0},{...specs[4],x:0,y:3}],used=new Set(fixed.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y].join(',')))),rest=tile(specs.filter((_,i)=>i!==0&&i!==4),cells.filter(p=>!used.has(p.join(','))),seed),ob=rest?[...fixed,...rest]:null;if(!ob){rows.push({seed,status:'tiling-failed'});continue;}
 const initialYellow=ob.filter(b=>['r102-156-o0','r102-156-o1','r102-156-o3'].includes(b.id));
 if(initialYellow.some((a,i)=>initialYellow.slice(i+1).some(b=>adjacent(a,b)))){rows.push({seed,status:'yellow-source-adjacency'});continue;}
 const eligible=R.shuffle(ob.filter(b=>Number(b.id.split('-o')[1])>=5&&!initialYellow.some(y=>adjacent(b,y))));let chosen;
 function pick(i,list){if(list.length===4){chosen=list;return;}for(let k=i;k<eligible.length&&!chosen;k++)if(list.every(b=>!adjacent(b,eligible[k])))pick(k+1,[...list,eligible[k]]);}pick(0,[]);
 if(!chosen){rows.push({seed,status:'yellow-parity-independent-set'});continue;}
 const pins=Object.fromEntries([...initialYellow,...chosen].map(b=>[b.id,'yellow']));pins['r102-156-o2']='red';pins['r102-156-o4']='green';
 if(!color(ob,['red','green','cyan','orange'],seed,pins)){rows.push({seed,status:'color-failed'});continue;}
 const machines=[{side:'top',offset:1,spawn:[0,0]},{side:'bottom',offset:1,spawn:[0,4]},{side:'top',offset:4,spawn:[3,0]},{side:'bottom',offset:4,spawn:[3,4]}];
 l.generators=[];l.blocks=ob;
 for(let m=0;m<4;m++){
  const queue=[];let previous;
  for(let j=0;j<4;j++){
   const id='r102-156-q'+m+'-'+j,s=j===0?(m===0?6:4):(j===1||m===0&&j===2?4:8),raw=shapes[s],bottom=m%2===1,dx=!bottom&&s===4?1:0,dy=bottom?2-Math.max(...raw.map(p=>p[1])):0,shape=raw.map(([x,y])=>[x+dx,y+dy]);
   const palette=['red','green','cyan','orange'].filter(c=>c!==previous),color=j===0?['cyan','orange','red','red'][m]:j%2===1?'yellow':R.shuffle(palette)[0];previous=color;
   l.blocks.push({id,color,shape,x:0,y:0});queue.push(id);
  }
  l.generators.push({id:'r102-156-g'+m,...machines[m],rimSpan:3,rimMount:'rim',trigger:'move',queueBlockIds:queue});
 }
 const r=attempt(l,seed,{opening:'.codex-temp/video-audit-135-169/openings/level-156.jpg',originalOpeningBodies:4,originalQueueBodies:16,generators:[4,4,4,4],ice:[1,1],flipInitials:{yellow:false,green:true,red:true,cyan:true,orange:true},adaptation:'Preserved42cell rectangle filled with16 extra ordinary dominoes beyond source2V3+2H2. Four fixed mouth FIFO queues retain all16 bodies. Native q0 source shapes/queue fill recolored/reshaped under1.102 with M11 proportion capped at30percent. Queue unknown later facts pending.'});rows.push(r);console.log(JSON.stringify(r));
}
console.log(write('iteration156-'+start+'-'+Date.now(),rows));
