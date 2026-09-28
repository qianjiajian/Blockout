import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {checkSymmetryGeneratorFloor} from './validation-symmetry-floor.mjs';
import {checkAutomaticGeneratorFloor} from './validation-generator-domain.mjs';
import {verifyGeneratorRoute} from './validation-route.mjs';
const file=process.argv[2],ms=Number(process.argv[3]??10000),maxStates=Number(process.argv[4]??750000),formal=process.argv.includes('--formal');
assert(file);assert(ms>0&&ms<=60000);const lock=verifyRulesLock();assert(lock.ok);assert(['1.91.0','1.92.0','1.93.0','1.94.0','1.95.0'].includes(lock.activeVersion));
const root='deliverables/lv70-remake-20260927',qualificationPath=process.argv[5]??root+'/'+fs.readdirSync(root).filter(p=>/^validation-qualification-\d+\.json$/.test(p)).sort().at(-1),qualification=JSON.parse(fs.readFileSync(qualificationPath));
const sha=b=>createHash('sha256').update(b).digest('hex');assert.equal(qualification.status,'PASS');assert(qualification.bindings['tools/lv70-remake-20260927/validation-symmetry-floor.mjs']);
for(const [p,h]of Object.entries(qualification.bindings))assert.equal(sha(fs.readFileSync(p)),h,'Qualification binding '+p);
const binding={...qualification.bindings,[qualificationPath]:sha(fs.readFileSync(qualificationPath)),[file]:sha(fs.readFileSync(file)),['tools/lv70-remake-20260927/validation-symmetry-screen.mjs']:sha(fs.readFileSync('tools/lv70-remake-20260927/validation-symmetry-screen.mjs'))};
const built=await build({stdin:{resolveDir:process.cwd(),contents:(formal?"export {LEVELS,LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE} from './src/core/levels.ts'; ":'')+"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts'; export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';"},bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
for(const p of Object.keys(built.metafile.inputs).filter(p=>p!=='<stdin>')){assert(binding[p],'Model dependency was qualification-bound '+p);assert.equal(binding[p],sha(fs.readFileSync(p)));}
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64')),data=JSON.parse(fs.readFileSync(file));let level=data.level;
if(formal){assert.deepEqual(JSON.parse(JSON.stringify(api.LEVELS[69])),data.level);level=api.LEVELS[69];assert.equal(level.id,70);for(let i=0;i<200;i++)if(i!==69)assert.equal(api.LEVELS[i],api.LEVELS_BEFORE_LEVEL70_GENERATOR_REMAKE[i],'Other199 exact production object identity');}
const witness=api.replayRevisedRoute(level,data.drags);assert(witness.valid&&witness.complete);
const routeProjection=verifyGeneratorRoute(level,data.drags,api),raw=process.argv.includes('--raw');
const floor=(raw?checkAutomaticGeneratorFloor:checkSymmetryGeneratorFloor)(level,api,{floor:11,maxStates,maxMilliseconds:ms}),shortcutReplay=floor.drags?api.replayRevisedRoute(level,floor.drags):null;
const drift=Object.entries(binding).filter(([p,h])=>sha(fs.readFileSync(p))!==h);
const report={createdAt:new Date().toISOString(),status:drift.length?'SOURCE_DRIFT':floor.thresholdProven?'FLOOR_PASS':shortcutReplay?.valid&&shortcutReplay?.complete?'REAL_SHORTCUT':'UNVERIFIED',activeRule:lock.activeVersion,candidate:file,qualificationPath,formalSourceObjectUsed:formal,other199ProductionIdentityPreserved:formal,levelSha256:sha(JSON.stringify(level)),routeSha256:sha(JSON.stringify(data.drags)),witness,routeProjection,quotientUsed:!raw,requestedFloor:11,floor,shortcutReplay,bindings:binding,sourceDrift:drift,mechanismDifficultyApproved:false,pointerValidated:false,playerSaveTouched:false};
const output=`${root}/validation-${formal?'formal-':''}${raw?'raw-floor':'symmetry'}-screen-${Date.now()}.json`;fs.writeFileSync(output,JSON.stringify(report,null,2),{flag:'wx'});
console.log(JSON.stringify({output,status:report.status,witnessU:witness.nonClearingDrags,floor:{status:floor.status,states:floor.states,explored:floor.explored,transitions:floor.transitions,ms:floor.ms,groups:floor.groups,shortcut:floor.relaxedNonClearingDrags},shortcutReplay:shortcutReplay&&{valid:shortcutReplay.valid,complete:shortcutReplay.complete,U:shortcutReplay.nonClearingDrags},drift}));
