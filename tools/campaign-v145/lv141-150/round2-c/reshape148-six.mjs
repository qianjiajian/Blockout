import fs from 'node:fs';
const root='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-c',d=JSON.parse(fs.readFileSync(root+'/candidate148-1790476731146-237.json')),shape=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
const first=d.level.blocks.find(b=>b.x===0&&b.y===3),bottom=[0,1,2].map(x=>d.level.blocks.find(b=>b.x===x&&b.y===6));first.shape=shape(3,2);Object.assign(bottom[0],{x:0,y:5,shape:shape(2,2),color:'blue'});Object.assign(bottom[1],{x:2,y:5,shape:shape(1,3),color:'purple'});Object.assign(bottom[2],{x:0,y:7,shape:shape(2,1),color:'green'});
fs.writeFileSync(root+'/reshaped148-six.json',JSON.stringify({level:d.level},null,2));
