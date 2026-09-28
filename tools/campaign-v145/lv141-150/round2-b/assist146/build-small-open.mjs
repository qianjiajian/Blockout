import fs from 'node:fs';
let s=fs.readFileSync('tools/campaign-v145/lv141-150/round2-b/assist146/corridor146.mjs','utf8');
s=s.replace('const ps=bs.map((b,i)=>shuffle(region.flatMap(([x,y])=>{','const ps=bs.map((b,i)=>shuffle(region.flatMap(([x,y])=>{if(adj&&b.id===\'s146-o10\'&&(x!==6||y!==9)||adj&&b.id===\'s146-o5\'&&(x!==0||y!==8))return[];');
s=s.replace("if(n>=200){opening.find(b=>b.id==='s146-o10').shape=[[0,0],[1,0]];opening.find(b=>b.id==='s146-o4').shape=[[0,0],[0,1],[1,1]];}","");
s=s.replace('const t=tile(opening,open,true)',"opening.find(b=>b.id==='s146-o10').color='green';opening.find(b=>b.id==='s146-o5').color='purple';\n const t=tile(opening,open,true)");
s=s.replace('n<900','n<600');
fs.writeFileSync('tools/campaign-v145/lv141-150/round2-b/assist146/corridor-small146.mjs',s);
