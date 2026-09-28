import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {build} from 'esbuild';
import {loadApi} from '../../replay.mjs';
import {replayTiming} from '../../observed-timing.mjs';
import {ROOT,digest,original,geometry,ruleGate,writeNew,auditSpatial} from '../../common.mjs';
import {inspectDisjointData} from '../../../remake91to100-data-drift.mjs';

const OUT=ROOT+'/author194-196/final-review',ids=[192,193,195,197,198,199,200],lock=ruleGate();
const {api,inputs}=await loadApi(),levels=JSON.parse(JSON.stringify(api.LEVELS)),fixturePath='tests/fixtures/remake191to200-v108.json',fixture=JSON.parse(fs.readFileSync(fixturePath)),baseline=original();
assert.deepEqual(fixture.rows.map(r=>r.id),ids);assert.equal(levels.length,200);
const json=p=>JSON.parse(fs.readFileSync(p)),rawHash=p=>digest(fs.readFileSync(p)),sourceInputs=Object.fromEntries([...new Set([...inputs,fixturePath,'docs/rules/manifest.json'])].map(p=>[p,rawHash(p)]));
const scoreBundle=await build({stdin:{resolveDir:process.cwd(),contents:"export {evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {evaluateLevelStars}=await import('data:text/javascript;base64,'+Buffer.from(scoreBundle.outputFiles[0].text).toString('base64'));
const parseData=(file,text)=>{const t=ts.createSourceFile(file,text,ts.ScriptTarget.Latest,true);const d=t.statements.filter(ts.isVariableStatement).flatMap(s=>s.declarationList.declarations).find(d=>d.name.getText(t)==='reviewed');assert(d);return JSON.parse(d.initializer.getText(t));};
const bindings=new Map(),bind=(p,h)=>{assert(fs.existsSync(p),p);const now=rawHash(p);assert.equal(now,h,p);bindings.set(p,h);};
const bindFrames=x=>{
 if(!x||typeof x!=='object')return;
 if(x.file&&typeof x.sha256==='string'&&fs.existsSync(x.file))bind(x.file,x.sha256);
 for(const k of ['priorSource','sourceFile'])if(typeof x[k]==='string'&&typeof x[k+'Sha256']==='string')bind(x[k],x[k+'Sha256']);
 for(const k of ['freshImageBindings','sourceBindings','additionalViewedFrameBindings'])if(x[k]&&!Array.isArray(x[k]))for(const[p,h]of Object.entries(x[k]))if(typeof h==='string'&&fs.existsSync(p))bind(p,h);
 for(const v of Object.values(x))if(v&&typeof v==='object')bindFrames(v);
};

const adoptions=[],readyById=new Map();
for(const f of fs.readdirSync(ROOT).filter(f=>/^adoption-.*-result\.json$/.test(f)).sort()){
 const file=ROOT+'/'+f,r=json(file),beforeFile=file.replace('-result.json','-before.json'),b=json(beforeFile),ready=json(r.readyFile);
 assert.equal(ready.status,'READY_FOR_FORMAL_ADOPTION');assert.equal(rawHash(r.readyFile),b.readySha256);assert.deepEqual(r.ids,b.ids);assert.equal(r.otherLevelsUnchanged,199);
 const after=JSON.parse(JSON.stringify(b.levels));
 for(const row of ready.rows){assert(ids.includes(row.id));bind(row.file,row.candidateSha256);const d=json(row.file);assert.equal(digest(d.level),row.levelSha256);assert.equal(digest(d.drags),row.routeSha256);assert(row.sourceValidated&&row.lowerBoundCertified&&row.candidatePointerValidated&&row.mechanismReviewed);after[row.id-1]=d.level;readyById.set(row.id,{...row,readyFile:r.readyFile});}
 assert.equal(digest(after),r.campaignSha256,'Immediate entire200 after adoption');
 const fixtureBefore=b.source[fixturePath]?JSON.parse(b.source[fixturePath]):{ruleVersion:'1.108.0',rows:[]};
 const rows=[...fixtureBefore.rows,...ready.rows.map(row=>{const d=json(row.file);return{id:row.id,level:d.level,drags:d.drags,lowerBound:row.L,upperBound:row.U};})].sort((a,b)=>a.id-b.id);
 const moduleText="// Reviewed original layouts under v1.108. Prior source facts/evidence are retained.\nimport type { LevelSpec } from './types';\nexport const REMADE_191_200_IDS: readonly number[] = "+JSON.stringify(rows.map(r=>r.id))+";\nconst reviewed: Record<number, LevelSpec> = "+JSON.stringify(Object.fromEntries(rows.map(r=>[r.id,r.level])),null,2)+";\nexport const applyRemake191to200 = (level: LevelSpec): LevelSpec => reviewed[level.id] ?? level;\n";
 assert.equal(digest(moduleText),r.sourceAfter['src/core/remake191to200.ts']);assert.equal(digest(JSON.stringify({...fixtureBefore,rows},null,2)+'\n'),r.sourceAfter[fixturePath]);
 adoptions.push({file,sha256:rawHash(file),beforeFile,beforeSha256:rawHash(beforeFile),id:r.ids[0],other199Preserved:true,exactModuleAndFixtureReconstructed:true,campaignAfterSha256:r.campaignSha256});
}
assert.deepEqual([...readyById.keys()].sort((a,b)=>a-b),ids);

// Bind exact parallel target objects; pure-data parsing is necessary but is not
// by itself authorization for an arbitrary disjoint mutation.
const parallel=new Map();
const parallelRoot='deliverables/remake171-180-20260927';
for(const f of fs.readdirSync(parallelRoot).filter(f=>/^adoption-.*-result\.json$/.test(f)).sort()){
 const adoptionFile=parallelRoot+'/'+f,a=json(adoptionFile),ready=json(a.readyFile);
 for(const row of ready.rows){const candidate=row.file??row.candidate;assert(candidate);const d=json(candidate);assert.equal(digest(d.level),row.levelSha256);if(row.candidateSha256)bind(candidate,row.candidateSha256);assert.deepEqual(d.level,levels[row.id-1]);parallel.set(row.id,{id:row.id,rule:'1.106.0',adoptionFile,adoptionSha256:rawHash(adoptionFile),readyFile:a.readyFile,candidate,levelSha256:digest(d.level)});}
}
const score182='deliverables/star-targets182-185-20260928/packets/level182.json',s182=json(score182);assert.deepEqual(s182.level??s182,levels[181]);parallel.set(182,{id:182,rule:'1.107.0+1.111.0',packet:score182,packetSha256:rawHash(score182),levelSha256:digest(levels[181])});
for(const id of ids)parallel.set(id,{id,rule:'1.108.0',candidate:readyById.get(id).file,levelSha256:digest(levels[id-1])});

const sourceFiles={192:ROOT+'/author191-193/enriched192-1790527057306.json',193:ROOT+'/author191-193/ready193-1790524105693.json',195:ROOT+'/author194-196/review195-1790526009504.json',197:ROOT+'/author197-199/source197-ledger-1790524082065-15884.json',198:ROOT+'/author197-199/source198-ledger-1790524412341-43980.json',199:ROOT+'/author197-199/source199-ledger-1790524550146-16216.json',200:ROOT+'/root200/review200-1790523545212.json'};
const sources=[];
for(const id of ids){
 const l=levels[id-1],f=fixture.rows.find(r=>r.id===id),r=readyById.get(id),d=json(r.file),src=json(sourceFiles[id]);
 assert.deepEqual(l,f.level);assert.deepEqual(l,d.level);assert.deepEqual(f.drags,d.drags);assert.equal(f.lowerBound,r.L);assert.equal(f.upperBound,r.U);assert.equal(src.levelSha256,digest(l));
 for(const k of ['name','timeSeconds','reward','parMoves'])assert.deepEqual(l[k],baseline.levels[id-1].level[k]);assert.deepEqual(geometry(l),baseline.levels[id-1].geometry);assert.deepEqual(api.levelStarTargets(l),baseline.levels[id-1].starTargets);auditSpatial(l,api);
 for(const review of r.reviews??[]){bind(review.file,review.sha256);bindFrames(json(review.file));}if(typeof r.review==='string')bindFrames(json(r.review));bindFrames(src);
 const mapping=src.inventory??src.bodyMapping??src.mapping;
 if(mapping){assert.equal(mapping.length,l.blocks.length);const mapped=new Set();for(const x of mapping){const body=x.design??x.designed;assert(body);assert.deepEqual(body,l.blocks.find(b=>b.id===body.id));mapped.add(body.id);const s=x.source;assert.equal(body.frozen,s.frozen);assert.equal(body.layers?.length??1,s.layers?.length??1);assert.equal(body.star??false,s.star??false);assert.equal(body.movementAxis,s.movementAxis);if(id===198){assert.equal(body.keyId,s.keyId?src.keyLockBindings[s.keyId]:undefined);assert.equal(body.lockedBy,s.lockedBy?src.keyLockBindings[s.lockedBy]:undefined);}else{assert.equal(body.keyId,s.keyId??s.keyGroup);assert.equal(body.lockedBy,s.lockedBy??s.lockGroup);}assert.equal(body.lockCount,s.lockCount);}assert.equal(mapped.size,l.blocks.length);}
 if(id===192){assert.equal(l.blocks.length,24);assert.equal(l.blocks.filter(b=>b.shutterId).length,5);assert.deepEqual(l.shutters.map(s=>s.count),[6]);assert.deepEqual(l.gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a-b),[1,6,6,6,6]);}
 if(id===193){assert.equal(l.blocks.length,18);assert.equal(l.blocks.filter(b=>b.layers).length,4);assert.equal(l.blocks.find(b=>b.id==='h5').frozen,1);assert.equal(l.shutters[0].count,4);}
 if(id===195){assert.equal(l.blocks.length,18);assert.equal(l.blocks.filter(b=>b.keyId).length,6);assert.equal(l.blocks.filter(b=>b.lockedBy&&b.lockCount===3).length,2);assert.deepEqual(l.gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a-b),[1,2,5,6,8,10,12]);}
 if(id===197){assert.equal(l.blocks.length,20);assert.equal(l.blocks.filter(b=>b.star).length,5);assert.deepEqual(l.gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a-b),[1,4,6,8,12,15,16]);}
 if(id===198){assert.equal(l.blocks.length,30);assert.equal(l.blocks.filter(b=>b.frozen).length,11);assert.equal(l.blocks.filter(b=>b.layers).length,11);assert.equal(l.gates.length,8);assert.deepEqual(l.gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a-b),[4,4,4,12,13,13,15]);}
 if(id===199){assert.equal(l.blocks.length,30);assert.equal(l.blocks.filter(b=>b.layers).length,3);assert.deepEqual(l.shutters.map(s=>s.count).sort((a,b)=>a-b),[5,7,12,18,25]);assert.equal(l.blocks.filter(b=>b.frozen===16&&b.shutterId==='cover12').length,1);}
 if(id===200){assert.equal(l.blocks.length,12);assert.equal(l.blocks.filter(b=>b.frozen===3).length,2);assert.equal(l.blocks.filter(b=>b.layers).length,0);assert.equal(l.coloredGrids.length,1);assert.equal(l.coloredGrids[0].cells.length,12);assert.deepEqual(l.gates.filter(g=>g.frozen).map(g=>g.frozen).sort((a,b)=>a-b),[3,5,6,9,10,11]);assert.equal(new Set(Object.values(src.adaptation.sourceBodyMapping)).size,11);assert(l.blocks.some(b=>b.id===src.adaptation.ordinaryFill));}
 if(src.sourceUnresolved)assert.deepEqual(src.sourceUnresolved,[]);
 sources.push({id,sourceFile:sourceFiles[id],sourceSha256:rawHash(sourceFiles[id]),levelSha256:digest(l),routeSha256:digest(f.drags),L:f.lowerBound,U:f.upperBound,drags:f.drags.length,mechanismInventoryBound:true,baselineGeometryAndScorePreserved:true,score:api.levelStarTargets(l),adaptations:src.sourceDesignDifferences??src.differences??src.adaptation??src.adaptations??src.adaptation,knownSourceCaveats:id===200?'Two source shells removed only because colored grids exclude shells;11 bodies plus one ordinary fill, all source bodies retained.':id===192?'Source irregular5→0 is explicitly authorized shape adaptation;14-cell hidden batch expands21, same5 identities and count6.':id===198?'11 source exits consolidated to8 by reducing4 ordinary exits to1; all7 frozen exits and counts retained.':null});
}

