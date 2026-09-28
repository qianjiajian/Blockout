import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSpatialApi,compileSpatial,each,key,assertStateMatches,searchSpatial,NONE,active,occupied,cleared} from './remake91to100-star-floor.mjs';
const api=await loadSpatialApi();
const fixture=()=>({id:100,name:'star qualification',mechanismRules:'revised-2026-09-23-v1.4',difficulty:'easy',width:3,height:2,timeSeconds:60,reward:20,
 gates:[{id:'r',color:'red',side:'left',offset:0,size:2},{id:'rs',color:'red',side:'right',offset:0,size:2,star:true,frozen:1},{id:'b',color:'blue',side:'top',offset:0,size:3}],
 blocks:[{id:'plain',color:'red',x:0,y:0,shape:[[0,0]]},{id:'star',color:'red',x:1,y:1,shape:[[0,0]],star:true},{id:'blue',color:'blue',x:2,y:0,shape:[[0,0]]}]});

test('complete small star graphs agree with PuzzleModel for every held gesture, unit step and exit',t=>{
 let states=0,edges=0,plainStarExits=0,starOrdinaryRejected=0;
 const variants=[fixture(),fixture()];delete variants[1].gates[1].frozen;
 variants[1].blocks[2].shape=[[0,0],[0,1]];
 for(const level of variants){
  const c=compileSpatial(level,api),base=new api.PuzzleModel(level);base.startCountdown();
  const nodes=[{s:c.initial,model:base}],seen=new Set([key(c.initial)]);
  for(let at=0;at<nodes.length;at++){
   assert(nodes.length<10000,'All fixture states must finish');const {s,model}=nodes[at];assertStateMatches(c,s,model.snapshot());states++;
   each(c,s,(next,cost,get)=>{const d=get(),m=model.clone(),before=m.snapshot();m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());assert.equal(cost,Number(m.snapshot().cleared===before.cleared));assertStateMatches(c,next,m.snapshot());edges++;if(d.blockId==='plain'&&d.exitSide==='right')plainStarExits++;const k=key(next);if(!seen.has(k)){seen.add(k);nodes.push({s:next,model:m});}});
   for(let i=0;i<c.N;i++){
    if(s[i]===NONE)continue;const b=c.blocks[i],p=s[i]&127,stage=s[i]>>>7,pose=b.poses[p],occ=occupied(c,s,i);
    for(const[dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){const x=p%c.W+dx,y=Math.floor(p/c.W)+dy,to=y*c.W+x,expected=active(c,s,i)&&x>=0&&x<c.W&&y>=0&&y<c.H&&pose.neighbors.includes(to)&&!b.poses[to].mask.some((v,j)=>v&occ[j]),m=model.clone();m.beginAction();assert.equal(m.moveBlockStep(b.id,x,y),!!expected);}
    for(const side of ['top','right','bottom','left']){const expected=active(c,s,i)&&pose.exits[stage].some(ex=>ex.side===side&&cleared(c,s)>=(ex.gate.frozen??0)),m=model.clone();m.beginAction();assert.equal(m.tryExit(b.id,side).ok,!!expected);if(b.star&&side==='left'&&p%c.W===0){assert.equal(expected,false);starOrdinaryRejected++;}}
   }
  }
 }
 assert(states>100&&edges>1000&&plainStarExits>0&&starOrdinaryRejected>0);t.diagnostic(`${states} states; ${edges} gestures; ${plainStarExits} ordinary-to-star exits; ${starOrdinaryRejected} star-to-ordinary rejects`);
});
test('monotone clear normalization preserves each finite fixture minimum',()=>{
 for(const ice of [undefined,1,2]){const l=fixture();l.gates[1].frozen=ice;const a=searchSpatial(l,api,{prove:true,floor:4,normalize:false,maxStates:20000,maxMilliseconds:10000}),b=searchSpatial(l,api,{prove:true,floor:4,normalize:true,maxStates:20000,maxMilliseconds:10000});assert.notEqual(a.status,'unknown');assert.equal(a.status,b.status);assert.equal(a.cost,b.cost);}
});
test('unsupported inventory mechanics refuse certification and interrupted searches stay unknown',()=>{
 for(const field of ['movementAxis','keyId','lockedBy','timedBombSeconds','layers','shutterId']){const l=fixture();l.blocks[0][field]=field==='layers'?['red','blue']:field==='timedBombSeconds'?10:'unsupported';assert.equal(searchSpatial(l,api,{prove:true,floor:1}).status,'unsupported');}
 const r=searchSpatial(fixture(),api,{prove:true,floor:3,normalize:false,maxStates:1});assert.equal(r.status,'unknown');assert.equal(r.thresholdProven,false);
});
