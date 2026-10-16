import {buildGlobalCandidate,boardCells,digest,random} from './diversity-layout-factory.mjs';
import {intensityTargets} from './mechanism-intensity.mjs';

export const ICE_FIRST_FACTORY_VERSION='whole-board-ice-before-first-search-v1';
const center=b=>[b.x+(1+Math.max(...b.shape.map(p=>p[0])))/2,b.y+(1+Math.max(...b.shape.map(p=>p[1])))/2];
const shuffle=(a,r)=>a.map(x=>({x,k:r()})).sort((a,b)=>a.k-b.k).map(x=>x.x);
function openingExit(b,g,l){
  const w=1+Math.max(...b.shape.map(p=>p[0])),h=1+Math.max(...b.shape.map(p=>p[1]));
  const horizontal=['top','bottom'].includes(g.side),offset=horizontal?b.x:b.y,span=horizontal?w:h;
  return offset>=g.offset&&offset+span<=g.offset+g.size&&(g.side==='top'?b.y===0:g.side==='bottom'?b.y+h===l.height:g.side==='left'?b.x===0:b.x+w===l.width);
}
function capacity(level){
  const gateIce=new Map(level.gates.map(g=>[g.color,g.frozen??0]));
  const thresholds=level.blocks.map(b=>Math.max(b.frozen??0,gateIce.get(b.color)??0)).sort((a,b)=>a-b);
  let possible=0;
  for(const value of thresholds){if(value>possible)return{pass:false,possibleBodies:possible,unreachableCounter:value};possible++;}
  return{pass:true,possibleBodies:possible};
}
function combinations(a,n,prefix=[],out=[]){
  if(prefix.length===n){out.push(prefix);return out;}
  for(let i=0;i<a.length;i++)combinations(a.slice(i+1),n,[...prefix,a[i]],out);
  return out;
}

/** Real ice is placed before this physical input has had any puzzle search.
 * Capacity is only an optimistic event-count check, never a difficulty proof.
 * The resulting object must claim the shared ledger and use the qualified
 * ice-aware joint search once. No old ordinary failure may be passed here.
 */
export function buildIceFirstCandidate(source,runtime,options={}){
  const {seed=1,mechanism='numeric-ice',targetDifficulty=3}=options;
  if(!['numeric-ice','frozen-exit'].includes(mechanism))throw Error('Ice-first factory only supports the qualified static ice domain');
  const targets=intensityTargets(mechanism,targetDifficulty),n=targets.instances;
  const base=buildGlobalCandidate(source,runtime,options);
  if(!base.ok)return base;
  const level=structuredClone(base.level),r=random(seed^0x237bc901);
  const immediate=level.blocks.filter(b=>level.gates.some(g=>g.color===b.color&&openingExit(b,g,level)));
  if(!immediate.length)return{ok:false,phase:'ice-placement',reason:'no-guaranteed-unfrozen-clearing-start'};
  const immediateIds=new Set(immediate.map(b=>b.id)),initialColors=new Set(immediate.map(b=>b.color));
  const starts=immediate.map(center),placements=[];
  let alternatives=0;
  if(mechanism==='numeric-ice'){
    const bodies=level.blocks.filter(b=>!immediateIds.has(b.id)).map(b=>({b,
      distance:Math.min(...starts.map(([x,y])=>{const p=center(b);return Math.abs(x-p[0])+Math.abs(y-p[1]);})),jitter:r()}))
      .sort((a,b)=>b.distance-a.distance||b.jitter-a.jitter);
    if(bodies.length<n)return{ok:false,phase:'ice-placement',reason:'too-few-nonopening-bodies'};
    // Spreading the frozen bodies over the far half is a geometry heuristic,
    // not a promise that the first seven clears remain possible.
    const far=bodies.slice(0,Math.max(n,Math.ceil(bodies.length*.65)));
    const selected=shuffle(far,r).slice(0,n).sort((a,b)=>a.distance-b.distance);
    for(const [i,{b,distance}]of selected.entries()){
      b.frozen=targets.minimumCounter+i;
      placements.push({blockId:b.id,color:b.color,count:b.frozen,distanceFromInitialClear:distance});
    }
    alternatives=1;
  }else{
    const eligible=level.gates.filter(g=>!initialColors.has(g.color)&&level.blocks.some(b=>b.color===g.color));
    if(eligible.length<n)return{ok:false,phase:'ice-placement',reason:'too-few-used-nonopening-gate-colours'};
    const variants=shuffle(combinations(eligible,n),r).slice(0,24).map(gs=>({gs,
      available:level.blocks.filter(b=>!gs.some(g=>g.color===b.color)).length})).sort((a,b)=>a.available-b.available);
    let chosen;
    for(const variant of variants){
      alternatives++;
      const trial=structuredClone(level);
      for(const[i,g]of variant.gs.entries())trial.gates.find(x=>x.id===g.id).frozen=targets.minimumCounter+i;
      if(capacity(trial).pass){chosen=trial;break;}
    }
    if(!chosen)return{ok:false,phase:'ice-placement',reason:'insufficient-real-clear-inventory-for-gate-thresholds',alternatives};
    level.gates=chosen.gates;
    for(const g of level.gates.filter(g=>g.frozen))placements.push({gateId:g.id,color:g.color,count:g.frozen});
  }
  const eventCapacity=capacity(level);
  if(!eventCapacity.pass)return{ok:false,phase:'ice-placement',reason:'insufficient-real-clear-inventory-for-body-thresholds',eventCapacity};
  try{runtime.validateLevel(level);}catch(error){return{ok:false,phase:'ice-static',reason:error.message};}
  return{...base,level,levelSha256:digest(level),factoryVersion:ICE_FIRST_FACTORY_VERSION,
    construction:{...base.construction,actualMechanisms:runtime.mechanismsUsedByDailyLevel(level),
      candidateInventory:{...base.construction.candidateInventory,numericIce:level.blocks.filter(b=>b.frozen).length,
        frozenExits:level.gates.filter(g=>g.frozen).length,playableCells:boardCells(level).length},
      iceFirst:{mechanism,targetDifficulty,targets,placements,eventCapacity,staticAlternatives:alternatives,
        initialUnfrozenExitBodyIds:immediate.map(b=>b.id),designedBeforeFirstSearch:true,plainSolveInvocations:0,
        scope:'Optimistic clear-event capacity only; no solvability or lower-bound claim.'}}};
}
