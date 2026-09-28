import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {inventory,isGlobalIsometry,partitionKey,auditCandidate,assertBaseline,BASELINE,loadApi,ruleGate} from './layout-originality-v140.mjs';
const baseline=JSON.parse(fs.readFileSync(BASELINE)),{api}=await loadApi();
test('current 43-rule lock and exact four-level immutable baseline',()=>{ruleGate();assertBaseline(baseline);assert.equal(baseline.scope.length,4);});
test('rejects missing, empty or duplicate before-candidate bindings',()=>{
 for(const rows of [[],baseline.beforeCandidates.slice(1),[baseline.beforeCandidates[0],...baseline.beforeCandidates.slice(0,3)]]){
  assert.throws(()=>assertBaseline({...baseline,beforeCandidates:rows}),/Bind every named/);
 }
});
const old=baseline.levels[21].level;
test('coordinate movement preserves inventory but changing ice or stage does not',()=>{
 const moved=structuredClone(old);moved.blocks[0].x++;assert.deepEqual(inventory(moved),inventory(old));
 moved.blocks.find(b=>b.frozen).frozen++;assert.notDeepEqual(inventory(moved),inventory(old));
 const changed=structuredClone(old);delete changed.blocks.find(b=>b.shutterId).shutterId;assert.notDeepEqual(inventory(changed),inventory(old));
});
test('geometry partition ignores colour and ID swaps',()=>{
 const copy=structuredClone(old);copy.blocks.forEach((b,i)=>{b.id=`renamed-${i}`;b.color='red';});
 assert.equal(partitionKey(copy),partitionKey(old));assert(isGlobalIsometry(old,copy));
});
test('rejects mere full-board vertical reflection independent of shape array order',()=>{
 const copy=structuredClone(old);for(const b of copy.blocks){const height=Math.max(...b.shape.map(p=>p[1]))+1;b.y=old.height-b.y-height;b.shape=b.shape.map(([x,y])=>[x,height-1-y]).reverse();}
 for(const s of copy.shutters)s.y=old.height-s.y-s.height;
 assert(isGlobalIsometry(old,copy));
});
test('recognizes a truly changed piece partition separately from mirror/recolour',()=>{
 const copy=structuredClone(old),red=copy.blocks.find(b=>!b.shutterId&&b.shape.length===2),single=copy.blocks.find(b=>b.x===2&&b.y===0);
 red.x=1;single.x=0;assert(!isGlobalIsometry(old,copy));
});
test('new authoring rejects a correct historical map with just new prose',()=>{
 const d=JSON.parse(fs.readFileSync(baseline.beforeCandidates[0].file));d.originality={layoutIntent:'声称新设计但实际未改数据',alignment:'保持原有布局整齐对齐',changes:'这里只修改设计描述文本',constraints:'保留所有旧块与机关配置'};
 assert.throws(()=>auditCandidate(d,baseline,api),/recolour\/global mirror\/rotation/);
});
test('new scope rejects a non-named level and any peripheral difficulty change',()=>{
 const d={level:structuredClone(baseline.levels[24].level)};assert.throws(()=>auditCandidate(d,baseline,api),/Only four/);
 d.level=structuredClone(baseline.levels[20].level);d.level.difficulty='normal';assert.throws(()=>auditCandidate(d,baseline,api),/Preserve difficulty/);
});
