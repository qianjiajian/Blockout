import fs from 'node:fs';
const root='deliverables/remake31-200-v145-20260924/batches/lv061-070/author61-64';
const shapes={H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],H3:[[0,0],[1,0],[2,0]],L3:[[0,0],[0,1],[1,1]],V3:[[0,0],[0,1],[0,2]]};
function enumerate(purple){const spec=[['yellow','H2'],['green','V2'],['purple',purple],['orange','L3'],['blue','V2']],result=[],used=new Set(),positions=[];
 function visit(remaining){if(!remaining.length){result.push(structuredClone(positions));return;}const target=Array.from({length:12},(_,p)=>p).find(p=>!used.has(p)),cx=target%4,cy=Math.floor(target/4);
 for(const i of remaining)for(const [ax,ay] of shapes[spec[i][1]]){const x=cx-ax,y=cy-ay,cells=shapes[spec[i][1]].map(([dx,dy])=>[x+dx,y+dy]);if(cells.some(([px,py])=>px<0||py<0||px>=4||py>=3||used.has(py*4+px)))continue;cells.forEach(([px,py])=>used.add(py*4+px));positions.push({color:spec[i][0],kind:spec[i][1],x,y});visit(remaining.filter(j=>j!==i));positions.pop();cells.forEach(([px,py])=>used.delete(py*4+px));}}
 visit(spec.map((_,i)=>i));return result;}
const report={scope:'Exhaustive q0 full packing of the selected 4x3 cover5 area only; no global design-minimality claim',sourcePurpleActual:[[0,0],[1,0],[1,1]],nativeL3:[[0,0],[0,1],[1,1]],cases:['L3','V3','H3'].map(kind=>({purpleKind:kind,packings:enumerate(kind)}))};
const out=`${root}/adaptation-tilings64-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({out,cases:report.cases.map(c=>({kind:c.purpleKind,count:c.packings.length}))}));
