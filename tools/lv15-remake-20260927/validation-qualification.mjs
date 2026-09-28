import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,clearCount} from '../remake21to30-mask-floor.mjs';
import {equivalentBlockGroups,normalizeMonotoneClears} from '../remake21to30-symmetry-floor-v139.mjs';

const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.83.0');
const {api,inputs}=await loadApi(),dir='deliverables/lv15-remake-20260927',out=`${dir}/validation-qualification-${Date.now()}.json`;
const sourceFile=`${dir}/source-ledger.json`,source=JSON.parse(fs.readFileSync(sourceFile)),SQ2=[[0,0],[1,0],[0,1],[1,1]],key=s=>JSON.stringify(s);
const bindings=Object.fromEntries([...inputs,sourceFile,'tools/lv15-remake-20260927/validation-qualification.mjs','tools/remake21to30-mask-floor.mjs','tools/remake21to30-symmetry-floor-v139.mjs','tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.83.0.md'].map(p=>[p,digest(fs.readFileSync(p))]));
const report={generatedAt:new Date().toISOString(),status:'running',ruleVersion:lock.activeVersion,bindings,scope:'Five source shell pairs, original SQ2 occupancy, full-width exits, peel cost0 and gate countdowns. Sparse fixtures are qualification, not new playable levels.',nativePlainSolverUsed:false,fixtures:[],narrowGates:[]};
// Enumerate gestures from the authoritative model without consulting any mask
// pose/move/exit tables; compare the complete cost-labelled outgoing edge sets.
function modelEdges(model,c){
 const initial=model.snapshot(),edges=new Map();
 for(const body of initial.blocks){
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
  const [outer,inner]=shell.layers,others=['yellow','pink','green','red','blue'].filter(c=>c!==outer&&c!==inner);
  const level={id:15,name:'qualification-only',difficulty:'easy',timeSeconds:120,reward:60,mechanismRules:'revised-2026-09-23-v1.4',width:4,height:4,
   blocks:[{id:'shell',x:0,y:0,shape:SQ2,color:outer,layers:[outer,inner]}],gates:[
    {id:'outer',side:'top',offset:0,size:2,color:outer},
    {id:'inner',side:'bottom',offset:0,size:2,color:inner,frozen:1},
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
     if(retained){peels++;assert.equal(after.blocks.length,snapshot.blocks.length);assert.equal(retained.id,'shell');assert.deepEqual(retained.shape,SQ2);assert.deepEqual(retained.layers,[inner]);assert.equal(retained.color,inner);assert.equal(n[0]>>7,1);}
     else {removals++;assert.equal(n[0],255);assert.equal(after.cleared,2);}
    }
    if(!seen.has(nk)){seen.add(nk);nodes.push(nextModel);}
   }
  }
  assert(peels&&removals);report.fixtures.push({layers:[outer,inner],level,states:seen.size,transitions,peelEdges:peels,bodyRemovalEdges:removals,completeOutgoingGraphEquality:true});
 }
 for(const side of ['top','right','bottom','left'])for(const size of [1,2]){
  const opposite={top:'bottom',bottom:'top',left:'right',right:'left'}[side];
  const level={id:15,name:'gate-qualification',difficulty:'easy',reward:60,timeSeconds:120,mechanismRules:'revised-2026-09-23-v1.4',width:2,height:2,blocks:[{id:'q',x:0,y:0,color:'pink',layers:['pink','blue'],shape:SQ2}],gates:[{id:'g',color:'pink',side,offset:0,size},{id:'inner',color:'blue',side:opposite,offset:0,size:2}]};
  const c=compileLevel(level),m=new api.PuzzleModel(level);m.beginAction();const actual=m.tryExit('q',side).ok;let masked=false;forEachGesture(c,c.initial,(_i,_v,cost)=>{if(cost===0)masked=true;});assert.equal(actual,size===2);assert.equal(masked,actual);report.narrowGates.push({side,size,actual,mask:masked});
 }
 const inventory={id:15,name:'identity-qualification',difficulty:'easy',timeSeconds:120,reward:60,mechanismRules:'revised-2026-09-23-v1.4',width:10,height:2,blocks:source.blocks.filter(b=>b.layers).map((b,i)=>({id:b.id,color:b.color,layers:b.layers,shape:SQ2,x:i*2,y:0})),gates:['yellow','pink','green','red','blue'].map((color,i)=>({id:color,color,side:'top',offset:i*2,size:2}))};
 assert.deepEqual(equivalentBlockGroups(compileLevel(inventory)),[],'Blue->red and blue->pink cannot share a symmetry class');report.shellPairIdentityIsolation=true;
 const testFiles=['tools/remake21to30-mask-floor.test.mjs','tools/remake21to30-symmetry-floor-v139.test.mjs'],tests=spawnSync(process.execPath,['--test',...testFiles],{encoding:'utf8',timeout:60000});report.genericQualifications={testFiles,exitCode:tests.status,stdout:tests.stdout,stderr:tests.stderr};assert.equal(tests.status,0);
 report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
fs.writeFileSync(out,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({out,status:report.status,fixtures:report.fixtures.length,error:report.error}));
