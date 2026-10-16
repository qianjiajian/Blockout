import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {assertPlainProofDomain} from '../formal-v2/proof-plain.mjs';
import {canonicalExit} from '../formal-v2/proof-scheduled-route.mjs';
import {auditPlainForwardDrag,auditCompleteReverseWitness} from './reverse-route-audit.mjs';
import {absoluteCells,digest} from './diversity-layout-factory.mjs';

export const ROUTE_COLOURING_VERSION='plain-fixed-commit-route-colouring-v1';
const clone=structuredClone,dirs=[[0,-1],[1,0],[0,1],[-1,0]];
const samePoint=(a,b)=>a[0]===b[0]&&a[1]===b[1];
const recolour=(b,color)=>({...b,color,...(b.layers?{layers:[color]}:{})});
const withColour=(level,id,color)=>({...level,blocks:level.blocks.map(b=>b.id===id?recolour(b,color):b)});

/** Declared before construction starts. This changes no body geometry, removal
 * order or parking gesture. The only alternative motion is a single held path
 * during that body's originally scheduled clearing gesture. Callbacks share
 * the parent's raw/micro/transition/time budget; none reset per body or colour.
 * Only one complete CSP assignment is replayed. Failed replay throws and must
 * stop the parent input, never request a second colour assignment.
 */
