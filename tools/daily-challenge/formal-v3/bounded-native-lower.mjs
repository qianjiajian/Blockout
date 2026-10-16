import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {boundedBudget,loadBoundedRuntime} from './bounded-proof.mjs';
import {canonicalJson,levelSha256} from '../formal-v2/contract.mjs';

export const NATIVE_LOWER_VERSION='native-optional-held-static-world-v1';
const LEVEL_FIELDS=new Set(['id','name','difficulty','timeSeconds','reward','parMoves','preservedMoveTarget',
  'mechanismRules','width','height','playable','blocked','gates','blocks','flipDoors','coloredGrids','bombFailurePolicy',
  'designTargets','onboardingHint','strategyNudge','strategyFocus','featureIntro','mechanismAdaptation',
  'seams','shutters','generators','elevators','conveyors']);
const BLOCK_FIELDS=new Set(['id','x','y','shape','color','layers','frozen','movementAxis','keyId','lockedBy','lockCount','star','shutterId']);
const GATE_FIELDS=new Set(['id','side','offset','size','color','portals','frozen','star']);
const COVER_FIELDS=new Set(['id','x','y','width','height','count','skin']);
const SIDES=['top','right','bottom','left'],DELTAS=[[0,-1],[1,0],[0,1],[-1,0]];
const stable=x=>JSON.stringify(canonicalJson(x));
const reject=reason=>{throw Error(`Native lower unsupported: ${reason}`);};
function fields(object,allowed,label){for(const key of Object.keys(object))if(!allowed.has(key))reject(`unknown ${label} field ${key}`);}

/** Domain in which a held unit move changes only the selected body's anchor.
 * Ordinary physical covers occupy their entire hidden area until a clear;
 * each full hidden batch is retained. No inventory erasure or free-clear
 * closure is used. Move-fed queues and lifts are expressly NOT admitted.
 */
export function assertNativeLowerDomain(runtime,level){
  runtime.validateLevel(level);
  fields(level,LEVEL_FIELDS,'level');
  if(!['revised-2026-09-23-v1.4','revised-2026-09-27-v1.5'].includes(level.mechanismRules))reject('unqualified profile');
  for(const key of ['generators','elevators','conveyors','flipDoors','seams'])if(level[key]?.length)reject(key);
  for(const block of level.blocks){
    fields(block,BLOCK_FIELDS,'block');
    if(Math.min(...block.shape.map(p=>p[0]))!==0||Math.min(...block.shape.map(p=>p[1]))!==0)reject('unnormalized shape');
  }
  for(const gate of level.gates){
    fields(gate,GATE_FIELDS,'gate');
    for(const portal of gate.portals??[])fields(portal,new Set(['side','origin','size']),'portal');
  }
  for(const grid of level.coloredGrids??[])fields(grid,new Set(['id','color','cells']),'grid');
  const covers=level.shutters??[],coverCells=new Set();
  for(const cover of covers){
    fields(cover,COVER_FIELDS,'shutter');
    if(![undefined,'shutter'].includes(cover.skin))reject('only ordinary physical shutters');
    const expected=new Set();
    for(let y=cover.y;y<cover.y+cover.height;y++)for(let x=cover.x;x<cover.x+cover.width;x++){
      const k=`${x},${y}`;if(coverCells.has(k))reject('overlapping shutters');coverCells.add(k);expected.add(k);
    }
    const actual=new Set();
    for(const block of level.blocks.filter(b=>b.shutterId===cover.id))for(const [dx,dy]of block.shape){
      const k=`${block.x+dx},${block.y+dy}`;
      if(!expected.has(k)||actual.has(k))reject('hidden batch outside region or overlapping');actual.add(k);
    }
    if(actual.size!==expected.size)reject('hidden batch must fully tile physical cover');
  }
  for(const block of level.blocks)if(!block.shutterId)for(const [dx,dy]of block.shape)
    if(coverCells.has(`${block.x+dx},${block.y+dy}`))reject('opening body overlaps physical cover');
  return {version:NATIVE_LOWER_VERSION,retainsAllBodies:true,retainsAllLayers:true,retainsAllHiddenBatches:true,
    clockPolicy:'ordinary failure deadline erased; no ticking or time-driven mechanisms',
    heldWorldPolicy:'only selected x/y may change between clear boundaries',
    rejectedMechanisms:['generators','lift/staged shutters','flip doors','bombs','elevators','conveyors','seams','rescue/unknown semantics']};
}

/** Conservative reusable classifier. Only the selected x/y and scoring moves
 * are masked. Selected existence/colour/layers, all inventory and counters,
 * animation, clock and start flags remain. Callers may conservatively count
 * a start-flag change too, or initialize start() before their baseline.
 */
