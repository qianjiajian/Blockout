import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {ROOT,IDS,digest,ruleGate,writeNew,auditSpatial} from './common.mjs';
import {loadApi,replay} from './replay.mjs';
const readyFile=process.argv[2],ready=JSON.parse(fs.readFileSync(readyFile));
ruleGate();assert.equal(ready.status,'READY_FOR_FORMAL_ADOPTION');
for(const [p,h]of Object.entries(ready.bindings??{}))assert.equal(digest(fs.readFileSync(p)),h,'Ready binding '+p);
const module='src/core/remake181to190.ts',raw=fs.readFileSync(module,'utf8');
const parsed=ts.createSourceFile(module,raw,ts.ScriptTarget.Latest,true);assert.equal(parsed.parseDiagnostics.length,0);assert.equal(parsed.statements.length,4);
const vars={};for(const stmt of parsed.statements.slice(1)){assert(ts.isVariableStatement(stmt));const d=stmt.declarationList.declarations[0];vars[d.name.text]=d.initializer;}
const oldIds=JSON.parse(vars.REMADE_181_190_IDS.getText(parsed)),oldReviewed=JSON.parse(vars.reviewed.getText(parsed));
assert.deepEqual(Object.keys(oldReviewed).map(Number).sort((a,b)=>a-b),oldIds);
assert.equal(vars.applyRemake181to190.getText(parsed).replace(/\s/g,''),'(level:LevelSpec):LevelSpec=>reviewed[level.id]??level');
const {api}=await loadApi(),before=structuredClone(api.LEVELS);
const entries=ready.rows.map(row=>{
 assert(IDS.includes(row.id)&&!oldIds.includes(row.id));assert.equal(row.L,16);assert(row.U>=16&&row.U<=20);
 assert(row.sourceValidated&&row.lowerBoundCertified&&row.candidatePointerValidated,'All adoption gates must be explicit');
 assert(!row.sourceStatus.includes('PENDING')&&!row.sourceStatus.includes('NOT_YET'));
 assert.equal(row.pointer.length,2);assert.deepEqual(row.pointer.map(p=>p.viewport.width).sort((a,b)=>a-b),[320,496]);
 for(const p of row.pointer){assert.equal(digest(fs.readFileSync(p.reportFile)),p.sha256);const report=JSON.parse(fs.readFileSync(p.reportFile));assert.equal(report.status,'PASS');assert(report.candidateOnly);const r=report.rows.find(r=>r.id===row.id);assert.equal(r.levelSha256,row.levelSha256);}
 assert.equal(digest(fs.readFileSync(row.file)),row.candidateSha256);const d=JSON.parse(fs.readFileSync(row.file));assert.equal(digest(d.level),row.levelSha256);assert.equal(digest(d.drags),row.routeSha256);
 auditSpatial(d.level,api);const r=replay(d.level,d.drags,api,{complete:true,requirePointerCompatible:true});assert.equal(r.nonClearingDrags,row.U);
 return{id:row.id,level:d.level,drags:d.drags,lowerBound:row.L,upperBound:row.U,readyFile};
});
assert(entries.length&&new Set(entries.map(r=>r.id)).size===entries.length);
const fixtureFile='tests/fixtures/remake182185-v107.json',fixtureRaw=fs.existsSync(fixtureFile)?fs.readFileSync(fixtureFile,'utf8'):null;
const fixture=fixtureRaw?JSON.parse(fixtureRaw):{ruleVersion:'1.107.0',rows:[]};for(const r of entries)assert(!fixture.rows.some(x=>x.id===r.id));
const ids=[...oldIds,...entries.map(r=>r.id)].sort((a,b)=>a-b),all={...oldReviewed,...Object.fromEntries(entries.map(r=>[r.id,r.level]))};
// Preserve all existing entries exactly as JSON data; only the two authorized
// IDs may be appended. No shared stage or renderer changes are needed.
const replacements=[{start:vars.REMADE_181_190_IDS.getStart(parsed),end:vars.REMADE_181_190_IDS.end,text:JSON.stringify(ids)},{start:vars.reviewed.getStart(parsed),end:vars.reviewed.end,text:JSON.stringify(all,null,2)}].sort((a,b)=>b.start-a.start);
let source=raw;for(const r of replacements)source=source.slice(0,r.start)+r.text+source.slice(r.end);
source=source.replace('// Independently reviewed v1.47 batch data; only listed levels are replaced.','// Reviewed batch data: original eight under v1.47; 182/185 additions under v1.107.');
const out=ROOT+'/adoption-'+Date.now();writeNew(out+'-before.json',{createdAt:new Date().toISOString(),levels:before,module,source:raw,fixtureFile,fixture:fixtureRaw,readyFile,readySha256:digest(fs.readFileSync(readyFile)),ids:entries.map(r=>r.id)});
assert.equal(fs.readFileSync(module,'utf8'),raw);if(fixtureRaw!==null)assert.equal(fs.readFileSync(fixtureFile,'utf8'),fixtureRaw);
fs.writeFileSync(module,source);fs.writeFileSync(fixtureFile,JSON.stringify({...fixture,rows:[...fixture.rows,...entries].sort((a,b)=>a.id-b.id)},null,2)+'\n');
const after=(await loadApi()).api.LEVELS;assert.equal(after.length,200);for(const l of after)assert.deepEqual(l,entries.find(r=>r.id===l.id)?.level??before[l.id-1]);
writeNew(out+'-result.json',{status:'FORMAL_DATA_WRITTEN_FINAL_POINTER_PENDING',newIds:entries.map(r=>r.id),allBatchIds:ids,otherLevelsUnchanged:200-entries.length,readyFile,campaignSha256:digest(after),moduleSha256:digest(fs.readFileSync(module)),sharedStagesModified:false});
console.log(JSON.stringify({out,ids,newIds:entries.map(r=>r.id)}));
