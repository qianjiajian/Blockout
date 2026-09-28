import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSpatialApi,compileSpatial,each,key,assertStateMatches,searchSpatial,NONE,active,occupied,cleared,visible} from './remake111to120-spatial-floor-v147.mjs';
const api=await loadSpatialApi();
function fixture(lift=false){return {id:111,name:'mixed star qualification',mechanismRules:'revised-2026-09-23-v1.4',difficulty:'normal',width:3,height:2,timeSeconds:60,reward:20,
 gates:[{id:'r',color:'red',side:'left',offset:0,size:2},{id:'rs',color:'red',side:'top',offset:0,size:3,star:true},{id:'bs',color:'blue',side:'right',offset:0,size:2,star:true,frozen:1},{id:'y',color:'yellow',side:'bottom',offset:0,size:3}],
 shutters:[{id:'cover',x:1,y:1,width:1,height:1,count:lift?0:1,...(lift?{skin:'lift'}:{})}],
 blocks:[{id:'shell',color:'red',layers:['red','blue'],star:true,x:1,y:lift?1:0,shape:[[0,0]]},
 {id:'key',color:'yellow',keyId:'key-a',x:0,y:0,shape:[[0,0]],movementAxis:'vertical'},
 {id:'lock',color:'blue',lockedBy:'key-a',lockCount:1,x:2,y:1,shape:[[0,0]]},
 {id:'hidden',color:'red',star:true,shutterId:'cover',frozen:1,x:1,y:1,shape:[[0,0]]}]};}

test('complete mixed star/shell/key/axis/countdown/lift graphs match every model gesture and legal unit input',t=>{
 let states=0,edges=0,units=0,starRejections=0,plainStarExits=0,liftReveals=0;
 for(const isLift of [false,true]){
  const level=fixture(isLift),c=compileSpatial(level,api),base=new api.PuzzleModel(level);base.startCountdown();
  const nodes=[{s:c.initial,model:base}],seen=new Set([key(c.initial)]);
  for(let at=0;at<nodes.length;at++){
   assert(nodes.length<20000,'Finite fixture must be fully explored');
   const {s,model}=nodes[at],snapshot=model.snapshot();assertStateMatches(c,s,snapshot);states++;
   for(let i=0;i<c.N;i++)if(s[i]!==NONE){const b=snapshot.blocks.find(b=>b.id===c.blocks[i].id);assert.equal(!b.shutterId||snapshot.shutters.find(co=>co.id===b.shutterId).revealed,visible(c,s,i));}
   each(c,s,(next,cost,get)=>{
    const d=get(),m=model.clone(),before=m.snapshot();m.beginAction();
    for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));
    if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());
    assert.equal(cost,Number(m.snapshot().cleared===before.cleared));assertStateMatches(c,next,m.snapshot());edges++;
    if(d.blockId==='lock'&&d.exitSide==='right')plainStarExits++;
    if(isLift&&!before.shutters[0].revealed&&m.snapshot().shutters[0].revealed)liftReveals++;
    const k=key(next);if(!seen.has(k)){seen.add(k);nodes.push({s:next,model:m});}
   });
   for(let i=0;i<c.N;i++){
    if(s[i]===NONE)continue;const b=c.blocks[i],p=s[i]&127,stage=s[i]>>>7,pose=b.poses[p],occ=occupied(c,s,i);
    for(const[dx,dy]of [[0,-1],[1,0],[0,1],[-1,0]]){
     const x=p%c.W+dx,y=Math.floor(p/c.W)+dy,to=y*c.W+x;
     const expected=active(c,s,i)&&x>=0&&x<c.W&&y>=0&&y<c.H&&pose.neighbors.includes(to)&&!b.poses[to].mask.some((v,j)=>v&occ[j]);
     const m=model.clone();m.beginAction();assert.equal(m.moveBlockStep(b.id,x,y),!!expected);units++;
    }
    for(const side of ['top','right','bottom','left']){
     const expected=active(c,s,i)&&pose.exits[stage].some(ex=>ex.side===side&&cleared(c,s)>=(ex.gate.frozen??0));
     const m=model.clone();m.beginAction();assert.equal(m.tryExit(b.id,side).ok,!!expected);
     if(b.star&&side==='left'&&p%c.W===0){assert(!expected);starRejections++;}
    }
   }
  }
 }
 assert(states>100&&edges>1000&&starRejections&&plainStarExits&&liftReveals);
 t.diagnostic(`${states} states / ${edges} gestures / ${units} unit probes / ${liftReveals} lift reveals`);
});
test('unsupported fields, budget exhaustion and unqualified normalization do not certify bounds',()=>{
 for(const extra of [{timedBombSeconds:10},{rotationBadge:true},{unknownRule:true}]){
  const l=fixture();Object.assign(l.blocks[0],extra);assert.equal(searchSpatial(l,api,{prove:true,floor:11}).status,'unsupported');
 }
 assert.throws(()=>searchSpatial(fixture(),api,{prove:true,floor:11,normalize:true}),/normalization/);
 const r=searchSpatial(fixture(),api,{prove:true,floor:11,maxStates:1});assert.equal(r.status,'unknown');assert.equal(r.thresholdProven,false);
});
