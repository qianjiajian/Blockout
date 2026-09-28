import fs from 'node:fs';
import assert from 'node:assert/strict';
import ts from 'typescript';
import {build} from 'esbuild';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {loadApi,replay} from '../../remake182-185-20260927/replay.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';

const ROOT='deliverables/star-targets182-185-20260928';
const read=p=>JSON.parse(fs.readFileSync(p));
const lock=verifyRulesLock();assert(lock.ok);assert(lock.verified.some(v=>v.version==='1.111.0'));
const before=read(ROOT+'/before.json'),applied=read(ROOT+'/applied.json');
const {api,inputs}=await loadApi();
const source=await build({stdin:{resolveDir:process.cwd(),contents:"export {evaluateLevelStars} from './src/core/levelStarConditions.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const {evaluateLevelStars}=await import('data:text/javascript;base64,'+Buffer.from(source.outputFiles[0].text).toString('base64'));
const files=[...inputs,ROOT+'/before.json',ROOT+'/applied.json','src/core/levelStarConditions.ts','tools/star-targets182-185-20260928/review/data-review.mjs'];
const bindings=Object.fromEntries(files.map(p=>[p,digest(fs.readFileSync(p))]));
assert.equal(before.levels.length,200);assert.equal(api.LEVELS.length,200);
assert.equal(digest(before.levels.map(r=>r.level)),before.campaignSha256);
for(const r of before.levels)assert.equal(digest(r.level),r.sha256);
const production=before.modulePath,raw=fs.readFileSync(production,'utf8');
const oldAst=ts.createSourceFile(production,before.moduleRaw,ts.ScriptTarget.Latest,true);
const ast=ts.createSourceFile(production,raw,ts.ScriptTarget.Latest,true);
function lookup(tree){let body;function walk(n){if(ts.isVariableDeclaration(n)&&n.name.getText(tree)==='reviewed')body=n.initializer;ts.forEachChild(n,walk);}walk(tree);assert(body);return body;}
const oldMap=lookup(oldAst),newMap=lookup(ast);
assert.deepEqual(oldMap.properties.map(p=>p.name.text),newMap.properties.map(p=>p.name.text));
const old182=oldMap.properties.find(p=>p.name.text==='182').initializer;
const new182=newMap.properties.find(p=>p.name.text==='182').initializer;
assert.equal(old182.properties.find(p=>p.name.text==='preservedMoveTarget'),undefined);
assert.equal(new182.properties.length,old182.properties.length+1);
for(let i=0;i<old182.properties.length;i++)assert.equal(old182.properties[i].getText(oldAst),new182.properties[i].getText(ast));
const added=new182.properties.at(-1);assert.equal(added.name.text,'preservedMoveTarget');assert.equal(added.initializer.text,'48');
const previous=new182.properties.at(-2),addedBytes=raw.slice(previous.end,added.end);
assert.equal(addedBytes,',\n    "preservedMoveTarget": 48');
assert.equal(raw.slice(0,previous.end)+raw.slice(added.end),before.moduleRaw,'Only score override added to production text');
assert.equal(digest(before.moduleRaw),applied.moduleBeforeSha256);assert.equal(digest(raw),applied.moduleAfterSha256);
const expected=structuredClone(before.levels.map(r=>r.level));expected[181].preservedMoveTarget=48;
assert.equal(digest(api.LEVELS),digest(expected),'Exact 200 current formal objects');
for(const r of before.levels)if(r.level.id!==182)assert.equal(digest(api.LEVELS[r.level.id-1]),r.sha256);
const srcFiles=[];function list(p){for(const e of fs.readdirSync(p,{withFileTypes:true})){const f=p+'/'+e.name;if(e.isDirectory())list(f);else srcFiles.push(f);}}list('src');
assert.deepEqual(srcFiles.sort(),Object.keys(before.src).sort(),'No added production source files');
for(const [p,s]of Object.entries(before.src)){assert.equal(digest(s.raw),s.sha256);if(p!==production)assert.equal(digest(fs.readFileSync(p)),s.sha256,'Unchanged source '+p);}
const rows=[];
for(const id of [182,185]){
 const p=ROOT+`/packets/level${id}.json`,d=read(p),old=read(before.sources[id]),count=id===182?48:50,time=id===182?97:93;
 assert.equal(digest(fs.readFileSync(before.sources[id])),before.oldEvidence[before.sources[id]]);
 assert.equal(digest(old.level),before.sourceLevelHashes[id]);assert.equal(digest(old.level),d.sourceLevelSha256);
 assert.equal(old.level.preservedMoveTarget,undefined);assert.equal(api.levelStarTargets(old.level).moveTarget,31);
 assert.equal(digest(d.level),digest({...old.level,preservedMoveTarget:count}));
 assert.equal(digest(d.level),d.levelSha256);assert.equal(digest(d.drags),d.routeSha256);assert.deepEqual(d.drags,old.drags);
 assert.deepEqual(api.levelStarTargets(d.level),{moveTarget:count,timeTargetSeconds:time});
 assert.equal(d.level.timeSeconds,id===182?135:130);assert.equal(d.level.parMoves,31);assert.equal(d.level.reward,200);
 const modelReplay=replay(d.level,d.drags,api,{complete:true,requirePointerCompatible:true});
 assert.equal(modelReplay.effectiveDrags,count);assert.equal(modelReplay.nonClearingDrags,id===182?20:19);
 const cases=[{label:'both equality inclusive',moves:count,elapsedSeconds:time,stars:3},{label:'one extra drag',moves:count+1,elapsedSeconds:time,stars:2},{label:'fraction above time rounds up',moves:count,elapsedSeconds:time+0.001,stars:2},{label:'fraction below time rounds to limit',moves:count,elapsedSeconds:time-0.001,stars:3},{label:'both fail',moves:count+1,elapsedSeconds:time+0.001,stars:1}];
 const boundaries=cases.map(c=>{const result=evaluateLevelStars(d.level,c);assert.equal(result.earnedStars,c.stars,c.label);assert.equal(result.elapsedSeconds,Math.ceil(c.elapsedSeconds));return {label:c.label,attempt:{moves:c.moves,elapsedSeconds:c.elapsedSeconds},result};});
 if(id===182){assert.equal(d.mode,'formal');assert.equal(d.sourcePhaseApprovalPending,false);assert.equal(digest(api.LEVELS[181]),digest(d.level));}
 else {assert.equal(d.mode,'candidate');assert.equal(d.sourcePhaseApprovalPending,true);assert.deepEqual(d.sourceAdaptation,old.sourceAdaptation);assert.notEqual(digest(api.LEVELS[184]),digest(d.level));assert.equal(digest(api.LEVELS[184]),before.levels[184].sha256);for(const color of ['orange','blue'])assert.equal(d.level.flipDoors.find(g=>g.color===color).initiallyOpen,false);}
 rows.push({id,packet:p,packetSha256:digest(fs.readFileSync(p)),levelSha256:digest(d.level),routeSha256:digest(d.drags),mode:d.mode,onlyChangedLevelField:'preservedMoveTarget',oldMoveTarget:31,newMoveTarget:count,timeTargetSeconds:time,modelReplay:{valid:modelReplay.valid,complete:modelReplay.complete,effectiveDrags:modelReplay.effectiveDrags,clearEvents:modelReplay.clearEvents,nonClearingDrags:modelReplay.nonClearingDrags,multiCellRepositions:modelReplay.multiCellRepositions},boundaries,sourcePhaseApprovalPending:d.sourcePhaseApprovalPending});
}
for(const [p,h]of Object.entries(before.oldEvidence))assert.equal(digest(fs.readFileSync(p)),h,'Preserved historical bytes '+p);
for(const[p,h]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(p)),h,'Concurrent source change '+p);
const result={createdAt:new Date().toISOString(),status:'PASS_SCORE_DATA_SCOPE_AND_ROUTES',activeRuleVersion:lock.activeVersion,production:{path:production,onlyChange:addedBytes,other199FormalUnchanged:true,oldFormal185Unchanged:true,allOtherSourceBytesUnchanged:true,moduleBeforeSha256:digest(before.moduleRaw),moduleAfterSha256:digest(raw)},rows,oldEvidenceCount:Object.keys(before.oldEvidence).length,oldEvidenceUnchanged:true,sourceBindings:bindings,sourceUnknownFieldsUnchanged:true,difficultyEvidenceRelabeled:false,naturalPointerReview:'PENDING_NEW_REPORTS',playerSaveTouched:false,releaseApproved:false};
const out=ROOT+'/review/data-review-'+Date.now()+'.json';fs.mkdirSync(ROOT+'/review',{recursive:true});fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({out,status:result.status,oldEvidence:result.oldEvidenceCount,boundaries:rows.reduce((s,r)=>s+r.boundaries.length,0)}));
