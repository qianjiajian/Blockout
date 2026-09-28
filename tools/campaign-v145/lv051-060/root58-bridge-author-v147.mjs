import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadApi,geometry} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {auditSpatial} from '../../remake91to100-v146.mjs';
import {search} from './rebuild58-search.mjs';
import {checkImmediateGeneratorFloor,projectImmediateRoute} from './immediate-generator-floor56-v146.mjs';
import {seededRng,rect} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';

const DIR='deliverables/remake31-200-v145-20260924/batches/lv051-060/root58/bridge';
const BASE='deliverables/remake31-200-v145-20260924/baseline.json';
const sourceFile=process.argv[2];assert(sourceFile,'Pass a freshly reviewed source JSON');
const source=JSON.parse(fs.readFileSync(sourceFile)),facts=source.facts[58],baseline=JSON.parse(fs.readFileSync(BASE)).levels[57];
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.47.0');const {api,inputs}=await loadApi();
const shapes={SINGLE:[rect(1,1)],H2:[rect(2,1)],V2:[rect(1,2)],H3:[rect(3,1)],V3:[rect(1,3)],SQ2:[rect(2,2)],SQ3:[rect(3,3)],RECT6:[rect(2,3)],T4:[[[1,0],[0,1],[1,1],[2,1]]]};
for(const options of Object.values(shapes))for(const shape of options)assert.equal(api.matchFormalBlockShape(shape,'native-only')?.quarterTurns,0);
assert.equal(facts.opening.length,18);assert.equal(facts.queue.length,5);assert.equal(facts.opening.reduce((n,b)=>n+shapes[b.kind][0].length,0),48);
assert.equal(facts.opening.find(b=>b.sourceId==='i05a').color,'pink');assert.deepEqual(facts.opening.find(b=>b.sourceId==='i03').layers,['yellow','blue']);assert.equal(facts.queue[0].kind,'H2');
const seed=Number(process.env.SEED??58014701),rng=seededRng(seed),choose=a=>a[Math.floor(rng.rand()*a.length)],run=Date.now();let serial=0;
fs.mkdirSync(DIR,{recursive:true});const save=(label,d)=>{const p=`${DIR}/${label}-${run}-${++serial}.json`;fs.writeFileSync(p,JSON.stringify(d,null,2)+'\n',{flag:'wx'});return p;};
const meta=await build({entryPoints:['tools/campaign-v145/lv051-060/root58-bridge-author-v147.mjs'],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'}),bindPaths=[...new Set([...Object.keys(meta.metafile.inputs),...inputs,sourceFile,BASE,'docs/rules/manifest.json',`docs/mechanism-rules-v${lock.activeVersion}.md`])].sort();
const budgetMs=Number(process.env.SECONDS??300)*1000,searchMs=Number(process.env.SEARCH_MS??1300),proofMs=Number(process.env.PROOF_MS??12000),started=Date.now(),deadline=started+budgetMs;
const input=save('input',{createdAt:new Date().toISOString(),seed,sourceFile,ruleVersion:lock.activeVersion,budgetMs,searchMs,proofMs,bindings:Object.fromEntries(bindPaths.map(p=>[p,digest(fs.readFileSync(p))]))});
const cellKey=([x,y])=>`${x},${y}`,playable=baseline.level.playable,allowed=new Set(playable.map(cellKey));
const footprint=b=>b.shape.map(([x,y])=>[x+b.x,y+b.y]);
function fill(specs,fixed,maxNodes=3000){
 const used=new Set(fixed.flatMap(footprint).map(cellKey)),out=[...fixed],todo=rng.shuffle(structuredClone(specs));let nodes=0;
 function go(){if(++nodes>maxNodes||Date.now()>deadline)return false;if(!todo.length)return used.size===allowed.size;const cell=playable.find(p=>!used.has(cellKey(p)));if(!cell)return false;
  for(let i=0;i<todo.length;i++){const spec=todo[i];for(const shape of rng.shuffle([...shapes[spec.kind]]))for(const anchor of rng.shuffle([...shape])){
   const b={...spec,x:cell[0]-anchor[0],y:cell[1]-anchor[1],shape},pts=footprint(b),keys=pts.map(cellKey);if(keys.some(k=>!allowed.has(k)||used.has(k)))continue;
   const border=new Set(pts.flatMap(([x,y])=>[[x-1,y],[x+1,y],[x,y-1],[x,y+1]]).map(cellKey));if(out.some(a=>a.color===b.color&&footprint(a).some(p=>border.has(cellKey(p)))))continue;
   keys.forEach(k=>used.add(k));todo.splice(i,1);out.push(b);if(go())return true;out.pop();todo.splice(i,0,spec);keys.forEach(k=>used.delete(k));
  }}return false;
 }return go()?out:null;
}
function spans(level,color,side){const axis=['top','bottom'].includes(side)?0:1;return Math.max(...level.blocks.filter(b=>(b.layers??[b.color]).includes(color)).map(b=>Math.max(...b.shape.map(p=>p[axis]))+1));}
function gateOptions(level,color,machine){const out=[];for(const side of ['top','right','bottom','left']){const size=spans(level,color,side),limit=['top','bottom'].includes(side)?level.width:level.height;if(size>3)continue;
 for(let offset=0;offset+size<=limit;offset++){
  if(side===machine.side&&Array.from({length:size},(_,k)=>offset+k).some(t=>Math.abs(t-machine.offset)<=1))continue;
  const cells=Array.from({length:size},(_,k)=>side==='top'?[offset+k,0]:side==='bottom'?[offset+k,level.height-1]:side==='left'?[0,offset+k]:[level.width-1,offset+k]);
  if(cells.every(p=>allowed.has(cellKey(p))))out.push({side,offset,size});
 }}return out;}
function make(attempt){
 const l=structuredClone(baseline.level);for(const k of ['shutters','generators','featureIntro','hint','solution','staging','designTargets','flipDoors','coloredGrids','elevators','conveyors'])delete l[k];
 l.blocks=[];l.gates=[];l.difficulty='normal';l.preservedMoveTarget=baseline.starTargets.moveTarget;
 const machineOffset=choose([4,5]),machine={side:'left',offset:machineOffset,spawn:[0,machineOffset]};
 const palette=Object.keys(facts.gates),extras=[{sourceId:'fill0',kind:'RECT6',color:'blue'},{sourceId:'fill1',kind:'SQ2',color:'cyan'}];
 const asBlock=b=>({id:`r147-r58-${b.sourceId}`,x:b.x,y:b.y,shape:b.shape,color:b.color,...(b.frozen?{frozen:b.frozen}:{}),...(b.layers?{layers:b.layers}:{})});
 const queue=facts.queue.map(b=>({...b,color:b.sourceId==='q04'?'blue':b.color,x:machine.spawn[0],y:machine.spawn[1],shape:shapes[b.kind][0]}));
 l.blocks=queue.map(asBlock);const all=[...facts.opening,...extras];l.blocks.push(...all.map(b=>asBlock({...b,x:0,y:0,shape:shapes[b.kind][0]})));
 const yellowGate={side:'top',offset:0,size:3};
 const fixedSpecs=[['o02',0,0],['o04',0,1],['o01',2,1],['o03',0,2],['o06',3,0],['i03',0,3],['i12b',2,7]];
 const fixed=fixedSpecs.map(([id,x,y])=>{const spec=all.find(b=>b.sourceId===id);return {...spec,x,y,shape:shapes[spec.kind][0]};}),fixedYellow=fixed[0];
 const fixedIds=new Set(fixedSpecs.map(s=>s[0]));
 const packed=fill(all.filter(b=>!fixedIds.has(b.sourceId)),fixed,Number(process.env.PACK_NODES??3000));if(!packed)return null;
 l.blocks=[...packed.map(asBlock),...queue.map(asBlock)];l.generators=[{id:'r147-r58-generator',...machine,rimMount:'rim',rimSpan:3,queueBlockIds:queue.map(b=>`r147-r58-${b.sourceId}`)}];
 const used=new Set(),addGate=(color,g)=>{l.gates.push({id:`r147-r58-gate-${color}`,color,...g,...(facts.gates[color]?{frozen:facts.gates[color]}:{})});for(let i=0;i<g.size;i++)used.add(`${g.side}:${g.offset+i}`);};addGate('yellow',yellowGate);
 addGate('pink',{side:'left',offset:1,size:spans(l,'pink','left')});
 addGate('purple',{side:'top',offset:3,size:3});
 const remaining=rng.shuffle(palette.filter(c=>!['yellow','pink','purple'].includes(c))).map(color=>({color,options:rng.shuffle(gateOptions(l,color,machine))}));remaining.sort((a,b)=>a.options.length-b.options.length);
 function gates(i){if(i===remaining.length)return true;const {color,options}=remaining[i];for(const g of options){const keys=Array.from({length:g.size},(_,n)=>`${g.side}:${g.offset+n}`);if(keys.some(k=>used.has(k)))continue;addGate(color,g);if(gates(i+1))return true;l.gates.pop();keys.forEach(k=>used.delete(k));}return false;}
 if(!gates(0))return null;
 const prefix=[{blockId:'r147-r58-o02',path:[],exitSide:'top'},{blockId:'r147-r58-o04',path:[[0,0]]},{blockId:'r147-r58-o01',path:[[2,0]]},{blockId:'r147-r58-o03',path:[[0,1]],exitSide:'left'},{blockId:'r147-r58-o06',path:[],exitSide:'top'},{blockId:'r147-r58-o01',path:[[3,0]],exitSide:'top'},{blockId:'r147-r58-o04',path:[[1,0],[2,0],[3,0]]},{blockId:'r147-r58-i03',path:[[0,2],[0,1],[0,0]],exitSide:'top'}];
 let prefixReplay;try{assert.deepEqual(geometry(l),baseline.geometry);assert.deepEqual(api.levelStarTargets(l),baseline.starTargets);api.validateLevel(l);assert(l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));if(!auditSpatial(l,api).passed)return null;prefixReplay=api.replayRevisedRoute(l,prefix);assert(prefixReplay.valid&&prefixReplay.clearEvents===5&&prefixReplay.nonClearingDrags===3);}catch{return null;}
 return {level:l,seed,construction:{tool:'tools/campaign-v145/lv051-060/root58-bridge-author-v147.mjs',input,attempt,seed,fixedSQ3:fixed.find(b=>b.sourceId==='i12b'),initialYellow:fixedYellow,ordinaryFillerKinds:extras.map(b=>b.kind),verifiedOpeningPrefix:prefix,verifiedOpeningReplay:prefixReplay},activeRuleVersion:lock.activeVersion,sourceReview:sourceFile,sourceReviewSha256:digest(fs.readFileSync(sourceFile)),sourceFacts:facts,sourceAdaptation:{extraOpeningCells:10,addedOrdinaryBlocks:extras,corrections:[...(facts.corrections??[]),'源重复两扇红16，仅保一扇同初值红16；队列第4件红V2改蓝V2，完整库存及其它已知属性保持。'],orientationAdaptations:(source.orientationAdaptations??[]).filter(x=>x.level===58)},originality:{layoutIntent:'从更正的源清单重新精确铺图：黄蓝紫粉组成左上分层通路，先释放粉H3第三列工作位，再给黄壳蓝芯腾空；青SQ2与蓝2×3矩形填满内部，冰12蓝大方块守住尾部，七色口共同重配。',alignment:'保7×10 T形实际棋盘，原向矩形条带组成规整块组。'},design:{primaryMechanism:'冰块/冰门计数和黄壳蓝芯停车为核心，固定队列作为辅助，实际作用须逐路线核验。',concreteDecision:'多格通路的释放与蓝芯停车；具体队列停车选择仅在实际路线证据支持时列出。'}};
}
const reproduceFile=process.env.REPRODUCE,expected=reproduceFile?JSON.parse(fs.readFileSync(reproduceFile)):null;
if(expected){assert.equal(seed,expected.seed);assert.equal(expected.sourceReviewSha256,digest(fs.readFileSync(sourceFile)));}
const counts={attempts:0,valid:0,witness:0,tooEasy:0,unknown:0,rejected:0,proven:0},rows=[],seen=new Set();console.log(JSON.stringify({input,sourceCarriers:facts.opening.length+facts.queue.length,sourceLayers:facts.opening.reduce((n,b)=>n+(b.layers?.length??1),0)+facts.queue.length}));
while(Date.now()<deadline){const d=make(++counts.attempts);if(expected){if(counts.attempts===expected.construction.attempt){assert(d,'Expected attempt did not construct');assert.deepEqual(d.level,expected.level);const report=save('reproduction',{createdAt:new Date().toISOString(),input,reproducedFile:reproduceFile,reproducedFileSha256:digest(fs.readFileSync(reproduceFile)),levelSha256:digest(d.level),seed,attempt:counts.attempts,levelExactMatch:true,noRouteSearchRun:true,sourceReview:sourceFile,sourceReviewSha256:digest(fs.readFileSync(sourceFile)),prefixReplay:d.construction.verifiedOpeningReplay});console.log(JSON.stringify({reproduction:report,levelExactMatch:true}));process.exit(0);}continue;}if(!d)continue;const hash=digest(d.level);if(seen.has(hash))continue;seen.add(hash);counts.valid++;
 const r=search(d.level,{floor:16,maxStates:180000,maxMilliseconds:Math.max(1,Math.min(searchMs,deadline-Date.now())),weight:10,orderSeed:counts.valid%d.level.blocks.length});
 if(r.status!=='witness'){let probe;if(process.env.DIAGNOSTIC&&rows.length<20){const partialReplay=api.replayRevisedRoute(d.level,r.partialDrags);assert(partialReplay.valid);probe=save('partial-probe',{...d,search:r,partialReplay,complete:false});}rows.push({attempt:counts.attempts,levelSha256:hash,status:r.status,stop:r.stop,states:r.states,clears:r.maxClears??null,partialCost:r.partialCost,probe});continue;}
 const replay=api.replayRevisedRoute(d.level,r.drags);assert(replay.valid&&replay.complete);counts.witness++;if(replay.nonClearingDrags<11){counts.tooEasy++;continue;}
 const candidate=save('candidate',{...d,drags:r.drags,replay,search:r}),projection=projectImmediateRoute(d.level,r.drags,api);
 const proof=checkImmediateGeneratorFloor(d.level,api,{floor:11,maxStates:300000,maxMilliseconds:Math.max(1,Math.min(proofMs,deadline-Date.now()))}),shortcutReplay=proof.relaxedRoute?api.replayRevisedRoute(d.level,proof.relaxedRoute):null;
 const report=save('proof',{checkedAt:new Date().toISOString(),candidate,input,levelSha256:hash,routeSha256:digest(r.drags),projection,proof,shortcutReplay,pointerValidated:false,formalAdopted:false});
 if(shortcutReplay?.valid&&shortcutReplay.complete&&shortcutReplay.nonClearingDrags<11)counts.rejected++;else if(proof.thresholdProven)counts.proven++;else counts.unknown++;
 const row={candidate,report,upper:replay.nonClearingDrags,status:proof.status,realShortcut:shortcutReplay?.valid&&shortcutReplay.complete?shortcutReplay.nonClearingDrags:null};rows.push(row);console.log(JSON.stringify(row));if(proof.thresholdProven)break;
}
const summary=save('summary',{finishedAt:new Date().toISOString(),input,counts,rows,fullBatchValidated:false,formalAdopted:false});console.log(JSON.stringify({summary,counts}));
assert(!expected,'Reproduction budget ended before the target attempt');
