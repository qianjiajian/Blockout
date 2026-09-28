import fs from 'node:fs';import assert from 'node:assert/strict';
import {ROOT,ruleGate,digest,writeNew,auditSpatial} from './common.mjs';
import {loadApi,replay} from './replay.mjs';
const readyFile=process.argv[2],ready=JSON.parse(fs.readFileSync(readyFile));assert.equal(ready.status,'READY_FOR_FORMAL_ADOPTION');ruleGate();
const {api}=await loadApi(),before=structuredClone(api.LEVELS),ids=ready.rows.map(r=>r.id);assert.equal(ids.length,new Set(ids).size);
const fixturePath='tests/fixtures/remake191to200-v108.json',modulePath='src/core/remake191to200.ts';const previous=fs.existsSync(fixturePath)?JSON.parse(fs.readFileSync(fixturePath)):{ruleVersion:'1.108.0',rows:[]};
const data=ready.rows.map(r=>{const d=JSON.parse(fs.readFileSync(r.file));assert.equal(d.level.id,r.id);assert.equal(digest(fs.readFileSync(r.file)),r.candidateSha256);assert.equal(digest(d.level),r.levelSha256);assert.equal(digest(d.drags),r.routeSha256);if(r.sourceContractSatisfied){assert([191,196].includes(r.id));assert.equal(r.sourceValidated,false);assert.equal(digest(fs.readFileSync(r.acceptance.file)),r.acceptance.sha256);const a=JSON.parse(fs.readFileSync(r.acceptance.file));assert.equal(a.status,'USER_ACCEPTED_SPECIFIC_DISPLAYED_CANDIDATES');assert(a.candidates.some(c=>c.id===r.id&&c.levelSha256===r.levelSha256&&c.routeSha256===r.routeSha256));assert(ruleGate().verified.some(v=>v.version===r.acceptance.ruleVersion));}else assert(r.sourceValidated);assert(r.lowerBoundCertified&&r.candidatePointerValidated&&r.mechanismReviewed);auditSpatial(d.level,api);const route=replay(d.level,d.drags,api,{complete:true,requirePointerCompatible:true});assert.equal(route.nonClearingDrags,r.U);return {...d,L:r.L,U:r.U};});
for(const d of data)assert(!previous.rows.some(r=>r.id===d.level.id),'Already adopted; explicit revision required');
const rows=[...previous.rows,...data.map(d=>({id:d.level.id,level:d.level,drags:d.drags,lowerBound:d.L,upperBound:d.U}))].sort((a,b)=>a.id-b.id);
const files=['src/core/levels.ts','src/game/formalBlockShapes.ts',...(fs.existsSync(modulePath)?[modulePath,fixturePath]:[])],raw=Object.fromEntries(files.map(f=>[f,fs.readFileSync(f,'utf8')])),out=ROOT+'/adoption-'+Date.now();
let wiring=raw[files[0]],art=raw[files[1]];
if(!fs.existsSync(modulePath)){
 const re=/export const LEVELS: LevelSpec\[\] = ([^;]+);/;assert(re.test(wiring));wiring="import { applyRemake191to200 } from './remake191to200';\n"+wiring.replace(re,(_,expression)=>'export const LEVELS_BEFORE_191_200_REMAKE: LevelSpec[] = '+expression+';\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);');
 const anchor='REMADE_161_170_IDS.includes(levelId) ?';assert(art.includes(anchor));art="import { REMADE_191_200_IDS } from '../core/remake191to200';\n"+art.replace(anchor,'REMADE_161_170_IDS.includes(levelId) || REMADE_191_200_IDS.includes(levelId) ?');
}
writeNew(out+'-before.json',{levels:before,source:raw,readyFile,readySha256:digest(fs.readFileSync(readyFile)),ids,createdAt:new Date().toISOString()});
for(const f of files)assert.equal(fs.readFileSync(f,'utf8'),raw[f],'Concurrent write '+f);
fs.writeFileSync(modulePath,"// Reviewed original layouts under v1.108. Prior source facts/evidence are retained.\nimport type { LevelSpec } from './types';\nexport const REMADE_191_200_IDS: readonly number[] = "+JSON.stringify(rows.map(r=>r.id))+";\nconst reviewed: Record<number, LevelSpec> = "+JSON.stringify(Object.fromEntries(rows.map(r=>[r.id,r.level])),null,2)+";\nexport const applyRemake191to200 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n");
if(wiring!==raw[files[0]])fs.writeFileSync(files[0],wiring);if(art!==raw[files[1]])fs.writeFileSync(files[1],art);
fs.writeFileSync(fixturePath,JSON.stringify({...previous,rows},null,2)+'\n');
const after=(await loadApi()).api.LEVELS;assert.equal(after.length,200);for(const l of after)assert.deepEqual(l,data.find(d=>d.level.id===l.id)?.level??before[l.id-1]);
writeNew(out+'-result.json',{status:'FORMAL_DATA_WRITTEN_FINAL_POINTER_PENDING',ids,otherLevelsUnchanged:200-ids.length,readyFile,campaignSha256:digest(after),sourceAfter:Object.fromEntries([...new Set([...files,modulePath,fixturePath])].map(f=>[f,digest(fs.readFileSync(f))]))});console.log(JSON.stringify({out,ids,otherLevelsUnchanged:200-ids.length}));
