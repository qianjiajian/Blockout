import fs from'node:fs';import{shapes,rng,rect}from'../common.mjs';
export function regionTiles(cells,{count,seed=1,maxNodes=250000,limit=20,allowed=[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21]}={}){
 const R=rng(seed),legal=new Set(cells.map(p=>p.join(','))),occ=new Set(),bs=[],out=[];let nodes=0;
 function go(){if(++nodes>maxNodes||out.length>=limit)return;if(bs.length===count){if(occ.size===legal.size)out.push(structuredClone(bs));return;}const left=legal.size-occ.size,remain=count-bs.length;if(left<remain||left>remain*9)return;const first=cells.find(p=>!occ.has(p.join(',')));if(!first)return;
  for(const sid of R.shuffle(allowed).sort((a,b)=>shapes[b].length-shapes[a].length)){if(shapes[sid].length>left-(remain-1)||shapes[sid].length<left-(remain-1)*9)continue;for(const[dx,dy]of shapes[sid]){const x=first[0]-dx,y=first[1]-dy,foot=shapes[sid].map(([sx,sy])=>[x+sx,y+sy].join(','));if(!foot.every(p=>legal.has(p)&&!occ.has(p)))continue;bs.push({x,y,shape:shapes[sid],shapeId:sid});foot.forEach(p=>occ.add(p));go();foot.forEach(p=>occ.delete(p));bs.pop();if(nodes>maxNodes||out.length>=limit)return;}}
 }go();return{layouts:out,nodes,exhausted:nodes<=maxNodes&&out.length<limit};
}
if(process.argv[1]?.endsWith('packing.mjs')){const cells=[[6,10],[7,10],...rect(2,11,6,1),...rect(0,12,8,1),...rect(1,13,6,1)];console.log(JSON.stringify(regionTiles(cells,{count:5}),null,2));}
