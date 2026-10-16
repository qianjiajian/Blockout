import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {loadBoundedRuntime,boundedUpperSearch,selectBoundedStrategy} from './bounded-proof.mjs';
const output=process.argv[2];assert(output&&!fs.existsSync(output));
const runtime=await loadBoundedRuntime(),worlds=new Set(),commits=[];
const key=model=>{const {moves,...s}=model.snapshot();return JSON.stringify(s);};
function track(model){
 const originalClone=model.clone.bind(model),originalCommit=model.commitAction.bind(model),originalStart=model.startCountdown.bind(model);
 model.clone=()=>track(originalClone());
 model.startCountdown=()=>{const result=originalStart();worlds.add(key(model));return result;};
 model.commitAction=()=>{const result=originalCommit();if(result){worlds.add(key(model));commits.push({distinctCommittedWorlds:worlds.size,remaining:model.snapshot().blocks.length});}return result;};
 return model;
}
class TrackedModel extends runtime.PuzzleModel{constructor(...args){super(...args);return track(this);}}
const level={id:998731,name:'New isolated native budget boundary fixture',width:2,height:2,timeSeconds:100,reward:0,difficulty:'hard',mechanismRules:'revised-2026-09-27-v1.5',
 blocks:[{id:'new-red',x:0,y:0,color:'red',shape:[[0,0]]},{id:'new-blue',x:1,y:0,color:'blue',shape:[[0,0]]}],
 gates:[{id:'red',side:'top',offset:0,size:1,color:'red'},{id:'blue',side:'top',offset:1,size:1,color:'blue'}]};
const budget={maxStates:1,maxTransitions:100,maxMicroStates:100,maxMilliseconds:1000};
const result=boundedUpperSearch({...runtime,PuzzleModel:TrackedModel},level,budget);
assert.equal(result.status,'unknown',result.reason);assert.equal(result.termination,'max-states');assert.equal(result.rawFullBoardStates,1);
assert.equal(worlds.size,2,'This fixture exposes the post-commit count guard without searching a real candidate');
const strategy=selectBoundedStrategy(level,{routeStrategy:'native',providedRoute:false});
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const out={status:'NATIVE_UPPER_POST_COMMIT_BUDGET_GAP_REPRODUCED',fixtureOnly:true,productionInputsSearched:0,publicLedgerWrites:0,coreChanged:false,
 tool:{path:'tools/daily-challenge/formal-v3/inspect-native-upper-budget.mjs',sha256:hash('tools/daily-challenge/formal-v3/inspect-native-upper-budget.mjs')},
 proofToolchainSha256:runtime.toolchainSha256,level,budget,strategy,result,observedDistinctCommittedWorlds:worlds.size,commits,
 conclusion:'enqueue creates, commits and reads a new full board before the maxStates guard. It then returns UNKNOWN reporting one state, although the instrumented model has committed and visited two distinct worlds including initial. The same guard order applies at 10000. Do not claim this native path strictly meets the raw discovered/visited limit until separately corrected and qualified.',
 oldFailureRetried:false};
fs.writeFileSync(output,JSON.stringify(out,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify({output,reported:result.rawFullBoardStates,observed:worlds.size,status:result.status,termination:result.termination}));