export function recolourKnownPlainWitness(runtime,level,inputDrags,options={}){
 const{charge,micro,transition,maxCspNodes=10000,cspStats={nodes:0},preserveColourCounts=true}=options;
 if([charge,micro,transition].some(x=>typeof x!=='function'))throw Error('Shared construction charge/micro/transition callbacks required');
 if(!Number.isSafeInteger(maxCspNodes)||maxCspNodes<1||maxCspNodes>10000)throw Error('Invalid finite CSP node cap');
 if(!Number.isSafeInteger(cspStats.nodes)||cspStats.nodes<0||typeof preserveColourCounts!=='boolean')throw Error('Invalid CSP accounting/options');
 assertPlainProofDomain(level);runtime.validateLevel(level);
 if(!Array.isArray(inputDrags)||!inputDrags.length||inputDrags.length>10000)throw Error('Finite nonempty supplied trace required');
 const gateColours=level.gates.map(g=>g.color),colours=[...new Set(gateColours)].sort();
 if(colours.length!==gateColours.length)throw Error('Colouring pilot requires one ordinary gate per colour');
 const originalCounts=Object.fromEntries(colours.map(c=>[c,level.blocks.filter(b=>b.color===c).length]));
 if(Object.values(originalCounts).some(n=>n===0)||level.blocks.some(b=>!colours.includes(b.color)))throw Error('Original inventory and gate colours must cover one another');
 const frames=[],stats={domainWorlds:0,parkingTests:0,clearingSearches:0,finalDoubleReplays:0},assetBindings={};
 let current=clone(level);charge(current);
 for(const[index,drag]of inputDrags.entries()){
  transition();const body=current.blocks.find(b=>b.id===drag.blockId);if(!body)throw Error('Supplied trace reused a removed body');
  if(!Array.isArray(drag.path))throw Error('Supplied trace path missing');
  const end=drag.path.at(-1)??[body.x,body.y],next={...current,blocks:drag.exitSide?current.blocks.filter(b=>b.id!==body.id):current.blocks.map(b=>b.id===body.id?{...b,x:end[0],y:end[1]}:b)};
  charge(current,true);for(const p of drag.path){void p;micro();transition();}charge(next);
  const audit=auditPlainForwardDrag(runtime,current,drag,{expectedBodies:next.blocks});if(!audit.valid)throw Error('Original geometry trace invalid at '+index+': '+audit.error);
  frames.push({index,before:current,after:next,drag:clone(drag)});current=next;
 }
 if(current.blocks.length)throw Error('Supplied geometry trace is not complete');
 const domains=[];
 for(const body of level.blocks){
  const match=runtime.matchFormalBlockShape(body.shape,'native-only');
  if(!match||match.quarterTurns!==0)throw Error('Original body lacks q0 native shape');
  const own=frames.filter(f=>f.drag.blockId===body.id),clears=own.filter(f=>f.drag.exitSide);
  if(clears.length!==1||own.at(-1)!==clears[0])throw Error('Each stock identity needs exactly one final removal');
  const choices=[],excluded=[];
  for(const color of colours){
   transition();const asset=runtime.GAME_ART.gameplay.formalBlocks[color]?.solid?.[match.shapeId];
   if(!asset){excluded.push({color,reason:'missing-native-colour-art'});continue;}
   if(!assetBindings[asset]){try{assetBindings[asset]=createHash('sha256').update(fs.readFileSync(path.resolve('public',asset))).digest('hex');}
    catch{excluded.push({color,reason:'missing-native-colour-art-file'});continue;}}
   let forbidden=null;
   for(const f of own.filter(f=>!f.drag.exitSide)){
    const world=withColour(f.before,body.id,color);charge(world,true);stats.domainWorlds++;stats.parkingTests++;
    const model=new runtime.PuzzleModel(clone(world));model.startCountdown();model.beginAction();
    if(canonicalExit(runtime,model,body.id)){forbidden={color,reason:'parking-pointer-down-exit',dragIndex:f.index};break;}
    micro();
    for(const[step,p]of f.drag.path.entries()){
     const b=model.getBlock(body.id),previous=[b.x,b.y];transition();micro();
     if(Math.abs(p[0]-b.x)+Math.abs(p[1]-b.y)!==1||!model.moveBlockStep(body.id,...p))throw Error('Plain recolour changed geometric movement');
     if(canonicalExit(runtime,model,body.id,previous)){forbidden={color,reason:step===f.drag.path.length-1?'parking-endpoint-exit':'parking-intermediate-exit',dragIndex:f.index,step};break;}
    }
    if(forbidden)break;
    charge(withColour(f.after,body.id,color));if(!model.commitAction())throw Error('Original parking lost its effective movement');
   }
   if(forbidden){excluded.push(forbidden);continue;}
   const f=clears[0],world=withColour(f.before,body.id,color);charge(world,true);stats.domainWorlds++;stats.clearingSearches++;
   const model=new runtime.PuzzleModel(clone(world));model.startCountdown();const held=model.getBlock(body.id),start=[held.x,held.y],queue=[start],parents=new Map([[start.join(','),null]]);micro();
   let clearDrag=null;
   for(let at=0;at<queue.length;at++){
    const pose=queue[at],previous=parents.get(pose.join(','));held.x=pose[0];held.y=pose[1];transition();
    const exit=canonicalExit(runtime,model,body.id,previous??undefined);
    if(exit){const points=[];let p=pose;while(!samePoint(p,start)){points.push(p);p=parents.get(p.join(','));}clearDrag={blockId:body.id,path:points.reverse(),exitSide:exit};break;}
    for(const[dx,dy]of dirs){transition();const next=[pose[0]+dx,pose[1]+dy],k=next.join(',');
     if(parents.has(k)||!model.canPlace(held,...next))continue;micro();parents.set(k,pose);queue.push(next);
    }
   }
   if(!clearDrag){excluded.push({color,reason:'no-single-held-clear-at-scheduled-frame',dragIndex:f.index});continue;}
   // This is a complete counterfactual coloured commit, not a held microstate.
   charge(withColour(f.after,body.id,color));
   const audit=auditPlainForwardDrag(runtime,world,clearDrag,{expectedBodies:f.after.blocks});
   if(!audit.valid)throw Error('Constructed clearing domain path failed canonical audit: '+audit.error);
   choices.push({color,clearDrag,clearFrame:f.index,shapeId:match.shapeId,asset});
  }
  domains.push({id:body.id,originalColor:body.color,choices,excluded});
 }
 const summary={version:ROUTE_COLOURING_VERSION,inputLevelSha256:digest(level),inputRouteSha256:digest(inputDrags),domains,assetBindings,statistics:stats,
  constraints:{preserveColourCounts,originalCounts,oneExistingGatePerColour:true,openingAdjacentBodiesDifferent:true},fullBoardDifficultySearches:0};
 if(domains.some(d=>!d.choices.length))return{ok:false,reason:'empty-route-compatible-colour-domain',...summary};
 const cells=level.blocks.map(absoluteCells),adj=level.blocks.map((_,i)=>level.blocks.flatMap((_,j)=>i!==j&&cells[i].some(([x,y])=>cells[j].some(([a,b])=>Math.abs(x-a)+Math.abs(y-b)===1))?[j]:[]));
 const assigned=Array(domains.length).fill(null),counts=Object.fromEntries(colours.map(c=>[c,0]));
 function dfs(count){
  transition();if(cspStats.nodes>=maxCspNodes)throw Error('construction-max-colour-csp-nodes');cspStats.nodes++;
  if(count===assigned.length){
   // A fully assigned colour vector already specifies a complete physical
   // opening even before a model is instantiated. Charge it before testing
   // any terminal stock/coverage condition, not only the selected solution.
   charge({...level,blocks:level.blocks.map((b,i)=>recolour(b,assigned[i].color))});
   return colours.every(c=>counts[c]>0&&(!preserveColourCounts||counts[c]===originalCounts[c]));
  }
  let chosen=-1,choices=null;
  for(let i=0;i<assigned.length;i++)if(!assigned[i]){
   const possible=domains[i].choices.filter(x=>!adj[i].some(j=>assigned[j]?.color===x.color)&&(!preserveColourCounts||counts[x.color]<originalCounts[x.color]));
   if(!possible.length)return false;
   if(choices===null||possible.length<choices.length){chosen=i;choices=possible;}
  }
  choices.sort((a,b)=>Number(b.color===domains[chosen].originalColor)-Number(a.color===domains[chosen].originalColor)||a.color.localeCompare(b.color));
  for(const choice of choices){transition();assigned[chosen]=choice;counts[choice.color]++;if(dfs(count+1))return true;counts[choice.color]--;assigned[chosen]=null;}
  return false;
 }
 if(!dfs(0))return{ok:false,reason:'route-compatible-colour-csp-unsatisfied',...summary,cspNodesTotal:cspStats.nodes};
 const assignments=new Map(domains.map((d,i)=>[d.id,assigned[i]])),apply=l=>({...l,blocks:l.blocks.map(b=>recolour(b,assignments.get(b.id).color))});
 const finalLevel=apply(level),drags=inputDrags.map(d=>d.exitSide?clone(assignments.get(d.blockId).clearDrag):clone(d));
 charge(finalLevel);for(const f of frames){charge(apply(f.before),true);charge(apply(f.after));}
 stats.finalDoubleReplays++;const actual=auditCompleteReverseWitness(runtime,finalLevel,drags);
 if(!actual.valid||actual.U!==inputDrags.filter(d=>!d.exitSide).length)throw Error('Selected colouring final double replay failed; stop input: '+actual.error);
 return{ok:true,...summary,cspNodesTotal:cspStats.nodes,level:finalLevel,drags,U:actual.U,replay:actual.canonical,independentReplay:actual.independent,
  assignments:Object.fromEntries([...assignments].map(([id,x])=>[id,x.color])),changedColourIds:level.blocks.filter(b=>assignments.get(b.id).color!==b.color).map(b=>b.id),
  preservedCommitGeometry:true,finalLevelSha256:digest(finalLevel),finalRouteSha256:digest(drags),formalReady:false};
}
