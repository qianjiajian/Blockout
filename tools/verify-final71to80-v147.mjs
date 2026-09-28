import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {loadApi,baseline,ROOT,IDS,writeNew,ruleGate,checkCandidate} from './remake71to80-v146.mjs';
import {verifyScopedBinding,inspectPureLevelData} from '../deliverables/remake71-80-v146-20260924/verify-binding-compatibility-v6.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {replayObservedModelTiming} from './revised-model-timing-observer.mjs';

// Historical Pointer runs retain their exact private source snapshots. Current
// gameplay/art must still match those runs; current proof tooling is checked
// afresh instead of rewriting the historical tool hashes after adding levels.
const {api}=await loadApi(),b=baseline(),lock=ruleGate();
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/remake71to80-v146.json'));
const subset=process.argv.includes('--completed-subset'),requested=fixture.rows.map(r=>r.id);
if(!subset)assert.deepEqual(requested,IDS,'All ten must actually be adopted');
else assert(requested.length>0&&requested.every(id=>IDS.includes(id)));
const bundle=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS_BEFORE_71_80_REMAKE} from './src/core/levels.ts';export {applyRemake71to80,REMADE_71_80_IDS} from './src/core/remake71to80.ts';"},bundle:true,write:false,platform:'node',format:'esm'});
const stage=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
assert.deepEqual(stage.REMADE_71_80_IDS,requested);
assert.deepEqual(stage.LEVELS_BEFORE_71_80_REMAKE.map(stage.applyRemake71to80).filter((l,i)=>l!==stage.LEVELS_BEFORE_71_80_REMAKE[i]).map(l=>l.id),requested);
assert.equal(digest(api.LEVELS.slice(0,30)),b.protected1to30Sha256);
assert.equal(api.LEVELS[4].blocks.filter(x=>api.matchFormalBlockShape(x.shape)?.quarterTurns!==0).length,3);
const external=['nativeRemake31to40','remake41to50','remake61to70','remake81to90','remake91to100','remake101to110','remake111to120','remake181to190'].map(name=>inspectPureLevelData('src/core/'+name+'.ts'));
const permitted=new Set([...requested,...external.flatMap(r=>r.ids)]);
// The immutable baseline is JSON; optional undefined members are omitted there.
for(let i=0;i<200;i++)if(!permitted.has(i+1))assert.equal(digest(api.LEVELS[i]),digest(b.levels[i].level),'Unadopted level '+(i+1));
const rows=[];
for(const id of requested){
 const finalName=fs.readdirSync(ROOT).filter(n=>new RegExp('^formal'+id+'-verification-\\d+\\.json$').test(n)).sort().at(-1);assert(finalName,'Missing formal verification '+id);
 const prior=JSON.parse(fs.readFileSync(ROOT+'/'+finalName));assert.equal(prior.status,'PASS');
 const data=JSON.parse(fs.readFileSync(prior.candidate));assert.deepEqual(api.LEVELS[id-1],data.level);assert.deepEqual(fixture.rows.find(r=>r.id===id).drags,data.drags);
 const check=checkCandidate(data,b,api),pointers=[];
 for(const originalItem of prior.pointers??prior.reports){
  const item={...originalItem,path:originalItem.path??originalItem.file};
  const report=JSON.parse(fs.readFileSync(item.path)),row=report.rows.find(r=>r.id===id);assert.equal(report.status,'PASS');assert(!report.candidateOnly&&report.formalDataValidated&&report.naturalClock&&!report.clockFrozen);assert(row.formalObjectIdentity&&row.status==='PASS');
  assert.equal(row.levelSha256,digest(data.level));assert.equal(row.routeSha256,digest(data.drags));
  assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);assert(row.nativeDrawAudit.calls>0);
  const drift=[];let historicalToolFiles=0,historicalToolHashRecords=0;assert.deepEqual(report.drift,[]);
  for(const [file,hash]of Object.entries(report.bindings)){
   if(report.sourceSnapshot)assert.equal(digest(fs.readFileSync(path.join(report.sourceSnapshot,file))),hash,'Historical snapshot '+file);
   if(file.startsWith('src/')||file.startsWith('public/assets/art/')){if(digest(fs.readFileSync(file))!==hash)drift.push(verifyScopedBinding(file,hash,{level:data.level,api}));}
   else if(report.sourceSnapshot)historicalToolFiles++;else historicalToolHashRecords++;
  }
  for(const [file,hash]of Object.entries(report.sourceBindings??{}))assert.equal(digest(fs.readFileSync(file)),hash,'Current source evidence '+file);
  const timingFile=path.join(path.dirname(item.path),'lv'+id+'-observed-timing.json'),timing=JSON.parse(fs.readFileSync(timingFile));
  const observed=timing.events.filter(e=>e.method==='moveBlockStep'&&e.result===true).map(e=>e.args),expected=data.drags.flatMap(d=>d.path.map(([x,y])=>[d.blockId,x,y]));
  assert.deepEqual(observed,expected,'Every actual unit step '+id);
  const replay=replayObservedModelTiming(data.level,timing,api);assert(replay.passed);
  assert(row.final.complete&&!row.final.failed&&row.final.remainingSeconds>0);
  pointers.push({report:item.path,sha256:digest(fs.readFileSync(item.path)),viewport:report.viewport,units:observed.length,unitPathSha256:digest(observed),naturalTimingReplay:replay,remainingSeconds:row.final.remainingSeconds,scopedDataDrift:drift,historicalToolFilesVerifiedInSnapshot:historicalToolFiles,historicalToolHashRecordsWithoutSnapshot:historicalToolHashRecords,currentGameplayAndArtCheckedAgainstRunBindings:true,currentProofRevalidated:true});
 }
 assert.deepEqual(pointers.map(p=>p.viewport.width).sort((a,b)=>a-b),[320,496]);
 const targets=api.levelStarTargets(data.level),clears=data.level.blocks.reduce((n,body)=>n+(body.layers?.length??1),0);
 rows.push({id,candidate:prior.candidate,check,pointers,evaluation:{preserved:targets,minimumDrags:clears+check.lowerBound,oldMoveTargetImpossible:clears+check.lowerBound>targets.moveTarget,targetsChanged:false}});
 console.log(JSON.stringify({id,status:'PASS',lower:check.lowerBound,upper:check.upperBound}));
}
const output=ROOT+(subset?'/completed-subset-verification-':'/final-ten-verification-')+Date.now()+'.json';
writeNew(output,{status:'PASS',createdAt:new Date().toISOString(),activeVersion:lock.activeVersion,rows,allTenFormallyAdopted:requested.length===10,pending:IDS.filter(id=>!requested.includes(id)),protected1to30:true,lv5OriginalRotations:3,otherStageObjectsPreserved:200-requested.length,externalPureDataModules:external.map(({reviewed,...r})=>r),humanBlindTested:false,phoneTested:false,released:false});
console.log(JSON.stringify({output,status:'PASS'}));
