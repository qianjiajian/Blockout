import fs from 'node:fs';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok);
const OUT='deliverables/remake31-200-v145-20260924/batches/lv051-060/source60-review';fs.mkdirSync(OUT,{recursive:true});
const W=5,H=7,all=(1n<<35n)-1n,bit=(x,y)=>1n<<BigInt(y*W+x);
const pop=m=>{let n=0;while(m){m&=m-1n;n++;}return n;};
const neighbors=Array.from({length:35},(_,i)=>{let n=0n;for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const x=i%W+dx,y=Math.floor(i/W)+dy;if(x>=0&&x<W&&y>=0&&y<H)n|=bit(x,y);}return n;});
const independent=m=>{for(let i=0;i<35;i++)if((m&(1n<<BigInt(i)))&&(m&neighbors[i]))return false;return true;};
const extent=(m,axis)=>{let lo=99,hi=-1;for(let i=0;i<35;i++)if(m&(1n<<BigInt(i))){const v=axis==='vertical'?i%W:Math.floor(i/W);lo=Math.min(lo,v);hi=Math.max(hi,v);}return{offset:lo,size:hi-lo+1};};
const cache=new Map();
function options(axis,count){
 const k=axis+count;if(cache.has(k))return cache.get(k);const unique=new Map();
 for(let off=0;off<=(axis==='vertical'?W:H)-3;off++){
  const allowed=Array.from({length:H},(_,y)=>Array.from({length:W},(_,x)=>axis==='vertical'?(x>=off&&x<off+3):(y>=off&&y<off+3)).reduce((m,v,x)=>m|(v?1<<x:0),0));
  const rowOptions=allowed.map(mask=>Array.from({length:32},(_,m)=>m).filter(m=>(m&~mask)===0&&(m&(m<<1))===0));
  const rec=(y,prev,n,mask)=>{if(n>count||n+(H-y)*3<count)return;if(y===H){if(n===count)unique.set(mask.toString(),mask);return;}for(const r of rowOptions[y])if(!(r&prev))rec(y+1,r,n+pop(BigInt(r)),mask|(BigInt(r)<<BigInt(y*W)));};rec(0,0,0,0n);
 }
 const out=[...unique.values()];cache.set(k,out);return out;
}
function makeGates(pieces){
 const horizontal=pieces.filter(p=>p.axis==='horizontal'),vertical=pieces.filter(p=>p.axis==='vertical');
 const arrange=(items,sides)=>{const initial=items.map(p=>({color:p.color,...extent(p.mask,p.axis)}));for(let flips=0;flips<1<<items.length;flips++){
  const gs=initial.map((g,i)=>({...g,side:sides[(flips>>i)&1]}));let ok=true;for(let i=0;i<gs.length;i++)for(let j=0;j<i;j++)if(gs[i].side===gs[j].side&&gs[i].offset<gs[j].offset+gs[j].size&&gs[j].offset<gs[i].offset+gs[i].size)ok=false;if(ok)return gs;
 }return null;};
 const hs=arrange(horizontal,['left','right']),vs=arrange(vertical,['top','bottom']);return hs&&vs?[...vs,...hs]:null;
}
function solve(spec,limit=8){
 const groups=spec.map(([color,axis,count])=>({color,axis,count,opts:options(axis,count)})).sort((a,b)=>a.opts.length-b.opts.length),layouts=[];let checked=0;
 const visit=(i,used,pieces)=>{
  if(layouts.length>=limit)return;
  if(i===groups.length){checked++;assert.equal(used,all);const gates=makeGates(pieces);if(!gates)return;const grid=Array.from({length:H},()=>Array(W).fill(null));for(const p of pieces)for(let n=0;n<35;n++)if(p.mask&(1n<<BigInt(n)))grid[Math.floor(n/W)][n%W]=p.color;layouts.push({grid,gates});return;}
  const g=groups[i],available=all^used;
  if(i===groups.length-1){if(pop(available)!==g.count||!independent(available)||extent(available,g.axis).size>3)return;visit(i+1,all,[...pieces,{...g,opts:undefined,mask:available}]);return;}
  for(const m of g.opts)if(!(used&m))visit(i+1,used|m,[...pieces,{...g,opts:undefined,mask:m}]);
 };visit(0,0n,[]);return{spec,optionCounts:groups.map(g=>[g.color,g.opts.length]),fullColoringsChecked:checked,layouts,exhausted:layouts.length<limit};
}
const cases=[
 {changes:2,label:'one yellow to existing green; one red to new horizontal pink',spec:[['yellow','vertical',11],['green','vertical',7],['red','horizontal',8],['blue','horizontal',8],['pink','horizontal',1]]},
 {changes:2,label:'one yellow to new vertical orange; one red to new horizontal pink',spec:[['yellow','vertical',11],['green','vertical',6],['red','horizontal',8],['blue','horizontal',8],['pink','horizontal',1],['orange','vertical',1]]},
 {changes:3,label:'two yellow to existing green; one red to new horizontal pink',spec:[['yellow','vertical',10],['green','vertical',8],['red','horizontal',8],['blue','horizontal',8],['pink','horizontal',1]]},
 {changes:3,label:'one yellow to existing green; two red to new horizontal pink',spec:[['yellow','vertical',11],['green','vertical',7],['red','horizontal',7],['blue','horizontal',8],['pink','horizontal',2]]},
 {changes:3,label:'one yellow to green, one yellow to new vertical orange; one red to new horizontal pink',spec:[['yellow','vertical',10],['green','vertical',7],['red','horizontal',8],['blue','horizontal',8],['pink','horizontal',1],['orange','vertical',1]]},
];
const results=[];for(const c of cases){const r={...c,...solve(c.spec)};results.push(r);console.log(JSON.stringify({label:c.label,changes:c.changes,layouts:r.layouts.length,exhausted:r.exhausted,options:r.optionCounts,checked:r.fullColoringsChecked}));if(c.changes>2&&r.layouts.length)break;}
const report={checkedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,scope:'Static independent-set capacity and gate placement only; not a gameplay candidate, solution, or lower-bound certificate.',sourceCounts:{yellow:{count:12,axis:'vertical'},green:{count:6,axis:'vertical'},red:{count:9,axis:'horizontal'},blue:{count:8,axis:'horizontal'}},sourceDimensions:[5,7],preserved:{bodies:35,shape:'SINGLE',axisCount:35},lowerBoundArgument:['Every vertical source color remains within a single gate projection of at most3 contiguous columns. Each 3×7 stripe has independent-set maximum11. Yellow12 therefore needs at leastone changed carrier.','Every horizontal color remains within at most3 contiguous rows. Each 5×3 stripe has independent-set maximum8. Red9 therefore independently needs at leastone changed carrier.','With onlytwo recolors, exactlyone yellow andone red change. Red cannot become existingblue because blue9 exceeds8; cannot become yellow/green while retainingits horizontal axis because they remainvertical colors. It needs a newhorizontal color. Yellow can only become existinggreen or a newvertical color. Those two color-isomorphism classes are exhaustively enumerated below.','Full-coloring enumeration covers all independent sets in every3-wide/3-high stripe; smaller gate projections are subsets. Gates are placed on either compatible side and checked for overlap. No color sets or legal gate placements are omitted within the stated35S/35-axis/color-only adaptation contract.'],results,minimumRecolors:results.some(r=>r.changes===3&&r.layouts.length)&&results.filter(r=>r.changes===2).every(r=>r.exhausted&&!r.layouts.length)?3:null,layouts:results.flatMap(r=>r.layouts.map(l=>({...l,recolors:r.changes,adaptation:r.label}))),formalAdopted:false,solvabilityVerified:false,sourceSha256:crypto.createHash('sha256').update(fs.readFileSync(import.meta.filename)).digest('hex')};
const file=`${OUT}/capacity-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,minimumRecolors:report.minimumRecolors,layouts:report.layouts.length}));