export function heldWorldKey(modelOrSnapshot,selectedId){
  const snapshot=typeof modelOrSnapshot.snapshot==='function'?modelOrSnapshot.snapshot():structuredClone(modelOrSnapshot);
  delete snapshot.moves;
  for(const block of snapshot.blocks)if(block.id===selectedId){delete block.x;delete block.y;}
  return stable(snapshot);
}
export const heldWorldChanged=(before,after,selectedId)=>heldWorldKey(before,selectedId)!==heldWorldKey(after,selectedId);
export function nativeBoardKey(modelOrSnapshot){
  const snapshot=typeof modelOrSnapshot.snapshot==='function'?modelOrSnapshot.snapshot():structuredClone(modelOrSnapshot);
  delete snapshot.moves;return stable(snapshot);
}

export async function loadNativeLowerRuntime(){
  const runtime=await loadBoundedRuntime(),own='tools/daily-challenge/formal-v3/bounded-native-lower.mjs';
  const bindings={...runtime.toolchainBindings,[own]:createHash('sha256').update(await fs.readFile(fileURLToPath(import.meta.url))).digest('hex')};
  return {...runtime,nativeLowerVersion:NATIVE_LOWER_VERSION,nativeLowerBindings:bindings,nativeLowerSha256:levelSha256(bindings)};
}

/** Research-only lower subtask; no catalog or retry-ledger acceptance path.
 *
 * Expand a 0/1 graph of complete authoritative PuzzleModel snapshots. From
 * each committed world, enumerate the full connected component of every
 * active held body via unit steps, including arbitrary turns. Every reachable
 * pose may park (cost 1), and every legal exit may clear/peel (cost 0). Exits
 * are optional, a superset of first-contact Pointer semantics. The model's
 * exact ice, keys, star, grid, shell and physical-shutter transitions survive.
 * No monotone-clear assumption, label quotient, heuristic pruning or route
 * reuse is made. The ordinary failure clock is erased, which only adds moves.
 *
 * In the admitted domain, no unit move changes any other world field; this is
 * also checked on EVERY successful step. Thus those coordinate nodes are the
 * separately capped micro search, not hidden whole-board inventory states.
 * commitAction affects only ignored move/history bookkeeping in this domain.
 * Snapshots after parks and exits are all charged to the same 10000 budget.
 *
 * The task excludes costs >= floor. Exhausting all smaller costs proves L;
 * a found completion disproves the requested L but is only a relaxed witness,
 * never an original upper bound. Any interrupted task remains UNKNOWN.
 * Production callers must first claim the shared physical-input ledger;
 * this research module is deliberately NOT wired into the accepted contract.
 */
