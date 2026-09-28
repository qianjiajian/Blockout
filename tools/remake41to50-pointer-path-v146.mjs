import assert from 'node:assert/strict';
// Collinear consecutive unit moves need only a segment-end Pointer sample.
// Turns and reversals stay. The game's continuous sweep must still execute
// every authoritative unit; verifyObservedUnitPaths checks that independently.
export function pointerCorners(start,path){
 const points=[start,...path];
 for(let i=1;i<points.length;i++){const a=points[i-1],b=points[i];assert(b.every(Number.isInteger));assert.equal(Math.abs(b[0]-a[0])+Math.abs(b[1]-a[1]),1,'Unit route required');}
 return path.filter((p,i)=>{if(i===path.length-1)return true;const prev=points[i],next=path[i+1];return p[0]-prev[0]!==next[0]-p[0]||p[1]-prev[1]!==next[1]-p[1];});
}
export function verifyObservedUnitPaths(drags,log){
 let index=0,current=null,units=0;
 for(const e of log.events){
  if(e.method==='beginAction'){assert.equal(current,null);current={moves:[],exits:[]};}
  if(e.method==='moveBlockStep'){assert(current);assert.equal(e.result,true);current.moves.push(e.args);units++;}
  if(e.method==='tryExit'){assert(current);assert.equal(e.result.ok,true);current.exits.push(e.args.slice(0,2));}
  if(e.method==='cancelAction')assert.fail('No cancellation in the accepted route');
  if(e.method==='commitAction'){assert(current&&index<drags.length);assert.equal(e.result,true);const d=drags[index];assert.deepEqual(current.moves,d.path.map(([x,y])=>[d.blockId,x,y]),`Every actual unit at drag ${index+1}`);assert.deepEqual(current.exits,d.exitSide?[[d.blockId,d.exitSide]]:[]);index++;current=null;}
 }
 assert.equal(current,null);assert.equal(index,drags.length);
 return {passed:true,drags:index,unitSteps:units,allUnitsExact:true,routeUnchanged:true};
}
