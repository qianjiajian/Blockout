import fs from 'node:fs';
let s=fs.readFileSync('tools/continue231-240/author239-mouth.mjs','utf8');
s=s.replace("const queue=[",`const contact=(b,g)=>{const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));return g.side==='left'?b.x===0&&b.y>=g.offset&&b.y+h<=g.offset+g.size:g.side==='right'?b.x+w===7&&b.y>=g.offset&&b.y+h<=g.offset+g.size:false;};
 let free=0;for(const g of gates){for(const p of shuffle(a.filter(b=>!b.keyId&&!b.lockedBy&&contact(b,g)))){if(a.some(q=>q!==p&&q.color===g.color&&touch(p,q)))continue;p.color=g.color;if(api.auditCandidateBlockArt({blocks:[p]}).passed){free++;break;}}}if(free<2)return null;
 const queue=[`);
s=s.replace('routeMs:2500','routeMs:4500').replace('maxMilliseconds:2500','maxMilliseconds:4500');
fs.writeFileSync('tools/continue231-240/author239-open.mjs',s,{flag:'wx'});
