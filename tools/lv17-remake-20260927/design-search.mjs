import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {witness} from '../lv11-remake-20260927/design-witness.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {loadPreviewCore,digest} from '../revised-preview-validation-v160.mjs';

const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.85.0');
const sourceFile='deliverables/lv17-remake-20260927/source-ledger.json',source=JSON.parse(fs.readFileSync(sourceFile));
const baseline=JSON.parse(fs.readFileSync('deliverables/lv17-remake-20260927/baseline.json')).level;
assert.equal(source.blocks.length,26);assert.equal(source.blocks.reduce((n,b)=>n+b.shape.length,0),48);
const totalClears=source.blocks.reduce((n,b)=>n+(b.layers?.length??1),0);
const root=`deliverables/lv17-remake-20260927/design-search-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
let seed=Number(process.argv[2]??17850);const limit=Number(process.argv[3]??60),budget=Number(process.argv[4]??500);
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const shuffled=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const pick=a=>a[Math.floor(rnd()*a.length)],W=6,H=8,playable=Array.from({length:48},(_,i)=>[i%W,Math.floor(i/W)]);
const plain=source.gates.filter(g=>!(g.frozen>0));assert.equal(plain.length,1);
const signature=b=>JSON.stringify({shape:b.shape,color:b.color,layers:b.layers??[b.color],ice:b.frozen??0});
const groups=[];for(const b of source.blocks){const key=signature(b);let g=groups.find(g=>g.key===key);if(!g){g={key,items:[]};groups.push(g);}g.items.push(b);}
const gateOptions=Object.fromEntries(source.gates.map(g=>{
 const same=source.blocks.filter(b=>(b.layers??[b.color]).includes(g.color)),out=[];
 for(const side of ['top','bottom','left','right']){
  const horizontal=['top','bottom'].includes(side),size=Math.max(...same.map(b=>1+Math.max(...b.shape.map(p=>p[horizontal?0:1]))));assert(size<=3);
  for(let offset=0;offset+size<=(horizontal?W:H);offset++)out.push({side,offset,size});
 }return[g.color,out];
}));
const overlap=(a,b)=>a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size;
function pack(){
 const counts=groups.map(g=>g.items.length),owner=Array(48).fill(null),placed=[];let nodes=0;
 function visit(){
  if(++nodes>12000)return false;const first=owner.indexOf(null);if(first<0)return true;const x=first%W,y=Math.floor(first/W);
  const options=shuffled(groups.map((_,i)=>i).filter(i=>counts[i]>0));
  // Try larger native tiles early, but randomized priorities retain genuinely
  // different subdivisions. Every placement uses the authored q0 footprint.
  const priority=new Map(options.map(i=>[i,groups[i].items[0].shape.length+rnd()*4]));options.sort((a,b)=>priority.get(b)-priority.get(a));
  for(const i of options){
   const original=groups[i].items[counts[i]-1],cells=original.shape.map(([dx,dy])=>[x+dx,y+dy]);
   if(cells.some(([xx,yy])=>xx>=W||yy>=H||owner[yy*W+xx]))continue;
   if(cells.some(([xx,yy])=>[[xx-1,yy],[xx+1,yy],[xx,yy-1],[xx,yy+1]].some(([nx,ny])=>nx>=0&&nx<W&&ny>=0&&ny<H&&owner[ny*W+nx]?.color===original.color)))continue;
   const b={id:'lv17-'+original.id.replace(/^source17-/,''),x,y,shape:original.shape,color:original.color,...(original.layers?.length>1?{layers:original.layers}:{}),...(original.frozen>0?{frozen:original.frozen}:{})};
   for(const[xx,yy]of cells)owner[yy*W+xx]=b;
   let frozenWall=false;
   for(let yy=1;yy<H-1;yy++)if(owner.slice(yy*W,(yy+1)*W).every(o=>o&&(o.frozen??0)>=18))frozenWall=true;
   if(!frozenWall){placed.push(b);counts[i]--;if(visit())return true;counts[i]++;placed.pop();}
   for(const[xx,yy]of cells)owner[yy*W+xx]=null;
  }
  return false;
 }
 return visit()?placed:null;
}
function make(){
 const blocks=pack();if(!blocks)return null;
 const touches=(b,g)=>{const bw=1+Math.max(...b.shape.map(p=>p[0])),bh=1+Math.max(...b.shape.map(p=>p[1])),h=['top','bottom'].includes(g.side),p=h?b.x:b.y,span=h?bw:bh;
  return p>=g.offset&&p+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+bh===H:g.side==='left'?b.x===0:b.x+bw===W);};
 const ordinary=plain[0],opening=gateOptions[ordinary.color].filter(g=>blocks.some(b=>b.color===ordinary.color&&!b.frozen&&touches(b,g)));if(!opening.length)return null;
 const gates=[{...pick(opening),id:'lv17-gate-'+ordinary.color,color:ordinary.color}];
 for(const original of shuffled(source.gates.filter(g=>g.frozen>0))){const choices=gateOptions[original.color].filter(g=>!gates.some(o=>overlap(g,o)));if(!choices.length)return null;gates.push({...pick(choices),id:'lv17-gate-'+original.color,color:original.color,frozen:original.frozen});}
 return{id:17,name:baseline.name,difficulty:'normal',timeSeconds:135,reward:70,parMoves:71,preservedMoveTarget:71,width:W,height:H,playable,blocked:[],seams:[],mechanismRules:'revised-2026-09-23-v1.4',blocks,gates};
}
const{api}=await loadPreviewCore(),rows=[];let selected,solved=0,unknown=0,below=0;
function flush(){fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({ruleVersion:lock.activeVersion,sourceFile,sourceSha256:digest(fs.readFileSync(sourceFile)),totalClears,solved,unknown,below,selected,rows},null,2));}
for(let i=0;i<limit;i++){
 let level,seedBefore,tries=0;do{seedBefore=seed;level=make();}while(!level&&++tries<100);if(!level){rows.push({i,status:'PACKING_BUDGET'});continue;}
 const result=witness(level,{maxCost:15,maxStates:100000,maxMilliseconds:budget,weight:30}),drags=result.drags??[],replay=drags.length?api.replayRevisedRoute(level,drags):null;
 const nonclears=drags.filter(d=>!d.exitSide),multi=nonclears.filter(d=>level.blocks.find(b=>b.id===d.blockId).shape.length>1).length,kinds={multiCell:multi,singleCell:nonclears.length-multi};
 const data={seedBefore,seedAfter:seed,level,levelSha256:digest(level),result,drags,replay,kinds};
 if(replay?.valid&&replay.complete){solved++;assert.equal(replay.clearEvents,totalClears);assert.equal(replay.effectiveDrags,totalClears+result.cost);if(result.cost<11)below++;
  if(result.cost>=11&&multi>0)data.floor=checkSymmetryFloor(level,{floor:11,maxStates:350000,maxMilliseconds:4000});
 }else unknown++;
 const file=path.join(root,`attempt-${i}.json`);fs.writeFileSync(file,JSON.stringify(data,null,2));rows.push({i,file,status:result.status,cost:result.cost,bestClears:result.bestClears,explored:result.explored,kinds,floor:data.floor?.status});
 if(data.floor?.thresholdProven){selected=file;flush();console.log(JSON.stringify({root,selected,cost:result.cost,total:drags.length,kinds,status:'SAME_GRAPH_L11_AND_COMPLETE_WITNESS_NEEDS_FINAL_RECHECK'}));break;}
 if(i%10===9){flush();console.log(JSON.stringify({i,solved,unknown,below,bestClears:Math.max(...rows.map(r=>r.bestClears??0))}));}
}
flush();console.log(JSON.stringify({root,selected,solved,unknown,below,status:'BOUNDED_BATCH_COMPLETE'}));
