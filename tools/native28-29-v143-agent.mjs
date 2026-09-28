import fs from 'node:fs';
import assert from 'node:assert/strict';
import {ruleGate,loadApi,BASELINE,TARGET_IDS,TARGETS,auditCandidate,checkCandidate,writeNew} from './native-block-repair-v143.mjs';
import {compileLevel,stateFromSnapshot,forEachGesture,clearCount} from './remake21to30-mask-floor.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {checkSymmetryFloor,equivalentBlockGroups,canonicalStateKey,normalizeMonotoneClears} from './remake21to30-symmetry-floor-v139.mjs';
import {checkUniqueCurtainSumFloor} from './remake21to30-unique-suffix-v139.mjs';
import {digest} from './revised-preview-validation-v160.mjs';

ruleGate();
const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE));
const out='deliverables/native-block-repair-v143-20260924/agent28-29';
const mode=process.argv[2]??'build';
const ids=mode==='finalize'?[29]:process.argv.slice(3).map(Number);
const chosen=ids.length?ids:[28,29];
if(mode!=='weighted')assert(chosen.every(id=>[28,29].includes(id)));

function weightedRoute(level){
 const c=compileLevel(level),groups=equivalentBlockGroups(c),first=normalizeMonotoneClears(c,c.initial),
 key=s=>canonicalStateKey(s,groups),nodes=[{state:first.state,total:0,single:0,parent:-1,drags:first.drags}],
 seen=new Map([[key(first.state)+'|0',0]]),heap=[0],deadline=Date.now()+120000;
 const priority=i=>nodes[i].total*100+nodes[i].single;
 const push=i=>{heap.push(i);let j=heap.length-1;while(j){const p=(j-1)>>1;if(priority(heap[p])<=priority(i))break;heap[j]=heap[p];j=p;}heap[j]=i;};
 const pop=()=>{const best=heap[0],last=heap.pop();if(heap.length){let j=0;while(j*2+1<heap.length){let child=j*2+1;if(child+1<heap.length&&priority(heap[child+1])<priority(heap[child]))child++;if(priority(last)<=priority(heap[child]))break;heap[j]=heap[child];j=child;}heap[j]=last;}return best;};
 while(heap.length&&seen.size<2000000&&Date.now()<deadline){
  const index=pop(),node=nodes[index];
  if(seen.get(key(node.state)+'|'+node.single)!==node.total)continue;
  if(clearCount(c,node.state)===c.totalClears){if(node.total-node.single>node.single){const r=[];let i=index;while(i!==-1){r.push(nodes[i].drags);i=nodes[i].parent;}return {drags:r.reverse().flat(),states:seen.size,total:node.total,single:node.single};}continue;}
  forEachGesture(c,node.state,(block,value,cost,get)=>{
   const total=node.total+cost,single=node.single+(cost&&c.blocks[block].shape.length===1?1:0);
   if(total>15||single>7)return;
   const raw=node.state.slice();raw[block]=value;const forced=normalizeMonotoneClears(c,raw),k=key(forced.state)+'|'+single;
   if(seen.has(k)&&seen.get(k)<=total)return;
   seen.set(k,total);const child=nodes.length;nodes.push({state:forced.state,total,single,parent:index,drags:[get(),...forced.drags]});push(child);
  });
 }
 return {drags:[],states:seen.size,remaining:heap.length};
}

if(mode==='weighted'){
 const input=process.argv[3],data=JSON.parse(fs.readFileSync(input));
 const found=weightedRoute(data.level),file=`${out}/weighted29-${Date.now()}.json`;
 const replay=found.drags.length?api.replayRevisedRoute(data.level,found.drags):null;
 writeNew(file,{...data,...found,replay});console.log(JSON.stringify({file,states:found.states,total:found.total,single:found.single,replay}));process.exit();
}

