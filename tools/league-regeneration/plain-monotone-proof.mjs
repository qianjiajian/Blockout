/* Exact minimum non-clearing gestures for the strictly mechanism-free domain.
 *
 * Sound reductions (not used for any dynamic mechanism):
 * 1. A body that can reach its ordinary matching exit in one held gesture has
 *    cost zero. Removing it now only removes occupied cells. Every later
 *    gesture of every other body remains possible, so early removal cannot
 *    increase the optimum. Repeat to a fixed point; the removed set is order
 *    independent because removability is monotone as obstacles disappear.
 * 2. Bodies with equal color and equal oriented cell sets are interchangeable.
 *    Their labels have no effect on collisions or exits. Sorting their poses
 *    in the visited-state key is a graph automorphism quotient.
 * Each remaining edge is every reachable end pose of a held gesture, with
 * cost 1, followed by the safe zero-cost removal closure. BFS exhausts all
 * states reachable with fewer than floor such gestures. Time/state exhaustion
 * returns unknown. No chamber, seam, gate or level data is invented.
 */
import assert from 'node:assert/strict';
import { compileSpatial, NONE } from '../continuation211-colored-witness.mjs';
import { rawJsonHash } from './round3-contract.mjs';

function assertPlain(level) {
  for (const field of ['shutters','generators','flipDoors','elevators','conveyors','coloredGrids','seams']) assert(!level[field]?.length, `plain-proof excludes ${field}`);
  for (const b of level.blocks) {
    assert(Object.keys(b).every(k => ['id','x','y','shape','color','frozen','layers'].includes(k)), `plain-proof excludes fields on ${b.id}`);
    assert(!(b.frozen > 0), 'plain-proof excludes body ice');
    assert(!b.layers || b.layers.length === 1 && b.layers[0] === b.color, 'plain-proof excludes color stages');
  }
  for (const g of level.gates) assert(!(g.frozen > 0) && !g.star, 'plain-proof excludes gate mechanisms');
}

export function plainMonotoneProof(level, api, { floor = 16, maxStates = 500000, maxTransitions = 5000000, maxMilliseconds = 20000 } = {}) {
  assert(Number.isSafeInteger(floor) && floor > 0);
  let c;
  try { assertPlain(level); c = compileSpatial(level, api); }
  catch (error) { return { status:'unsupported', thresholdProven:false, reason:error.message, sourceLevelSha256:rawJsonHash(level) }; }
  const started = Date.now(), groups = new Map();
  for (let i=0;i<c.N;i++) { const b=c.blocks[i], k=JSON.stringify([b.color,[...b.shape].sort((a,b)=>a[1]-b[1]||a[0]-b[0])]); const group=groups.get(k)??[];group.push(i);groups.set(k,group); }
  const interchangeable = [...groups.values()];
  const key = s => String.fromCharCode(...interchangeable.flatMap(ids=>ids.map(i=>s[i]).sort((a,b)=>a-b)));
  const intersects = (a,b) => a.some((word,i)=>(word&b[i])!==0);
  const occupied = (s,except) => {
    const out=Array(c.words).fill(0);
    for(let i=0;i<c.N;i++) if(i!==except&&s[i]!==NONE) for(let w=0;w<c.words;w++)out[w]|=c.blocks[i].poses[s[i]].mask[w];
    return out;
  };
  const reachable = (s,i,visit) => {
    const b=c.blocks[i], occ=occupied(s,i), seen=new Uint8Array(c.W*c.H), queue=[s[i]];seen[s[i]]=1;
    for(let qi=0;qi<queue.length;qi++) { const p=queue[qi], pose=b.poses[p];if(visit(p,pose)===false)return;
      for(const next of pose.neighbors)if(!seen[next]&&!intersects(b.poses[next].mask,occ)){seen[next]=1;queue.push(next);}
    }
  };
  const closure = original => {
    const s=original.slice();let changed=true;
    while(changed){changed=false;for(let i=0;i<c.N;i++)if(s[i]!==NONE){let remove=false;reachable(s,i,(_p,pose)=>{if(pose.exits[0].length){remove=true;return false;}});if(remove){s[i]=NONE;changed=true;}}}
    return s;
  };
  const complete = s => s.every(p=>p===NONE);
  const initial=closure(c.initial), visited=new Set([key(initial)]);
  let current=[initial], explored=0, transitions=0, stop=null, completedDepth=null;
  const result=(status,extra={})=>({status,thresholdProven:status==='threshold-proven',floor,sourceLevelSha256:rawJsonHash(level),abstraction:'plain-only-exact-monotone-clear-closure-identical-body-quotient-v1',exploredStates:explored,discoveredStates:visited.size,attemptedTransitions:transitions,elapsedMilliseconds:Date.now()-started,termination:stop??'below-threshold-exhausted',completedDepth,...extra});
  if(complete(initial))return result('relaxed-shortcut',{cost:0});
  for(let cost=0;cost<floor && current.length;cost++) {
    const next=[];
    for(const s of current) {
      if(Date.now()-started>=maxMilliseconds){stop='deadline';return result('unknown');}
      explored++;
      if(cost+1>=floor)continue;
      for(let i=0;i<c.N;i++)if(s[i]!==NONE){reachable(s,i,p=>{
        if(p===s[i])return;
        if(Date.now()-started>=maxMilliseconds||transitions>=maxTransitions){stop=transitions>=maxTransitions?'max-transitions':'deadline';return false;}
        transitions++;const moved=s.slice();moved[i]=p;const reduced=closure(moved), k=key(reduced);
        if(visited.has(k))return;
        if(visited.size>=maxStates){stop='max-states';return false;}
        visited.add(k);
        if(complete(reduced)){completedDepth=cost+1;stop='shortcut';return false;}
        next.push(reduced);
      });if(stop){if(stop==='shortcut')return result('relaxed-shortcut',{cost:completedDepth});return result('unknown');}}
    }
    current=next;completedDepth=cost;
  }
  return result('threshold-proven');
}
