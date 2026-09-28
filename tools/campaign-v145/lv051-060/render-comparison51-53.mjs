import fs from 'node:fs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent51-54';
const baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json'));
const colors={red:'#ef4452',green:'#3aba64',yellow:'#f6bd30',blue:'#3277e5',cyan:'#46c9e8',purple:'#9b60de',pink:'#ec66b0',orange:'#f08b2e'};
const rect=(w,h)=>Array.from({length:w*h},(_,i)=>[i%w,Math.floor(i/w)]);
const b=(id,x,y,w,h,color,attrs={})=>({id,x,y,shape:rect(w,h),color,...attrs});
const sources={51:{width:6,height:6,blocks:[b('r1',0,0,3,1,'red',{movementAxis:'horizontal'}),b('g1',3,0,3,1,'green'),b('ys',0,1,3,1,'yellow',{layers:['yellow','blue']}),b('r2',3,1,3,1,'red',{movementAxis:'horizontal'}),b('r3',0,2,3,1,'red',{movementAxis:'horizontal'}),b('y1',3,2,3,1,'yellow'),b('yi',0,3,3,1,'yellow',{frozen:7}),b('r4',0,4,3,1,'red',{movementAxis:'horizontal'}),b('g2',0,5,3,1,'green',{movementAxis:'vertical'}),b('p1',3,3,1,3,'purple'),b('rv',4,3,1,3,'red',{movementAxis:'vertical'}),b('bs',5,3,1,3,'blue',{layers:['blue','purple']})],gates:[{color:'red',side:'right',offset:0,size:3},{color:'green',side:'top',offset:0,size:3,frozen:3},{color:'red',side:'top',offset:4,size:1,frozen:4},{color:'purple',side:'left',offset:0,size:3,frozen:10},{color:'red',side:'right',offset:4,size:1,frozen:5},{color:'yellow',side:'bottom',offset:0,size:3,frozen:8},{color:'blue',side:'bottom',offset:3,size:3,frozen:6}]},53:{width:5,height:6,blocks:[b('yi',0,0,2,1,'yellow',{frozen:7}),b('gi',0,1,2,1,'green',{frozen:7}),b('p',2,0,1,2,'pink'),b('pi',3,0,2,2,'purple',{frozen:5,movementAxis:'horizontal'}),b('o',0,2,2,2,'orange'),b('cs',2,2,1,2,'cyan',{layers:['cyan','yellow']}),b('b',3,2,1,1,'blue'),b('c',4,2,1,1,'cyan'),b('y',3,3,2,1,'yellow'),b('bh',0,4,2,1,'blue'),b('ps',2,4,1,1,'purple'),b('os',3,4,1,2,'orange',{layers:['orange','pink']}),b('cv',4,4,1,2,'cyan',{movementAxis:'vertical'}),b('rh',0,5,3,1,'red',{movementAxis:'horizontal'})],gates:[{color:'orange',side:'left',offset:2,size:2},{color:'yellow',side:'top',offset:0,size:2,frozen:7},{color:'cyan',side:'top',offset:3,size:2,frozen:5},{color:'purple',side:'left',offset:0,size:2,frozen:8},{color:'pink',side:'right',offset:0,size:2,frozen:6},{color:'blue',side:'right',offset:4,size:1,frozen:1},{color:'red',side:'right',offset:5,size:1,frozen:3},{color:'green',side:'bottom',offset:0,size:2,frozen:8}]}};
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;');
for(const id of [51,53]){
 const file=dir+'/'+(id===51?'candidate51-1790248325953.json':'candidate53-1790248323901.json'),d=JSON.parse(fs.readFileSync(file));
 let svg='<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="510" viewBox="0 0 1080 510"><rect width="1080" height="510" fill="#f2f4f9"/><style>text{font-family:Arial,Microsoft YaHei,sans-serif;fill:#17213d}</style>';
 const levels=[sources[id],baseline.levels[id-1].level,d.level],titles=['原视频开局（坐标人工转录）','制作基线（原正式数据）','新候选（已完成Pointer）'];
 for(let panel=0;panel<3;panel++){
  const l=levels[panel],cell=42,ox=panel*360+52,oy=100;
  svg+='<text x="'+(panel*360+180)+'" y="36" text-anchor="middle" font-size="19">Lv'+id+' '+esc(titles[panel])+'</text>';
  svg+='<rect x="'+ox+'" y="'+oy+'" width="'+l.width*cell+'" height="'+l.height*cell+'" fill="#d9e0ee" stroke="#334365"/>';
  for(const q of l.blocks){const w=Math.max(...q.shape.map(p=>p[0]))+1,h=Math.max(...q.shape.map(p=>p[1]))+1,x=ox+q.x*cell+2,y=oy+q.y*cell+2;svg+='<rect x="'+x+'" y="'+y+'" width="'+(w*cell-4)+'" height="'+(h*cell-4)+'" rx="5" fill="'+colors[q.color]+'" stroke="#fff" stroke-width="1.5"/>';
   if(q.layers?.length>1)svg+='<rect x="'+(x+8)+'" y="'+(y+8)+'" width="'+(w*cell-20)+'" height="'+(h*cell-20)+'" rx="3" fill="'+colors[q.layers[1]]+'" stroke="#fff" stroke-width="2"/>';
   const label=(q.frozen?'冰'+q.frozen+' ':'')+(q.movementAxis==='horizontal'?'↔':q.movementAxis==='vertical'?'↕':'');if(label)svg+='<text x="'+(x+(w*cell-4)/2)+'" y="'+(y+(h*cell-4)/2+6)+'" text-anchor="middle" font-size="19" style="paint-order:stroke;stroke:#fff;stroke-width:3">'+label+'</text>';
  }
  for(const g of l.gates){const vertical=['left','right'].includes(g.side),x=vertical?(g.side==='left'?ox-14:ox+l.width*cell+4):ox+g.offset*cell+3,y=vertical?oy+g.offset*cell+3:(g.side==='top'?oy-14:oy+l.height*cell+4),w=vertical?10:g.size*cell-6,h=vertical?g.size*cell-6:10;svg+='<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="3" fill="'+colors[g.color]+'"/><text x="'+(vertical?(g.side==='left'?x-10:x+18):x+w/2)+'" y="'+(vertical?y+h/2+5:(g.side==='top'?y-5:y+25))+'" text-anchor="middle" font-size="14">'+(g.frozen??0)+'</text>';}
  svg+='<text x="'+(panel*360+180)+'" y="414" text-anchor="middle" font-size="14">'+l.blocks.length+'块 / '+l.blocks.filter(b=>b.movementAxis).length+'轴 / '+l.blocks.filter(b=>b.frozen).length+'冰块 / '+l.blocks.filter(b=>b.layers?.length>1).length+'壳</text>';
 }
 svg+='<text x="540" y="455" text-anchor="middle" font-size="15">颜色表示融冰后的实体色；冰数字/箭头同时列出以便审核。原向整图另由美术审计与Canvas验收。</text><text x="540" y="480" text-anchor="middle" font-size="13">来源坐标仅用于可视化复核；构造器未使用来源坐标。新候选 '+digest(d.level).slice(0,16)+'</text></svg>';
 const out=dir+'/comparison'+id+'.svg';fs.writeFileSync(out,svg);console.log(out);
}
