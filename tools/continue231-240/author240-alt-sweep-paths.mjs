import assert from 'node:assert/strict';
const bigMask=words=>words.reduce((m,w,i)=>m|(BigInt(w>>>0)<<BigInt(32*i)),0n);
const words=mask=>Array.from({length:4},(_,i)=>Number((mask>>BigInt(i*32))&0xffffffffn));
// WITNESS HEURISTIC ONLY. These are static paths that ignore every moving
// body's occupancy. They never certify an actual drag or a lower bound.
// The moving body's current footprint must be excluded from dynamic occupancy
// when scoring the returned swept masks.
export function ordinarySweepPaths(c,{maxLabels=100000,maxMilliseconds=1200}={}){
 const began=Date.now(),cache=new Map(),rows=[];let totalLabels=0,totalTransitions=0;
 for(const [bodyIndex,b]of c.blocks.entries()){
  assert.equal(b.layers.length,1,'This witness helper supports one-stage ordinary bodies only');
  const goals=b.poses.map((p,i)=>p?.exits[0].some(ex=>!(ex.gate.frozen??0))?i:-1).filter(i=>i>=0);
  if(!goals.length){rows.push({blockId:b.id,bodyIndex,sweepPaths:null});continue;}
  const key=JSON.stringify({shape:b.shape,layers:b.layers,axis:b.movementAxis??null,goals});
  if(cache.has(key)){rows.push({blockId:b.id,bodyIndex,sweepPaths:cache.get(key)});continue;}
  const footprint=b.poses.map(p=>p?bigMask(p.mask):null),predecessors=b.poses.map(()=>[]);
  b.poses.forEach((p,i)=>p?.neighbors.forEach(to=>predecessors[to].push(i)));
  const masks=b.poses.map(p=>p?[]:null),queue=[];
  for(const at of goals){masks[at].push(footprint[at]);queue.push([at,footprint[at]]);totalLabels++;}
  for(let head=0;head<queue.length;head++){
   if(totalLabels>maxLabels||Date.now()-began>maxMilliseconds)return{status:'unknown',reason:totalLabels>maxLabels?'label-budget':'deadline',totalLabels,totalTransitions,rows};
   const[at,mask]=queue[head];if(!masks[at].includes(mask))continue;
   for(const from of predecessors[at]){totalTransitions++;const next=mask|footprint[from],ls=masks[from];if(ls.some(m=>(m&next)===m))continue;masks[from]=ls.filter(m=>(m&next)!==next);masks[from].push(next);queue.push([from,next]);totalLabels++;}
  }
  const sweepPaths=masks.map(ms=>ms?.map(words)??[]);cache.set(key,sweepPaths);rows.push({blockId:b.id,bodyIndex,sweepPaths});
 }
 return{status:'complete',witnessHeuristicOnly:true,totalLabels,totalTransitions,elapsedMilliseconds:Date.now()-began,rows};
}
