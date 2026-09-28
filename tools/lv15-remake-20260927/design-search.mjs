import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {checkSymmetryFloor} from '../remake21to30-symmetry-floor-v139.mjs';
import {loadPreviewCore,digest} from '../revised-preview-validation-v160.mjs';

const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.83.0');
const sourcePath='deliverables/lv15-remake-20260927/source-ledger.json';
const source=JSON.parse(fs.readFileSync(sourcePath,'utf8'));
const baseline=JSON.parse(fs.readFileSync('deliverables/lv15-remake-20260927/baseline.json','utf8')).level;
assert.equal(source.blocks.length,10);
const root=`deliverables/lv15-remake-20260927/design-search-${Date.now()}`;fs.mkdirSync(root,{recursive:true});
let seed=Number(process.argv[2]??15830);const limit=Number(process.argv[3]??50);
const rnd=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
const pick=a=>a[Math.floor(rnd()*a.length)];
const shuffled=a=>{a=[...a];for(let i=a.length-1;i;i--){const j=Math.floor(rnd()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
const macro=['0110','1111','0110','0110'],slots=macro.flatMap((row,y)=>[...row].flatMap((v,x)=>v==='1'?[[x*2,y*2]]:[]));
const playable=slots.flatMap(([x,y])=>[[x,y],[x+1,y],[x,y+1],[x+1,y+1]]),cells=new Set(playable.map(p=>p.join(',')));
const adjacency=slots.map(([x,y],i)=>slots.flatMap(([xx,yy],j)=>j!==i&&Math.abs(x-xx)+Math.abs(y-yy)===2?[j]:[]));
const gateOptions=[];
for(const side of ['top','bottom','left','right'])for(let offset=0;offset<=6;offset+=2){
 const mouth=Array.from({length:2},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,7]:side==='left'?[0,offset+i]:[7,offset+i]);
 if(mouth.every(p=>cells.has(p.join(','))))gateOptions.push({side,offset,size:2});
}
function make(){
 const colors=Array(10),remaining={yellow:2,pink:2,red:2,blue:2,green:2};
 const order=shuffled(slots.map((_,i)=>i)).sort((a,b)=>adjacency[b].length-adjacency[a].length);
 function assign(n){if(n===10)return true;const i=order[n];for(const color of shuffled(Object.keys(remaining))){
  if(!remaining[color]||adjacency[i].some(j=>colors[j]===color))continue;
  colors[i]=color;remaining[color]--;if(assign(n+1))return true;remaining[color]++;colors[i]=undefined;
 }return false;}assert(assign(0));
 const pools=Object.fromEntries(Object.keys(remaining).map(color=>[color,shuffled(source.blocks.filter(b=>b.color===color))]));
 const blocks=slots.map(([x,y],i)=>{const b=pools[colors[i]].pop();assert(b);return{id:'lv15-'+b.id.replace(/^source15-/,''),x,y,color:b.color,shape:b.shape,...(b.layers?.length>1?{layers:b.layers}:{})};});
 const touches=(b,g)=>g.side==='top'?b.y===0&&b.x===g.offset:g.side==='bottom'?b.y===6&&b.x===g.offset:g.side==='left'?b.x===0&&b.y===g.offset:b.x===6&&b.y===g.offset;
 const yellowOptions=gateOptions.filter(g=>blocks.some(b=>b.color==='yellow'&&touches(b,g)));if(!yellowOptions.length)return null;
 const gates=[{...pick(yellowOptions),id:'lv15-gate-yellow',color:'yellow'}];
 for(const[color,frozen]of shuffled([['pink',2],['green',3],['red',5],['blue',6]])){
  const available=gateOptions.filter(g=>!gates.some(o=>o.side===g.side&&o.offset===g.offset));if(!available.length)return null;
  gates.push({...pick(available),id:'lv15-gate-'+color,color,frozen});
 }
 return{id:15,name:baseline.name,difficulty:'easy',timeSeconds:baseline.timeSeconds,reward:baseline.reward,parMoves:baseline.parMoves,
  preservedMoveTarget:34,featureIntro:baseline.featureIntro,width:8,height:8,playable,blocked:[],seams:[],mechanismRules:'revised-2026-09-23-v1.4',blocks,gates};
}
const {api}=await loadPreviewCore(),rows=[];let solved=0,unknown=0,below=0;
for(let i=0;i<limit;i++){
 const seedBefore=seed,level=make();if(!level){i--;continue;}
 const search=checkSymmetryFloor(level,{floor:11,maxStates:180000,maxMilliseconds:650});
 const drags=search.relaxedRoute??[],replay=drags.length?api.replayRevisedRoute(level,drags):null,cost=search.relaxedNonClearingDrags??null;
 const file=path.join(root,`attempt-${i}.json`);fs.writeFileSync(file,JSON.stringify({seedBefore,seedAfter:seed,level,levelSha256:digest(level),search,drags,replay},null,2));
 rows.push({i,file,status:search.status,cost,replay});if(search.status==='unknown')unknown++;if(replay?.valid&&replay.complete)solved++;
 if(cost!==null&&cost<5)below++;
 if(replay?.valid&&replay.complete&&cost>=5&&cost<=10){
  assert.equal(replay.clearEvents,15);assert.equal(replay.effectiveDrags,15+cost);
  const final=path.join(root,`route-${i}.json`);fs.writeFileSync(final,JSON.stringify({source:file,level,drags,search,replay},null,2));
  fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({ruleVersion:lock.activeVersion,rows,solved,unknown,below,selected:final},null,2));
  console.log(JSON.stringify({root,selected:final,cost,totalDrags:replay.effectiveDrags,status:'WITNESS_NEEDS_FRESH_PROOF'}));process.exit(0);
 }
 if(i%10===9){fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({rows,solved,unknown,below},null,2));console.log(JSON.stringify({i,solved,unknown,below}));}
}
fs.writeFileSync(path.join(root,'report.json'),JSON.stringify({rows,solved,unknown,below},null,2));console.log(JSON.stringify({root,solved,unknown,below,status:'BOUNDED_BATCH_COMPLETE'}));
