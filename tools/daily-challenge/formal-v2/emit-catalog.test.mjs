import test from 'node:test';
import assert from 'node:assert/strict';
import { transform } from 'esbuild';
import { requireCompleteCatalog, catalogModule } from './emit-catalog.mjs';

const progress=()=>({scope:450,rows:Array.from({length:450},(_,i)=>({formalId:`slot-${i}`,status:'SPATIAL_VERIFIED_AWAITING_POINTER_TIME'})),rejectedIndex:[],geometryDuplicates:[]});
test('a full emitter cannot admit a partial, duplicate, stale, or rejected selection',()=>{
  const cases=[p=>p.rows.pop(),p=>p.rows[449].formalId=p.rows[0].formalId,
    p=>p.rows[8].status='AWAITING_FRESH_TOOLCHAIN_REVALIDATION',p=>p.rejectedIndex.push({reason:'unknown-slot'}),
    p=>p.geometryDuplicates.push({formalIds:['slot-0','slot-1']})];
  for(const change of cases){const p=progress();change(p);assert.throws(()=>requireCompleteCatalog(p));}
  assert.doesNotThrow(()=>requireCompleteCatalog(progress()));
});

test('emitted lookup returns the exact full object and isolates mutations of gameplay clones',async()=>{
  const level={id:198,name:'bound object',difficulty:'super',width:7,height:10,timeSeconds:123,reward:0,parMoves:47,
    runtimeProfile:'revised-2026-09-27-v1.5',blocks:[{id:'b',x:1,y:2,shape:[[0,0],[1,0]],color:'red',layers:['red','blue']}],
    gates:[{id:'g',side:'right',offset:2,size:1,color:'red'}],designTargets:{minimumRepositionOverhead:37}};
  const candidate={formalId:'slot',level,sourceLevelId:198,minimumRepositionMoves:31,layoutSha256:'full-object-sha'};
  const stages=[{stageKey:'stage',difficulties:{1:{candidates:[candidate]},2:{candidates:[]},3:{candidates:[]}}}];
  const built=await transform(catalogModule(stages,'revision-sha'),{loader:'ts',format:'esm'});
  const api=await import(`data:text/javascript;base64,${Buffer.from(built.code).toString('base64')}`);
  const clone=api.getFormalDailyChallengeLevel('slot');assert.deepEqual(clone,level);
  clone.blocks[0].layers.pop();clone.parMoves=31;
  assert.deepEqual(api.getFormalDailyChallengeLevel('slot'),level,'read-modify-write by a game run must not change a later challenge');
  assert.throws(()=>api.getFormalDailyChallengeCandidate('slot').level.blocks[0].shape.push([3,0]));
  assert.equal(api.getFormalDailyChallengeLevel('absent'),undefined,'missing certified data must not substitute a source level');
  const assignment=api.getFormalDailyChallengeAssignments('stage',1)[0];
  assert.equal(assignment.level,undefined,'full layouts must not inflate player save pools');
  assert.equal(assignment.catalogRevision,'revision-sha');assert.equal(assignment.layoutSha256,'full-object-sha');
});
