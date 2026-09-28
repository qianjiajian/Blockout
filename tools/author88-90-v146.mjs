import fs from 'node:fs';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
import {loadApi,auditLayout,TARGETS,baseline} from './remake81to90-v146.mjs';
import {search} from '../deliverables/remake81-90-v146-20260924/agent88-90/search-generator.mjs';
import {checkFullGeneratorFloor} from './remake81to90-generator-floor-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
export const OUT='deliverables/remake81-90-v146-20260924/agent88-90';
export const SH={S:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],H3:[[0,0],[1,0],[2,0]],V3:[[0,0],[0,1],[0,2]],L3:[[0,0],[0,1],[1,1]],T4:[[1,0],[0,1],[1,1],[2,1]],L4:[[0,0],[1,0],[2,0],[0,1]],L4b:[[0,0],[0,1],[1,1],[2,1]],SQ2:[[0,0],[1,0],[0,1],[1,1]],SQ3:[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1],[0,2],[1,2],[2,2]]};
export function rng(seed){let t=seed>>>0;return()=>{t=(Math.imul(t,1664525)+1013904223)>>>0;return t/4294967296;};}
export function shuffle(a,r){a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}
export const save=(name,v)=>{const p=`${OUT}/${name}-${Date.now()}.json`;fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});return p;};
export function piece(s,id,extra={}){const b={id:`a${id}-${s.id}`,color:s.color,shape:structuredClone(SH[s.shape]),x:0,y:0,...extra};for(const k of ['frozen','keyId','lockedBy','lockCount','movementAxis'])if(s[k]!==undefined)b[k]=s[k];if(s.core)b.layers=[s.color,s.core];return b;}
export function pack(blocks,cells,r,{maxNodes=30000,adjacency=true,fixed=[]}={}){
 const board=new Map(cells.map(([x,y])=>[`${x},${y}`,null])),used=new Set(),result=[];let nodes=0;
 for(const b of fixed)for(const[x,y]of b.shape)board.set(`${x+b.x},${y+b.y}`,b.color);
 const candidates=blocks.map(b=>{const out=[];for(const [x,y]of cells)for(const [dx,dy]of b.shape){const ax=x-dx,ay=y-dy,k=`${ax},${ay}`;if(out.some(p=>p.k===k))continue;const points=b.shape.map(([sx,sy])=>[sx+ax,sy+ay]),keys=points.map(p=>p.join(','));if(keys.every(k=>board.has(k)))out.push({k,x:ax,y:ay,points,keys});}return out;});
 const first=()=>cells.find(([x,y])=>board.get(`${x},${y}`)===null);
 function visit(){if(++nodes>maxNodes)return false;const next=first();if(!next)return used.size===blocks.length;const key=next.join(','),tried=new Set();
  for(const i of shuffle(blocks.map((_,i)=>i),r)){if(used.has(i))continue;const b=blocks[i],kind=JSON.stringify([b.color,b.shape]);if(tried.has(kind))continue;tried.add(kind);
   for(const p of shuffle(candidates[i].filter(p=>p.keys.includes(key)),r)){if(p.keys.some(k=>board.get(k)!==null))continue;const set=new Set(p.keys);if(adjacency&&p.points.some(([x,y])=>[[x-1,y],[x+1,y],[x,y-1],[x,y+1]].some(q=>!set.has(q.join(','))&&board.get(q.join(','))===b.color)))continue;
    p.keys.forEach(k=>board.set(k,b.color));used.add(i);result.push({...b,x:p.x,y:p.y});if(visit())return true;result.pop();used.delete(i);p.keys.forEach(k=>board.set(k,null));
   }
  }return false;
 }return visit()?result:null;
}
function base(id){const rec=baseline().levels[id-1],l=structuredClone(rec.level);delete l.shutters;delete l.generators;l.blocks=[];l.gates=[];l.difficulty=TARGETS[id].difficulty;l.preservedMoveTarget=rec.starTargets.moveTarget;return l;}
function gate(color,side,offset,size,frozen=0){return {id:`gate-${color}`,color,side,offset,size,...(frozen?{frozen}:{})};}
export function build88(seed){const r=rng(seed),s=JSON.parse(fs.readFileSync(`${OUT}/source88.json`)),l=base(88),bs=s.opening.map(s=>piece(s,88));
 for(const [i,color]of ['red','blue','green','yellow','orange','purple','blue'].entries())bs.push(piece({id:`fill${i}`,color,shape:'H3'},88));
 const fixedSpecs=[['fill3',4,9],['o23',5,7],['o09',2,8],['o15',4,6],['fill4',4,8],['o17',4,7]],fixed=fixedSpecs.map(([id,x,y])=>({...bs.find(b=>b.id===`a88-${id}`),x,y}));
 const packed=pack(bs.filter(b=>!fixed.some(f=>f.id===b.id)),l.playable,r,{fixed});if(!packed)return null;l.blocks=[...fixed,...packed];
 l.gates=[gate('purple','top',0,3,12),gate('green','top',4,3,12),gate('red','bottom',0,3,4),gate('blue','bottom',4,3,9),gate('yellow','right',7,3),gate('orange','right',0,3,11)];
 const specs=[{side:'left',offset:2,spawn:[0,2],shapes:[SH.H3,SH.V3]},{side:'left',offset:7,spawn:[0,7],shapes:[SH.L3,SH.S]}];
 l.generators=specs.map((g,i)=>{const q=s.queues[i].map((b,j)=>{const a=piece(b,88,{shape:g.shapes[j],x:g.spawn[0],y:g.spawn[1]});l.blocks.push(a);return a.id;});return{id:`machine${i}`,side:g.side,offset:g.offset,rimSpan:3,rimMount:'rim',spawn:g.spawn,queueBlockIds:q};});return l;
}
export function build90(seed){const r=rng(seed),s=JSON.parse(fs.readFileSync(`${OUT}/source90.json`)),l=base(90),bs=s.opening.map(s=>piece(s,90));
 if(seed>=1000){
  bs[0].x=3;bs[0].y=0;bs[1].x=0;bs[1].y=0;l.blocks=bs;
  const fill=[['green','H2',1,1],['yellow','S',3,0],['green','S',5,0],['blue','H2',1,2],['red','H2',3,2],['red','H2',1,3],['blue','H2',3,3]];
  const rows=[['blue','red'],['green','yellow'],['red','blue'],['yellow','green']];
  if([1002,1004,1007].includes(seed))rows[2].reverse();if([1003,1004,1008].includes(seed))rows[0].reverse();if([1005,1007,1008].includes(seed))rows[1].reverse();if(seed===1006)fill[0][0]='yellow';
  for(let y=0;y<4;y++)for(let x=0;x<2;x++)fill.push([rows[y][x],'H3',x*3,4+y]);
  for(const[i,[color,shape,x,y]]of fill.entries())l.blocks.push(piece({id:`fill${i}`,color,shape},90,{x,y}));
  if(seed>=1200&&seed<1300){l.blocks=l.blocks.filter(b=>b.id!=='a90-fill9');l.blocks.find(b=>b.id==='a90-fill7').shape=[[0,0],[1,0],[2,0],[0,1],[1,1],[2,1]];l.blocks.find(b=>b.id==='a90-fill13').color='blue';}
  if(seed===1202)l.blocks.find(b=>b.id==='a90-fill2').color='red';
 }else{for(let i=0;i<14;i++)bs.push(piece({id:`fill${i}`,color:i>=8&&i<11?['red','blue'][i%2]:['red','blue','yellow','green'][i%4],shape:i<8?'H3':i<11?'V3':'S'},90));
 const packed=pack(bs,l.playable,r);if(!packed)return null;l.blocks=packed;}
 if(seed>=1500){l.blocks=s.opening.map(b=>piece(b,90,{x:b.id==='o01'?3:0,y:b.id==='o01'?6:0}));const defs=[['green','H2',1,1],['green','S',3,6],['green','S',5,6],['blue','H2',1,2],['green','H2',3,2],['red','H2',1,3],['yellow','H2',3,3],['blue','H3',3,0],['red','H3',3,1],['blue','H3',0,4],['red','H3',3,4],['green','H3',0,5],['yellow','H3',3,5],['red','H3',0,6],['yellow','H3',0,7]];for(const[i,[color,shape,x,y]]of defs.entries())l.blocks.push(piece({id:`fill${i}`,color,shape},90,{x,y}));}
 l.gates=[gate('red','top',0,3),gate('blue','top',3,3),gate('yellow','bottom',0,3,10),gate('green','bottom',3,3,6)];
 if(seed>=1100&&seed<1200){l.gates[0]=gate('red','left',0,2);l.gates[2]=gate('yellow','top',0,3,10);}
 const machines=[{side:'left',offset:5,spawn:[0,4]},seed===1203?{side:'right',offset:6,spawn:[3,5]}:{side:'right',offset:5,spawn:[3,4]}];
 l.generators=machines.map((g,i)=>{const ids=s.queues[i].map((src,j)=>{const b=piece(src,90);if(src.id==='q15'||(seed>=1400&&src.id==='q01')||(seed===1401&&src.id==='q18'))b.shape=structuredClone(SH.L4b);if(['q04','q05','q12','q16'].includes(src.id))b.shape=structuredClone(SH.V3);if(seed>=1100&&seed<1200&&src.id==='q05')b.shape=structuredClone(SH.H3);if(src.id==='q09')b.color='blue';
  // Fixed spawn anchors, every cargo includes the center-adjacent rim cell.
  const target=i===0?[0,1]:[2,1],found=seed===1203&&i===1&&b.shape.length===3&&b.shape.every(([x])=>x===0)?[0,1]:seed>=1001&&![1201,1202,1203,1400,1401].includes(seed)&&src.id==='q01'?[0,1]:b.shape.find(([x,y])=>x===(i===0?Math.min(...b.shape.map(p=>p[0])):Math.max(...b.shape.map(p=>p[0])))&&y<=1)??b.shape[0];
  b.shape=b.shape.map(([x,y])=>[x+target[0]-found[0],y+target[1]-found[1]]);b.x=g.spawn[0];b.y=g.spawn[1];l.blocks.push(b);return b.id;});return{id:`machine${i}`,side:g.side,offset:g.offset,rimSpan:3,rimMount:'rim',spawn:g.spawn,queueBlockIds:ids};});return l;
}
export function build89(seed){const r=rng(seed),s=JSON.parse(fs.readFileSync(`${OUT}/source89.json`)),l=base(89);
 l.shutters=[{id:'s7',count:7,x:0,y:1,width:7,height:3},{id:'s12',count:12,x:0,y:6,width:7,height:5}];
 const bs=s.opening.map(b=>piece(b,89));const fixed=[['o08',1,0],['o02',3,0],['o12',1,11],['o10',4,11]];l.blocks=fixed.map(([id,x,y])=>({...bs.find(b=>b.id===`a89-${id}`),x,y}));
 const center=[['o03',0,4],['o11',2,4],['o04',4,4],['o07',6,4],['o01',2,5],['o05',4,5],['o09',5,5],['o06',6,5]];
 l.blocks.push(...center.map(([id,x,y])=>({...bs.find(b=>b.id===`a89-${id}`),x,y})));
 const first=s.covers[0].pieces.map(b=>piece(b,89,{shutterId:'s7'})),fc=Array.from({length:21},(_,i)=>[i%7,1+Math.floor(i/7)]),fp=pack(first,fc,r,{adjacency:false});if(!fp)return null;l.blocks.push(...fp);
 const second=s.covers[1].pieces.map(b=>piece(b,89,{shutterId:'s12'}));const placements=[[2,6],[0,8],[3,8],[4,8]];second.forEach((b,i)=>{[b.x,b.y]=placements[i];});l.blocks.push(...second);
 for(const [i,[color,shape,x,y]]of [['blue','H3',0,6],['green','H3',4,6],['orange','H2',0,7],['purple','H2',5,7]].entries())l.blocks.push(piece({id:`fill${i}`,color,shape},89,{x,y,shutterId:'s12'}));
 l.gates=[gate('green','left',4,3),gate('yellow','right',4,3,2),gate('blue','right',1,3,4),gate('purple','top',1,3,6),gate('orange','left',1,3,8),gate('red','bottom',2,3,12),gate('cyan','right',8,3,18)];
 const spawn=[0,8],q=s.queues[0].map((src,j)=>{const b=piece(src,89,{x:0,y:8});b.shape=(j===0?SH.T4:j===1?SH.H3:SH.SQ2).map(([x,y])=>[x,y+(j===1?1:0)]);l.blocks.push(b);return b.id;});
 l.generators=[{id:'machine0',side:'left',offset:9,rimSpan:3,rimMount:'rim',spawn,queueBlockIds:q}];return l;
}
export async function main(){const{api}=await loadApi();const[idstr='88',start='1',count='100']=process.argv.slice(2),id=+idstr;const report={id,started:new Date().toISOString(),attempts:[],best:null};
 for(let seed=+start;seed<+start+(+count);seed++){let l;try{l=({88:build88,89:build89,90:build90}[id])(seed);if(!l){report.attempts.push({seed,status:'packing-unknown'});continue;}auditLayout(l,api);}catch(e){report.attempts.push({seed,status:'static-fail',reason:e.message});if(seed===+start)console.log(JSON.stringify(report.attempts.at(-1)));continue;}
  const candidate={activeRuleVersion:'1.47.0',seed,level:l,sourceReview:`${OUT}/source${id}.json`};
  if(process.env.BUILD_ONLY){console.log(save(`layout${id}-${seed}`,candidate));continue;}
  const result=search(l,{floor:Number(process.env.SEARCH_FLOOR??TARGETS[id].max+1),maxStates:Number(process.env.SEARCH_STATES??50000),maxMilliseconds:Number(process.env.SEARCH_MS??1200),orderSeed:seed%l.blocks.length});
  report.attempts.push({seed,...result,drags:undefined});
  if(result.status==='witness'){const replay=api.replayRevisedRoute(l,result.drags);if(!replay.valid||!replay.complete){console.log(JSON.stringify({seed,replay}));continue;}candidate.drags=result.drags;candidate.witness=replay;const file=save(`candidate${id}-${seed}`,candidate);console.log(JSON.stringify({seed,file,cost:result.cost}));if(!report.best||result.cost<report.best.cost)report.best={seed,cost:result.cost,file};
   if(result.cost>=TARGETS[id].min){const proof=checkFullGeneratorFloor(l,api,{floor:TARGETS[id].min,maxStates:400000,maxMilliseconds:10000});const f=save(`floor${id}-${seed}`,{candidate:file,levelSha256:digest(l),proof});console.log(JSON.stringify({seed,proof:proof.status,proofFile:f}));if(proof.thresholdProven){report.best.proof=f;break;}}
  }
  if(seed%20===0)console.log(JSON.stringify({seed,latest:{...report.attempts.at(-1),partialRoute:undefined},best:report.best}));
 }console.log(save(`search${id}`,report));}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url)await main();
