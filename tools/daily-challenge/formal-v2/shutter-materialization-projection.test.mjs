import test from 'node:test';
import assert from 'node:assert/strict';
import {loadSpatialApi} from '../../continuation211-colored-witness.mjs';
import {projectFullPhysicalShutters} from './shutter-materialization-projection.mjs';

const api=await loadSpatialApi();
const fixture=()=>({id:999,name:'full physical cover qualification',difficulty:'hard',reward:0,timeSeconds:60,
  mechanismRules:'revised-2026-09-27-v1.5',width:3,height:2,
  gates:[{id:'r-out',side:'right',offset:0,size:2,color:'red'},{id:'b-out',side:'left',offset:0,size:2,color:'blue'}],
  shutters:[{id:'cover',x:1,y:0,width:1,height:2,count:1}],
  blocks:[{id:'r',x:1,y:0,shape:[[0,0]],color:'red',shutterId:'cover'},
    {id:'b',x:1,y:1,shape:[[0,0]],color:'blue',shutterId:'cover'},
    {id:'free',x:0,y:0,shape:[[0,0]],color:'blue'}]});
const spatial=s=>JSON.stringify(s.blocks.map(b=>[b.id,b.x,b.y,b.layers[0]]).sort());

function inclusion(level){
 const projection=projectFullPhysicalShutters(level,api),queue=[[new api.PuzzleModel(level),new api.PuzzleModel(projection.projectedLevel)]],seen=new Set();let actions=0,reveals=0,complete=0;
 for(let at=0;at<queue.length;at++){
  assert(queue.length<100000,'finite qualification graph');
  const [real,loose]=queue[at],before=real.snapshot(),{moves,...identity}=before,key=JSON.stringify(identity);
  if(seen.has(key))continue;seen.add(key);assert.equal(spatial(before),spatial(loose.snapshot()));
  if(before.complete){assert.equal(loose.snapshot().complete,true);complete++;}
  for(const b of before.blocks)for(const action of [...[[0,-1],[1,0],[0,1],[-1,0]].map(([dx,dy])=>m=>m.moveBlockStep(b.id,b.x+dx,b.y+dy)),
    ...['top','right','bottom','left'].map(side=>m=>m.tryExit(b.id,side).ok)]){
    const rr=real.clone(),ll=loose.clone();rr.beginAction();ll.beginAction();if(!action(rr))continue;
    assert.equal(action(ll),true,'every original action exists after early materialization');
    assert.equal(rr.commitAction(),true);assert.equal(ll.commitAction(),true);
    const after=rr.snapshot();assert.equal(after.cleared-before.cleared,ll.snapshot().cleared-loose.snapshot().cleared);
    assert.equal(spatial(after),spatial(ll.snapshot()));
    reveals+=after.shutters.filter((s,i)=>s.revealed&&!before.shutters[i].revealed).length;
    actions++;queue.push([rr,ll]);
  }
 }
 assert(actions>0&&reveals>0&&complete>0);return{states:seen.size,actions,reveals};
}

test('all legal tiny-cover move/exit traces survive full early materialization',()=>{inclusion(fixture());});
test('hidden ice and gate ice erasure preserve action inclusion across reveal',()=>{const l=fixture();l.blocks[0].frozen=1;l.gates[0].frozen=1;inclusion(l);});
test('two disjoint physical batches may be materialized simultaneously',()=>{
 const l=fixture();l.shutters=[{id:'cover',x:1,y:0,width:1,height:1,count:1},{id:'second',x:1,y:1,width:1,height:1,count:2}];l.blocks[1].shutterId='second';inclusion(l);
});
test('projection retains exact bodies and original object binding',()=>{
 const l=fixture(),before=JSON.stringify(l),p=projectFullPhysicalShutters(l,api);
 assert.equal(JSON.stringify(l),before);assert.equal(p.projectedLevel.blocks.length,l.blocks.length);
 assert.deepEqual(p.materializedBodyIds,['r','b']);assert.equal(p.preservesAllBodies,true);assert.equal(p.upperBoundTransfer,false);
 assert.equal(p.coverage.coveredCells,2);assert.notEqual(p.sourceLevelSha256,p.projectedLevelSha256);
});
test('holes, overlapping inventory, lifts, shell stages and unknown cover semantics are rejected',()=>{
 for(const mutate of [l=>{l.blocks=l.blocks.filter(b=>b.id!=='b');},l=>{l.blocks.push({id:'overlap',x:1,y:0,shape:[[0,0]],color:'blue'});},
  l=>{l.shutters[0].skin='lift';},l=>{l.shutters[0].futureRule=1;},l=>{l.blocks[0].layers=['red','blue'];},
  l=>{l.shutters[0].count=0;},l=>{l.unknownRule=true;}]){
  const l=fixture();mutate(l);assert.throws(()=>projectFullPhysicalShutters(l,api));
 }
});
