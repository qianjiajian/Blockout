import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
assert(verifyRulesLock().ok);
const root='deliverables/repair78-lift-20260927';
const file=process.argv[2]??root+'/design/candidate-3-1790517136074.json';
const candidate=JSON.parse(fs.readFileSync(file)),level=candidate.level;
// Read the established proposal domain without modifying its evidence copy.
// Restrict reveal count to all 13 exterior removals; any reveal in a held
// gesture retains its lower reveal count and is rejected even if it exits later.
const original=fs.readFileSync('deliverables/resolve78-20260927/search/spatial-search.mjs','utf8');
const marker='transitions++;const cost=n.cost+k;';assert(original.includes(marker));
const source=original.replace("'../../../tools/revised-preview-validation-v160.mjs'","'../revised-preview-validation-v160.mjs'")
 .replace(marker,'transitions++;if(raw[c.N]!==NONE&&raw[c.N]<13)return;const cost=n.cost+k;');
const domainPath='tools/repair78-lift-20260927/late-domain.mjs';
if(!fs.existsSync(domainPath))fs.writeFileSync(domainPath,source,{flag:'wx'});else assert.equal(fs.readFileSync(domainPath,'utf8'),source);
const domain=await import('./late-domain.mjs');
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {resolveMatchingGatePortal,exitFrontierFacesBoundary} from './src/core/blockExitFrontier.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const options={floor:35,maxStates:1000000,maxMilliseconds:15000,maxTransitions:15000000,orderSeed:Number(process.argv[3]??0),prove:false,normalize:true};
const search=domain.searchSpatial(level,api,options),replay=search.drags?api.replayRevisedRoute(level,search.drags):null;
let firstReveal=null;
if(replay?.valid){const model=new api.PuzzleModel(level);let event=0;for(const[index,d]of search.drags.entries()){
 model.beginAction();for(const p of d.path){assert(model.moveBlockStep(d.blockId,...p));event++;capture(index+1,'move',model);}
 if(d.exitSide){assert(model.tryExit(d.blockId,d.exitSide).ok);event++;capture(index+1,'clear',model);}assert(model.commitAction());
 }function capture(drag,kind,model){const s=model.snapshot();if(!firstReveal&&s.shutters[0].revealed)firstReveal={drag,kind,event,cleared:s.cleared,remainingExternalIds:s.blocks.filter(b=>!b.shutterId).map(b=>b.id),ice:s.blocks.filter(b=>b.frozen).map(b=>[b.id,b.frozen])};}
 assert(firstReveal);assert.deepEqual(firstReveal.remainingExternalIds,[]);assert.equal(firstReveal.cleared,13);
}
const output=root+`/late-search-${Date.now()}.json`;
fs.writeFileSync(output,JSON.stringify({ruleVersion:'1.104.0',level,levelSha256:digest(level),candidateFile:file,domainSha256:digest(source),options,search,replay,drags:search.drags??[],firstReveal,valid:replay?.valid&&replay.complete&&firstReveal?.cleared===13},null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify({output,status:search.status,termination:search.termination,states:search.discoveredStates,drags:search.drags?.length,replay:replay?{...replay,finalStateKey:undefined}:null,firstReveal}));
