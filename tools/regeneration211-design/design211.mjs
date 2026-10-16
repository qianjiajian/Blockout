import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
const S=[[0,0]], V2=[[0,0],[0,1]], H3=[[0,0],[1,0],[2,0]], V3=[[0,0],[0,1],[0,2]], Q2=[[0,0],[1,0],[0,1],[1,1]], Q3=Array.from({length:9},(_,p)=>[p%3,Math.floor(p/3)]), L3=[[0,0],[0,1],[1,1]], L4=[[0,0],[1,0],[2,0],[0,1]], Z4=[[0,0],[1,0],[1,1],[2,1]];
const B=(id,color,x,y,shape,extra={})=>({id:`l211-${id}`,color,x,y,shape,...extra});
const G=(id,color,side,offset,size,frozen=0,star=false)=>({id:`l211-g-${id}`,color,side,offset,size,...(frozen?{frozen}:{}),...(star?{star:true}:{})});
export function source211(){return {id:211,name:'星门错位·211',mechanismRules:'revised-2026-09-27-v1.5',width:7,height:9,difficulty:'easy',timeSeconds:110,reward:200,parMoves:8,preservedMoveTarget:32,designTargets:{formulaVersion:'blockout-d1',minimumRepositionOverhead:5,calibratedDifficulty:0.8},gates:[G('red','red','top',2,3,1),G('green','green','left',0,2),G('blue','blue','left',2,3,7),G('orange-star','orange','left',5,2,10,true),G('green-star','green','left',7,2,8,true),G('purple','purple','right',0,2,3),G('yellow','yellow','right',2,1,3),G('pink','pink','right',4,3,8),G('blue-star','blue','right',7,2,9,true),G('orange','orange','bottom',2,3,8)],blocks:[
B('a','green',0,0,Q2),B('b','yellow',2,0,S),B('c','green',3,0,V2),B('d','purple',4,0,V2),B('e','yellow',5,0,S),B('f','red',6,0,S),B('g','red',2,1,S),B('h','purple',5,1,S),B('i','yellow',6,1,S),B('j','pink',0,2,V3),B('k','yellow',1,2,H3),B('l','blue',4,2,Q3,{movementAxis:'horizontal'}),B('m','green',1,3,Q2),B('n','purple',3,3,V2),
B('o','green',0,5,V2,{star:true}),B('p','orange',1,5,H3,{star:true}),B('q','blue',1,6,[[0,0],[1,0],[1,1]],{star:true}),B('r','yellow',3,6,S),B('s','purple',4,5,L4),B('t','orange',5,6,[[0,0],[1,0],[1,1]]),B('u','purple',0,7,Q2),B('v','red',2,7,[[1,0],[0,1],[1,1],[2,1]],{movementAxis:'vertical'}),B('w','green',4,7,Z4)]};}
function adjacentBad(blocks){const m=new Map();for(const b of blocks)for(const [dx,dy]of b.shape)m.set(`${b.x+dx},${b.y+dy}`,b);for(const [s,b]of m){const[x,y]=s.split(',').map(Number);for(const [dx,dy]of [[1,0],[0,1]]){const a=m.get(`${x+dx},${y+dy}`);if(a&&a.id!==b.id&&a.color===b.color)return true;}}return false;}
export function layouts(limit=100){
const base=source211();base.blocks.find(b=>b.id==='l211-h').color='red';const pieces=base.blocks.slice(14).map(b=>({...b,shape:b.id==='l211-q'||b.id==='l211-t'?L3:b.id==='l211-v'?Q2:b.shape}));
const full=(1n<<28n)-1n,poses=pieces.map(b=>{const out=[];for(let y=5;y<9;y++)for(let x=0;x<7;x++){if(b.movementAxis==='vertical'&&(x<2||x+Math.max(...b.shape.map(p=>p[0]))>4))continue;const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(cells.some(([a,c])=>a>=7||c>=9))continue;out.push({b:{...b,x,y},mask:cells.reduce((m,[a,c])=>m|(1n<<BigInt((c-5)*7+a)),0n)});}return out;});
const results=[];let visited=0;function rec(used,occ,blocks){if(results.length>=limit||visited++>2000000)return;if(occ===full){const all=[...base.blocks.slice(0,14),...blocks];if(!adjacentBad(all))results.push({...base,blocks:all});return;}let options;for(let cell=0;cell<28;cell++){if(occ&(1n<<BigInt(cell)))continue;const avail=[];for(let i=0;i<pieces.length;i++)if(!(used&(1<<i)))for(const p of poses[i])if((p.mask&(1n<<BigInt(cell)))&&!(p.mask&occ))avail.push({i,...p});if(!avail.length)return;if(!options||avail.length<options.length)options=avail;}options.sort((a,b)=>{const aa=pieces[a.i],bb=pieces[b.i];return(Math.abs(a.b.x-aa.x)+Math.abs(a.b.y-aa.y))-(Math.abs(b.b.x-bb.x)+Math.abs(b.b.y-bb.y));});for(const o of options){if(adjacentBad([...base.blocks.slice(0,14),...blocks,o.b]))continue;rec(used|(1<<o.i),occ|o.mask,[...blocks,o.b]);}}
rec(0,0n,[]);return results;
}
export function topLayouts(limit=60){
const maps=layouts(3),base=maps[2],fixed=base.blocks.filter(b=>b.id==='l211-l'||b.y>=5),pieces=base.blocks.filter(b=>b.y<5&&b.id!=='l211-l');pieces.find(b=>b.id==='l211-h').color='purple';
const full=(1n<<35n)-1n,initial=base.blocks.find(b=>b.id==='l211-l').shape.reduce((m,[x,y])=>m|(1n<<BigInt((y+2)*7+x+4)),0n),results=[];
let visited=0,seed=211;function rand(n){seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return(seed>>>0)%n;}
const poses=pieces.map(b=>{const out=[];for(let y=0;y<5;y++)for(let x=0;x<7;x++){const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(cells.some(([a,c])=>a>=7||c>=5))continue;const mask=cells.reduce((m,[a,c])=>m|(1n<<BigInt(c*7+a)),0n);if(mask&initial)continue;out.push({b:{...b,x,y},mask});}return out;});
function rec(used,occ,blocks){if(results.length>=limit||visited++>500000)return;if(occ===full){const all=[...fixed,...blocks];if(!adjacentBad(all))results.push({...base,blocks:all});return;}let options;for(let cell=0;cell<35;cell++){if(occ&(1n<<BigInt(cell)))continue;const avail=[];for(let i=0;i<pieces.length;i++)if(!(used&(1<<i)))for(const p of poses[i])if((p.mask&(1n<<BigInt(cell)))&&!(p.mask&occ))avail.push({i,...p});if(!avail.length)return;if(!options||avail.length<options.length)options=avail;}for(let j=options.length-1;j>0;j--){const k=rand(j+1);[options[j],options[k]]=[options[k],options[j]];}for(const o of options){if(adjacentBad([...fixed,...blocks,o.b]))continue;rec(used|(1<<o.i),occ|o.mask,[...blocks,o.b]);}}
rec(0,initial,[]);return results;
}
const OUT='deliverables/continue211-220-20260930/design-new';
if(process.argv[1]?.endsWith('design211.mjs')){
const api=await loadSpatialApi();const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';export {auditRevisedCandidate} from './src/core/revisedCandidateAudit.ts';export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});const core=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const maps=layouts(60),history=[];console.log('tilings',maps.length);fs.writeFileSync(`${OUT}/native-layouts211.json`,JSON.stringify(maps,null,2));
for(let n=0;n<maps.length;n++){
 const level=maps[n];let audit;try{audit=core.auditRevisedCandidate(level);}catch(e){console.log('invalid',e.message);continue;}
 const result=searchSpatial(level,api,{floor:11,normalize:true,maxMilliseconds:2000,maxStates:10000,maxTransitions:250000,diagnosticTrace:true,orderSeed:n});
 const replay=result.drags?core.replayRevisedRoute(level,result.drags):null;const entry={n,levelSha256:digest(level),result:{...result,drags:undefined,partialDrags:undefined,partialState:undefined},replay};history.push(entry);console.log(n,result.status,result.cost,result.maxClearsSeen,replay?.error);
 if(result.status==='witness'&&result.cost>=5&&replay?.valid&&replay.complete){const lower=searchSpatial(level,api,{floor:5,prove:true,maxMilliseconds:5000,maxStates:100000,maxTransitions:1500000});entry.lower=lower;fs.writeFileSync(`${OUT}/candidate211-${n}.json`,JSON.stringify({level,result,replay,lower,audit},null,2));console.log('LOWER',lower.status,lower.exploredStates);if(lower.thresholdProven)break;}
 fs.writeFileSync(`${OUT}/history211.json`,JSON.stringify(history,null,2));
}
fs.writeFileSync(`${OUT}/history211.json`,JSON.stringify(history,null,2));
}
