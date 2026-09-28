import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {pathToFileURL} from 'node:url';
import {loadApi} from './native-block-repair-v143.mjs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {projectAdvancedFloor} from './campaign31-200-advanced-floor-v145.mjs';
import {checkSymmetryFloor} from './remake21to30-symmetry-floor-v139.mjs';
import {auditOpeningCoverage} from './revised-opening-coverage.mjs';
import {auditHiddenCoverage} from './revised-hidden-coverage.mjs';
import {auditGateSpanLimits} from './revised-gate-span-limits.mjs';
import {measureRoute} from './remake21to30-quality.mjs';
import {compile as compileSimple} from '../.codex-temp/remake21-30-quality/agent25-27/graph.mjs';
import {pack,SHAPES,seededRng,rect} from '../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';

export const OUTPUT='deliverables/remake161-170-v146-20260924/level162';
const BASELINE='deliverables/remake31-200-v145-20260924/baseline.json';
const NONE=511,overlap=(a,b)=>a.some((v,i)=>v&b[i]),stateKey=s=>String.fromCharCode(...s);
const clearCount=(c,s)=>s.reduce((n,v,i)=>n+(v===NONE?c.blocks[i].layers.length:v>>>7),0);

/** Witness generator only: exactly completed headless flip events between drags.
 * Never used as a GUI lower-bound graph: GUI permits delayed/interleaved flips.
 * Every returned witness is separately replayed by current PuzzleModel.
 */
export function searchFlipWitness(level,{maxCost=20,maxStates=100000,maxMilliseconds=1500,orderSeed=0}={}){
 const flips=new Map((level.flipDoors??[]).map(g=>[g.id,g.initiallyOpen]));
 const projected={...level,flipDoors:[],gates:[...level.gates,...(level.flipDoors??[]).map(({initiallyOpen,...g})=>g)]};
 const c=compileSimple(projected),start=Date.now(),nodes=[{s:c.initial,cost:0,clears:0,parent:-1}],seen=new Map([[stateKey(c.initial),0]]),open=[0];
 let explored=0,transitions=0,stop;
 const score=i=>nodes[i].clears*1000-nodes[i].cost;
 function push(i){open.push(i);let k=open.length-1;while(k){const p=(k-1)>>1;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];k=p;}}
 function pop(){const first=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let k=p*2+1;if(k+1<open.length&&score(open[k+1])>score(open[k]))k++;if(score(open[p])>=score(open[k]))break;[open[p],open[k]]=[open[k],open[p]];p=k;}}return first;}
 function route(i){const out=[];while(nodes[i].parent>=0){out.push(nodes[i].drag);i=nodes[i].parent;}return out.reverse();}
 while(open.length){if(Date.now()-start>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(stateKey(n.s))<n.cost)continue;explored++;
  if(n.clears===c.total)return{status:'witness',cost:n.cost,drags:route(ni),states:seen.size,explored,transitions,milliseconds:Date.now()-start};
  const occ=[0,0,0];n.s.forEach((v,i)=>{if(v!==NONE)c.blocks[i].poses[v&127].mask.forEach((x,k)=>occ[k]|=x);});
  for(let ii=0;ii<c.blocks.length;ii++){const i=(ii+orderSeed)%c.blocks.length,b=c.blocks[i],v=n.s[i];if(v===NONE)continue;const stage=v>>>7,pos=v&127,occupied=occ.map((v,k)=>v^b.poses[pos].mask[k]),parents=new Int16Array(c.W*c.H).fill(-1),q=[pos];parents[pos]=pos;
   const drag=(p,side)=>{const out=[];while(p!==pos){out.push([p%c.W,Math.floor(p/c.W)]);p=parents[p];}return{blockId:b.id,path:out.reverse(),...(side?{exitSide:side}:{})};};
   const add=(value,cost,p,side)=>{transitions++;const nc=n.cost+cost;if(nc>maxCost)return;const s=n.s.slice();s[i]=value;const k=stateKey(s),old=seen.get(k);if(old!==undefined&&old<=nc)return;if(seen.size>=maxStates){stop='max-states';return;}seen.set(k,nc);nodes.push({s,cost:nc,clears:clearCount(c,s),parent:ni,drag:drag(p,side)});push(nodes.length-1);};
   for(let qi=0;qi<q.length;qi++){const p=q[qi],pose=b.poses[p],g=pose.exits[stage],openGate=g&&(!flips.has(g.id)||Boolean(flips.get(g.id))!==(n.clears%2===1));
    if(openGate){add(stage+1<b.layers.length?p|((stage+1)<<7):NONE,0,p,g.side);continue;}
    if(p!==pos)add(p|(stage<<7),1,p);
    for(const next of pose.neighbors)if(parents[next]===-1&&!overlap(b.poses[next].mask,occupied)){parents[next]=p;q.push(next);}
   }
   if(stop)break;
  }
  if(stop)break;
 }
 return{status:'unknown',states:seen.size,explored,transitions,milliseconds:Date.now()-start,stop:stop??'exhausted'};
}

