import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {loadApi,replay} from '../../replay.mjs';
import {replayTiming} from '../../observed-timing.mjs';
import {digest,geometry,ruleGate,writeNew,original,auditSpatial} from '../../common.mjs';
const OUT='deliverables/remake191-200-20260927/author197-199/adopt191196-audit',beforeFile=process.argv[2],formalFile=process.argv[3],ids=[191,196];
const json=p=>JSON.parse(fs.readFileSync(p)),hash=p=>digest(fs.readFileSync(p)),walk=p=>fs.readdirSync(p,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(p+'/'+e.name):[p+'/'+e.name]).sort();
const b=json(beforeFile),formal=json(formalFile),lock=ruleGate(),{api,inputs}=await loadApi(),all=JSON.parse(JSON.stringify(api.LEVELS)),orig=original();
const currentInputs=Object.fromEntries([...new Set([...inputs,'docs/rules/manifest.json','tests/fixtures/remake191to200-v108.json'])].map(p=>[p,hash(p)]));
const bindings={},bind=(p,h=hash(p))=>{assert.equal(hash(p),h,'Evidence changed: '+p);bindings[p]=h;};bind(beforeFile);bind(formalFile);
assert.equal(all.length,200);assert.equal(formal.status,'FORMAL_SUBSET_COMPLETE');assert.deepEqual(formal.rows.map(r=>r.id).sort((a,b)=>a-b),ids);
const changed=all.filter((l,i)=>digest(l)!==b.levels[i].sha256).map(l=>l.id);assert.deepEqual(changed,ids);
const src=walk('src'),srcBefore=Object.keys(b.hashes).filter(p=>p.startsWith('src/')).sort();assert.deepEqual(src,srcBefore);
const srcChanged=src.filter(p=>hash(p)!==b.hashes[p]);assert.deepEqual(srcChanged,['src/core/remake191to200.ts']);
const fp='tests/fixtures/remake191to200-v108.json',fx=json(fp),oldfx=JSON.parse(b.fixtureText);
assert.deepEqual(walk('tests/fixtures'),Object.keys(b.hashes).filter(p=>p.startsWith('tests/fixtures/')).sort());
for(const[p,h]of Object.entries(b.hashes).filter(([p])=>p.startsWith('tests/fixtures/')&&p!==fp))assert.equal(hash(p),h,p);
assert.deepEqual(fx.rows.filter(r=>!ids.includes(r.id)),oldfx.rows);assert.deepEqual({...fx,rows:oldfx.rows},oldfx);
assert.deepEqual(fx.rows.map(r=>r.id),[191,192,193,194,195,196,197,198,199,200]);
const moduleOf=rows=>"// Reviewed original layouts under v1.108. Prior source facts/evidence are retained.\nimport type { LevelSpec } from './types';\nexport const REMADE_191_200_IDS: readonly number[] = "+JSON.stringify(rows.map(r=>r.id))+";\nconst reviewed: Record<number, LevelSpec> = "+JSON.stringify(Object.fromEntries(rows.map(r=>[r.id,r.level])),null,2)+";\nexport const applyRemake191to200 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n";
assert.equal(moduleOf(oldfx.rows),b.srcTexts['src/core/remake191to200.ts']);assert.equal(moduleOf(fx.rows),fs.readFileSync('src/core/remake191to200.ts','utf8'));
const manifest=json('docs/rules/manifest.json');assert.deepEqual(manifest.versions.slice(0,b.manifest.versions.length),b.manifest.versions);
assert.deepEqual({...manifest,activeVersion:b.manifest.activeVersion,versions:b.manifest.versions},b.manifest);
assert(manifest.versions.some(v=>v.version==='1.112.0'));
for(const v of b.manifest.versions)assert.equal(hash(v.document),b.hashes[v.document]??hash(v.document));
const ruleChanges=manifest.versions.slice(b.manifest.versions.length).map(v=>({version:v.version,document:v.document,sha256:hash(v.document)}));
assert(ruleChanges.every(v=>v.version==='1.112.0'),'Unexpected concurrent rules need specific review');
const rows=[],pointer=[],continuity=[],seen=new Set();
for(const id of ids){
 const l=all[id-1],f=fx.rows.find(r=>r.id===id),r=formal.rows.find(r=>r.id===id);assert.deepEqual(l,f.level);assert.equal(digest(l),r.levelSha256);assert.equal(f.lowerBound,r.L);assert.equal(f.upperBound,r.U);
 assert.deepEqual(geometry(l),b.levels[id-1].geometry);assert.deepEqual(geometry(l),orig.levels[id-1].geometry);assert.deepEqual(api.levelStarTargets(l),b.levels[id-1].starTargets);assert.deepEqual(api.levelStarTargets(l),orig.levels[id-1].starTargets);
 for(const k of ['id','name','timeSeconds','reward','parMoves'])assert.deepEqual(l[k],b.levels[id-1].level[k]);
 const spatial=auditSpatial(l,api),route=replay(l,f.drags,api,{complete:true,requirePointerCompatible:true});assert.equal(route.nonClearingDrags,r.U);
 assert.deepEqual([r.L,r.U],id===191?[11,15]:[5,10]);assert.equal(route.effectiveDrags,id===191?31:27);
 if(id===196){assert.equal(l.blocks.length,17);assert.equal([...l.gates,...l.flipDoors].filter(g=>g.frozen===2).length,7);assert.equal(l.flipDoors.length,3);assert.deepEqual(l.flipDoors.map(g=>[g.color,g.initiallyOpen]).sort(),[['green',false],['pink',true],['purple',false]].sort());}
 assert.equal(r.pointer.length,2);
 for(const p of r.pointer){
  bind(p.report,p.reportSha256);bind(p.observed,p.observedSha256);const report=json(p.report),row=report.rows.find(r=>r.id===id),log=json(p.observed);
  assert.equal(report.status,'PASS');assert.deepEqual(report.errors,[]);assert(report.formalDataValidated&&!report.candidateOnly&&report.naturalClock&&!report.clockFrozen&&!report.playerSaveTouched);
  assert.equal(row.status,'PASS');assert(row.formalObjectIdentity&&!row.candidateOverlay&&row.oldStarTargetsPreserved);assert.equal(row.levelSha256,digest(l));assert.equal(row.routeSha256,digest(f.drags));assert.equal(row.storage.backend,'MemoryHost');assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);assert(log.final.complete&&!log.final.failed);
  if(!seen.has(p.report)){
   for(const[file,h]of Object.entries(report.bindings)){assert.equal(hash(path.join(report.sourceSnapshot,file)),h,'Captured source '+file);assert.equal(hash(file),h,'Current source '+file);}
   for(const[file,h]of Object.entries(report.sourceBindings??{}))bind(file,h);
   continuity.push({report:p.report,bindings:Object.keys(report.bindings).length,allCapturedAndCurrentBindingsMatch:true});seen.add(p.report);
  }
  for(const[file,h]of Object.entries(p.screens??{}))bind(file,h);
  const timing=replayTiming(l,log,api);assert.equal(digest(log),p.timing.logSha256);assert.equal(log.final.moves,route.effectiveDrags);
  pointer.push({id,viewport:report.viewport,report:p.report,reportSha256:p.reportSha256,observed:p.observed,observedSha256:p.observedSha256,timing,storage:row.storage,final:log.final,nativeDrawAudit:row.nativeDrawAudit});console.log(JSON.stringify({id,width:report.viewport.width,events:timing.events,ticks:timing.ticks}));
 }
 rows.push({id,levelSha256:digest(l),routeSha256:digest(f.drags),L:r.L,U:r.U,route,spatial,geometryPreserved:true,starTargets:api.levelStarTargets(l),sourceStatus:id===191?'USER_ACCEPTED_AUTHORED_OPENING_SOURCE_STILL_UNKNOWN':'USER_ACCEPTED_AUTHORED_SOURCE_FIELDS_INITIAL_FLIP_PHASES_STILL_UNKNOWN'});
}
assert.equal(pointer.length,4);for(const id of ids)assert.deepEqual(pointer.filter(p=>p.id===id).map(p=>p.viewport.width).sort((a,b)=>a-b),[320,496]);
for(const[p,h]of Object.entries(currentInputs))assert.equal(hash(p),h,'Review drift '+p);
const out=OUT+'/complete-'+Date.now()+'.json';writeNew(out,{status:'FORMAL_191_196_INDEPENDENT_AUDIT_PASS',createdAt:new Date().toISOString(),activeVersion:lock.activeVersion,beforeFile,formalFile,changedLevels:changed,unchangedLevels:198,priorEightPreserved:[192,193,194,195,197,198,199,200],srcFiles:src.length,changedSource:srcChanged,exactPureJsonModuleAppend:true,otherSrcByteIdentical:true,oldFixtureRowsIdentical:true,ruleChanges,rows,pointer,continuity,bindings,currentInputs,readOnly:true,playerSaveTouched:false,repeatedOld16Logs:false,naturalLogsIndependentlyReplayed:4,guiRerun:false,difficultySearchRerun:false,sourceUnknownNotRelabeled:true,published:false});console.log(out);
