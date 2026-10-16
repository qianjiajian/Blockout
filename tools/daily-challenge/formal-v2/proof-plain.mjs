/** Qualified ONLY for ordinary, static, single-layer bodies and fixed gates.
 * Removing a reachable body early only deletes occupied cells. Commute each
 * such zero-cost removal before later moves, then erase that body's later
 * moves: no other move becomes illegal and nonclearing cost cannot increase.
 * Identical oriented shapes of the same color have no distinguishing runtime
 * fields; permuting their labeled poses is a graph automorphism. This proves
 * a lower bound in the optional-exit gesture superset, not Pointer or time.
 */
import { createHash } from 'node:crypto';
import { compileSpatial, NONE } from '../../continuation211-colored-witness.mjs';

const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().filter(key => value[key] !== undefined).map(key => [key, canonical(value[key])])) : value;
const digest = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export function assertPlainProofDomain(level) {
  const reject = reason => { throw new Error(reason); };
  const fields = new Set(['id','name','difficulty','timeSeconds','reward','parMoves','preservedMoveTarget',
    'mechanismRules','width','height','playable','blocked','gates','blocks','flipDoors','coloredGrids','bombFailurePolicy',
    'designTargets','onboardingHint','strategyNudge','strategyFocus','featureIntro','mechanismAdaptation',
    'seams','shutters','generators','elevators','conveyors']);
  for (const field of Object.keys(level)) if (!fields.has(field)) reject(`Plain proof excludes unknown/special level field ${field}`);
  if (level.dailyProof || level.rocketRescue || level.pulseRescue) reject('Synthetic/campaign rescue metadata is outside the plain domain');
  for (const field of ['shutters','generators','flipDoors','elevators','conveyors','coloredGrids','seams']) if (level[field]?.length) reject(`Plain proof excludes ${field}`);
  if (!['revised-2026-09-23-v1.4','revised-2026-09-27-v1.5'].includes(level.mechanismRules)) reject('Plain proof needs qualified revised profile');
  for (const block of level.blocks) {
    if (Object.keys(block).some(key => !['id','x','y','shape','color','frozen','layers'].includes(key))) reject(`Plain proof excludes mechanism/unknown block fields on ${block.id}`);
    if (block.frozen !== undefined && block.frozen !== 0) reject('Plain proof excludes body ice');
    if (block.layers && (block.layers.length !== 1 || block.layers[0] !== block.color)) reject('Plain proof excludes color stages');
    if (Math.min(...block.shape.map(point => point[0])) !== 0 || Math.min(...block.shape.map(point => point[1])) !== 0) reject('Plain proof requires normalized shape anchors');
  }
  for (const gate of level.gates) if ((gate.frozen !== undefined && gate.frozen !== 0) || gate.star) reject('Plain proof excludes gate mechanisms');
}

