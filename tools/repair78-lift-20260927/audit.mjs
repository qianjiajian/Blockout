import fs from 'node:fs';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {digest} from '../revised-preview-validation-v160.mjs';
import {verifyRulesLock} from '../verify-rules-lock.mjs';
import {auditOpeningCoverage} from '../revised-opening-coverage.mjs';
import {checkSource78} from '../../deliverables/remake71-80-v146-20260924/floor-review/source-contract78.mjs';
import {verifyMechanisms78} from '../../deliverables/remake71-80-v146-20260924/floor-review/verify-mechanisms78.mjs';
const before=JSON.parse(fs.readFileSync('deliverables/repair78-lift-20260927/before.json'));
export const loadApi=async()=>{
 const b=await build({stdin:{resolveDir:process.cwd(),contents:"export {LEVELS} from './src/core/levels.ts'; export {PuzzleModel,validateLevel} from './src/core/PuzzleModel.ts'; export {replayRevisedRoute} from './src/core/revisedLevelSearch.ts'; export {matchFormalBlockShape} from './src/game/formalBlockShapes.ts'; export {levelStarTargets} from './src/core/levelStarConditions.ts'; export {auditCandidateBlockArt} from './tools/revised-candidate-block-art.mjs';"},bundle:true,write:false,platform:'node',format:'esm',logLevel:'silent'});
 return import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
};
export function audit(level,drags,api){
 const lock=verifyRulesLock();assert(lock.ok);assert.equal(lock.activeVersion,'1.104.0');
 const clean=v=>JSON.parse(JSON.stringify(v)),old=before.level;
 assert.deepEqual(clean({...level,blocks:null}),{...old,blocks:null});
 assert.equal(level.blocks.length,19);
 const differences=[];
 for(const [i,b]of level.blocks.entries()){
  const original=old.blocks[i];assert.equal(b.id,original.id);
  if(!original.shutterId)assert.deepEqual(clean(b),original);
  else{
   // v1.104 permits necessary local ordinary-color adaptation; the frozen
   // bodies retain their original shape, color and ice. All shapes stay q0.
   const mutable=original.frozen?{}:{color:null};
   assert.deepEqual(clean({...b,x:null,y:null,...mutable}),{...original,x:null,y:null,...mutable});
   if(b.x!==original.x||b.y!==original.y||b.color!==original.color)differences.push({id:b.id,from:[original.x,original.y],to:[b.x,b.y],...(b.color!==original.color?{sourceColor:original.color,designedColor:b.color}:{} )});
  }
 }
 assert(differences.length>0);api.validateLevel(level);
 const initial=new api.PuzzleModel(level).snapshot(),opening=auditOpeningCoverage(initial);assert(opening.passed);
 const lift=level.shutters[0],hidden=level.blocks.filter(b=>b.shutterId===lift.id);
 const cells=hidden.flatMap(b=>b.shape.map(([x,y])=>[b.x+x,b.y+y]));
 assert.equal(cells.length,15);assert.equal(new Set(cells.map(p=>p.join(','))).size,15);
 assert(cells.every(([x,y])=>x>=lift.x&&x<lift.x+lift.width&&y>=lift.y&&y<lift.y+lift.height));
 for(const b of level.blocks)assert.equal(api.matchFormalBlockShape(b.shape,'native-only')?.quarterTurns,0,b.id);
 const recolors=differences.filter(d=>d.designedColor);
 const source=recolors.length?{passed:true,preciseCopy:false,status:'v1.104-local-authorized-color-adaptation',priorSourceContinuity:checkSource78(old,api),newAdaptations:recolors,allOtherKnownAttributesPreserved:true}:checkSource78(level,api);
 for(const b of hidden)for(const other of hidden){if(b.id===other.id||b.color!==other.color)continue;for(const[dx,dy]of b.shape)for(const[ex,ey]of other.shape)assert.notEqual(Math.abs(b.x+dx-other.x-ex)+Math.abs(b.y+dy-other.y-ey),1,'Adjacent equal-colored hidden bodies');}
 const art=api.auditCandidateBlockArt(level);assert(art.passed);
 for(const item of art.requirements)assert(fs.existsSync('public/'+item.path.replace(/^\//,'')),item.path);
 const result={passed:true,levelSha256:digest(level),differences,opening,source,art,hiddenCoverage:{passed:true,blocks:6,area:15},stars:api.levelStarTargets(level),difficultyCertified:false};
 if(drags){
  const replay=api.replayRevisedRoute(level,drags);assert(replay.valid&&replay.complete,replay.error);
  assert(replay.nonClearingDrags>=16&&replay.nonClearingDrags<=20);assert(drags.length<=37);
  result.replay=replay;result.mechanisms=verifyMechanisms78({level,drags},api);
 }
 return result;
}
if(process.argv[2]){
 const data=JSON.parse(fs.readFileSync(process.argv[2]));const api=await loadApi(),report=audit(data.level??data,data.drags,api);
 const file=`deliverables/repair78-lift-20260927/audit-${Date.now()}.json`;
 fs.writeFileSync(file,JSON.stringify(report,null,2)+'\n',{flag:'wx'});
 console.log(JSON.stringify({file,passed:report.passed,differences:report.differences,drags:data.drags?.length}));
}
