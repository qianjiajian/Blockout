import fs from 'node:fs';
let s=fs.readFileSync('tools/remake191-200/author194-196/assist192/h4.mjs','utf8');
s=s.replace('198192','200192')
 .replace(',pins:{o4:[0,1],o13:[4,2],o15:[3,0],o14:[5,5],o9:[2,1],o16:[4,1],o11:[0,3]}','')
 .replace('const first=ports[0];',"const first=R.shuffle(ports.filter(p=>bs.some(b=>b.color==='red'&&!b.lockedBy&&!b.frozen&&fits(l,p,b))))[0];")
 .replace("const selected=[first,ports[1],...R.shuffle(ports.filter(p=>p!==first&&p!==ports[1])).slice(0,4)],palette=['red','blue',...R.shuffle(colors.slice(2))];","const blue=R.shuffle(ports.filter(p=>p!==first&&['left','right'].includes(p[0])))[0];if(!blue)continue;const selected=[first,blue,...R.shuffle(ports.filter(p=>p!==first&&p!==blue)).slice(0,4)],palette=['red','blue',...R.shuffle(colors.slice(2))];");
fs.writeFileSync('tools/remake191-200/author194-196/assist192/free-h4.mjs',s,{flag:'wx'});
