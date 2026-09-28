import fs from 'node:fs';
let s=fs.readFileSync('tools/remake191-200/author194-196/assist192/family.mjs','utf8');
s=s.replace('195192','196192')
 .replace("['red','red','red','red','red','blue','blue','blue','blue','yellow','yellow','yellow','green','green','green','purple','purple','orange','orange']","['red','red','red','blue','blue','blue','yellow','yellow','yellow','yellow','green','green','green','purple','purple','purple','orange','orange','orange']")
 .replace('maxNodes:2500,preferLarge:false','maxNodes:2500,preferLarge:false,pins:{o16:[0,1],o13:[2,2],o15:[3,0],o14:[5,4]}')
 .replace("const pin={o13:'green'","const pin={o16:'red',o13:'green'")
 .replace("const first=R.shuffle(ports.filter(p=>bs.some(b=>b.color==='red'&&!b.lockedBy&&!b.frozen&&fits(l,p,b))))[0];","const first=ports[0];");
fs.writeFileSync('tools/remake191-200/author194-196/assist192/narrow.mjs',s,{flag:'wx'});
