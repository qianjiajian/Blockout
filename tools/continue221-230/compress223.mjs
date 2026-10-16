import fs from 'node:fs';
import {api} from '../remake191-200/author194-196/common.mjs';
import {compileSpatial,each,cleared} from '../campaign-v145/lv141-150/round2-a/witness-greedy.mjs';
import {digest} from '../revised-preview-validation-v160.mjs';
const file=process.argv[2],d=JSON.parse(fs.readFileSync(file));
const c=compileSpatial({...d.level,mechanismRules:'revised-2026-09-23-v1.4'},api);
function rebuild(plan){let s=c.initial,drags=[];for(const step of plan){const i=c.blocks.findIndex(b=>b.id===step.blockId);if(s[i]===65535)return null;
 const target=step.path.at(-1);if(!step.exitSide&&target&&s[i]%128===target[1]*c.W+target[0])continue;
 let found;each(c,s,(next,cost,get)=>{const move=get();if(move.blockId!==step.blockId||Boolean(move.exitSide)!==Boolean(step.exitSide))return;
 if(step.exitSide?move.exitSide!==step.exitSide:target&&next[i]%128!==target[1]*c.W+target[0])return;
 found={next,move};return false;},{optionalExit:false});
 if(!found)return null;s=found.next;drags.push(found.move);
 }return cleared(c,s)===c.totalClears?drags:null;}
let drags=d.drags;const log=[],deadline=Date.now()+20000;
// One bounded deletion pass. A retained result must be a complete independent
// PuzzleModel route; this optimization makes no optimality or floor claim.
for(let i=drags.length-1;i>=0&&Date.now()<deadline;i--){if(drags[i].exitSide)continue;const next=rebuild(drags.filter((_,j)=>j!==i));if(!next)continue;
 const replay=api.replayRevisedRoute(d.level,next);if(replay.valid&&replay.complete&&next.length<drags.length){log.push({index:i,before:drags.length,after:next.length});drags=next;}}
const replay=api.replayRevisedRoute(d.level,drags),output=file.replace('.json','-compressed.json');
fs.writeFileSync(output,JSON.stringify({...d,drags,replay,levelSha256:digest(d.level),routeSha256:digest(drags),compression:{source:file,log,status:'BOUNDED_COMPLETE_ROUTE_ONLY_NOT_PROOF'}},null,2));
console.log(JSON.stringify({output,U:replay.nonClearingDrags,drags:drags.length,log}));
