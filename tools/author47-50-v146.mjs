import fs from 'node:fs';import assert from 'node:assert/strict';
import {loadApi,ruleGate,TARGETS,proveFloor,checkCandidate} from './remake41to50-v146.mjs';
import {shapeClass} from './remake41to50-source-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {SHAPES,rect,seededRng,pack} from '../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {search as axisSearch} from '../deliverables/remake41-50-v146-20260924/agent47-50/axis-graph.mjs';
import {search as queueSearch,compile,each} from '../deliverables/remake41-50-v146-20260924/agent47-50/queue-diagnostic.mjs';
import {verifyDecisions} from './review-remake41to50-decisions-v146.mjs';
const ROOT='deliverables/remake41-50-v146-20260924/agent47-50';
ruleGate();const {api}=await loadApi(),base=JSON.parse(fs.readFileSync('deliverables/remake41-50-v146-20260924/baseline.json')),review=JSON.parse(fs.readFileSync(ROOT+'/source-review.json'));
const [mode,arg]=process.argv.slice(2),id=Number(arg??50),source=review.levels.find(r=>r.level===id),target=TARGETS[id];
const seed=Number(process.env.SEED??47050),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)];
const write=(name,x)=>{const p=ROOT+'/'+name;fs.writeFileSync(p,JSON.stringify(x,null,2)+'\n',{flag:'wx'});return p;};
const diagnostics={};const fail=k=>{diagnostics[k]=(diagnostics[k]??0)+1;return null;};
for(const k in SHAPES)SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only'));
SHAPES.NATIVE3=[...SHAPES.H3,...SHAPES.V3,...SHAPES.L3];SHAPES.NATIVE2=[...SHAPES.H2,...SHAPES.V2];
function packConstrained(spec,l,gates,maxTries=30000){
 const deadline=Date.now()+Number(process.env.PACK_MS??1200);
 const poses=spec.map(b=>{const out=[],g=gates.find(g=>g.color===b.color);for(const shape of SHAPES[b.kind])for(let y=0;y<l.height;y++)for(let x=0;x<l.width;x++){
  const ps=shape.map(([dx,dy])=>[x+dx,y+dy]);if(ps.some(p=>p[0]>=l.width||p[1]>=l.height))continue;
  if(b.axis&&ps.some(p=>{const t=p[b.axis==='vertical'?0:1];return t<g.offset||t>=g.offset+g.size;}))continue;
  const mask=ps.reduce((m,[x,y])=>m|(1n<<BigInt(y*l.width+x)),0n),near=ps.flatMap(([x,y])=>[[x+1,y],[x-1,y],[x,y+1],[x,y-1]]).filter(([x,y])=>x>=0&&y>=0&&x<l.width&&y<l.height).reduce((m,[x,y])=>m|(1n<<BigInt(y*l.width+x)),0n);
  out.push({...b,x,y,shape,mask,near});}return rng.shuffle(out);});
 const full=(1n<<BigInt(l.width*l.height))-1n,chosen=[],used=new Set();let n=0;
 function go(occupied){if(++n>maxTries||Date.now()>deadline)return false;if(occupied===full)return chosen.length===spec.length;
  let best=null;for(let p=0;p<l.width*l.height;p++){const bit=1n<<BigInt(p);if(occupied&bit)continue;const choices=[];
   for(let i=0;i<spec.length;i++)if(!used.has(i))for(const pose of poses[i])if((pose.mask&bit)&&!(pose.mask&occupied)&&!chosen.some(c=>c.color===pose.color&&(pose.near&c.mask)))choices.push([i,pose]);
   if(!choices.length)return false;if(!best||choices.length<best.length)best=choices;
  }
  for(const [i,p]of rng.shuffle(best)){used.add(i);chosen.push(p);if(go(occupied|p.mask))return true;chosen.pop();used.delete(i);}return false;
 }
 return go(0n)?chosen.map(({mask,near,...b})=>b):null;
}
function make50(){
 const l=structuredClone(base.levels[49].level);delete l.shutters;delete l.generators;l.blocks=[];l.gates=[];l.difficulty='easy';l.preservedMoveTarget=base.levels[49].starTargets.moveTarget;
 const reds=source.stage_seeds[0].items.filter(b=>b.color==='red');const spec=source.stage_seeds[0].items.map(b=>({...b}));
 const kinds=pick([['NATIVE3','NATIVE3','NATIVE2','SINGLE'],['NATIVE3','NATIVE2','NATIVE3','SINGLE'],['NATIVE2','NATIVE3','NATIVE3','SINGLE']]);reds.forEach((b,i)=>spec.find(x=>x.sourceId===b.sourceId).kind=kinds[i]);
 if(Number(process.env.EXTRA_SHAPE_EDITS??0)){const choices=rng.shuffle(spec.filter(b=>(b.color==='green'&&['H2','V2'].includes(b.kind))||(b.color==='blue'&&b.kind==='V3')));for(const b of choices.slice(0,Number(process.env.EXTRA_SHAPE_EDITS)))b.kind=b.kind==='H2'?'V2':b.kind==='V2'?'H2':'H3';}
 spec.push(...[1,2].map(i=>({sourceId:'added-fill-'+i,kind:'SINGLE',color:'extra-'+i})));
 const redSide=pick(['left','right']),purpleSide=redSide==='left'?'right':'left',greenSide=pick(['top','bottom']),blueSide=greenSide==='top'?'bottom':'top';
 const paired=pick(['green','blue']),pairOffset=pick([0,2]);l.gates=[{id:'v146-50-g-red',color:'red',side:redSide,offset:Math.floor(rng.rand()*7),size:3},{id:'v146-50-g-purple',color:'purple',side:purpleSide,offset:Math.floor(rng.rand()*7),size:3},{id:'v146-50-g-green',color:'green',side:greenSide,offset:paired==='green'?pairOffset:Math.floor(rng.rand()*3),size:3},{id:'v146-50-g-yellow',color:'yellow',side:paired==='green'?greenSide:blueSide,offset:pairOffset===0?3:0,size:2},{id:'v146-50-g-blue',color:'blue',side:blueSide,offset:paired==='blue'?pairOffset:Math.floor(rng.rand()*3),size:3}];
 const bs=packConstrained(spec,l,l.gates,Number(process.env.PACK_TRIES??3500));if(!bs)return fail('pack');
 for(const b of bs.filter(b=>b.sourceId.startsWith('added'))){const options=source.composition.full.color_classes.filter(c=>!bs.some(a=>a!==b&&a.color===c&&a.shape.some(([dx,dy])=>Math.abs(a.x+dx-b.x)+Math.abs(a.y+dy-b.y)===1)));if(!options.length)return fail('extra-colour');b.color=pick(options);}
 l.blocks=bs.map(b=>({id:'v146-50-'+b.sourceId,x:b.x,y:b.y,color:b.color,shape:b.shape,...(b.axis?{movementAxis:b.axis}:{})}));
 try{api.validateLevel(l);const issues=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));if(issues.length)return fail('audit-'+issues[0].code);}catch(e){return fail('validate-'+e.message);}
 return l;
}
function make47(){
 const l=structuredClone(base.levels[46].level);delete l.shutters;delete l.generators;l.blocks=[];l.gates=[];l.difficulty='normal';l.preservedMoveTarget=base.levels[46].starTargets.moveTarget;
 const side=pick(['left','right']);const machines=[{id:'v146-47-m1',side,offset:2,spawn:[side==='left'?0:3,2],rimSpan:3,rimMount:'rim'},{id:'v146-47-m2',side,offset:5,spawn:[side==='left'?0:3,5],rimSpan:3,rimMount:'rim'}];
 const colors=source.composition.full.color_classes,spec=[...source.stage_seeds[0].items.map(b=>({...b})),...['SQ2','SQ2','H3'].map((kind,i)=>({sourceId:'added-'+i,kind,color:pick(colors)}))];
 const bs=pack(spec,l.playable,rng,Number(process.env.PACK_TRIES??3000),true);if(!bs)return null;
 l.blocks=bs.map(b=>({id:'v146-47-'+b.sourceId,x:b.x,y:b.y,color:b.color,shape:b.shape,...(b.frozen?{frozen:b.frozen}:{})}));
 l.generators=machines.map((g,i)=>({...g,queueBlockIds:source.stage_seeds[i+1].items.map(b=>{const id='v146-47-'+b.sourceId;l.blocks.push({id,x:g.spawn[0],y:g.spawn[1],color:b.color,shape:SHAPES[b.kind][0]});return id;})}));
 const slots=[],usable=new Set(l.playable.map(p=>p.join(','))),rails=new Set();
 for(const side2 of ['top','right','bottom','left'])for(const size of [1,2,3])for(let offset=0;offset+size<=(['top','bottom'].includes(side2)?l.width:l.height);offset++){
  const cells=Array.from({length:size},(_,i)=>side2==='top'?[offset+i,0]:side2==='bottom'?[offset+i,l.height-1]:side2==='left'?[0,offset+i]:[l.width-1,offset+i]);if(cells.some(p=>!usable.has(p.join(',')))||side2===side)continue;slots.push({side:side2,offset,size});}
 const gateSources=[source.mechanisms.gates.items.find(g=>g.color==='red'),...rng.shuffle(source.mechanisms.gates.items.filter(g=>g.color!=='red'))];
 for(const g of gateSources){const options=rng.shuffle(slots.filter(p=>l.blocks.filter(b=>b.color===g.color).every(b=>Math.max(...b.shape.map(q=>['left','right'].includes(p.side)?q[1]:q[0]))<p.size)&&!Array.from({length:p.size},(_,i)=>p.side+':'+(p.offset+i)).some(k=>rails.has(k))));
  if(g.color==='red'){const body=l.blocks.find(b=>b.id==='v146-47-s47-opening-13');for(let i=options.length-1;i>=0;i--){const p=options[i],bw=3,bh=1,t=['top','bottom'].includes(p.side)?body.x:body.y,n=['top','bottom'].includes(p.side)?bw:bh;const edge=p.side==='left'?body.x===0:p.side==='right'?body.x+bw===l.width:p.side==='top'?body.y===0:body.y+bh===l.height;if(!edge||t<p.offset||t+n>p.offset+p.size)options.splice(i,1);}}
  if(!options.length)return null;const p=options[0];for(let t=p.offset;t<p.offset+p.size;t++)rails.add(p.side+':'+t);l.gates.push({id:'v146-47-g-'+g.color,color:g.color,...p,...(g.frozen?{frozen:g.frozen}:{})});}
 try{api.validateLevel(l);const issues=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));if(issues.length)return null;}catch{return null;}return l;
}
function make49(){
 const l=structuredClone(base.levels[48].level);l.blocks=[];l.gates=[];l.difficulty='easy';l.preservedMoveTarget=base.levels[48].starTargets.moveTarget;
 const covers=[{id:'v146-49-cover-left',x:0,y:0,width:3,height:4,count:19},{id:'v146-49-cover-right',x:4,y:0,width:3,height:4,count:19},{id:'v146-49-cover-center',x:3,y:9,width:3,height:3,count:19}];
 l.shutters=covers;const inCover=([x,y])=>covers.some(c=>x>=c.x&&x<c.x+c.width&&y>=c.y&&y<c.y+c.height);
 const spec=source.stage_seeds[0].items.map(b=>({...b,kind:['T4','H2'].includes(b.kind)?'V2':b.kind}));const bs=process.env.PACK49FILE?JSON.parse(fs.readFileSync(process.env.PACK49FILE)).blocks:pack(spec,l.playable.filter(p=>!inCover(p)),rng,Number(process.env.PACK_TRIES??2500),true);if(!bs)return fail('49-pack');
 const add=(b,cover)=>({id:'v146-49-'+b.sourceId,x:b.x,y:b.y,color:b.color,shape:b.shape,...(b.frozen?{frozen:b.frozen}:{}),...(cover?{shutterId:cover.id}:{})});l.blocks=bs.map(b=>add(b));
 for(const c of covers){const stage=source.stage_seeds.find(s=>'v146-49-'+s.id===c.id);const cells=rect(c.width,c.height).map(([x,y])=>[x+c.x,y+c.y]);const adapted=stage.items.map(b=>({...b,kind:b.kind==='H3'?'V3':b.kind}));const hidden=pack(adapted,cells,rng,1500,true);if(!hidden)return fail('49-hidden-'+c.id);l.blocks.push(...hidden.map(b=>add(b,c)));}
 const leftY=9,bottomX=4;
 const machines=[{id:'v146-49-m1',side:'left',offset:leftY+1,spawn:[0,leftY],rimSpan:3,rimMount:'rim'},{id:'v146-49-m2',side:'bottom',offset:bottomX,spawn:[bottomX,10],rimSpan:3,rimMount:'rim'}];
 l.generators=machines.map((g,i)=>({...g,queueBlockIds:source.stage_seeds[i+1].items.map((b,k)=>{const id='v146-49-'+b.sourceId;l.blocks.push({id,x:g.spawn[0],y:g.spawn[1],color:i===0&&k===3?pick(['blue','red','green','yellow']):b.color,shape:SHAPES[b.kind][0]});return id;})}));
 const upper=pick([true,false]);l.gates=[{id:'v146-49-g-orange',color:'orange',side:'top',offset:3,size:1},{id:'v146-49-g-pink',color:'pink',side:'top',offset:upper?0:5,size:2},{id:'v146-49-g-cyan',color:'cyan',side:'top',offset:upper?5:0,size:2}];
 const rails=new Set();for(const g of machines)for(let t=g.offset-Math.floor(g.rimSpan/2);t<=g.offset+Math.floor(g.rimSpan/2);t++)rails.add(g.side+':'+t);
 const slots=[];for(const side of ['left','right','bottom'])for(const size of [2,3])for(let offset=side==='bottom'?0:7;offset+size<=(side==='bottom'?7:12);offset++){if(Array.from({length:size},(_,i)=>side+':'+(offset+i)).some(k=>rails.has(k)))continue;slots.push({side,offset,size});}
 for(const color of ['green','yellow',...rng.shuffle(['red','blue'])]){
  const choices=rng.shuffle(slots.filter(g=>!Array.from({length:g.size},(_,i)=>g.side+':'+(g.offset+i)).some(k=>rails.has(k))&&l.blocks.filter(b=>b.color===color).every(b=>Math.max(...b.shape.map(p=>g.side==='bottom'?p[0]:p[1]))<g.size)));
  if(color==='green'){for(let i=choices.length-1;i>=0;i--)if(choices[i].side!=='right'||choices[i].offset!==10||choices[i].size!==2)choices.splice(i,1);}
  else for(let i=choices.length-1;i>=0;i--){const g=choices[i];if(!(g.side==='left'&&g.offset===7&&g.size===2||g.side==='right'&&g.offset===7&&g.size===2||g.side==='bottom'&&g.offset===0&&g.size===3))choices.splice(i,1);}
  if(color==='yellow')for(let i=choices.length-1;i>=0;i--){const g=choices[i];if(!bs.some(b=>{const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1])),edge=g.side==='left'?b.x===0:g.side==='right'?b.x+w===7:b.y+h===12,t=g.side==='bottom'?b.x:b.y,n=g.side==='bottom'?w:h;return b.color===color&&!b.frozen&&edge&&t>=g.offset&&t+n<=g.offset+g.size;}))choices.splice(i,1);}
  if(!choices.length)return fail('49-gates');const g=choices[0];l.gates.push({id:'v146-49-g-'+color,color,...g,...({red:2,blue:1,green:3}[color]?{frozen:{red:2,blue:1,green:3}[color]}:{})});for(let t=g.offset;t<g.offset+g.size;t++)rails.add(g.side+':'+t);
 }
 try{api.validateLevel(l);const issues=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));if(issues.length){if(!diagnostics['first49']){console.log(JSON.stringify({first49Issues:issues}));diagnostics.first49=1;}return fail('49-audit-'+issues[0].code);}}catch(e){return fail('49-validate-'+e.message);}return l;
}
function enrich47(data){
 const {level,drags}=data,why='保留既定44格对称棋盘，来源稳定开局实际33格；只补足缺少11格，采用两块SQ2与一块H3，源23体颜色/形状/冰初值及两机完整队列保持。';
 data.ruleVersion='1.46.0';data.sourceAdaptation={colorMapping:Object.fromEntries(source.composition.full.color_classes.map(c=>[c,c])),stageMapping:{'generator-1':'v146-47-m1','generator-2':'v146-47-m2'},blockMapping:Object.fromEntries(source.stage_seeds[0].items.map(b=>[b.sourceId,['v146-47-'+b.sourceId]])),stages:{opening:{rationale:why}},carrierShapeRationales:{},queueColorRationales:{},gateBindings:source.mechanisms.gates.items.map(g=>({sourceId:g.sourceId,gateId:level.gates.find(b=>b.color===g.color).id})),omittedGates:[]};
 data.originality={layoutIntent:'采用顶部左右双列方块与中下横条分区，生成器放在对侧边缘形成横向通路。',alignment:'44格旧轮廓保持，上下缺角对称，原向矩形边界与单格带按行列对齐。',changes:'源三角33格与本次44格对称板不同，开局邻接和机关工作位均原创重排；不是源坐标镜转或换色。',constraints:why};
 data.design={primaryMechanism:'双固定空间生成器与分阶段冰门的通路配合',concreteDecision:'先腾出长条出口方向的工作位，再清出下一件真实货物的完整落点；粉门23之前先分散安置粉块而不封住其余清除链。',fairness:'所有初始冰值/机货预览保留，错误停车可退回，不把未知后货作为无预警必败条件。',nativeOnly:'全32体使用现有原朝向整图，quarterTurns=0。',sourceAdaptation:why,humanBlindTested:false};
 const apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
 const fromSnapshot=(c,s)=>Uint16Array.from(c.blocks.map(b=>{const a=s.blocks.find(a=>a.id===b.id);return a?(a.y*c.W+a.x)|((b.layers.length-a.layers.length)<<7):s.queuedBlocks.some(a=>a.id===b.id)?510:511;}));
 const c=compile(level),m=new api.PuzzleModel(structuredClone(level)),found=[],queue=new Set(level.generators.flatMap(g=>g.queueBlockIds));m.startCountdown();
 for(let step=0;step<drags.length-1;step++){
  const snap=m.snapshot(),d=drags[step],state=fromSnapshot(c,snap);let local=0;
  each(c,state,(_next,cost,get)=>{if(cost!==1)return;const wrong=get(),body=snap.blocks.find(b=>b.id===wrong.blockId);if(body.id===d.blockId||body.shape.length<2)return;const prefix=drags.slice(0,step),blocked=api.replayRevisedRoute(level,[...prefix,wrong,d]);
   if(blocked.valid||!blocked.error?.startsWith('Rejected move')||!api.replayRevisedRoute(level,[...prefix,wrong]).valid)return;
   const recovery={blockId:body.id,path:[[body.x,body.y],...wrong.path.slice(0,-1)].reverse()},restored=api.replayRevisedRoute(level,[...prefix,wrong,recovery]),initial=api.replayRevisedRoute(level,prefix);if(!restored.valid||restored.finalStateKey!==initial.finalStateKey)return;
   const full=[...prefix,wrong,recovery,...drags.slice(step)],recovered=api.replayRevisedRoute(level,full);if(!recovered.valid||!recovered.complete)return;
   found.push({atStep:step+1,beforeDrag:step+1,blockId:body.id,area:body.shape.length,correctDrag:d,legalWrongParking:wrong,blockedNextAction:d,recoveryDrag:recovery,fullRecoveredRoute:full,mechanismContext:{cleared:snap.cleared,isGeneratorCargo:queue.has(body.id),nextActionIsCargo:queue.has(d.blockId),machineRemaining:snap.generators.map(g=>g.remaining)},consequence:'多格合法误停阻住指定下一拖，退回后同状态完整通关；不宣称全局死锁或最优惩罚。',score:body.shape.length+(queue.has(body.id)?35:0)+(queue.has(d.blockId)?25:0)});if(++local>=3)return false;
  });apply(m,d);
 }
 found.sort((a,b)=>b.score-a.score||a.atStep-b.atStep);data.decisionCases=[];for(const x of found)if(!data.decisionCases.some(c=>c.blockId===x.blockId||c.atStep===x.atStep)){delete x.score;data.decisionCases.push(x);if(data.decisionCases.length===3)break;}assert(data.decisionCases.length);data.curtainLocalChoices=[];
 data.constructionProof=data.proof;delete data.proof;data.decisionVerification=verifyDecisions(data,api);return data;
}
if(mode==='generate'&&id===50){let attempts=0,packed=0,solved=0;const end=Date.now()+Number(process.env.SECONDS??300)*1000;
 while(Date.now()<end){attempts++;if(attempts%500===0)console.log(JSON.stringify({progress:true,id,attempts,packed,solved,diagnostics}));const l=make50();if(!l)continue;packed++;const s=axisSearch(l,{floor:11,maxStates:100000,maxMilliseconds:1200,orderSeed:attempts%l.blocks.length});if(s.status!=='witness'||s.cost<5)continue;
 const replay=api.replayRevisedRoute(l,s.drags);if(!replay.valid||!replay.complete)continue;solved++;const proof=proveFloor(l,api,{maxStates:250000,maxMilliseconds:3000});
 const out=write(`draft50-${seed}-${attempts}-${Date.now()}.json`,{level:l,drags:s.drags,seed:`${seed}-${attempts}`,replay,proof,search:s});console.log(JSON.stringify({out,cost:s.cost,proof:proof.status,attempts,packed,solved}));if(proof.thresholdProven)break;
 }console.log(JSON.stringify({id,attempts,packed,solved,diagnostics}));
}else if(mode==='generate'&&id===47){let attempts=0,packed=0,solved=0;const end=Date.now()+Number(process.env.SECONDS??300)*1000;
 while(Date.now()<end){attempts++;const l=make47();if(!l)continue;packed++;const s=queueSearch(l,{floor:16,maxStates:100000,maxMilliseconds:1500,orderSeed:attempts%l.blocks.length});const tag=s.status==='witness'?'witness-'+s.cost:'search-'+s.stop;diagnostics[tag]=(diagnostics[tag]??0)+1;if(packed%100===0)console.log(JSON.stringify({id,attempts,packed,solved,diagnostics}));if(s.status!=='witness'||s.cost<11)continue;
 const replay=api.replayRevisedRoute(l,s.drags);if(!replay.valid||!replay.complete)continue;solved++;const proof=proveFloor(l,api,{maxStates:250000,maxMilliseconds:3000});
 const out=write(`draft47-${seed}-${attempts}-${Date.now()}.json`,{level:l,drags:s.drags,seed:`${seed}-${attempts}`,replay,proof,search:s});console.log(JSON.stringify({out,cost:s.cost,proof:proof.status,attempts,packed,solved}));if(proof.thresholdProven)break;
 }console.log(JSON.stringify({id,attempts,packed,solved,diagnostics}));
}else if(mode==='generate'&&id===49){let attempts=0,packed=0,solved=0;const end=Date.now()+Number(process.env.SECONDS??300)*1000;
 while(Date.now()<end){attempts++;if(attempts%500===0)console.log(JSON.stringify({id,attempts,packed,solved,diagnostics}));const l=make49();if(!l)continue;packed++;if(process.env.DUMP_STATIC){console.log(JSON.stringify({out:write(`static49-${Date.now()}.json`,{level:l})}));break;}const s=queueSearch(l,{floor:Number(process.env.MAX_COST??10)+1,maxStates:200000,maxMilliseconds:Number(process.env.SEARCH_MS??1500),orderSeed:attempts%l.blocks.length});const tag=s.status==='witness'?'witness-'+s.cost:'search-'+s.stop;diagnostics[tag]=(diagnostics[tag]??0)+1;if(s.maxClears>(diagnostics.maxClears??0)){diagnostics.maxClears=s.maxClears;console.log(JSON.stringify({partial:write(`partial49-${Date.now()}.json`,{level:l,search:s}),maxClears:s.maxClears}));}if(packed%100===0)console.log(JSON.stringify({id,attempts,packed,solved,diagnostics}));if(s.status!=='witness'||s.cost<5)continue;
 const replay=api.replayRevisedRoute(l,s.drags);if(!replay.valid||!replay.complete)continue;solved++;const proof=proveFloor(l,api,{maxStates:250000,maxMilliseconds:3000});
 const out=write(`draft49-${seed}-${attempts}-${Date.now()}.json`,{level:l,drags:s.drags,seed:`${seed}-${attempts}`,replay,proof,search:s});console.log(JSON.stringify({out,cost:s.cost,proof:proof.status,attempts,packed,solved}));if(proof.thresholdProven&&s.cost<=10)break;
 }console.log(JSON.stringify({id,attempts,packed,solved,diagnostics}));
}else if(mode==='enrich'&&id===47){const d=enrich47(JSON.parse(fs.readFileSync(process.argv[4])));console.log(JSON.stringify({out:write(`candidate47-enriched-${Date.now()}.json`,d),decisions:d.decisionCases.length}));
}else if(mode==='improve'){
 const d=JSON.parse(fs.readFileSync(process.argv[4]));let best=Infinity;const end=Date.now()+Number(process.env.SECONDS??180)*1000;let tries=0;
 while(Date.now()<end){const s=(id===50?axisSearch:queueSearch)(d.level,{floor:target.max+1,maxStates:200000,maxMilliseconds:2500,orderSeed:tries++%d.level.blocks.length,weight:pick([2,5,20,1000])});if(s.status!=='witness')continue;const replay=api.replayRevisedRoute(d.level,s.drags);if(!replay.valid||!replay.complete)continue;const measured=measureRoute(d.level,s.drags,api);const score=measured.nonClearingDrags+(measured.multiCellDrags<=measured.singleCellDrags?100:0);if(score>=best)continue;best=score;const out=write(`route${id}-${Date.now()}.json`,{...d,drags:s.drags,replay,measurements:measured,search:s});console.log(JSON.stringify({out,cost:s.cost,multi:measured.multiCellDrags,single:measured.singleCellDrags}));}
}else throw Error('Usage generate 47|49|50');
