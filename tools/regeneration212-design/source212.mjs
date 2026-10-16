import { adjacency, run } from './design212.mjs';
const S=[[0,0]],H2=[[0,0],[1,0]],V2=[[0,0],[0,1]],Q2=[[0,0],[1,0],[0,1],[1,1]],L3=[[0,0],[0,1],[1,1]];
const B=(id,color,x,y,shape=S,extra={})=>({id:`l212-${id}`,color,x,y,shape,...extra});
export function sourceLayout(seed){
 const level={id:212,name:'双帘交错·212',difficulty:'normal',mechanismRules:'revised-2026-09-27-v1.5',width:7,height:9,
 playable:Array.from({length:63},(_,p)=>[p%7,Math.floor(p/7)]).filter(([x,y])=>!(y>=3&&y<=5&&(x===0||x===6))),
 timeSeconds:95,reward:200,parMoves:8,preservedMoveTarget:34,designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:11,calibratedDifficulty:1.3},
 gates:[{id:'l212-green',color:'green',side:'top',offset:2,size:3,frozen:19},{id:'l212-red',color:'red',side:'left',offset:0,size:2,frozen:16},{id:'l212-yellow',color:'yellow',side:'left',offset:6,size:2,frozen:11},{id:'l212-blue',color:'blue',side:'right',offset:6,size:2}],
 shutters:[{id:'l212-cover10',x:0,y:0,width:7,height:2,count:10,skin:'shutter'},{id:'l212-cover1',x:1,y:4,width:2,height:2,count:1,skin:'shutter'}],
 blocks:[
 B('a','blue',0,2,H2),B('b','yellow',2,2),B('c','blue',3,2),B('d','red',4,2),B('e','green',5,2,H2),B('e-adapt','yellow',5,3),
 B('f','yellow',1,3),B('g','blue',2,3),B('h','green',3,3,V2),B('i','blue',4,3),B('ice11','red',4,4,H2,{frozen:11}),
 B('j','yellow',3,5),B('k','green',4,5),B('l','blue',5,5),
 ...['blue','yellow','green','red','blue','red','blue'].map((c,x)=>B('m'+x,c,x,6)),
 B('shell-red-blue','blue',0,7,Q2,{layers:['red','blue']}),B('n','yellow',2,7,V2),B('shell-green-red','red',3,7,Q2,{layers:['green','red']}),B('o','yellow',5,7,H2),B('p','red',5,8,H2),
 B('small-a','blue',1,4,S,{shutterId:'l212-cover1'}),B('small-a2','red',2,4,S,{shutterId:'l212-cover1'}),B('small-b','red',1,5,S,{shutterId:'l212-cover1'}),B('small-c','blue',2,5,S,{shutterId:'l212-cover1'}),
 B('top-a','yellow',0,0,H2,{shutterId:'l212-cover10'}),B('top-bomb40','blue',2,0,H2,{shutterId:'l212-cover10',timedBombSeconds:40}),
 B('top-c','yellow',4,0,L3,{shutterId:'l212-cover10'}),B('top-d','blue',5,0,H2,{shutterId:'l212-cover10'}),B('top-d-adapt','red',6,1,S,{shutterId:'l212-cover10'}),
 B('top-e','red',0,1,H2,{shutterId:'l212-cover10'}),B('top-f','green',2,1,H2,{shutterId:'l212-cover10'})],
 mechanismAdaptation:{userAuthorized:'211–220有限换色换形重生成，合规后正式接入',change:'保源7×9沙漏，填内部单孔成57格；保两壳、两帘10/1、红H2冰11、隐藏蓝H2炸弹40、绿19红16黄11冰口与蓝普通口。源2蓝彩格与外壳互斥，保壳并省略彩格。非原向绿/蓝L3拆原向H2+S；未知小帘3格补实物满铺；普通块必要换色/重排记录在seed变体，不冒称源逐格一致。'}};
 // Replace the lower-right three-body jam by one native blue square. The
 // source mechanism inventory remains fixed; this produces actual free area
 // after the first clear rather than relying on the source's empty curtain.
 level.blocks=level.blocks.filter(b=>!['l212-m5','l212-m6','l212-o'].includes(b.id));
 level.blocks.push(B('start-adapt','blue',5,6,Q2));
 for(const [id,paint]of [['m4','yellow'],['l','green'],['k','blue'],['e','blue'],['small-a2','yellow']])level.blocks.find(b=>b.id===`l212-${id}`).color=paint;
 if(seed>=213100){
  // This structural branch removes the repeatedly trapped opening bars,
  // keeping all mechanism bodies/counters and every occupied cell intact.
  for(const id of ['l212-a','l212-e','l212-h']){
   const b=level.blocks.find(b=>b.id===id);level.blocks=level.blocks.filter(c=>c!==b);
   b.shape.forEach(([dx,dy],index)=>level.blocks.push(B(`${id.slice(5)}-split${index}`,index?'yellow':b.color,b.x+dx,b.y+dy,S)));
  }
 }
 if(seed>=213200){
  const bomb=level.blocks.find(b=>b.id==='l212-top-bomb40'),green=level.blocks.find(b=>b.id==='l212-top-f');
  bomb.y=1;green.y=0;
 }
 if(seed!==212400){
  let state=seed|0;const rand=n=>{state^=state<<13;state^=state>>>17;state^=state<<5;return(state>>>0)%n;};
  // Recolor ordinary bodies with an exact ten-blue opening supply. Otherwise
  // the 10-clear curtain before the 11-clear yellow gate can make a deadlock.
  const targets=level.blocks.filter(b=>b.shutterId!=='l212-cover10'&&!b.layers&&!b.frozen&&!['l212-start-adapt','l212-small-a2'].includes(b.id));
  const fixed=level.blocks.filter(b=>!targets.includes(b));
  for(let i=targets.length-1;i>0;i--){const j=rand(i+1);[targets[i],targets[j]]=[targets[j],targets[i]];}
  let visits=0;const blueTarget=seed>=213300?10:9;
  function colorNext(index,blues,made){
   if(++visits>30000)return null;
   if(blues>blueTarget||blues+targets.length-index<blueTarget)return null;
   if(index===targets.length)return blues===blueTarget?made:null;
   const options=['blue','red','green','yellow'];for(let i=3;i>0;i--){const j=rand(i+1);[options[i],options[j]]=[options[j],options[i]];}
   for(const paint of options){const next={...targets[index],color:paint};if(adjacency([...fixed,...made,next]).length)continue;const result=colorNext(index+1,blues+Number(paint==='blue'),[...made,next]);if(result)return result;}
   return null;
  }
  const colored=colorNext(0,0,[]);if(!colored)return{seed,status:'no-adjacency-safe-coloring',nodes:visits};
  const byId=new Map(colored.map(b=>[b.id,b]));level.blocks=level.blocks.map(b=>byId.get(b.id)??b);
 }
 return {seed,status:'SOURCE_LAYOUT_AUTHORED_ADAPTATION',level};
}
if(process.argv[1]?.endsWith('source212.mjs'))await run({count:Number(process.argv[2]??24),startSeed:Number(process.argv[3]??212400),layoutFunction:sourceLayout,guided:process.argv.includes('--guided'),extendedFamily:process.argv.includes('--family4sec')});
