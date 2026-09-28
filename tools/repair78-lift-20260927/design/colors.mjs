import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {searchSpatial,compileSpatial,NONE} from './spatial-search.mjs';
const ROOT='deliverables/repair78-lift-20260927/design',lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.104.0');
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {resolveMatchingGatePortal,exitFrontierFacesBoundary} from './src/core/blockExitFrontier.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';"},bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const prefixFile='deliverables/repair78-lift-20260927/late-prefix-1790517580810.json',prefixDoc=JSON.parse(fs.readFileSync(prefixFile)),prefix=prefixDoc.drags.slice(0,37);
const bases=[ROOT+'/candidate-3-1790517136074.json',ROOT+'/candidate-5-1790517136717.json'],rows=[];
for(const baseFile of bases){
 const base=JSON.parse(fs.readFileSync(baseFile));
 for(const oldBlock of base.level.blocks.filter(b=>b.shutterId&&!b.frozen)){
  const level=structuredClone(base.level);level.blocks.find(b=>b.id===oldBlock.id).color='green';
  const prefixReplay=api.replayRevisedRoute(level,prefix);assert(prefixReplay.valid&&!prefixReplay.complete);const snapshot=JSON.parse(prefixReplay.finalStateKey);assert.equal(snapshot.cleared,13);assert(snapshot.blocks.every(b=>b.shutterId));assert(snapshot.blocks.filter(b=>b.frozen).every(b=>b.frozen===3));
  const c=compileSpatial(level,api),state=Uint16Array.from([...c.blocks.map(b=>{const a=snapshot.blocks.find(a=>a.id===b.id);return a?a.y*c.W+a.x:NONE;}),13]);
  const lateOptions={floor:8,maxStates:50000,maxMilliseconds:1000,maxTransitions:2000000,normalize:true,initialState:state},lateSearch=searchSpatial(level,api,lateOptions),lateDrags=lateSearch.drags?[...prefix,...lateSearch.drags]:[],lateReplay=lateDrags.length?api.replayRevisedRoute(level,lateDrags):null;
  const row={base:base.index,blockId:oldBlock.id,from:oldBlock.color,to:'green',lateStatus:lateSearch.status,lateU:lateSearch.cost};rows.push(row);
  if(!lateReplay?.valid||!lateReplay?.complete)continue;
  const options={floor:19,maxStates:300000,maxMilliseconds:3000,maxTransitions:6000000,normalize:true},search=searchSpatial(level,api,options),replay=search.drags?api.replayRevisedRoute(level,search.drags):null;row.fullStatus=search.status;row.U=search.cost;
  if(!replay?.valid||!replay?.complete||replay.nonClearingDrags<16)continue;
  const shortcutOptions={floor:16,maxStates:100000,maxMilliseconds:1500,maxTransitions:3000000,normalize:true},shortcut=searchSpatial(level,api,shortcutOptions),shortcutReplay=shortcut.drags?api.replayRevisedRoute(level,shortcut.drags):null;
  row.shortcutStatus=shortcut.status;row.shortcutReplay=shortcutReplay?{...shortcutReplay,finalStateKey:undefined}:undefined;
  if(shortcutReplay?.valid&&shortcutReplay?.complete)continue;
  const bindings=Object.fromEntries([...Object.keys(built.metafile.inputs).filter(p=>fs.existsSync(p)),baseFile,prefixFile,'tools/repair78-lift-20260927/design/spatial-search.mjs','tools/repair78-lift-20260927/design/colors.mjs'].map(p=>[p,digest(fs.readFileSync(p))]));
  const report={id:78,index:`${base.index}-${oldBlock.id.split('-').at(-1)}-green`,createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,level,levelSha256:digest(level),bindings,base:{file:baseFile,sha256:bindings[baseFile]},changes:base.changes,colorAdaptation:{blockId:oldBlock.id,from:oldBlock.color,to:'green',reason:'Original-shape xy-only candidates violate the retained hard lower band or late hidden self-rescue. One non-frozen hidden body changes to an existing gate color; both frozen bodies and all shape/ice/geometry/inventory remain.'},drags:search.drags,routeSha256:digest(search.drags),search,searchOptions:options,replay,lateDrags,lateRouteSha256:digest(lateDrags),lateSearch,lateSearchOptions:{...lateOptions,initialState:[...state]},lateReplay,prefixEvidence:{file:prefixFile,sha256:bindings[prefixFile],usedDrags:37,firstRevealedCleared:13,externalRemaining:[]},shortcut,shortcutReplay,shortcutOptions,lowerBoundCertified:false,allHiddenOrdersCertified:false};
  const file=`${ROOT}/candidate-color-${base.index}-${oldBlock.id.split('-').at(-1)}-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});row.file=file;console.log(JSON.stringify({file,levelSha256:report.levelSha256,drags:report.drags.length,U:replay.nonClearingDrags,lateDrags:lateDrags.length,lateU:lateSearch.cost,block:oldBlock.id,base:base.index}));
 }
}
const file=ROOT+'/colors-'+Date.now()+'.json';fs.writeFileSync(file,JSON.stringify({createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,rows},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({file,rows}));