function decisions(level,drags){
  const model=new api.PuzzleModel(structuredClone(level));model.startCountdown();
  const graph=compileLevel(level);
  for(let i=0;i<drags.length-1;i++){
    const snapshot=model.snapshot(),prefix=drags.slice(0,i),next=drags[i];
    const choices=[];
    forEachGesture(graph,stateFromSnapshot(graph,snapshot),(index,value,cost,get)=>{
      if(cost!==1)return;
      const body=graph.blocks[index];
      if(body.shape.length<2||body.id===next.blockId)return;
      choices.push(get());
    });
    for(const wrong of choices){
      const body=snapshot.blocks.find(b=>b.id===wrong.blockId);
      const wrongReplay=api.replayRevisedRoute(level,[...prefix,wrong]);
      if(!wrongReplay.valid||wrongReplay.clearEvents!==snapshot.cleared)continue;
      const blocked=api.replayRevisedRoute(level,[...prefix,wrong,next]);
      if(blocked.valid)continue;
      const recovery={blockId:wrong.blockId,path:[...wrong.path.slice(0,-1).reverse(),[body.x,body.y]]};
      const recovered=[...prefix,wrong,recovery,...drags.slice(i)];
      const check=api.replayRevisedRoute(level,recovered);
      if(!check.valid||!check.complete)continue;
      return [{atStep:i+1,beforeDrag:i+1,blockId:body.id,area:body.shape.length,correctDrag:next,
        legalWrongParking:wrong,blockedNextAction:next,recoveryDrag:recovery,fullRecoveredRoute:recovered,
        explanation:'将这件多格块临时停到通道会阻止既定下一次拖动；沿原路径退回后整关仍可完成。这是可核验局部空间取舍，不是全局死局或最优惩罚证明。'}];
    }
    model.beginAction();for(const p of next.path)assert(model.moveBlockStep(next.blockId,...p));
    if(next.exitSide)assert(model.tryExit(next.blockId,next.exitSide).ok);assert(model.commitAction());
  }
  throw Error('No valid multi-cell wrong-parking recovery found');
}

if(mode==='variants'){
 const source=JSON.parse(fs.readFileSync('.codex-temp/native-block-repair-v143-lv29-search.json'));
 for(const top of ['v2','h2'])for(const side of ['l3','v3'])for(const topColor of ['purple','yellow','blue','green'])for(const sideColor of ['purple','yellow','blue','green']){
   if(top==='h2'&&side==='v3'&&topColor==='purple'&&sideColor==='purple')continue;
   const level=structuredClone(source.level),get=s=>level.blocks.find(b=>b.id==='v143-29-'+s);
   if(top==='v2'){Object.assign(get('open-red-1-bar'),{x:1,y:1,shape:[[0,0],[0,1]]});Object.assign(get('open-red-1-single'),{x:2,y:1});}
   if(side==='l3'){Object.assign(get('open-red-2-bar'),{x:0,y:3,shape:[[0,0],[0,1],[1,1]]});Object.assign(get('open-red-2-single'),{x:0,y:5});}
   get('open-red-1-single').color=topColor;get('open-red-2-single').color=sideColor;
   const tag=[top,side,topColor,sideColor].join('-'),base=`${out}/variant29-${tag}-${Date.now()}`;
   let proof=checkSymmetryFloor(level,{floor:16,maxStates:200000,maxMilliseconds:15000});
   const replay=proof.relaxedRoute?api.replayRevisedRoute(level,proof.relaxedRoute):null;
   const measurement=replay?.valid&&replay?.complete?measureRoute(level,proof.relaxedRoute,api):null;
   writeNew(base+'.json',{level,drags:proof.relaxedRoute??[],proof,replay,measurement});
   console.log(JSON.stringify({tag,status:proof.status,cost:proof.relaxedNonClearingDrags,replay:replay?.valid,multi:measurement?.multiCellDrags,single:measurement?.singleCellDrags,file:base+'.json'}));
   if(replay?.valid&&replay?.complete&&replay.nonClearingDrags>=11&&replay.nonClearingDrags<=15&&measurement.multiCellDrags>measurement.singleCellDrags)break;
 }
 process.exit();
}

