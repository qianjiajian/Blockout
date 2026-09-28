import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,digest,adjacent,rng} from '../common.mjs';
import {SHAPES,rect} from '../../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
const OUT='deliverables/remake171-180-20260927/author175-177/assist171';
const board=Array.from({length:80},(_,i)=>[i%8,Math.floor(i/8)]).filter(([x,y])=>!((x===0||x===7)&&(y===0||y===9)));
const modes={SQ3:[rect(3,3)],RECT6:SHAPES.RECT6,SQ2:SHAPES.SQ2,L3:SHAPES.L3,C2:[rect(2,1),rect(1,2)],C1:[[[0,0]]]};
const shapeKinds=Object.entries(modes).flatMap(([kind,ss])=>ss.filter(shape=>kind[0]==='C'||api.matchFormalBlockShape(shape,'native-only')?.quarterTurns===0).map(shape=>({kind,shape})));
function independent(bs){const n=bs.length,adj=bs.map(a=>bs.reduce((m,b,j)=>m|(a!==b&&adjacent(a,b)?1<<j:0),0)),sets=[];let maximum=0;for(let m=0;m<(1<<n);m++){const ids=[];let ok=true;for(let i=0;i<n;i++)if(m&(1<<i)){if(adj[i]&m){ok=false;break;}ids.push(i);}if(!ok)continue;if(ids.length>maximum){maximum=ids.length;sets.length=0;}if(ids.length===maximum)sets.push(ids);}return {maximum,sets,adjacency:adj.map(m=>bs.flatMap((_,j)=>m&(1<<j)?[j]:[]))};}
const bag={SQ3:2,RECT6:5,SQ2:4,L3:1};
function run(label,covers,{flexible=false,cap=12,maxMs=6000,maxNodes=2000000,seed=0}={}){
 const hidden=new Set(covers.flatMap(c=>c.shape.map(([dx,dy])=>[c.x+dx,c.y+dy].join(',')))),cells=flexible?board:board.filter(p=>!hidden.has(p.join(','))),ix=new Map(cells.map((p,i)=>[p.join(','),i])),bits=cells.map((_,i)=>1n<<BigInt(i)),full=(1n<<BigInt(cells.length))-1n,need={...bag,...flexible?{C2:4,C1:1}:{}};
 const placements=[];for(const s of shapeKinds){if(!need[s.kind])continue;for(let y=0;y<10;y++)for(let x=0;x<8;x++){const ids=s.shape.map(([dx,dy])=>ix.get([x+dx,y+dy].join(',')));if(ids.some(i=>i===undefined))continue;placements.push({...s,x,y,mask:ids.reduce((m,i)=>m|bits[i],0n)});}}
 const R=rng(seed||1),at=cells.map((_,i)=>placements.filter(p=>p.mask&bits[i]));for(let i=0;i<at.length;i++)at[i]=seed?R.shuffle(at[i]):at[i].sort((a,b)=>b.shape.length-a.shape.length||a.y-b.y||a.x-b.x);
 const start=Date.now(),counts={},chosen=[],solutions=[];let nodes=0,completeTilings=0,bestIndependence=0,aborted=false;const observed={};
 function dfs(mask){if(++nodes>maxNodes||Date.now()-start>maxMs){aborted=true;return;}if(mask===full){completeTilings++;const bs=chosen.filter(p=>p.kind[0]!=='C'),ind=independent(bs);bestIndependence=Math.max(bestIndependence,ind.maximum);observed[ind.maximum]=(observed[ind.maximum]??0)+1;if(ind.maximum<6)return;const cs=flexible?chosen.filter(p=>p.kind[0]==='C'):covers;solutions.push({blocks:bs.map(({mask,...p})=>p),covers:cs.map(({mask,...p})=>p),independent:ind});return;}
 let options=null;for(let i=0;i<cells.length;i++){if(mask&bits[i])continue;const ps=at[i].filter(p=>(counts[p.kind]??0)<need[p.kind]&&!(p.mask&mask));if(ps.length===0)return;if(options===null||ps.length<options.length)options=ps;if(options.length===1)break;}
 for(const p of options){counts[p.kind]=(counts[p.kind]??0)+1;chosen.push(p);dfs(mask|p.mask);chosen.pop();counts[p.kind]--;if(aborted||solutions.length>=cap)return;}
 }
 dfs(0n);return {label,need,flexible,seed,nodes,completeTilings,bestIndependence,observed,elapsedMs:Date.now()-start,aborted,status:solutions.length?'SPATIAL_TILINGS_WITH_SIX_INDEPENDENT':aborted?'UNKNOWN':'NO_SIX_INDEPENDENT_TILING',solutions};
}
const strip=[0,2,4,6].map(y=>({kind:'C2',shape:rect(1,2),x:3,y})).concat({kind:'C1',shape:[[0,0]],x:3,y:8});
const center=[{kind:'C2',shape:rect(2,1),x:3,y:3},{kind:'C2',shape:rect(1,2),x:5,y:3},{kind:'C2',shape:rect(1,2),x:3,y:4},{kind:'C2',shape:rect(2,1),x:4,y:5},{kind:'C1',shape:[[0,0]],x:4,y:4}];
const results=process.env.DIVERSE?Array.from({length:16},(_,i)=>run('free randomized exact cover '+i,[],{flexible:true,seed:31751+i*333,maxMs:1500,maxNodes:300000,cap:1})):[run('x3 y0..8 stripe',strip),run('center 3x3 nine cells',center),run('free four domino covers and one single cover',[],{flexible:true,maxMs:10000,maxNodes:3000000,cap:20})];
for(const r of results)for(const s of r.solutions){assert.equal(s.blocks.length,12);assert.equal(s.covers.length,5);assert.equal(s.blocks.reduce((n,b)=>n+b.shape.length,0),67);const all=[...s.blocks,...s.covers].flatMap(p=>p.shape.map(([x,y])=>[x+p.x,y+p.y].join(',')));assert.equal(new Set(all).size,76);assert.deepEqual(all.sort(),board.map(p=>p.join(',')).sort());assert(s.blocks.every(p=>api.matchFormalBlockShape(p.shape,'native-only')?.quarterTurns===0));assert(s.independent.maximum>=6);}
const output=OUT+'/pack67-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify({board,bag,shapesSha256:digest(shapeKinds),scope:'Spatial only. All12 opening bodies min2x2 bounding box; 9hidden SINGLE stars occupy four2-cell and one1-cell true curtains, source five count12 retained. Six independent opening indices permit same-purple assignment. No route, difficulty, source acceptance or door placement certificate.',results},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,results:results.map(({solutions,...r})=>({...r,solutions:solutions.length,first:solutions[0]}))}));
