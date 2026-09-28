import assert from 'node:assert/strict';

// A legal alternative prefix isolates one ice constraint. These are local
// causality checks; they neither replace the official route nor prove a bound.
export function verifyIceBranches(data,api){
 assert.equal(data.level.id,87);
 assert.equal(data.mechanismCases?.length,2);
 assert.deepEqual(data.mechanismCases.map(c=>c.kind).sort(),['block-ice-side-branch','gate-ice-side-branch']);
 return data.mechanismCases.map(c=>{
  const field=c.kind==='block-ice-side-branch'?'blocks':'gates',id=c.blockId??c.gateId;
  assert.deepEqual(c.onlyRemovedFields,['frozen']);
  assert(c.notOfficialRoute&&!c.globalOrderProven);
  assert(Number.isSafeInteger(c.branchStartBeforeDrag)&&c.branchStartBeforeDrag>0);
  const mainPrefix=data.drags.slice(0,c.branchStartBeforeDrag-1);
  assert.deepEqual(c.prefix.slice(0,mainPrefix.length),mainPrefix);
  assert.equal(c.prefix.length-mainPrefix.length,c.extraLegalRepositionDrags);
  const before=api.replayRevisedRoute(data.level,c.prefix);assert(before.valid&&!before.complete);
  const state=JSON.parse(before.finalStateKey),target=state[field].find(x=>x.id===id);
  assert(target?.frozen>0);assert.equal(target.frozen,c.remainingIce);assert.equal(state.cleared,c.cleared);
  const main=api.replayRevisedRoute(data.level,mainPrefix);assert(main.valid);
  assert.equal(JSON.parse(main.finalStateKey).cleared,state.cleared,'Branch is parking only');
  const relaxed=structuredClone(data.level);delete relaxed[field].find(x=>x.id===id).frozen;
  const relaxedBefore=api.replayRevisedRoute(relaxed,c.prefix);assert(relaxedBefore.valid);
  const restored=JSON.parse(relaxedBefore.finalStateKey);restored[field].find(x=>x.id===id).frozen=target.frozen;
  assert.deepEqual(restored,state,'Only target ice may differ at the fork');
  if(field==='blocks')assert.equal(c.blockedAction.blockId,id);
  else {assert(c.blockedAction.exitSide);assert.equal(c.blockedAction.exitSide,target.side);}
  const rejected=api.replayRevisedRoute(data.level,[...c.prefix,c.blockedAction]);
  const allowed=api.replayRevisedRoute(relaxed,[...c.prefix,c.blockedAction]);
  assert(!rejected.valid);assert(allowed.valid,allowed.error);
  if(field==='gates')assert(JSON.parse(allowed.finalStateKey).cleared>state.cleared);
  return{kind:c.kind,targetId:id,prefix:c.prefix,action:c.blockedAction,remainingIce:target.frozen,sourceRejection:rejected.error,localConstraintVerified:true,officialRoute:false,globalOrderProven:false};
 });
}
