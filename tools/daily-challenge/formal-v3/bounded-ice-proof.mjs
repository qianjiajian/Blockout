/** Independent daily port of the narrowly qualified monotone-ice principle
 * in tools/league-v2/proof-ice-bounded.mjs. There is no league-tool dependency.
 * This primitive alone cannot accept a catalog item. The unified bounded
 * contract fixes the strategy before its shared persistent ledger claim;
 * its wrapper performs the complete actual-model route checks. Raw callers
 * must likewise claim a never-attempted input before a real candidate search.
 *
 * Soundness in this narrow domain: a complete clear removes occupancy and
 * monotonically decreases every surviving body's/gate's ice. Commute an
 * available zero-cost clear before any solution, then omit that body's later
 * actions. Every other held path remains legal; ice unlocks no later. Hence
 * greedy zero-cost closure cannot raise optimum non-clearing drag cost.
 * This fails for general flip/shutter/queue/timed/shell mechanisms, all rejected.
 * Equal colour + oriented shape + INITIAL body ice forms the only body quotient.
 * The optional-exit held graph is a superset of Pointer first-contact behavior:
 * its minimum is a lower bound; routes still need two actual model replays.
 */
import {createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {boundedBudget,loadBoundedRuntime} from './bounded-proof.mjs';
import {compileSpatial,NONE} from '../../continuation211-colored-witness.mjs';
import {levelSha256,routeSha256,independentReplay} from '../formal-v2/contract.mjs';

export const ICE_PROOF_VERSION='daily-v3-static-ice-held-raw-1';
const normalizedShape=b=>b.shape.slice().sort((a,b)=>a[1]-b[1]||a[0]-b[0]);

export function assertIceProofDomain(level) {
  const fields=new Set(['id','name','difficulty','timeSeconds','reward','parMoves','preservedMoveTarget','mechanismRules','width','height','playable','blocked','gates','blocks','flipDoors','coloredGrids','bombFailurePolicy','designTargets','onboardingHint','strategyNudge','strategyFocus','featureIntro','mechanismAdaptation','seams','shutters','generators','elevators','conveyors']);
  for(const field of Object.keys(level))if(!fields.has(field))throw Error('Ice domain excludes level field '+field);
  if(!['revised-2026-09-23-v1.4','revised-2026-09-27-v1.5'].includes(level.mechanismRules))throw Error('Ice proof requires qualified revised profile');
  for(const field of ['flipDoors','coloredGrids','seams','shutters','generators','elevators','conveyors'])if(level[field]?.length)throw Error('Ice domain excludes '+field);
  if(!Array.isArray(level.blocks)||!Array.isArray(level.gates))throw Error('Ice domain requires complete inventory and gates');
  for(const b of level.blocks){
    if(Object.keys(b).some(k=>!['id','x','y','shape','color','frozen','layers'].includes(k)))throw Error('Ice domain excludes body field on '+b.id);
    if(b.layers&&(b.layers.length!==1||b.layers[0]!==b.color))throw Error('Ice domain excludes shells and colour stages');
    if(b.frozen!==undefined&&(!Number.isSafeInteger(b.frozen)||b.frozen<1))throw Error('Invalid body ice');
    if(!Array.isArray(b.shape)||!b.shape.length||Math.min(...b.shape.map(p=>p[0]))!==0||Math.min(...b.shape.map(p=>p[1]))!==0)throw Error('Ice domain requires normalized shape anchors');
  }
  for(const g of level.gates){
    if(Object.keys(g).some(k=>!['id','color','side','offset','size','frozen','portals'].includes(k)))throw Error('Ice domain excludes special gate fields');
    for(const portal of g.portals??[])if(Object.keys(portal).some(k=>!['side','origin','size'].includes(k)))throw Error('Ice domain excludes unknown portal fields');
    if(g.frozen!==undefined&&(!Number.isSafeInteger(g.frozen)||g.frozen<1))throw Error('Invalid gate ice');
  }
}

export function boundedIceTask(level,api,options={}) {
  if(api.iceProofVersion!==ICE_PROOF_VERSION)throw Error('Use loadIceProofRuntime');
  const {floor,searchUpper=null,...requested}=options,budget=boundedBudget(requested);
  if(!Number.isSafeInteger(floor)||floor<1)throw Error('Positive finite floor required');
  if(searchUpper!==null&&(!Number.isSafeInteger(searchUpper)||searchUpper<floor||searchUpper>256))throw Error('Invalid finite searchUpper');
  const started=Date.now(),sourceLevelSha256=levelSha256(level);
  const counts={discoveredStates:0,rawFullBoardStates:0,quotientDiscoveredStates:0,exploredStates:0,rawExploredStates:0,quotientExploredStates:0,rawBoardExpansionVisits:0,attemptedTransitions:0,microDiscoveredStates:0,microExploredStates:0,microNeighborChecks:0,exitChecks:0,closureCalls:0,closureRemovals:0,parkingTransitions:0};
  let c,certifiedFloor=0;
  const result=(status,termination,extra={})=>({contractVersion:ICE_PROOF_VERSION,status,termination,thresholdProven:status==='threshold-proven',floor,sourceLevelSha256,budget,...counts,visitedStates:counts.discoveredStates,certifiedFloor,elapsedMilliseconds:Date.now()-started,
    iceProofSha256:api.iceProofSha256,iceBindings:api.iceBindings,ruleVersion:api.boundedRuleVersion,ruleSha256:api.boundedRuleSha256,
    abstraction:'static-ice-optional-held-monotone-clears-same-shape-colour-initial-ice-quotient',
    fullBoardStateDefinition:'distinct complete labeled committed poses/removals; ice values uniquely equal max(0,initialIce-removedBodies); includes parking and every closure removal',
    quotientStateDefinition:'closure-normalized board modulo bodies with equal oriented shape, colour AND initial ice; separate from raw cap',
    microStateDefinition:'single held-body coordinate BFS, no committed action; separate finite micro cap',
    lowerGraph:'optional exits including held turns; no clock',actualUpperValidated:false,pointerValidated:false,timeValidated:false,
    retryLedgerValidated:false,catalogAcceptanceEnabled:false,formalReady:false,...extra});
  try{assertIceProofDomain(level);c=compileSpatial(level,api);}catch(e){return result('unsupported','unsupported',{reason:e.message});}
  const stop=message=>{const e=Error(message);e.budgetStop=true;throw e;};
  const guard=()=>{if(Date.now()-started>=budget.maxMilliseconds)stop('deadline');};
  const transition=kind=>{guard();if(counts.attemptedTransitions>=budget.maxTransitions)stop('max-transitions');counts.attemptedTransitions++;if(kind)counts[kind]++;};
  const micro=()=>{guard();if(counts.microDiscoveredStates>=budget.maxMicroStates)stop('max-micro-states');counts.microDiscoveredStates++;};
  const raw=new Set(),expandedRaw=new Set();
  const record=s=>{guard();const k=String.fromCharCode(...s);if(raw.has(k))return;if(raw.size>=budget.maxStates)stop('max-raw-board-states');raw.add(k);counts.rawFullBoardStates=counts.discoveredStates=raw.size;};
  const expand=s=>{record(s);counts.rawBoardExpansionVisits++;const k=String.fromCharCode(...s);if(expandedRaw.has(k))return;if(expandedRaw.size>=budget.maxStates)stop('max-raw-expanded-states');expandedRaw.add(k);counts.exploredStates=counts.rawExploredStates=expandedRaw.size;};
  const removed=s=>s.reduce((sum,p)=>sum+Number(p===NONE),0);
  const active=(s,i,n=removed(s))=>s[i]!==NONE&&(c.blocks[i].ice??0)<=n;
  const groups=new Map();
  for(let i=0;i<c.N;i++){const b=c.blocks[i],k=JSON.stringify([b.color,normalizedShape(b),b.ice]);groups.set(k,[...(groups.get(k)??[]),i]);}
  const interchangeable=[...groups.values()],key=s=>String.fromCharCode(...interchangeable.flatMap(ids=>ids.map(i=>s[i]).sort((a,b)=>a-b)));
  const overlap=(a,b)=>a.some((v,i)=>(v&b[i])!==0);
  const reachable=(s,i,visit)=>{
    const b=c.blocks[i],occ=Array(c.words).fill(0);
    for(let j=0;j<c.N;j++)if(j!==i&&s[j]!==NONE)for(let w=0;w<c.words;w++)occ[w]|=c.blocks[j].poses[s[j]].mask[w];
    const parents=new Int16Array(c.W*c.H).fill(-1),queue=[s[i]];parents[s[i]]=s[i];micro();
    const drag=(p,side)=>{const points=[];while(p!==s[i]){points.push([p%c.W,Math.floor(p/c.W)]);p=parents[p];}return{blockId:b.id,path:points.reverse(),...(side?{exitSide:side}:{})};};
    for(let at=0;at<queue.length;at++){
      guard();counts.microExploredStates++;const p=queue[at],pose=b.poses[p];if(visit(p,pose,side=>drag(p,side))===false)return;
      for(const next of pose.neighbors){transition('microNeighborChecks');if(parents[next]>=0||overlap(b.poses[next].mask,occ))continue;
        if(queue.length>=budget.maxDragStates)stop('max-drag-states');micro();parents[next]=p;queue.push(next);}
    }
  };
  const closure=original=>{
    counts.closureCalls++;const s=original.slice(),drags=[];record(s);let changed=true;
    while(changed){guard();if(s.some(p=>p!==NONE))expand(s);changed=false;for(let i=0;i<c.N;i++)if(active(s,i)){expand(s);let exit;const cleared=removed(s);
      reachable(s,i,(_p,pose,drag)=>{transition('exitChecks');const available=pose.exits[0].find(ex=>(ex.gate.frozen??0)<=cleared);if(available){exit=drag(available.side);return false;}});
      if(exit){s[i]=NONE;record(s);drags.push(exit);counts.closureRemovals++;changed=true;}
    }}return{s,drags};
  };
  const nodes=[],seen=new Set(),complete=s=>s.every(p=>p===NONE);
  const discover=k=>{if(counts.quotientDiscoveredStates>=budget.maxStates)stop('max-quotient-states');seen.add(k);counts.quotientDiscoveredStates++;};
  const routeTo=index=>{const segments=[];while(index>=0){segments.push(nodes[index].drags);index=nodes[index].parent;}return segments.reverse().flat();};
  try{
    const initial=closure(c.initial);discover(key(initial.s));nodes.push({...initial,parent:-1,cost:0});
    if(complete(initial.s))return result('relaxed-shortcut','relaxed-completion',{cost:0,drags:initial.drags,routeTermination:'minimum-optional-route-found'});
    let current=[0];const maxDepth=searchUpper??floor-1;
    for(let cost=0;cost<=maxDepth&&current.length;cost++){
      certifiedFloor=cost+1;if(searchUpper===null&&certifiedFloor>=floor)return result('threshold-proven','below-threshold-exhausted');
      const next=[];
      for(const index of current){
        guard();expand(nodes[index].s);counts.quotientExploredStates++;
        if(cost>=maxDepth)continue;const state=nodes[index].s,cleared=removed(state);
        for(let i=0;i<c.N;i++)if(active(state,i,cleared)){let solution;
          reachable(state,i,(p,_pose,drag)=>{
            if(p===state[i])return;transition('parkingTransitions');const moved=state.slice();moved[i]=p;
            const reduced=closure(moved),k=key(reduced.s);if(seen.has(k))return;
            const id=nodes.length;discover(k);nodes.push({...reduced,parent:index,cost:cost+1,drags:[drag(),...reduced.drags]});
            if(complete(reduced.s)){solution=id;return false;}next.push(id);
          });
          if(solution!==undefined){const minimum=nodes[solution].cost;return result(minimum<floor?'relaxed-shortcut':'threshold-proven',minimum<floor?'relaxed-completion':'below-threshold-exhausted',{cost:minimum,drags:routeTo(solution),routeTermination:'minimum-optional-route-found'});}
        }
      }
      current=next;
    }
    return result('threshold-proven','below-threshold-exhausted',{routeTermination:searchUpper===null?'not-requested':'search-upper-exhausted'});
  }catch(e){return result(e.budgetStop?'unknown':'invalid',e.message,{thresholdProven:false,reason:e.message});}
}

/** No search, no acceptance receipt. Qualify only the returned route against
 * both current actual-model interpreters. A lower proof without this never U. */
export function replayIceWitness(runtime,level,search) {
  const result={sourceLevelSha256:levelSha256(level),lowerBoundCertified:false,actualUpperValidated:false,formalReady:false};
  if(search?.contractVersion!==ICE_PROOF_VERSION||search?.sourceLevelSha256!==result.sourceLevelSha256||!['threshold-proven','relaxed-shortcut'].includes(search.status)||!Array.isArray(search.drags)||!Number.isSafeInteger(search.cost))return{...result,error:'missing-or-unbound-successful-search-witness'};
  if(!Number.isSafeInteger(search.rawFullBoardStates)||search.rawFullBoardStates<1||search.rawFullBoardStates>10000||search.discoveredStates!==search.rawFullBoardStates||search.budget?.maxStates>10000)return{...result,error:'raw-state-budget-not-certified'};
  result.lowerBoundCertified=search.status==='threshold-proven'&&search.thresholdProven===true;
  try{
    assertIceProofDomain(level);const canonical=runtime.replayRevisedRoute(level,search.drags),independent=independentReplay(runtime,level,search.drags);
    const good=canonical.valid&&canonical.complete&&independent.valid&&independent.complete&&!independent.failed&&independent.remainingBodies===0&&independent.remainingQueued===0&&canonical.effectiveDrags===search.drags.length&&independent.effectiveDrags===search.drags.length&&canonical.nonClearingDrags===search.cost&&independent.nonClearingDrags===search.cost&&canonical.clearEvents===level.blocks.length&&independent.clearEvents===level.blocks.length;
    return{...result,actualUpperValidated:!!good,U:good?search.cost:null,routeSha256:routeSha256(search.drags),canonicalReplay:canonical,independentReplay:independent,...(!good?{error:'actual-route-replay-rejected'}:{})};
  }catch(e){return{...result,error:e.message};}
}

export async function loadIceProofRuntime(){
  const runtime=await loadBoundedRuntime(),own="tools/daily-challenge/formal-v3/bounded-ice-proof.mjs";
  const iceBindings={...runtime.toolchainBindings,[own]:createHash("sha256").update(await fs.readFile(fileURLToPath(import.meta.url))).digest("hex")};
  return {...runtime,iceProofVersion:ICE_PROOF_VERSION,iceBindings,iceProofSha256:levelSha256(iceBindings)};
}
