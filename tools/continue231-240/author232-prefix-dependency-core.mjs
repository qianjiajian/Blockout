export const bitCount=m=>{let n=0;for(m>>>=0;m;m&=m-1)n++;return n;};
export function acyclicAfterRemoval(rows,removed){
 const n=rows.length,visited=removed;
 let seen=visited;
 for(;;){let changed=false;for(let i=0;i<n;i++)if(!(seen&(1<<i))&&(rows[i]&~seen)===0){seen|=1<<i;changed=true;}if(!changed)return seen===(1<<n)-1;}
}
export function feedbackMinimum(rows){
 const order=Array.from({length:1<<rows.length},(_,i)=>i).sort((a,b)=>bitCount(a)-bitCount(b));
 for(const removed of order)if(acyclicAfterRemoval(rows,removed))return{count:bitCount(removed),removed};
 throw Error('finite feedback set required');
}
export function joinDependencyMasks(targetPaths,{obstacleBits=20,maxJoined=200000}={}){
 const n=targetPaths.length,baseMask=(1<<obstacleBits)-1;let labels=[0n],joined=0;
 for(let i=0;i<n;i++){
  const parts=targetPaths[i].map(m=>BigInt(m&baseMask)|(BigInt((m>>>obstacleBits)&((1<<n)-1))<<BigInt(obstacleBits+i*n))),next=[];
  for(const a of labels)for(const b of parts){if(++joined>maxJoined)return{status:'unknown',reason:'join-budget',joined};const mask=a|b;if(next.some(v=>(v&mask)===v))continue;for(let j=next.length-1;j>=0;j--)if((next[j]&mask)===mask)next.splice(j,1);next.push(mask);}labels=next;
 }
 if(!labels.length)return{status:'no-static-path',joined};
 const cache=new Map(),certificates=[];let minimum=Infinity,best;
 for(const label of labels){const obstacles=Number(label&BigInt(baseMask)),dependencyKey=(label>>BigInt(obstacleBits)).toString(),rows=Array.from({length:n},(_,i)=>Number((label>>BigInt(obstacleBits+i*n))&BigInt((1<<n)-1)));let feedback=cache.get(dependencyKey);if(!feedback){feedback=feedbackMinimum(rows);cache.set(dependencyKey,feedback);}const cost=bitCount(obstacles)+feedback.count,entry={label:label.toString(),obstacleMask:obstacles,obstacleCount:bitCount(obstacles),dependencyRows:rows,feedbackCount:feedback.count,feedbackVertexMask:feedback.removed,cost};certificates.push(entry);if(cost<minimum){minimum=cost;best=entry;}}
 return{status:'complete',minimum,joined,antichainLabels:labels.map(String),distinctDependencyGraphs:cache.size,best,certificates};
}