export function checkPlainFloor(level, api, options = {}) {
  const { floor, maxStates = 25_000, maxTransitions = 500_000, maxMilliseconds = 5_000, searchUpper = null } = options;
  for (const [key,value] of Object.entries({floor,maxStates,maxTransitions,maxMilliseconds})) if (!Number.isSafeInteger(value) || value < 1) throw new Error(`Invalid finite plain budget ${key}`);
  if (maxStates > 500_000 || maxTransitions > 10_000_000 || maxMilliseconds > 60_000) throw new Error('Plain proof budget exceeds qualified resource ceiling');
  if (searchUpper !== null && (!Number.isSafeInteger(searchUpper) || searchUpper < floor || searchUpper > 256)) throw new Error('searchUpper must be a finite integer from floor through 256');
  const sourceLevelSha256 = digest(level), started = Date.now();
  let compiled;
  try { assertPlainProofDomain(level); compiled = compileSpatial(level,api); }
  catch (error) { return { status:'unsupported', thresholdProven:false, floor, sourceLevelSha256, reason:error.message }; }
  const c=compiled, groups=new Map();
  for (let i=0;i<c.N;i++) {
    const b=c.blocks[i], k=JSON.stringify([b.color,[...b.shape].sort((a,b)=>a[1]-b[1]||a[0]-b[0])]);
    groups.set(k,[...(groups.get(k)??[]),i]);
  }
  const interchangeable=[...groups.values()];
  const key=s=>String.fromCharCode(...interchangeable.flatMap(ids=>ids.map(i=>s[i]).sort((a,b)=>a-b)));
  const intersects=(a,b)=>a.some((word,i)=>(word&b[i])!==0);
  let transitions=0, explored=0, visited=new Map(), certifiedFloor=0;
  const guard=()=>{if(Date.now()-started>=maxMilliseconds)throw new Error('deadline');};
  const reachable=(s,i,visit)=>{
    const b=c.blocks[i], occ=Array(c.words).fill(0);
    for(let j=0;j<c.N;j++)if(i!==j&&s[j]!==NONE)for(let w=0;w<c.words;w++)occ[w]|=c.blocks[j].poses[s[j]].mask[w];
    const parents=new Int16Array(c.W*c.H).fill(-1),queue=[s[i]];parents[s[i]]=s[i];
    const drag=(p,exitSide)=>{const path=[];while(p!==s[i]){path.push([p%c.W,Math.floor(p/c.W)]);p=parents[p];}return{blockId:b.id,path:path.reverse(),...(exitSide?{exitSide}:{})};};
    for(let at=0;at<queue.length;at++) {
      guard();const p=queue[at],pose=b.poses[p];if(visit(p,pose,exitSide=>drag(p,exitSide))===false)return;
      for(const next of pose.neighbors)if(parents[next]<0&&!intersects(b.poses[next].mask,occ)){parents[next]=p;queue.push(next);}
    }
  };
  const closure=original=>{
    const s=original.slice(),drags=[];let changed=true;
    while(changed){guard();changed=false;for(let i=0;i<c.N;i++)if(s[i]!==NONE){let exit;
      reachable(s,i,(_p,pose,drag)=>{if(pose.exits[0].length){exit=drag(pose.exits[0][0].side);return false;}});
      if(exit){s[i]=NONE;drags.push(exit);changed=true;}
    }}return{s,drags};
  };
  const nodes=[],complete=s=>s.every(p=>p===NONE);
  const routeTo=index=>{const segments=[];while(index>=0){segments.push(nodes[index].drags);index=nodes[index].parent;}return segments.reverse().flat();};
  const result=(status,extra={})=>({status,thresholdProven:status==='threshold-proven',floor,sourceLevelSha256,
    abstraction:'plain-optional-gesture-monotone-clear-identical-body-quotient-v2',
    termination:status==='threshold-proven'?'below-threshold-exhausted':status==='relaxed-shortcut'?'relaxed-completion':'unknown',
    exploredStates:explored,discoveredStates:visited.size,attemptedTransitions:transitions,certifiedFloor,
    elapsedMilliseconds:Date.now()-started,solvabilityValidated:false,pointerReplayValidated:false,timeValidated:false,
    quotientGroups:interchangeable.map(ids=>ids.map(i=>c.blocks[i].id)),...extra});
  try {
    const initial=closure(c.initial);nodes.push({...initial,parent:-1,cost:0});visited.set(key(initial.s),0);
    if(complete(initial.s))return result('relaxed-shortcut',{cost:0,relaxedNonClearingDrags:0,drags:initial.drags});
    let current=[0];const maxDepth=searchUpper??floor-1;
    for(let cost=0;cost<=maxDepth&&current.length;cost++) {
      // The zero-cost closure of every node at this depth is non-complete;
      // no route of cost <= cost exists. Higher-depth discovery is optional.
      certifiedFloor=cost+1;
      if(searchUpper===null&&certifiedFloor>=floor)return result('threshold-proven');
      const next=[];
      for(const index of current) {
        guard();explored++;const state=nodes[index].s;
        if(cost>=maxDepth)continue;
        for(let i=0;i<c.N;i++)if(state[i]!==NONE){let solution;
          reachable(state,i,(p,_pose,drag)=>{
            if(p===state[i])return;
            if(transitions>=maxTransitions)throw new Error('max-transitions');transitions++;
            const moved=state.slice();moved[i]=p;const reduced=closure(moved),k=key(reduced.s);
            if(visited.has(k))return;
            if(visited.size>=maxStates)throw new Error('max-states');
            const id=nodes.length;nodes.push({...reduced,parent:index,cost:cost+1,drags:[drag(),...reduced.drags]});visited.set(k,id);
            if(complete(reduced.s)){solution=id;return false;}next.push(id);
          });
          if(solution!==undefined){const U=cost+1;return result(U<floor?'relaxed-shortcut':'threshold-proven',
            {cost:U,relaxedNonClearingDrags:U,drags:routeTo(solution),routeTermination:'minimum-relaxed-route-found'});}
        }
      }
      current=next;
    }
    return result('threshold-proven',{routeTermination:searchUpper===null?'not-requested':'search-upper-exhausted'});
  } catch(error) {
    if (!['deadline','max-transitions','max-states'].includes(error.message)) return result('invalid',{termination:'invalid',reason:error.message});
    const proven=certifiedFloor>=floor;
    return result(proven?'threshold-proven':'unknown',{termination:proven?'below-threshold-exhausted':error.message,routeTermination:error.message});
  }
}
