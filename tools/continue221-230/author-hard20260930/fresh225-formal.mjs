import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build,version as esbuildVersion} from 'esbuild';
import {searchSpatial} from '../../remake111to120-spatial-floor-v147.mjs';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
const lock=verifyRulesLock();assert(lock.ok&&lock.activeVersion==='1.127.0');
const root='deliverables/continue221-230-20260930',hash=b=>createHash('sha256').update(b).digest('hex');
const packet=JSON.parse(fs.readFileSync(root+'/qualified225-source-mask.json'));
const [formalBuild,apiBuild,solverBuild]=await Promise.all([
 build({stdin:{resolveDir:process.cwd(),contents:"export {FORMAL_221_230_LEVELS} from './src/core/formal221to230Data';"},bundle:true,platform:'node',format:'esm',write:false,metafile:true,logLevel:'silent'}),
 build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {resolveMatchingGatePortal,exitFrontierFacesBoundary} from './src/core/blockExitFrontier.ts';export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts';"},bundle:true,platform:'node',format:'esm',write:false,metafile:true,logLevel:'silent'}),
 build({entryPoints:['tools/remake111to120-spatial-floor-v147.mjs'],packages:'external',bundle:true,platform:'node',format:'esm',write:false,metafile:true,logLevel:'silent'})
]);
const imported=async result=>await import('data:text/javascript;base64,'+Buffer.from(result.outputFiles[0].text).toString('base64'));
const {FORMAL_221_230_LEVELS}=await imported(formalBuild),api=await imported(apiBuild),level=FORMAL_221_230_LEVELS.find(l=>l.id===225);assert.deepEqual(level,packet.level);
const projection={...structuredClone(level),mechanismRules:'revised-2026-09-23-v1.4',flipDoors:[],gates:[...level.gates,...level.flipDoors.map(({initiallyOpen,...g})=>g)]};assert.deepEqual(projection,packet.proofQualification.projection);
const dependencies=[...new Set([...Object.keys(solverBuild.metafile.inputs),...Object.keys(apiBuild.metafile.inputs)])].filter(f=>f!=='<stdin>').sort().map(file=>({file,sha256:hash(fs.readFileSync(file))}));
const budget={floor:5,prove:true,maxMilliseconds:2000,maxStates:50000,maxTransitions:1500000};
const proof=searchSpatial(projection,api,budget);
assert(proof.thresholdProven&&proof.floor===5&&proof.termination==='below-threshold-exhausted');
for(const d of dependencies)assert.equal(hash(fs.readFileSync(d.file)),d.sha256,'Solver dependency changed during proof');
const result={createdAt:new Date().toISOString(),activeRule:lock.activeVersion,passed:true,formalLevelId:225,formalLevelFile:'src/core/formal221to230Data.ts',formalRegistrySha256:hash(fs.readFileSync('src/core/formal221to230Data.ts')),levelSha256:digest(level),routeSha256:digest(packet.drags),projectionSha256:digest(projection),level,projection,budget,proof,solver:{file:'tools/remake111to120-spatial-floor-v147.mjs',sha256:hash(fs.readFileSync('tools/remake111to120-spatial-floor-v147.mjs')),dependencies,dependencySetSha256:digest(dependencies),apiBundleSha256:hash(apiBuild.outputFiles[0].contents),nodeVersion:process.version,esbuildVersion},rationale:packet.proofQualification.rationale,scope:'One fixed-budget fresh L5 proof on the final formal225 object and identical always-open flip relaxation; supplements old proof missing its own historical solver hash. No failed budget enlargement.',newFormalPointerStillRequired:true,releaseApproved:false};
const file=root+'/formal-adoption/fresh225-floor.json';fs.mkdirSync(root+'/formal-adoption',{recursive:true});fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,passed:true,L:5,states:proof.exploredStates,milliseconds:proof.elapsedMilliseconds,dependencies:dependencies.length}));
