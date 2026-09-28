import assert from 'node:assert/strict';
import {digest} from '../../../revised-preview-validation-v160.mjs';
import {checkSymmetryFloor} from '../../../remake21to30-symmetry-floor-v139.mjs';
import {checkAxisFloor} from '../../../remake131to140-axis-floor-v172.mjs';
import {loadSpatialApi,searchSpatial} from '../../../remake111to120-spatial-floor-v147.mjs';

/** Cost-nonincreasing projection, not a modified production level.
 * Let Q be every body in every finite fixed automatic queue and N the sum of
 * all its color stages. Remove Q and the machines, prepay N clear events into
 * EVERY gate/curtain count, and reduce EVERY numeric body ice by N as well.
 * At a corresponding prefix let p be retained clear/peel events, q queue events:
 * 0<=q<=N. Gates open no later since F-N-p <= F-p-q. A countdown R reveals in
 * projection at retained event max(0,R-N), never after its real reveal. Before
 * real reveal, its stationary projected members occupy only the old forbidden
 * region; after real reveal their positions agree until their real actions.
 * Ice of a retained visible body is reduced initially by N. After projected
 * reveal it ages on p-events; omitted q-events total at most N, so this ice is
 * never larger than real ice (the earlier reveal can only further help).
 * Queue gestures map to stutters. Every retained held path and its exit/peel
 * maps to the same path/stage: fewer obstacles and no later activation. Axes,
 * full shapes and gate capacities are unchanged. Optional contact in the bound
 * graph permits old paths despite gates opening earlier. Costs are unchanged
 * on retained gestures and zero for stutters, and a real win maps to a win.
 * Thus min(real non-clear gestures) >= min(projected optional-contact graph).
 * This relies on disjoint fixed countdown regions, no moving/lift masks, no
 * keys/stars/flip/grid/timers, and no ice/hidden queue items. Unsupported fails.
 */
