import {base,shapes,attempt,write,rng} from './common.mjs';
const first=Number(process.argv[2]??3000),count=Number(process.argv[3]??24),rows=[];
for(let seed=first;seed<first+count;seed++){
 const l=base(156,'easy'),R=rng(seed);
 l.flipDoors=[{id:'yellow',color:'yellow',side:'left',offset:0,size:3,initiallyOpen:false},{id:'green',color:'green',side:'left',offset:3,size:3,initiallyOpen:true},{id:'red',color:'red',side:'right',offset:0,size:3,initiallyOpen:true},{id:'cyan',color:'cyan',side:'right',offset:3,size:2,initiallyOpen:true},{id:'orange',color:'orange',side:'right',offset:5,size:2,initiallyOpen:true}];
 const open=[[0,0,3,'yellow'],[2,0,3,'yellow'],[1,0,3,'red'],[0,6,9,'yellow'],[3,0,14,'red'],[0,3,14,'green'],[3,3,14,'yellow'],[3,6,9,seed%2?'orange':'cyan']];
 l.blocks=open.map(([x,y,s,color],i)=>({id:'r102-156-o'+i,x,y,shape:shapes[s],color,...(i===2||i===3?{frozen:1}:{})}));
 const machines=[{side:'top',offset:1,spawn:[0,0]},{side:'bottom',offset:1,spawn:[0,4]},{side:'top',offset:4,spawn:[3,0]},{side:'bottom',offset:4,spawn:[3,4]}];l.generators=[];
 for(let m=0;m<4;m++){
  const queue=[];
  for(let j=0;j<4;j++){
   const id='r102-156-q'+m+'-'+j,bottom=m%2===1,s=j===0?(!bottom?6:4):(j===1&&m<3?(!bottom?6:4):8),raw=shapes[s],dx=0,dy=bottom?2-Math.max(...raw.map(p=>p[1])):0,shape=raw.map(([x,y])=>[x+dx,y+dy]),color=j===0?['cyan','orange','red','red'][m]:j%2?'yellow':R.shuffle(['red','green','cyan','orange'])[0];
   l.blocks.push({id,color,shape,x:0,y:0});queue.push(id);
  }
  l.generators.push({id:'r102-156-g'+m,...machines[m],rimSpan:3,rimMount:'rim',trigger:'move',queueBlockIds:queue});
 }
 const r=attempt(l,seed,{source:'agent151-153/review-root-source155-156-1790517242114.json',actualSourceOpening:['yellowV2','yellowV2','redH3ice1','yellowH2ice1'],sourceFIFO:16,adaptation:'User1.102 reshaped four opening rectangular bodies into3V3+H3, kept2ice1 and colors; added3SQ3+H3 real ordinary fill for preserved42-cell rectangle. All16FIFO bodies retained,4real machines. Source12M11 adapted minimally to7/24 <=30%. Exact required half-yellow parity authored:4openingyellow+8queueyellow=12 of24. All generator centers/footprints fit true rim mouths; source side placements moved to top/bottom to fit smaller preserved perimeter.'});rows.push(r);console.log(JSON.stringify(r));if(r.status==='witness'&&r.U>=5&&r.U<=10){console.log(write('witness156-'+seed,{candidate:r.file,U:r.U}));break;}
}
console.log(write('manual156-'+first+'-'+Date.now(),rows));
