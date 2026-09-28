import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import {ROOT,IDS,ruleGate,digest,writeNew,auditSpatial} from './common.mjs';
import {loadApi,replay} from './replay.mjs';import {replayTiming} from './observed-timing.mjs';
import {inspectDisjointData} from '../remake91to100-data-drift.mjs';
const {api}=await loadApi(),fixture=JSON.parse(fs.readFileSync('tests/fixtures/remake182185-v107.json'));
const reports=process.argv.slice(2),byId=new Map(),continuity=[];assert(reports.length);const lock=ruleGate();
for(const file of reports){
 const report=JSON.parse(fs.readFileSync(file));assert.equal(report.status,'PASS');assert(report.formalDataValidated&&!report.candidateOnly);assert.deepEqual(report.errors,[]);assert(report.naturalClock&&!report.clockFrozen&&!report.playerSaveTouched);const accepted=[];
 for(const [p,h]of Object.entries(report.bindings)){
  const captured=path.join(report.sourceSnapshot,p);assert.equal(digest(fs.readFileSync(captured)),h,'Snapshot '+p);if(digest(fs.readFileSync(p))===h)continue;
  if(/^src\/core\/(remake\d+to\d+|nativeRemake31to40)\.ts$/.test(p))accepted.push(inspectDisjointData(p,report.requestedIds,fs.readFileSync(captured,'utf8')));
  else throw Error('Unreviewed binding drift '+p);
 }
 for(const row of report.rows){
  assert(IDS.includes(row.id));assert.equal(row.status,'PASS');assert(row.formalObjectIdentity&&!row.candidateOverlay);assert(row.oldStarTargetsPreserved);
  const f=fixture.rows.find(r=>r.id===row.id);assert(f);const l=api.LEVELS[row.id-1];assert.deepEqual(l,f.level);assert.equal(digest(l),row.levelSha256);assert.equal(digest(f.drags),row.routeSha256);auditSpatial(l,api);
  const route=replay(l,f.drags,api,{complete:true,requirePointerCompatible:true});assert.equal(route.nonClearingDrags,f.upperBound);assert.equal(f.lowerBound,16);assert(f.upperBound<=20);
  const observed=path.join(path.dirname(file),`lv${row.id}-observed-timing.json`),timing=replayTiming(l,JSON.parse(fs.readFileSync(observed)),api);
  assert(row.final.complete&&!row.final.failed&&row.final.remainingSeconds>0);assert.equal(row.final.moves,f.drags.length);assert.equal(row.nativeDrawAudit.rotated,0);assert.equal(row.nativeDrawAudit.canvasRotationCalls,0);assert.equal(row.storage.backend,'MemoryHost');
  const screens=Object.fromEntries(['opening','complete'].map(s=>{const p=path.join(path.dirname(file),`lv${row.id}-${s}.png`);return[p,digest(fs.readFileSync(p))];}));
  const item={id:row.id,report:file,reportSha256:digest(fs.readFileSync(file)),viewport:report.viewport,observed,observedSha256:digest(fs.readFileSync(observed)),timing,moves:row.final.moves,U:row.nonClearingDrags,remainingSeconds:row.final.remainingSeconds,storage:row.storage,screens};
  if(!byId.has(row.id))byId.set(row.id,[]);byId.get(row.id).push(item);
 }
 continuity.push({report:file,acceptedPureDataChanges:accepted});
}
for(const [id,rows]of byId){assert.equal(rows.length,2);assert.deepEqual(rows.map(r=>r.viewport.width).sort((a,b)=>a-b),[320,496]);}
const ids=[...byId.keys()].sort((a,b)=>a-b),fullBatch=ids.length===2&&IDS.every(id=>ids.includes(id));
const out=ROOT+'/formal-verified-'+Date.now()+'.json';writeNew(out,{status:fullBatch?'FORMAL_TWO_COMPLETE_WITH_PRESERVED_SCORE_CAVEATS':'FORMAL_SUBSET_COMPLETE',ruleVersion:lock.activeVersion,ids,fullBatch,rows:[...byId].map(([id,pointer])=>{const f=fixture.rows.find(r=>r.id===id),clearLoad=f.level.blocks.reduce((n,b)=>n+(b.layers?.length??1),0),score=api.levelStarTargets(f.level);return{id,L:f.lowerBound,U:f.upperBound,drags:f.drags.length,levelSha256:digest(f.level),score,guaranteedMinimumDrags:clearLoad+f.lowerBound,oldMoveStarImpossible:clearLoad+f.lowerBound>score.moveTarget,pointer};}),continuity,remainingIds:IDS.filter(id=>!ids.includes(id)),playerSaveTouched:false,humanBlindTested:false,release:false});console.log(JSON.stringify({out,ids,fullBatch}));
