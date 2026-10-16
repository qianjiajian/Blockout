import { localRetiles, fixColors } from '../daily-challenge/formal-v2/design-layout-factory.mjs';
import { digest, random, inventorySummary, orbitFootprintArea, bodyFootprint } from './design-layout-factory.mjs';

/** Repartition substantial, connected body unions on broad campaign baselines.
 * Preserve the normal board exactly; never use seams or forced chambers.
 * This is a layout construction operation, not a partial search continuation. */
export function buildRepartitionCandidate(source, runtime, {seed=1,irregular=false,maxSteps=12,protectedBodyIds=[],keepColourProbability=.65}={}) {
  const inventory=inventorySummary(source,runtime);
  if(inventory.hiddenCount||inventory.queuedCount||inventory.shellCount||inventory.hasSeams||inventory.components!==1)
    return {ok:false,reason:'source-inventory-requires-cohort-aware-construction'};
  const r=random(seed);
  const original={id:source.id,name:`荣耀联赛主线大区重铺 ${source.id}-${seed}`,difficulty:'super',reward:0,
    width:source.width,height:source.height,...(source.playable?{playable:structuredClone(source.playable)}:{}),
    ...(source.blocked?{blocked:structuredClone(source.blocked)}:{}),timeSeconds:180,parMoves:source.parMoves,
    mechanismRules:'revised-2026-09-27-v1.5',
    blocks:source.blocks.map(b=>({id:b.id,x:b.x,y:b.y,shape:structuredClone(b.shape),color:b.color})),
    gates:[...(source.gates??[]),...(source.flipDoors??[])].map(g=>({id:g.id,color:g.color,side:g.side,offset:g.offset,size:g.size,...(g.portals?{portals:structuredClone(g.portals)}:{})}))};
  if(new Set(original.gates.map(g=>g.color)).size!==original.gates.length)return{ok:false,reason:'duplicate-source-gate-colours'};
  let level=structuredClone(original),constructionTransitions=0;
  const changedIds=new Set(),partitions=new Set([digest(level.blocks.map(bodyFootprint).sort())]);
  for(let step=0;step<maxSteps;step++){
    const variants=localRetiles(level,{irregular,maxUnion:16});
    constructionTransitions+=variants.length;
    if(constructionTransitions>10000)return{ok:false,reason:'construction-enumeration-budget',constructionTransitions};
    const ordered=variants.filter(v=>!partitions.has(v.partition)&&!v.changedIds.some(id=>protectedBodyIds.includes(id))).map(v=>({...v,score:r()+v.changedIds.filter(id=>changedIds.has(id)).length*.25})).sort((a,b)=>a.score-b.score);
    let chosen;
    for(const v of ordered.slice(0,40)){
      const ids=[...new Set([...changedIds,...v.changedIds])];
      if(!fixColors(v.level,ids,Math.floor(r()*4294967296),runtime,{keepProbability:keepColourProbability}))continue;
      chosen=v;for(const id of ids)changedIds.add(id);break;
    }
    if(!chosen)break;level=chosen.level;partitions.add(chosen.partition);
    const retained=orbitFootprintArea(original,level);
    if(retained<=.65&&retained>=.15){
      const native=inventorySummary(level,runtime);
      if(native.nonNativeOrMissingArtIds.length)continue;
      try{runtime.validateLevel(level);}catch{continue;}
      const shapeChanged=digest(source.blocks.map(b=>digest(b.shape)).sort())!==digest(level.blocks.map(b=>digest(b.shape)).sort());
      const colorChanged=source.blocks.some(b=>level.blocks.find(x=>x.id===b.id)?.color!==b.color);
      if(!shapeChanged||!colorChanged)continue;
      return{ok:true,level,levelSha256:digest(level),sourceLevelSha256:digest(source),
        construction:{seed,factoryVersion:'league-large-region-native-repartition-v2.1',sourceBoardExactlyRetained:true,
          sourceFootprintAreaRetained:retained,sourceBodyCount:source.blocks.length,candidateBodyCount:level.blocks.length,
          changedBodyIds:[...changedIds],sourceShapeMultisetChanged:shapeChanged,sourceColoursChanged:colorChanged,
          sourceInventoryPolicy:'All source bodies retained; native body unions are retiled repeatedly to change at least 35% of footprint area. Early prototype omits constraints explicitly; later league-stage mechanisms are independently added and proved.',
          removedSourceMechanisms:inventory.mechanisms.filter(m=>!runtime.mechanismsUsedByDailyLevel(level).includes(m)),
          repartitionSteps:step+1,constructionTransitions,actualMechanisms:runtime.mechanismsUsedByDailyLevel(level)}};
    }
  }
  return{ok:false,reason:'could-not-repartition-enough-area-with-native-exit-domains',constructionTransitions};
}