function reviewDrift(file,captured,current,requested){
 if(/^src\/core\/remake(171to180|181to190|191to200)\.ts$/.test(file)){
  inspectDisjointData(file,requested,captured);const old=parseData(file,captured),now=parseData(file,current),changed=[];
  for(const id of new Set([...Object.keys(old),...Object.keys(now)])){if(digest(old[id]??null)===digest(now[id]??null))continue;assert(now[id]);const allowed=parallel.get(Number(id));assert(allowed,'Unbound disjoint id '+id);assert.equal(digest(now[id]),allowed.levelSha256);if(old[id]){assert.equal(Number(id),182,'Existing reviewed map changed');const restored=structuredClone(now[id]);if(old[id].preservedMoveTarget===undefined)delete restored.preservedMoveTarget;else restored.preservedMoveTarget=old[id].preservedMoveTarget;assert.deepEqual(restored,old[id]);assert.equal(now[id].preservedMoveTarget,48);}changed.push({id:Number(id),before:old[id]?digest(old[id]):null,after:digest(now[id]),authorization:allowed});}
  return{file,kind:'EXACT_PURE_DATA_APPEND_OR_182_SCORE',changed};
 }
 if(file==='src/core/levels.ts'){
  let restored=current.replace("import { applyRemake171to180 } from './remake171to180';\n",'');restored=restored.replace('export const LEVELS_BEFORE_171_180_REMAKE: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);\nexport const LEVELS: LevelSpec[] = LEVELS_BEFORE_171_180_REMAKE.map(applyRemake171to180);','export const LEVELS: LevelSpec[] = LEVELS_BEFORE_191_200_REMAKE.map(applyRemake191to200);');assert.equal(restored,captured);return{file,kind:'EXACT_171_STAGE_INSERTION_REVERSED'};
 }
 if(file==='src/game/formalBlockShapes.ts'){
  const restored=current.replace("import { REMADE_171_180_IDS } from '../core/remake171to180';\n",'').replace(' || REMADE_171_180_IDS.includes(levelId)','');assert.equal(restored,captured);return{file,kind:'EXACT_171_NATIVE_ART_QUALIFICATION_INSERTION_REVERSED'};
 }
 if(file==='docs/rules/manifest.json'){
  const old=JSON.parse(captured),now=JSON.parse(current);assert.deepEqual(now.versions.slice(0,old.versions.length),old.versions);assert.deepEqual({...now,activeVersion:old.activeVersion,versions:old.versions},old);assert(now.versions.slice(old.versions.length).every(v=>['1.110.0','1.111.0'].includes(v.version)));return{file,kind:'IMMUTABLE_110_111_RULE_APPEND',added:now.versions.slice(old.versions.length).map(v=>v.version)};
 }
 throw Error('Unreviewed binding drift '+file);
}

