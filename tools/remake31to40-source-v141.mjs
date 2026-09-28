// Reviewed observations are immutable inputs; adaptations never rewrite truth.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {digest} from './revised-preview-validation-v160.mjs';
import {shapeClass as oldShapeClass} from './remake21to30-source-v139.mjs';
export const ROOT='deliverables/remake31-40-v141-20260924';
export const REVIEWS=['agent31-34','agent35-37','agent38-40'].map(p=>`${ROOT}/${p}/source-review.json`);
export const CATALOG=`${ROOT}/source-catalog.json`;
export const COLORS=['red','blue','green','yellow','purple','orange','pink','cyan'];
export function shapeClass(shape){
 const kind=oldShapeClass(shape),w=1+Math.max(...shape.map(p=>p[0])),h=1+Math.max(...shape.map(p=>p[1]));
 if(kind.startsWith('OTHER')&&shape.length===4&&w*h===6)return 'S4';
 if(shape.length===5&&w===3&&h===3&&[[1,0],[0,1],[1,1],[2,1],[1,2]].every(p=>shape.some(q=>p[0]===q[0]&&p[1]===q[1])))return 'CROSS5';
 return kind;
}
const sorted=a=>[...a].sort();
const hist=bs=>bs.reduce((h,b)=>{const k=shapeClass(b.shape);h[k]=(h[k]??0)+1;return h;},{});
const equalHist=(a,b)=>JSON.stringify(Object.entries(a).sort())===JSON.stringify(Object.entries(b).sort());
const reason=s=>assert(typeof s==='string'&&s.trim().length>=12,'Concrete necessary-adaptation rationale required');
const outer=i=>i.source_outer_color??i.source_color??i.color;
const iid=i=>i.id??i.source_id??i.sourceId;
function item(i,stage){return {id:iid(i),stage:i.stage_id??i.stage??stage,shape:typeof i.shape==='string'?i.shape:i.kind??shapeClass(i.shape),
 color:outer(i),core:i.source_core_color??i.coreColor??null,frozen:i.value??i.numeric_ice??i.frozen??0,
 shell:Boolean(i.extra_layers||i.layers?.length>1),requiresIce:Boolean(i.requires_numeric_ice||i.post_melt_shell)};}
