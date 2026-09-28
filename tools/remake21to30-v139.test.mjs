import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {verifyRulesLock} from './verify-rules-lock.mjs';
import {BASELINE,VERSION,TARGETS,ruleGate,assertBaseline} from './remake21to30-v139.mjs';
import {shapeClass,auditSourceAlignment} from './remake21to30-source-v139.mjs';
const baseline=JSON.parse(fs.readFileSync(BASELINE));
test('new batch retains cadence with exact v1.38 inclusive numerical targets',()=>{
  assert.equal(VERSION,'1.39.0');
  assert.deepEqual(Object.values(TARGETS).map(t=>[t.min,t.max]),[[5,10],[11,15],[11,15],[16,20],[5,10],[11,15],[16,20],[5,10],[11,15],[21,30]]);
  const lock=verifyRulesLock();assert(lock.ok);assert(lock.verified.some(v=>v.version===VERSION));
  if(lock.activeVersion===VERSION)assert.equal(ruleGate().activeVersion,VERSION);
  else assert.throws(()=>ruleGate(),'Historical CLI must not accept a newer active rule');
  assertBaseline(baseline);
  const drift=structuredClone(baseline);drift.levels[20].level.timeSeconds++;
  assert.throws(()=>assertBaseline(drift));
});
test('source catalog applies reviewed corrections and does not confuse opening/full data',()=>{
  const s=baseline.sources.records;
  assert.equal(s[21].mechanisms.shells.count,4);
  assert.equal(s[29].composition.source_full_piece_count,32);
  assert.equal(s[30].composition.opening_piece_count,16);
  assert.equal(s[30].composition.source_full_piece_count,21);
  for(const r of Object.values(s))assert(r.mechanisms.numeric_ice.items.every(i=>i.stage_id!=='opening'));
});
test('shape classes use actual footprint and distinguish orientation',()=>{
  assert.equal(shapeClass([[0,0],[1,0]]),'H2');
  assert.equal(shapeClass([[3,2],[3,3]]),'V2');
  assert.equal(shapeClass([[0,0],[1,0],[0,1]]),'L3');
  assert.equal(shapeClass([[0,0],[0,1],[0,2],[1,2]]),'L4');
  assert.equal(shapeClass([[0,0],[1,0],[2,0],[1,1]]),'T4');
  assert.throws(()=>shapeClass([[0,0],[0,0]]));
});
function example(){
  // Synthetic inventory only, not a spatially valid or playable map.
  const shape={H2:[[0,0],[1,0]],V2:[[0,0],[0,1]],V3:[[0,0],[0,1],[0,2]],SQ2:[[0,0],[1,0],[0,1],[1,1]]};
  const colorMapping={yellow:'yellow',green:'green',red:'red',blue:'blue',magenta:'pink'};
  const colors=Object.values(colorMapping),blocks=[];
  for(const stage of baseline.sources.records[21].stage_seeds){
    let i=0;for(const [key,count]of Object.entries(stage.shape_histogram))for(let j=0;j<count;j++){
      blocks.push({id:`${stage.id}-${i}`,color:colors[i%5],shape:shape[key],x:0,y:0,...(stage.id==='opening'?{}:{shutterId:stage.id})});i++;
    }
  }
  const block=id=>blocks.find(b=>b.id===id);
  block('cover-1-0').frozen=6;block('cover-1-0').color='red';
  block('cover-1-1').layers=['red','yellow'];block('cover-1-2').layers=['blue','pink'];
  block('cover-2-0').layers=['green','blue'];block('cover-2-2').layers=['pink','yellow'];block('cover-2-2').frozen=2;
  return {level:{id:21,blocks,gates:[{color:'red'},{color:'blue'},{color:'green',frozen:2},{color:'yellow',frozen:6},{color:'pink',frozen:13}],
    shutters:[{id:'cover-1',count:10},{id:'cover-2',count:17},{id:'cover-3',count:19}]},
    sourceAdaptation:{colorMapping,stageMapping:{'cover-1':'cover-1','cover-2':'cover-2','cover-3':'cover-3'},numericIceBlockIds:['cover-1-0','cover-2-2'],
      shellBlockIds:['cover-1-1','cover-1-2','cover-2-0','cover-2-2']}};
}
const audit=d=>auditSourceAlignment(d.level,baseline.sources,d.sourceAdaptation);
test('source-aligned inventory passes only the inventory subcheck, not solvability',()=>{
  const d=example(),before=JSON.stringify(d),r=audit(d);
  assert(r.passed&&r.mechanismValuesMatched&&r.exactOpeningShapeCounts);assert.equal(r.solvabilityValidated,false);
  assert.equal(JSON.stringify(d),before);
});
test('same total counters or count cannot hide changed per-instance values / stage pairing',()=>{
  let d=example();d.level.shutters[0].count++;d.level.shutters[1].count--;assert.throws(()=>audit(d));
  d=example();[d.sourceAdaptation.stageMapping['cover-1'],d.sourceAdaptation.stageMapping['cover-2']]=['cover-2','cover-1'];assert.throws(()=>audit(d));
  d=example();d.level.gates[2].frozen=3;d.level.gates[3].frozen=5;assert.throws(()=>audit(d));
});
test('hidden ice/shell properties cannot be moved to opening, omitted, or added',()=>{
  let d=example();delete d.level.blocks.find(b=>b.id==='cover-1-0').shutterId;assert.throws(()=>audit(d));
  d=example();delete d.level.blocks.find(b=>b.id==='cover-2-2').layers;assert.throws(()=>audit(d));
  d=example();d.level.blocks[0].frozen=6;assert.throws(()=>audit(d));
});
test('known source colors and ice/shell pairings remain distinct and owned',()=>{
  let d=example();d.sourceAdaptation.colorMapping.magenta='blue';assert.throws(()=>audit(d));
  d=example();d.level.blocks.find(b=>b.id==='cover-2-2').layers=['pink','green'];assert.throws(()=>audit(d));
  d=example();d.level.blocks.find(b=>b.id==='cover-1-1').frozen=2;delete d.level.blocks.find(b=>b.id==='cover-2-2').frozen;assert.throws(()=>audit(d));
});
test('shape/count deviations are reported as adaptations, never exact parity',()=>{
  const d=example();d.level.blocks[0].shape=[[0,0]];assert.throws(()=>audit(d));
  d.sourceAdaptation.stages={opening:{rationale:'测试必要结构容量适配，非通关验收或精确复制'}};
  assert.equal(audit(d).exactOpeningShapeCounts,false);
});
