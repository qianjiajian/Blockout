import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const {api}=await loadApi(),W=3,H=4;
function pack(blocks){
 const occupied=Array(W*H).fill(false),placed=[];let positions=0;
 function go(i){if(i===blocks.length)return occupied.every(Boolean)?structuredClone(placed):null;const b=blocks[i];
  for(let y=0;y<H;y++)for(let x=0;x<W;x++){
   positions++;const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(cells.some(([cx,cy])=>cx>=W||cy>=H||occupied[cy*W+cx]))continue;
   for(const [cx,cy]of cells)occupied[cy*W+cx]=true;placed.push({...b,x,y});const r=go(i+1);if(r)return r;placed.pop();for(const [cx,cy]of cells)occupied[cy*W+cx]=false;
  }return null;
 }return {placement:go(0),positions};
}
const rows=[],red={id:'red',color:'red',shape:[[0,0],[1,0],[0,1],[1,1]]};
for(const b of api.FORMAL_BLOCK_SHAPES)for(const c of api.FORMAL_BLOCK_SHAPES){
 if(b.cells.length+c.cells.length!==8)continue;
 const blocks=[red,{id:'blue',color:'blue',shape:b.cells},{id:'cyan',color:'cyan',layers:['cyan','yellow'],shape:c.cells}];
 const art=api.auditCandidateBlockArt({blocks});if(!art.passed){rows.push({blueShape:b.shapeId,cyanShape:c.shapeId,status:'missing-native-art'});continue;}
 const result=pack(blocks);rows.push({blueShape:b.shapeId,cyanShape:c.shapeId,status:result.placement?'packing-found':'exhausted',...result});
}
const adapted=[red,{id:'blue-a',color:'blue',shape:[[0,0],[0,1]]},{id:'blue-b',color:'blue',shape:[[0,0],[0,1]]},{id:'cyan',color:'cyan',layers:['cyan','yellow'],shape:red.shape}];
const report={sourceRegion:{width:W,height:H,bodyCount:3,sourceShapes:['red SQ2','blue vertical L4','cyan/yellow L4 shell']},scope:'Keep source red SQ2 and all colors/one shell. Exhaust all native blue body and cyan-shell pairs summing remaining eight cells. Does not prove global minimality if red shape or region is changed.',rows,adapted:pack(adapted),threeBodyPackingFound:rows.some(r=>r.placement),bindings:Object.fromEntries(['src/game/formalBlockShapes.ts','src/game/artManifest.ts','tools/revised-candidate-block-art.mjs','tools/campaign-v145/lv141-150/pack149-carrier.mjs'].map(p=>[p,digest(fs.readFileSync(p))]))};
const out=`deliverables/remake31-200-v145-20260924/batches/lv141-150/root149/carrier-proof-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({out,threeBodyPackingFound:report.threeBodyPackingFound,fourBodyPackingFound:!!report.adapted.placement,cases:rows.length}));
