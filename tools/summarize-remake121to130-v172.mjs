import fs from 'node:fs';
import assert from 'node:assert/strict';
import {OUTPUT,loadApi,ruleGate,baseline,TARGETS} from './remake121to130-v172.mjs';
import {digest} from './revised-preview-validation-v160.mjs';
import {inspectDisjointWiring,inspectScopedAxisChange} from './remake121to130-wiring-drift.mjs';
import {inspectDisjointData} from './remake91to100-data-drift.mjs';
import path from 'node:path';

const files=process.argv.slice(2);assert(files.length>=2);
const lock=ruleGate(),{api}=await loadApi(),b=baseline();
const fixture=JSON.parse(fs.readFileSync('tests/fixtures/remake121to130-v146.json'));
const installations=fs.readdirSync(OUTPUT).filter(p=>/^installed-\d+\.json$/.test(p)).sort().reverse().map(p=>({file:OUTPUT+'/'+p,data:JSON.parse(fs.readFileSync(OUTPUT+'/'+p))}));
const reports=files.map(file=>({file,data:JSON.parse(fs.readFileSync(file))}));
for(const {data:r}of reports){
 assert.equal(r.status,'PASS');assert.equal(r.candidateOnly,false);assert.equal(r.formalDataValidated,true);
 assert.equal(r.naturalClock,true);assert.equal(r.clockFrozen,false);assert.equal(r.playerSaveTouched,false);
 for(const [p,h]of Object.entries(r.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h);
 // A completed run remains evidence for its exact maps. Check current runtime/art
 // bytes, allowing only independently audited unrelated pure-data changes.
 for(const [p,h]of Object.entries(r.bindings))if(/^(src\/(?:core|game|platform)\/|public\/assets\/art\/)/.test(p)&&digest(fs.readFileSync(p))!==h){
  const captured=fs.readFileSync(path.join(r.sourceSnapshot,p),'utf8');assert.equal(digest(Buffer.from(captured)),h);
  if(['src/core/levels.ts','src/game/formalBlockShapes.ts'].includes(p))inspectDisjointWiring(p,r.requestedIds,captured);
  else if(p==='src/core/axisRectangularRepairs.ts')inspectScopedAxisChange(p,r.requestedIds,captured);
  else if(/^src\/core\/(?:nativeRemake31to40|remake[0-9]+to[0-9]+)\.ts$/.test(p))inspectDisjointData(p,r.requestedIds,captured);
  else assert.fail(`Unreviewed runtime/art change after formal run: ${p}`);
 }
}
const rows=fixture.rows.map(f=>{
 const l=api.LEVELS[f.id-1],candidate=JSON.parse(fs.readFileSync(f.candidate)),t=TARGETS[f.id];
 assert.equal(digest(l),digest(f.level));assert.equal(digest(l),digest(candidate.level));
 assert(f.lowerBound>=t.min&&f.upperBound<=t.max);assert.deepEqual(api.levelStarTargets(l),b.levels[f.id-1].starTargets);
 const installation=installations.find(({data:r})=>r.activeRuleVersion===lock.activeVersion&&r.otherLevelsPreserved===true&&r.checked?.some(c=>c.id===f.id&&c.levelSha256===digest(l)&&c.routeSha256===digest(f.drags)));
 assert(installation,`Missing exact installation proof: ${f.id}`);
 const check=installation.data.checked.find(c=>c.id===f.id);assert(check.proof.thresholdProven&&check.replay.valid&&check.replay.complete);assert.equal(check.lowerBound,f.lowerBound);assert.equal(check.upperBound,f.upperBound);
 const evidence=reports.flatMap(({file,data:r})=>r.rows.filter(x=>x.id===f.id).map(x=>({file,viewport:r.viewport,row:x})));
 assert(new Set(evidence.map(e=>JSON.stringify(e.viewport))).size>=2,`Missing dual formal input: ${f.id}`);
 for(const e of evidence){assert.equal(e.row.status,'PASS');assert.equal(e.row.levelSha256,digest(l));assert.equal(e.row.routeSha256,digest(f.drags));assert.equal(e.row.formalObjectIdentity,true);}
 const clears=l.blocks.reduce((n,x)=>n+(x.layers?.length??1),0),target=api.levelStarTargets(l);
 return{id:f.id,levelSha256:digest(l),routeSha256:digest(f.drags),candidate:f.candidate,lowerBound:f.lowerBound,upperBound:f.upperBound,drags:f.drags.length,minimumTotalDrags:clears+f.lowerBound,originalStarTargets:target,moveStarConflict:clears+f.lowerBound>target.moveTarget?'PROVEN_UNATTAINABLE_ORIGINAL_TARGET_PRESERVED':null,installation:{file:installation.file,sha256:digest(fs.readFileSync(installation.file)),proof:check.proof},formalPointerReports:evidence.map(e=>({file:e.file,viewport:e.viewport})),exactOptimumKnown:f.lowerBound===f.upperBound};
});
const report={createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,status:rows.length===10?'FORMAL_BATCH_COMPLETE':'FORMAL_SUBSET_COMPLETE',ids:rows.map(r=>r.id),pendingIds:Object.keys(TARGETS).map(Number).filter(id=>!rows.some(r=>r.id===id)),rows,reports:reports.map(({file})=>({file,sha256:digest(fs.readFileSync(file))})),naturalClock:true,dualViewport:true,playerSaveTouched:false,humanBlindTested:false,published:false};
const output=OUTPUT+'/formal-verified-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,status:report.status,ids:report.ids,pendingIds:report.pendingIds}));
