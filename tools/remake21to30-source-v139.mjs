// Source facts and necessary layout adaptations are separate. No solvability claims.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadMechanismInventory,applyInventoryReview,INVENTORY_REVIEWS} from './revised-source-inventory.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
export const TRUTH='deliverables/level-generation-blueprint/blockout-lv001-lv100-video-parity-truth-v6.json';
export const DIRECT='.codex-temp/video-audit-21-30-independent/audit-lv021-030.json';
const colors=new Set(['red','blue','green','yellow','purple','orange','pink','cyan']);
const sorted=a=>[...a].sort((x,y)=>typeof x==='number'?x-y:String(x).localeCompare(String(y)));
const reason=s=>assert(typeof s==='string'&&s.trim().length>=12,'Necessary adaptation must have a concrete explanation');
export async function loadSourceCatalog(){
  const truthBytes=fs.readFileSync(TRUTH),directBytes=fs.readFileSync(DIRECT);
  const reviews=await loadMechanismInventory({root:process.cwd(),truthSha256:digest(truthBytes),directSha256:digest(directBytes)});
  const truth=JSON.parse(truthBytes),records={};
  for(let id=21;id<=30;id++)records[id]=applyInventoryReview(truth.levels.find(r=>r.level===id),reviews.rows.get(id));
  return {records,bindings:{...reviews.bindings,[TRUTH]:{sha256:digest(truthBytes)},[DIRECT]:{sha256:digest(directBytes)}},
    sourceHash:digest(records),solvabilityValidated:false};
}
export function verifySourceCatalog(catalog){
  for(const p of [TRUTH,DIRECT,...INVENTORY_REVIEWS])assert(catalog.bindings[p],'Missing source/review file binding');
  assert.deepEqual(Object.keys(catalog.records).map(Number),Array.from({length:10},(_,i)=>21+i));
  assert.equal(digest(catalog.records),catalog.sourceHash);
  for(const [file,b]of Object.entries(catalog.bindings))assert.equal(digest(fs.readFileSync(file)),b.sha256,`Source drift: ${file}`);
}
export function shapeClass(shape){
  assert(Array.isArray(shape)&&shape.length&&shape.every(p=>p.length===2&&p.every(Number.isSafeInteger)));
  assert.equal(new Set(shape.map(p=>p.join(','))).size,shape.length);
  const w=Math.max(...shape.map(p=>p[0]))-Math.min(...shape.map(p=>p[0]))+1;
  const h=Math.max(...shape.map(p=>p[1]))-Math.min(...shape.map(p=>p[1]))+1;
  if(shape.length===w*h){if(h===1)return w===1?'SINGLE':`H${w}`;if(w===1)return `V${h}`;if(w===h)return `SQ${w}`;return `RECT${w}x${h}`;}
  if(shape.length===3&&w===2&&h===2)return 'L3';
  const points=new Set(shape.map(p=>p.join(',')));
  if(shape.length===4){
    if(shape.some(([x,y])=>[[1,0],[-1,0],[0,1],[0,-1]].filter(([dx,dy])=>points.has(`${x+dx},${y+dy}`)).length===3))return 'T4';
    if(shape.some(([x,y])=>shape.filter(p=>p[0]===x).length===3||shape.filter(p=>p[1]===y).length===3))return 'L4';
  }
  return `OTHER-${w}x${h}-${shape.length}`;
}
const histogram=blocks=>blocks.reduce((h,b)=>{const k=shapeClass(b.shape);h[k]=(h[k]??0)+1;return h;},{});
const equalHist=(a,b)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());
const layerColors=b=>b.layers??[b.color];
export function auditSourceAlignment(level,catalog,adaptation){
  verifySourceCatalog(catalog);const s=catalog.records[level.id];assert(s,'Only source 21–30 is qualified');
  assert(adaptation&&typeof adaptation==='object','sourceAdaptation is required');
  const {colorMapping,stageMapping}=adaptation;
  const sourceColors=s.raw_evidence.colors.full_classes;
  assert.deepEqual(sorted(Object.keys(colorMapping??{})),sorted(sourceColors));
  assert(Object.values(colorMapping).every(c=>colors.has(c)));assert.equal(new Set(Object.values(colorMapping)).size,sourceColors.length,'Source colors must not be merged');
  const stages=s.stage_seeds,hidden=stages.filter(t=>t.kind==='countdown_cover'),curtains=level.shutters??[];
  assert.equal(curtains.length,hidden.length,'Keep actual source curtain count');
  assert.deepEqual(sorted(Object.keys(stageMapping??{})),sorted(hidden.map(t=>t.id)));
  assert.equal(new Set(Object.values(stageMapping)).size,hidden.length,'One real curtain per source stage');
  const candidateStage=b=>b.shutterId?hidden.find(t=>stageMapping[t.id]===b.shutterId)?.id:'opening';
  assert(level.blocks.every(b=>stages.some(t=>t.id===candidateStage(b))),'Unknown hidden owner');
  for(const stage of hidden){const c=curtains.find(c=>c.id===stageMapping[stage.id]);assert(c);assert.equal(c.count,stage.trigger_value,'Keep curtain initial count / stage pairing');}
  const sourceExits=s.mechanisms.directional_exits;
  assert.deepEqual(sorted(level.gates.filter(g=>g.frozen>0).map(g=>g.frozen)),sorted(sourceExits.frozen_values),'Keep all source frozen gate values');
  // Source multiple same-color physical mouths cannot survive our unique-mouth rule.
  // These exact reductions are reviewed batch choices, not a general deletion waiver.
  const expectedOrdinary=level.id===26?4:level.id===30?3:sourceExits.ordinary_count;
  assert.equal(level.gates.filter(g=>!(g.frozen>0)).length,expectedOrdinary,'Source ordinary-mouth count or reviewed capacity adaptation');
  if(expectedOrdinary!==sourceExits.ordinary_count)reason(adaptation.exitCapacityRationale);
  const actualFullColors=new Set(level.blocks.flatMap(layerColors));
  assert([...actualFullColors].every(c=>colors.has(c)),'Unknown game color');
  const extra=sorted([...actualFullColors].filter(c=>!Object.values(colorMapping).includes(c)));
  if(level.id===25){assert.equal(extra.length,1,'Lv25 needs one explicit extra cargo color for eight unique useful mouths');reason(adaptation.extraColorRationale);}
  else assert.deepEqual(extra,[],'Do not invent source-external block colors');
  assert(Object.values(colorMapping).every(c=>actualFullColors.has(c)),'Do not discard a source color category');
  const opening=level.blocks.filter(b=>!b.shutterId),sourceOpening=s.raw_evidence.colors.opening_classes.map(c=>colorMapping[c]);
  assert.deepEqual(sorted(new Set(opening.map(b=>layerColors(b)[0]))),sorted([...sourceOpening,...extra]),'Opening colors must preserve source categories');
  const stageRows=[];
  for(const stage of stages){
    const blocks=level.blocks.filter(b=>candidateStage(b)===stage.id),actual=histogram(blocks);
    const exact=equalHist(actual,stage.shape_histogram)&&blocks.length===stage.count;
    if(!exact)reason(adaptation.stages?.[stage.id]?.rationale);
    stageRows.push({id:stage.id,sourceCount:stage.count,sourceHistogram:stage.shape_histogram,
      count:blocks.length,histogram:actual,exact,adaptation:exact?null:adaptation.stages[stage.id]});
  }
  function bindCarriers(items,ids,kind){
    assert(Array.isArray(ids)&&ids.length===items.length,`Bind every ${kind} source item`);assert.equal(new Set(ids).size,ids.length);
    const actual=level.blocks.filter(b=>kind==='ice'?b.frozen>0:layerColors(b).length>1);
    assert.deepEqual(sorted(actual.map(b=>b.id)),sorted(ids),`Do not add or omit ${kind} carriers`);
    for(const [i,item]of items.entries()){
      const block=actual.find(b=>b.id===ids[i]);assert.equal(candidateStage(block),item.stage_id,'Keep mechanism stage ownership');
      if(kind==='ice')assert.equal(block.frozen,item.value,'Keep ice value per carrier');
      if(kind==='shell'){
        assert.equal(layerColors(block).length,2);
        assert.equal(Boolean(block.frozen>0),Boolean(item.requires_numeric_ice),'Keep ice/shell attachment');
      }
      const layers=layerColors(block);
      if(item.source_outer_color)assert.equal(layers[0],colorMapping[item.source_outer_color]);
      if(item.source_core_color)assert.equal(layers.at(-1),colorMapping[item.source_core_color]);
      if(shapeClass(block.shape)!==item.shape)reason(adaptation.carrierShapeRationales?.[block.id]);
    }
  }
  bindCarriers(s.mechanisms.numeric_ice.items,adaptation.numericIceBlockIds,'ice');
  bindCarriers(s.mechanisms.shells.items,adaptation.shellBlockIds,'shell');
  return {passed:true,sourceLevel:level.id,sourceCatalogSha256:catalog.sourceHash,stageRows,colorMapping,
    exactOpeningShapeCounts:stageRows.find(r=>r.id==='opening').exact,extraColors:extra,
    sourceOrdinaryMouths:sourceExits.ordinary_count,actualOrdinaryMouths:expectedOrdinary,
    mechanismValuesMatched:true,solvabilityValidated:false};
}