if(mode==='colored'){
 const source=JSON.parse(fs.readFileSync('.codex-temp/native-block-repair-v143-lv29-search.json'));
 for(const top of ['v2','h2'])for(const side of ['l3','v3'])for(const sideColor of ['blue','green','yellow','red'])for(const topColor of ['red','blue','green','yellow']){
   const level=structuredClone(source.level),get=s=>level.blocks.find(b=>b.id==='v143-29-'+s);
   if(top==='v2'){Object.assign(get('open-red-1-bar'),{x:1,y:1,shape:[[0,0],[0,1]]});Object.assign(get('open-red-1-single'),{x:2,y:1});}
   if(side==='l3'){Object.assign(get('open-red-2-bar'),{x:0,y:3,shape:[[0,0],[0,1],[1,1]]});Object.assign(get('open-red-2-single'),{x:0,y:5});}
   get('open-red-1-bar').color=topColor;get('open-red-1-single').color=topColor==='red'?'purple':'red';
   get('open-red-2-bar').color=sideColor;get('open-red-2-single').color=sideColor==='red'?'purple':'red';
   const tag=[top,side,topColor,sideColor].join('-'),base=`${out}/colored29-${tag}-${Date.now()}`;
   const found=weightedRoute(level),replay=found.drags.length?api.replayRevisedRoute(level,found.drags):null;
   writeNew(base+'.json',{level,...found,replay});
   console.log(JSON.stringify({tag,total:found.total,single:found.single,states:found.states,replay:replay?.valid,file:base+'.json'}));
   if(replay?.valid&&replay?.complete){console.log('FOUND');break;}
 }
 process.exit();
}

for(const id of chosen){
 const original=JSON.parse(fs.readFileSync(mode==='finalize'?process.argv[3]:`.codex-temp/native-block-repair-v143-lv${id}-search.json`));
 const data={ruleVersion:'1.43.0',seed:`native-q0-exact-footprint-${id}-20260924-${digest(original.level).slice(0,12)}`,createdAt:new Date().toISOString(),
  level:original.level,drags:original.drags,replacements:TARGET_IDS[id].map(source=>({sourceIds:[source],
    blockIds:original.level.blocks.filter(b=>b.id.startsWith(`v143-${id}-${source.replace(/^s\d+-/,'')}-`)).map(b=>b.id),
    reason:'仅原旋转块实际足迹用原朝向完整多格素材与独立单格分割填满；需要时换成已有出口色，位置/批次不外溢，其余所有块及机制保持。'})),
  design:{concreteDecision:id===28?'保留横帘和竖帘区域的开帘顺序与多格让路，在原隐藏L形足迹分割成独立整图块。':'开局原r1替换为黄V2加红S、原r2替换为蓝原向L3加红S，各自精确覆盖原足迹；黄V2与蓝L3需等待原20计数冰门并在狭窄左侧腾出清场通路。配合未变的卷帘和剥壳过程形成真实多格停车/让路；隐藏绿L4原足迹替绿V3加绿S。不是反复搬运来补数。',
    preserved:'第5关及其余195关未改；目标关仅12块授权中本代理负责6块原足迹，各门/帘/计数/评价完整保留。'},
  evidence:{source:mode==='finalize'?process.argv[3]:`.codex-temp/native-block-repair-v143-lv${id}-search.json`,
    sourceSha256:digest(fs.readFileSync(mode==='finalize'?process.argv[3]:`.codex-temp/native-block-repair-v143-lv${id}-search.json`)),
    baselineSha256:digest(fs.readFileSync(BASELINE)),construction:'tools/native28-29-v143-agent.mjs',constructionSha256:digest(fs.readFileSync('tools/native28-29-v143-agent.mjs'))}};
 const stamp=Date.now(),base=`${out}/lv${id}-${stamp}`;
 const audit=auditCandidate(data,baseline,api),measurement=measureRoute(data.level,data.drags,api);
 console.log(JSON.stringify({id,audit:audit.passed,measure:{...measurement,steps:undefined}}));
 if(mode==='build'||mode==='finalize'){
   data.decisionCases=decisions(data.level,data.drags);writeNew(base+'.json',data);
   console.log(JSON.stringify({candidate:base+'.json',decisions:data.decisionCases.length}));
   try{const checked=checkCandidate(data,baseline,api);writeNew(base+'-check.json',checked);console.log(JSON.stringify({id,passed:true,lower:checked.lowerBound,upper:checked.upperBound,report:base+'-check.json'}));}
   catch(error){writeNew(base+'-failure.json',{message:error.message,stack:error.stack});console.log(JSON.stringify({id,passed:false,error:error.message}));process.exitCode=1;}
 }else if(mode==='proof'){
   const budget={floor:TARGETS[id].min,maxStates:2000000,maxMilliseconds:180000};
   let proof=checkUniqueCurtainSumFloor(data.level,budget);if(proof.status==='unsupported')proof=checkSymmetryFloor(data.level,budget);
   writeNew(base+'-proof.json',proof);console.log(JSON.stringify({id,...proof,relaxedRoute:proof.relaxedRoute?`saved ${proof.relaxedRoute.length} actions`:undefined}));
 }else throw Error('Use build or proof');
}
