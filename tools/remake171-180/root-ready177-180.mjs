import fs from 'node:fs';import assert from 'node:assert/strict';
import {ROOT,digest,writeNew,ruleGate,auditSpatial} from './common.mjs';
import {loadApi,replay} from './replay.mjs';import {replayTiming} from './observed-timing.mjs';
import {runNative} from './author175-177/native177.mjs';
const read=p=>JSON.parse(fs.readFileSync(p)),{api,inputs}=await loadApi(),rows=[];ruleGate();
const files=[
 [177,'author175-177/review177-1790523815436.json',['pointer-1790523875855-320x568-60316','pointer-1790523875854-496x1078-44776']],
 [180,'author178-180/review180-1790523732240.json',['pointer-1790523529609-320x568-57932','pointer-1790523528289-496x1078-61056']],
];
for(const [id,relative,dirs]of files){
 const file=ROOT+'/'+relative,d=read(file),l=d.level,spatial=auditSpatial(l,api),route=replay(l,d.drags,api,{complete:true,requirePointerCompatible:true});assert.equal(l.id,id);assert.equal(d.levelSha256,digest(l));assert(route.nonClearingDrags<=15);
 assert.equal(digest(fs.readFileSync(d.source.path)),d.source.sha256);const source=read(d.source.path);for(const [p,h]of Object.entries(source.evidence))assert.equal(digest(fs.readFileSync(p)),h,p);
 assert.equal(d.source.mapping.length,l.blocks.length);assert.equal(new Set(d.source.mapping.map(m=>m.candidate.id)).size,l.blocks.length);
 for(const m of d.source.mapping){assert.deepEqual(l.blocks.find(b=>b.id===m.candidate.id),m.candidate);assert.equal(m.candidate.frozen??0,m.source.frozen??0);}
 for(const g of d.source.gates){const b=g.candidate??g.design;assert.deepEqual(l.gates.find(x=>x.id===b.id),b);assert.equal(b.frozen??0,g.source.frozen??0);}
 assert.equal(d.wrongCases.length,3);for(const c of d.wrongCases){replay(l,c.fullRecoveredRoute,api,{complete:true,requirePointerCompatible:true});const at=c.step??c.atDrag;assert.throws(()=>replay(l,[...d.drags.slice(0,at-1),c.wrong,c.blockedNext],api,{requirePointerCompatible:true}));}
 let lower,qualification;
 if(id===177){
  qualification=d.qualification;const q=read(qualification);assert(q.passed);assert.equal(q.levelSha256,digest(l));assert.equal(q.fixtures.length,6);assert(q.fixtures.every(x=>x.matching));
  for(const p of ['src/core/PuzzleModel.ts','src/core/blockExitFrontier.ts','tools/remake161-170/author161-163/generator-search.mjs','tools/remake161-170/author161-163/native161.cs'])assert.equal(digest(fs.readFileSync(p)),q.sourceBindings[p],p);
  assert.equal(l.blocks.length,23);assert.equal(l.generators.length,1);assert.equal(l.generators[0].queueBlockIds.length,3);assert.deepEqual(l.generators[0].queueBlockIds.map(i=>l.blocks.find(b=>b.id===i).color),['green','yellow','purple']);assert.equal(l.blocks.filter(b=>b.frozen===12).length,1);assert.equal(l.gates.filter(g=>g.frozen===2).length,5);
  lower=runNative(l,{floor:11,maxStates:500000,maxMilliseconds:3000});assert(lower.thresholdProven);
 }else{
  qualification=ROOT+'/plain180-qualification-1790523946422.json';const q=read(qualification);assert(q.passed);assert.equal(q.levelSha256,digest(l));for(const [p,h]of Object.entries(q.bindings))assert.equal(digest(fs.readFileSync(p)),h,p);
  const lf=fs.readdirSync(ROOT).filter(f=>/^independent-js180-\d+\.json$/.test(f)).sort().at(-1);lower=read(ROOT+'/'+lf);assert(lower.thresholdProven&&lower.floor===11);assert(d.independentJsProof.thresholdProven);assert(d.nativeProof.thresholdProven);
  assert.equal(l.blocks.length,23);assert.equal(l.gates.filter(g=>g.frozen).length,7);assert.equal(l.flipDoors?.length??0,0);
 }
 const pointer=[];for(const dir of dirs){const reportFile=ROOT+'/'+dir+'/report.json',r=read(reportFile),x=r.rows.find(x=>x.id===id);assert.equal(r.status,'PASS');assert(r.candidateOnly&&!r.formalDataValidated);assert(x);assert.equal(x.levelSha256,digest(l));assert.equal(x.routeSha256,digest(d.drags));const timingFile=ROOT+'/'+dir+`/lv${id}-observed-timing.json`,timing=replayTiming(l,read(timingFile),api);assert(x.final.complete&&!x.final.failed&&x.final.remainingSeconds>0);assert.equal(x.nativeDrawAudit.rotated,0);assert.equal(x.nativeDrawAudit.canvasRotationCalls,0);pointer.push({reportFile,sha256:digest(fs.readFileSync(reportFile)),timingFile,timing});}
 rows.push({id,file,candidateSha256:digest(fs.readFileSync(file)),levelSha256:digest(l),routeSha256:digest(d.drags),reviewFile:file,reviewSha256:digest(fs.readFileSync(file)),L:11,U:route.nonClearingDrags,drags:d.drags.length,sourceValidated:true,sourceFile:d.source.path,sourceSha256:d.source.sha256,spatial,route,lower,qualification,qualificationSha256:digest(fs.readFileSync(qualification)),decisionsVerified:3,pointer,score:api.levelStarTargets(l)});
}
const out=ROOT+'/root-ready-'+Date.now()+'.json';writeNew(out,{status:'READY_FOR_FORMAL_ADOPTION',ruleVersion:ruleGate().activeVersion,rows,bindings:Object.fromEntries(inputs.map(f=>[f,digest(fs.readFileSync(f))])),formal:false,release:false});console.log(JSON.stringify({out,rows:rows.map(r=>({id:r.id,L:r.L,U:r.U,drags:r.drags}))}));
