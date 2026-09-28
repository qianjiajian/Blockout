import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi} from '../../native-block-repair-v143.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {SHAPES,rect,pack,seededRng} from '../../../deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs';
import {search} from './campaign-axis-key-search-v146.mjs';
import {checkAxisKeyFloor} from './campaign-axis-key-floor-v146.mjs';
import {auditSpatial} from '../../remake91to100-v146.mjs';
const out='deliverables/remake31-200-v145-20260924/batches/lv051-060/root54';
const baseline=JSON.parse(fs.readFileSync('deliverables/remake31-200-v145-20260924/baseline.json'));
const lock=verifyRulesLock();assert(lock.ok);assert(['1.46.0','1.47.0'].includes(lock.activeVersion));
const {api}=await loadApi();
SHAPES.CROSS5=[api.FORMAL_BLOCK_SHAPES.find(s=>s.shapeId===12).cells];
for(const k of Object.keys(SHAPES))SHAPES[k]=SHAPES[k].filter(s=>api.matchFormalBlockShape(s,'native-only')?.quarterTurns===0);
const spec=(sourceId,kind,color,extra={})=>({sourceId,kind,color,...extra});
const opening=[spec('o-yellow-square','SQ2','yellow'),spec('o-green','H2','green'),spec('o-red','SINGLE','red'),spec('o-yellow1','SINGLE','yellow'),spec('o-purple','H2','purple'),spec('o-red-ice','V2','red',{frozen:3}),spec('o-blue-ice','V2','blue',{frozen:2}),spec('o-yellow2','SINGLE','yellow'),spec('o-blue','SINGLE','blue')];
const hidden5=[spec('5-yellow','H2','yellow'),spec('5-green','SQ2','green'),spec('5-cyan','V3','cyan'),spec('5-purple','V3','purple')];
const hidden8=[spec('8-yellow','H2','yellow',{frozen:2}),spec('8-blue','SQ2','blue',{layers:['blue','cyan']}),spec('8-green','V3','green'),spec('8-purple','V3','purple',{layers:['purple','cyan']})];
const hidden13=[spec('13-purple','L3','purple'),spec('13-yellow','BAR3','yellow',{layers:['yellow','cyan'],sourceKind:'L3'}),spec('13-cyan','L3','cyan',{frozen:4}),spec('13-green','BAR3','green',{layers:['green','cyan'],frozen:4,sourceKind:'L3'}),spec('13-purple-shell','H3','purple',{layers:['purple','cyan']}),spec('13-red-single','SINGLE','red',{frozen:9}),spec('13-blue-axis','L3','blue',{frozen:7,movementAxis:'horizontal'}),spec('13-red','V2','red',{frozen:7})];
const hidden21=[spec('21-green','CROSS5','green')];
const source={level:54,truthFile:'deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json',video:'C:/Users/Administrator/Desktop/block out/参考视频/51-60.mp4',frames:[131,145,149,156,158,171,175,186,202,206,243].map(n=>{const p='.codex-temp/video-audit-41-70/frames-51-60/frame-'+String(n).padStart(4,'0')+'.jpg';return{second:n,path:p,sha256:digest(fs.readFileSync(p))};}),opening,hidden5,hidden8,hidden13,hidden21,gates:[['yellow',0],['green',6],['blue',3],['red',10],['purple',14],['cyan',22]],curtains:[{count:5,area:12,blocks:4},{count:8,area:12,blocks:4},{count:13,area:21,blocks:8},{count:21,area:9,blocks:1,coveredCells:5}],corrections:['首次稳定开局frame131有9体16格；冰3红V2/冰2深蓝V2，左侧冰3为出口不可重复记为块。黄色是SQ2，不是L3。','帘8初揭frame156可见greenV3；frame158它已被拖出。该层实际4体12格满铺，不能由晚帧误认空3格。yellowH2初冰2，blueSQ2及purpleV3壳内均cyan。','帘13为8体21格，冰4 cyanL3/green壳L3、冰9redS、冰7blue横轴L3/redV2；yellowL3/greenL3/purpleH3均壳内cyan。','帘21首揭frame206只有greenCROSS5，四角确为空；原向保留CROSS并在本候选补4个无机制普通角块以满足逐层满铺。','实际全关26源体，8冰、5壳、1隐藏横轴。旧truth的汇总和stage计数未覆盖这些事实，原文件保持只读。'],adaptations:['隐藏yellow/green两件L3壳没有完整壳图，仅保同面积/同色层/同冰的H3或V3完整壳图；其余L3采用现有shape4原向形状，不旋转贴图。','保原7×10全矩形；改变区域侧别/顺序、内部块邻接及出口通路。21帘四角补4个普通单格，属性不添机关。'],unknowns:[]};
source.truthSha256=digest(fs.readFileSync(source.truthFile));
source.hidden13=hidden13.map(({sourceKind,...b})=>({...b,kind:sourceKind??b.kind}));
source.adaptations.push('两件壳改为同面积完整壳图后，其余三件同一原向L3无法铺满21格矩形；独立穷举3×7与7×3均无解。额外仅将无机制purple L3改为同面积H3/V3，保冰、壳、横轴全部配对；不冒称M11数量精确复制。');
function tileExactly(specs,w,h){
 const all=(1n<<BigInt(w*h))-1n,memo=new Set();let states=0;const placements=specs.map(b=>SHAPES[b.kind].flatMap(shape=>{const ww=1+Math.max(...shape.map(p=>p[0])),hh=1+Math.max(...shape.map(p=>p[1])),p=[];for(let y=0;y+hh<=h;y++)for(let x=0;x+ww<=w;x++)p.push({x,y,shape,mask:shape.reduce((v,[dx,dy])=>v|(1n<<BigInt(x+dx+(y+dy)*w)),0n)});return p;}));
 const go=(mask,used)=>{states++;if(mask===all)return[];const key=mask+':'+used;if(memo.has(key))return null;memo.add(key);let cell=0;while(mask&(1n<<BigInt(cell)))cell++;for(let i=0;i<specs.length;i++)if(!(used&(1<<i)))for(const p of placements[i])if((p.mask&(1n<<BigInt(cell)))&&!(p.mask&mask)){const rest=go(mask|p.mask,used|(1<<i));if(rest)return[{sourceId:specs[i].sourceId,x:p.x,y:p.y,shape:p.shape},...rest];}return null;};
 const layout=go(0n,0);return{width:w,height:h,exhaustive:true,states,tilingExists:layout!==null,layout};
}
source.nativeTilingCertificate={scope:'Colour-unconstrained exact whole native footprints after the two unavoidable shell-art substitutions; all rectangular 21-cell dimensions that fit the retained board.',original:[tileExactly(hidden13,3,7),tileExactly(hidden13,7,3)],oneExtraSubstitution:tileExactly(hidden13.map(s=>s.sourceId==='13-purple'?{...s,kind:'BAR3'}:s),7,3)};
assert(source.nativeTilingCertificate.original.every(r=>!r.tilingExists));assert(source.nativeTilingCertificate.oneExtraSubstitution.tilingExists);
const write=(name,data)=>{fs.mkdirSync(out,{recursive:true});const p=out+'/'+name+'-'+Date.now()+'.json';fs.writeFileSync(p,JSON.stringify(data,null,2)+'\n',{flag:'wx'});return p;};
const rng=seededRng(Number(process.env.SEED??1465401)),pick=a=>a[Math.floor(rng.rand()*a.length)],failures={};
const fail=k=>{failures[k]=(failures[k]??0)+1;return null;};
function make(){
 const old=baseline.levels[53],l=structuredClone(old.level);l.difficulty='normal';l.preservedMoveTarget=old.starTargets.moveTarget;l.blocks=[];l.gates=[];for(const k of ['generators','construction','designTargets','hintPlan'])delete l[k];
 const left=rng.rand()<.5,tx=left?0:4,wx=left?3:0,flip=rng.rand()<.5;
 const a={id:'s54-cover5',x:wx,y:flip?7:0,width:4,height:3,count:5},b={id:'s54-cover8',x:wx,y:flip?0:7,width:4,height:3,count:8},c={id:'s54-cover13',x:tx,y:flip?3:0,width:3,height:7,count:13},d={id:'s54-cover21',x:tx,y:flip?0:7,width:3,height:3,count:21};l.shutters=[a,b,c,d];
 const cells=s=>rect(s.width,s.height).map(([x,y])=>[x+s.x,y+s.y]);
 const convert=(b,s)=>{const {sourceId,kind,sourceKind,id,...rest}=b;return{id:'s54-'+sourceId,...rest,...(s?{shutterId:s.id}:{})};};
 const openCells=l.playable.filter(([x,y])=>!l.shutters.some(s=>x>=s.x&&x<s.x+s.width&&y>=s.y&&y<s.y+s.height));
 const outerX=wx===0?0:6,first={...opening.find(b=>b.sourceId==='o-yellow-square'),x:wx===0?0:5,y:3,shape:SHAPES.SQ2[0]},blue={...opening.find(b=>b.sourceId==='o-blue-ice'),x:outerX,y:5,shape:SHAPES.V2[0]};
 const occupiedOpening=new Set([first,blue].flatMap(b=>b.shape.map(([dx,dy])=>[b.x+dx,b.y+dy].join(','))));
 const p=pack(opening.filter(b=>![first.sourceId,blue.sourceId].includes(b.sourceId)),openCells.filter(p=>!occupiedOpening.has(p.join(','))),rng,4000,true);if(!p)return fail('opening');l.blocks.push(...[first,blue,...p].map(b=>convert(b)));
 for(const [s,items]of [[a,hidden5],[b,hidden8],[c,hidden13.map(b=>b.sourceId==='13-purple'?{...b,kind:'BAR3'}:b)]]){let remaining=cells(s),specs=items;if(s===c){const axis={...items.find(b=>b.sourceId==='13-blue-axis'),x:c.x+1,y:5,shape:SHAPES.L3[0]},used=new Set(axis.shape.map(([dx,dy])=>[axis.x+dx,axis.y+dy].join(',')));l.blocks.push(convert(axis,s));specs=items.filter(b=>b.sourceId!==axis.sourceId);remaining=remaining.filter(p=>!used.has(p.join(',')));}const q=pack(specs,remaining,rng,5000,false);if(!q)return fail('hidden-'+s.count);l.blocks.push(...q.map(b=>convert(b,s)));}
 l.blocks.push({id:'s54-21-green',x:d.x,y:d.y,shape:SHAPES.CROSS5[0],color:'green',shutterId:d.id});
 const fillColors=rng.shuffle(['red','yellow','blue','purple']);for(const [i,[x,y]]of [[0,0],[2,0],[0,2],[2,2]].entries())l.blocks.push({id:'s54-fill-'+i,x:d.x+x,y:d.y+y,shape:[[0,0]],color:fillColors[i],shutterId:d.id});
 const slots=[];for(const side of ['left','right','top','bottom'])for(const size of [1,2,3])for(let offset=0;offset+size<=(['left','right'].includes(side)?l.height:l.width);offset++)slots.push({side,offset,size});const occupied=new Set();
 const gs=[...source.gates].sort((a,b)=>Number(b[0]==='blue')-Number(a[0]==='blue'));
 for(const [color,frozen]of gs){const bs=l.blocks.filter(b=>(b.layers??[b.color]).includes(color)),options=rng.shuffle(slots.filter(g=>!Array.from({length:g.size},(_,i)=>g.side+':'+(g.offset+i)).some(k=>occupied.has(k))&&Array.from({length:g.size},(_,i)=>g.side==='left'?[0,g.offset+i]:g.side==='right'?[6,g.offset+i]:g.side==='top'?[g.offset+i,0]:[g.offset+i,9]).every(([x,y])=>!l.shutters.some(s=>s.count>frozen&&x>=s.x&&x<s.x+s.width&&y>=s.y&&y<s.y+s.height))&&bs.every(b=>{const hz=['left','right'].includes(g.side),span=1+Math.max(...b.shape.map(p=>p[hz?1:0]));return span<=g.size&&(!b.movementAxis||(hz&&b.y>=g.offset&&b.y+span<=g.offset+g.size));})));if(!options.length)return fail('gates');const g=options[0];for(let i=0;i<g.size;i++)occupied.add(g.side+':'+(g.offset+i));l.gates.push({id:'s54-gate-'+color,color,...g,...(frozen?{frozen}:{})});}
 try{const audit=auditSpatial(l,api);if(!audit.passed)return fail('audit-'+JSON.stringify(audit.issues).slice(0,150));}catch(e){return fail(e.message);}return l;
}
const [mode='generate',arg]=process.argv.slice(2);
if(mode==='diagnose'){console.log(JSON.stringify(Object.fromEntries(Object.entries(SHAPES).map(([k,s])=>[k,s.length]))));for(const changed of [null,...hidden13.filter(s=>s.kind==='L3').map(s=>s.sourceId)])for(const [w,h]of [[3,7],[7,3]]){const specs=hidden13.map(s=>s.sourceId===changed?{...s,kind:'BAR3'}:s),p=pack(specs,rect(w,h),rng,3000000,false);console.log(JSON.stringify({changed,w,h,p}));}}
else if(mode==='source')console.log(write('source-review54',source));
else if(mode==='reconstruct'){
 const d=JSON.parse(fs.readFileSync(arg));assert.equal(Number(process.env.SEED),d.seed);let level;for(let i=1;i<=d.attempts;i++)level=make();assert(level);assert.equal(digest(level),digest(d.level));
 const snapshot='tools/campaign-v145/lv051-060/author-reproduction54-'+Date.now()+'.mjs';fs.writeFileSync(snapshot,fs.readFileSync(process.argv[1]),{flag:'wx'});
 const dependencies=[snapshot,'deliverables/remake21-30-v139-20260924/agent28-30/packing.mjs','src/game/formalBlockShapes.ts'].map(file=>({file,sha256:digest(fs.readFileSync(file))}));
 console.log(write('reconstruction54',{status:'PASS',seed:d.seed,attempts:d.attempts,candidate:arg,levelSha256:digest(level),sourceSha256:digest(source),dependencies,command:`SEED=${d.seed} node ${snapshot} reconstruct ${arg}`,note:'Fresh deterministic construction reproduces exact level; search timing is not needed to reproduce the board.'}));
}
else if(mode==='generate'){
 const end=Date.now()+Number(process.env.SECONDS??180)*1000;let attempts=0,valid=0,witnesses=0,maxClears=-1;
 while(Date.now()<end){attempts++;const l=make();if(!l)continue;valid++;const r=search(l,{floor:Number(process.env.ROUTE_CAP??16),maxStates:Number(process.env.SEARCH_STATES??120000),maxMilliseconds:Number(process.env.SEARCH_MS??1000),weight:Number(process.env.WEIGHT??1000)});if(r.status!=='witness'){fail('route-'+r.status+'-'+r.maxClears);if(r.maxClears>maxClears){maxClears=r.maxClears;const p=write('diagnostic54',{level:l,search:r,sourceReview:source,notCertified:true});console.log(JSON.stringify({diagnostic:p,maxClears,cost:r.partialCost}));}continue;}const replay=api.replayRevisedRoute(l,r.drags);if(!replay.valid||!replay.complete){fail('replay');continue;}if(replay.nonClearingDrags<11){fail('low');continue;}witnesses++;const proof=checkAxisKeyFloor(l,{floor:11,maxStates:500000,maxMilliseconds:5000});const p=write('draft54',{ruleVersion:lock.activeVersion,seed:Number(process.env.SEED??1465401),attempts,level:l,drags:r.drags,replay,proof,sourceReview:source,levelSha256:digest(l),routeSha256:digest(r.drags),sourceSha256:digest(source),formalAdopted:false,pointerValidated:false});console.log(JSON.stringify({p,U:replay.nonClearingDrags,proof:proof.status,attempts,valid,witnesses}));if(proof.thresholdProven&&replay.nonClearingDrags<=15)break;}
 console.log(JSON.stringify({attempts,valid,witnesses,failures}));
}else if(mode==='prove'){const d=JSON.parse(fs.readFileSync(arg)),proof=checkAxisKeyFloor(d.level,{floor:11,maxStates:3000000,maxMilliseconds:180000});console.log(write('proof54',{candidate:arg,levelSha256:digest(d.level),proof}));console.log(JSON.stringify(proof));}
else throw Error('source | generate | prove PATH');
