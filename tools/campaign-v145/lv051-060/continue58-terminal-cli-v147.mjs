import fs from 'node:fs';
import {serialize,deserialize} from 'node:v8';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {projectImmediateRoute} from './immediate-generator-floor56-v146.mjs';
import {continueTerminalFloor} from './continuable-terminal58-v147.mjs';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.47.0');
const [file,priorFile]=process.argv.slice(2),d=JSON.parse(fs.readFileSync(file));assert.equal(d.level.id,58);
const dir='deliverables/remake31-200-v145-20260924/batches/lv051-060/root58',stamp=Date.now();
const compiled=await build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';"},bundle:true,write:false,metafile:true,platform:'node',format:'esm',logLevel:'silent'});
const meta=await build({entryPoints:[import.meta.filename],bundle:true,write:false,metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
const refs=[...new Set([...Object.keys(compiled.metafile.inputs),...Object.keys(meta.metafile.inputs),file,d.sourceReview,'docs/rules/manifest.json','docs/mechanism-rules-v1.47.0.md','tests/campaign-v145/lv051-060/terminal-normalized-floor58-v147.test.mjs','tests/campaign-v145/lv051-060/continuable-terminal58-v147.test.mjs'].filter(p=>p!=='<stdin>'))];
const bindings=Object.fromEntries(refs.map(p=>[p,digest(fs.readFileSync(p))])),fingerprint=digest({bindings,coreBundleSha256:digest(compiled.outputFiles[0].text)});
const coreSnapshot=`${dir}/continued-core-${stamp}.mjs`;fs.writeFileSync(coreSnapshot,compiled.outputFiles[0].text,{flag:'wx'});bindings[coreSnapshot]=digest(fs.readFileSync(coreSnapshot));
const api=await import(pathToFileURL(fs.realpathSync(coreSnapshot)).href),replay=api.replayRevisedRoute(d.level,d.drags);assert(replay.valid&&replay.complete);const projection=projectImmediateRoute(d.level,d.drags,api);
let saved,prior=null;if(priorFile){prior=JSON.parse(fs.readFileSync(priorFile));assert.equal(prior.fingerprint,fingerprint);assert.equal(prior.levelSha256,digest(d.level));assert.equal(prior.routeSha256,digest(d.drags));assert.equal(prior.proof.status,'unknown');assert.deepEqual(prior.drift,[]);assert(prior.checkpoint);const bytes=fs.readFileSync(prior.checkpoint.file);assert.equal(digest(bytes),prior.checkpoint.sha256);saved=deserialize(bytes);}
const options={floor:11,maxStates:Number(process.env.MAX_STATES??3000000),maxMilliseconds:Number(process.env.PROOF_MS??600000),weight:1000};
const input={candidate:file,levelSha256:digest(d.level),routeSha256:digest(d.drags),options,fingerprint,bindings,ruleVersion:lock.activeVersion,coreSnapshot,priorProof:priorFile??null};
fs.writeFileSync(`${dir}/continued-inputs-${stamp}.json`,JSON.stringify(input,null,2)+'\n',{flag:'wx'});
const run=continueTerminalFloor(d.level,api,{...options,onProgress:r=>console.log(JSON.stringify({progress:true,states:r.discoveredStates,explored:r.exploredStates,pending:r.pending,elapsed:r.elapsedMilliseconds}))},saved);
const proof=run.result,shortcutReplay=proof.relaxedRoute?api.replayRevisedRoute(d.level,proof.relaxedRoute):null;let checkpoint=null;
if(run.checkpoint){const file=`${dir}/terminal-frontier-${stamp}.bin`,bytes=serialize(run.checkpoint);fs.writeFileSync(file,bytes,{flag:'wx'});checkpoint={file,sha256:digest(bytes),bytes:bytes.length};}
const drift=Object.entries(bindings).filter(([p,h])=>digest(fs.readFileSync(p))!==h),out=`${dir}/continued-proof-${stamp}.json`;
fs.writeFileSync(out,JSON.stringify({...input,checkedAt:new Date().toISOString(),proof,checkpoint,replay,projection,shortcutReplay,drift,pointerValidated:false,formalAdopted:false},null,2)+'\n',{flag:'wx'});assert.deepEqual(drift,[]);console.log(JSON.stringify({out,status:proof.status,states:proof.discoveredStates,checkpoint,shortcut:shortcutReplay?.valid&&shortcutReplay.complete?shortcutReplay.nonClearingDrags:null}));
