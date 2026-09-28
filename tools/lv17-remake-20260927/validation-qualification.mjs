import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,clearCount} from '../remake21to30-mask-floor.mjs';
import {equivalentBlockGroups,normalizeMonotoneClears} from '../remake21to30-symmetry-floor-v139.mjs';

const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.85.0');
const {api,inputs}=await loadApi(),dir='deliverables/lv17-remake-20260927',out=`${dir}/validation-qualification-${Date.now()}.json`;
const sourceFile=`${dir}/source-ledger.json`,source=JSON.parse(fs.readFileSync(sourceFile)),key=s=>JSON.stringify(s);
const bindings=Object.fromEntries([...inputs,sourceFile,'tools/lv17-remake-20260927/validation-qualification.mjs','tools/remake21to30-mask-floor.mjs','tools/remake21to30-symmetry-floor-v139.mjs','tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.85.0.md'].map(p=>[p,digest(fs.readFileSync(p))]));
const report={generatedAt:new Date().toISOString(),status:'running',ruleVersion:lock.activeVersion,bindings,scope:'Five source shell pairs/shapes, seven body-ice attachments including ice19 H3 shells, exact gate8/16/21/26 countdown, full-width exits and identity classes. Sparse fixtures qualify transition semantics, not playable candidate levels.',nativePlainSolverUsed:false,fixtures:[],narrowGates:[]};
// Enumerate gestures from the authoritative model without consulting any mask
// pose/move/exit tables; compare the complete cost-labelled outgoing edge sets.
function modelEdges(model,c,onlyId){
 const initial=model.snapshot(),edges=new Map();
 for(const body of initial.blocks){
  if(onlyId&&body.id!==onlyId)continue;
  const paths=[[]],seen=new Set([`${body.x},${body.y}`]);
  for(let at=0;at<paths.length;at++){
   const path=paths[at],held=model.clone();held.beginAction();for(const p of path)assert(held.moveBlockStep(body.id,...p));
   const b=held.snapshot().blocks.find(x=>x.id===body.id);
   if(path.length){
    const move=model.clone();move.beginAction();for(const p of path)assert(move.moveBlockStep(body.id,...p));assert(move.commitAction());edges.set(`${1}:${key(stateFromSnapshot(c,move.snapshot()))}`,move);
   }
   for(const side of ['left','right','top','bottom']){
    const exiting=model.clone();exiting.beginAction();for(const p of path)assert(exiting.moveBlockStep(body.id,...p));
    if(exiting.tryExit(body.id,side).ok){assert(exiting.commitAction());const after=exiting.snapshot();assert.equal(after.cleared,initial.cleared+1);edges.set(`${0}:${key(stateFromSnapshot(c,after))}`,exiting);}
   }
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){
    const x=b.x+dx,y=b.y+dy,k=`${x},${y}`;if(seen.has(k))continue;
    const trial=model.clone();trial.beginAction();for(const p of path)assert(trial.moveBlockStep(body.id,...p));
    if(trial.moveBlockStep(body.id,x,y)){seen.add(k);paths.push([...path,[x,y]]);}
   }
  }
 }
 return edges;
}
try{
 for(const shell of source.blocks.filter(b=>b.layers?.length===2)){
  const [outer,inner]=shell.layers,others=['yellow','pink','green','red','blue'].filter(c=>c!==outer&&c!==inner),shape=shell.shape,w=1+Math.max(...shape.map(p=>p[0]));
  const level={id:17,name:'qualification-only',difficulty:'normal',timeSeconds:135,reward:70,mechanismRules:'revised-2026-09-23-v1.4',width:4,height:5,
   blocks:[{id:'shell',x:0,y:0,shape,color:outer,layers:[outer,inner]}],gates:[
    {id:'outer',side:'top',offset:0,size:w,color:outer},
    {id:'inner',side:'bottom',offset:0,size:w,color:inner,frozen:1},
    {id:'ice2',side:'left',offset:0,size:2,color:others[0],frozen:2},
    {id:'ice3',side:'right',offset:0,size:2,color:others[1],frozen:3},
    {id:'ice5',side:'right',offset:2,size:2,color:others[2],frozen:5}]};
  const c=compileLevel(level),model=new api.PuzzleModel(level);model.startCountdown();const nodes=[model],seen=new Set([key(c.initial)]);let transitions=0,peels=0,removals=0;
  assert.equal(normalizeMonotoneClears(c,c.initial).drags.length,0,'Do not automatically force peel');
  for(let at=0;at<nodes.length;at++){
   assert(nodes.length<1000);const current=nodes[at],snapshot=current.snapshot(),state=stateFromSnapshot(c,snapshot),actual=modelEdges(current,c),expected=new Set();
   assert.equal(clearCount(c,state),snapshot.cleared);
   forEachGesture(c,state,(i,v,cost)=>{const next=state.slice();next[i]=v;expected.add(`${cost}:${key(next)}`);});
   assert.deepEqual([...actual.keys()].sort(),[...expected].sort(),'Complete cost-labelled outgoing model/mask edge set');
   for(const [edge,nextModel]of actual){
    transitions++;const after=nextModel.snapshot(),n=stateFromSnapshot(c,after),nk=key(n);
    for(const gate of after.gates)assert.equal(gate.frozen??0,Math.max(0,(level.gates.find(g=>g.id===gate.id).frozen??0)-after.cleared));
    if(edge.startsWith('0:')){
     const retained=after.blocks[0];
     if(retained){peels++;assert.equal(after.blocks.length,snapshot.blocks.length);assert.equal(retained.id,'shell');assert.deepEqual(retained.shape,shape);assert.deepEqual(retained.layers,[inner]);assert.equal(retained.color,inner);assert.equal(n[0]>>7,1);}
     else {removals++;assert.equal(n[0],255);assert.equal(after.cleared,2);}
    }
    if(!seen.has(nk)){seen.add(nk);nodes.push(nextModel);}
   }
  }
  assert(peels&&removals);report.fixtures.push({sourceId:shell.id,sourceInitialIce:shell.frozen??0,scope:"Complete thawed-stage graph; initial ice covered by real-event threshold fixtures",layers:[outer,inner],level,states:seen.size,transitions,peelEdges:peels,bodyRemovalEdges:removals,completeOutgoingGraphEquality:true});
 }
 // Real events—not restored/forged clear counts—take each source frozen body
 // across its exact threshold. A genuine SQ2 peel is the threshold event.
 report.iceThresholdFixtures=[];
 for(const frozenBody of source.blocks.filter(b=>b.frozen)){
  const target={id:'target',x:0,y:0,color:frozenBody.color,shape:frozenBody.shape,frozen:frozenBody.frozen,...(frozenBody.layers?{layers:frozenBody.layers}:{})};
  const openers=Array.from({length:26},(_,i)=>({id:'opener-'+i,x:8-i%9,y:7-Math.floor(i/9),color:'yellow',shape:[[0,0]]}));
  const level={id:17,name:'real-countdown-fixture',difficulty:'normal',timeSeconds:135,reward:70,mechanismRules:'revised-2026-09-23-v1.4',width:12,height:8,blocks:[target,{id:'trigger',x:10,y:0,color:'yellow',layers:['yellow','green'],shape:[[0,0],[1,0],[0,1],[1,1]]},...openers],gates:[
   {id:'yellow',color:'yellow',side:'bottom',offset:9,size:3},
   {id:'blue',color:'blue',side:'right',offset:0,size:2,frozen:8},
   {id:'red',color:'red',side:'top',offset:0,size:3,frozen:16},
   {id:'pink',color:'pink',side:'left',offset:0,size:2,frozen:21},
   {id:'green',color:'green',side:'top',offset:6,size:3,frozen:26}]};
  const c=compileLevel(level);let m=new api.PuzzleModel(level);m.startCountdown();const evidence={sourceId:frozenBody.id,sourceShape:frozenBody.shape,sourceLayers:frozenBody.layers??[frozenBody.color],sourceIce:frozenBody.frozen,level,events:[]};
  const compareTarget=()=>{
   const state=stateFromSnapshot(c,m.snapshot()),actual=modelEdges(m,c,'target'),expected=new Set();
   forEachGesture(c,state,(i,v,cost)=>{if(i===0){const next=state.slice();next[i]=v;expected.add(cost+':'+key(next));}});
   assert.deepEqual([...actual.keys()].sort(),[...expected].sort());return {actual,edgeCount:actual.size};
  };
  const record=(id,before)=>{
   const after=m.snapshot(),prior=stateFromSnapshot(c,before),next=stateFromSnapshot(c,after),bi=c.blocks.findIndex(b=>b.id===id);let included=false;
   forEachGesture(c,prior,(i,v,cost)=>{if(i===bi&&v===next[bi]&&cost===0)included=true;});assert(included);assert.equal(after.cleared,before.cleared+1);assert.equal(clearCount(c,next),after.cleared);
   for(const gate of after.gates)assert.equal(gate.frozen??0,Math.max(0,(level.gates.find(g=>g.id===gate.id).frozen??0)-after.cleared));
   for(const body of after.blocks)assert.equal(body.frozen??0,Math.max(0,(level.blocks.find(b=>b.id===body.id).frozen??0)-after.cleared));
   evidence.events.push({id,cleared:after.cleared,retained:after.blocks.some(b=>b.id===id),targetIce:after.blocks.find(b=>b.id==='target')?.frozen??0,gateIce:after.gates.map(g=>({color:g.color,ice:g.frozen??0}))});
  };
  const action=(id,path,side)=>{const before=m.snapshot();m.beginAction();for(const p of path)assert(m.moveBlockStep(id,...p));assert(m.tryExit(id,side).ok);assert(m.commitAction());record(id,before);};
  const clearOpener=i=>{const b=m.snapshot().blocks.find(b=>b.id==='opener-'+i),path=[];for(let x=b.x+1;x<=9;x++)path.push([x,b.y]);for(let y=b.y+1;y<=7;y++)path.push([9,y]);action(b.id,path,'bottom');};
  assert.equal(compareTarget().edgeCount,0);
  for(let i=0;i<frozenBody.frozen-1;i++)clearOpener(i);
  assert.equal(m.snapshot().blocks.find(b=>b.id==='target').frozen,1);assert.equal(compareTarget().edgeCount,0);
  const blocked=m.clone();blocked.beginAction();assert.equal(blocked.moveBlockStep('target',1,0),false);
  action('trigger',Array.from({length:6},(_,i)=>[10,i+1]),'bottom');
  assert.equal(m.snapshot().cleared,frozenBody.frozen);assert.equal(m.snapshot().blocks.find(b=>b.id==='target').frozen,0);
  const thawed=compareTarget();assert(thawed.edgeCount>0);const movable=m.clone();movable.beginAction();assert(movable.moveBlockStep('target',1,0));
  evidence.threshold={beforeIce:1,afterIce:0,event:'SQ2-peel',beforeTargetEdges:0,afterTargetEdges:thawed.edgeCount};
  for(let i=frozenBody.frozen-1;i<26;i++)clearOpener(i);
  assert.equal(m.snapshot().cleared,27);assert(m.snapshot().gates.every(g=>!g.frozen));
  // The trigger's green core still occupies the bottom exit approach; clear it
  // through its real gate before asking the target core for a complete route.
  const triggerInitial=m.snapshot(),triggerExits=[...modelEdges(m,c,'trigger').entries()].filter(([e])=>e.startsWith('0:'));assert(triggerExits.length);m=triggerExits[0][1];record('trigger',triggerInitial);
  if(frozenBody.layers){
   const initial=m.snapshot(),exits=[...compareTarget().actual.entries()].filter(([e])=>e.startsWith('0:'));assert(exits.length);
   m=exits[0][1];record('target',initial);const retained=m.snapshot().blocks.find(b=>b.id==='target');
   assert(retained);assert.deepEqual(retained.shape,frozenBody.shape);assert.deepEqual(retained.layers,[frozenBody.layers[1]]);assert.equal(stateFromSnapshot(c,m.snapshot())[0]>>7,1);
   const coreInitial=m.snapshot(),coreExits=[...compareTarget().actual.entries()].filter(([e])=>e.startsWith('0:'));assert(coreExits.length);m=coreExits[0][1];record('target',coreInitial);assert(!m.snapshot().blocks.some(b=>b.id==='target'));evidence.frozenShellThawPeelRemove=true;
  }
  report.iceThresholdFixtures.push(evidence);
 }
 // Full bounding cross-section for every source shape, both exit orientations.
 const shapes=new Map(source.blocks.map(b=>[key(b.shape),b.shape]));
 for(const shape of shapes.values())for(const side of ['left','right','top','bottom']){
  const w=1+Math.max(...shape.map(p=>p[0])),h=1+Math.max(...shape.map(p=>p[1])),span=['top','bottom'].includes(side)?w:h;
  for(const size of [...new Set([Math.max(1,span-1),span])]){
   const width=Math.max(2,w),height=Math.max(2,h),x=side==='right'?width-w:0,y=side==='bottom'?height-h:0;
   const level={id:17,name:'full-width-gate-fixture',difficulty:'normal',timeSeconds:135,reward:70,mechanismRules:'revised-2026-09-23-v1.4',width,height,blocks:[{id:'q',x,y,color:'yellow',shape}],gates:[{id:'g',color:'yellow',side,offset:0,size}]};
   const c=compileLevel(level),m=new api.PuzzleModel(level);m.beginAction();const actual=m.tryExit('q',side).ok;let masked=false;forEachGesture(c,c.initial,(_i,_v,cost)=>{if(cost===0)masked=true;});assert.equal(actual,size>=span);assert.equal(masked,actual);report.narrowGates.push({shape,side,size,requiredSpan:span,actual,mask:masked});
  }
 }
 const h3=[[0,0],[1,0],[2,0]],identity={id:17,name:'identity-qualification',difficulty:'normal',timeSeconds:135,reward:70,mechanismRules:'revised-2026-09-23-v1.4',width:6,height:6,blocks:[
  {id:'a18',x:0,y:0,color:'pink',frozen:18,shape:h3},{id:'b18',x:3,y:0,color:'pink',frozen:18,shape:h3},
  {id:'c19',x:0,y:1,color:'pink',frozen:19,shape:h3},{id:'shell19',x:0,y:2,color:'pink',layers:['pink','yellow'],frozen:19,shape:h3},
  {id:'otherCore19',x:0,y:3,color:'pink',layers:['pink','blue'],frozen:19,shape:h3}],gates:[
  {id:'p',color:'pink',side:'left',offset:0,size:3,frozen:21},{id:'y',color:'yellow',side:'right',offset:0,size:3},{id:'b',color:'blue',side:'bottom',offset:0,size:3,frozen:8}]};
 assert.deepEqual(equivalentBlockGroups(compileLevel(identity)),[[0,1]],'Ice18/19 and different complete shell pairs are distinct identity classes');report.shellPairIdentityIsolation=true;report.distinctInitialIceIdentityIsolation=true;
 const testFiles=['tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs'],tests=spawnSync(process.execPath,['--test',...testFiles],{encoding:'utf8',timeout:60000});report.genericQualifications={testFiles,exitCode:tests.status,stdout:tests.stdout,stderr:tests.stderr};assert.equal(tests.status,0);
 report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
fs.writeFileSync(out,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({out,status:report.status,fixtures:report.fixtures.length,error:report.error}));


