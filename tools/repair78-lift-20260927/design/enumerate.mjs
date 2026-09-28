import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../../verify-rules-lock.mjs';
import {searchSpatial,compileSpatial,NONE} from './spatial-search.mjs';
const ROOT='deliverables/repair78-lift-20260927/design',BEFORE='deliverables/repair78-lift-20260927/before.json';
const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.104.0');
const built=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts';export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts';export {resolveMatchingGatePortal,exitFrontierFacesBoundary} from './src/core/blockExitFrontier.ts';export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts';"},bundle:true,write:false,platform:'node',format:'esm',metafile:true,logLevel:'silent'});
const api=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const before=JSON.parse(fs.readFileSync(BEFORE)),level=api.LEVELS[77];assert.deepEqual(level,before.priorLevels[77]);assert.equal(digest(level),'3286acfbbc7d772e838400a9af8b121cbacbd5ee42481cdccbeaabe5039c6fc7');
const prefixFile='deliverables/diagnose78-lift-20260927/reproduction.json',prefix=JSON.parse(fs.readFileSync(prefixFile)).drags.slice(0,28);
const bindings=Object.fromEntries([...Object.keys(built.metafile.inputs).filter(p=>fs.existsSync(p)),BEFORE,prefixFile,'tools/repair78-lift-20260927/design/spatial-search.mjs','tools/repair78-lift-20260927/design/enumerate.mjs','docs/rules/manifest.json','docs/rules/mechanism-rules-v1.104.0.md'].map(p=>[p,digest(fs.readFileSync(p))]));
const hidden=level.blocks.filter(b=>b.shutterId),poses=hidden.map(b=>{const r=[];for(let y=0;y<3;y++)for(let x=0;x<5;x++){const cells=b.shape.map(([dx,dy])=>[x+dx,y+dy]);if(cells.some(([xx,yy])=>xx>=5||yy>=3))continue;r.push({x,y:y+3,mask:cells.reduce((m,[xx,yy])=>m|(1<<(yy*5+xx)),0)});}return r;});
const tilings=[];
function enumerate(mask,used,placed){if(mask===32767){tilings.push(placed);return;}const first=Array.from({length:15},(_,i)=>i).find(i=>!(mask&(1<<i)));for(let i=0;i<hidden.length;i++)if(!(used&(1<<i)))for(const p of poses[i])if((p.mask&(1<<first))&&!(p.mask&mask))enumerate(mask|p.mask,used|(1<<i),{...placed,[hidden[i].id]:{x:p.x,y:p.y}});}
enumerate(0,0,{});tilings.sort((a,b)=>hidden.filter(h=>h.x!==a[h.id].x||h.y!==a[h.id].y).length-hidden.filter(h=>h.x!==b[h.id].x||h.y!==b[h.id].y).length);
const rows=[],found=[];const session=Date.now();console.log(JSON.stringify({totalTilings:tilings.length}));
for(const [index,placements]of tilings.entries()){
 const candidate=structuredClone(level);for(const b of candidate.blocks)if(b.shutterId)Object.assign(b,placements[b.id]);
 const changes=hidden.filter(b=>b.x!==placements[b.id].x||b.y!==placements[b.id].y).map(b=>({id:b.id,from:[b.x,b.y],to:[placements[b.id].x,placements[b.id].y]}));
 const late=api.replayRevisedRoute(candidate,prefix);assert(late.valid&&!late.complete);const snapshot=JSON.parse(late.finalStateKey);assert.equal(snapshot.cleared,13);assert.equal(snapshot.blocks.length,6);assert(snapshot.blocks.every(b=>b.shutterId));assert(snapshot.blocks.filter(b=>b.frozen>0).every(b=>b.frozen===2));
 const c=compileSpatial(candidate,api),state=Uint16Array.from([...c.blocks.map(b=>{const a=snapshot.blocks.find(a=>a.id===b.id);return a?a.y*c.W+a.x|((b.layers.length-a.layers.length)<<7):NONE;}),...c.covers.map(()=>13)]);
 const lateOptions={floor:5,maxStates:30000,maxTransitions:1000000,maxMilliseconds:300,normalize:true,initialState:state};
 const lateSearch=searchSpatial(candidate,api,lateOptions),row={index,changes,levelSha256:digest(candidate),lateStatus:lateSearch.status,lateCost:lateSearch.cost,lateStates:lateSearch.discoveredStates};rows.push(row);
 if(lateSearch.status!=='witness')continue;
 const lateDrags=[...prefix,...lateSearch.drags],lateReplay=api.replayRevisedRoute(candidate,lateDrags);if(!lateReplay.valid||!lateReplay.complete){row.rejected=lateReplay;continue;}
 const options={floor:19,maxStates:300000,maxTransitions:5000000,maxMilliseconds:2000,normalize:true};const search=searchSpatial(candidate,api,options),replay=search.drags?api.replayRevisedRoute(candidate,search.drags):null;row.fullStatus=search.status;row.fullCost=search.cost;row.fullReplay=replay?{...replay,finalStateKey:undefined}:null;
 if(!replay?.valid||!replay?.complete||replay.nonClearingDrags<16)continue;
 const result={id:78,createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,index,status:'CANDIDATE_SPATIAL_WITNESSES_ONLY',level:candidate,levelSha256:digest(candidate),bindings,changes,drags:search.drags,routeSha256:digest(search.drags),replay,search,searchOptions:options,lateDrags,lateRouteSha256:digest(lateDrags),lateReplay,lateSearch:{...lateSearch,initialState:undefined},lateSearchOptions:{...lateOptions,initialState:[...state]},lateSearchNote:'Graph search uses stricter isolated ice3 after zero external clears; the reachable prefix reveals while last opening block exits and thus has ice2. Proposed suffix must canonical replay from the actual formal initial state.',prefixEvidence:{file:prefixFile,sha256:bindings[prefixFile],usedDrags:28},lowerBoundCertified:false,allHiddenOrdersCertified:false,pointerValidated:false,timeValidated:false};
 const file=`${ROOT}/candidate-${index}-${Date.now()}.json`;fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n',{flag:'wx'});found.push({index,file,levelSha256:result.levelSha256,drags:result.drags.length,U:replay.nonClearingDrags,lateDrags:lateDrags.length,lateU:lateReplay.nonClearingDrags,changed:changes.length});console.log(JSON.stringify(found.at(-1)));
 if(found.length>=8)break;
}
for(const[p,h]of Object.entries(bindings))assert.equal(digest(fs.readFileSync(p)),h);
const output=`${ROOT}/enumeration-${session}.json`;fs.writeFileSync(output,JSON.stringify({createdAt:new Date().toISOString(),ruleVersion:lock.activeVersion,totalTilings:tilings.length,tried:rows.length,rows,found,bindings,allTilingSearchExhausted:rows.length===tilings.length},null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,totalTilings:tilings.length,tried:rows.length,found:found.length}));
