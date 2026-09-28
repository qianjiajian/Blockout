import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {loadPreviewCore,digest} from '../revised-preview-validation-v160.mjs';

const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.84.0');
const sourceFile='deliverables/lv16-remake-20260927/source-ledger.json';
const source=JSON.parse(fs.readFileSync(sourceFile,'utf8'));
const baseline=JSON.parse(fs.readFileSync('deliverables/lv16-remake-20260927/baseline.json','utf8')).level;
assert.equal(source.blocks.length,21);assert.equal(source.blocks.reduce((n,b)=>n+b.shape.length,0),27);
const root=`deliverables/lv16-remake-20260927/design-search-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
let seed=Number(process.argv[2]??16840);const limit=Number(process.argv[3]??80),budget=Number(process.argv[4]??500);
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffled=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const W=5,H=7,widths=[3,3,5,5,5,3,3];
const playable=widths.flatMap((w,y)=>Array.from({length:w},(_,i)=>[(W-w)/2+i,y]));
const cellSet=new Set(playable.map(p=>p.join(','))),V3=source.blocks.filter(b=>b.shape.length===3),singles=source.blocks.filter(b=>b.shape.length===1);
const longPoses=playable.filter(([x,y])=>[0,1,2].every(d=>cellSet.has(`${x},${y+d}`)));
const gateOptions=(color)=>{
 const out=[];const needsV3=['red','yellow'].includes(color);
 for(const side of ['top','bottom','left','right']){
  const size=needsV3&&['left','right'].includes(side)?3:1;
  for(let offset=0;offset+size<=(['top','bottom'].includes(side)?W:H);offset++){
   const cells=Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,H-1]:side==='left'?[0,offset+i]:[W-1,offset+i]);
   if(cells.every(p=>cellSet.has(p.join(','))))out.push({side,offset,size});
  }
 }return out;
};
const allGateOptions=Object.fromEntries(['blue','cyan','yellow','red','purple'].map(c=>[c,gateOptions(c)]));
const overlap=(a,b)=>a.side===b.side&&a.offset<b.offset+b.size&&b.offset<a.offset+a.size;
function make(){
 const bars=[];const occupied=new Set();
 for(const original of shuffled(V3)){
  const options=longPoses.filter(([x,y])=>[0,1,2].every(d=>!occupied.has(`${x},${y+d}`)));
  if(!options.length)return null;const[x,y]=pick(options),b={id:'lv16-'+original.id.replace(/^source16-/,''),x,y,color:original.color,shape:original.shape,...(original.layers?.length===2?{layers:original.layers}:{})};
  bars.push(b);for(let d=0;d<3;d++)occupied.add(`${x},${y+d}`);
 }
 const barOwner=new Map();for(const b of bars)for(const[dx,dy]of b.shape)barOwner.set(`${b.x+dx},${b.y+dy}`,b);
 for(const[k,b]of barOwner){const[x,y]=k.split(',').map(Number);for(const p of [[x+1,y],[x,y+1]]){const o=barOwner.get(p.join(','));if(o&&o!==b&&o.color===b.color)return null;}}
 const slots=playable.filter(p=>!occupied.has(p.join(','))),colors=Array(slots.length),remaining={};
 for(const b of singles)remaining[b.color]=(remaining[b.color]??0)+1;
 const adjacent=slots.map(([x,y],i)=>slots.flatMap(([xx,yy],j)=>i!==j&&Math.abs(x-xx)+Math.abs(y-yy)===1?[j]:[]));
 const forbidden=slots.map(([x,y])=>new Set([[x+1,y],[x-1,y],[x,y+1],[x,y-1]].flatMap(p=>barOwner.has(p.join(','))?[barOwner.get(p.join(',')).color]:[])));
 let choices=0;
 function colorize(n){
  if(n===slots.length)return true;if(++choices>12000)return false;
  const eligible=slots.map((_,i)=>i).filter(i=>colors[i]===undefined);
  const options=i=>Object.keys(remaining).filter(c=>remaining[c]>0&&!forbidden[i].has(c)&&!adjacent[i].some(j=>colors[j]===c));
  eligible.sort((a,b)=>options(a).length-options(b).length||adjacent[b].length-adjacent[a].length);
  const i=eligible[0];for(const c of shuffled(options(i))){colors[i]=c;remaining[c]--;if(colorize(n+1))return true;remaining[c]++;colors[i]=undefined;}return false;
 }
 if(!colorize(0))return null;
 const pools=Object.fromEntries(Object.keys(remaining).map(c=>[c,shuffled(singles.filter(b=>b.color===c))]));
 const blocks=[...bars,...slots.map(([x,y],i)=>{const b=pools[colors[i]].pop();return{id:'lv16-'+b.id.replace(/^source16-/,''),x,y,color:b.color,shape:b.shape};})];
 const touches=(b,g)=>g.side==='top'?b.y===0&&b.x>=g.offset&&b.x<g.offset+g.size:g.side==='bottom'?b.y===H-1&&b.x>=g.offset&&b.x<g.offset+g.size:g.side==='left'?b.x===0&&b.y>=g.offset&&b.y<g.offset+g.size:b.x===W-1&&b.y>=g.offset&&b.y<g.offset+g.size;
 const blueOptions=allGateOptions.blue.filter(g=>blocks.some(b=>b.color==='blue'&&touches(b,g)));if(!blueOptions.length)return null;
 const gates=[{...pick(blueOptions),id:'lv16-gate-blue',color:'blue'}];
 for(const[color,frozen]of shuffled([['cyan',3],['yellow',8],['red',12],['purple',15]])){
  const options=allGateOptions[color].filter(g=>!gates.some(o=>overlap(g,o)));if(!options.length)return null;
  gates.push({...pick(options),id:'lv16-gate-'+color,color,frozen});
 }
 return{id:16,name:baseline.name,difficulty:'normal',timeSeconds:180,reward:65,parMoves:50,preservedMoveTarget:50,
  width:W,height:H,playable,blocked:[],seams:[],mechanismRules:'revised-2026-09-23-v1.4',blocks,gates};
}
const {api}=await loadPreviewCore(),rows=[];let solved=0,unknown=0,below=0,made=0,best=null;
function output(selected){fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({ruleVersion:lock.activeVersion,sourceFile,sourceSha256:digest(fs.readFileSync(sourceFile)),rows,solved,unknown,below,made,best,selected},null,2));}
for(let i=0;i<limit;i++){
 let level,attempts=0,seedBefore;do{seedBefore=seed;level=make();}while(!level&&++attempts<1000);if(!level){rows.push({i,status:'GENERATION_BUDGET'});continue;}made++;
 const search=checkSymmetryFloor(level,{floor:16,maxStates:180000,maxMilliseconds:budget});
 const drags=search.relaxedRoute??[],replay=drags.length?api.replayRevisedRoute(level,drags):null,cost=search.relaxedNonClearingDrags??null;
 const kinds={multiCell:0,singleCell:0,perBlock:{}};
 if(replay?.valid&&replay.complete){for(const d of drags)if(!d.exitSide){const b=level.blocks.find(b=>b.id===d.blockId);kinds[b.shape.length>1?'multiCell':'singleCell']++;kinds.perBlock[b.id]=(kinds.perBlock[b.id]??0)+1;}}
 const file=path.join(root,`attempt-${i}.json`);fs.writeFileSync(file,JSON.stringify({seedBefore,seedAfter:seed,level,levelSha256:digest(level),search,drags,replay,kinds},null,2));
 rows.push({i,file,status:search.status,explored:search.exploredStates,discovered:search.discoveredStates,cost,replay,kinds});if(search.status==='unknown')unknown++;
 if(replay?.valid&&replay.complete){solved++;if(!best||cost>best.cost)best={cost,file,kinds};if(cost<11)below++;}
 if(replay?.valid&&replay.complete&&cost>=11&&cost<=15){
  assert.equal(replay.clearEvents,22);assert.equal(replay.effectiveDrags,22+cost);
  const final=path.join(root,`route-${i}.json`);fs.writeFileSync(final,JSON.stringify({source:file,level,drags,search,replay,kinds},null,2));output(final);
  console.log(JSON.stringify({root,selected:final,cost,totalDrags:replay.effectiveDrags,kinds,status:'WITNESS_NEEDS_FRESH_PROOF'}));process.exit(0);
 }
 if(i%10===9){output();console.log(JSON.stringify({i,solved,unknown,below,best}));}
}
output();console.log(JSON.stringify({root,solved,unknown,below,best,status:'BOUNDED_BATCH_COMPLETE'}));
