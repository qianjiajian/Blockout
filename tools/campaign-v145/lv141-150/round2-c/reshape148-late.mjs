import fs from 'node:fs';
const root='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c',d=JSON.parse(fs.readFileSync(root+'/reshaped148-big.json'));
const opening=d.level.blocks.filter(b=>!b.shutterId);for(const [i,b]of opening.entries()){b.color=['blue','yellow','green','red','yellow','red','green','yellow','green','red','yellow','green','yellow'][i];if(b.layers)b.layers=[b.color,'orange'];}
Object.assign(d.level.gates.find(g=>g.color==='red'),{side:'right',offset:3});Object.assign(d.level.gates.find(g=>g.color==='green'),{side:'left',offset:3});
fs.writeFileSync(root+'/reshaped148-late.json',JSON.stringify(d,null,2));
