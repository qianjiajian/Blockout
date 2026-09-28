import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {pack,SHAPES,rect,seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const{api}=await loadApi(),level=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json')).levels[66].level;SHAPES.SQ3=[rect(3,3)];for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only'));
const regions=[{x:3,y:2,w:4,h:3},{x:2,y:9,w:3,h:1},{x:0,y:2,w:2,h:2},{x:0,y:5,w:2,h:1}],cells=level.playable.filter(([x,y])=>!regions.some(r=>x>=r.x&&x<r.x+r.w&&y>=r.y&&y<r.y+r.h));
const source=[['H2','red'],['H3','green'],['V2','purple'],['V2','cyan'],['V2','blue'],['SQ2','red']].map(([kind,color])=>({kind,color}));
for(const [n,kinds]of [['H3','H3','H3','H3','V2','V2','V2','V2','V2'],['H2','H2','H2','H2','H2','H2','V2','V2','V2','V2','V2'],['H3','H3','H2','H2','H2','H2','V2','V2','V2','V2'],['V3','V3','SQ2','SQ2','SQ2','SQ2']].entries()){
 const spec=[...source,...kinds.map((kind,i)=>({kind,color:'u'+i}))],t=Date.now(),r=pack(spec,cells,seededRng(912+n),2000000,true);console.log(JSON.stringify({n,success:!!r,ms:Date.now()-t,cells:cells.length,area:spec.reduce((n,b)=>n+SHAPES[b.kind][0].length,0)}));if(r)fs.writeFileSync(`deliverables/remake31-200-v145-20260924/batches/lv061-070/author65-67/debug-pack67-${n}.json`,JSON.stringify(r,null,2));
}
