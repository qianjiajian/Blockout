import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {loadApi} from '../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {compileLevel,forEachGesture,stateFromSnapshot,clearCount,stateKey} from '../remake21to30-mask-floor.mjs';
import {equivalentBlockGroups,canonicalStateKey,normalizeMonotoneClears} from '../remake21to30-symmetry-floor-v139.mjs';
import {SOURCE,WRAPPER,payload,nativeFloor} from './validation-native-wrapper.mjs';
import {payload as designerPayload} from './design-native.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.85.0');
const {api,inputs}=await loadApi(),dir='deliverables/lv17-remake-20260927',file=process.argv[2],out=dir+'/validation-native-qualification-'+Date.now()+'.json';
const qualificationFile=dir+'/'+fs.readdirSync(dir).filter(f=>/^validation-qualification-\d+\.json$/.test(f)).sort().at(-1),q=JSON.parse(fs.readFileSync(qualificationFile));assert.equal(q.status,'PASS');
const bindings=Object.fromEntries([...inputs,qualificationFile,SOURCE,WRAPPER,'tools/lv17-remake-20260927/validation-native-qualification.mjs','tools/lv17-remake-20260927/design-native.mjs','tools/remake21to30-mask-floor.mjs','tools/remake21to30-symmetry-floor-v139.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.85.0.md',...(file?[file]:[])].map(p=>[p,digest(fs.readFileSync(p))]));
for(const[p,h]of Object.entries(q.bindings))assert.equal(digest(fs.readFileSync(p)),h,'Fresh authoritative qualification binding: '+p);
const report={status:'running',generatedAt:new Date().toISOString(),ruleVersion:lock.activeVersion,bindings,authoritativeQualification:qualificationFile,scope:'Exact implementation comparison, not a level floor result. Same current mask compiler; native final-removal normalization and identity quotient, no forced peels. Native terminal prune checked against small complete distances.',fixtures:[],iceFixtures:[],gateWidthCases:[],candidate:null};
const key=s=>JSON.stringify(s),text=s=>Buffer.from(s).toString('base64');
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
function nativeCompare(level,states){
 const c=compileLevel(level),groups=equivalentBlockGroups(c),canonical=s=>Buffer.from(canonicalStateKey(s,groups),'latin1').toString('base64'),native=nativeFloor(level,{successorsOnly:true,states,maxMilliseconds:30000,maxStates:50000});assert.equal(native.rows.length,states.length);
 assert.deepEqual(payload(level,{floor:11,maxStates:100000,maxMilliseconds:10000}),designerPayload(level,{floor:11,maxStates:100000,maxMilliseconds:10000}),'Independent and design wrappers emit identical full payload');
 let edgeCount=0;for(const [i,s]of states.entries()){
  const n=normalizeMonotoneClears(c,s).state,row=native.rows[i],expected=new Set();
  forEachGesture(c,s,(bi,v,cost)=>{const next=s.slice();next[bi]=v;expected.add(cost+':'+canonical(normalizeMonotoneClears(c,next).state));});
  assert.equal(row.state,text(s));assert.equal(row.normalized,text(n));assert.equal(row.canonical,canonical(n));assert.deepEqual([...row.successors].sort(),[...expected].sort(),'Every normalized native successor agrees');edgeCount+=expected.size;
 }
 return {states:states.length,normalizedEdges:edgeCount,fullNativeNormalizedSuccessorEquality:true,input:native.input,output:native.output,inputSha256:native.inputSha256,exeHash:native.exeHash,sourceHash:native.sourceHash,wrapperHash:native.wrapperHash};
}
function completeModelGraph(level){
 const c=compileLevel(level),start=new api.PuzzleModel(level);start.startCountdown();const models=[start],states=[c.initial],index=new Map([[stateKey(c.initial),0]]),reverse=[[]];let transitions=0;
 for(let i=0;i<models.length;i++){
  assert(models.length<2000,'Finite fixture cap, no truncation permitted');const actual=modelEdges(models[i],c),expected=new Set();
  forEachGesture(c,states[i],(bi,v,cost)=>{const s=states[i].slice();s[bi]=v;expected.add(cost+':'+key(s));});
  assert.deepEqual([...actual.keys()].sort(),[...expected].sort(),'Authoritative full outgoing graph versus raw mask');
  for(const[e,m]of actual){const state=stateFromSnapshot(c,m.snapshot()),k=stateKey(state);let j=index.get(k);if(j===undefined){j=models.length;index.set(k,j);models.push(m);states.push(state);reverse.push([]);}reverse[j].push([i,Number(e[0])]);transitions++;}
 }
 const d=states.map(s=>clearCount(c,s)===c.totalClears?0:Infinity),pending=d.flatMap((v,i)=>v===0?[[i,0]]:[]);
 while(pending.length){pending.sort((a,b)=>b[1]-a[1]);const[i,cost]=pending.pop();if(d[i]!==cost)continue;for(const[j,e]of reverse[i])if(cost+e<d[j]){d[j]=cost+e;pending.push([j,d[j]]);}}
 for(const[i,s]of states.entries())assert.equal(d[i],d[index.get(stateKey(normalizeMonotoneClears(c,s).state))],'Final-only normalization preserves every exact distance');
 const native=nativeCompare(level,states),thresholds=[];
 for(let floor=1;floor<=4;floor++){const result=nativeFloor(level,{floor,maxStates:50000,maxMilliseconds:10000});assert.notEqual(result.status,'unknown');assert.equal(result.thresholdProven,d[0]>=floor);if(!result.thresholdProven)assert.equal(result.relaxedNonClearingDrags,d[0]);thresholds.push({floor,status:result.status,thresholdProven:result.thresholdProven,cost:result.relaxedNonClearingDrags});}
 return {...native,authoritativeTransitions:transitions,everyStateNormalizationPreservesOptimum:true,exactInitialCost:Number.isFinite(d[0])?d[0]:null,thresholds};
}
try{
 for(const fixture of q.fixtures)report.fixtures.push({sourceId:fixture.sourceId,layers:fixture.layers,shape:fixture.level.blocks[0].shape,...completeModelGraph(fixture.level)});
 const parking={id:17,name:'two-parking-fixture',difficulty:'normal',reward:0,timeSeconds:135,mechanismRules:'revised-2026-09-23-v1.4',width:3,height:3,gates:[{id:'gate-r',color:'red',side:'bottom',offset:0,size:2},{id:'gate-b',color:'blue',side:'left',offset:1,size:1,frozen:1},{id:'gate-g',color:'green',side:'right',offset:1,size:1,frozen:1}],blocks:[{id:'carrier',color:'red',x:0,y:0,shape:[[0,0],[1,0]]},{id:'a',color:'blue',x:0,y:2,shape:[[0,0]]},{id:'b',color:'green',x:1,y:2,shape:[[0,0]]}]};
 report.fixtures.push({name:'positive-optimum-two-parking',...completeModelGraph(parking)});assert.equal(report.fixtures.at(-1).exactInitialCost,2);
 const dead=structuredClone(q.fixtures[0].level);dead.blocks[0].frozen=1;report.fixtures.push({name:'initial-frozen-shell-no-opening-events',...completeModelGraph(dead)});assert.equal(report.fixtures.at(-1).exactInitialCost,null);
 for(const fixture of q.iceThresholdFixtures){
  const level=fixture.level,c=compileLevel(level);let m=new api.PuzzleModel(level);m.startCountdown();const states=[c.initial],events=[];
  const capture=()=>states.push(stateFromSnapshot(c,m.snapshot()));
  const action=(id,path,side)=>{const before=m.snapshot();m.beginAction();for(const p of path)assert(m.moveBlockStep(id,...p));assert(m.tryExit(id,side).ok);assert(m.commitAction());assert.equal(m.snapshot().cleared,before.cleared+1);capture();events.push({id,cleared:m.snapshot().cleared});};
  const clearOpener=i=>{const b=m.snapshot().blocks.find(b=>b.id==='opener-'+i),path=[];for(let x=b.x+1;x<=9;x++)path.push([x,b.y]);for(let y=b.y+1;y<=7;y++)path.push([9,y]);action(b.id,path,'bottom');};
  const sourceIce=fixture.sourceIce;for(let i=0;i<sourceIce-1;i++)clearOpener(i);assert.equal(m.snapshot().blocks[0].frozen,1);
  action('trigger',Array.from({length:6},(_,i)=>[10,i+1]),'bottom');assert.equal(m.snapshot().blocks[0].frozen,0);
  for(let i=sourceIce-1;i<26;i++)clearOpener(i);
  // Deterministic mask witness is executed by the real model, never assigned.
  const exitId=id=>{const before=m.snapshot(),s=stateFromSnapshot(c,before),bi=c.blocks.findIndex(b=>b.id===id);let drag;forEachGesture(c,s,(i,v,cost,get)=>{if(i===bi&&cost===0){drag=get();return false;}});assert(drag);action(id,drag.path,drag.exitSide);};
  exitId('trigger');if(fixture.sourceLayers.length===2){exitId('target');assert.deepEqual(m.snapshot().blocks.find(b=>b.id==='target').layers,[fixture.sourceLayers[1]]);exitId('target');}
  const selected=states.filter(s=>{const clear=clearCount(c,s);return [0,sourceIce-1,sourceIce,21,26,27,28,29,30].includes(clear);});
  report.iceFixtures.push({sourceId:fixture.sourceId,sourceIce,sourceLayers:fixture.sourceLayers,actualEvents:events,...nativeCompare(level,selected)});
 }
 for(const g of q.narrowGates){
  const w=1+Math.max(...g.shape.map(p=>p[0])),h=1+Math.max(...g.shape.map(p=>p[1])),width=Math.max(2,w),height=Math.max(2,h),x=g.side==='right'?width-w:0,y=g.side==='bottom'?height-h:0;
  const level={id:17,name:'width-native',difficulty:'normal',reward:0,timeSeconds:135,mechanismRules:'revised-2026-09-23-v1.4',width,height,blocks:[{id:'q',x,y,color:'yellow',shape:g.shape}],gates:[{id:'g',color:'yellow',side:g.side,offset:0,size:g.size}]};
  report.gateWidthCases.push({...g,...nativeCompare(level,[compileLevel(level).initial])});
 }
 if(file){
  const data=JSON.parse(fs.readFileSync(file)),level=data.level,drags=data.drags??data.route??data.result?.drags,c=compileLevel(level),m=new api.PuzzleModel(level);m.startCountdown();const states=[c.initial];
  for(const drag of drags){m.beginAction();for(const p of drag.path)assert(m.moveBlockStep(drag.blockId,...p));if(drag.exitSide)assert(m.tryExit(drag.blockId,drag.exitSide).ok);assert(m.commitAction());states.push(stateFromSnapshot(c,m.snapshot()));}assert(m.snapshot().complete);assert.equal(m.snapshot().cleared,31);
  report.candidate={file,levelSha256:digest(level),routeSha256:digest(drags),...nativeCompare(level,states)};
 }
 const limited=nativeFloor(parking,{floor:3,maxStates:1,maxMilliseconds:1000});assert.equal(limited.status,'unknown');assert.equal(limited.thresholdProven,false);report.budgetExhaustionNeverProven=true;
 const unsupported=structuredClone(parking);unsupported.width=10;unsupported.height=10;assert.equal(nativeFloor(unsupported).status,'unsupported');report.unsupportedNeverProven=true;
 report.drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);assert.deepEqual(report.drift,[]);report.status='PASS';
}catch(e){report.status='FAIL';report.error=String(e.stack??e).replace(/data:text\/javascript;base64,[\w+/=]+/g,'in-memory-current-core');process.exitCode=1;}
fs.writeFileSync(out,JSON.stringify(report,null,2),{flag:'wx'});console.log(JSON.stringify({out,status:report.status,fixtures:report.fixtures.length,ice:report.iceFixtures.length,gates:report.gateWidthCases.length,error:report.error}));

