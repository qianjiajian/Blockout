import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadApi,replay} from '../replay.mjs';
import {ruleGate,digest,writeNew,auditSpatial} from '../common.mjs';
const {api,inputs}=await loadApi(),lock=ruleGate();
const file=process.argv[2]??'deliverables/remake182-185-20260927/author182/candidate182-1790523365429.json',d=JSON.parse(fs.readFileSync(file));
const budget={floor:16,goalClears:4,maxStates:10000,maxMilliseconds:55000};
const bindingPaths=[...inputs,file,'tools/remake182-185-20260927/review/model-floor182.mjs'];
const bindings=Object.fromEntries(bindingPaths.map(p=>[p,digest(fs.readFileSync(p))]));
const spatial=auditSpatial(d.level,api);assert.equal(d.level.id,182);
assert.equal(d.level.blocks.length,27);assert.equal(d.level.blocks.filter(b=>!b.shutterId).length,9);
assert.deepEqual(d.level.shutters.map(s=>s.count).sort((a,b)=>a-b),[4,10,10,10,10,10]);
assert.equal(d.level.blocks.filter(b=>b.layers?.length===2).length,1);
const ice=d.level.blocks.filter(b=>b.frozen);assert.equal(ice.length,1);assert.equal(ice[0].frozen,22);
assert(d.level.shutters.find(s=>s.id===ice[0].shutterId).count===4);
assert(!d.level.flipDoors?.length&&!d.level.generators?.length&&!d.level.elevators?.length&&!d.level.coloredGrids?.length);
assert(d.level.blocks.filter(b=>!b.shutterId).every(b=>!b.layers&&!b.frozen&&!b.movementAxis&&!b.keyId&&!b.lockedBy&&!b.star&&!b.timedBombSeconds));
const reportReplay=replay(d.level,d.drags,api,{complete:true});assert(reportReplay.nonClearingDrags<=20);
const start=new api.PuzzleModel(d.level);start.startCountdown();
const key=m=>JSON.stringify(m.snapshot().blocks.map(b=>[b.id,b.x,b.y,b.layers,b.frozen]));
const nodes=[{model:start,cost:0}],seen=new Map([[key(start),0]]),queues=Array.from({length:16},()=>[]);queues[0].push(0);
let explored=0,edges=0,unitSteps=0,maxClears=0,shortcut=null,stop=null;const begin=Date.now();
search:for(let cost=0;cost<16;cost++)for(let qi=0;qi<queues[cost].length;qi++){
 if(Date.now()-begin>budget.maxMilliseconds){stop='deadline';break search;}
 const n=nodes[queues[cost][qi]],model=n.model;if(seen.get(key(model))!==cost)continue;
 explored++;const snap=model.snapshot();maxClears=Math.max(maxClears,snap.cleared);
 if(snap.cleared>=4){shortcut=cost;break search;}
 assert(snap.shutters.every(s=>!s.revealed));
 const accept=(child,edge)=>{
  edges++;const nc=cost+edge;if(nc>=16)return;
  const k=key(child),old=seen.get(k);if(old!==undefined&&old<=nc)return;
  if(nodes.length>=budget.maxStates){stop='max-states';return;}
  seen.set(k,nc);nodes.push({model:child,cost:nc});queues[nc].push(nodes.length-1);
 };
 for(const b of snap.blocks){
  if(!model.isBlockActive(model.getBlock(b.id)))continue;
  const poses=[{x:b.x,y:b.y,path:[]}],positions=new Set([b.x+','+b.y]);
  for(let at=0;at<poses.length;at++){
   const pose=poses[at],walk=()=>{const m=model.clone();m.beginAction();for(const xy of pose.path)assert(m.moveBlockStep(b.id,...xy));return m;},held=walk();
   if(pose.path.length){const m=walk();assert(m.commitAction());assert.equal(m.snapshot().cleared,snap.cleared);accept(m,1);}
   for(const side of ['top','right','bottom','left']){const m=walk();if(m.tryExit(b.id,side).ok){assert(m.commitAction());assert.equal(m.snapshot().cleared,snap.cleared+1);accept(m,0);}}
   for(const[dx,dy]of[[0,-1],[1,0],[0,1],[-1,0]]){const x=pose.x+dx,y=pose.y+dy,k=x+','+y;if(positions.has(k))continue;const m=held.clone();if(!m.moveBlockStep(b.id,x,y))continue;unitSteps++;positions.add(k);poses.push({x,y,path:[...pose.path,[x,y]]});}
   if(stop)break;
  }
  if(stop)break;
 }
 if(stop)break;
}
const proof={status:stop?'UNKNOWN':shortcut!==null?'SHORTCUT':'THRESHOLD_PROVEN',floor:16,goalClears:4,shortcut,stop,explored,states:seen.size,edges,unitSteps,maxClears,milliseconds:Date.now()-begin,budget};
for(const[p,sha]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(p)),sha,'source drift '+p);
const out='deliverables/remake182-185-20260927/review/model-floor182-'+Date.now()+'.json';
writeNew(out,{createdAt:new Date().toISOString(),activeRuleVersion:lock.activeVersion,levelSha256:digest(d.level),file,bindings,proof,spatialPassed:spatial.passed,replay:reportReplay,scope:'Current PuzzleModel complete optional-contact gesture graph for this candidate before first curtain reveal; exact full swept exit validation. No normalization or identity quotient; all27 bodies retained. Optional contact adds legal choices relative to GUI forced contact and cannot increase cost. Cost0 for final removal,1 for effective nonclear held drag. Natural time constraints omitted only to relax; no flips/bombs/queues/lifts active in prefix.',formalAdopted:false,pointerValidated:false});
console.log(JSON.stringify({out,...proof}));
assert.equal(proof.status,'THRESHOLD_PROVEN');
