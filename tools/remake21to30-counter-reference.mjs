// Source facts are read independently; candidate-authored explanations never
// replace the actual source values or imply exact competitor parity.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
export const COUNTER_SOURCE='deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
export function countValues(level){
  return {curtains:(level.shutters??[]).map(s=>({id:s.id,value:s.count})),
    iceBlocks:level.blocks.filter(b=>b.frozen>0).map(b=>({id:b.id,value:b.frozen,hidden:Boolean(b.shutterId)})),
    iceGates:level.gates.filter(g=>g.frozen>0).map(g=>({id:g.id,value:g.frozen})),
    clearLoad:level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0)};
}
export function counterReference(level,previous,explanation){
  assert(typeof explanation==='string'&&explanation.trim().length>=12,'Explicit counter adaptation explanation required');
  const bytes=fs.readFileSync(COUNTER_SOURCE),record=JSON.parse(bytes).levels.find(r=>r.level===level.id);assert(record);
  const m=record.mechanisms;
  return {source:COUNTER_SOURCE,sourceFileSha256:sha(bytes),sourceLevel:record.level,
    provenance:record.provenance,sourceValues:{curtains:m.covers?.values??[],iceBlocks:m.numeric_ice?.values??[],iceGates:m.directional_exits?.frozen_values??[]},
    sourceNoSuchMechanismMeans:'not present in corresponding source level, not a zero-value target',
    before:countValues(previous),designed:countValues(level),designExplanation:explanation,exactCompetitorParityClaimed:false};
}
