import test from 'node:test';
import assert from 'node:assert/strict';
import {loadAdvancedFloorApi} from './campaign31-200-advanced-floor-v145.mjs';
import {projectBombDeadlines,checkBombFloor} from './remake111to120-bomb-floor-v147.mjs';
import {compileLevel,forEachGesture,clearCount} from './remake21to30-mask-floor.mjs';
const api=await loadAdvancedFloorApi();
const fixture=()=>({id:120,name:'bomb projection qualification',mechanismRules:'revised-2026-09-23-v1.4',difficulty:'easy',width:3,height:2,timeSeconds:60,reward:20,
 gates:[{id:'r',color:'red',side:'left',offset:0,size:2},{id:'b',color:'blue',side:'right',offset:0,size:2,frozen:1}],
 blocks:[{id:'shell',color:'red',layers:['red','blue'],x:1,y:0,shape:[[0,0]],timedBombSeconds:15},{id:'plain',color:'red',x:1,y:1,shape:[[0,0]],timedBombSeconds:25}]});
function checkState(c,state,model){
 const s=model.snapshot();assert.equal(clearCount(c,state),s.cleared);
 for(let i=0;i<c.blocks.length;i++){
  const b=s.blocks.find(b=>b.id===c.blocks[i].id);if(state[i]===255){assert(!b);continue;}
  assert(b);assert.equal(b.x,state[i]%128%c.W);assert.equal(b.y,Math.floor((state[i]%128)/c.W));
  assert.deepEqual(b.layers,c.blocks[i].layers.slice(state[i]>>7));
 }
}
test('deadline projection preserves every field except bomb deadlines and leaves its input untouched',()=>{
 const level=fixture(),copy=structuredClone(level),p=projectBombDeadlines(level,api);
 assert.deepEqual(level,copy);assert.deepEqual(p.removed,[{id:'shell',seconds:15},{id:'plain',seconds:25}]);
 for(const b of copy.blocks)delete b.timedBombSeconds;assert.deepEqual(p.level,copy);
});
test('all finite relaxed gestures preserve original body, shell and ice transitions before expiry',t=>{
 const level=fixture(),p=projectBombDeadlines(level,api),c=compileLevel(p.level),start=new api.PuzzleModel(level);start.startCountdown();
 const key=s=>Buffer.from(s).toString('hex'),nodes=[{state:c.initial,model:start}],seen=new Set([key(c.initial)]);
 let edges=0,shellPeels=0;
 for(let at=0;at<nodes.length;at++){
  assert(nodes.length<3000,'The complete small graph must terminate');const {state,model}=nodes[at];checkState(c,state,model);
  forEachGesture(c,state,(i,value,cost,get)=>{
   const d=get(),next=state.slice(),m=model.clone(),before=m.snapshot();next[i]=value;m.beginAction();
   for(const [x,y]of d.path)assert(m.moveBlockStep(d.blockId,x,y));
   if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);
   assert(m.commitAction());const after=m.snapshot();assert.equal(cost,Number(after.cleared===before.cleared));checkState(c,next,m);edges++;
   if(d.blockId==='shell'&&after.blocks.some(b=>b.id==='shell'&&b.layers.length===1)){shellPeels++;assert.equal(after.blocks.find(b=>b.id==='shell').timedBombSeconds,undefined);}
   const k=key(next);if(!seen.has(k)){seen.add(k);nodes.push({state:next,model:m});}
  });
 }
 assert(nodes.length>10&&edges>20&&shellPeels>0);t.diagnostic(`${nodes.length} states / ${edges} gestures / ${shellPeels} shell observations`);
});
test('expiry excludes original traces but never excludes a projected move',()=>{
 const l=fixture(),p=projectBombDeadlines(l,api),source=new api.PuzzleModel(l),relaxed=new api.PuzzleModel(p.level);
 source.startCountdown();relaxed.startCountdown();source.tick(16);relaxed.tick(16);
 assert(source.snapshot().failed);assert(!relaxed.snapshot().failed);
 relaxed.beginAction();assert(relaxed.moveBlockStep('shell',0,0));assert(relaxed.tryExit('shell','left').ok);assert(relaxed.commitAction());
});
test('unsupported mechanisms and interrupted proofs cannot pass',()=>{
 const star=fixture();star.blocks[0].star=true;star.gates[0].star=true;assert.equal(checkBombFloor(star,api).status,'unsupported');
 const r=checkBombFloor(fixture(),api,{floor:1,maxStates:1,maxMilliseconds:1000});assert(!r.thresholdProven);
});
