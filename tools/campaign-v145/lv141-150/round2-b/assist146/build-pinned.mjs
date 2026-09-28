import fs from 'node:fs';
let s=fs.readFileSync('tools/campaign-v145/lv141-150/round2-b/assist146/corridor146.mjs','utf8');
s=s.replace('const ps=bs.map((b,i)=>shuffle(region.flatMap(([x,y])=>{','const ps=bs.map((b,i)=>shuffle(region.flatMap(([x,y])=>{if(adj&&b.id===\'s146-o4\'&&(x!==5||y!==8)||adj&&b.id===\'s146-o0\'&&(x!==1||y!==8))return[];');
s=s.replace('const t=tile(opening,open,true)',"opening.find(b=>b.id==='s146-o4').color='green';opening.find(b=>b.id==='s146-o0').color='purple';\n const t=tile(opening,open,true)");
s=s.replace('n<900','n<500').replace("&&rnd()<.5","&&b.id!=='s146-o0'&&rnd()<.5");
fs.writeFileSync('tools/campaign-v145/lv141-150/round2-b/assist146/corridor-pinned146.mjs',s);
