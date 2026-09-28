import assert from 'node:assert/strict';
import fs from 'node:fs';
import {build} from 'esbuild';
import {ROOT,baseline,loadApi,checkCandidate,writeNew,ruleGate} from './remake81to90-v146.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
const reports=process.argv.slice(2).map(p=>({path:p,data:JSON.parse(fs.readFileSync(p))}));assert(reports.length>=2);
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/remake81to90-v146.json')),ids=fixture.rows.map(r=>r.id),{api,inputs}=await loadApi(),b=baseline();ruleGate();
const sourceBefore=Object.fromEntries(inputs.map(p=>[p,digest(fs.readFileSync(p))]));
const rows=[];
for(const row of fixture.rows){
 const d=JSON.parse(fs.readFileSync(row.candidate));assert.deepEqual(api.LEVELS[row.id-1],d.level);
 const checked=checkCandidate(d,b,api),scenarios=[];
 for(const viewport of [{width:496,height:1078},{width:320,height:568}]){
  const report=reports.find(({data:r})=>r.status==='PASS'&&r.formalDataValidated&&!r.candidateOnly&&r.viewport.width===viewport.width&&r.viewport.height===viewport.height&&r.rows.some(v=>v.id===row.id));assert(report,`Missing formal input ${row.id}/${viewport.width}`);
  const evidence=report.data.rows.find(v=>v.id===row.id);assert.equal(evidence.status,'PASS');assert.equal(evidence.levelSha256,digest(d.level));assert.equal(evidence.routeSha256,digest(d.drags));assert(evidence.formalObjectIdentity);assert(evidence.final.complete&&!evidence.final.failed&&evidence.final.remainingSeconds>0);
  assert(evidence.naturalTimingReplay);assert.equal(evidence.nativeDrawAudit.rotated,0);assert.equal(evidence.nativeDrawAudit.canvasRotationCalls,0);
  for(const[p,h]of Object.entries(report.data.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h,`Source evidence ${p}`);
  for(const[p,h]of Object.entries(report.data.bindings))if(/^(src\/(?:core|game|platform)\/|public\/assets\/art\/)/.test(p)&&!/^src\/core\/(?:nativeRemake31to40|remake[0-9]+to[0-9]+|levels)\.ts$/.test(p))assert.equal(digest(fs.readFileSync(p)),h,`Input runtime/art ${p}`);
  scenarios.push({report:report.path,viewport,drags:evidence.steps.length,remainingSeconds:evidence.final.remainingSeconds});
 }
 const clearLoad=d.level.blocks.reduce((n,x)=>n+(x.layers?.length??1),0),stars=api.levelStarTargets(d.level);
 rows.push({...checked,pointerValidated:true,formalDataValidated:true,adoptionReady:true,scenarios,starAssessment:{preserved:stars,clearLoad,guaranteedMinimumDrags:clearLoad+checked.lowerBound,moveTargetImpossible:clearLoad+checked.lowerBound>stars.moveTarget,witnessWithinMoveTarget:d.drags.length<=stars.moveTarget}});
}
const bundled=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS,LEVELS_BEFORE_81_90_REMAKE} from './src/core/levels.ts'; export {applyRemake81to90,REMADE_81_90_IDS} from './src/core/remake81to90.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const stage=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
assert.deepEqual(stage.REMADE_81_90_IDS,ids);for(const l of stage.LEVELS_BEFORE_81_90_REMAKE)if(!ids.includes(l.id))assert.equal(stage.applyRemake81to90(l),l);
assert.equal(digest(stage.LEVELS),digest(api.LEVELS),'Production campaign must be stable during verification');
assert.equal(digest(api.LEVELS.slice(0,30)),b.protected1to30Sha256);
const fifthRotated=api.LEVELS[4].blocks.filter(b=>api.matchFormalBlockShape(b.shape)?.quarterTurns!==0).length;assert.equal(fifthRotated,3);
for(const[p,h]of Object.entries(sourceBefore))assert.equal(digest(fs.readFileSync(p)),h,`Validation input drift ${p}`);
const output=ROOT+'/formal-verification-'+Date.now()+'.json';writeNew(output,{status:'PASS',ids,rows,activeRuleVersion:ruleGate().activeVersion,bindings:sourceBefore,campaignSha256:digest(api.LEVELS),otherStageObjectsPreserved:true,protected1to30:true,fifthOriginalRotatedBlocks:3,humanBlindTested:false,playerSaveTouched:false,released:false});
console.log(JSON.stringify({output,status:'PASS',ids,stars:rows.map(r=>({id:r.id,...r.starAssessment}))}));
