import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {inspectDisjointWiring,inspectScopedAxisChange} from './remake121to130-wiring-drift.mjs';
import {inspectDisjointData} from './remake91to100-data-drift.mjs';
import {OUTPUT as ROOT,baseline,loadApi,ruleGate,checkCandidate} from './remake121to130-v172.mjs';
const writeNew=(p,v)=>fs.writeFileSync(p,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
import {digest} from './revised-preview-validation-v160.mjs';
const [pointerFile,smallPointerFile,...files]=process.argv.slice(2);assert(pointerFile&&smallPointerFile&&files.length);
ruleGate();const input=JSON.parse(fs.readFileSync(pointerFile));assert.equal(input.status,'PASS');assert.equal(input.candidateOnly,true);
const small=JSON.parse(fs.readFileSync(smallPointerFile));assert.equal(small.status,'PASS');assert.equal(small.candidateOnly,true);assert.notDeepEqual(small.viewport,input.viewport);
for(const [p,h]of Object.entries(small.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h,`Small Pointer source drift: ${p}`);
for(const row of input.rows){const r=small.rows.find(x=>x.id===row.id);assert(r?.status==='PASS');assert.equal(r.levelSha256,row.levelSha256);assert.equal(r.routeSha256,row.routeSha256);}
for(const [p,h]of Object.entries(input.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h,`Pointer source drift: ${p}`);
const requestedIds=files.map(p=>JSON.parse(fs.readFileSync(p)).level.id),acceptedConcurrentData=[];
for(const [p,h]of Object.entries(input.bindings))if(/^(src\/(?:core|game|platform)\/|public\/assets\/art\/)/.test(p)&&digest(fs.readFileSync(p))!==h){
 const captured=fs.readFileSync(path.join(input.sourceSnapshot,p),'utf8');assert.equal(digest(Buffer.from(captured)),h,`Captured bytes drift: ${p}`);
 if(['src/core/levels.ts','src/game/formalBlockShapes.ts'].includes(p))acceptedConcurrentData.push(inspectDisjointWiring(p,requestedIds,captured));
 else if(p==='src/core/axisRectangularRepairs.ts')acceptedConcurrentData.push(inspectScopedAxisChange(p,requestedIds,captured));
 else if(/^src\/core\/(?:nativeRemake31to40|remake[0-9]+to[0-9]+)\.ts$/.test(p))acceptedConcurrentData.push(inspectDisjointData(p,requestedIds,captured));
 else assert.fail(`Pointer runtime/art drift: ${p}`);
}
const candidates=files.map(file=>({file,data:JSON.parse(fs.readFileSync(file))})),{api,inputs}=await loadApi(),b=baseline();
const checked=[];for(const {file,data} of candidates){
 const row=input.rows.find(r=>r.id===data.level.id);assert(row?.status==='PASS');assert.equal(row.levelSha256,digest(data.level));assert.equal(row.routeSha256,digest(data.drags));
 checked.push({file,...await checkCandidate(data,b,api)});
}
const allIds=candidates.map(c=>c.data.level.id);assert.equal(new Set(allIds).size,allIds.length);
const paths=['src/core/levels.ts','src/game/formalBlockShapes.ts'],prior=Object.fromEntries(paths.map(p=>[p,fs.readFileSync(p,'utf8')]));
const record={createdAt:new Date().toISOString(),activeRuleVersion:ruleGate().activeVersion,ids:allIds,pointerFile,smallPointerFile,checked,acceptedConcurrentData,
 campaignBefore:structuredClone(api.LEVELS),campaignBeforeSha256:digest(api.LEVELS),bindings:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))])),
 sharedBefore:prior,status:'prepared',formalPointerValidated:false,playerSaveTouched:false,released:false};
const output=ROOT+'/adoption-'+Date.now()+'.json';writeNew(output,record);
const fixturePath='tests/fixtures/remake121to130-v146.json';
const fixture=fs.existsSync(fixturePath)?JSON.parse(fs.readFileSync(fixturePath)):{rows:[]};
for(const {file,data}of candidates){const r=checked.find(r=>r.id===data.level.id);fixture.rows=fixture.rows.filter(r=>r.id!==data.level.id);fixture.rows.push({id:data.level.id,level:data.level,drags:data.drags,candidate:file,lowerBound:r.lowerBound,upperBound:r.upperBound});}
fixture.rows.sort((a,b)=>a.id-b.id);
const rows=Object.fromEntries(fixture.rows.map(r=>[r.id,r.level]));
const moduleText=`// Reviewed v1.72 subset; unaccepted IDs retain their preceding level.\nimport type {LevelSpec} from './types';\nexport const REMADE_121_130_IDS: readonly number[] = ${JSON.stringify(fixture.rows.map(r=>r.id))};\nconst reviewed: Record<number,LevelSpec> = ${JSON.stringify(rows,null,2)};\nexport const applyRemake121to130 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n`;
let levels=prior[paths[0]],art=prior[paths[1]];
if(!levels.includes('LEVELS_BEFORE_121_130_REMAKE')){
 levels="import { applyRemake121to130 } from './remake121to130';\n"+levels;
 const re=/export const LEVELS: LevelSpec\[\] = ([^;]+);/;assert(re.test(levels));
 levels=levels.replace(re,'export const LEVELS_BEFORE_121_130_REMAKE: LevelSpec[] = $1;\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_121_130_REMAKE.map(applyRemake121to130);');
}
if(!art.includes('REMADE_121_130_IDS')){
 art="import { REMADE_121_130_IDS } from '../core/remake121to130';\n"+art;
 const needle=' ? "native-only" : "legacy"';assert.equal(art.split(needle).length,2);art=art.replace(needle,' || REMADE_121_130_IDS.includes(levelId)'+needle);
}
// Recheck live shared bytes immediately before these synchronous, minimal writes.
for(const p of paths)assert.equal(fs.readFileSync(p,'utf8'),prior[p],`Concurrent shared change: ${p}`);
fs.writeFileSync('src/core/remake121to130.ts',moduleText);
fs.writeFileSync(fixturePath,JSON.stringify(fixture,null,2)+'\n');
if(levels!==prior[paths[0]])fs.writeFileSync(paths[0],levels);
if(art!==prior[paths[1]])fs.writeFileSync(paths[1],art);

const fresh=await loadApi();
for(const l of fresh.api.LEVELS){const row=candidates.find(c=>c.data.level.id===l.id);assert.equal(digest(l),digest(row?row.data.level:record.campaignBefore[l.id-1]),`Post-adoption level ${l.id}`);}
assert.equal(digest(fresh.api.LEVELS.slice(0,30)),digest(record.campaignBefore.slice(0,30)));
record.status='installed-awaiting-formal-pointer';record.campaignAfterSha256=digest(fresh.api.LEVELS);record.otherLevelsPreserved=true;
const final=ROOT+'/installed-'+Date.now()+'.json';writeNew(final,record);console.log(JSON.stringify({output:final,ids:allIds,status:record.status}));
