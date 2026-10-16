import fs from 'node:fs';
import {build} from 'esbuild';
import {loadSpatialApi,searchSpatial} from '../remake201to210-v123-floor.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {auditHiddenCoverage} from '../revised-hidden-coverage.mjs';
import {adjacency,OUT} from './design212.mjs';
const sourceFile=`${OUT}/source213/candidate213-213807.json`,base=JSON.parse(fs.readFileSync(sourceFile));
const api=await loadSpatialApi();const bundle=await build({stdin:{resolveDir:process.cwd(),contents:`export{replayRevisedRoute}from'./src/core/revisedLevelSearch.ts';export{auditRevisedMechanismContract}from'./src/core/revisedMechanismContract.ts';`},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});const core=await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const changes=[['swap-upper-blues'],['split-orange'],['swap-upper-blues','split-orange'],['upper-fill'],['lower-fill'],['swap-upper-blues','upper-fill'],['split-orange','upper-fill'],['swap-upper-blues','split-orange','lower-fill']];
const history=[];
for(const[index,change]of changes.entries()){
 const level=structuredClone(base.level);const paint=(id,color)=>{level.blocks.find(b=>b.id===`l213-${id}`).color=color;};
 if(change.includes('swap-upper-blues')){paint('upper-g','blue');paint('upper-b','cyan');}
 if(change.includes('upper-fill')){paint('upper-fill-3','green');paint('upper-fill-5','yellow');}
 if(change.includes('lower-fill')){paint('lower-fill-5','red');paint('lower-fill-3','yellow');paint('lower-fill-4','green');}
 if(change.includes('split-orange')){level.blocks=level.blocks.filter(b=>b.id!=='l213-orange-tall');['blue','red','green'].forEach((color,i)=>level.blocks.push({id:`l213-orange-split-${i}`,x:4,y:9+i,shape:[[0,0]],color}));}
 level.mechanismAdaptation.change+=`；针对U17失败路线的有限新结构分支${index}：${change.join('+')}；机关实例、计数、7冰5/1冰1、两壳及两隐藏批次保留。`;
 const audit={opening:auditOpeningCoverage(new api.PuzzleModel(level).snapshot()),hidden:auditHiddenCoverage(level),upperAdjacency:adjacency(level.blocks.filter(b=>b.shutterId==='l213-upper')),openingAdjacency:adjacency(level.blocks.filter(b=>!b.shutterId)),liftAdjacency:adjacency(level.blocks.filter(b=>b.shutterId==='l213-lift')),nativeQ0:level.blocks.every(b=>api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns===0),mechanismIssues:core.auditRevisedMechanismContract(level)};
 const passed=audit.opening.passed&&audit.hidden.passed&&audit.nativeQ0&&!audit.upperAdjacency.length&&!audit.openingAdjacency.length&&!audit.liftAdjacency.length&&!audit.mechanismIssues.length;
 const packet={level,levelSha256:digest(level),audit,change,parentSource:{file:sourceFile,levelSha256:base.levelSha256,U:17},formalAdopted:false};
 if(passed){packet.search=searchSpatial(level,api,{floor:Infinity,normalize:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000,diagnosticTrace:true,orderSeed:index});if(packet.search.status==='witness'){packet.replay=core.replayRevisedRoute(level,packet.search.drags);if(packet.replay.valid&&packet.replay.complete&&packet.replay.nonClearingDrags>=11&&packet.replay.nonClearingDrags<=15)packet.lowerBound=searchSpatial(level,api,{floor:11,prove:true,maxMilliseconds:4000,maxStates:80000,maxTransitions:1000000});}}
 const row={index,change,levelSha256:packet.levelSha256,structurePassed:passed,searchStatus:packet.search?.status,U:packet.replay?.nonClearingDrags,complete:packet.replay?.complete,lowerBoundStatus:packet.lowerBound?.status,maxClearsSeen:packet.search?.maxClearsSeen};history.push(row);
 const file=`${OUT}/source213/mutation213-${index}.json`;if(fs.existsSync(file))throw Error('Evidence exists; do not overwrite');fs.writeFileSync(file,JSON.stringify(packet,null,2));console.log(JSON.stringify(row));
}
fs.writeFileSync(`${OUT}/source213/mutation-history213.json`,JSON.stringify({maxAttempts:8,millisecondsPerNewFingerprint:4000,sourceFile,history},null,2));
