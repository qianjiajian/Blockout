import fs from 'node:fs';
import assert from 'node:assert/strict';
import {api,baseline,ruleGate,audit,save,digest,ROOT} from './common.mjs';
import {loadApi} from '../native-block-repair-v143.mjs';
Error.stackTraceLimit=2;
ruleGate();
const modulePath='src/core/remake151to160.ts',fixturePath='tests/fixtures/remake151to160-v102.json';
const prior=fs.existsSync(fixturePath)?JSON.parse(fs.readFileSync(fixturePath)):{rows:[]};
const rows=new Map(prior.rows.map(r=>[r.id,r]));
const candidates=process.argv.slice(2).map(file=>({file,data:JSON.parse(fs.readFileSync(file))}));
assert(candidates.length);
const reports=fs.readdirSync(ROOT,{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name.startsWith('pointer-')).map(e=>ROOT+'/'+e.name+'/report.json').filter(fs.existsSync).map(file=>({file,data:JSON.parse(fs.readFileSync(file))}));
for(const {file,data}of candidates){
 const id=data.level.id;assert(id>=151&&id<=160);assert(data.formalReadyReview?.passed);assert.equal(data.formalReadyReview.levelSha256,digest(data.level));assert.equal(data.formalReadyReview.routeSha256,digest(data.drags));
 assert(audit(data.level).passed);const replay=api.replayRevisedRoute(data.level,data.drags);assert(replay.valid&&replay.complete);
 assert.deepEqual(api.LEVELS[id-1],rows.get(id)?.level??baseline.levels[id-1].level,'Target changed outside this adoption');
 for(const[p,h]of Object.entries(data.sourceReview.bindings))assert.equal(digest(fs.readFileSync(p)),h);
 const pointers=[];for(const [width,height]of [[320,568],[496,1078]]){
  const r=reports.findLast(r=>r.data.status==='PASS'&&r.data.viewport.width===width&&r.data.viewport.height===height&&r.data.rows.some(x=>x.id===id&&x.status==='PASS'&&x.levelSha256===digest(data.level)&&x.routeSha256===digest(data.drags)));
  assert(r,`Missing candidate input ${id} ${width}x${height}`);pointers.push({file:r.file,sha256:digest(fs.readFileSync(r.file))});
 }
 rows.set(id,{id,level:data.level,drags:data.drags,lowerBound:baseline.schedule.find(s=>s.id===id).range[0],upperBound:replay.nonClearingDrags,ready:{file,sha256:digest(fs.readFileSync(file))},candidatePointers:pointers});
}
const ordered=[...rows.values()].sort((a,b)=>a.id-b.id);
const inputFiles=['src/core/levels.ts','src/game/formalBlockShapes.ts',...(fs.existsSync(modulePath)?[modulePath,fixturePath]:[])];
const beforeBytes=Object.fromEntries(inputFiles.map(p=>[p,fs.readFileSync(p,'utf8')]));
const before=save('adoption-before',{activeVersion:ruleGate().activeVersion,levels:api.LEVELS,files:beforeBytes,candidates:candidates.map(c=>({file:c.file,sha256:digest(fs.readFileSync(c.file))}))});
let levels=beforeBytes['src/core/levels.ts'],shapes=beforeBytes['src/game/formalBlockShapes.ts'];
if(!levels.includes("import { applyRemake151to160 }")){
 levels="import { applyRemake151to160 } from './remake151to160';\n"+levels;
 const declarations=[...levels.matchAll(/export const LEVELS: LevelSpec\[\] = ([^;]+);/g)];assert.equal(declarations.length,1);
 levels=levels.replace(declarations[0][0],`export const LEVELS_BEFORE_151_160_REMAKE: LevelSpec[] = ${declarations[0][1]};\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_151_160_REMAKE.map(applyRemake151to160);`);
}
if(!shapes.includes("import { REMADE_151_160_IDS }")){
 shapes="import { REMADE_151_160_IDS } from '../core/remake151to160';\n"+shapes;
 const old='REMADE_141_150_IDS.includes(levelId)';assert.equal(shapes.split(old).length,2);shapes=shapes.replace(old,old+' || REMADE_151_160_IDS.includes(levelId)');
}
const fixture={ruleVersion:'1.102.0',status:'data-adopted-final-input-required',rows:ordered};
const module="// Source-reviewed original layouts, v1.102 finite regeneration contract.\nimport type {LevelSpec} from './types';\nexport const REMADE_151_160_IDS: readonly number[] = "+JSON.stringify(ordered.map(r=>r.id))+";\nconst reviewed: Record<number,LevelSpec> = "+JSON.stringify(Object.fromEntries(ordered.map(r=>[r.id,r.level])),null,2)+";\nexport const applyRemake151to160 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n";
for(const[p,s]of Object.entries(beforeBytes))assert.equal(fs.readFileSync(p,'utf8'),s,`Concurrent write ${p}`);
fs.writeFileSync(modulePath,module);fs.writeFileSync(fixturePath,JSON.stringify(fixture,null,2)+'\n');
if(levels!==beforeBytes['src/core/levels.ts'])fs.writeFileSync('src/core/levels.ts',levels);
if(shapes!==beforeBytes['src/game/formalBlockShapes.ts'])fs.writeFileSync('src/game/formalBlockShapes.ts',shapes);
const current=(await loadApi()).api,changed=[];
for(const old of api.LEVELS){const row=rows.get(old.id),actual=current.LEVELS[old.id-1];if(row)assert.deepEqual(actual,row.level);else assert.deepEqual(actual,old,`Unrelated level ${old.id}`);if(digest(old)!==digest(actual))changed.push(old.id);}
assert.deepEqual(changed,[...candidates.map(c=>c.data.level.id)].filter(id=>digest(api.LEVELS[id-1])!==digest(rows.get(id).level)).sort((a,b)=>a-b));
const evidence=save('adopted',{passed:true,before,changed,adoptedIds:ordered.map(r=>r.id),campaignSha256:digest(current.LEVELS),finalFormalInputRequired:true,files:Object.fromEntries([modulePath,fixturePath,'src/core/levels.ts','src/game/formalBlockShapes.ts'].map(p=>[p,digest(fs.readFileSync(p))]))});console.log(JSON.stringify({evidence,changed,adoptedIds:ordered.map(r=>r.id)}));