export async function author(options={}){
 const lock=verifyRulesLock();assert(lock.ok,lock.errors.join('\n'));assert(['1.46.0','1.47.0'].includes(lock.activeVersion),'Reviewed v1.46 or its Lv190-only v1.47 extension required');
 const {api}=await loadApi(),baseline=JSON.parse(fs.readFileSync(BASELINE)),base=baseline.levels[161];
 assert.equal(digest(base.level),base.sha256);assert.deepEqual(base.geometry,{width:6,height:6});
 fs.mkdirSync(OUTPUT,{recursive:true});
 const sourcePath=options.source??process.env.SOURCE;
 assert(sourcePath,'Await independent source review; do not infer unknown source attributes.');
 const source=JSON.parse(fs.readFileSync(sourcePath));assert(Array.isArray(source.tiles)&&source.tiles.length,'Explicit adapted source-bound tiles required');
 const seed=options.seed??Number(process.env.SEED??146162),rng=seededRng(seed),pick=a=>a[Math.floor(rng.rand()*a.length)];
 const mutateInput=process.env.MUTATE?JSON.parse(fs.readFileSync(process.env.MUTATE)):null;
 for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only'));
 const colors=[...new Set(source.tiles.flatMap(b=>b.layers??[b.color]))],stats={attempts:0,valid:0,witness:0,proof:0,issues:{}};
 const fail=reason=>{stats.issues[reason]=(stats.issues[reason]??0)+1;return null;};
 function construct(){
  if(mutateInput){const l=structuredClone(mutateInput.level),all=[...l.gates,...l.flipDoors];
   for(let k=0;k<1+Math.floor(rng.rand()*2);k++){
    if(rng.rand()<0.45){const b=pick(l.blocks),peers=l.blocks.filter(a=>a.id!==b.id&&JSON.stringify(a.shape)===JSON.stringify(b.shape));if(peers.length){const other=pick(peers);[b.x,other.x]=[other.x,b.x];[b.y,other.y]=[other.y,b.y];}}
    else{const g=pick(all),side=pick(['left','right','top','bottom']),bs=l.blocks.filter(b=>(b.layers??[b.color]).includes(g.color)),size=Math.max(...bs.map(b=>1+Math.max(...b.shape.map(p=>['top','bottom'].includes(side)?p[0]:p[1]))));g.side=side;g.size=size;g.offset=Math.floor(rng.rand()*(7-size));}
   }
   try{api.validateLevel(l);const errors=api.auditRevisedCandidate(l,undefined).issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');if(errors.length)return fail(errors[0].code);}catch(e){return fail(e.message);}
   return l;
  }
  const level=structuredClone(base.level);for(const k of ['blocks','gates','flipDoors','shutters','generators','coloredGrids','elevators','conveyors'])delete level[k];
  level.blocks=[];level.gates=[];level.flipDoors=[];level.difficulty='hard';level.preservedMoveTarget=base.starTargets.moveTarget;
  const packed=pack(source.tiles,rect(6,6),rng,100,true);if(!packed)return fail('packing');
  level.blocks=packed.map(b=>({id:'v146-162-'+b.sourceId,x:b.x,y:b.y,shape:b.shape,color:b.color,...(b.layers?{layers:b.layers}:{})}));
  const occupied=new Set(),slots=[];for(const side of ['top','left','bottom','right'])for(const size of [1,2,3])for(let offset=0;offset+size<=6;offset++)slots.push({side,size,offset});
  for(const color of rng.shuffle([...colors])){const blocks=level.blocks.filter(b=>(b.layers??[b.color]).includes(color));
   const available=slots.filter(s=>!Array.from({length:s.size},(_,k)=>s.side+':'+(s.offset+k)).some(k=>occupied.has(k))&&blocks.every(b=>1+Math.max(...b.shape.map(p=>['top','bottom'].includes(s.side)?p[0]:p[1]))<=s.size)&&(process.env.MIN_GATE!=='1'||s.size===Math.max(...blocks.map(b=>1+Math.max(...b.shape.map(p=>['top','bottom'].includes(s.side)?p[0]:p[1]))))));
   if(!available.length)return fail('gate-slots');const s=pick(available);for(let k=0;k<s.size;k++)occupied.add(s.side+':'+(s.offset+k));
   const src=source.doors.find(g=>g.color===color);assert(src,'Every color is source-bound');const gate={id:'v146-162-gate-'+color,color,...s};if(src.flip)level.flipDoors.push({...gate,initiallyOpen:src.initiallyOpen});else level.gates.push(gate);
  }
  try{api.validateLevel(level);assert(api.auditCandidateBlockArt(level).passed);const errors=api.auditRevisedCandidate(level,undefined).issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile');if(errors.length)return fail(errors[0].code);}catch(e){return fail(e.message);}
  return level;
 }
 const deadline=Date.now()+Number(process.env.SECONDS??240)*1000;
 while(Date.now()<deadline){stats.attempts++;const level=construct();if(!level)continue;stats.valid++;
  const witness=searchFlipWitness(level,{maxCost:20,maxStates:100000,maxMilliseconds:Number(process.env.ROUTE_MS??1500),orderSeed:stats.attempts%level.blocks.length});if(witness.status!=='witness'||witness.cost<16)continue;
  const replay=api.replayRevisedRoute(level,witness.drags);if(!replay.valid||!replay.complete){fail('independent-replay:'+replay.error);continue;}stats.witness++;
  const projection=projectAdvancedFloor(level,api),proof=checkSymmetryFloor(projection.level,{floor:16,maxStates:Number(process.env.STATES??300000),maxMilliseconds:Number(process.env.PROOF_MS??3000)});
  if(proof.thresholdProven)stats.proof++;
  const out=path.join(OUTPUT,`candidate162-${seed}-${stats.attempts}-${Date.now()}.json`);
  fs.writeFileSync(out,JSON.stringify({activeRuleVersion:lock.activeVersion,seed,sourcePath,sourceSha256:digest(fs.readFileSync(sourcePath)),sourceAdaptation:source,level,drags:witness.drags,replay,projection:{...projection,level:undefined},proof,levelSha256:digest(level),routeSha256:digest(witness.drags),formalAdopted:false,pointerValidated:false},null,2),{flag:'wx'});
  console.log(JSON.stringify({out,upper:witness.cost,proof:proof.status,relaxedCost:proof.relaxedNonClearingDrags,attempts:stats.attempts,valid:stats.valid}));if(proof.thresholdProven)break;
 }
 const log=path.join(OUTPUT,`search-${seed}-${Date.now()}.json`);fs.writeFileSync(log,JSON.stringify({seed,...stats,sourcePath},null,2),{flag:'wx'});console.log(JSON.stringify({log,...stats}));return stats;
}

export async function check162(file){
 const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
 const {api,inputs}=await loadApi(),data=JSON.parse(fs.readFileSync(file)),l=data.level,baseline=JSON.parse(fs.readFileSync(BASELINE)).levels[161];
 assert.equal(l.id,162);for(const k of ['width','height','playable','blocked','seams','name','timeSeconds','reward','parMoves'])assert.deepEqual(l[k],baseline.level[k],k);
 assert.deepEqual(api.levelStarTargets(l),baseline.starTargets);assert.equal(l.difficulty,'hard');api.validateLevel(l);
 const allNative=l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0);assert(allNative);
 const hard=api.auditRevisedCandidate(l,undefined);assert.deepEqual(hard.issues.filter(i=>i.category!=='source'&&i.code!=='wrong-rule-profile'),[]);
 const audits={art:api.auditCandidateBlockArt(l),opening:auditOpeningCoverage(new api.PuzzleModel(l).snapshot()),hidden:auditHiddenCoverage(l),gateSpans:auditGateSpanLimits(l)};for(const a of Object.values(audits))assert(a.passed);
 const sourceReview='deliverables/remake161-170-v146-20260924/source-audit/source162-review.json',source=JSON.parse(fs.readFileSync(sourceReview));
 assert.equal(source.observedBodyCount,19);assert.equal(source.observedFootprintArea,48);
 assert.equal(l.flipDoors.length,5);for(const g of l.flipDoors){const s=source.flipDoorsObserved.find(s=>s.color===g.color);assert(s);assert.equal(g.initiallyOpen,s.open);}
 assert.deepEqual(l.blocks.filter(b=>b.layers).map(b=>b.layers).sort(),[['red','green'],['yellow','purple']].sort());
 assert.equal(l.blocks.length,15);assert.equal(l.blocks.reduce((n,b)=>n+b.shape.length,0),36);
 const replay=api.replayRevisedRoute(l,data.drags);assert(replay.valid&&replay.complete);assert(replay.nonClearingDrags>=16&&replay.nonClearingDrags<=20);
 const projection=projectAdvancedFloor(l,api),proof=checkSymmetryFloor(projection.level,{floor:16,maxStates:2000000,maxMilliseconds:30000});assert(proof.thresholdProven);
 const measurement=measureRoute(l,data.drags,api);assert(measurement.multiCellDrags>measurement.singleCellDrags);
 const act=(m,d)=>{m.beginAction();for(const p of d.path)if(!m.moveBlockStep(d.blockId,...p))return false;if(d.exitSide&&!m.tryExit(d.blockId,d.exitSide).ok)return false;return m.commitAction();};
 function paths(m,id){const b=m.getBlock(id);if(!b||!m.isBlockActive(b))return[];const snap=m.snapshot(),key=p=>p.join(','),q=[{p:[b.x,b.y],path:[]}],seen=new Set([key(q[0].p)]);
  const gateAt=p=>[...snap.gates,...snap.flipDoors.filter(g=>g.open)].some(g=>g.color===b.layers[0]&&!g.frozen&&api.matchingPortalForExitFrontier(snap,b.shape.map(([x,y])=>[p[0]+x,p[1]+y]),g));
  for(let i=0;i<q.length;i++){if(gateAt(q[i].p))continue;for(const[dx,dy]of[[0,-1],[1,0],[0,1],[-1,0]]){const p=[q[i].p[0]+dx,q[i].p[1]+dy];if(seen.has(key(p))||!m.canPlace(b,...p)||gateAt(p))continue;seen.add(key(p));q.push({p,path:[...q[i].path,p]});}}return q;
 }
 const model=new api.PuzzleModel(l);model.startCountdown();const decisions=[],mechanismSteps=[],doorChoices=[];
 for(let i=0;i<data.drags.length;i++){
  const d=data.drags[i],next=data.drags[i+1],before=model.snapshot(),b=model.getBlock(d.blockId);
  if(!d.exitSide&&next&&b.shape.length>1&&decisions.length<3){for(const q of paths(model,b.id)){if(!q.path.length||JSON.stringify(q.p)===JSON.stringify(d.path.at(-1)))continue;
    const wrong={blockId:b.id,path:q.path},branch=model.clone();if(!act(branch,wrong)||act(branch.clone(),next))continue;const back=paths(branch,b.id).find(v=>JSON.stringify(v.p)===JSON.stringify(d.path.at(-1)));if(!back?.path.length)continue;
    const recovery={blockId:b.id,path:back.path},full=[...data.drags.slice(0,i),wrong,recovery,...data.drags.slice(i+1)],r=api.replayRevisedRoute(l,full);if(!r.valid||!r.complete)continue;
    const wrongReplay=api.replayRevisedRoute(l,[...data.drags.slice(0,i),wrong]);if(!wrongReplay.valid)continue;
    const blocked=api.replayRevisedRoute(l,[...data.drags.slice(0,i),wrong,next]);if(blocked.valid)continue;
    decisions.push({atStep:i+1,blockId:b.id,area:b.shape.length,correctDrag:d,legalWrongParking:wrong,blockedNextAction:next,recoveryDrag:recovery,fullRecoveredRoute:full,blockedReason:blocked.error,recovered:r,provesGlobalDeadEnd:false});break;
  }}
  if(doorChoices.length<5)for(const body of before.blocks)for(const gate of before.flipDoors.filter(g=>!g.open&&g.color===body.layers[0])){
   const pose=paths(model,body.id).find(q=>api.matchingPortalForExitFrontier(before,body.shape.map(([x,y])=>[q.p[0]+x,q.p[1]+y]),gate));if(!pose)continue;
   const original=model.clone();if(pose.path.length&&!act(original,{blockId:body.id,path:pose.path}))continue;
   const relaxed=original.clone(),snap=relaxed.snapshot();snap.flipDoors.find(g=>g.id===gate.id).open=true;relaxed.restore(snap);
   const a=original.tryExit(body.id,gate.side),z=relaxed.tryExit(body.id,gate.side);if(!a.ok&&z.ok)doorChoices.push({beforeStep:i+1,blockId:body.id,doorId:gate.id,legalApproach:pose.path,formalClosedExit:a,oneDoorOpenExit:z,isolatedSingleAttributeContrast:true,globalDifficultyAttribution:false});
  }
  assert(act(model,d));const after=model.snapshot();if(after.cleared>before.cleared){assert(after.flipDoors.every(g=>g.open!==before.flipDoors.find(p=>p.id===g.id).open));mechanismSteps.push({step:i+1,blockId:b.id,kind:after.blocks.some(x=>x.id===b.id)?'peel':'body',fromColor:b.layers[0],afterColor:after.blocks.find(x=>x.id===b.id)?.layers[0],clearEvent:after.cleared,allFiveDoorsToggledOnce:true});}
 }
 assert(decisions.length);assert.equal(mechanismSteps.filter(x=>x.kind==='peel').length,2);assert.equal(mechanismSteps.length,17);assert(doorChoices.length);
 const final={activeRuleVersion:lock.activeVersion,seed:data.seed,sourceReview,sourceReviewSha256:digest(fs.readFileSync(sourceReview)),sourceOpeningStatus:source.status,
  sourceAdaptation:{...data.sourceAdaptation,status:'independently-reviewed-observed-first-frame-adaptation-not-pristine',sourceDiscrepancies:source.corrections??data.sourceAdaptation.sourceDiscrepancies,
   gateChanges:l.flipDoors.map(g=>({source:source.flipDoorsObserved.find(s=>s.color===g.color),design:g,reason:'Original exit layout on the preserved 6 by 6 board; retain each colour and initial open state. Green span 3 to 2 matches its full passable cross-section and fits the paired bottom row exits; other source widths retained.'}))},
  level:l,drags:data.drags,levelSha256:digest(l),routeSha256:digest(data.drags),design:{primaryMechanism:'五翻门状态与两壳的剥层后占位配合，跨列工作位安排。',concreteDecision:'中央绿H2和右侧蓝V2依次让路，先剥外层再重排通路；错停会阻断下一次多格拖动，有可回放补救路线。'},
  originality:{layoutIntent:'上部竖条与右上L/T齿形相接，下部双格竖条沿四列对齐，两个L3封住中线及右下角。',alignment:'顶部竖条共用y=0边界，下部五组块共用y=4边界；中央横H2形成横向工作位。',changes:'由竞品两侧长列、中部空槽改为满铺6×6的上下双区，移除原中央空槽，块邻接与出口侧配置重构；不是整体镜转或换色。'},
  decisionCases:decisions,mechanismSteps,doorChoices,formalAdopted:false,pointerValidated:false,humanBlindTested:false};
 const report={status:'candidate-model-and-lower-bound-pass-pending-pointer-and-source-opening-policy-review',activeRuleVersion:lock.activeVersion,input:file,inputSha256:digest(fs.readFileSync(file)),levelSha256:digest(l),routeSha256:digest(data.drags),audits,allNative,hardMeasurements:hard.measurements,replay,measurement,
  proof:{...proof,projection:{...projection,level:undefined}},lowerBound:16,upperBound:replay.nonClearingDrags,actualStarTargetsPreserved:baseline.starTargets,decisionCaseCount:decisions.length,doorChoiceCount:doorChoices.length,mechanismSteps,
  inputBindings:Object.fromEntries([...inputs,'tools/author162-v146.mjs','tools/campaign31-200-advanced-floor-v145.mjs','tools/remake21to30-symmetry-floor-v139.mjs',sourceReview,BASELINE].map(p=>[p,digest(fs.readFileSync(p))])),pointerValidated:false,formalAdopted:false,humanBlindTested:false,releaseApproved:false};
 const stamp=Date.now(),candidate=path.join(OUTPUT,`reviewed162-${stamp}.json`),checked=path.join(OUTPUT,`checked162-${stamp}.json`);fs.writeFileSync(candidate,JSON.stringify(final,null,2),{flag:'wx'});fs.writeFileSync(checked,JSON.stringify({...report,candidate},null,2),{flag:'wx'});console.log(JSON.stringify({candidate,checked,L:16,U:replay.nonClearingDrags,decisions:decisions.length,doorChoices:doorChoices.length}));return{candidate,checked};
}
if(process.argv[1]&&pathToFileURL(path.resolve(process.argv[1])).href===import.meta.url){if(process.argv[2]==='check')await check162(process.argv[3]);else await author();}
