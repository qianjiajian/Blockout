import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {levelSha256} from '../formal-v2/contract.mjs';
import {assertV4Runtime} from './runtime.mjs';

const sha=b=>createHash('sha256').update(b).digest('hex');
const bytes=p=>fs.readFileSync(p);
const equalPath=(a,b)=>path.resolve(a).toLowerCase()===path.resolve(b).toLowerCase();

/** This new driver uses an actual historical source checkout, never a fake
 * hash allowance for current UI. Both workspaces must still share active 156. */
export function prefixExecutionEnvironment(runtime,descriptor){
 assertV4Runtime(runtime);
 const file=descriptor?.path??path.resolve('snapshot-environment.json'),raw=bytes(file);
 if(descriptor)assert.equal(sha(raw),descriptor.sha256,'Execution environment descriptor changed');
 const environment=JSON.parse(raw);
 assert.equal(environment.status,'EXPLICIT_HISTORICAL_MATH_WORKSPACE');
 assert(equalPath(environment.workspace,process.cwd()),'Execute from the actual historical workspace');
 assert.equal(environment.frozenMath,runtime.toolchainSha256);
 assert.equal(environment.currentRuntimeValidationClaimed,false);
 const rootManifest=path.join(environment.sourceWorkspace,'docs/rules/manifest.json');
 const localManifest=path.resolve('docs/rules/manifest.json');
 assert.equal(sha(bytes(rootManifest)),sha(bytes(localManifest)),'Current root and historical workspace rule manifests diverged');
 const manifest=JSON.parse(bytes(rootManifest));assert.equal(manifest.activeVersion,'1.156.0');
 const policy=manifest.versions.find(x=>x.version===manifest.activeVersion);assert.equal(policy.sha256,runtime.policyRuleSha256);
 const rootPolicy=path.join(environment.sourceWorkspace,policy.document),localPolicy=path.resolve(policy.document);
 assert.equal(sha(bytes(rootPolicy)),sha(bytes(localPolicy)),'Current root and historical policy bytes differ');
 const ui=path.resolve('src/game/ColorEscapeGame.ts');
 assert.equal(sha(bytes(ui)),environment.historicalUI.sha256,'Actual historical UI bytes required');
 return{descriptor:{path:path.resolve(file),sha256:sha(raw)},executionWorkspace:path.resolve('.'),
  sourceWorkspace:environment.sourceWorkspace,mathematicalToolchainSha256:runtime.toolchainSha256,
  currentRuntimeValidationClaimed:false,bindings:{[path.resolve(file)]:sha(raw),[rootManifest]:sha(bytes(rootManifest)),
   [localManifest]:sha(bytes(localManifest)),[rootPolicy]:sha(bytes(rootPolicy)),[localPolicy]:sha(bytes(localPolicy)),[ui]:sha(bytes(ui))}};
}

/** Build actual current mainline data, then compare the complete source object.
 * No game/model search or current-UI compatibility claim is made here. */
export async function currentMainlineSourceBinding(runtime,environment,sourceLevelId,{qualificationOnly=false}={}){
 if(qualificationOnly)return{qualificationOnly:true,sourceObjectComparison:'synthetic-fixture-no-mainline-claim',bindings:{}};
 const source=runtime.LEVELS.find(l=>l.id===sourceLevelId);assert(source,'Actual normal mainline source required');
 const compiled=await build({absWorkingDir:environment.sourceWorkspace,entryPoints:['src/core/levels.ts'],bundle:true,write:false,
  metafile:true,platform:'node',format:'esm',packages:'external',logLevel:'silent'});
 const module=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
 const current=module.LEVELS.find(l=>l.id===sourceLevelId);assert(current,'Actual current source missing');
 assert.equal(levelSha256(current),levelSha256(source),'Current and historical mainline source complete objects differ');
 const bindings={};for(const file of Object.keys(compiled.metafile.inputs)){
  const absolute=path.resolve(environment.sourceWorkspace,file);bindings[absolute]=sha(bytes(absolute));}
 return{sourceLevelId,sourceLevelSha256:levelSha256(source),currentSourceLevelSha256:levelSha256(current),
  completeSourceObjectsEqual:true,currentRuntimeValidationClaimed:false,bindings};
}
