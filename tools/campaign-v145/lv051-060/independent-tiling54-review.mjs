import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
const {api}=await loadApi();
const out='deliverables/remake31-200-v145-20260924/batches/lv051-060/agent51-54';
const sourceFile='deliverables/remake31-200-v145-20260924/batches/lv051-060/root54/source-review54-1790249364731.json';
const source=JSON.parse(fs.readFileSync(sourceFile));
// Obtain variants from the whole native-art catalog, not author's packing table.
const native=api.FORMAL_BLOCK_SHAPES.filter(s=>s.cells.length===3);
assert.deepEqual(native.map(s=>s.shapeId),[3,4,9]);
const cells=id=>api.FORMAL_BLOCK_SHAPES.find(s=>s.shapeId===id).cells;
const variants={L3:[cells(4)],BAR3:[cells(3),cells(9)],H3:[cells(9)],V2:[cells(2)],SINGLE:[cells(1)]};
const base=source.hidden13.map(b=>({...b,kind:['13-yellow','13-green'].includes(b.sourceId)?'BAR3':b.kind}));
// Algorithm X: choose the least-supported active constraint (including piece
// identities), removing all intersecting rows. No author's DFS/memo is reused.
function exactCover(specs,w,h){
 const rows=[];
 for(let i=0;i<specs.length;i++)for(const shape of variants[specs[i].kind]){
  const sw=1+Math.max(...shape.map(p=>p[0])),sh=1+Math.max(...shape.map(p=>p[1]));
  for(let y=0;y+sh<=h;y++)for(let x=0;x+sw<=w;x++)rows.push({piece:i,sourceId:specs[i].sourceId,x,y,shape,cols:[w*h+i,...shape.map(([dx,dy])=>x+dx+(y+dy)*w)]});
 }
 let nodes=0;
 function walk(active,remaining){
  nodes++;if(!remaining.length)return[];
  let choice;
  for(const col of remaining){const matching=active.filter(r=>r.cols.includes(col));if(!choice||matching.length<choice.length)choice=matching;if(!choice.length)return null;}
  for(const row of choice){const taken=new Set(row.cols),rest=walk(active.filter(r=>r.cols.every(c=>!taken.has(c))),remaining.filter(c=>!taken.has(c)));if(rest)return[row,...rest];}
  return null;
 }
 const solution=walk(rows,Array.from({length:w*h+specs.length},(_,i)=>i));
 if(solution){const used=solution.flatMap(r=>r.cols);assert.equal(used.length,w*h+specs.length);assert.equal(new Set(used).size,used.length);}
 return{width:w,height:h,algorithm:'Algorithm X, minimum-column, labeled piece constraints, exhaustive with no cutoff',nodes,tilingExists:solution!==null,layout:solution?.map(({cols,piece,...r})=>r)??null};
}
const original=[[3,7],[7,3]].map(([w,h])=>exactCover(base,w,h));
const adapted=[[3,7],[7,3]].map(([w,h])=>exactCover(base.map(s=>s.sourceId==='13-purple'?{...s,kind:'BAR3'}:s),w,h));
assert(original.every(s=>!s.tilingExists));assert(adapted.every(s=>s.tilingExists));
const witness=source.nativeTilingCertificate.oneExtraSubstitution;
const covered=witness.layout.flatMap(b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]));
assert.equal(covered.length,21);assert.equal(new Set(covered.map(p=>p.join(','))).size,21);assert(covered.every(([x,y])=>x>=0&&x<7&&y>=0&&y<3));
const report={checkedAt:new Date().toISOString(),sourceFile,sourceSha256:digest(fs.readFileSync(sourceFile)),catalogSha256:digest(fs.readFileSync('src/game/formalBlockShapes.ts')),nativeArea3Catalog:native,original,adapted,authorWitnessIndependentCoverage:true,conclusion:'在两件L3壳已按同面积BAR3适配的前提下，零额外换形时两种可容纳21格矩形均穷尽无铺法；只将无机制purple L3改BAR3，两种尺寸均有满铺。额外一块换形在该矩形/同面积/native形状合同下达到最小数量。此报告仅验证铺砖，不证明关卡可解/难度，亦不额外复核壳素材缺失来源。'};
const p=out+'/independent-tiling54-'+Date.now()+'.json';fs.writeFileSync(p,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({p,original:original.map(({layout,...x})=>x),adapted:adapted.map(({layout,...x})=>x)}));
