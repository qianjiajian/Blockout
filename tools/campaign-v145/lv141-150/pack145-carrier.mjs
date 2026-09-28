import fs from 'node:fs';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const {api}=await loadApi(),W=7,H=3,shapes=Object.fromEntries(api.FORMAL_BLOCK_SHAPES.map(s=>[s.shapeId,s.cells]));
function pack(blocks){
 const full=(1<<(W*H))-1,positions=blocks.map(b=>{const out=[];for(let y=0;y<H;y++)for(let x=0;x<W;x++){
  const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(cells.some(([cx,cy])=>cx>=W||cy>=H))continue;out.push({x,y,mask:cells.reduce((v,[cx,cy])=>v|(1<<(cy*W+cx)),0)});
 }return out;}),visited=new Set();let states=0;
 function go(mask,remaining,placed){states++;if(!remaining.length)return mask===full?placed:null;const key=mask+':'+remaining.join(',');if(visited.has(key))return null;visited.add(key);let first=0;while(mask&(1<<first))first++;
  for(const i of remaining)for(const p of positions[i])if((p.mask&(1<<first))&&!(mask&p.mask)){const r=go(mask|p.mask,remaining.filter(j=>j!==i),[...placed,{...blocks[i],x:p.x,y:p.y}]);if(r)return r;}
  return null;
 }return {placement:go(0,blocks.map((_,i)=>i),[]),states};
}
const base=[{id:'green-L3',color:'green',shape:shapes[4]},{id:'blue-pink',color:'blue',layers:['blue','pink'],shape:shapes[3]},
 {id:'green-yellow',color:'green',layers:['green','yellow'],shape:shapes[7]},{id:'blue-yellow',color:'blue',layers:['blue','yellow'],shape:shapes[8]},
 {id:'red-blue',color:'red',layers:['red','blue'],shape:shapes[7]}];
const shellAvailability=api.FORMAL_BLOCK_SHAPES.map(s=>({shapeId:s.shapeId,area:s.cells.length,supported:api.auditCandidateBlockArt({blocks:[{id:'red-blue',color:'red',layers:['red','blue'],shape:s.cells}]}).passed}));
const rows=[];for(const s of api.FORMAL_BLOCK_SHAPES.filter(s=>s.cells.length===5)){
 const blocks=[...base,{id:'fill',color:'yellow',shape:s.cells}],art=api.auditCandidateBlockArt({blocks});rows.push({shapeId:s.shapeId,artPassed:art.passed,...(art.passed?pack(blocks):{})});
}
const twoFill=pack([...base,{id:'fill-H3',color:'yellow',shape:shapes[9]},{id:'fill-H2',color:'blue',shape:shapes[8]}]);
const report={scope:'Fixed 7x3 hidden region, retain native q0 versions of four smaller source identities and red/blue SQ2 replacing unsupported SQ3 shell. Exhaust all native five-cell ordinary shapes for a single fill body; no universal minimality over changed source identities claimed.',shellAvailability,rows,oneFillPossible:rows.some(r=>r.placement),twoFill,openingColumnResidues:{geometry:'top six rows of 7x9 baseline, missing top corners',columnCounts:[5,6,6,6,6,6,5],source:'twelve V3',remainingCellsByColumnModulo3:[2,0,0,0,0,0,2],explanation:'With all source V3 retained, added coverage must supply two cells in each disjoint outer column. One four-cell native block cannot occupy these disconnected columns; two V2 preserve the opening histogram.'},bindings:Object.fromEntries(['src/game/formalBlockShapes.ts','src/game/artManifest.ts','tools/revised-candidate-block-art.mjs','tools/campaign-v145/lv141-150/pack145-carrier.mjs'].map(p=>[p,digest(fs.readFileSync(p))]))};
const out=`deliverables/remake31-200-v145-20260924/batches/lv141-150/packing145-${Date.now()}.json`;fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify({out,oneFillPossible:report.oneFillPossible,twoFillPossible:!!twoFill.placement,shellMaxArea:Math.max(...shellAvailability.filter(r=>r.supported).map(r=>r.area))}));
