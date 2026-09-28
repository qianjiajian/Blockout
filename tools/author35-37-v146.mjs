import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {loadApi} from './remake31to40-v147.mjs';
import {checkCandidate,auditCandidate,proveFloor} from './remake31to40-v147.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {shapeClass} from './remake31to40-source-v141.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {observeMechanismProcess,verifyDecisions} from './review-remake31to40-decisions.mjs';
import {search as queueSearch,compile,each} from '../deliverables/remake31-40-v141-20260924/agent35-37/queue-search.mjs';
import {SHAPES,rect,pack,seededRng} from '../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';

const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const {api}=await loadApi();
const bundle=await build({stdin:{contents:'export * from "./src/game/formalBlockShapes.ts";',resolveDir:process.cwd()},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const art=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const root='deliverables/remake31-40-v146-20260924/agent35-37';
const base=JSON.parse(fs.readFileSync('deliverables/remake31-40-v146-20260924/baseline.json'));
const catalog=JSON.parse(fs.readFileSync('deliverables/remake31-40-v141-20260924/source-catalog.json'));
const reviews=JSON.parse(fs.readFileSync('deliverables/remake31-40-v141-20260924/agent35-37/source-review.json'));
const write=(name,data)=>{fs.mkdirSync(root,{recursive:true});const p=path.join(root,name);fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
const [mode,arg]=process.argv.slice(2),id=Number(arg??40),target={min:[35,36,39].includes(id)?5:id===38?16:11,max:[35,36,39].includes(id)?10:id===38?20:15};
function nativeAudit(level){const rows=level.blocks.map(b=>({id:b.id,match:art.matchFormalBlockShape(b.shape,'native-only')}));assert(rows.every(r=>r.match?.quarterTurns===0),'Every shape must have its complete original-direction artwork');assert(api.auditCandidateBlockArt(level).passed);return {passed:true,blockCount:rows.length,rows};}
function finish(data){
 nativeAudit(data.level);
 // Pure historical checker supplies unchanged mechanism/source/floor checks;
 // the current active lock and native-art check are separately bound below.
 const checked=checkCandidate(data,base,api,{maxStates:2500000,maxMilliseconds:180000});
 const current={activeRuleVersion:lock.activeVersion,generationContract:'1.45.0',checkedAt:new Date().toISOString(),native:nativeAudit(data.level),currentCandidateCheck:checked,
  levelSha256:digest(data.level),routeSha256:digest(data.drags),lowerBound:checked.lowerBound,upperBound:checked.upperBound,pointerValidated:false,formalAdopted:false};
 const out=write(`candidate${id}-${Date.now()}.json`,{...data,ruleVersion:lock.activeVersion,generationContract:'1.45.0',freshVerification:current});
 console.log(JSON.stringify({out,id,L:current.lowerBound,U:current.upperBound,states:checked.proof.discoveredStates,native:true}));return out;
}
function enrich(data){
 const {level,drags}=data,id=level.id;
 const old=JSON.parse(fs.readFileSync(`deliverables/remake31-40-v141-20260924/agent35-37/final${id}.json`));
 data.sourceAdaptation=JSON.parse(JSON.stringify(old.sourceAdaptation).replaceAll(`v141-${id}-`,`v145-${id}-`));
 data.originality=structuredClone(old.originality);
 data.originality.changes+=' 本轮所有色块限定原图朝向，重新铺设并重新求解全部货物，不沿用旧路线。';
 if(id===37){const a=data.sourceAdaptation;
  a.stages['cover-1']={rationale:'3×3隐藏区所有原向同面积组合已穷举；零或一块换形均无铺法，最少两块适配为T4→SQ2和L3→H3，保各原色/批次/计数/面积与三独立块。证据agent35-37/native-hidden-packing-v2.json。'};
  a.carrierShapeRationales['v145-37-cover-1-1']=a.stages['cover-1'].rationale; a.carrierShapeRationales['v145-37-cover-1-2']=a.stages['cover-1'].rationale;
 }
 data.design={...old.design,...data.design,nativeOnly:'所有开局/隐藏/队列以quarterTurns=0整图匹配；不旋转或拼接。'};
 const apply=(m,d)=>{m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());};
 const fromSnapshot=(c,s)=>Uint16Array.from(c.blocks.map(b=>{const a=s.blocks.find(a=>a.id===b.id);return a?(a.y*c.W+a.x)|((b.layers.length-a.layers.length)<<7):s.queuedBlocks.some(a=>a.id===b.id)?510:511;}));
 const c=compile(level),m=new api.PuzzleModel(structuredClone(level)),found=[],queue=new Set(level.generators.flatMap(g=>g.queueBlockIds));m.startCountdown();
 for(let step=0;step<drags.length-1;step++){
  const snap=m.snapshot(),d=drags[step],state=fromSnapshot(c,snap);let local=0;
  each(c,state,(_next,cost,get)=>{if(cost!==1)return;const wrong=get(),body=snap.blocks.find(b=>b.id===wrong.blockId);if(body.id===d.blockId||body.shape.length<2)return;const prefix=drags.slice(0,step);
   const blocked=api.replayRevisedRoute(level,[...prefix,wrong,d]);if(blocked.valid||!blocked.error?.startsWith('Rejected move'))return;
   if(!api.replayRevisedRoute(level,[...prefix,wrong]).valid)return;
   const recovery={blockId:body.id,path:[[body.x,body.y],...wrong.path.slice(0,-1)].reverse()},restored=api.replayRevisedRoute(level,[...prefix,wrong,recovery]),initial=api.replayRevisedRoute(level,prefix);
   if(!restored.valid||restored.finalStateKey!==initial.finalStateKey)return;
   const full=[...prefix,wrong,recovery,...drags.slice(step)],recovered=api.replayRevisedRoute(level,full);if(!recovered.valid||!recovered.complete)return;
   found.push({atStep:step+1,beforeDrag:step+1,blockId:body.id,area:body.shape.length,correctDrag:d,legalWrongParking:wrong,blockedNextAction:d,recoveryDrag:recovery,fullRecoveredRoute:full,
    mechanismContext:{cleared:snap.cleared,isGeneratorCargo:queue.has(body.id),nextActionIsCargo:queue.has(d.blockId),machineRemaining:snap.generators.map(g=>g.remaining)},
    consequence:'合法多格停车堵住指定下一拖，原路恢复同一状态后可完整通关；不宣称全局最优代价或唯一顺序。',score:body.shape.length+(queue.has(body.id)?35:0)+(queue.has(d.blockId)?25:0)});
   if(++local>=5)return false;
  });apply(m,d);
 }
 found.sort((a,b)=>b.score-a.score||a.atStep-b.atStep);data.decisionCases=[];
 for(const x of found)if(!data.decisionCases.some(c=>c.blockId===x.blockId||c.atStep===x.atStep)){delete x.score;data.decisionCases.push(x);if(data.decisionCases.length===3)break;}
 assert(data.decisionCases.length);
 data.curtainLocalChoices=[];
 for(const curtain of level.shutters??[]){let result=null;
  for(let i=1;i<drags.length&&!result;i++){const prefix=drags.slice(0,i),start=api.replayRevisedRoute(level,prefix);if(!start.valid||start.complete||start.clearEvents<1||start.clearEvents>=curtain.count)continue;
   const changed=structuredClone(level);changed.shutters.find(s=>s.id===curtain.id).count=start.clearEvents;
   if(!api.replayRevisedRoute(changed,prefix).valid)continue;
   const model=new api.PuzzleModel(changed);model.startCountdown();prefix.forEach(d=>apply(model,d));const cc=compile(changed),state=fromSnapshot(cc,model.snapshot());
   each(cc,state,(_next,_cost,get)=>{const d=get();if(level.blocks.find(b=>b.id===d.blockId).shape.length<2)return;
    if(api.replayRevisedRoute(level,[...prefix,d]).valid||!api.replayRevisedRoute(changed,[...prefix,d]).valid)return;
    result={curtainId:curtain.id,originalCount:curtain.count,relaxedCount:start.clearEvents,beforeDrag:i+1,prefix,cleared:start.clearEvents,formalRemaining:JSON.parse(start.finalStateKey).shutters.find(s=>s.id===curtain.id).count,blockedAction:d,
     interpretation:'保持相同前缀与区域，仅放宽该帘计数使此多格动作合法，证明局部作用而非全局最优差。'};return false;
   });
  }assert(result,'Need local curtain effect '+curtain.id);data.curtainLocalChoices.push(result);
 }
 data.constructionProof=data.proof;delete data.proof;
 return data;
}

if(mode==='repair37'){
 assert.equal(id,37);
 const old=JSON.parse(fs.readFileSync('deliverables/remake31-40-v141-20260924/agent35-37/final37.json'));
 const tilings=JSON.parse(fs.readFileSync(root+'/native-hidden-packing-v2.json')).chosen.tilings;
 for(let variant=0;variant<tilings.length;variant++){
  const level=JSON.parse(JSON.stringify(old.level).replaceAll('v141-37-','v145-37-'));
  const cover=level.shutters[0];
  for(let i=0;i<3;i++){const p=tilings[variant][i],b=level.blocks.find(b=>b.id===`v145-37-cover-1-${i+1}`);b.shape=structuredClone(art.FORMAL_BLOCK_SHAPES.find(s=>s.shapeId===p.shapeId).cells);b.x=cover.x+p.x;b.y=cover.y+p.y;}
  for(const g of level.generators)for(const bid of g.queueBlockIds){const b=level.blocks.find(b=>b.id===bid);if(!art.matchFormalBlockShape(b.shape,'native-only')){b.shape=structuredClone(art.FORMAL_BLOCK_SHAPES.find(s=>shapeClass(s.cells)===shapeClass(b.shape)).cells);}}
  nativeAudit(level);api.validateLevel(level);
  const proof=proveFloor(level,api,{maxStates:500000,maxMilliseconds:10000});
  console.log(JSON.stringify({variant,proof:proof.status,states:proof.discoveredStates}));
  if(!proof.thresholdProven)continue;
  for(let orderSeed=0;orderSeed<level.blocks.length;orderSeed++){
   const r=queueSearch(level,{floor:16,maxStates:500000,maxMilliseconds:8000,orderSeed,weight:1000});
   if(r.status!=='witness')continue;
   const replay=api.replayRevisedRoute(level,r.drags);if(!replay.valid||!replay.complete)continue;
   const data={ruleVersion:lock.activeVersion,generationContract:'1.45.0',seed:`147-repair37-${variant}-${orderSeed}`,level,drags:r.drags,replay,proof,search:r,
    shapeAdaptations:[{sourceId:'cover-1-1',from:'T4',to:'SQ2'},{sourceId:'cover-1-2',from:'L3',to:'H3'}],design:{primaryMechanism:'原向多格通路与完整四件生成器队列',concreteDecision:'清出四件固定货物完整落点，并按冰门与卷帘清除计数规划停车位。'}};
   const out=write(`repair37-${variant}-${orderSeed}-${Date.now()}.json`,data);console.log(JSON.stringify({out,cost:r.cost}));finish(enrich(data));process.exit(0);
  }
 }
} else if(mode==='recheck'){ finish(JSON.parse(fs.readFileSync(process.argv[4]))); } else if(mode==='check40'){
 const data=JSON.parse(fs.readFileSync('deliverables/remake31-40-v141-20260924/agent38-40/final40.json'));
 finish(data);
} else if(mode==='enrich'){
 const data=JSON.parse(fs.readFileSync(process.argv[4]));assert.equal(data.level.id,id);finish(enrich(data));
} else if(mode==='generate') {
 assert([35,36,37].includes(id));
 const source=reviews.levels.find(r=>r.level===id),old=base.levels[id-1];
 const seed=Number(process.env.SEED??145000+id),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)],colors=source.composition.full.color_classes;
 SHAPES.SQ3=[rect(3,3)];SHAPES.S4=art.FORMAL_BLOCK_SHAPES.filter(s=>[5,11].includes(s.shapeId)).map(s=>s.cells);
 for(const kind of Object.keys(SHAPES))SHAPES[kind]=SHAPES[kind].filter(s=>art.matchFormalBlockShape(s,'native-only'));
 const diagnostics={};const fail=k=>{diagnostics[k]=(diagnostics[k]??0)+1;return null;};
 const add=(kind,i)=>({sourceId:'added-'+i,kind,color:pick(colors)});
 function gateSlots(level,machines){const slots=[],usable=new Set(level.playable.map(p=>p.join(','))),occupied=new Set();
  for(const m of machines)for(let t=m.offset-1;t<=m.offset+1;t++)occupied.add(m.side+':'+t);
  for(const side of ['top','right','bottom','left']){const length=['top','bottom'].includes(side)?level.width:level.height;
   for(const size of [2,3])for(let offset=0;offset+size<=length;offset++){const coords=Array.from({length:size},(_,i)=>side==='top'?[offset+i,0]:side==='bottom'?[offset+i,level.height-1]:side==='left'?[0,offset+i]:[level.width-1,offset+i]);
    if(coords.every(p=>usable.has(p.join(',')))&&!coords.some((p,i)=>occupied.has(side+':'+(offset+i))))slots.push({side,offset,size});}}
  return slots;
 }
 function colorExtras(bs){const own=new Map();bs.forEach((b,i)=>b.shape.forEach(([x,y])=>own.set([b.x+x,b.y+y].join(','),i)));
  const edges=bs.map(()=>new Set());for(const[p,i]of own){const[x,y]=p.split(',').map(Number);for(const q of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]){const j=own.get(q.join(','));if(j!==undefined&&j!==i)edges[i].add(j);}}
  const result=bs.map(b=>b.sourceId.startsWith('added')?null:b.color);for(let i=0;i<bs.length;i++)if(result[i]&&[...edges[i]].some(j=>result[j]===result[i]))return null;
  const todo=bs.map((_,i)=>i).filter(i=>!result[i]).sort((a,b)=>edges[b].size-edges[a].size);
  function go(n){if(n===todo.length)return true;const i=todo[n];for(const c of rng.shuffle([...colors])){if([...edges[i]].some(j=>result[j]===c))continue;result[i]=c;if(go(n+1))return true;}result[i]=null;return false;}
  return go(0)?bs.map((b,i)=>({...b,color:result[i]})):null;
 }
 function make(){const l=structuredClone(old.level);for(const k of ['shutters','generators'])delete l[k];l.blocks=[];l.gates=[];l.difficulty=id===37?'normal':'easy';l.preservedMoveTarget=old.starTargets.moveTarget;
  let machines,extras,cover=null;const shapeAdaptations=[];
  if(id===35){machines=[{side:'left',offset:1,spawn:[0,1]},{side:'left',offset:4,spawn:[0,3]}];extras=[...Array.from({length:7},(_,i)=>add('SQ2',i)),add('H3',7),add('H2',8),add('H2',9)];}
  if(id===36){machines=[{side:'left',offset:1,spawn:[0,1]},{side:'left',offset:4,spawn:[0,4]},{side:'left',offset:7,spawn:[0,7]}];extras=Array.from({length:6},(_,i)=>add('SQ2',i));}
  if(id===37){machines=[{side:'left',offset:3,spawn:[0,3]}];extras=[...Array.from({length:3},(_,i)=>add('BAR3',i)),add('H2',3)];const positions=[];
   for(let y=0;y<=l.height-3;y++)for(let x=0;x<=l.width-3;x++)if(rect(3,3).every(([dx,dy])=>l.playable.some(p=>p[0]===x+dx&&p[1]===y+dy)))positions.push([x,y]);
   const[x,y]=pick(positions);cover={id:'v145-37-cover',x,y,width:3,height:3,count:9};l.shutters=[cover];}
  const specs=[...source.stage_seeds[0].items.map(b=>({...b})),...extras.map(b=>({...b,color:b.sourceId}))];
  const opening=l.playable.filter(([x,y])=>!cover||x<cover.x||x>=cover.x+3||y<cover.y||y>=cover.y+3);
  const packed=pack(specs,opening,rng,Number(process.env.PACK_TRIES??4000),true);if(!packed)return fail('packing');const colored=colorExtras(packed);if(!colored)return fail('coloring');
  const asBlock=b=>({id:`v145-${id}-${b.sourceId}`,x:b.x,y:b.y,color:b.color,shape:b.shape,...(b.frozen?{frozen:b.frozen}:{}),...(b.shutterId?{shutterId:b.shutterId}:{})});l.blocks=colored.map(asBlock);
  if(cover){const hs=source.stage_seeds[1].items.map(b=>({...b}));
   // Native T4+L3+V2 cannot tile 3x3. A same-area rectangle is a minimal carrier change.
   const t=hs.find(b=>b.kind==='T4');t.kind='SQ2';const l3=hs.find(b=>b.kind==='L3');l3.kind='H3';shapeAdaptations.push({sourceId:l3.sourceId,from:'L3',to:'H3',reason:'原向同面积隐藏组合穷举证明至少两块换形，L3同面积换H3，保颜色/帘9/批次/独立块数。'});shapeAdaptations.push({sourceId:t.sourceId,from:'T4',to:'SQ2',reason:'原向T4+L3+V2在3×3隐藏区无铺法，将T4同面积换方2，颜色、帘初值、批次、独立块数不变。'});
   const bs=pack(hs,rect(3,3).map(([x,y])=>[x+cover.x,y+cover.y]),rng,1500,true);if(!bs)return fail('hidden');l.blocks.push(...bs.map(b=>asBlock({...b,shutterId:cover.id})));}
  const genSrc=source.mechanisms.generators.items;
  l.generators=machines.map((m,j)=>{const ids=[];for(let k=0;k<genSrc[j].queue.length;k++){const original=genSrc[j].queue[k];let kind=original.kind,color=original.color;
   if(id===35&&j===0&&[1,2,5,6].includes(k)){kind='SQ2';shapeAdaptations.push({sourceId:original.sourceId,from:original.kind,to:kind,reason:'保棋盘满铺后全关28体，源12异形超过30%，最少4件同面积改矩形，原色和库存顺序保持。'});}
   if(id===35&&j===0&&k===7)color='yellow';const center=m.side==='left'?[0,m.offset]:[m.offset,0];
   const variants=SHAPES[kind].filter(shape=>shape.some(([dx,dy])=>m.spawn[0]+dx===center[0]&&m.spawn[1]+dy===center[1])&&shape.every(([dx,dy])=>l.playable.some(([x,y])=>x===m.spawn[0]+dx&&y===m.spawn[1]+dy)));if(!variants.length)throw Error('No native cargo '+kind);
   const b={id:`v145-${id}-${original.sourceId}`,x:m.spawn[0],y:m.spawn[1],shape:pick(variants),color};l.blocks.push(b);ids.push(b.id);}
   return{id:`v145-${id}-machine-${j+1}`,...m,rimSpan:3,rimMount:'rim',queueBlockIds:ids};});
  const slots=gateSlots(l,machines),rail=new Set();for(const s of rng.shuffle([...source.mechanisms.gates.items])){const options=rng.shuffle(slots.filter(p=>l.blocks.filter(b=>b.color===s.color).every(b=>Math.max(...b.shape.map(q=>['left','right'].includes(p.side)?q[1]:q[0]))<p.size)&&!Array.from({length:p.size},(_,i)=>p.side+':'+(p.offset+i)).some(k=>rail.has(k))));if(!options.length)return fail('gates');const p=options[0];for(let t=p.offset;t<p.offset+p.size;t++)rail.add(p.side+':'+t);l.gates.push({id:`v145-${id}-gate-${s.color}`,color:s.color,...p,...(s.frozen?{frozen:s.frozen}:{})});}
  try{api.validateLevel(l);nativeAudit(l);const issues=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&!(i.category==='construction'&&i.code==='wrong-rule-profile'));if(issues.length)return fail('hard-'+issues[0].code);}catch(e){return fail('invalid-'+e.message);}
  return{level:l,shapeAdaptations};
 }
 let attempts=0,valid=0,solved=0,lastReport=Date.now();const deadline=Date.now()+Number(process.env.SECONDS??240)*1000;
 while(Date.now()<deadline){if(Date.now()-lastReport>15000){console.log(JSON.stringify({id,attempts,valid,solved,diagnostics}));lastReport=Date.now();}attempts++;const made=make();if(!made)continue;valid++;const r=queueSearch(made.level,{floor:target.max+1,maxStates:100000,maxMilliseconds:1200,orderSeed:attempts%made.level.blocks.length,weight:1000});if(r.status!=='witness'||r.cost<target.min)continue;
  const replay=api.replayRevisedRoute(made.level,r.drags);if(!replay.valid||!replay.complete)continue;solved++;const proof=proveFloor(made.level,api,{maxStates:250000,maxMilliseconds:3000});
  const out=write(`draft${id}-${seed}-${attempts}-${Date.now()}.json`,{ruleVersion:lock.activeVersion,generationContract:'1.45.0',seed:`145-${id}-${seed}-${attempts}`,...made,drags:r.drags,replay,proof,search:r,design:{primaryMechanism:'原向整图多格块与真实固定空间生成器',concreteDecision:'让出完整落点和出货工作位，避免后续货物封堵多格通路。'}});
  console.log(JSON.stringify({out,id,cost:r.cost,proof:proof.status,states:proof.discoveredStates,attempts,valid,solved}));if(proof.thresholdProven)break;
 }
 console.log(JSON.stringify({id,attempts,valid,solved,diagnostics}));
} else throw Error('Usage: check40 | generate 35|36|37');




