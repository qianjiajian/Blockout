// Verified local source inventory. Kind parity is distinct from count/value parity.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {digest} from './revised-preview-validation-v160.mjs';
import {COUNTER_SOURCE} from './remake21to30-counter-reference.mjs';
export const SOURCE_KIND_KEYS=Object.freeze(['frozen-exit','numeric-ice','shell','curtain','irregular-block']);
const rectangles=new Set(['SINGLE','H2','H3','V2','V3','SQ2','SQ3']);
const irregulars=new Set(['L3','L4','T4','S4','Z4','U5','PLUS5']);
const int=value=>{assert(Number.isSafeInteger(value)&&value>=0,'Unknown/invalid source count');return value;};
export const irregularShape=shape=>{
  assert(Array.isArray(shape)&&shape.length>0);
  const xs=shape.map(p=>p[0]),ys=shape.map(p=>p[1]);
  assert(shape.every(p=>p.length===2&&p.every(Number.isSafeInteger)));
  assert.equal(new Set(shape.map(p=>p.join(','))).size,shape.length);
  return shape.length!==(Math.max(...xs)-Math.min(...xs)+1)*(Math.max(...ys)-Math.min(...ys)+1);
};
export function sourceKindInventory(id){
  assert(Number.isSafeInteger(id)&&id>=21&&id<=30,'This verified source contract is scoped to 21–30');
  const bytes=fs.readFileSync(COUNTER_SOURCE),record=JSON.parse(bytes).levels.find(r=>r.level===id);assert(record);
  assert(['source_fps_exact','source_fps_exact_reaudited'].includes(record.provenance.confidence),'Source first needs verified review');
  assert.deepEqual(record.provenance.unclear_fields,[]);assert.deepEqual(record.provenance.design_fill_fields,[]);
  const m=record.mechanisms,h=record.composition.source_full_shape_histogram;
  assert(h&&Object.keys(h).length,'Missing source full shape inventory');
  for(const key of Object.keys(m))assert(['directional_exits','numeric_ice','shells','covers'].includes(key),'New source kind requires review');
  let irregular=0;
  for(const [shape,n]of Object.entries(h)){
    assert(rectangles.has(shape)||irregulars.has(shape),'Unknown source shape kind');int(n);
    if(irregulars.has(shape))irregular+=n;
  }
  const counts={'frozen-exit':m.directional_exits.frozen_values.length,'numeric-ice':m.numeric_ice?int(m.numeric_ice.count):0,
    shell:m.shells?int(m.shells.count):0,curtain:m.covers?int(m.covers.count):0,'irregular-block':irregular};
  for(const n of Object.values(counts))int(n);
  return {id,source:COUNTER_SOURCE,sourceFileSha256:digest(bytes),sourceRecordSha256:digest(record),provenance:record.provenance,
    counts,kinds:SOURCE_KIND_KEYS.filter(k=>counts[k]>0),sourceFullShapes:h,exactCountParityRequired:false};
}
export function designedKindInventory(level){
  const counts={'frozen-exit':level.gates.filter(g=>(g.frozen??0)>0).length,
    'numeric-ice':level.blocks.filter(b=>(b.frozen??0)>0).length,shell:level.blocks.filter(b=>(b.layers?.length??1)>1).length,
    curtain:(level.shutters??[]).filter(s=>s.skin===undefined||s.skin==='shutter').length,
    'irregular-block':level.blocks.filter(b=>irregularShape(b.shape)).length};
  return {counts,kinds:SOURCE_KIND_KEYS.filter(k=>counts[k]>0)};
}
export function auditSourceKinds(level){
  const source=sourceKindInventory(level.id),designed=designedKindInventory(level);
  const missing=source.kinds.filter(k=>!designed.kinds.includes(k)),unexpected=designed.kinds.filter(k=>!source.kinds.includes(k));
  // This batch adds more instances of the already-present newly unlocked
  // curtain, not arbitrary old kinds or curtains in the no-curtain Lv25.
  assert.deepEqual(missing,[],`Lv${level.id}: missing corresponding competitor mechanism kinds`);
  assert.deepEqual(unexpected,[],`Lv${level.id}: unsupported source-external mechanism kinds`);
  return {passed:true,source,designed,missing,unexpected,exactKindParity:true,exactCountParity:false,solvabilityValidated:false};
}
