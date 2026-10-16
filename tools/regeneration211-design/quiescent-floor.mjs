import {compileSpatial,each,key,cleared,NONE,iceRemaining,normalizeClears} from '../remake201to210-v123-floor.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
/** Restricted final static phase. No new object, changing portal or fresh ice
 * can appear; keys, shells and lifts are conservatively excluded altogether.
 * On this phase a zero-cost final-body exit removes only an obstacle. Advancing
 * it to the start of any suffix cannot obstruct any other gesture: omit all
 * later gestures of that body and replay the others through a subset of the
 * old occupied cells. Clear cost stays zero and parking cost cannot increase.
 * Conversely the normalization is itself a sequence of graph gestures.
 * Therefore the normalized graph has the same minimum non-clearing cost.
 * Before this phase every labeled graph state/edge is enumerated unchanged.
 */
export function isQuiescent(c,s){
 if(c.covers.some(co=>co.skin==='lift'||s[co.stateIndex]===NONE))return false;
 if(c.blocks.some(b=>b.keyId||b.lockedBy||b.layers.length!==1))return false;
 const count=cleared(c,s);if(c.level.gates.some(g=>(g.frozen??0)>count))return false;
 return c.blocks.every((_,i)=>s[i]===NONE||iceRemaining(c,s,i)===0);
}
export function normalizeQuiescent(c,s){return isQuiescent(c,s)?normalizeClears(c,s):{s,drags:[]};}
export function checkQuiescentFloor(level,api,{floor,maxMilliseconds=5000,maxStates=150000,maxTransitions=2000000}={}){
 const began=Date.now(),base={floor,sourceLevelSha256:digest(level),abstraction:'v125-full-spatial-graph-only-quiescent-final-body-normalization',pointerValidated:false,timeValidated:false,releaseApproved:false};let c;
 try{c=compileSpatial(level,api);}catch(e){return{...base,status:'unsupported',thresholdProven:false,reason:e.message};}
 if(!Number.isInteger(floor)||floor<1)throw Error('positive floor');
 const initial=normalizeQuiescent(c,c.initial),nodes=[{s:initial.s,cost:0,parent:-1,drags:initial.drags}],seen=new Map([[key(initial.s),0]]),open=[0];let explored=0,transitions=0,normalizations=0,normalizedRemovals=initial.drags.length,pruned=0,maxClears=0,stop;
 function push(i){open.push(i);let a=open.length-1;while(a){const p=(a-1)>>1;if(nodes[open[p]].cost<=nodes[open[a]].cost)break;[open[p],open[a]]=[open[a],open[p]];a=p;}}
 function pop(){const result=open[0],last=open.pop();if(open.length){open[0]=last;let p=0;while(p*2+1<open.length){let n=p*2+1;if(n+1<open.length&&nodes[open[n+1]].cost<nodes[open[n]].cost)n++;if(nodes[open[p]].cost<=nodes[open[n]].cost)break;[open[p],open[n]]=[open[n],open[p]];p=n;}}return result;}
 function route(i){const out=[];while(i>=0){out.push(nodes[i].drags);i=nodes[i].parent;}return out.reverse().flat();}
 const result=(status,extra={})=>({...base,status,thresholdProven:status==='threshold-proven',exploredStates:explored,discoveredStates:seen.size,attemptedTransitions:transitions,normalizedStates:normalizations,normalizedRemovals,prunedTerminalCostNodes:pruned,maxClearsSeen:maxClears,elapsedMilliseconds:Date.now()-began,...extra});
 while(open.length){if(Date.now()-began>=maxMilliseconds){stop='deadline';break;}const ni=pop(),n=nodes[ni];if(seen.get(key(n.s))<n.cost)continue;explored++;const count=cleared(c,n.s);maxClears=Math.max(maxClears,count);if(count===c.totalClears)return result('relaxed-shortcut',{cost:n.cost,drags:route(ni)});
 if(n.cost===floor-1&&isQuiescent(c,n.s)){pruned++;continue;}
 each(c,n.s,(raw,k,get)=>{if(Date.now()-began>=maxMilliseconds||transitions>=maxTransitions){stop=transitions>=maxTransitions?'max-transitions':'deadline';return false;}transitions++;const cost=n.cost+k;if(cost>=floor)return;const normal=normalizeQuiescent(c,raw);if(normal.drags.length){normalizations++;normalizedRemovals+=normal.drags.length;}const s=normal.s,sk=key(s),prior=seen.get(sk);if(prior!==undefined&&prior<=cost)return;if(seen.size>=maxStates){stop='max-states';return false;}seen.set(sk,cost);nodes.push({s,cost,parent:ni,drags:[get(),...normal.drags]});push(nodes.length-1);},{optionalExit:true});if(stop)break;
 }
 return result(stop?'unknown':'threshold-proven',{termination:stop??'below-threshold-exhausted'});
}