export function projectPrepaidQueues(level,api){
 api.validateLevel(level);assert.equal(level.mechanismRules,'revised-2026-09-23-v1.4');
 for(const k of ['seams','flipDoors','coloredGrids','elevators','conveyors'])assert(!level[k]?.length,'Unsupported '+k);
 assert(level.generators?.length>0,'Requires real automatic queues');
 const allowedBlock=new Set(['id','x','y','shape','color','layers','frozen','shutterId','movementAxis','generatorId']);
 for(const b of level.blocks){assert(Object.keys(b).every(k=>allowedBlock.has(k)),'Unsupported block field '+b.id);assert((b.layers??[b.color]).length<=2);if(b.movementAxis)assert.equal(b.shape.length,(1+Math.max(...b.shape.map(p=>p[0])))*(1+Math.max(...b.shape.map(p=>p[1]))),'Axis must be a full rectangle');}
 for(const g of level.gates)assert(Object.keys(g).every(k=>['id','color','side','offset','size','frozen','portals'].includes(k)),'Unsupported gate field');
 const coverCells=new Set();for(const s of level.shutters??[]){assert(Object.keys(s).every(k=>['id','x','y','width','height','count','skin'].includes(k)));assert(!s.skin||s.skin==='shutter','Lift unsupported');assert(Number.isSafeInteger(s.count)&&s.count>0);for(let y=s.y;y<s.y+s.height;y++)for(let x=s.x;x<s.x+s.width;x++){const k=`${x},${y}`;assert(!coverCells.has(k),'Overlapping curtains unsupported');coverCells.add(k);}}
 const ids=[];for(const g of level.generators){assert(Object.keys(g).every(k=>['id','side','offset','rimSpan','rimMount','spawn','queueBlockIds','trigger'].includes(k)),'Unsupported generator field');assert(!g.trigger||g.trigger==='move','Only automatic space/FIFO machines');assert(g.queueBlockIds.length);ids.push(...g.queueBlockIds);}
 assert.equal(new Set(ids).size,ids.length,'Queue identities must be unique');const queued=new Set(ids);let N=0;
 for(const id of ids){const b=level.blocks.find(b=>b.id===id);assert(b&&!b.frozen&&!b.shutterId,'Queue ice/hidden item unsupported');N+=(b.layers??[b.color]).length;}
 for(const b of level.blocks)assert(!b.generatorId||queued.has(b.id),'Unlisted generator item');
 for(const b of level.blocks.filter(b=>!queued.has(b.id))){const owner=(level.shutters??[]).find(s=>s.id===b.shutterId);assert(!b.shutterId||owner);if(owner)assert(b.shape.every(([dx,dy])=>b.x+dx>=owner.x&&b.x+dx<owner.x+owner.width&&b.y+dy>=owner.y&&b.y+dy<owner.y+owner.height),'Hidden footprint must be contained in its fixed curtain');else assert(b.shape.every(([dx,dy])=>!coverCells.has(`${b.x+dx},${b.y+dy}`)),'Opening body intersects closed curtain');}
 const projected=structuredClone(level);delete projected.generators;projected.blocks=projected.blocks.filter(b=>!queued.has(b.id));assert(projected.blocks.length,'Empty projection unsupported');
 const subtract=(object,key)=>{if(object[key]){object[key]=Math.max(0,object[key]-N);if(!object[key])delete object[key];}};
 for(const g of projected.gates)subtract(g,'frozen');for(const b of projected.blocks){delete b.generatorId;subtract(b,'frozen');}
 const removed=new Set();projected.shutters=(projected.shutters??[]).flatMap(s=>{s.count-=N;if(s.count<=0){removed.add(s.id);return[];}return[s];});
 for(const b of projected.blocks)if(removed.has(b.shutterId))delete b.shutterId;
 api.validateLevel(projected);new api.PuzzleModel(projected);
 return {level:projected,sourceLevelSha256:digest(level),projectedLevelSha256:digest(projected),removedQueueIds:ids,prepaidClearEvents:N,removedCurtainIds:[...removed],projection:'all-real-queue-stages-prepaid-all-counters-and-all-body-ice-v172'};
}
export async function checkPrepaidQueueFloor(level,api,options={}){
 let projection;try{projection=projectPrepaidQueues(level,api);}catch(e){return{status:'unsupported',thresholdProven:false,reason:e.message};}
 const l=projection.level,spatial=l.width*l.height>96||l.gates.some(g=>g.portals),axis=l.blocks.some(b=>b.movementAxis);
 const backend=spatial?'full-spatial128-v147':axis?'axis-v172':'symmetry96-v139';
 const proof=spatial?searchSpatial(l,await loadSpatialApi(),{...options,prove:true,normalize:false}):axis?checkAxisFloor(l,api,options):checkSymmetryFloor(l,options);
 return {...proof,backend,sourceLevelSha256:projection.sourceLevelSha256,projection,solvabilityValidated:false,pointerValidated:false,timeValidated:false,releaseApproved:false};
}
export function projectRoute(projection,drags){const ids=new Set(projection.removedQueueIds);return drags.filter(d=>!ids.has(d.blockId));}
export function checkProjectedRoute(level,drags,api){
 const projection=projectPrepaidQueues(level,api),real=new api.PuzzleModel(level),relaxed=new api.PuzzleModel(projection.level),queue=new Set(projection.removedQueueIds);real.startCountdown();relaxed.startCountdown();let realCost=0,projectedCost=0,stutters=0,unitSteps=0;
 for(const d of drags){const a=real.snapshot().cleared,b=relaxed.snapshot().cleared;real.beginAction();if(!queue.has(d.blockId))relaxed.beginAction();else stutters++;
  for(const p of d.path){assert(real.moveBlockStep(d.blockId,...p));if(!queue.has(d.blockId))assert(relaxed.moveBlockStep(d.blockId,...p));unitSteps++;}
  if(d.exitSide){assert(real.tryExit(d.blockId,d.exitSide).ok);if(!queue.has(d.blockId))assert(relaxed.tryExit(d.blockId,d.exitSide).ok);}
  assert(real.commitAction());if(!queue.has(d.blockId)){assert(relaxed.commitAction());projectedCost+=Number(relaxed.snapshot().cleared===b);}realCost+=Number(real.snapshot().cleared===a);
 }
 assert(real.snapshot().complete&&relaxed.snapshot().complete);assert(projectedCost<=realCost);return{passed:true,realCost,projectedCost,realDrags:drags.length,projectedDrags:drags.length-stutters,stutters,unitSteps,sourceLevelSha256:projection.sourceLevelSha256,projectedLevelSha256:projection.projectedLevelSha256};
}