export function boundedNativeLowerTask(runtime,level,{floor,...requested}={}){
  if(!Number.isSafeInteger(floor)||floor<1||floor>256)throw Error('Native floor must be an integer 1..256');
  if(runtime.nativeLowerVersion!==NATIVE_LOWER_VERSION)throw Error('Use loadNativeLowerRuntime');
  const budget=boundedBudget(requested),started=Date.now(),inputSha=levelSha256(level);
  const counts={discoveredStates:0,exploredStates:0,attemptedTransitions:0,microDiscoveredStates:0,microExploredStates:0,
    moveChecks:0,exitChecks:0,parkingChecks:0,legalExits:0,worldMutationChecks:0};
  let domain,certifiedFloor=0;
  const out=(status,termination,extra={})=>({schemaVersion:1,method:NATIVE_LOWER_VERSION,status,termination,
    thresholdProven:status==='threshold-proven',requiredFloor:floor,L:status==='threshold-proven'?floor:null,certifiedFloor,
    inputLevelSha256:inputSha,nativeToolchainSha256:runtime.nativeLowerSha256,nativeToolchainBindings:runtime.nativeLowerBindings,
    ruleVersion:runtime.boundedRuleVersion,ruleSha256:runtime.boundedRuleSha256,dailyBudgetRuleSha256:runtime.dailyBudgetRuleSha256,
    budget,...counts,visitedStates:counts.discoveredStates,rawFullBoardStates:counts.discoveredStates,rawExploredStates:counts.exploredStates,
    elapsedMilliseconds:Date.now()-started,domain,
    stateDefinition:'labelled committed whole PuzzleModel snapshot except move score; no clear closure or body quotient',
    microDefinition:'held selected-body anchors only; every step verifies all remaining snapshot fields unchanged',
    fresh:true,solvabilityValidated:false,upperBoundCertified:false,pointerValidated:false,timeValidated:false,
    retryLedgerValidated:false,catalogAcceptanceEnabled:false,formalReady:false,...extra});
  const stop=reason=>{const error=Error(reason);error.budgetStop=true;throw error;};
  const guard=()=>{if(Date.now()-started>=budget.maxMilliseconds)stop('deadline');};
  const spend=kind=>{guard();if(counts.attemptedTransitions>=budget.maxTransitions)stop('max-transitions');counts.attemptedTransitions++;if(kind)counts[kind]++;};
  const micro=()=>{guard();if(counts.microDiscoveredStates>=budget.maxMicroStates)stop('max-micro-states');counts.microDiscoveredStates++;};
  try{domain=assertNativeLowerDomain(runtime,level);}catch(error){return out('unsupported','unsupported-domain',{reason:error.message});}
  try{
    const initial=new runtime.PuzzleModel(structuredClone(level));initial.start();
    const nodes=[],best=new Map(),expanded=new Set(),buckets=Array.from({length:floor},()=>[]);
    const enqueue=(model,cost,parent,drag)=>{
      if(cost>=floor)return;
      const key=nativeBoardKey(model),prior=best.get(key);
      if(prior!==undefined&&nodes[prior].cost<=cost)return;
      if(prior===undefined){
        if(counts.discoveredStates>=budget.maxStates)stop('max-states');counts.discoveredStates++;
      }
      if(expanded.has(key))throw Error('Dijkstra settled-world invariant violated');
      const index=nodes.length;nodes.push({model,key,cost,parent,drag});best.set(key,index);buckets[cost].push(index);
    };
    const routeTo=index=>{const path=[];while(nodes[index].parent>=0){path.push(nodes[index].drag);index=nodes[index].parent;}return path.reverse();};
    enqueue(initial,0,-1,null);
    for(let cost=0;cost<floor;cost++){
      const queue=buckets[cost];
      for(let cursor=0;cursor<queue.length;cursor++){
        guard();const parent=queue[cursor],node=nodes[parent];if(best.get(node.key)!==parent)continue;
        if(counts.exploredStates>=budget.maxStates)stop('max-expanded-states');counts.exploredStates++;expanded.add(node.key);
        const snapshot=node.model.snapshot();
        if(snapshot.complete){
          if(snapshot.blocks.length||snapshot.queuedBlocks.length)throw Error('Incomplete inventory marked complete');
          return out('relaxed-shortcut','minimum-optional-completion',{minimumOptionalCost:cost,drags:routeTo(parent)});
        }
        for(const selected of snapshot.blocks){
          if(!node.model.isBlockActive(selected))continue;
          const baseline=heldWorldKey(snapshot,selected.id),seen=new Set([`${selected.x},${selected.y}`]);
          const inner=[{model:node.model,path:[]}];micro();
          for(let at=0;at<inner.length;at++){
            guard();counts.microExploredStates++;const current=inner[at],held=current.model.getBlock(selected.id);
            if(current.path.length&&cost+1<floor){
              spend('parkingChecks');enqueue(current.model.clone(),cost+1,parent,{blockId:selected.id,path:current.path});
            }
            for(const side of SIDES){
              spend('exitChecks');if(current.model.exitAttemptStatus(selected.id,side)!=='ok')continue;
              spend();const model=current.model.clone();model.beginAction();
              if(!model.tryExit(selected.id,side).ok||!model.commitAction())throw Error('Authoritative legal exit failed');
              if(model.snapshot().cleared-current.model.snapshot().cleared!==1)throw Error('Exit must clear exactly one body/layer');
              counts.legalExits++;enqueue(model,cost,parent,{blockId:selected.id,path:current.path,exitSide:side});
            }
            for(const [dx,dy]of DELTAS){
              spend('moveChecks');const model=current.model.clone();model.beginAction();
              const target=[held.x+dx,held.y+dy];if(!model.moveBlockStep(selected.id,...target))continue;
              counts.worldMutationChecks++;
              if(heldWorldKey(model,selected.id)!==baseline)throw Error('UNSUPPORTED_HELD_WORLD_MUTATION');
              const key=target.join(',');if(seen.has(key))continue;
              if(seen.size>=budget.maxDragStates)stop('max-drag-states');micro();seen.add(key);
              inner.push({model,path:[...current.path,target]});
            }
          }
        }
      }
      certifiedFloor=cost+1;
    }
    if(levelSha256(level)!==inputSha)throw Error('Input mutated');
    return out('threshold-proven','all-costs-below-floor-exhausted');
  }catch(error){return out(error.budgetStop?'unknown':error.message==='UNSUPPORTED_HELD_WORLD_MUTATION'?'unsupported':'invalid',error.message,{reason:error.message});}
}
