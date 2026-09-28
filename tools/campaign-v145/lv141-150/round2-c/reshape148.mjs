import fs from 'node:fs';
const root='deliverables/remake31-200-v145-20260924/batches/lv141-150',d=JSON.parse(fs.readFileSync(root+'/source148/candidate148-147149302-1790250626276-shortened-1790250742093.json'));
const blocks=d.level.blocks.filter(b=>!b.shutterId),shell=blocks.find(b=>b.layers),others=blocks.filter(b=>!b.layers),shape=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]),open=[];
open.push({...others.shift(),x:0,y:3,shape:shape(3,3),color:'red'});open.push({...shell,x:3,y:3,shape:shape(1,3),color:'yellow',layers:['yellow','orange']});open.push({...others.shift(),x:4,y:3,shape:shape(1,3),color:'red'});
for(let y=3;y<6;y++)open.push({...others.shift(),x:5,y,shape:shape(2,1),color:['blue','yellow','red'][y-3]});
for(let x=0;x<7;x++)open.push({...others.shift(),x,y:6,shape:shape(1,2),color:['blue','yellow','blue','red','yellow','green','yellow'][x]});
d.level.blocks=[...open,...d.level.blocks.filter(b=>b.shutterId)];Object.assign(d.level.gates.find(g=>g.color==='red'),{offset:3});
Object.assign(d.level.gates.find(g=>g.color==='orange'),{side:'left',offset:6,size:3});Object.assign(d.level.gates.find(g=>g.color==='green'),{side:'right',offset:3,size:2});Object.assign(d.level.gates.find(g=>g.color==='cyan'),{side:'right',offset:9,size:2});
fs.writeFileSync(root+'/round2-c/reshaped148-big.json',JSON.stringify({level:d.level,source:'Source-known13 opening identities retained, shape layout changed underv173, one opening shell remains, M11 hidden unchanged.'},null,2));
