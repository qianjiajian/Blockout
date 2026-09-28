import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const ROOT='deliverables/repair78-lift-20260927',read=p=>JSON.parse(fs.readFileSync(p)),clean=v=>v===undefined?null:JSON.parse(JSON.stringify(v));
const files=process.argv.slice(2);assert.equal(files.length,4,'Four formal Pointer reports required');
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.105.0');
const candidateFile=ROOT+'/design/candidate-color-3-5-1790517660677.json',candidate=read(candidateFile),before=read(ROOT+'/before-write.json'),integration=read(ROOT+'/integration-1790518108446.json');
assert.equal(digest(fs.readFileSync('src/core/level78LateLiftRepair.ts')),integration.newProductionSha256);
const currentBuilt=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS,LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR,LEVELS_BEFORE_161_170_REMAKE,LEVELS_BEFORE_151_160_REMAKE,LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE} from './src/core/levels.ts';export {applyLevel78LateLiftRepair} from './src/core/level78LateLiftRepair.ts';"},bundle:true,write:false,format:'esm',platform:'node',metafile:true,logLevel:'silent'});
const current=await import('data:text/javascript;base64,'+Buffer.from(currentBuilt.outputFiles[0].text).toString('base64'));
const currentBindings=Object.fromEntries(Object.keys(currentBuilt.metafile.inputs).filter(p=>fs.existsSync(p)).map(p=>[p,digest(fs.readFileSync(p))]));
assert.deepEqual(clean(current.LEVELS[77]),candidate.level);assert.deepEqual(clean(current.LEVELS_BEFORE_161_170_REMAKE[77]),candidate.level);
const before78=current.LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR,after78=current.LEVELS_BEFORE_161_170_REMAKE;
assert.deepEqual(clean(before78[77]),before.level);assert.deepEqual(clean(current.applyLevel78LateLiftRepair(before78[77])),candidate.level);
for(let i=0;i<200;i++)if(i!==77){assert.equal(after78[i],before78[i]);assert.equal(current.applyLevel78LateLiftRepair(before78[i]),before78[i]);}
const parallelBefore=current.LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR.filter((l,i)=>digest(l)!==digest(before.priorLevels[i])).map(l=>l.id),parallelAfter=current.LEVELS.filter((l,i)=>digest(l)!==digest(after78[i])).map(l=>l.id);
assert(parallelBefore.every(id=>id>=151&&id<=160));assert(parallelAfter.every(id=>id>=161&&id<=170));
const fixtureFile='tests/fixtures/level78-late-lift-v1104.json',fixture=read(fixtureFile);assert.deepEqual(fixture.level,candidate.level);assert.deepEqual(fixture.normalDrags,candidate.drags);assert.deepEqual(fixture.lateDrags,candidate.lateDrags);
const immutableExpected={
 'tests/fixtures/remake71to80-v146.json':'c0c91cb70fd0e5d83c05b506bbe42bcbdc95fc45d2737b1a3ee9448054319beb',
 'deliverables/star-targets71-80-20260927/route-witnesses.json':'68eb43f155fefb8ae6f66157bfa952ecc2c6886b3fbcef40c7cca8e9d8df50cf',
 'deliverables/star-targets71-80-20260927/before.json':'a705e44677fbeb9154f8a9e0c386ab373ff160999519955825e00c6bf992df09',
 'deliverables/star-targets71-80-20260927/before-write.json':'41d9124d6d65d2f1fe00d7b3ca3822710ee7dcd577444b4c7b086bdeb7943c7a',
};for(const[p,h]of Object.entries(immutableExpected))assert.equal(digest(fs.readFileSync(p)),h);
const testFiles=['tests/remake71to80.test.ts','tests/level70GeneratorRemake.test.ts','tests/level78LateLiftRepair.test.ts'];
assert(fs.readFileSync(testFiles[0],'utf8').includes('LEVELS_BEFORE_LEVEL78_LATE_LIFT_REPAIR[historical.id-1]'));
assert(fs.readFileSync(testFiles[1],'utf8').includes('LEVELS_BEFORE_151_160_REMAKE as LEVELS'));
assert(fs.readFileSync(testFiles[2],'utf8').includes('expect(LEVELS_BEFORE_161_170_REMAKE[index]).toBe(old)'));
const testsFile=ROOT+'/tests.json',tests=read(testsFile);assert(tests.success);assert.equal(tests.numTotalTests,37);assert.equal(tests.numPassedTests,37);assert.equal(tests.numFailedTests,0);assert.equal(tests.testResults.length,3);assert(tests.testResults.every(r=>r.status==='passed'));
function compareParallelData(p,snapshotFile){
 assert.equal(p,'src/core/remake161to170.ts');const now=fs.readFileSync(p,'utf8'),old=fs.readFileSync(snapshotFile,'utf8');
 const vars=text=>{const ast=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true);return{ast,decls:ast.statements.filter(ts.isVariableStatement).flatMap(v=>[...v.declarationList.declarations])};};
 const a=vars(now),b=vars(old),patches=[],values={};
 for(const name of ['REMADE_161_170_IDS','reviewed']){const x=a.decls.find(v=>v.name.getText(a.ast)===name)?.initializer,y=b.decls.find(v=>v.name.getText(b.ast)===name)?.initializer;assert(x&&y);values[name]={now:JSON.parse(x.getText(a.ast)),old:JSON.parse(y.getText(b.ast))};patches.push({start:x.getStart(a.ast),end:x.end,text:y.getText(b.ast)});}
 let restored=now;for(const patch of patches.sort((a,b)=>b.start-a.start))restored=restored.slice(0,patch.start)+patch.text+restored.slice(patch.end);assert.equal(digest(restored),digest(old),'Only literal IDs and level data may advance');
 const data=values.reviewed,ids=values.REMADE_161_170_IDS;for(const side of ['now','old']){assert.deepEqual(ids[side],Object.keys(data[side]).map(Number));assert(ids[side].every(id=>id>=161&&id<=170));}
 const changed=[...new Set([...ids.old,...ids.now])].filter(id=>digest(data.old[id]??null)!==digest(data.now[id]??null));assert(changed.length>0);return{path:p,beforeSha256:digest(old),currentSha256:digest(now),changedIds:changed,exactLiteralOnlyReconstruction:true,unchangedRuntimeAndRenderer:true};
}
const rows=[];
for(const file of files){
 const report=read(file);assert.equal(report.status,'PASS');assert.deepEqual(report.errors,[]);for(const name of ['snapshotDrift','sourceEvidenceDrift','currentWorkspaceDrift'])assert.deepEqual(report[name],[]);
 assert(report.naturalClock&&!report.clockFrozen&&!report.playerSaveTouched);assert.equal(report.rows.length,1);
 const postRunConcurrentChanges=[];
 for(const[p,h]of Object.entries(report.bindings)){const snapshotFile=path.join(report.sourceSnapshot,p);assert.equal(digest(fs.readFileSync(snapshotFile)),h,'Immutable snapshot '+p);if(digest(fs.readFileSync(p))!==h)postRunConcurrentChanges.push(compareParallelData(p,snapshotFile));}
 const built=await build({stdin:{resolveDir:report.sourceSnapshot,contents:"export {LEVELS} from './src/core/levels.ts';export {PuzzleModel} from './src/core/PuzzleModel.ts';export {evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,format:'esm',platform:'node',logLevel:'silent'});
 const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64')),level=api.LEVELS[77];assert.deepEqual(clean(level),candidate.level);const objectDifferences=current.LEVELS.filter((l,i)=>digest(l)!==digest(api.LEVELS[i])).map(l=>l.id),changedIds=[...new Set(postRunConcurrentChanges.flatMap(r=>r.changedIds))].sort((a,b)=>a-b);assert.deepEqual(objectDifferences,changedIds);
 const row=report.rows[0],log=read(row.timingLog.file),isLate=report.caseName==='late-no-external',moves=isLate?46:37,stars=isLate?2:3;assert.equal(row.status,'PASS');assert.equal(row.id,78);assert.equal(digest(fs.readFileSync(row.timingLog.file)),row.timingLog.sha256);assert.equal(digest(level),row.levelSha256);
 assert(row.formalObjectIdentity&&!row.candidateOverlay);assert(log.readOnlyObservation&&log.sameModel&&log.deferExitCompletion);assert.deepEqual(log.forbidden,[]);
 const model=new api.PuzzleModel(structuredClone(level),{deferExitCompletion:true});assert.deepEqual(clean(model.snapshot()),log.initial);assert.equal(log.initial.started,false);
 const observed=log.exitAnimationNamespace,local=model.exitAnimationNamespace;
 const map=(v,from,to)=>Array.isArray(v)?v.map(x=>map(x,from,to)):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,map(x,from,to)])):typeof v==='string'&&v.startsWith('exit-'+from+'-')?'exit-'+to+'-'+v.slice(('exit-'+from+'-').length):v;
 const allowed=new Set(['start','startCountdown','tick','beginAction','moveBlockStep','tryExit','commitAction','cancelAction','completeExitAnimation']);let at=log.startedAt,ticks=0,seconds=0,callbacks=0,reveal=null;
 for(const[index,event]of log.events.entries()){
  assert(allowed.has(event.method));assert(Array.isArray(event.args));assert(Number.isFinite(event.at)&&event.at>=at);at=event.at;const beforeState=model.snapshot();
  if(event.method==='tick'){assert(Number.isFinite(event.args[0])&&event.args[0]>=0);ticks++;if(beforeState.started&&!beforeState.complete&&!beforeState.failed)seconds+=event.args[0];}if(event.method==='completeExitAnimation')callbacks++;
  const result=model[event.method](...map(event.args,observed,local));assert.deepEqual(map(clean(result),local,observed),event.result,`Result ${index}`);const after=model.snapshot();assert.deepEqual(map(clean(after),local,observed),event.after,`State ${index}`);assert(!after.failed);
  if(!beforeState.shutters[0].revealed&&after.shutters[0].revealed){assert(!reveal);reveal={event:index,method:event.method,cleared:after.cleared,externalRemaining:after.blocks.filter(b=>!b.shutterId).length,hiddenFrozen:after.blocks.filter(b=>b.shutterId&&b.frozen>0).map(b=>b.frozen)};assert.deepEqual(reveal.hiddenFrozen,[3,3]);}
 }
 assert(reveal);if(isLate){assert.equal(reveal.externalRemaining,0);assert.equal(reveal.cleared,13);assert.equal(reveal.method,'tryExit');}
 assert(ticks>0&&seconds>0);assert(log.finishedAt>=at);assert.deepEqual(map(clean(model.snapshot()),local,observed),log.final);assert(log.final.complete&&!log.final.failed);assert.equal(log.final.moves,moves);assert.equal(log.final.cleared,19);assert(Math.abs(log.initial.remainingSeconds-log.final.remainingSeconds-seconds)<.00001);assert(seconds<=(log.finishedAt-log.startedAt)/1000+.1);
 const settlement=row.settlement;assert.equal(settlement.earnedStars,stars);assert.equal(settlement.assistedClear,false);assert.equal(settlement.storage.backend,'MemoryHost');assert.equal(settlement.storage.save.bestStars[78],stars);assert.equal(settlement.storage.save.bestMoves[78],moves);assert.equal(row.nativeStorageOperations,0);assert.deepEqual(settlement.conditions,api.evaluateLevelStars(level,settlement.completionMetrics));assert(settlement.texts.includes('37次拖动内完成'));assert(settlement.texts.includes('129秒内完成'));assert.equal(settlement.starImages.length,3);assert.equal(settlement.starImages.filter(n=>!n.startsWith('empty')).length,stars);
 assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);assert.equal(row.nativeDrawAudit.invalidImageDimensions,0);
 const screenshots=fs.readdirSync(path.dirname(file)).filter(n=>/^lv78-.*\.png$/.test(n)).map(n=>{const p=path.join(path.dirname(file),n);return{file:p,sha256:digest(fs.readFileSync(p))};});
 rows.push({file,reportSha256:digest(fs.readFileSync(file)),status:'PASS',caseName:report.caseName,viewport:report.viewport,events:log.events.length,ticks,seconds,callbacks,moves,clearEvents:19,elapsedSeconds:settlement.conditions.elapsedSeconds,stars,reveal,exactEveryEvent:true,screenshots,postRunConcurrentChanges,objectDifferences});
}
assert.deepEqual(rows.map(r=>`${r.caseName}/${r.viewport.width}`).sort(),['late-no-external/320','late-no-external/496','normal/320','normal/496']);
for(const[p,h]of Object.entries(currentBindings))assert.equal(digest(fs.readFileSync(p)),h);
const proofFile=ROOT+'/review/colored-final-review-1790518051495.json',proof=read(proofFile);assert.equal(proof.status,'PASS');assert.equal(proof.candidate.levelSha256,digest(candidate.level));
for(const[p,h]of Object.entries(proof.bindings)){
 if(digest(fs.readFileSync(p))===h)continue;const text=fs.readFileSync(p,'utf8');let prior;
 if(p==='src/game/formalBlockShapes.ts')prior=text.replace("import { REMADE_161_170_IDS } from '../core/remake161to170';\n",'').replace(' || REMADE_161_170_IDS.includes(levelId)','');
 else if(p==='src/core/remake151to160.ts'){
  const ast=ts.createSourceFile(p,text,ts.ScriptTarget.Latest,true),vars=ast.statements.filter(ts.isVariableStatement).flatMap(v=>[...v.declarationList.declarations]),def=vars.find(v=>v.name.getText(ast)==='reviewed').initializer,obj=JSON.parse(def.getText(ast));assert.equal(obj['154'].id,154);delete obj['154'];prior=text.slice(0,def.getStart(ast))+JSON.stringify(obj,null,2).replaceAll('\n',text.includes('\r\n')?'\r\n':'\n')+text.slice(def.end);prior=prior.replace('[151,152,153,154,157,158,159,160]','[151,152,153,157,158,159,160]');
 }else assert.fail('Unreviewed source change since qualification: '+p);
 assert.equal(digest(prior),h,'Exact reconstruction of qualified source before parallel 154 data / 161 eligibility');
}
const typecheckFile=ROOT+'/typecheck.json',typecheck=read(typecheckFile);assert.equal(typecheck.exitCode,0);
const inputs=Object.fromEntries([candidateFile,fixtureFile,...testFiles,testsFile,typecheckFile,'tests/fixtures/level70-dual-generator-v193.json',proofFile,ROOT+'/before-write.json',ROOT+'/integration-1790518108446.json',import.meta.filename].map(p=>[p,digest(fs.readFileSync(p))]));
const output=ROOT+'/review/completion-review-'+Date.now()+'.json';const result={createdAt:new Date().toISOString(),status:'PASS',activeRule:lock.activeVersion,taskRule:'1.104.0',formalLevelSha256:digest(current.LEVELS[77]),scope:{repairStageChangedIds:[78],repairStageOther199ReferencePreserved:true,precedingConcurrentChangeIds:parallelBefore,subsequentConcurrentChangeIds:parallelAfter,parallelLevelsNotAttributedTo78Repair:true},historicalEvidencePreserved:immutableExpected,newFixtureExactCandidate:true,sourceReview:'Dedicated module applies only ID78, returns every other reference untouched; four xy changes and ordinary cyan-to-green color preserve all other metadata and 13 opening bodies. Historical 71-80 and 70 witnesses remain on their own stages.',rows,difficultyAndSafetyReview:{file:proofFile,sha256:inputs[proofFile]},currentBindings,inputs,claims:{wholeHiddenSafetyScope:'Both zero-external initial ice2 and ice3 only; all reachable orders exhaust.',wholeCampaignNoDeadlock:false,optimality:false,automatedBrowserNotHumanBlindTest:true,playerSaveTouched:false,release:false}};fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,status:result.status,scope:result.scope,rows:rows.map(({file,caseName,viewport,events,ticks,seconds,moves,stars,reveal})=>({file,caseName,viewport,events,ticks,seconds,moves,stars,reveal}))}));