const formal=new Map();for(const f of fs.readdirSync(ROOT).filter(f=>/^formal-verified-/.test(f)).sort()){const p=ROOT+'/'+f,r=json(p);assert.equal(r.status,'FORMAL_SUBSET_COMPLETE');for(const row of r.rows)formal.set(row.id,{file:p,sha256:rawHash(p),row});}
assert(ids.every(id=>formal.has(id)));
const pointer=[],continuity=[],seenReports=new Set(),currentHashCache=new Map();
for(const id of ids){
 const form=formal.get(id);assert.equal(form.row.levelSha256,digest(levels[id-1]));assert.equal(form.row.L,fixture.rows.find(r=>r.id===id).lowerBound);assert.equal(form.row.U,fixture.rows.find(r=>r.id===id).upperBound);assert.equal(form.row.pointer.length,2);
 for(const selected of form.row.pointer){
  bind(selected.report,selected.reportSha256);bind(selected.observed,selected.observedSha256);const report=json(selected.report),row=report.rows.find(r=>r.id===id);assert.equal(report.status,'PASS');assert.deepEqual(report.errors,[]);assert(report.formalDataValidated&&!report.candidateOnly&&report.naturalClock&&!report.clockFrozen&&!report.playerSaveTouched);assert.equal(row.status,'PASS');assert(row.formalObjectIdentity&&!row.candidateOverlay&&row.oldStarTargetsPreserved);assert.equal(row.levelSha256,digest(levels[id-1]));assert.equal(row.routeSha256,digest(fixture.rows.find(r=>r.id===id).drags));assert.equal(row.storage.backend,'MemoryHost');assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);
  if(!seenReports.has(selected.report)){
   const differences=[];for(const[p,h]of Object.entries(report.bindings)){const captured=path.join(report.sourceSnapshot,p);assert.equal(rawHash(captured),h,'Captured binding '+p);let now=currentHashCache.get(p);if(!now){now=rawHash(p);currentHashCache.set(p,now);}if(now!==h)differences.push(reviewDrift(p,fs.readFileSync(captured,'utf8'),fs.readFileSync(p,'utf8'),report.requestedIds));}
   for(const[p,h]of Object.entries(report.sourceBindings??{}))bind(p,h);
   continuity.push({report:selected.report,bindingCount:Object.keys(report.bindings).length,unchangedRuntimeArtAndAssets:true,acceptedExactChanges:differences});seenReports.add(selected.report);
  }
  for(const[p,h]of Object.entries(selected.screens))bind(p,h);
  const log=json(selected.observed),timing=replayTiming(levels[id-1],log,api);assert.equal(digest(log),selected.timing.logSha256);const score=evaluateLevelStars(levels[id-1],{moves:log.final.moves,elapsedSeconds:timing.activeSeconds});assert.equal(score.earnedStars,[195,197,198].includes(id)?2:3);
  pointer.push({id,formal:form.file,formalSha256:form.sha256,report:selected.report,reportSha256:selected.reportSha256,observed:selected.observed,observedSha256:selected.observedSha256,viewport:report.viewport,timing,score,storage:'ISOLATED_MEMORY_HOST_ONLY',q0:true});console.log(JSON.stringify({id,width:report.viewport.width,events:timing.events,stars:score.earnedStars}));
 }
}
assert.equal(pointer.length,14);
for(const[p,h]of Object.entries(sourceInputs))assert.equal(rawHash(p),h,'Input changed during independent review '+p);
const out=OUT+'/complete-'+Date.now()+'.json';
const result={status:'SEVEN_FORMAL_LEVELS_CONTINUITY_PASS',activeVersion:lock.activeVersion,ids,fullTenComplete:false,remaining:{191:'SOURCE_ACCEPTANCE_PENDING',194:'DIFFICULTY_NOT_COMPLETE',196:'SOURCE_ACCEPTANCE_PENDING'},levelSetSha256:digest(levels),fixture:{file:fixturePath,sha256:rawHash(fixturePath)},sources,adoptions,parallelAuthorizations:[...parallel.values()].filter(r=>!ids.includes(r.id)),pointer,continuity,bindings:Object.fromEntries(bindings),currentInputs:sourceInputs,readOnly:true,difficultySearchRerun:false,guiRerun:false,naturalLogsIndependentlyReplayed:14,playerSaveTouched:false,release:false,humanBlindTested:false,limitations:['Only192/193/195/197/198/199/200 are formal complete; not all10.','191 and196 need the already-asked concrete source acceptance;194 remains under finite regeneration.','195/197/198 keep original move targets and actual two-star outcomes. No score or time target altered.','This check rebinds existing difficulty/source evidence; it does not claim a new minimum or repeat a solved search.']};
writeNew(out,result);
const md='# 191–200 最终连续性独审：已完成7关\n\n192、193、195、197、198、199、200的正式数据、候选、fixture、来源映射及原棋盘/时间/三星/reward/par一致。七次接入均独立重建即时前后200关，确认每次仅目标关变化。\n\n14份最终双屏自然时钟日志已用当前模型逐事件重放；全部原向素材、隔离MemoryHost与报告/截图/源帧绑定通过。后来171–180接线和具体关卡、182接入及48拖评分、191批新增关卡均逐对象绑定，未接受运行逻辑或素材内容漂移。\n\n|关卡|L/U|完整总拖|原三星拖数|双屏实际星级|\n|---|---|---:|---:|---:|\n'+sources.map(r=>'|'+r.id+'|'+r.L+'/'+r.U+'|'+r.drags+'|'+r.score.moveTarget+'|'+pointer.find(p=>p.id===r.id).score.earnedStars+'|').join('\n')+'\n\n191、196待具体来源方案确认；194尚未完成。195、197、198保持原评分及两星结果。没有重跑GUI或难度搜索，没有修改生产或真实存档，没有打包、上传、发布或真人盲测。\n\n证据：['+path.basename(out)+']('+path.basename(out)+')。\n';
fs.mkdirSync(OUT,{recursive:true});fs.writeFileSync(OUT+'/README.md',md,{flag:'wx'});console.log(out);
