import fs from 'node:fs';
import assert from 'node:assert/strict';
import {apiLoad,projection} from '../../../remake121to130-bomb-replay-v172.mjs';
import {digest} from '../../../revised-preview-validation-v160.mjs';
const ROOT='deliverables/remake31-200-v145-20260924/batches/lv141-150';
const original=JSON.parse(fs.readFileSync(ROOT+'/source141-145/candidate142-reviewed-v2.json'));
const api=await apiLoad(),level=projection(original.level),model=new api.PuzzleModel(level);model.startCountdown();
function auto(m,id,prev){const b=m.getBlock(id);if(!b||!m.isBlockActive(b))return;const s=m.snapshot(),[x,y]=b.shape[0];return api.choosePortalReleaseCandidate(api.matchingContinuousExitPortals(s,b,m.possibleExitSides(b)),{x:b.x+x+.5,y:b.y+y+.5},{innerX:0,innerY:0,innerWidth:s.width,innerHeight:s.height,cell:1},prev?(b.x<prev[0]?'left':b.x>prev[0]?'right':b.y<prev[1]?'top':b.y>prev[1]?'bottom':undefined):undefined)?.portal.side;}
function apply(m,d){m.beginAction();let side=auto(m,d.blockId);if(side&&d.path.length)return false;for(const[i,p]of d.path.entries()){const b=m.getBlock(d.blockId);if(!b)return false;const prev=[b.x,b.y];if(!m.moveBlockStep(d.blockId,...p))return false;side=auto(m,d.blockId,prev);if(side&&i!==d.path.length-1)return false;}if(side!==d.exitSide)return false;if(side&&!m.tryExit(d.blockId,side).ok)return false;return m.commitAction();}
function find(m,id,wantSide){const b=m.getBlock(id);if(!b||!m.isBlockActive(b))return;const todo=[{m:m.clone(),path:[]}],seen=new Set([b.x+','+b.y]);for(let q=0;q<todo.length;q++){const {m:cur,path}=todo[q],b=cur.getBlock(id),side=auto(cur,id,path.length>1?path.at(-2):undefined);if(side){if(!wantSide||side===wantSide)return {blockId:id,path,exitSide:side};continue;}for(const[dx,dy]of[[1,0],[0,-1],[-1,0],[0,1]]){const x=b.x+dx,y=b.y+dy,k=x+','+y;if(seen.has(k))continue;const next=cur.clone();if(next.moveBlockStep(id,x,y)){seen.add(k);todo.push({m:next,path:[...path,[x,y]]});}}}}
const route=[],changes=[];let current=model;
for(const[index,d]of original.drags.entries()){
 if(!current.getBlock(d.blockId)){changes.push({index,kind:'already-cleared'});continue;}
 let tryModel=current.clone();if(apply(tryModel,d)){current=tryModel;route.push(d);continue;}
 let replacement=find(current,d.blockId,d.exitSide);
 if(!replacement&&d.exitSide){
  for(const b of current.snapshot().blocks){if(b.id===d.blockId)continue;const extra=find(current,b.id);if(!extra)continue;const next=current.clone();if(!apply(next,extra))continue;const desired=find(next,d.blockId,d.exitSide);if(desired){changes.push({index,kind:'clear-blocker',drag:extra});route.push(extra);current=next;replacement=desired;break;}}
 }
 if(!replacement){console.log(JSON.stringify({status:'stopped',index,drag:d,changes}));process.exit(2);}
 assert(apply(current,replacement));route.push(replacement);changes.push({index,kind:'replacement',drag:replacement});
}
assert(current.snapshot().complete);const replay=api.replayRevisedRoute(level,route);assert(replay.valid&&replay.complete);
const out=ROOT+'/round2-root/candidate142-route-'+Date.now()+'.json';fs.mkdirSync(ROOT+'/round2-root',{recursive:true});
fs.writeFileSync(out,JSON.stringify({...original,ruleVersion:'1.73.0',drags:route,routeRepair:{changes,currentReplay:replay},levelSha256:digest(original.level),routeSha256:digest(route),validation:{...original.validation,pointerValidated:false,adoptionReady:false}},null,2));console.log(JSON.stringify({out,changes,drags:route.length,U:replay.nonClearingDrags}));