export function normalizeSource(row){
 const m=row.mechanisms,covers=m.covers?.items??[],generators=m.generators?.items??[];
 const stages=row.stage_seeds.map(s=>{
  const id=s.id??s.stage,cover=covers.find(c=>c.sourceId===id),generator=generators.find(g=>g.sourceId===id);
  return {id,kind:s.kind??(id==='opening'?'opening':cover?'countdown_cover':'side_generator'),
   count:s.count??s.block_count,histogram:s.shape_histogram??s.shape_hist,
   counter:s.trigger_value??cover?.counter,items:(s.items??s.known_pieces??[]).map(i=>item(i,id))};
 });
 for(const s of stages){assert.equal(s.count,Object.values(s.histogram).reduce((a,b)=>a+b,0));assert.equal(s.items.length,s.count,`Lv${row.level} ${s.id}: complete reviewed inventory required`);assert(s.items.every(i=>i.id&&i.color&&i.shape));}
 const opening=stages.find(s=>s.kind==='opening');assert(opening);
 const gates=(m.directional_exits??m.gates).items.map((g,index)=>({id:iid(g)??`gate-${index}`,color:outer(g),frozen:g.frozen??0}));
 const ice=(m.numeric_ice??m.ice??{items:[]}).items.map(i=>item(i));
 const shells=(m.shells??m.shell??{items:[]}).items.map(i=>item(i));
 const fullColors=sorted(new Set(stages.flatMap(s=>s.items.flatMap(i=>[i.color,...(i.core?[i.core]:[])]))));
 const source={id:row.level,stages,gates,ice,shells,fullColors,openingColors:sorted(new Set(opening.items.map(i=>i.color))),
  openingFrame:row.stableOpeningEvidence??row.raw_evidence.openingFrame??row.raw_evidence.opening_frame,
  evidence:row.evidence,observations:row.observations,unknowns:row.unknowns??[],sourceReviewStatus:row.source_review_status??'reviewed'};
 assert(ice.every(i=>i.id&&i.stage&&i.frozen>0));assert(shells.every(i=>i.id&&i.stage));
 assert(stages.filter(s=>s.kind==='countdown_cover').every(s=>Number.isInteger(s.counter)&&s.counter>0));
 assert(gates.every(g=>g.color&&Number.isInteger(g.frozen)&&g.frozen>=0));
 return source;
}
export function loadReviewedSourceCatalog(){
 const records={},bindings={};
 const bind=(p,sha)=>{const actual=digest(fs.readFileSync(p));if(sha)assert.equal(actual,sha,`Source drift ${p}`);bindings[p]={sha256:actual};};
 for(const file of REVIEWS){
  bind(file);const review=JSON.parse(fs.readFileSync(file));assert.equal(review.ruleVersion,'1.41.0');bind(review.truth.path,review.truth.sha256);
  // A contact sheet contains multiple inspected frames; count evidence files,
  // not pretend that one sheet is only one observation.
  for(const row of review.levels){assert(!records[row.level]);assert(row.evidence.length>=2);assert.equal(new Set(row.evidence.map(e=>e.path)).size,row.evidence.length);for(const e of row.evidence)bind(e.path,e.sha256);records[row.level]=normalizeSource(row);}
 }
 assert.deepEqual(Object.keys(records).map(Number),Array.from({length:10},(_,i)=>31+i));
 return {ruleVersion:'1.41.0',records,bindings,sourceHash:digest(records),solvabilityValidated:false};
}
export function verifySourceCatalog(c){
 assert.equal(c.ruleVersion,'1.41.0');assert.deepEqual(Object.keys(c.records).map(Number),Array.from({length:10},(_,i)=>31+i));
 for(const f of REVIEWS)assert(c.bindings[f]);assert.equal(digest(c.records),c.sourceHash);
 for(const [p,b]of Object.entries(c.bindings))assert.equal(digest(fs.readFileSync(p)),b.sha256,`Source drift ${p}`);
 // A self-rehashed edited catalogue is not new source evidence.
 const fresh=loadReviewedSourceCatalog();assert.equal(c.sourceHash,fresh.sourceHash,'Catalogue must derive from bound reviews');assert.deepEqual(c.bindings,fresh.bindings);
}
export function minimumQueueColorEdits(known,palette){
 let prior=new Map(palette.map(c=>[c,0]));
 for(const color of known){const next=new Map();for(const c of palette)next.set(c,Math.min(...[...prior].filter(([p])=>p!==c).map(([,v])=>v))+(color&&c!==color?1:0));prior=next;}
 return Math.min(...prior.values());
}
export function auditSourceAlignment(level,catalog,a){
 verifySourceCatalog(catalog);const s=catalog.records[level.id];assert(s&&a);
 const map=a.colorMapping;assert.deepEqual(sorted(Object.keys(map??{})),s.fullColors);
 assert(Object.values(map).every(c=>COLORS.includes(c)));assert.equal(new Set(Object.values(map)).size,s.fullColors.length);
 const mapping=a.stageMapping??{},nonOpening=s.stages.filter(t=>t.kind!=='opening');
 assert.deepEqual(sorted(Object.keys(mapping)),sorted(nonOpening.map(t=>t.id)));
 assert.equal(new Set(Object.values(mapping)).size,nonOpening.length);
 assert.equal((level.shutters??[]).length,s.stages.filter(t=>t.kind==='countdown_cover').length);
 assert.equal((level.generators??[]).length,s.stages.filter(t=>t.kind==='side_generator').length);
 const queued=new Map((level.generators??[]).flatMap(g=>g.queueBlockIds.map(id=>[id,g.id])));
 const stageOf=b=>b.shutterId?nonOpening.find(t=>mapping[t.id]===b.shutterId)?.id:queued.has(b.id)?nonOpening.find(t=>mapping[t.id]===queued.get(b.id))?.id:'opening';
 assert(level.blocks.every(b=>stageOf(b)));
 const full=new Set(level.blocks.flatMap(b=>b.layers??[b.color]));assert.deepEqual(sorted(full),sorted(Object.values(map)),'Preserve source full colour categories');
 const openingColors=sorted(new Set(level.blocks.filter(b=>stageOf(b)==='opening').map(b=>(b.layers??[b.color])[0])));
 const expectedOpening=sorted(s.openingColors.map(c=>map[c]));
 assert(expectedOpening.every(c=>openingColors.includes(c)),'Do not drop source opening colours');
 if(JSON.stringify(openingColors)!==JSON.stringify(expectedOpening))reason(a.openingColorRationale);
 const stageRows=[];
 const allMapped=new Map();
 for(const stage of s.stages){
  const blocks=level.blocks.filter(b=>stageOf(b)===stage.id),actual=hist(blocks),exact=blocks.length===stage.count&&equalHist(actual,stage.histogram);
  if(!exact)reason(a.stages?.[stage.id]?.rationale);
  if(stage.kind==='countdown_cover'){const c=level.shutters.find(c=>c.id===mapping[stage.id]);assert(c);assert.equal(c.count,stage.counter);}
  if(stage.kind==='side_generator'){
   const g=level.generators.find(g=>g.id===mapping[stage.id]);assert(g);assert.equal(g.queueBlockIds.length,stage.count,'Preserve queue inventory per machine');
   const known=stage.items.map(i=>map[i.color]),actualColors=g.queueBlockIds.map(id=>(level.blocks.find(b=>b.id===id).layers??[level.blocks.find(b=>b.id===id).color])[0]);
   const changed=known.flatMap((c,i)=>c===actualColors[i]?[]:[i]);assert.equal(changed.length,minimumQueueColorEdits(known,Object.values(map)),'Only minimum adjacent-repeat repairs');
   if(changed.length)reason(a.queueColorRationales?.[stage.id]);
   for(let i=0;i<stage.count;i++){
    const b=level.blocks.find(b=>b.id===g.queueBlockIds[i]),source=stage.items[i];
    allMapped.set(source.id,[b]);
    if(shapeClass(b.shape)!==source.shape)reason(a.carrierShapeRationales?.[b.id]);
   }
  }else{
   const assigned=[];
   for(const source of stage.items){
    const ids=a.blockMapping?.[source.id];assert(Array.isArray(ids)&&ids.length,`Bind known source body ${source.id}`);assert.equal(new Set(ids).size,ids.length);
    const bodies=ids.map(id=>blocks.find(b=>b.id===id));assert(bodies.every(Boolean),'Known body has wrong stage');allMapped.set(source.id,bodies);assigned.push(...ids);
    for(const b of bodies){assert.equal((b.layers??[b.color])[0],map[source.color],'Keep known colour/shape/carrier pairing');
     if(shapeClass(b.shape)!==source.shape||bodies.length!==1)reason(a.carrierShapeRationales?.[b.id]);}
   }
   assert.equal(new Set(assigned).size,assigned.length,'Known source bodies require disjoint bindings even in adapted stages');
   if(exact)assert.equal(assigned.length,stage.count,'Exact shape/count stages require distinct known-body bindings');
  }
  stageRows.push({id:stage.id,sourceCount:stage.count,sourceHistogram:stage.histogram,count:blocks.length,histogram:actual,exact,adaptation:exact?null:a.stages[stage.id]});
 }
 for(const [kind,items]of [['ice',s.ice],['shell',s.shells]]){
  const bound=[];
  for(const source of items){const bs=allMapped.get(source.id);assert(bs?.length===1,'Mechanism carriers may not merge/split');const b=bs[0];bound.push(b.id);
   assert.equal(stageOf(b),source.stage);if(kind==='ice')assert.equal(b.frozen,source.frozen);
   else{assert.equal(b.layers?.length,2);if(source.core)assert.equal(b.layers[1],map[source.core]);assert.equal(Boolean(b.frozen),source.requiresIce);}}
  const actual=level.blocks.filter(b=>kind==='ice'?b.frozen>0:b.layers?.length>1).map(b=>b.id);
  assert.deepEqual(sorted(bound),sorted(actual),`Preserve all and only source ${kind} instances`);
 }
 const boundGates=a.gateBindings??[],omitted=a.omittedGates??[];
 assert.deepEqual(sorted([...boundGates,...omitted].map(r=>r.sourceId)),sorted(s.gates.map(g=>g.id)));
 assert.deepEqual(sorted(boundGates.map(r=>r.gateId)),sorted(level.gates.map(g=>g.id)));
 for(const bind of boundGates){const source=s.gates.find(g=>g.id===bind.sourceId),g=level.gates.find(g=>g.id===bind.gateId);assert(source&&g);assert.equal(g.color,map[source.color]);assert.equal(g.frozen??0,source.frozen);}
 for(const omit of omitted){const source=s.gates.find(g=>g.id===omit.sourceId);reason(omit.reason);
  assert(boundGates.some(b=>s.gates.find(g=>g.id===b.sourceId).color===source.color),'Only duplicate-colour mouth capacity adaptation is qualified');}
 return {passed:true,sourceCatalogSha256:catalog.sourceHash,stageRows,colorMapping:map,sourceGateCount:s.gates.length,actualGateCount:level.gates.length,
  omittedGates:omitted,mechanismValuesMatchedExceptRecordedDuplicateMouths:true,solvabilityValidated:false};
}
