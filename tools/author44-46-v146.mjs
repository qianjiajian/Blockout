import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate,proveFloor,auditCandidate,checkCandidate} from './remake41to50-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {SHAPES,rect,pack,seededRng} from '../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {search,compile,each} from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
const ROOT='deliverables/remake41-50-v146-20260924/agent44-46';fs.mkdirSync(ROOT,{recursive:true});
ruleGate();const {api}=await loadApi(),base=JSON.parse(fs.readFileSync('deliverables/remake41-50-v146-20260924/baseline.json'));
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
const item=(n,kind,color,coreColor)=>({sourceId:'45-o'+n,kind,color,...(coreColor?{coreColor,extra_layers:1}:{}),stage_id:'opening'});
const source45Items=[item(1,'SQ2','pink'),item(2,'V3','purple'),item(3,'L3','red'),item(4,'L3','blue'),item(5,'SQ2','yellow'),item(6,'H2','green'),item(7,'SQ2','green'),item(8,'V2','red'),item(9,'H2','pink'),item(10,'SQ2','blue','purple'),item(11,'SQ2','pink','green'),item(12,'V2','yellow'),item(13,'H2','red'),item(14,'H2','red'),item(15,'SINGLE','purple'),item(16,'H2','yellow')];
const gates45=[['red',0],['yellow',1],['purple',3],['blue',3],['green',10],['pink',12]].map(([color,frozen])=>({sourceId:'45-g-'+color,color,frozen}));
const [mode,arg]=process.argv.slice(2);
const write=(name,d)=>{const p=ROOT+'/'+name;fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n');return p;};
if(mode==='source45'){
 const frames=[336,340,350,368,390].map(n=>`.codex-temp/video-audit-41-70/frames-41-50/frame-0${n}.jpg`),truth='deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';
 const review={ruleVersion:'1.46.0',activeRuleVersion:'1.47.0',truth:{path:truth,sha256:digest(fs.readFileSync(truth))},levels:[{level:45,stableOpeningEvidence:frames[0],source_review_status:'fresh-video-reviewed',evidence:frames.map(path=>({path,sha256:digest(fs.readFileSync(path))})),observations:['336秒首稳定开局逐块核16件，44占格；蓝壳紫芯、粉壳绿芯，368秒蓝壳已剥可见紫芯，390秒显示粉/绿门对应12/10初值。','保留正式41可玩格轮廓，比源色块实际44格少3；后续候选必须明确必要形状适配，源事实不修改。'],unknowns:[],mechanisms:{gates:{items:gates45},shells:{items:source45Items.filter(x=>x.coreColor)},numeric_ice:{items:[]},covers:{items:[]},generators:{items:[]}},stage_seeds:[{id:'opening',kind:'opening',count:16,shape_histogram:{SQ2:5,V3:1,L3:2,H2:5,V2:2,SINGLE:1},items:source45Items}]}]};
 console.log(write('source-review.json',review));
}else if(mode==='generate45'){
 const rng=seededRng(Number(process.env.SEED??146450)),old=base.levels[44],deadline=Date.now()+Number(process.env.SECONDS??240)*1000;
 let attempts=0,valid=0,solved=0;const diagnostics={};
 const fail=k=>diagnostics[k]=(diagnostics[k]??0)+1;
 while(Date.now()<deadline){attempts++;
  const specs=structuredClone(source45Items),changed=[1,5,7][Math.floor(rng.rand()*3)];specs.find(s=>s.sourceId==='45-o'+changed).kind='SINGLE';
  const packed=pack(specs,old.level.playable,rng,12000,true);if(!packed){fail('pack');continue;}
  const level=structuredClone(old.level);level.difficulty='hard';level.preservedMoveTarget=old.starTargets.moveTarget;delete level.shutters;delete level.generators;
  level.blocks=packed.map(b=>({id:'v146-'+b.sourceId,x:b.x,y:b.y,shape:b.shape,color:b.color,...(b.coreColor?{layers:[b.color,b.coreColor]}:{})}));level.gates=[];
  const used=new Set(),cells=new Set(level.playable.map(p=>p.join(',')));let ok=true;
  for(const g of rng.shuffle([...gates45])){const options=[];
   for(const side of ['top','right','bottom','left'])for(const size of [2,3])for(let offset=0;offset+size<=(['top','bottom'].includes(side)?level.width:level.height);offset++){
    if(level.blocks.filter(b=>(b.layers??[b.color]).includes(g.color)).some(b=>Math.max(...b.shape.map(p=>['top','bottom'].includes(side)?p[0]:p[1]))>=size))continue;
    if(Array.from({length:size},(_,i)=>side+':'+(offset+i)).some(k=>used.has(k)))continue;
    if(!Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,level.height-1]:side==='left'?[0,offset+i]:[level.width-1,offset+i]).every(p=>cells.has(p.join(','))))continue;
    options.push({side,size,offset});
   }
   if(!options.length){ok=false;break;}const p=options[Math.floor(rng.rand()*options.length)];for(let t=p.offset;t<p.offset+p.size;t++)used.add(p.side+':'+t);level.gates.push({id:'v146-'+g.sourceId,color:g.color,...p,...(g.frozen?{frozen:g.frozen}:{})});
  }if(!ok){fail('gates');continue;}
  try{api.validateLevel(level);const issues=api.auditRevisedCandidate(level).issues.filter(i=>i.category!=='source'&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));if(issues.length){fail(issues[0].code);continue;}}catch(e){fail(e.message);continue;}
  valid++;const result=search(level,{floor:21,maxStates:100000,maxMilliseconds:800,orderSeed:attempts%level.blocks.length});if(result.status!=='witness'||result.cost<16){fail(result.status==='witness'?'too-easy':result.status);continue;}
  const replay=api.replayRevisedRoute(level,result.drags);if(!replay.valid||!replay.complete){fail('replay');continue;}solved++;
  const proof=proveFloor(level,api,{maxStates:250000,maxMilliseconds:3000});
  const reason='源稳定开局色块实际44格，保留本游戏既有41格棋盘；将单一无机关2×2换原向单格恰减3格，其余已知块数、颜色、两个壳和全部门初值不变。';
  const colors=[...new Set(source45Items.map(x=>x.color))];
  const data={ruleVersion:'1.46.0',seed:'14645-'+rng.state()+'-'+attempts,level,drags:result.drags,replay,proof,
   sourceAdaptation:{colorMapping:Object.fromEntries(colors.map(c=>[c,c])),stageMapping:{},stages:{opening:{rationale:reason}},blockMapping:Object.fromEntries(source45Items.map(b=>[b.sourceId,['v146-'+b.sourceId]])),carrierShapeRationales:{['v146-45-o'+changed]:reason},gateBindings:gates45.map(g=>({sourceId:g.sourceId,gateId:'v146-'+g.sourceId})),omittedGates:[]},
   originality:{layoutIntent:'把大小块重排为上下封口与中部交错工作区，原始矩形坐标不复刻。',alignment:'沿保留切角轮廓行列铺满，方块边界优先和长条边界对齐。',changes:'源矩形开局改为本游戏41格切角满铺，块组和出门通路全部重新配置。',constraints:'仅原向完整素材；保留原棋盘、已知逐块颜色及壳芯、五门冰值。'},
   design:{primaryMechanism:'高冰门分段开放与两层方块持续占位',concreteDecision:'先让普通红块与低冰门推进清除，再转移壳块给内芯腾出路口；多格工作区在门解冻前不能被占死。'}};
  const out=write(`draft45-${Date.now()}.json`,data);console.log(JSON.stringify({out,cost:result.cost,proof:proof.status,thresholdProven:proof.thresholdProven,states:proof.discoveredStates,attempts,valid,solved}));if(proof.thresholdProven)break;
 }
 console.log(JSON.stringify({attempts,valid,solved,diagnostics}));
}else if(mode==='enrich'){
 const data=JSON.parse(fs.readFileSync(arg)),{level,drags}=data,c=compile(level),m=new api.PuzzleModel(level);m.startCountdown();
 const apply=d=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
 const state=s=>Uint16Array.from(c.blocks.map(b=>{const a=s.blocks.find(a=>a.id===b.id);return a?(a.y*c.W+a.x)|((b.layers.length-a.layers.length)<<7):s.queuedBlocks.some(a=>a.id===b.id)?510:511;}));
 const cases=[];
 for(let step=0;step<drags.length-1;step++){
  const snap=m.snapshot(),d=drags[step];let local=0;
  each(c,state(snap),(_next,cost,get)=>{if(cost!==1)return;const wrong=get(),body=snap.blocks.find(b=>b.id===wrong.blockId);if(body.id===d.blockId||body.shape.length<2)return;
   const prefix=drags.slice(0,step),blocked=api.replayRevisedRoute(level,[...prefix,wrong,d]);if(blocked.valid||!blocked.error?.startsWith('Rejected move'))return;
   if(!api.replayRevisedRoute(level,[...prefix,wrong]).valid)return;
   const recovery={blockId:body.id,path:[[body.x,body.y],...wrong.path.slice(0,-1)].reverse()},restored=api.replayRevisedRoute(level,[...prefix,wrong,recovery]),initial=api.replayRevisedRoute(level,prefix);
   if(!restored.valid||restored.finalStateKey!==initial.finalStateKey)return;
   const full=[...prefix,wrong,recovery,...drags.slice(step)],r=api.replayRevisedRoute(level,full);if(!r.valid||!r.complete)return;
   cases.push({atStep:step+1,beforeDrag:step+1,blockId:body.id,area:body.shape.length,correctDrag:d,legalWrongParking:wrong,blockedNextAction:d,recoveryDrag:recovery,fullRecoveredRoute:full,consequence:'合法多格停车会封堵下一指定动作；原路退回恢复原状态并完整通关，非全局唯一顺序断言。'});if(++local>=3)return false;
  });apply(d);
 }
 data.decisionCases=[];for(const x of cases)if(!data.decisionCases.some(y=>x.blockId===y.blockId||x.atStep===y.atStep)){data.decisionCases.push(x);if(data.decisionCases.length===3)break;}
 assert(data.decisionCases.length);data.curtainLocalChoices=[];
 const checked=checkCandidate(data,base,api,{maxStates:2000000,maxMilliseconds:120000});
 data.freshVerification=checked;console.log(JSON.stringify({out:write('final'+level.id+'.json',data),L:checked.lowerBound,U:checked.upperBound,states:checked.proof.discoveredStates}));
}else throw Error('source45 | generate45 | enrich FILE');
