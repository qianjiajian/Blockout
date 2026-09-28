import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { build } from 'esbuild';
import { checkFastFloor } from './level21-reposition-floor.mjs';
import { verifyRulesLock } from './verify-rules-lock.mjs';

// Historical v1.15-stage verifier. The later v1.20 whole-batch remake has its
// own final-LEVELS verifier; this tool must not certify the replacement Lv21.

const rules = verifyRulesLock(); assert(rules.ok);
const manifest = JSON.parse(fs.readFileSync('docs/rules/manifest.json','utf8'));
const activeDocument = manifest.versions.find(version => version.version === manifest.activeVersion).document;
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), bindings = {};
for (const p of ['tools/level21-reposition-floor.mjs','tools/verify-level21-reposition.mjs','tests/fixtures/level21-reposition-route.json','docs/rules/manifest.json','docs/mechanism-rules-v1.15.0.md']) bindings[p] = sha(fs.readFileSync(p));
bindings[activeDocument] = sha(fs.readFileSync(activeDocument));
const compiled = await build({stdin:{resolveDir:process.cwd(),contents:`
export { LEVELS_BEFORE_MECHANISM_FOCUS_REMAKE as LEVELS, LEVELS_BEFORE_LEVEL21_REPOSITION } from './src/core/levels.ts';
export { validateLevel } from './src/core/PuzzleModel.ts';
export { replayRevisedRoute } from './src/core/revisedLevelSearch.ts';
export { auditCandidateBlockArt } from './tools/revised-candidate-block-art.mjs';
`},bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'bind',setup(b){b.onLoad({filter:/\.[jt]s$/},({path:file})=>{const contents=fs.readFileSync(file,'utf8');bindings[path.relative(process.cwd(),file)]=sha(contents);return {contents,loader:file.endsWith('.ts')?'ts':'js'};});}}]});
const api=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const level=api.LEVELS[20],before=api.LEVELS_BEFORE_LEVEL21_REPOSITION[20];
const route=JSON.parse(fs.readFileSync('tests/fixtures/level21-reposition-route.json','utf8'));
assert.equal(sha(JSON.stringify(level)),route.levelSha256);
for(const [i,item] of api.LEVELS.entries()) { api.validateLevel(item); if(i!==20)assert.deepEqual(item,api.LEVELS_BEFORE_LEVEL21_REPOSITION[i]); }
const nonBlocks=({blocks,...rest})=>rest;assert.deepEqual(nonBlocks(level),nonBlocks(before));
const art=api.auditCandidateBlockArt(level);assert(art.passed);
for(const item of art.requirements){const file=path.join('public',item.path);const bytes=fs.readFileSync(file);bindings[file]=sha(bytes);}
const replay=api.replayRevisedRoute(level,route.drags);assert(replay.valid&&replay.complete);assert.equal(replay.nonClearingDrags,18);
const lowerBound=checkFastFloor(level,{floor:18,maxStates:200000,maxMilliseconds:30000});assert(lowerBound.thresholdProven);
assert.equal(checkFastFloor(level,{maxStates:1}).status,'unknown');
const baseline=checkFastFloor(before,{floor:1,maxStates:10000,maxMilliseconds:5000});assert.equal(baseline.status,'relaxed-shortcut');assert.equal(baseline.relaxedNonClearingDrags,0);
const drift=Object.entries(bindings).filter(([file,hash])=>sha(fs.readFileSync(file))!==hash);assert.equal(drift.length,0);
const output=path.resolve('deliverables/level21-floor18-2026-09-23');fs.mkdirSync(output,{recursive:true});
const report={status:'PASS',verificationScope:'historical v1.15 stage before the v1.20 batch remake',currentFormalLevelValidated:false,activeRules:rules.activeVersion,levelSha256:route.levelSha256,level,route:route.drags,replay,lowerBound,exactNecessaryRepositions:18,onlyBlocksChanged:true,other199Unchanged:true,artRequirements:art.requirements.length,bindings,drift,pointerReplayValidated:false,timeValidated:false,releaseApproved:false};
const file=path.join(output,`verification-${Date.now()}.json`);fs.writeFileSync(file,JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({file,status:report.status,levelSha256:route.levelSha256,lowerBound,replay:{...replay,finalStateKey:undefined}},null,2));
