import assert from 'node:assert/strict';
import fs from 'node:fs';
import {ROOT,baseline,loadApi,ruleGate,checkCandidate,writeNew} from './remake81to90-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const [pointerFile,...files]=process.argv.slice(2);assert(pointerFile&&files.length);
ruleGate();const input=JSON.parse(fs.readFileSync(pointerFile));assert.equal(input.status,'PASS');assert.equal(input.candidateOnly,true);
for(const [p,h]of Object.entries(input.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h,`Pointer source drift: ${p}`);
for(const [p,h]of Object.entries(input.bindings))if(/^(src\/(?:core|game|platform)\/|public\/assets\/art\/)/.test(p)&&!/^src\/core\/(?:nativeRemake31to40|remake[0-9]+to[0-9]+|levels)\.ts$/.test(p))assert.equal(digest(fs.readFileSync(p)),h,`Pointer runtime/art drift: ${p}`);
const candidates=files.map(file=>({file,data:JSON.parse(fs.readFileSync(file))})),{api,inputs}=await loadApi(),b=baseline();
const checked=candidates.map(({file,data})=>{
 const row=input.rows.find(r=>r.id===data.level.id);assert(row?.status==='PASS');assert.equal(row.levelSha256,digest(data.level));assert.equal(row.routeSha256,digest(data.drags));
 return{file,...checkCandidate(data,b,api)};
});
const allIds=candidates.map(c=>c.data.level.id);assert.equal(new Set(allIds).size,allIds.length);
const paths=['src/core/levels.ts','src/game/formalBlockShapes.ts'],prior=Object.fromEntries(paths.map(p=>[p,fs.readFileSync(p,'utf8')]));
const record={createdAt:new Date().toISOString(),activeRuleVersion:ruleGate().activeVersion,ids:allIds,pointerFile,checked,
 campaignBefore:structuredClone(api.LEVELS),campaignBeforeSha256:digest(api.LEVELS),bindings:Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))])),
 sharedBefore:prior,status:'prepared',formalPointerValidated:false,playerSaveTouched:false,released:false};
const output=ROOT+'/adoption-'+Date.now()+'.json';writeNew(output,record);
const fixturePath='tests/fixtures/remake81to90-v146.json';
const fixture=fs.existsSync(fixturePath)?JSON.parse(fs.readFileSync(fixturePath)):{rows:[]};
for(const {file,data}of candidates){const r=checked.find(r=>r.id===data.level.id);fixture.rows=fixture.rows.filter(r=>r.id!==data.level.id);fixture.rows.push({id:data.level.id,level:data.level,drags:data.drags,candidate:file,lowerBound:r.lowerBound,upperBound:r.upperBound});}
fixture.rows.sort((a,b)=>a.id-b.id);
const rows=Object.fromEntries(fixture.rows.map(r=>[r.id,r.level]));
const moduleText=`// Reviewed v1.47 subset; unaccepted IDs retain their preceding level.\nimport type {LevelSpec} from './types';\nexport const REMADE_81_90_IDS: readonly number[] = ${JSON.stringify(fixture.rows.map(r=>r.id))};\nconst reviewed: Record<number,LevelSpec> = ${JSON.stringify(rows,null,2)};\nexport const applyRemake81to90 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n`;
let levels=prior[paths[0]],art=prior[paths[1]];
if(!levels.includes('LEVELS_BEFORE_81_90_REMAKE')){
 levels="import { applyRemake81to90 } from './remake81to90';\n"+levels;
 const re=/export const LEVELS: LevelSpec\[\] = ([^;]+);/;assert(re.test(levels));
 levels=levels.replace(re,'export const LEVELS_BEFORE_81_90_REMAKE: LevelSpec[] = $1;\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_81_90_REMAKE.map(applyRemake81to90);');
}
if(!art.includes('REMADE_81_90_IDS')){
 art="import { REMADE_81_90_IDS } from '../core/remake81to90';\n"+art;
 const needle=' ? "native-only" : "legacy"';assert.equal(art.split(needle).length,2);art=art.replace(needle,' || REMADE_81_90_IDS.includes(levelId)'+needle);
}
// Recheck live shared bytes immediately before these synchronous, minimal writes.
for(const p of paths)assert.equal(fs.readFileSync(p,'utf8'),prior[p],`Concurrent shared change: ${p}`);
fs.writeFileSync('src/core/remake81to90.ts',moduleText);
fs.writeFileSync(fixturePath,JSON.stringify(fixture,null,2)+'\n');
if(levels!==prior[paths[0]])fs.writeFileSync(paths[0],levels);
if(art!==prior[paths[1]])fs.writeFileSync(paths[1],art);
if(!fs.existsSync('tests/remake81to90.test.ts'))fs.copyFileSync(ROOT+'/remake81to90.test.ts.pending','tests/remake81to90.test.ts');
const fresh=await loadApi();
for(const l of fresh.api.LEVELS){const row=candidates.find(c=>c.data.level.id===l.id);assert.equal(digest(l),digest(row?row.data.level:record.campaignBefore[l.id-1]),`Post-adoption level ${l.id}`);}
assert.equal(digest(fresh.api.LEVELS.slice(0,30)),b.protected1to30Sha256);
record.status='installed-awaiting-formal-pointer';record.campaignAfterSha256=digest(fresh.api.LEVELS);record.otherLevelsPreserved=true;
const final=ROOT+'/installed-'+Date.now()+'.json';writeNew(final,record);console.log(JSON.stringify({output:final,ids:allIds,status:record.status}));
