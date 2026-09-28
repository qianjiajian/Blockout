import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {loadReviewedSourceCatalog,normalizeSource,auditSourceAlignment} from './remake41to50-source-v146.mjs';
const catalog=loadReviewedSourceCatalog([44]),source=catalog.records[44];
const shapes={SINGLE:[[0,0]],H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],H3:[[0,0],[1,0],[2,0]],V3:[[0,0],[0,1],[0,2]],SQ2:[[0,0],[1,0],[0,1],[1,1]],L3:[[0,0],[0,1],[1,1]]};
// Source-contract fixture only: spatial packing and solvability intentionally
// remain outside this unit test and are required by the full candidate gate.
function fixture(){
 const stageMapping=Object.fromEntries(source.stages.filter(s=>s.kind!=='opening').map(s=>[s.id,'candidate-'+s.id]));
 const hiddenOwnerAssignments=Object.fromEntries(source.hiddenInventory.items.map((i,n)=>[i.id,stageMapping[source.hiddenInventory.sourceCoverIds[n%5]]]));
 const block=(i,extra={})=>({id:i.id,x:0,y:0,color:i.color,shape:shapes[i.shape],...(i.frozen?{frozen:i.frozen}:{}),...(i.core?{layers:[i.color,i.core]}:{}),...extra});
 const blocks=source.stages.flatMap(s=>s.items.map(i=>block(i))),hidden=source.hiddenInventory.items.map(i=>block(i,{shutterId:hiddenOwnerAssignments[i.id]}));blocks.push(...hidden);
 const gs=source.gates.filter((g,n)=>source.gates.findIndex(i=>i.color===g.color)===n),level={id:44,blocks,gates:gs.map(g=>({id:'c-'+g.id,color:g.color,...(g.frozen?{frozen:g.frozen}:{})})),
  shutters:source.stages.filter(s=>s.kind==='countdown_cover').map(s=>({id:stageMapping[s.id],count:s.counter})),generators:source.stages.filter(s=>s.kind==='side_generator').map(s=>({id:stageMapping[s.id],queueBlockIds:s.items.map(i=>i.id)}))};
 const a={colorMapping:Object.fromEntries(source.fullColors.map(c=>[c,c])),stageMapping,blockMapping:Object.fromEntries([...source.stages.filter(s=>s.kind!=='side_generator').flatMap(s=>s.items),...source.hiddenInventory.items].map(i=>[i.id,[i.id]])),hiddenOwnerAssignments,
  hiddenOwnershipRationale:'源五帘同时揭开且真实体跨视觉边界，原owner无法确认，候选逐件分配真实区域，明确为原创归属。',gateBindings:gs.map(g=>({sourceId:g.id,gateId:'c-'+g.id})),omittedGates:source.gates.filter(g=>!gs.includes(g)).map(g=>({sourceId:g.id,reason:'源同色红普通口重复，按每色唯一规则最少移除这一重复口，其它来源初值保持。'}))};
 return {level,a};
}
test('known aggregate is bound in full while unknown owners remain explicitly authored',()=>{
 const {level,a}=fixture(),r=auditSourceAlignment(level,catalog,a);assert(r.passed);assert.equal(r.stageRows[0].sourceCount,8);assert.equal(r.stageRows[0].ownerIsAuthored,true);assert(r.stageRows.slice(1).filter(r=>r.sourceCount===null).length===5);
});
test('missing hidden ice/shell/body or invented owner cannot pass by marking ownership unknown',()=>{
 for(const mutate of [
  d=>delete d.level.blocks.find(b=>b.id==='44-h8').frozen,
  d=>delete d.level.blocks.find(b=>b.id==='44-h6').layers,
  d=>d.level.blocks=d.level.blocks.filter(b=>b.id!=='44-h5'),
  d=>d.a.hiddenOwnerAssignments['44-h1']='opening',
  d=>d.a.blockMapping['44-h1']=['44-h2'],
  d=>delete d.a.hiddenOwnerAssignments['44-h1'],
  d=>d.level.shutters[0].count=5,
  d=>d.level.blocks.find(b=>b.id==='44-h8').shutterId=undefined,
 ]){const d=fixture();mutate(d);assert.throws(()=>auditSourceAlignment(d.level,catalog,d.a));}
});
test('unknown source count is not silently accepted without this bound aggregate contract',()=>{
 const r=JSON.parse(fs.readFileSync('deliverables/remake41-50-v146-20260924/agent44-46/review44-pending-aggregate-schema.json'));
 for(const mutate of [d=>delete d.known_hidden_inventory,d=>d.level=45,d=>d.known_hidden_inventory.sourceCoverIds.pop(),d=>d.known_hidden_inventory.items.pop()]){const d=structuredClone(r);mutate(d);assert.throws(()=>normalizeSource(d));}
});
