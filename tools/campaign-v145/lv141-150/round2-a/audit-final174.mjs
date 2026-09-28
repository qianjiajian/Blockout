import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadApi,ruleGate} from '../../../remake141to150-v173.mjs';
import {verifyAcceptedSourceDesign} from '../../../remake141to150-source-acceptance-v174.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';

const ROOT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-root';
const OUT='deliverables/remake31-200-v145-20260924/batches/lv141-150/round2-a';
const read=p=>JSON.parse(fs.readFileSync(p));
const lock=ruleGate();assert.equal(lock.activeVersion,'1.74.0');
const watched=['src/core/remake141to150.ts','src/core/levels.ts','src/core/types.ts','src/game/formalBlockShapes.ts','src/game/ColorEscapeGame.ts','tests/fixtures/remake141to150-v173.json'];
const before=Object.fromEntries(watched.map(p=>[p,digest(fs.readFileSync(p))]));
const installedFile=ROOT+'/installed-1790481976833.json',installed=read(installedFile);
assert.deepEqual(installed.ids,[144,150]);assert.equal(installed.activeRuleVersion,'1.74.0');assert.equal(installed.playerSaveTouched,false);assert.equal(installed.released,false);
assert.equal(digest(installed.campaignBefore),installed.campaignBeforeSha256);
const module=fs.readFileSync('src/core/remake141to150.ts','utf8');
const declaredIds=JSON.parse(module.match(/REMADE_141_150_IDS: readonly number\[\] = (\[[^;]+\]);/)[1]);
const moduleObjects=JSON.parse(module.match(/const reviewed: Record<number,LevelSpec> = ([\s\S]+);\s*export const applyRemake141to150/)[1]);
const ids=Array.from({length:10},(_,i)=>i+141),fixture=read('tests/fixtures/remake141to150-v173.json');
assert.deepEqual(declaredIds,ids);assert.deepEqual(Object.keys(moduleObjects).map(Number),ids);assert.deepEqual(fixture.rows.map(r=>r.id),ids);
const {api}=await loadApi();assert.equal(api.LEVELS.length,200);assert.deepEqual(api.LEVELS.map(l=>l.id),Array.from({length:200},(_,i)=>i+1));
const retained=[];
for(const [i,l]of api.LEVELS.entries())if(!installed.ids.includes(l.id)){assert.equal(digest(l),digest(installed.campaignBefore[i]),`Unrequested change ${l.id}`);retained.push({id:l.id,sha256:digest(l)});}
assert.equal(retained.length,198);assert.equal(digest(api.LEVELS.slice(0,30)),digest(installed.campaignBefore.slice(0,30)));assert.equal(digest(api.LEVELS),installed.campaignAfterSha256);
const rows=fixture.rows.map(f=>{
 const l=api.LEVELS[f.id-1],candidate=read(f.candidate);
 for(const comparison of [moduleObjects[f.id],f.level,candidate.level])assert.equal(digest(l),digest(comparison));assert.equal(digest(f.drags),digest(candidate.drags));
 assert(candidate.sourceReview.passed);assert(l.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0));
 const row={id:f.id,levelSha256:digest(l),routeSha256:digest(f.drags),candidate:f.candidate,candidateSha256:digest(fs.readFileSync(f.candidate)),lowerBound:f.lowerBound,upperBound:f.upperBound,productionModuleFixtureAndCandidateIdentical:true,nativeOnlyArt:true,retainedBy144150Adoption:!installed.ids.includes(f.id)};
 if(installed.ids.includes(f.id)){
  const acceptance=verifyAcceptedSourceDesign(candidate),prior=read(acceptance.priorCandidate);assert.equal(acceptance.sourceFactsStatus,'UNKNOWN');assert.equal(acceptance.sourceFactsPromotedToVerified,false);assert.equal(acceptance.status,'USER_ACCEPTED_AUTHORED_SOURCE_FIELDS');assert.deepEqual(candidate.sourceReview.unknowns,prior.sourceReview.unknowns);
  const check=installed.checked.find(x=>x.id===f.id);assert(check);assert.equal(check.levelSha256,digest(l));assert.equal(check.routeSha256,digest(f.drags));
  row.acceptance=acceptance;row.unknownSourceFields=candidate.sourceReview.unknowns;
  if(f.id===144){assert.equal(candidate.sourceReview.unknowns.length,3);for(const [frozen,color]of [[15,'red'],[18,'green'],[23,'pink']]){const g=l.gates.find(g=>g.frozen===frozen);assert.equal(g.color,color);assert.deepEqual(candidate.sourceReview.unknowns.find(u=>u.field===`frozen${frozen}.color`),{field:`frozen${frozen}.color`,source:null,design:color});}}
  else {assert.equal(candidate.sourceReview.unknowns.length,1);assert.equal(candidate.sourceReview.sourcePhaseVerified,false);const g=l.flipDoors.find(g=>g.color==='yellow');assert.equal(g.frozen,7);assert.equal(g.initiallyOpen,true);assert.equal(candidate.sourceReview.unknowns[0].field,'yellow.initiallyOpen');assert.equal(candidate.sourceReview.unknowns[0].status,'UNKNOWN_SOURCE_PHASE');}
 }
 return row;
});
const pointerFiles=['pointer-1790481997119-496x1078-17296/report.json','pointer-1790481997068-360x780-13176/report.json'];
const pointers=pointerFiles.map(p=>{
 const file=ROOT+'/'+p,r=read(file);assert.equal(r.status,'PASS');assert.equal(r.candidateOnly,false);assert.equal(r.formalDataValidated,true);assert.equal(r.naturalClock,true);assert.equal(r.clockFrozen,false);assert.equal(r.playerSaveTouched,false);assert.equal(r.releaseApproved,false);assert.deepEqual(r.rows.map(x=>x.id),[144,150]);
 const checkedBindings=[];for(const [p,h]of Object.entries(r.bindings))if(/^(src\/(?:core|game|platform)\/|public\/assets\/art\/)/.test(p)){assert.equal(digest(fs.readFileSync(p)),h,`Pointer production drift ${p}`);checkedBindings.push(p);}
 for(const [p,h]of Object.entries(r.sourceBindings))assert.equal(digest(fs.readFileSync(p)),h,`Pointer source drift ${p}`);
 for(const rr of r.rows){const f=rows.find(x=>x.id===rr.id);assert.equal(rr.status,'PASS');assert.equal(rr.levelSha256,f.levelSha256);assert.equal(rr.routeSha256,f.routeSha256);assert.equal(rr.formalObjectIdentity,true);assert.equal(rr.candidateOverlay,false);}
 return {file,sha256:digest(fs.readFileSync(file)),status:r.status,viewport:r.viewport,ids:r.rows.map(x=>x.id),currentProductionBindingsChecked:checkedBindings,sourceBindingsChecked:Object.keys(r.sourceBindings).length};
});
assert.notDeepEqual(pointers[0].viewport,pointers[1].viewport);
for(const [p,h]of Object.entries(before))assert.equal(digest(fs.readFileSync(p)),h,`Audit-time shared drift ${p}`);
const report={ruleVersion:'1.74.0',passed:true,completeTenProductionIds:ids,installedFile,installedFileSha256:digest(fs.readFileSync(installedFile)),campaignBeforeSha256:installed.campaignBeforeSha256,currentCampaignSha256:digest(api.LEVELS),unchangedOther198:retained,first30Preserved:true,first30Sha256:digest(api.LEVELS.slice(0,30)),rows,newlyAcceptedFieldsStillUnknown:4,formal144150Pointers:pointers,sharedFilesUnchangedDuringAudit:before,scope:'Read-only final production/fixture/source acceptance audit. No new solver search or Pointer input; other eight current-runtime dual-screen replays are being completed by root.',fullTenCurrentRuntimePointerValidated:false,playerSaveTouched:false,released:false,scriptSha256:digest(fs.readFileSync(new URL(import.meta.url)))};
const output=OUT+'/audit-final174-'+Date.now()+'.json';fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,passed:true,ids,unchangedOthers:retained.length,sourceUnknownFields:4,pointerIds:[144,150]}));
