import fs from 'node:fs';import assert from 'node:assert/strict';
import {ROOT,ruleGate,digest,loadApi,writeNew,auditSpatial} from './common.mjs';
const readyFile=process.argv[2],ready=JSON.parse(fs.readFileSync(readyFile));assert.equal(ready.status,'READY_FOR_FORMAL_ADOPTION');ruleGate();
const qualifier=fs.readdirSync(ROOT).filter(f=>/^root-prefix-qualification-\d+\.json$/.test(f)).sort().at(-1);assert(qualifier);assert(JSON.parse(fs.readFileSync(ROOT+'/'+qualifier)).passed);
const data=ready.rows.map(r=>{assert.equal(digest(fs.readFileSync(r.file)),r.candidateSha256);const d=JSON.parse(fs.readFileSync(r.file));assert.equal(digest(d.level),r.levelSha256);assert.equal(digest(d.drags),r.routeSha256);return d;});
const {api}=await loadApi(),before=structuredClone(api.LEVELS),ids=data.map(d=>d.level.id),out=ROOT+'/adoption-'+Date.now();
const files=['src/core/levels.ts','src/game/formalBlockShapes.ts'],raw=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,'utf8')]));
assert(!fs.existsSync('src/core/remake161to170.ts'));
const anchor='export const LEVELS: LevelSpec[] = LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR.map(applyLevel78LateLiftRepair);';assert(raw[files[0]].includes(anchor));
const wiring="import { applyRemake161to170 } from './remake161to170';\n"+raw[files[0]].replace(anchor,'export const LEVELS_BEFORE_161_170_REMAKE: LevelSpec[] = LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR.map(applyLevel78LateLiftRepair);\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_161_170_REMAKE.map(applyRemake161to170);');
const artAnchor='REMADE_151_160_IDS.includes(levelId) ?';assert(raw[files[1]].includes(artAnchor));
const art="import { REMADE_161_170_IDS } from '../core/remake161to170';\n"+raw[files[1]].replace(artAnchor,'REMADE_151_160_IDS.includes(levelId) || REMADE_161_170_IDS.includes(levelId) ?');
for(const d of data)auditSpatial(d.level,api);
writeNew(out+'-before.json',{createdAt:new Date().toISOString(),levels:before,source:raw,readyFile,readySha256:digest(fs.readFileSync(readyFile)),ids});
fs.writeFileSync('src/core/remake161to170.ts',"// Original reviewed layouts under v1.103; Lv162 authored opening accepted in v1.105.\nimport type { LevelSpec } from './types';\nexport const REMADE_161_170_IDS: readonly number[] = "+JSON.stringify(ids)+";\nconst reviewed: Record<number, LevelSpec> = "+JSON.stringify(Object.fromEntries(data.map(d=>[d.level.id,d.level])),null,2)+";\nexport const applyRemake161to170 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n",{flag:'wx'});
for(const f of files)assert.equal(fs.readFileSync(f,'utf8'),raw[f],'Concurrent shared write '+f);fs.writeFileSync(files[0],wiring);fs.writeFileSync(files[1],art);
const after=(await loadApi()).api.LEVELS;assert.equal(after.length,200);for(const l of after){const d=data.find(d=>d.level.id===l.id);assert.deepEqual(l,d?.level??before[l.id-1]);}
writeNew('tests/fixtures/remake161to170-v103.json',{ruleVersion:'1.103.0',sourceExceptionRule:'1.105.0',rows:data.map(d=>{const r=ready.rows.find(r=>r.id===d.level.id);return{id:d.level.id,level:d.level,drags:d.drags,lowerBound:r.L,upperBound:r.U};})});
writeNew(out+'-result.json',{status:'FORMAL_DATA_WRITTEN_FINAL_POINTER_PENDING',ids,otherLevelsUnchanged:200-ids.length,readyFile,qualifier:ROOT+'/'+qualifier,campaignSha256:digest(after),sourceAfter:Object.fromEntries([...files,'src/core/remake161to170.ts'].map(f=>[f,digest(fs.readFileSync(f))]))});console.log(JSON.stringify({out,ids,otherLevelsUnchanged:200-ids.length}));
