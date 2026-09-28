import assert from 'node:assert/strict';
export function verifyMechanisms89(data,api){
 const l=data.level,m=new api.PuzzleModel(l),events=[],axis=[];m.startCountdown();
 for(const[i,d]of data.drags.entries()){
  const before=m.snapshot(),b=m.getBlock(d.blockId);m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());const after=m.snapshot();
  if(b.movementAxis){assert.equal(b.movementAxis,'vertical');assert(d.path.every(p=>p[0]===b.x));axis.push({step:i+1,blockId:b.id,verticalOnly:true,exited:!!d.exitSide});}
  const lock=before.blocks.find(x=>x.id==='a89-s7-01'),next=after.blocks.find(x=>x.id==='a89-s7-01');
  if(lock&&next&&(lock.lockCount??0)!==(next.lockCount??0)){assert(b.keyId==='red-key'&&d.exitSide);assert.equal((lock.lockCount??0)-(next.lockCount??0),1);events.push({step:i+1,key:b.id,lock:lock.id,before:lock.lockCount,after:next.lockCount??0});}
 }
 assert(m.snapshot().complete);assert.deepEqual(events.map(e=>e.key).sort(),['a89-s7-03','a89-s7-07']);assert.deepEqual(events.map(e=>[e.before,e.after]),[[2,1],[1,0]]);assert.equal(axis.length,2);
 const cases=[];
 // Try one-step movement at each prefix in a single-attribute relaxed copy.
 for(const kind of ['lock','axis','ice']){const targetId=kind==='lock'?'a89-s7-01':kind==='axis'?'a89-s12-01':'a89-o12';let found;
  for(let i=0;i<data.drags.length&&!found;i++){const prefix=data.drags.slice(0,i),original=api.replayRevisedRoute(l,prefix);assert(original.valid);const s=JSON.parse(original.finalStateKey),b=s.blocks.find(b=>b.id===targetId);if(!b)continue;if(kind==='lock'&&!(b.lockCount>0))continue;if(kind==='ice'&&!(b.frozen>0))continue;
   const relaxed=structuredClone(l),body=relaxed.blocks.find(b=>b.id===targetId);if(kind==='lock'){delete body.lockedBy;delete body.lockCount;}else if(kind==='axis')delete body.movementAxis;else delete body.frozen;
   if(!api.replayRevisedRoute(relaxed,prefix).valid)continue;
   for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){if(kind==='axis'&&dy!==0)continue;const action={blockId:targetId,path:[[b.x+dx,b.y+dy]]},no=api.replayRevisedRoute(l,[...prefix,action]),yes=api.replayRevisedRoute(relaxed,[...prefix,action]);if(!no.valid&&yes.valid){found={kind,targetId,beforeDrag:i+1,prefix,action,rejected:no.error,allowedWithOnlyThisRestrictionRemoved:true};cases.push(found);break;}}
  }
 }
 assert(cases.some(c=>c.kind==='lock'));assert(cases.some(c=>c.kind==='axis'));
 return{passed:true,keyEvents:events,axisActions:axis,localChoices:cases,provesGlobalOrder:false};
}
