import fs from 'node:fs';
const out='deliverables/continue211-220-20260930/root212-skeleton';fs.mkdirSync(out,{recursive:true});const results=[];let layouts=0;
for(const neck of [3,5,7])for(const smallX of [0,5]){
 const allowed=new Set();for(let y=2;y<9;y++)for(let x=0;x<7;x++){if(y<6&&(x<(7-neck)/2||x>=(7+neck)/2))continue;if(y>=7&&x>=smallX&&x<smallX+2)continue;allowed.add(y*7+x);}
 const rects=[];for(const p of allowed){const x=p%7,y=Math.floor(p/7);if(x<6&&y<8&&[p+1,p+7,p+8].every(i=>allowed.has(i)))rects.push([p,p+1,p+7,p+8]);}
 for(const count of [5,6,7]){
  const rec=(from,selected,occupied)=>{if(results.length>=120||layouts>=160000)return;if(selected.length<count){for(let i=from;i<rects.length;i++)if(!rects[i].some(p=>occupied.has(p))){const next=new Set(occupied);rects[i].forEach(p=>next.add(p));rec(i+1,[...selected,rects[i]],next);}return;}layouts++;
   const remaining=new Set([...allowed].filter(p=>!occupied.has(p)));
   for(const p of remaining){if(p%7===6||!remaining.has(p+1))continue;const available=new Set(remaining);available.delete(p);available.delete(p+1);const components=[];
    while(available.size){const start=available.values().next().value,q=[start];available.delete(start);for(let i=0;i<q.length;i++){const v=q[i];for(const n of [v%7>0?v-1:-1,v%7<6?v+1:-1,v-7,v+7])if(available.has(n)){available.delete(n);q.push(n);}}components.push(q);}
    if(components.length>=9&&components.length<=11&&components.every(c=>c.length<=4))results.push({neck,smallX,rects:selected,ice:[p,p+1],blue:components});
   }
  };rec(0,[],new Set());
 }
}
fs.writeFileSync(out+'/layouts.json',JSON.stringify({layouts,results},null,2),{flag:'wx'});console.log({layouts,found:results.length,first:results[0]});
