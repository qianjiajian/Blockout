import assert from 'node:assert/strict';
export function verifyKeyProcess(data,api){
 const {level,drags}=data,m=new api.PuzzleModel(structuredClone(level));m.startCountdown();const events=[],counterfactuals=[];
 for(const[index,d]of drags.entries()){
  const before=m.snapshot(),beforeModel=m.clone(),body=before.blocks.find(b=>b.id===d.blockId);assert(body);
  m.beginAction();for(const p of d.path)assert(m.moveBlockStep(d.blockId,...p));if(d.exitSide)assert(m.tryExit(d.blockId,d.exitSide).ok);assert(m.commitAction());const after=m.snapshot();
  if(body.keyId&&!after.blocks.some(b=>b.id===body.id)){
   const changes=[];
   for(const prev of before.blocks.filter(b=>b.lockedBy)){
    const next=after.blocks.find(b=>b.id===prev.id);assert(next);
    const expected=prev.lockedBy===body.keyId?Math.max(0,(prev.lockCount??0)-1):(prev.lockCount??0);assert.equal(next.lockCount??0,expected);
    if(expected!==prev.lockCount)changes.push({id:prev.id,before:prev.lockCount,after:expected});
    if(prev.lockCount>0&&expected===0){
     const firstUse=drags.findIndex((d,j)=>j>index&&d.blockId===prev.id);assert(firstUse>index);
     // Clone the valid real prefix, then remove only this runtime key attribute.
     // A whole-level deleted-key fixture is invalid under source validation;
     // this explicitly isolated intervention is only a local causal diagnosis.
     const projected=beforeModel.clone();delete projected.getBlock(body.id).keyId;
     const apply=(model,d)=>{model.beginAction();for(const p of d.path)if(!model.moveBlockStep(d.blockId,...p))return false;if(d.exitSide&&!model.tryExit(d.blockId,d.exitSide).ok)return false;return model.commitAction();};
     for(const action of drags.slice(index,firstUse))assert(apply(projected,action),'Only suppressing this key must retain the preceding actions');
     const locked=projected.snapshot().blocks.find(b=>b.id===prev.id);assert(locked?.lockCount>0);assert(!apply(projected,drags[firstUse]));
     counterfactuals.push({keyBody:body.id,lockedBody:prev.id,actualUnlockStep:index+1,firstUseStep:firstUse+1,removedOnly:'runtime keyId on isolated valid-prefix clone',suppressedKeyRemainingLock:locked.lockCount,blockedAction:drags[firstUse],localCausalityVerified:true,globalOrderProven:false,lowerBoundEvidence:false});
    }
   }
   assert(changes.length);events.push({step:index+1,keyId:body.keyId,blockId:body.id,lockChanges:changes});
  }
 }
 assert(m.snapshot().complete);assert.equal(events.length,level.blocks.filter(b=>b.keyId).length);
 assert.equal(counterfactuals.length,level.blocks.filter(b=>b.lockedBy).length);
 return{events,counterfactuals,allKeysRemoved:true,allLocksUnlocked:true,globalOptimalContributionProven:false};
}
