import fs from 'node:fs';
const input='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/assist146/candidate146-1790478662886-63.json',base=JSON.parse(fs.readFileSync(input)),dir='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c/assist146';
const shapes={SQ2:[[0,0],[1,0],[0,1],[1,1]],H2:[[0,0],[1,0]],S:[[0,0]]};
for(let variant=0;variant<4;variant++){const level=structuredClone(base.level),a=level.blocks.find(b=>b.id==='s146-o0'),b=level.blocks.find(b=>b.id==='s146-o2'),c=level.blocks.find(b=>b.id==='s146-o1'),d=level.blocks.find(b=>b.id==='s146-o8');
 if(variant<2){a.x=4;a.y=variant?6:5;a.shape=shapes.SQ2;b.x=4;b.y=variant?5:7;b.shape=shapes.H2;}else{c.x=0;c.y=8;c.shape=shapes.SQ2;d.x=1;d.y=10;d.shape=shapes.S;if(variant===3){a.x=4;a.y=5;a.shape=shapes.SQ2;b.x=4;b.y=7;b.shape=shapes.H2;}}
 const file=dir+`/reshaped-local-${variant}.json`;fs.writeFileSync(file,JSON.stringify({input,variant,level},null,2));console.log(file);}
