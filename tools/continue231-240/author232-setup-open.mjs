import fs from 'node:fs';let s=fs.readFileSync('tools/continue231-240/author232-tiles.mjs','utf8');
s=s.replace("const[side,origin,size]=slots[j];if(all.filter", "const[side,origin,size]=slots[j];const contact=b=>{const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));return side==='left'?b.x===origin[0]&&b.y>=origin[1]&&b.y+h<=origin[1]+size:side==='right'?b.x+w-1===origin[0]&&b.y>=origin[1]&&b.y+h<=origin[1]+size:side==='top'?b.y===origin[1]&&b.x>=origin[0]&&b.x+w<=origin[0]+size:b.y+h-1===origin[1]&&b.x>=origin[0]&&b.x+w<=origin[0]+size;};if(i<2&&!visible.some(b=>b.color===color&&contact(b)))continue;if(all.filter")
 .replace('maxMilliseconds:3500','maxMilliseconds:5000');
fs.writeFileSync('tools/continue231-240/author232-open.mjs',s,{flag:'wx'});
