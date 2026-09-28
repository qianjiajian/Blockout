import fs from'node:fs';import{shapes,tile,rng,rect,save,OUT,api}from'./common.mjs';
const R=rng(167281),pool={};const irregular=[4,5,6,10,11,12,19],regular=[1,2,3,7,8,9,13,14,15,21];
for(const[n,k]of [[6,1],[6,0],[5,0]]){const key=n+'-'+k,values=[],seen=new Set();for(let attempt=0;attempt<100000&&values.length<50;attempt++){let ids=Array.from({length:n},(_,i)=>(i<k?irregular:regular)[Math.floor(R.random()*(i<k?irregular:regular).length)]);if(ids.reduce((a,i)=>a+shapes[i].length,0)!==28)continue;const sig=ids.slice().sort((a,b)=>a-b).join(',');if(seen.has(sig))continue;seen.add(sig);const bs=tile(ids.map((s,i)=>({id:String(i),shape:shapes[s],color:'red'})),rect(0,0,7,4),{seed:R.state(),maxNodes:8000,preferLarge:true});R.random();if(bs){values.push(bs.map(b=>({shapeId:ids[Number(b.id)],x:b.x,y:b.y})));console.log(key,sig);}}pool[key]=values;}
console.log(save('pool167',pool));


