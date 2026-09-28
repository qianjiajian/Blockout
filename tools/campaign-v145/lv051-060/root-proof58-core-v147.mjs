import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {checkImmediateGeneratorFloor,projectImmediateRoute} from './immediate-generator-floor56-v146.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.47.0');
const file=process.argv[2],d=JSON.parse(fs.readFileSync(file));assert.equal(d.level.id,58);
const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060/root58',stamp=Date.now();fs.mkdirSync(dir,{recursive:true});
// Only the actual puzzle and replay engine is needed. Unrelated production
// LEVELS modules are deliberately not imported into this proof runtime.
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts'; export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';"},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const snapshot=`${dir}/core-snapshot-${stamp}.mjs`;fs.writeFileSync(snapshot,compiled.outputFiles[0].text,{flag:'wx'});
const meta=await build({entryPoints:[import.meta.filename],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
const paths=[...new Set([...Object.keys(compiled.metafile.inputs),...Object.keys(meta.metafile.inputs)].filter(p=>p!=='<stdin>')),...new Set([file,d.sourceReview,snapshot,'docs/rules/manifest.json','docs/mechanism-rules-v1.47.0.md'])];
const bindings=Object.fromEntries(paths.map(p=>[p,digest(fs.readFileSync(p))]));
const api=await import(pathToFileURL(fs.realpathSync(snapshot)).href),replay=api.replayRevisedRoute(d.level,d.drags);assert(replay.valid&&replay.complete);
const projection=projectImmediateRoute(d.level,d.drags,api),options={floor:11,maxStates:Number(process.env.MAX_STATES??1500000),maxMilliseconds:Number(process.env.PROOF_MS??120000)};
const input={file,levelSha256:digest(d.level),routeSha256:digest(d.drags),options,bindings,ruleVersion:lock.activeVersion,coreSnapshot:snapshot};
fs.writeFileSync(`${dir}/inputs-core-${stamp}.json`,JSON.stringify(input,null,2)+'\n',{flag:'wx'});
const proof=checkImmediateGeneratorFloor(d.level,api,options),shortcutReplay=proof.relaxedRoute?api.replayRevisedRoute(d.level,proof.relaxedRoute):null,drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h);
const out=`${dir}/proof-core-${stamp}.json`,result={...input,checkedAt:new Date().toISOString(),proof,replay,projection,shortcutReplay,drift,pointerValidated:false,formalAdopted:false};
fs.writeFileSync(out,JSON.stringify(result,null,2)+'\n',{flag:'wx'});assert.equal(drift.length,0);
console.log(JSON.stringify({out,status:proof.status,states:proof.discoveredStates,shortcut:shortcutReplay?.valid&&shortcutReplay.complete?shortcutReplay.nonClearingDrags:null}));
