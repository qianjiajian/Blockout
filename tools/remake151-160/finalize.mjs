import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {api,audit,baseline,ruleGate,save,digest,ROOT} from './common.mjs';
import {replayTiming} from './observed-timing.mjs';
Error.stackTraceLimit=2;
ruleGate();const fixture=JSON.parse(fs.readFileSync('tests/fixtures/remake151to160-v102.json'));
assert.deepEqual(fixture.rows.map(r=>r.id),Array.from({length:10},(_,i)=>151+i),'Do not finalize a partial batch');
const reports=fs.readdirSync(ROOT,{withFileTypes:true}).filter(e=>e.isDirectory()&&e.name.startsWith('pointer-')).map(e=>ROOT+'/'+e.name+'/report.json').filter(fs.existsSync).map(file=>({file,data:JSON.parse(fs.readFileSync(file))}));
const checked=new Map();
async function reviewReport(report){
 if(checked.has(report.file))return checked.get(report.file);
 const r=report.data;assert.equal(r.status,'PASS');assert.equal(r.candidateOnly,false);assert(r.formalDataValidated&&r.naturalClock&&!r.clockFrozen);assert.deepEqual(r.errors,[]);assert.deepEqual(r.drift,[]);assert.deepEqual(r.currentWorkspaceDrift,[]);
 for(const[p,h]of Object.entries(r.bindings))assert.equal(digest(fs.readFileSync(path.join(r.sourceSnapshot,p))),h,'Original snapshot drift '+p);
 for(const[p,h]of Object.entries(r.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h,'Source evidence drift '+p);
 const changed=Object.entries(r.bindings).filter(([p,h])=>!fs.existsSync(p)||digest(fs.readFileSync(p))!==h).map(([p])=>p);
 const allowed=new Set(['src/core/levels.ts','src/core/remake151to160.ts','src/core/remake161to170.ts','src/core/level78LateLiftRepair.ts','src/game/formalBlockShapes.ts','docs/rules/manifest.json']);
 assert(changed.every(p=>allowed.has(p)),`Runtime, art or proof changed: ${changed.join(',')}`);
 if(changed.includes('docs/rules/manifest.json')){const old=JSON.parse(fs.readFileSync(path.join(r.sourceSnapshot,'docs/rules/manifest.json'))),now=JSON.parse(fs.readFileSync('docs/rules/manifest.json'));assert.deepEqual(now.versions.slice(0,old.versions.length),old.versions);assert.equal(now.schemaVersion,old.schemaVersion);assert.equal(now.hashAlgorithm,old.hashAlgorithm);}
 // A subsequent data-only batch is not the original snapshot. Compile the
 // preserved snapshot independently and check its exact tested objects again.
 const result=await build({stdin:{resolveDir:r.sourceSnapshot,contents:"export {LEVELS} from './src/core/levels.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
 const old=await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
 const campaignChanges=old.LEVELS.flatMap((l,i)=>digest(l)===digest(api.LEVELS[i])?[]:[l.id]);
 assert(!campaignChanges.some(id=>r.requestedIds.includes(id)),'A tested object changed after input');
 if(changed.includes('src/game/formalBlockShapes.ts')){
  const normalize=s=>s.replace(/^import \{ REMADE_161_170_IDS \} from ['"]\.\.\/core\/remake161to170['"];\r?\n/m,'').replace(/ \|\| REMADE_161_170_IDS.includes\(levelId\)/g,'');
  assert.equal(normalize(fs.readFileSync('src/game/formalBlockShapes.ts','utf8')),normalize(fs.readFileSync(path.join(r.sourceSnapshot,'src/game/formalBlockShapes.ts'),'utf8')),'Only the separate 161–170 eligibility addition is understood');
 }
 const reviewed={file:report.file,sha256:digest(fs.readFileSync(report.file)),snapshotSha256:digest(r.bindings),originalStatus:r.status,subsequentDataFiles:changed,subsequentDifferentLevelIds:campaignChanges,testedLevelObjectsUnchanged:true};checked.set(report.file,reviewed);return reviewed;
}
const rows=[];
for(const row of fixture.rows){const l=api.LEVELS[row.id-1];assert.deepEqual(l,row.level);assert(audit(l).passed);assert.equal(digest(fs.readFileSync(row.ready.file)),row.ready.sha256);const data=JSON.parse(fs.readFileSync(row.ready.file));assert(data.formalReadyReview.passed&&data.formalReadyReview.proof.thresholdProven);
 const route=api.replayRevisedRoute(l,row.drags);assert(route.valid&&route.complete);assert.equal(route.nonClearingDrags,row.upperBound);const input=[];
 for(const [width,height]of [[320,568],[496,1078]]){
  const report=reports.findLast(r=>r.data.status==='PASS'&&!r.data.candidateOnly&&r.data.viewport.width===width&&r.data.viewport.height===height&&r.data.rows.some(x=>x.id===l.id&&x.status==='PASS'&&x.levelSha256===digest(l)&&x.routeSha256===digest(row.drags)));
  assert(report,`Missing formal input ${l.id}/${width}`);const reviewed=await reviewReport(report),r=report.data.rows.find(x=>x.id===l.id);
  assert(r.formalObjectIdentity&&!r.candidateOverlay&&r.final.complete&&!r.final.failed&&r.final.remainingSeconds>0);assert.equal(r.nativeDrawAudit.rotated,0);assert.equal(r.nativeDrawAudit.canvasRotationCalls,0);assert.equal(r.nativeDrawAudit.invalidImageDimensions,0);
  const p=path.join(path.dirname(report.file),`lv${l.id}-observed-timing.json`),timing=replayTiming(l,JSON.parse(fs.readFileSync(p)),api);
  assert(r.settlement&&r.actualStars===r.settlement.earnedStars);assert.equal(r.settlement.storage.save.bestStars[String(l.id)],r.actualStars);assert.equal(r.settlement.storage.save.bestMoves[String(l.id)],row.drags.length);
  input.push({viewport:{width,height},report:reviewed.file,actualStars:r.actualStars,elapsedSeconds:r.settlement.conditions.elapsedSeconds,timingSha256:digest(fs.readFileSync(p)),currentModelReplay:timing});
 }
 const clearLoad=l.blocks.reduce((n,b)=>n+(b.layers?.length??1),0),stars=api.levelStarTargets(l);
 rows.push({id:l.id,levelSha256:digest(l),ready:row.ready,L:row.lowerBound,U:row.upperBound,totalDrags:row.drags.length,clearLoad,stars,guaranteedMinimumDrags:clearLoad+row.lowerBound,starMoveTargetImpossible:clearLoad+row.lowerBound>stars.moveTarget,formalInputs:input});
}
const final=save('complete',{passed:true,taskRule:'1.102.0',activeRule:ruleGate().activeVersion,scope:[151,160],rows,reports:[...checked.values()],campaignSha256:digest(api.LEVELS),oldCampaignSha256:baseline.campaignSha256,playerSaveTouched:false,humanBlindTested:false,globalDeadlockFreedomProven:false,packaged:false,published:false});console.log(JSON.stringify({final,levels:rows.length,formalInputs:rows.length*2,starConflicts:rows.filter(r=>r.starMoveTargetImpossible).map(r=>r.id)}));
